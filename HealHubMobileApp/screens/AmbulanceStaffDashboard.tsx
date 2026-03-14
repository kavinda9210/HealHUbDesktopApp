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
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';

import AmbulanceRequestsCard from '../components/ambulance/AmbulanceRequestsCard';
import AmbulanceStatusCard from '../components/ambulance/AmbulanceStatusCard';
import { connectRealtime, type InvalidatePayload } from '../utils/realtime';

import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { apiGet, apiPost } from '../utils/api';
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

function extractLatLng(text: string): { lat: number; lng: number } | null {
  // Matches: "Location: 6.9271, 79.8612"
  const match = text.match(/Location:\s*([-+]?\d+(?:\.\d+)?)\s*,\s*([-+]?\d+(?:\.\d+)?)/i);
  if (!match) return null;
  const lat = Number(match[1]);
  const lng = Number(match[2]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

export default function AmbulanceStaffDashboard({ accessToken, onBack, onLogout }: AmbulanceStaffDashboardProps) {
  const { language } = useLanguage();
  const { colors, mode } = useTheme();
  const insets = useSafeAreaInsets();

  const [status, setStatus] = useState<AmbulanceStatus | null>(null);
  const [requests, setRequests] = useState<AmbulanceRequest[]>([]);

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

  // Map is rendered via MapLibre (WebView) in AmbulanceRequestsCard.

  const title = useMemo(() => {
    if (language === 'sinhala') return 'ඇම්බියුලන්ස් කාර්ය මණ්ඩල';
    if (language === 'tamil') return 'ஆம்புலன்ஸ் பணியாளர்';
    return 'Ambulance Staff';
  }, [language]);

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
    if (typeof status?.current_latitude !== 'number' || typeof status?.current_longitude !== 'number') return null;
    return { latitude: status.current_latitude, longitude: status.current_longitude };
  }, [status?.current_latitude, status?.current_longitude]);

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
      const url = `https://router.project-osrm.org/route/v1/driving/${from.longitude},${from.latitude};${to.lng},${to.lat}?overview=full&geometries=geojson`;
      const res = await fetch(url);
      const json = await res.json();
      const route = Array.isArray(json?.routes) ? json.routes[0] : null;
      if (!route) {
        setRouteSummary(null);
        setRouteLine(null);
        setRouteError('Unable to compute route');
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
    } catch {
      setRouteSummary(null);
      setRouteLine(null);
      setRouteError('Unable to compute route');
    } finally {
      setRouteLoading(false);
    }
  };

  useEffect(() => {
    if (!activeMission) return;
    if (!ambulanceCoords) {
      setRouteSummary(null);
      setRouteLine(null);
      return;
    }
    void computeBestRoute(ambulanceCoords, { lat: activeMission.patientLat, lng: activeMission.patientLng });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeMission?.requestId, ambulanceCoords?.latitude, ambulanceCoords?.longitude]);

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

  const updateMyLocationOnce = async () => {
    if (!accessToken) return;

    const perm = await Location.requestForegroundPermissionsAsync();
    if (perm.status !== Location.PermissionStatus.GRANTED) {
      setErrorMessage('Location permission is required.');
      return;
    }

    const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    await apiPost<any>(
      '/api/ambulance/update-location',
      {
        latitude: current.coords.latitude,
        longitude: current.coords.longitude,
        is_available: status?.is_available ?? true,
      },
      accessToken
    );

    await fetchStatus();
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

    // Best-effort immediate update for faster UI feedback
    try {
      await updateMyLocationOnce();
    } catch {
      // ignore
    }
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

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <StatusBar barStyle={mode === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={headerBg} translucent={false} />

      <ScrollView
        style={{ flex: 1, backgroundColor: colors.background }}
        contentContainerStyle={{ paddingBottom: Math.max(24, insets.bottom + 12) }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <Text style={[styles.title, { color: colors.primary }]}>{title}</Text>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            {!!onBack && (
              <TouchableOpacity onPress={onBack} activeOpacity={0.75}>
                <Text style={[styles.backText, { color: colors.primary }]}>
                  {language === 'sinhala' ? 'ආපසු' : language === 'tamil' ? 'பின்செல்' : 'Back'}
                </Text>
              </TouchableOpacity>
            )}
            {!!onLogout && (
              <TouchableOpacity onPress={onLogout} activeOpacity={0.75}>
                <Text style={[styles.backText, { color: colors.primary }]}>
                  {language === 'sinhala' ? 'පිටවන්න' : language === 'tamil' ? 'வெளியேறு' : 'Logout'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {!!errorMessage && (
          <View style={styles.errorWrap}>
            <Text style={styles.errorIcon}>⚠️</Text>
            <Text style={[styles.errorText, { color: colors.text }]}>{errorMessage}</Text>
          </View>
        )}

        <AmbulanceStatusCard
          colors={{ background: colors.background, card: colors.card, text: colors.text, subtext: colors.subtext, border: colors.border, primary: colors.primary }}
          status={status}
          loading={loadingStatus}
          sharing={sharing}
          errorMessage={errorMessage}
          onRefresh={fetchStatus}
          onToggleAvailability={() => {
            if (!status) return;
            void setAvailability(!status.is_available);
          }}
          onUpdateLocationOnce={() => {
            void updateMyLocationOnce();
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
          onAccept={(id) => { void acceptRequest(id); }}
          onReject={(id) => { void rejectRequest(id); }}
        />
      </ScrollView>
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
