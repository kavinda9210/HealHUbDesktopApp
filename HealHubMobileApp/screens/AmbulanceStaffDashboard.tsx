import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  ActivityIndicator,
  TextInput,
  Linking,
  Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';

import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { apiGet, apiPost } from '../utils/api';

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

function extractLatLng(text: string): { lat: number; lng: number } | null {
  // Matches: "Location: 6.9271, 79.8612"
  const match = text.match(/Location:\s*([-+]?\d+(?:\.\d+)?)\s*,\s*([-+]?\d+(?:\.\d+)?)/i);
  if (!match) return null;
  const lat = Number(match[1]);
  const lng = Number(match[2]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

async function openDirections(lat: number, lng: number) {
  const dest = `${lat},${lng}`;
  const urls: string[] = Platform.OS === 'android'
    ? [
        `google.navigation:q=${encodeURIComponent(dest)}`,
        `geo:${dest}?q=${encodeURIComponent(dest)}`,
        `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(dest)}`,
      ]
    : [
        `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(dest)}`,
      ];

  for (const url of urls) {
    try {
      await Linking.openURL(url);
      return;
    } catch {
      // try next
    }
  }

  throw new Error('Cannot open Maps');
}

export default function AmbulanceStaffDashboard({ accessToken, onBack, onLogout }: AmbulanceStaffDashboardProps) {
  const { language } = useLanguage();
  const { colors, mode } = useTheme();
  const insets = useSafeAreaInsets();

  const watchSub = useRef<Location.LocationSubscription | null>(null);

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

  const title = useMemo(() => {
    if (language === 'sinhala') return 'ඇම්බියුලන්ස් කාර්ය මණ්ඩල ඩෑෂ්බෝඩ්';
    if (language === 'tamil') return 'ஆம்புலன்ஸ் பணியாளர் டாஷ்போர்டு';
    return 'Ambulance Staff Dashboard';
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
    if (!accessToken) return;

    setErrorMessage('');
    const perm = await Location.requestForegroundPermissionsAsync();
    if (perm.status !== Location.PermissionStatus.GRANTED) {
      setErrorMessage('Location permission is required.');
      return;
    }

    setSharing(true);
    watchSub.current?.remove();
    watchSub.current = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.Balanced,
        timeInterval: 8000,
        distanceInterval: 30,
      },
      async (pos) => {
        try {
          await apiPost<any>(
            '/api/ambulance/update-location',
            {
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
              is_available: status?.is_available ?? true,
            },
            accessToken
          );
        } catch {
          // ignore
        }
      }
    );
  };

  const stopSharing = () => {
    setSharing(false);
    watchSub.current?.remove();
    watchSub.current = null;
  };

  const acceptRequest = async (notificationId: number) => {
    if (!accessToken) return;

    setErrorMessage('');
    const res = await apiPost<any>(`/api/ambulance/requests/${notificationId}/accept`, {}, accessToken);
    if (!res.ok || res.data?.success === false) {
      const msg = (res.data && (res.data.message || res.data.error)) || 'Failed to accept request';
      setErrorMessage(String(msg));
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

    return () => {
      watchSub.current?.remove();
      watchSub.current = null;
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

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
          <View style={styles.rowBetween}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Status</Text>
            <TouchableOpacity onPress={fetchStatus} activeOpacity={0.8} style={[styles.outlineBtn, { borderColor: colors.border }]}>
              <Text style={[styles.outlineBtnText, { color: colors.subtext }]}>Refresh</Text>
            </TouchableOpacity>
          </View>

          {loadingStatus ? (
            <ActivityIndicator />
          ) : status ? (
            <>
              <Text style={[styles.kv, { color: colors.subtext }]}>Ambulance: {status.ambulance_number}</Text>
              <Text style={[styles.kv, { color: colors.subtext }]}>Driver: {status.driver_name} • {status.driver_phone}</Text>
              <Text style={[styles.kv, { color: colors.subtext }]}>
                Location: {typeof status.current_latitude === 'number' ? status.current_latitude.toFixed(5) : '-'} , {typeof status.current_longitude === 'number' ? status.current_longitude.toFixed(5) : '-'}
              </Text>
              <Text style={[styles.kv, { color: colors.subtext }]}>Available: {status.is_available ? 'Yes' : 'No'}</Text>

              <View style={{ flexDirection: 'row', gap: 10, marginTop: 10, flexWrap: 'wrap' }}>
                <TouchableOpacity
                  style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
                  activeOpacity={0.85}
                  onPress={() => setAvailability(!status.is_available)}
                >
                  <Text style={styles.primaryBtnText}>{status.is_available ? 'Set Unavailable' : 'Set Available'}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.outlineBtn, { borderColor: colors.border }]}
                  activeOpacity={0.85}
                  onPress={updateMyLocationOnce}
                >
                  <Text style={[styles.outlineBtnText, { color: colors.subtext }]}>Update location</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.outlineBtn, { borderColor: colors.border }]}
                  activeOpacity={0.85}
                  onPress={sharing ? stopSharing : startSharing}
                >
                  <Text style={[styles.outlineBtnText, { color: colors.subtext }]}>{sharing ? 'Stop sharing' : 'Share location'}</Text>
                </TouchableOpacity>
              </View>

              <Text style={[styles.note, { color: colors.subtext }]}>Location shares while this screen is open.</Text>
            </>
          ) : (
            <>
              <Text style={[styles.note, { color: colors.subtext }]}>Ambulance profile not found. Register your ambulance to continue.</Text>
              <TextInput
                value={regNumber}
                onChangeText={setRegNumber}
                placeholder="Ambulance number"
                placeholderTextColor={colors.subtext}
                style={[styles.input, { borderColor: colors.border, color: colors.text }]}
              />
              <TextInput
                value={regDriverName}
                onChangeText={setRegDriverName}
                placeholder="Driver name"
                placeholderTextColor={colors.subtext}
                style={[styles.input, { borderColor: colors.border, color: colors.text }]}
              />
              <TextInput
                value={regDriverPhone}
                onChangeText={setRegDriverPhone}
                placeholder="Driver phone"
                placeholderTextColor={colors.subtext}
                style={[styles.input, { borderColor: colors.border, color: colors.text }]}
                keyboardType="phone-pad"
              />
              <TouchableOpacity
                style={[styles.primaryBtn, { backgroundColor: colors.primary, marginTop: 10 }]}
                activeOpacity={0.85}
                disabled={regSubmitting}
                onPress={submitRegisterAmbulance}
              >
                {regSubmitting ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.primaryBtnText}>Register ambulance</Text>}
              </TouchableOpacity>
            </>
          )}
        </View>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
          <View style={styles.rowBetween}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Requests</Text>
            <TouchableOpacity onPress={fetchRequests} activeOpacity={0.8} style={[styles.outlineBtn, { borderColor: colors.border }]}>
              <Text style={[styles.outlineBtnText, { color: colors.subtext }]}>Refresh</Text>
            </TouchableOpacity>
          </View>

          {loadingRequests ? (
            <ActivityIndicator />
          ) : requests.length === 0 ? (
            <Text style={[styles.note, { color: colors.subtext }]}>No new requests.</Text>
          ) : (
            requests.map((r) => {
              const coords = extractLatLng(r.message);
              return (
                <View key={String(r.notification_id)} style={[styles.itemRow, { borderTopColor: colors.border }]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.itemTitle, { color: colors.text }]}>{r.title}</Text>
                    <Text style={[styles.itemSub, { color: colors.subtext }]}>{r.message}</Text>
                  </View>

                  <View style={{ gap: 8, alignItems: 'flex-end' }}>
                    {coords && (
                      <TouchableOpacity
                        activeOpacity={0.85}
                        style={[styles.outlineBtnSmall, { borderColor: colors.border }]}
                        onPress={async () => {
                          try {
                            await openDirections(coords.lat, coords.lng);
                          } catch (e: any) {
                            setErrorMessage(e?.message ? String(e.message) : 'Cannot open Maps');
                          }
                        }}
                      >
                        <Text style={[styles.outlineBtnText, { color: colors.subtext }]}>Directions</Text>
                      </TouchableOpacity>
                    )}

                    <TouchableOpacity
                      activeOpacity={0.85}
                      style={[styles.primaryBtnSmall, { backgroundColor: colors.primary }]}
                      onPress={() => acceptRequest(r.notification_id)}
                    >
                      <Text style={styles.primaryBtnText}>Accept</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      activeOpacity={0.85}
                      style={[styles.outlineBtnSmall, { borderColor: colors.border }]}
                      onPress={() => rejectRequest(r.notification_id)}
                    >
                      <Text style={[styles.outlineBtnText, { color: colors.subtext }]}>Reject</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}
        </View>
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
