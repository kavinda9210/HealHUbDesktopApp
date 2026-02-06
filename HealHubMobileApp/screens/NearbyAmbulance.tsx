import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, StatusBar, ActivityIndicator, Linking, Platform } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';

import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { apiPost } from '../utils/api';

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
    return 'Turn on location';
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
      await fetchNearby(coords.latitude, coords.longitude);
    } finally {
      setRequestingId(null);
    }
  };

  const emergencySurface = mode === 'dark' ? '#2b1d1f' : '#fee2e2';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <StatusBar barStyle={mode === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={colors.background} translucent={false} />

      <ScrollView
        style={{ flex: 1, backgroundColor: colors.background }}
        contentContainerStyle={{ paddingBottom: Math.max(24, insets.bottom + 12) }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <Text style={[styles.title, { color: colors.primary }]}>{title}</Text>
          {!!onBack && (
            <TouchableOpacity onPress={onBack} activeOpacity={0.75} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={[styles.backText, { color: colors.primary }]}>
                {language === 'sinhala' ? 'ආපසු' : language === 'tamil' ? 'பின்செல்' : 'Back'}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        <Text style={[styles.subtitle, { color: colors.subtext }]}>{subtitle}</Text>

        <View style={[styles.heroCard, { backgroundColor: emergencySurface, borderColor: colors.border }]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.heroTitle, { color: colors.text }]}>
              {language === 'sinhala' ? 'හදිසි සේවා' : language === 'tamil' ? 'அவசர சேவை' : 'Emergency service'}
            </Text>
            <Text style={[styles.heroSub, { color: colors.subtext }]}>
              {language === 'sinhala'
                ? 'ස්ථානය සක්‍රීය කළ පසු ආසන්න ඇම්බියුලන්ස් ලැයිස්තුගත වේ.'
                : language === 'tamil'
                  ? 'இடம் இயக்கப்பட்டதும் அருகிலுள்ள ஆம்புலன்ஸ் பட்டியல் வரும்.'
                  : 'Once location is enabled, nearby ambulances will be listed.'}
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: colors.danger }]}
            activeOpacity={0.85}
            onPress={requestPermissionAndLocation}
            disabled={loading}
          >
            {loading ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.primaryBtnText}>{enableLocationLabel}</Text>}
          </TouchableOpacity>
        </View>

        <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>GPS</Text>
            <TouchableOpacity
              onPress={requestPermissionAndLocation}
              activeOpacity={0.8}
              style={[styles.refreshBtn, { borderColor: colors.border }]}
            >
              <Text style={[styles.refreshBtnText, { color: colors.subtext }]}>{refreshLabel}</Text>
            </TouchableOpacity>
          </View>

          <Text style={[styles.gpsText, { color: colors.subtext }]}>Permission: {permission}</Text>
          <Text style={[styles.gpsText, { color: colors.subtext }]}>Latitude: {coords ? coords.latitude.toFixed(5) : '-'}</Text>
          <Text style={[styles.gpsText, { color: colors.subtext }]}>Longitude: {coords ? coords.longitude.toFixed(5) : '-'}</Text>

          {!!errorMessage && <Text style={[styles.note, { color: colors.danger }]}>{errorMessage}</Text>}
          {!!successMessage && <Text style={[styles.note, { color: colors.primary }]}>{successMessage}</Text>}

          {permission === Location.PermissionStatus.DENIED && (
            <Text style={[styles.note, { color: colors.subtext }]}>
              {language === 'sinhala'
                ? 'ස්ථානයට අවසර දී නොමැත. නැවත උත්සාහ කරන්න.'
                : language === 'tamil'
                  ? 'இட அனுமதி மறுக்கப்பட்டது. மீண்டும் முயற்சிக்கவும்.'
                  : 'Location permission denied. Try again.'}
            </Text>
          )}
        </View>

        <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Ambulances</Text>

          {ambulances.map((a) => {
            const busy = a.is_available === false;
            const lat = typeof a.current_latitude === 'number' ? a.current_latitude : null;
            const lng = typeof a.current_longitude === 'number' ? a.current_longitude : null;
            return (
              <View key={String(a.ambulance_id)} style={[styles.itemRow, { borderTopColor: colors.border }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.itemTitle, { color: colors.text }]}>{a.ambulance_number}</Text>
                  <Text style={[styles.itemSub, { color: colors.subtext }]}>
                    {typeof a.distance_km === 'number' ? `${a.distance_km.toFixed(1)} km` : '-'} • {typeof a.estimated_arrival === 'number' ? `${Math.round(a.estimated_arrival)} min` : '-'} • {busy ? (language === 'sinhala' ? 'කාර්යබහුලයි' : language === 'tamil' ? 'பணியில்' : 'Busy') : (language === 'sinhala' ? 'ලබා ගත හැක' : language === 'tamil' ? 'கிடைக்கும்' : 'Available')}
                  </Text>
                  <Text style={[styles.itemSub, { color: colors.subtext }]}>Driver: {a.driver_name} • {a.driver_phone}</Text>
                </View>

                <View style={{ gap: 8, alignItems: 'flex-end' }}>
                  {lat != null && lng != null && (
                    <TouchableOpacity
                      activeOpacity={0.85}
                      style={[styles.callBtn, { backgroundColor: colors.border }]}
                      onPress={async () => {
                        try {
                          await openDirections(lat, lng);
                        } catch {
                          setErrorMessage('Cannot open Maps');
                        }
                      }}
                    >
                      <Text style={[styles.callBtnText, { color: colors.text }]}>{directionsLabel}</Text>
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity
                    activeOpacity={0.85}
                    disabled={busy || requestingId === a.ambulance_id || !coords}
                    style={[styles.callBtn, { backgroundColor: busy ? colors.border : colors.primary }]}
                    onPress={() => requestSpecificAmbulance(a.ambulance_id)}
                  >
                    <Text style={[styles.callBtnText, { color: '#ffffff' }]}>
                      {requestingId === a.ambulance_id ? '...' : requestLabel}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}

          <Text style={[styles.note, { color: colors.subtext }]}>
            {language === 'sinhala'
              ? 'සටහන: ඉල්ලීම යවන විට ඔබගේ GPS ස්ථානය ඇතුළත් වේ.'
              : language === 'tamil'
                ? 'குறிப்பு: கோரிக்கை அனுப்பும்போது உங்கள் GPS இடம் சேர்க்கப்படும்.'
                : 'Note: Your GPS location is included with the request.'}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerRow: {
    paddingHorizontal: 20,
    paddingTop: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '900',
  },
  backText: {
    fontSize: 14,
    fontWeight: '900',
  },
  subtitle: {
    paddingHorizontal: 20,
    marginTop: 8,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
  },
  heroCard: {
    marginTop: 14,
    marginHorizontal: 20,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  heroTitle: {
    fontSize: 15,
    fontWeight: '900',
    marginBottom: 4,
  },
  heroSub: {
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 16,
  },
  primaryBtn: {
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 140,
  },
  primaryBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '900',
  },
  sectionCard: {
    marginTop: 14,
    marginHorizontal: 20,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '900',
  },
  refreshBtn: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  refreshBtnText: {
    fontSize: 12,
    fontWeight: '900',
  },
  gpsText: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 4,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  itemTitle: {
    fontSize: 13,
    fontWeight: '900',
  },
  itemSub: {
    marginTop: 3,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 16,
  },
  callBtn: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  callBtnText: {
    fontSize: 12,
    fontWeight: '900',
  },
  note: {
    marginTop: 12,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 16,
  },
});
