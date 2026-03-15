import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Platform,
  UIManager,
  Modal,
  Pressable,
  Linking,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';

import AmbulanceRequestsCard from '../components/ambulance/AmbulanceRequestsCard';
import AmbulanceStatusCard from '../components/ambulance/AmbulanceStatusCard';
import AmbulanceTabs, { type AmbulanceTabKey } from '../components/ambulance/tabs';
import NotificationList, { type NotificationItem } from '../components/notifications/NotificationList';
import MapLibreView, { MAPLIBRE_STYLE_STREETS_URL, type MapLibreMarker, type MapLibrePolylinePoint } from '../components/maps/MapLibreView';
import { connectRealtime, type InvalidatePayload } from '../utils/realtime';

import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { apiGet, apiPost } from '../utils/api';
import { kvGet, kvSet } from '../utils/kvStorage';

import ProfileViewCard, { PatientUser } from '../components/patient/profile/ProfileViewCard';
import ProfileEditCard from '../components/patient/profile/ProfileEditCard';
import EmailChangeVerificationCard from '../components/patient/profile/EmailChangeVerificationCard';
import DeleteAccountCard from '../components/patient/profile/DeleteAccountCard';
import LanguagePickerInline from '../components/settings/LanguagePickerInline';
import ThemeToggleCard from '../components/settings/ThemeToggleCard';
import {
  ensureLocationPermissionsAsync,
  isAmbulanceBackgroundLocationRunningAsync,
  startAmbulanceBackgroundLocationAsync,
  stopAmbulanceBackgroundLocationAsync,
} from '../utils/ambulanceBackgroundLocation';
import { setLastAvailability, setShareEnabled } from '../utils/ambulanceLocationStorage';

type AmbulanceStaffDashboardProps = {
  accessToken?: string;
  onBack?: () => void;
  onLogout?: () => void;
};

type AmbulanceStatus = {
  ambulance_id: number;
  ambulance_number: string;
  driver_name: string;
  driver_phone: string;
  current_latitude?: number | null;
  current_longitude?: number | null;
  is_available: boolean;
  last_updated?: string | null;
};

type AmbulanceRequest = {
  notification_id: number;
  title: string;
  message: string;
  created_at?: string;
  is_read?: boolean;
};

type ActiveMission = {
  requestId: number;
  title: string;
  message: string;
  patientLat: number;
  patientLng: number;
  acceptedAt: string;
};

type LatLng = { latitude: number; longitude: number };

type MissionHistoryItem = {
  id: string;
  requestId: number;
  title: string;
  acceptedAt?: string;
  completedAt: string;
};

const HISTORY_KEY = 'ambulance_mission_history_v1';

