import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, StatusBar, ActivityIndicator, Linking, Platform, Image, Alert } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import * as Location from 'expo-location';

import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { apiPost } from '../utils/api';
import MapLibreView, { MAPLIBRE_STYLE_STREETS_URL } from '../components/maps/MapLibreView';
import { MapErrorBoundary } from '../components/ambulance/MapErrorBoundary';
import { buildStaticOsmMapUrl } from '../components/ambulance/utils';

type NearbyAmbulanceProps = {
  accessToken?: string;
  onBack?: () => void;
};

type Ambulance = {
  ambulance_id: number;
  ambulance_number: string;
  driver_name: string;
  driver_phone: string;
  distance_km?: number;
  estimated_arrival?: number;
  is_available?: boolean;
  current_latitude?: number | null;
  current_longitude?: number | null;
};

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

export default function NearbyAmbulance({ accessToken, onBack }: NearbyAmbulanceProps) {
  const { language } = useLanguage();
  const { colors, mode } = useTheme();
  const insets = useSafeAreaInsets();

  const [permission, setPermission] = useState<Location.PermissionStatus | 'unknown'>('unknown');
  const [coords, setCoords] = useState<Location.LocationObjectCoords | null>(null);
  const [loading, setLoading] = useState(false);
  const [ambulances, setAmbulances] = useState<Ambulance[]>([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [requestingId, setRequestingId] = useState<number | null>(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [mapStatus, setMapStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  const title = useMemo(() => {
    if (language === 'sinhala') return 'ආසන්න ඇම්බියුලන්ස්';
    if (language === 'tamil') return 'அருகிலுள்ள ஆம்புலன்ஸ்';
    return 'Nearby Ambulance';
  }, [language]);

  const subtitle = useMemo(() => {
    if (language === 'sinhala') return 'ඔබගේ ස්ථානය සක්‍රීය කළ පසු ආසන්න ඇම්බියුලන්ස් පෙන්වයි.';
    if (language === 'tamil') return 'உங்கள் இடத்தை இயக்கினால் அருகிலுள்ள ஆம்புலன்ஸ்களை காட்டும்.';
    return 'Turn on location to show nearby ambulances.';
  }, [language]);

  const enableLocationLabel = useMemo(() => {
    if (language === 'sinhala') return 'ස්ථානය සක්‍රීය කරන්න';
    if (language === 'tamil') return 'இடத்தை இயக்கவும்';
    return 'Enable Location';
  }, [language]);

  const refreshLabel = useMemo(() => {
    if (language === 'sinhala') return 'නැවත නැවුම් කරන්න';
    if (language === 'tamil') return 'புதுப்பிக்கவும்';
    return 'Refresh';
  }, [language]);

  const requestLabel = useMemo(() => {
    if (language === 'sinhala') return 'ඉල්ලන්න';
    if (language === 'tamil') return 'கோரு';
    return 'Request';
  }, [language]);

  const directionsLabel = useMemo(() => {
    if (language === 'sinhala') return 'දිශානතිය';
    if (language === 'tamil') return 'வழிநடத்து';
    return 'Directions';
  }, [language]);

  const fetchNearby = async (latitude: number, longitude: number) => {
    if (!accessToken) {
      setErrorMessage('Please log in to request an ambulance');
      return;
    }
    setErrorMessage('');
    setSuccessMessage('');
    const res = await apiPost<any>(
      '/api/patient/ambulances/nearby',
      { latitude, longitude, radius_km: 15, limit: 20 },
      accessToken
    );
    if (!res.ok || res.data?.success === false) {
      const msg = (res.data && (res.data.message || res.data.error)) || 'Failed to fetch nearby ambulances';
      setErrorMessage(String(msg));
      setAmbulances([]);
      return;
    }
    setAmbulances(Array.isArray(res.data?.data) ? res.data.data : []);
  };

  const requestPermissionAndLocation = async () => {
    setLoading(true);
    setErrorMessage('');
    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      setPermission(perm.status);
      if (perm.status !== Location.PermissionStatus.GRANTED) {
        setCoords(null);
        return;
      }
      const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setCoords(current.coords);
      await fetchNearby(current.coords.latitude, current.coords.longitude);
    } finally {
      setLoading(false);
    }
  };

  const requestSpecificAmbulance = async (ambulanceId: number) => {
    if (!accessToken || !coords) return;
    const selected = ambulances.find((a) => a.ambulance_id === ambulanceId) ?? null;
    setRequestingId(ambulanceId);
    setErrorMessage('');
    setSuccessMessage('');
    try {
      const res = await apiPost<any>(
        `/api/patient/ambulances/${ambulanceId}/request`,
        { latitude: coords.latitude, longitude: coords.longitude },
        accessToken
      );
      if (!res.ok || res.data?.success === false) {
        const msg = (res.data && (res.data.message || res.data.error)) || 'Failed to send request';
        setErrorMessage(String(msg));
        return;
      }
      setSuccessMessage(String(res.data?.message || 'Ambulance request sent'));
      try {
        const ambulanceNumber = selected?.ambulance_number ? String(selected.ambulance_number) : String(ambulanceId);
        const phone = selected?.driver_phone ? String(selected.driver_phone) : '';
        const alertTitle = language === 'sinhala' ? 'ඉල්ලීම යවලා ඇත' : language === 'tamil' ? 'கோரிக்கை அனுப்பப்பட்டது' : 'Request Sent';
        const alertBody = (language === 'sinhala'
          ? `ඔබගේ ඉල්ලීම ඇම්බියුලන්ස් ${ambulanceNumber} වෙත යවා ඇත.`
          : language === 'tamil'
            ? `உங்கள் கோரிக்கை ஆம்புலன்ஸ் ${ambulanceNumber} க்கு அனுப்பப்பட்டது.`
            : `Your request has been sent to ambulance ${ambulanceNumber}.`
        ) + (phone ? `\nPhone: ${phone}` : '');
        const buttons: any[] = [];
        if (phone && Platform.OS !== 'web') {
          buttons.push({
            text: language === 'sinhala' ? 'අමතන්න' : language === 'tamil' ? 'அழைக்க' : 'Call',
            onPress: () => void Linking.openURL(`tel:${encodeURIComponent(phone)}`),
          });
        }
        buttons.push({ text: 'OK' });
        Alert.alert(alertTitle, alertBody, buttons);
      } catch { /* ignore */ }
      await fetchNearby(coords.latitude, coords.longitude);
    } finally {
      setRequestingId(null);
    }
  };

  const mapMarkers = useMemo(() => {
    const list: Array<{
      id: string | number;
      lat: number;
      lng: number;
      color?: string;
      title?: string;
      kind?: 'ambulance' | 'patient' | 'pin' | 'default';
      iconText?: string;
    }> = [];
    if (coords) {
      list.push({
        id: 'patient',
        lat: coords.latitude,
        lng: coords.longitude,
        color: colors.danger,
        title: language === 'sinhala' ? 'ඔබ' : language === 'tamil' ? 'நீங்கள்' : 'You',
        kind: 'patient',
      });
    }
    for (const a of ambulances) {
      const lat = typeof a.current_latitude === 'number' ? a.current_latitude : null;
      const lng = typeof a.current_longitude === 'number' ? a.current_longitude : null;
      if (lat == null || lng == null) continue;
      list.push({
        id: a.ambulance_id,
        lat,
        lng,
        color: colors.primary,
        title: String(a.ambulance_number || 'Ambulance'),
        kind: 'ambulance',
      });
    }
    return list;
  }, [ambulances, colors.danger, colors.primary, coords, language]);

  const staticMapUrl = useMemo(() => {
    const centerLat = coords?.latitude ?? (ambulances[0]?.current_latitude ?? 0);
    const centerLng = coords?.longitude ?? (ambulances[0]?.current_longitude ?? 0);
    const markers: Array<{ lat: number; lng: number; color: 'red' | 'blue' }> = [];
    if (coords) markers.push({ lat: coords.latitude, lng: coords.longitude, color: 'red' });
    for (const a of ambulances.slice(0, 8)) {
      const lat = typeof a.current_latitude === 'number' ? a.current_latitude : null;
      const lng = typeof a.current_longitude === 'number' ? a.current_longitude : null;
      if (lat == null || lng == null) continue;
      markers.push({ lat, lng, color: 'blue' });
    }
    return buildStaticOsmMapUrl({
      centerLat: Number(centerLat) || 0,
      centerLng: Number(centerLng) || 0,
      zoom: coords ? 13 : 2,
      markers,
      cacheBuster: mapStatus === 'error' ? String(Date.now()) : undefined,
    });
  }, [ambulances, coords, mapStatus]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <StatusBar barStyle={mode === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={colors.background} translucent={false} />
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.background }}
        contentContainerStyle={{ paddingBottom: Math.max(24, insets.bottom + 12) }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.headerRow}>
          {!!onBack && (
            <TouchableOpacity onPress={onBack} activeOpacity={0.7} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={colors.primary} />
            </TouchableOpacity>
          )}
          <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
        </View>

        <Text style={[styles.subtitle, { color: colors.subtext }]}>{subtitle}</Text>

        {/* Location Card - VERTICAL LAYOUT: icon + text above, button below */}
        <View style={[styles.locationCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.locationTopRow}>
            <View style={styles.locationIconContainer}>
              <View style={[styles.locationIconBg, { backgroundColor: colors.danger + '15' }]}>
                <Ionicons name="location" size={32} color={colors.danger} />
              </View>
            </View>
            <View style={styles.locationContent}>
              <Text style={[styles.locationTitle, { color: colors.text }]}>
                {language === 'sinhala' ? 'ස්ථානය සක්‍රීය කරන්න' : language === 'tamil' ? 'இருப்பிடத்தை இயக்கவும்' : 'Enable Location'}
              </Text>
              <Text style={[styles.locationSub, { color: colors.subtext }]}>
                {language === 'sinhala'
                  ? 'ආසන්න ඇම්බියුලන්ස් සොයා ගැනීමට ස්ථානය සක්‍රීය කරන්න'
                  : language === 'tamil'
                    ? 'அருகிலுள்ள ஆம்புலன்ஸ்களை கண்டறிய இருப்பிடத்தை இயக்கவும்'
                    : 'Enable location to find nearby ambulances'}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.enableButton, { backgroundColor: colors.danger }]}
            activeOpacity={0.8}
            onPress={requestPermissionAndLocation}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <>
                <Ionicons name="navigate" size={18} color="#fff" />
                <Text style={styles.enableButtonText}>{enableLocationLabel}</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* GPS Info Card (unchanged) */}
        <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderLeft}>
              <Ionicons name="location-outline" size={22} color={colors.primary} />
              <Text style={[styles.cardTitle, { color: colors.text }]}>GPS Location</Text>
            </View>
            <TouchableOpacity onPress={requestPermissionAndLocation} activeOpacity={0.7} style={styles.refreshButton}>
              <Ionicons name="refresh-outline" size={18} color={colors.primary} />
              <Text style={[styles.refreshButtonText, { color: colors.primary }]}>{refreshLabel}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.gpsInfoGrid}>
            <View style={styles.gpsRow}>
              <Text style={[styles.gpsLabel, { color: colors.subtext }]}>Permission</Text>
              <View style={styles.permissionBadge}>
                <View style={[styles.permissionDot, { backgroundColor: permission === 'granted' ? '#10B981' : '#F59E0B' }]} />
                <Text style={[styles.gpsValue, { color: colors.text }]}>
                  {permission === 'granted' ? 'Granted' : permission === 'denied' ? 'Denied' : 'Unknown'}
                </Text>
              </View>
            </View>
            <View style={styles.gpsRow}>
              <Text style={[styles.gpsLabel, { color: colors.subtext }]}>Latitude</Text>
              <Text style={[styles.gpsValue, { color: colors.text }]}>{coords ? coords.latitude.toFixed(6) : '—'}</Text>
            </View>
            <View style={styles.gpsRow}>
              <Text style={[styles.gpsLabel, { color: colors.subtext }]}>Longitude</Text>
              <Text style={[styles.gpsValue, { color: colors.text }]}>{coords ? coords.longitude.toFixed(6) : '—'}</Text>
            </View>
          </View>

          {!!errorMessage && (
            <View style={[styles.alertBox, { backgroundColor: colors.danger + '10' }]}>
              <Ionicons name="alert-circle" size={18} color={colors.danger} />
              <Text style={[styles.alertText, { color: colors.danger }]}>{errorMessage}</Text>
            </View>
          )}
          {!!successMessage && (
            <View style={[styles.alertBox, { backgroundColor: colors.primary + '10' }]}>
              <Ionicons name="checkmark-circle" size={18} color={colors.primary} />
              <Text style={[styles.alertText, { color: colors.primary }]}>{successMessage}</Text>
            </View>
          )}
        </View>

        {/* Map Section */}
        {(coords || mapMarkers.length > 0) && (
          <View style={[styles.mapCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.mapTitle, { color: colors.text }]}>Live Location Map</Text>
            <View style={[styles.mapContainer, { borderColor: colors.border }]}>
              {Platform.OS === 'web' ? (
                <View style={styles.mapFallback}>
                  <Ionicons name="map-outline" size={48} color={colors.subtext + '50'} />
                  <Text style={[styles.fallbackText, { color: colors.subtext }]}>Map preview not available on web</Text>
                </View>
              ) : (
                <MapErrorBoundary
                  fallback={
                    <View style={styles.mapFallback}>
                      <Ionicons name="cloud-offline" size={48} color={colors.subtext + '50'} />
                      <Text style={[styles.fallbackText, { color: colors.subtext }]}>Unable to load map</Text>
                    </View>
                  }
                >
                  <View style={StyleSheet.absoluteFillObject}>
                    <MapLibreView
                      styleUrl={MAPLIBRE_STYLE_STREETS_URL}
                      markers={mapMarkers}
                      polyline={null}
                      focus={coords ? { lat: coords.latitude, lng: coords.longitude, zoom: 13 } : null}
                      onLoadError={() => setMapStatus('error')}
                    />
                  </View>
                </MapErrorBoundary>
              )}
            </View>
          </View>
        )}

        {/* Ambulances Section */}
        <View style={[styles.ambulanceCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderLeft}>
              <FontAwesome5 name="ambulance" size={20} color={colors.primary} />
              <Text style={[styles.cardTitle, { color: colors.text }]}>Nearby Ambulances</Text>
            </View>
            <Text style={[styles.ambulanceCount, { color: colors.primary }]}>{ambulances.length} found</Text>
          </View>

          {ambulances.map((a, index) => {
            const busy = a.is_available === false;
            const lat = typeof a.current_latitude === 'number' ? a.current_latitude : null;
            const lng = typeof a.current_longitude === 'number' ? a.current_longitude : null;
            return (
              <View key={String(a.ambulance_id)} style={[styles.ambulanceItem, index !== ambulances.length - 1 && { borderBottomColor: colors.border, borderBottomWidth: 1 }]}>
                <View style={[styles.ambulanceIconBg, { backgroundColor: busy ? colors.subtext + '10' : colors.primary + '10' }]}>
                  <FontAwesome5 name="ambulance" size={24} color={busy ? colors.subtext : colors.primary} />
                </View>

                <View style={styles.ambulanceInfo}>
                  <View style={styles.ambulanceHeader}>
                    <Text style={[styles.ambulanceNumber, { color: colors.text }]}>{a.ambulance_number}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: busy ? colors.subtext + '10' : '#10B98115' }]}>
                      <View style={[styles.statusDot, { backgroundColor: busy ? colors.subtext : '#10B981' }]} />
                      <Text style={[styles.statusText, { color: busy ? colors.subtext : '#10B981' }]}>
                        {busy ? 'Busy' : 'Available'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.ambulanceDetails}>
                    <View style={styles.detailChip}>
                      <Ionicons name="location-outline" size={12} color={colors.subtext} />
                      <Text style={[styles.detailText, { color: colors.subtext }]}>{typeof a.distance_km === 'number' ? `${a.distance_km.toFixed(1)} km` : '—'}</Text>
                    </View>
                    <View style={styles.detailChip}>
                      <Ionicons name="time-outline" size={12} color={colors.subtext} />
                      <Text style={[styles.detailText, { color: colors.subtext }]}>{typeof a.estimated_arrival === 'number' ? `${Math.round(a.estimated_arrival)} min` : '—'}</Text>
                    </View>
                  </View>

                  <View style={styles.driverInfo}>
                    <Ionicons name="person-outline" size={12} color={colors.subtext} />
                    <Text style={[styles.driverText, { color: colors.subtext }]} numberOfLines={1}>
                      {a.driver_name} • {a.driver_phone}
                    </Text>
                  </View>
                </View>

                <View style={styles.ambulanceActions}>
                  {lat != null && lng != null && (
                    <TouchableOpacity
                      activeOpacity={0.7}
                      style={[styles.actionButton, { backgroundColor: colors.primary + '10' }]}
                      onPress={async () => {
                        try { await openDirections(lat, lng); } catch { setErrorMessage('Cannot open Maps'); }
                      }}
                    >
                      <Ionicons name="navigate-outline" size={20} color={colors.primary} />
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    activeOpacity={0.7}
                    disabled={busy || requestingId === a.ambulance_id || !coords}
                    style={[styles.requestButton, { backgroundColor: busy ? colors.border : colors.danger }]}
                    onPress={() => requestSpecificAmbulance(a.ambulance_id)}
                  >
                    {requestingId === a.ambulance_id ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.requestButtonText}>{requestLabel}</Text>}
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}

          {ambulances.length === 0 && coords && (
            <View style={styles.emptyState}>
              <FontAwesome5 name="ambulance" size={48} color={colors.subtext + '30'} />
              <Text style={[styles.emptyText, { color: colors.subtext }]}>No ambulances found nearby</Text>
            </View>
          )}

          {!coords && !loading && permission !== 'granted' && (
            <View style={styles.emptyState}>
              <Ionicons name="location-outline" size={48} color={colors.subtext + '30'} />
              <Text style={[styles.emptyText, { color: colors.subtext }]}>Enable location to see nearby ambulances</Text>
            </View>
          )}

          <View style={styles.noteContainer}>
            <Ionicons name="information-circle-outline" size={14} color={colors.subtext} />
            <Text style={[styles.noteText, { color: colors.subtext }]}>Your GPS location is included with the request</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
    gap: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  subtitle: {
    paddingHorizontal: 20,
    marginTop: 4,
    marginBottom: 16,
    fontSize: 14,
    lineHeight: 20,
    opacity: 0.8,
  },
  // Location card - vertical layout
  locationCard: {
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    gap: 16,
  },
  locationTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  locationIconContainer: {
    flexShrink: 0,
  },
  locationIconBg: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationContent: {
    flex: 1,
    gap: 4,
  },
  locationTitle: {
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 22,
  },
  locationSub: {
    fontSize: 13,
    lineHeight: 18,
  },
  enableButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 40,
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  enableButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  // Rest of styles (unchanged from previous correct version)
  infoCard: {
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  cardHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardTitle: { fontSize: 16, fontWeight: '600' },
  refreshButton: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20 },
  refreshButtonText: { fontSize: 13, fontWeight: '500' },
  gpsInfoGrid: { gap: 12 },
  gpsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
  gpsLabel: { fontSize: 13, fontWeight: '500' },
  gpsValue: { fontSize: 13, fontWeight: '500' },
  permissionBadge: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  permissionDot: { width: 8, height: 8, borderRadius: 4 },
  alertBox: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 16, padding: 12, borderRadius: 12 },
  alertText: { flex: 1, fontSize: 13 },
  mapCard: { marginHorizontal: 20, marginBottom: 16, borderRadius: 20, borderWidth: 1, padding: 20 },
  mapTitle: { fontSize: 16, fontWeight: '600', marginBottom: 12 },
  mapContainer: { height: 240, borderRadius: 16, overflow: 'hidden', borderWidth: 1 },
  mapFallback: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  fallbackText: { fontSize: 14, textAlign: 'center' },
  ambulanceCard: { marginHorizontal: 20, marginBottom: 16, borderRadius: 20, borderWidth: 1, padding: 20 },
  ambulanceCount: { fontSize: 13, fontWeight: '600' },
  ambulanceItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, gap: 16 },
  ambulanceIconBg: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  ambulanceInfo: { flex: 1, gap: 8 },
  ambulanceHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 },
  ambulanceNumber: { fontSize: 16, fontWeight: '600' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 11, fontWeight: '600' },
  ambulanceDetails: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  detailChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, backgroundColor: '#6B728015' },
  detailText: { fontSize: 11, fontWeight: '500' },
  driverInfo: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  driverText: { fontSize: 12, flex: 1 },
  ambulanceActions: { gap: 8, alignItems: 'flex-end' },
  actionButton: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  requestButton: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 24, minWidth: 80, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  requestButtonText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40, gap: 16 },
  emptyText: { fontSize: 14, textAlign: 'center' },
  noteContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#E5E7EB' },
  noteText: { fontSize: 12, textAlign: 'center' },
});