function extractLatLng(text: string): { lat: number; lng: number } | null {
  // Matches: "Location: 6.9271, 79.8612"
  const match = text.match(/Location:\s*([-+]?\d+(?:\.\d+)?)\s*,\s*([-+]?\d+(?:\.\d+)?)/i);
  if (!match) return null;
  const lat = Number(match[1]);
  const lng = Number(match[2]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

function extractMetaValue(text: string, key: string): string | null {
  const lines = String(text || '').split(/\r?\n/);
  const prefixes = [
    `${key}:`,
    `${key}=`,
  ];

  for (const rawLine of lines) {
    const line = rawLine.trim();
    for (const p of prefixes) {
      if (line.toLowerCase().startsWith(p.toLowerCase())) {
        const v = line.slice(p.length).trim();
        if (v) return v;
      }
    }
  }
  return null;
}

function extractPatientPhone(text: string): string | null {
  const meta = extractMetaValue(text, 'meta_patient_phone');
  if (meta) return meta;

  const lines = String(text || '').split(/\r?\n/);
  for (const rawLine of lines) {
    const line = rawLine.trim();
    const m = line.match(/^(?:Patient\s*)?Phone\s*:\s*(.+)$/i);
    if (m?.[1]) return m[1].trim();
  }

  // Last-resort: pick a phone-like token (keeps +, digits, spaces, hyphens)
  const fallback = String(text || '').match(/\+?\d[\d\s-]{6,}\d/);
  return fallback ? fallback[0].trim() : null;
}

function haversineMeters(a: LatLng, b: { lat: number; lng: number }): number {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.latitude);
  const dLng = toRad(b.lng - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.lat);

  const s1 = Math.sin(dLat / 2);
  const s2 = Math.sin(dLng / 2);
  const h = s1 * s1 + Math.cos(lat1) * Math.cos(lat2) * s2 * s2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

function formatDistance(meters: number): string {
  if (!Number.isFinite(meters) || meters <= 0) return '0 m';
  if (meters >= 1000) return `${(meters / 1000).toFixed(1)} km`;
  return `${Math.round(meters)} m`;
}

function formatOsrmStep(step: any): string | null {
  const distance = Number(step?.distance);
  const maneuverType = String(step?.maneuver?.type || '');
  const modifier = String(step?.maneuver?.modifier || '');
  const name = String(step?.name || '').trim();

  const distText = Number.isFinite(distance) ? formatDistance(distance) : '';
  const road = name ? ` on ${name}` : '';

  if (maneuverType === 'arrive') return 'Arrive at destination';
  if (maneuverType === 'depart') return distText ? `Start and continue for ${distText}${road}` : `Start${road}`;
  if (maneuverType === 'roundabout' || maneuverType === 'rotary') {
    return distText ? `Enter roundabout and continue for ${distText}${road}` : `Enter roundabout${road}`;
  }

  if (maneuverType === 'turn') {
    const dir = modifier ? `Turn ${modifier}` : 'Turn';
    return distText ? `${dir} in ${distText}${road}` : `${dir}${road}`;
  }

  if (maneuverType === 'merge') {
    return distText ? `Merge in ${distText}${road}` : `Merge${road}`;
  }

  if (maneuverType === 'continue' || maneuverType === 'new name') {
    return distText ? `Continue for ${distText}${road}` : `Continue${road}`;
  }

  if (maneuverType === 'fork') {
    const dir = modifier ? `Keep ${modifier}` : 'Keep';
    return distText ? `${dir} in ${distText}${road}` : `${dir}${road}`;
  }

  if (maneuverType === 'end of road') {
    const dir = modifier ? `Turn ${modifier}` : 'Turn';
    return distText ? `${dir} in ${distText}${road}` : `${dir}${road}`;
  }

  return null;
}

export default function AmbulanceStaffDashboard({ accessToken, onLogout }: AmbulanceStaffDashboardProps) {
  const { language } = useLanguage();
  const { colors, mode } = useTheme();
  const insets = useSafeAreaInsets();

  const [activeTab, setActiveTab] = useState<AmbulanceTabKey>('home');

  const [profileView, setProfileView] = useState<'view' | 'edit' | 'verify-email'>('view');
  const [pendingEmail, setPendingEmail] = useState<string>('');
  const [user, setUser] = useState<PatientUser>({
    fullName: 'A. Staff',
    email: 'staff@email.com',
    phone: '+94 77 123 4567',
    gender: '-',
    dateOfBirth: '-',
    address: '-',
  });
  const [profileLoadError, setProfileLoadError] = useState<string>('');

  const [status, setStatus] = useState<AmbulanceStatus | null>(null);
  const [requests, setRequests] = useState<AmbulanceRequest[]>([]);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const [loadingStatus, setLoadingStatus] = useState(false);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Register ambulance (if profile missing)
  const [regNumber, setRegNumber] = useState('');
  const [regDriverName, setRegDriverName] = useState('');
  const [regDriverPhone, setRegDriverPhone] = useState('');
  const [regSubmitting, setRegSubmitting] = useState(false);

  const [selectedRequestId, setSelectedRequestId] = useState<number | null>(null);
  const [activeMission, setActiveMission] = useState<ActiveMission | null>(null);
  const [routeSummary, setRouteSummary] = useState<{ distanceKm: number; durationMin: number } | null>(null);
  const [routeLine, setRouteLine] = useState<Array<{ latitude: number; longitude: number }> | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeError, setRouteError] = useState('');

  const [routeSteps, setRouteSteps] = useState<string[] | null>(null);
  const [reachedPatient, setReachedPatient] = useState(false);
  const [patientPhone, setPatientPhone] = useState<string | null>(null);

  const [history, setHistory] = useState<MissionHistoryItem[]>([]);

  const [mapLoadError, setMapLoadError] = useState(false);
  const [mapRefreshTick, setMapRefreshTick] = useState(0);

  const lastRouteComputeAtRef = useRef(0);

  // Foreground realtime coords for immediate UI updates.
  const [liveCoords, setLiveCoords] = useState<LatLng | null>(null);
  const lastLocationPostAtRef = useRef(0);

  // Map is rendered via MapLibre (WebView) in AmbulanceRequestsCard.

  const title = useMemo(() => {
    if (language === 'sinhala') return 'ඇම්බියුලන්ස් කාර්ය මණ්ඩල';
    if (language === 'tamil') return 'ஆம்புலன்ஸ் பணியாளர்';
    return 'Ambulance Staff';
  }, [language]);

  const backLabel = useMemo(() => {
    if (language === 'sinhala') return 'ආපසු';
    if (language === 'tamil') return 'பின்செல்';
    return 'Back';
  }, [language]);

  const quickActionsTitle = useMemo(() => {
    if (language === 'sinhala') return 'ඉක්මන් ක්‍රියා';
    if (language === 'tamil') return 'விரைவு செயல்கள்';
    return 'Quick actions';
  }, [language]);

  const callPatientLabel = useMemo(() => {
    if (language === 'sinhala') return 'රෝගියාට අමතන්න';
    if (language === 'tamil') return 'நோயாளியை அழைக்க';
    return 'Call patient';
  }, [language]);

  const openRouteLabel = useMemo(() => {
    if (language === 'sinhala') return 'මාර්ගය බලන්න';
    if (language === 'tamil') return 'வழியை திற';
    return 'Open route';
  }, [language]);

  const toggleAvailLabel = useMemo(() => {
    if (language === 'sinhala') return 'ලබා ගත හැකි බව';
    if (language === 'tamil') return 'கிடைக்குமா';
    return 'Toggle availability';
  }, [language]);

  const historyTitle = useMemo(() => {
    if (language === 'sinhala') return 'ඉතිහාසය';
    if (language === 'tamil') return 'வரலாறு';
    return 'History';
  }, [language]);

  const mapTitle = useMemo(() => {
    if (language === 'sinhala') return 'නක්ෂා';
    if (language === 'tamil') return 'வரைபடம்';
    return 'Map';
  }, [language]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const raw = await kvGet(HISTORY_KEY);
        if (cancelled) return;
        const parsed = raw ? JSON.parse(String(raw)) : null;
        if (Array.isArray(parsed)) {
          setHistory(
            parsed
              .filter((x) => x && typeof x === 'object')
              .slice(0, 80)
              .map((x: any) => ({
                id: String(x.id ?? ''),
                requestId: Number(x.requestId ?? 0),
                title: String(x.title ?? ''),
                acceptedAt: x.acceptedAt ? String(x.acceptedAt) : undefined,
                completedAt: String(x.completedAt ?? ''),
              }))
              .filter((x: any) => x.id && Number.isFinite(x.requestId) && x.title && x.completedAt),
          );
        }
      } catch {
        // ignore
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadProfile() {
      if (!accessToken) return;
      setProfileLoadError('');

      const result = await apiGet<any>('/api/auth/profile', accessToken);
      if (cancelled) return;

      if (!result.ok) {
        const msg = (result.data && (result.data.message || result.data.error)) || 'Failed to load profile';
        setProfileLoadError(String(msg));
        return;
      }

      const data = result.data?.data ?? result.data;
      if (!data) {
        setProfileLoadError('Failed to load profile');
        return;
      }

      const mapped: PatientUser = {
        fullName: String(data.full_name ?? data.fullName ?? user.fullName),
        email: String(data.email ?? user.email),
        phone: String(data.phone ?? user.phone),
        gender: String(data.gender ?? user.gender),
        dateOfBirth: String(data.dob ?? data.date_of_birth ?? data.dateOfBirth ?? user.dateOfBirth),
        address: String(data.address ?? user.address),
      };

      setUser(mapped);
    }

    loadProfile();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken]);

  const fetchStatus = async () => {
    if (!accessToken) {
      setErrorMessage('Authentication token is missing. Please log in again.');
      return;
    }

    setLoadingStatus(true);
    setErrorMessage('');
    try {
      const res = await apiGet<any>('/api/ambulance/current-status', accessToken);
      if (!res.ok) {
        const msg = (res.data && (res.data.message || res.data.error)) || 'Failed to load status';
        setErrorMessage(String(msg));
        setStatus(null);
        return;
      }

      if (res.data?.success === false) {
        setErrorMessage(String(res.data?.message || 'Failed to load status'));
        setStatus(null);
        return;
      }

      setStatus(res.data?.data ?? null);
    } finally {
      setLoadingStatus(false);
    }
  };

  const fetchRequests = async () => {
    if (!accessToken) return;

    setLoadingRequests(true);
    try {
      const res = await apiGet<any>('/api/ambulance/requests?is_read=false&limit=25', accessToken);
      if (!res.ok) {
        return;
      }
      if (res.data?.success === false) return;

      const list = Array.isArray(res.data?.data) ? res.data.data : [];
      setRequests(list);
    } finally {
      setLoadingRequests(false);
    }
  };

  const notificationItems = useMemo<NotificationItem[]>(() => {
    return (requests || []).map((r) => ({
      id: String(r.notification_id),
      title: String(r.title || 'Notification'),
      message: String(r.message || ''),
      time: r.created_at ? String(r.created_at).replace('T', ' ').slice(0, 19) : '',
      read: Boolean(r.is_read),
      type: 'Ambulance',
    }));
  }, [requests]);

  const unreadCount = useMemo(() => notificationItems.filter((n) => !n.read).length, [notificationItems]);

  const notificationsTitle = useMemo(() => {
    if (language === 'sinhala') return 'දැනුම්දීම්';
    if (language === 'tamil') return 'அறிவிப்புகள்';
    return 'Notifications';
  }, [language]);

  const closeLabel = useMemo(() => {
    if (language === 'sinhala') return 'වසන්න';
    if (language === 'tamil') return 'மூடு';
    return 'Close';
  }, [language]);

  const requestMarkers = useMemo(() => {
    return requests
      .map((r) => {
        const coords = extractLatLng(r.message);
        if (!coords) return null;
        return {
          id: r.notification_id,
          title: r.title,
          message: r.message,
          lat: coords.lat,
          lng: coords.lng,
        };
      })
      .filter((x): x is NonNullable<typeof x> => !!x);
  }, [requests]);

  const missionMarker = useMemo(() => {
    if (!activeMission) return null;
    return {
      id: activeMission.requestId,
      title: activeMission.title,
      message: activeMission.message,
      lat: activeMission.patientLat,
      lng: activeMission.patientLng,
    };
  }, [activeMission]);

  const allMarkers = useMemo(() => {
    const list = [...requestMarkers];
    if (missionMarker && !list.some((m) => m.id === missionMarker.id)) {
      list.unshift(missionMarker);
    }
    return list;
  }, [missionMarker, requestMarkers]);

  const ambulanceCoords = useMemo<LatLng | null>(() => {
    if (liveCoords) return liveCoords;
    if (typeof status?.current_latitude !== 'number' || typeof status?.current_longitude !== 'number') return null;
    return { latitude: status.current_latitude, longitude: status.current_longitude };
  }, [liveCoords, status?.current_latitude, status?.current_longitude]);

  // Keep the ambulance marker moving in realtime.
  // - If permission is already granted, we start watching immediately (no prompts).
  // - If permission isn't granted, we only request it when the user enables sharing.
  useEffect(() => {
    if (Platform.OS === 'web') return;
    let sub: Location.LocationSubscription | null = null;
    let cancelled = false;

    (async () => {
      try {
        const currentPerm = await Location.getForegroundPermissionsAsync();
        const perm = (currentPerm.status === Location.PermissionStatus.GRANTED)
          ? currentPerm
          : (sharing ? await Location.requestForegroundPermissionsAsync() : currentPerm);
        if (cancelled) return;
        if (perm.status !== Location.PermissionStatus.GRANTED) {
          return;
        }

        sub = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.Balanced,
            timeInterval: 2000,
            distanceInterval: 3,
          },
          (pos) => {
            const lat = pos?.coords?.latitude;
            const lng = pos?.coords?.longitude;
            if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
            setLiveCoords({ latitude: lat, longitude: lng });

            // Best-effort: also post to backend (throttled) to help patient tracking.
            if (!sharing) return;
            if (!accessToken) return;
            const now = Date.now();
            if (now - lastLocationPostAtRef.current < 4500) return;
            lastLocationPostAtRef.current = now;
            void apiPost<any>(
              '/api/ambulance/update-location',
              {
                latitude: lat,
                longitude: lng,
                is_available: status?.is_available ?? true,
              },
              accessToken
            );
          }
        );
      } catch {
        // ignore
      }
    })();

    return () => {
      cancelled = true;
      try { sub?.remove(); } catch {
        // ignore
      }
    };
  }, [accessToken, sharing, status?.is_available]);

  const [staticMapStatus, setStaticMapStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  const staticMapUrl = useMemo(() => {
    // Works in Expo Go without any native map modules.
    const selected = allMarkers.find((m) => m.id === selectedRequestId) ?? allMarkers[0] ?? null;
    const centerLat = selected?.lat ?? ambulanceCoords?.latitude ?? 0;
    const centerLng = selected?.lng ?? ambulanceCoords?.longitude ?? 0;
    const zoom = selected ? 15 : ambulanceCoords ? 13 : 2;

    const params: string[] = [];
    params.push(`center=${encodeURIComponent(String(centerLat))},${encodeURIComponent(String(centerLng))}`);
    params.push(`zoom=${encodeURIComponent(String(zoom))}`);
    params.push('size=640x360');
    params.push('maptype=mapnik');

    // Marker format supports repeating markers parameter.
    if (ambulanceCoords) {
      params.push(
        `markers=${encodeURIComponent(String(ambulanceCoords.latitude))},${encodeURIComponent(String(ambulanceCoords.longitude))},blue-pushpin`,
      );
    }
    if (selected) {
      params.push(`markers=${encodeURIComponent(String(selected.lat))},${encodeURIComponent(String(selected.lng))},red-pushpin`);
    }

    return `https://staticmap.openstreetmap.de/staticmap.php?${params.join('&')}`;
  }, [allMarkers, ambulanceCoords, selectedRequestId]);

  useEffect(() => {
    setStaticMapStatus('loading');
  }, [staticMapUrl]);

  // Map fitting is handled inside MapLibreView.

  const computeBestRoute = async (from: LatLng, to: { lat: number; lng: number }) => {
    setRouteLoading(true);
    setRouteError('');
    try {
      const url = `https://router.project-osrm.org/route/v1/driving/${from.longitude},${from.latitude};${to.lng},${to.lat}?overview=full&geometries=geojson&steps=true`;
      const res = await fetch(url);
      const json = await res.json();
      const route = Array.isArray(json?.routes) ? json.routes[0] : null;
      if (!route) {
        setRouteSummary(null);
        setRouteLine([
          { latitude: from.latitude, longitude: from.longitude },
          { latitude: to.lat, longitude: to.lng },
        ]);
        setRouteSteps(null);
        setRouteError('Unable to compute best route (showing direct line).');
        return;
      }

      const distanceKm = Number(route.distance) / 1000;
      const durationMin = Number(route.duration) / 60;
      if (Number.isFinite(distanceKm) && Number.isFinite(durationMin)) {
        setRouteSummary({ distanceKm: Number(distanceKm.toFixed(2)), durationMin: Math.max(1, Math.round(durationMin)) });
      } else {
        setRouteSummary(null);
      }

      const coords = route?.geometry?.coordinates;
      if (Array.isArray(coords)) {
        const line = coords
          .filter((c: any) => Array.isArray(c) && c.length >= 2)
          .map((c: any) => ({ latitude: Number(c[1]), longitude: Number(c[0]) }))
          .filter((p: any) => Number.isFinite(p.latitude) && Number.isFinite(p.longitude));
        setRouteLine(line.length ? line : null);
      } else {
        setRouteLine(null);
      }

      const stepsRaw = route?.legs?.[0]?.steps;
      if (Array.isArray(stepsRaw)) {
        const formatted = stepsRaw
          .map((s: any) => formatOsrmStep(s))
          .filter((s: any): s is string => typeof s === 'string' && s.trim().length > 0);
        setRouteSteps(formatted.length ? formatted : null);
      } else {
        setRouteSteps(null);
      }
    } catch {
      setRouteSummary(null);
      setRouteLine([
        { latitude: from.latitude, longitude: from.longitude },
        { latitude: to.lat, longitude: to.lng },
      ]);
      setRouteSteps(null);
      setRouteError('Unable to compute best route (showing direct line).');
    } finally {
      setRouteLoading(false);
    }
  };

  useEffect(() => {
    if (!activeMission) return;
    if (!ambulanceCoords) {
      setRouteSummary(null);
      setRouteLine(null);
      setRouteSteps(null);
      return;
    }

    const now = Date.now();
    if (now - lastRouteComputeAtRef.current < 12000) return;
    lastRouteComputeAtRef.current = now;
    void computeBestRoute(ambulanceCoords, { lat: activeMission.patientLat, lng: activeMission.patientLng });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeMission?.requestId, ambulanceCoords?.latitude, ambulanceCoords?.longitude]);

  useEffect(() => {
    if (!activeMission) {
      setReachedPatient(false);
      return;
    }
    if (reachedPatient) return;
    if (!ambulanceCoords) return;

    const dist = haversineMeters(ambulanceCoords, { lat: activeMission.patientLat, lng: activeMission.patientLng });
    if (dist <= 60) {
      setReachedPatient(true);
    }
  }, [activeMission, ambulanceCoords, reachedPatient]);

  const setAvailability = async (isAvailable: boolean) => {
    if (!accessToken) return;

    setErrorMessage('');
    const res = await apiPost<any>('/api/ambulance/availability', { is_available: isAvailable }, accessToken);
    if (!res.ok || res.data?.success === false) {
      const msg = (res.data && (res.data.message || res.data.error)) || 'Failed to update availability';
      setErrorMessage(String(msg));
      return;
    }

    await fetchStatus();
    await fetchRequests();
    await setLastAvailability(isAvailable);
  };

  const startSharing = async () => {
    if (!accessToken) {
      setErrorMessage('Authentication token is missing. Please log in again.');
      return;
    }

    setErrorMessage('');
    const perm = await ensureLocationPermissionsAsync();
    if (!perm.ok) {
      setErrorMessage(perm.message);
      return;
    }

    await setLastAvailability(status?.is_available ?? true);
    await setShareEnabled(true);
    await startAmbulanceBackgroundLocationAsync();
    setSharing(true);
  };

  const stopSharing = async () => {
    await setShareEnabled(false);
    await stopAmbulanceBackgroundLocationAsync();
    setSharing(false);
  };

  const acceptRequest = async (notificationId: number) => {
    if (!accessToken) return;

    setErrorMessage('');
    const req = requests.find((r) => r.notification_id === notificationId) || null;
    const coords = req ? extractLatLng(req.message) : null;

    if (req && coords) {
      setReachedPatient(false);
      setPatientPhone(extractPatientPhone(req.message));
      lastRouteComputeAtRef.current = 0;
      setActiveMission({
        requestId: notificationId,
        title: req.title,
        message: req.message,
        patientLat: coords.lat,
        patientLng: coords.lng,
        acceptedAt: new Date().toISOString(),
      });
      setSelectedRequestId(notificationId);
    }

    const res = await apiPost<any>(`/api/ambulance/requests/${notificationId}/accept`, {}, accessToken);
    if (!res.ok || res.data?.success === false) {
      const msg = (res.data && (res.data.message || res.data.error)) || 'Failed to accept request';
      setErrorMessage(String(msg));
      setActiveMission((m) => (m?.requestId === notificationId ? null : m));
      setSelectedRequestId((id) => (id === notificationId ? null : id));
      setRouteSummary(null);
      setRouteLine(null);
      setRouteSteps(null);
      setReachedPatient(false);
      setPatientPhone(null);
      return;
    }

    await fetchStatus();
    await fetchRequests();
  };

  const rejectRequest = async (notificationId: number) => {
    if (!accessToken) return;

    setErrorMessage('');
    const res = await apiPost<any>(`/api/ambulance/requests/${notificationId}/reject`, {}, accessToken);
    if (!res.ok || res.data?.success === false) {
      const msg = (res.data && (res.data.message || res.data.error)) || 'Failed to reject request';
      setErrorMessage(String(msg));
      return;
    }

    await fetchRequests();
  };

  const completeMission = async () => {
    if (!accessToken) return;

    setErrorMessage('');
    const missionToSave = activeMission;
    const res = await apiPost<any>('/api/ambulance/complete-mission', {}, accessToken);
    if (!res.ok || res.data?.success === false) {
      const msg = (res.data && (res.data.message || res.data.error)) || 'Failed to complete mission';
      setErrorMessage(String(msg));
      return;
    }

    if (missionToSave) {
      const entry: MissionHistoryItem = {
        id: `${String(missionToSave.requestId)}-${Date.now()}`,
        requestId: missionToSave.requestId,
        title: String(missionToSave.title || 'Mission'),
        acceptedAt: missionToSave.acceptedAt,
        completedAt: new Date().toISOString(),
      };

      setHistory((prev) => {
        const next = [entry, ...prev].slice(0, 80);
        void kvSet(HISTORY_KEY, JSON.stringify(next));
        return next;
      });
    }

    setActiveMission(null);
    setSelectedRequestId(null);
    setRouteSummary(null);
    setRouteLine(null);
    setRouteSteps(null);
    setRouteError('');
    setReachedPatient(false);
    setPatientPhone(null);

    await fetchStatus();
    await fetchRequests();
  };

  const submitRegisterAmbulance = async () => {
    if (!accessToken) return;

    const number = regNumber.trim();
    const driverName = regDriverName.trim();
    const driverPhone = regDriverPhone.trim();

    if (!number || !driverName || !driverPhone) {
      setErrorMessage('Ambulance number, driver name, and driver phone are required.');
      return;
    }

    setRegSubmitting(true);
    setErrorMessage('');
    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      const coords =
        perm.status === Location.PermissionStatus.GRANTED
          ? (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })).coords
          : null;

      const body: any = {
        ambulance_number: number,
        driver_name: driverName,
        driver_phone: driverPhone,
      };
      if (coords) {
        body.latitude = coords.latitude;
        body.longitude = coords.longitude;
      }

      const res = await apiPost<any>('/api/ambulance/register-ambulance', body, accessToken);
      if (!res.ok || res.data?.success === false) {
        const msg = (res.data && (res.data.message || res.data.error)) || 'Failed to register ambulance';
        setErrorMessage(String(msg));
        return;
      }

      await fetchStatus();
    } finally {
      setRegSubmitting(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    fetchRequests();

    // Sync toggle state with the actual background task
    isAmbulanceBackgroundLocationRunningAsync().then((running) => {
      setSharing(running);
    }).catch(() => {
      setSharing(false);
    });

    return () => {
      // Don't stop background sharing here; user controls it via toggle.
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken]);

  useEffect(() => {
    if (!accessToken) return;

    const socket = connectRealtime(accessToken);
    const lastRefreshAtRef = { current: 0 };

    const onInvalidate = (payload: InvalidatePayload) => {
      const now = Date.now();
      if (now - lastRefreshAtRef.current < 600) return;
      lastRefreshAtRef.current = now;

      const topics = Array.isArray(payload?.topics) ? payload.topics : [];
      if (!topics.length) {
        void fetchStatus();
        void fetchRequests();
        return;
      }

      if (topics.some((t) => String(t).startsWith('ambulance:status'))) {
        void fetchStatus();
      }
      if (topics.some((t) => String(t).startsWith('ambulance:requests')) || topics.some((t) => String(t) === 'notifications')) {
        void fetchRequests();
      }
    };

    socket.on('invalidate', onInvalidate);

    return () => {
      socket.off('invalidate', onInvalidate);
      socket.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken]);

  const headerBg = mode === 'dark' ? colors.card : colors.background;

  const mapMarkers = useMemo<MapLibreMarker[]>(() => {
    const list: MapLibreMarker[] = [];
    if (ambulanceCoords) {
      list.push({
        id: 'ambulance',
        lat: ambulanceCoords.latitude,
        lng: ambulanceCoords.longitude,
        kind: 'ambulance',
        color: colors.primary,
        title: 'Ambulance',
      });
    }

    if (activeMission) {
      list.push({
        id: `patient-${String(activeMission.requestId)}`,
        lat: activeMission.patientLat,
        lng: activeMission.patientLng,
        kind: 'patient',
        color: colors.danger,
        title: activeMission.title || 'Patient',
      });
      return list;
    }

    // If no active mission, show request pins.
    for (const m of allMarkers) {
      list.push({
        id: String(m.id),
        lat: m.lat,
        lng: m.lng,
        kind: 'pin',
        color: colors.primary,
        title: String(m.title || 'Request'),
      });
    }

    return list;
  }, [activeMission, allMarkers, ambulanceCoords, colors.danger, colors.primary]);

  const mapPolyline = useMemo<MapLibrePolylinePoint[] | null>(() => {
    if (!routeLine || routeLine.length < 2) return null;
    return routeLine
      .map((p) => ({ lat: p.latitude, lng: p.longitude }))
      .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng));
  }, [routeLine]);

  const mapFocus = useMemo(() => {
    if (activeMission) return { lat: activeMission.patientLat, lng: activeMission.patientLng, zoom: 13 };
    if (ambulanceCoords) return { lat: ambulanceCoords.latitude, lng: ambulanceCoords.longitude, zoom: 12 };
    return null;
  }, [activeMission, ambulanceCoords, mapRefreshTick]);

  const canCall = Boolean(patientPhone && String(patientPhone).trim().length >= 3);
  const canOpenRoute = Boolean(activeMission && (mapPolyline?.length || routeLine?.length));
  const canToggleAvailability = Boolean(status);

  const refreshMapLabel = useMemo(() => {
    if (language === 'sinhala') return 'නැවුම් කරන්න';
    if (language === 'tamil') return 'புதுப்பி';
    return 'Refresh';
  }, [language]);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <StatusBar barStyle={mode === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={headerBg} translucent={false} />

      <Modal
        visible={notificationsOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setNotificationsOpen(false)}
      >
        <View style={styles.modalWrap}>
          <Pressable
            style={[
              StyleSheet.absoluteFillObject,
              {
                backgroundColor: mode === 'light' ? colors.text : colors.background,
                opacity: mode === 'light' ? 0.35 : 0.78,
              },
            ]}
            onPress={() => setNotificationsOpen(false)}
          />

          <View
            style={[
              styles.modalCard,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                shadowColor: mode === 'light' ? colors.text : colors.background,
              },
            ]}
          >
            <View style={styles.modalHeaderRow}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>{notificationsTitle}</Text>
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => setNotificationsOpen(false)}
                style={[styles.smallPill, { borderColor: colors.border }]}
                accessibilityRole="button"
                accessibilityLabel="Close notifications"
              >
                <Text style={[styles.smallPillText, { color: colors.subtext }]}>{closeLabel}</Text>
              </TouchableOpacity>
            </View>

            <NotificationList
              notifications={notificationItems}
              emptyText={language === 'sinhala' ? 'දැනුම්දීම් නොමැත' : language === 'tamil' ? 'அறிவிப்புகள் இல்லை' : 'No notifications'}
              onPressItem={(id) => {
                const req = requests.find((r) => String(r.notification_id) === String(id));
                if (req) setSelectedRequestId(req.notification_id);
                setActiveTab('requests');
                setNotificationsOpen(false);
              }}
            />
          </View>
        </View>
      </Modal>

      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <View style={styles.headerRow}>
          <Text style={[styles.title, { color: colors.primary }]}>{title}</Text>
          <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
            <TouchableOpacity
              onPress={() => setNotificationsOpen(true)}
              activeOpacity={0.8}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel="Notifications"
              style={styles.bellWrap}
            >
              <Ionicons name="notifications-outline" size={20} color={colors.text} />
              {unreadCount > 0 && (
                <View style={[styles.badge, { backgroundColor: colors.danger, borderColor: colors.background }]}>
                  <Text style={styles.badgeText}>{unreadCount}</Text>
                </View>
              )}
            </TouchableOpacity>

            {activeTab !== 'home' && (
              <TouchableOpacity
                onPress={() => setActiveTab('home')}
                activeOpacity={0.75}
                accessibilityRole="button"
                accessibilityLabel="Back"
              >
                <Text style={[styles.backText, { color: colors.primary }]}>{backLabel}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {activeTab === 'map' ? (
          <View style={{ flex: 1, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 10 }}>
            <View style={styles.mapHeaderRow}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>{mapTitle}</Text>
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => {
                  setMapLoadError(false);
                  setMapRefreshTick((t) => t + 1);

                  // Best-effort: update live coords without prompting for permissions.
                  if (Platform.OS === 'web') return;
                  void (async () => {
                    try {
                      const perm = await Location.getForegroundPermissionsAsync();
                      if (perm.status !== Location.PermissionStatus.GRANTED) return;
                      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
                      const lat = pos?.coords?.latitude;
                      const lng = pos?.coords?.longitude;
                      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
                      setLiveCoords({ latitude: lat, longitude: lng });
                    } catch {
                      // ignore
                    }
                  })();
                }}
                style={[styles.smallPill, { borderColor: colors.border }]}
                accessibilityRole="button"
                accessibilityLabel="Refresh map location"
              >
                <Text style={[styles.smallPillText, { color: colors.subtext }]}>
                  <Ionicons name="locate-outline" size={14} color={colors.subtext} /> {refreshMapLabel}
                </Text>
              </TouchableOpacity>
            </View>
            {mapLoadError ? (
              <View style={[styles.panelCard, { backgroundColor: colors.card, borderColor: colors.border, flex: 1, alignItems: 'center', justifyContent: 'center' }]}>
                <Text style={[styles.cardText, { color: colors.subtext, textAlign: 'center' }]}>Map failed to load.</Text>
              </View>
            ) : (
              <View style={{ flex: 1, borderRadius: 18, overflow: 'hidden', borderWidth: 1, borderColor: colors.border }}>
                <MapLibreView
                  styleUrl={MAPLIBRE_STYLE_STREETS_URL}
                  markers={mapMarkers}
                  polyline={mapPolyline}
                  focus={mapFocus}
                  onLoadError={() => setMapLoadError(true)}
                />
              </View>
            )}
          </View>
        ) : (
          <ScrollView
            style={{ flex: 1, backgroundColor: colors.background }}
            contentContainerStyle={{ paddingBottom: Math.max(110, insets.bottom + 90) }}
            showsVerticalScrollIndicator={false}
          >
            {!!errorMessage && activeTab !== 'profile' && (
              <View style={styles.errorWrap}>
                <Ionicons name="warning-outline" size={18} color={colors.danger} style={styles.errorIcon} />
                <Text style={[styles.errorText, { color: colors.text }]}>{errorMessage}</Text>
              </View>
            )}

            {activeTab === 'home' ? (
              <View style={{ paddingTop: 6 }}>
                <AmbulanceStatusCard
                  colors={{ background: colors.background, card: colors.card, text: colors.text, subtext: colors.subtext, border: colors.border, primary: colors.primary }}
                  status={status}
                  loading={loadingStatus}
                  sharing={sharing}
                  errorMessage={errorMessage}
                  liveCoords={liveCoords}
                  onRefresh={fetchStatus}
                  onToggleAvailability={() => {
                    if (!status) return;
                    void setAvailability(!status.is_available);
                  }}
                  onToggleSharing={() => {
                    if (sharing) {
                      void stopSharing();
                    } else {
                      void startSharing();
                    }
                  }}
                  regNumber={regNumber}
                  regDriverName={regDriverName}
                  regDriverPhone={regDriverPhone}
                  regSubmitting={regSubmitting}
                  setRegNumber={setRegNumber}
                  setRegDriverName={setRegDriverName}
                  setRegDriverPhone={setRegDriverPhone}
                  onSubmitRegister={() => {
                    void submitRegisterAmbulance();
                  }}
                />

                <View style={{ paddingHorizontal: 20, marginTop: 12 }}>
                  <View style={[styles.panelCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>{quickActionsTitle}</Text>
                    <View style={styles.quickRow}>
                      <TouchableOpacity
                        style={[styles.quickBtn, { borderColor: colors.border, opacity: canCall ? 1 : 0.5 }]}
                        activeOpacity={0.85}
                        disabled={!canCall}
                        onPress={() => {
                          if (!patientPhone) return;
                          const tel = String(patientPhone).replace(/\s+/g, '');
                          void Linking.openURL(`tel:${tel}`);
                        }}
                        accessibilityRole="button"
                        accessibilityLabel="Call patient"
                      >
                        <Text style={[styles.quickBtnText, { color: colors.text }]}>{callPatientLabel}</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.quickBtn, { borderColor: colors.border, opacity: canOpenRoute ? 1 : 0.5 }]}
                        activeOpacity={0.85}
                        disabled={!canOpenRoute}
                        onPress={() => {
                          setMapLoadError(false);
                          setActiveTab('map');
                        }}
                        accessibilityRole="button"
                        accessibilityLabel="Open route"
                      >
                        <Text style={[styles.quickBtnText, { color: colors.text }]}>{openRouteLabel}</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.quickBtn, { borderColor: colors.border, opacity: canToggleAvailability ? 1 : 0.5 }]}
                        activeOpacity={0.85}
                        disabled={!canToggleAvailability}
                        onPress={() => {
                          if (!status) return;
                          void setAvailability(!status.is_available);
                        }}
                        accessibilityRole="button"
                        accessibilityLabel="Toggle availability"
                      >
                        <Text style={[styles.quickBtnText, { color: colors.text }]}>{toggleAvailLabel}</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>

                <View style={{ paddingTop: 12 }}>
                  <AmbulanceRequestsCard
                    colors={{ card: colors.card, text: colors.text, subtext: colors.subtext, border: colors.border, primary: colors.primary, danger: colors.danger }}
                    status={status}
                    loadingRequests={loadingRequests}
                    requests={requests}
                    onRefreshRequests={fetchRequests}
                    ambulanceCoords={ambulanceCoords}
                    markers={allMarkers}
                    selectedRequestId={selectedRequestId}
                    onSelectRequestId={setSelectedRequestId}
                    staticMapUrl={staticMapUrl}
                    staticMapStatus={staticMapStatus}
                    onStaticMapLoad={() => setStaticMapStatus('ready')}
                    onStaticMapError={() => setStaticMapStatus('error')}
                    activeMission={activeMission}
                    routeLoading={routeLoading}
                    routeSummary={routeSummary}
                    routeLine={routeLine}
                    routeError={routeError}
                    routeSteps={routeSteps}
                    reachedPatient={reachedPatient}
                    patientPhone={patientPhone}
                    onAccept={(id) => { void acceptRequest(id); }}
                    onReject={(id) => { void rejectRequest(id); }}
                    onCompleteMission={() => { void completeMission(); }}
                  />
                </View>
              </View>
            ) : activeTab === 'requests' ? (
              <View style={{ paddingTop: 12 }}>
                <AmbulanceRequestsCard
                  colors={{ card: colors.card, text: colors.text, subtext: colors.subtext, border: colors.border, primary: colors.primary, danger: colors.danger }}
                  status={status}
                  loadingRequests={loadingRequests}
                  requests={requests}
                  onRefreshRequests={fetchRequests}
                  ambulanceCoords={ambulanceCoords}
                  markers={allMarkers}
                  selectedRequestId={selectedRequestId}
                  onSelectRequestId={setSelectedRequestId}
                  staticMapUrl={staticMapUrl}
                  staticMapStatus={staticMapStatus}
                  onStaticMapLoad={() => setStaticMapStatus('ready')}
                  onStaticMapError={() => setStaticMapStatus('error')}
                  activeMission={activeMission}
                  routeLoading={routeLoading}
                  routeSummary={routeSummary}
                  routeLine={routeLine}
                  routeError={routeError}
                  routeSteps={routeSteps}
                  reachedPatient={reachedPatient}
                  patientPhone={patientPhone}
                  onAccept={(id) => { void acceptRequest(id); }}
                  onReject={(id) => { void rejectRequest(id); }}
                  onCompleteMission={() => { void completeMission(); }}
                />
              </View>
            ) : activeTab === 'history' ? (
              <View style={{ paddingHorizontal: 20, paddingTop: 14 }}>
                <View style={[styles.panelCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>{historyTitle}</Text>
                  {history.length === 0 ? (
                    <Text style={[styles.cardText, { color: colors.subtext, marginTop: 8 }]}>
                      {language === 'sinhala' ? 'ඉතිහාස දත්ත නොමැත.' : language === 'tamil' ? 'வரலாறு இல்லை.' : 'No completed missions yet.'}
                    </Text>
                  ) : (
                    history.map((h) => (
                      <View key={h.id} style={[styles.historyRow, { borderTopColor: colors.border }]}>
                        <Text style={[styles.historyTitle, { color: colors.text }]} numberOfLines={1}>{h.title}</Text>
                        <Text style={[styles.historyTime, { color: colors.subtext }]}>
                          {String(h.completedAt).replace('T', ' ').slice(0, 19)}
                        </Text>
                      </View>
                    ))
                  )}
                </View>
              </View>
            ) : (
              <View style={{ paddingHorizontal: 20, paddingTop: 14 }}>
                {!!profileLoadError && (
                  <View style={[styles.errorWrap, { paddingHorizontal: 0, marginTop: 0 }] }>
                    <Ionicons name="warning-outline" size={18} color={colors.danger} style={styles.errorIcon} />
                    <Text style={[styles.errorText, { color: colors.text }]}>{profileLoadError}</Text>
                  </View>
                )}

                {profileView === 'verify-email' ? (
                  <EmailChangeVerificationCard
                    pendingEmail={pendingEmail}
                    onVerified={() => {
                      setUser((u) => ({ ...u, email: pendingEmail }));
                      setPendingEmail('');
                      setProfileView('view');
                    }}
                    onCancel={() => {
                      setPendingEmail('');
                      setProfileView('edit');
                    }}
                  />
                ) : profileView === 'edit' ? (
                  <ProfileEditCard
                    user={user}
                    onSave={(next) => {
                      setUser(next);
                      setProfileView('view');
                    }}
                    onCancel={() => setProfileView('view')}
                    onRequestEmailChange={(email) => {
                      setPendingEmail(email);
                      setProfileView('verify-email');
                    }}
                  />
                ) : (
                  <ProfileViewCard user={user} onEdit={() => setProfileView('edit')} />
                )}

                {!!onLogout && (
                  <TouchableOpacity
                    style={[styles.profileLogoutBtn, { borderColor: colors.danger }]}
                    activeOpacity={0.85}
                    onPress={onLogout}
                    accessibilityRole="button"
                    accessibilityLabel="Logout"
                  >
                    <Text style={[styles.profileLogoutText, { color: colors.danger }]}>
                      {language === 'sinhala' ? 'පිටවීම' : language === 'tamil' ? 'வெளியேறு' : 'Logout'}
                    </Text>
                  </TouchableOpacity>
                )}

                <View style={{ marginTop: 12, gap: 12 }}>
                  <LanguagePickerInline />
                  <ThemeToggleCard />
                  <DeleteAccountCard />
                </View>
              </View>
            )}
          </ScrollView>
        )}
      </View>

      <AmbulanceTabs activeTab={activeTab} onChange={setActiveTab} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  headerRow: {
    paddingHorizontal: 20,
    paddingTop: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  title: { fontSize: 18, fontWeight: '900' },
  backText: { fontSize: 14, fontWeight: '900' },
  bellWrap: {
    position: 'relative',
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  bellIcon: {
    fontSize: 20,
  },
  badge: {
    position: 'absolute',
    top: 0,
    right: 0,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '900',
    paddingHorizontal: 4,
  },
  panelCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
  },
  cardText: {
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
  },
  quickRow: {
    marginTop: 12,
    flexDirection: 'row',
    gap: 10,
  },
  quickBtn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 10,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  quickBtnText: {
    fontSize: 12,
    fontWeight: '900',
    textAlign: 'center',
  },
  mapHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  historyRow: {
    paddingVertical: 12,
    borderTopWidth: 1,
    marginTop: 10,
  },
  historyTitle: {
    fontSize: 13,
    fontWeight: '900',
  },
  historyTime: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: '700',
  },
  profileLogoutBtn: {
    marginTop: 14,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  profileLogoutText: {
    fontSize: 13,
    fontWeight: '900',
  },
  modalWrap: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  modalCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
    shadowOpacity: 0.15,
    shadowRadius: 18,
    elevation: 8,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 10,
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: '900',
    flex: 1,
  },
  smallPill: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  smallPillText: {
    fontSize: 12,
    fontWeight: '900',
  },
  errorWrap: {
    paddingHorizontal: 20,
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  errorIcon: { fontSize: 16 },
  errorText: { flex: 1, fontSize: 13, fontWeight: '700' },
  card: {
    marginTop: 14,
    marginHorizontal: 20,
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
  },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '900' },
  kv: { marginTop: 6, fontSize: 13, fontWeight: '700' },
  note: { marginTop: 10, fontSize: 12, fontWeight: '700' },
  primaryBtn: {
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnSmall: {
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 86,
  },
  primaryBtnText: { color: '#ffffff', fontSize: 13, fontWeight: '900' },
  outlineBtn: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  outlineBtnSmall: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 7,
    paddingHorizontal: 10,
  },
  outlineBtnText: { fontSize: 12, fontWeight: '800' },
  itemRow: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: 12,
  },
  itemTitle: { fontSize: 14, fontWeight: '900' },
  itemSub: { marginTop: 6, fontSize: 12, fontWeight: '700' },
  mapWrap: {
    marginTop: 12,
    height: 240,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
  },
  routeCard: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  mapFallbackCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  input: {
    marginTop: 10,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    fontWeight: '700',
  },
});
