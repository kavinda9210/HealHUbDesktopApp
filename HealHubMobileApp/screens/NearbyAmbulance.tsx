import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, StatusBar, ActivityIndicator } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';

import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';

type NearbyAmbulanceProps = {
  onBack?: () => void;
};

type Ambulance = {
  id: string;
  name: string;
  distanceKm: number;
  etaMin: number;
  phone: string;
  status: 'available' | 'busy';
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function buildAmbulances(): Ambulance[] {
  // UI demo list (replace with real API + GPS later)
  return [
    { id: 'a1', name: 'HealHub Ambulance 01', distanceKm: 1.2, etaMin: 6, phone: '+94 11 200 0001', status: 'available' },
    { id: 'a2', name: 'City Emergency Unit', distanceKm: 2.8, etaMin: 11, phone: '+94 11 200 0002', status: 'available' },
    { id: 'a3', name: 'Community Ambulance', distanceKm: 4.6, etaMin: 18, phone: '+94 11 200 0003', status: 'busy' },
  ];
}

export default function NearbyAmbulance({ onBack }: NearbyAmbulanceProps) {
  const { language } = useLanguage();
  const { colors, mode } = useTheme();
  const insets = useSafeAreaInsets();

  const [permission, setPermission] = useState<Location.PermissionStatus | 'unknown'>('unknown');
  const [coords, setCoords] = useState<Location.LocationObjectCoords | null>(null);
  const [loading, setLoading] = useState(false);

  const title = useMemo(() => {
    if (language === 'sinhala') return 'ආසන්න ඇම්බියුලන්ස්';
    if (language === 'tamil') return 'அருகிலுள்ள ஆம்புலன்ஸ்';
    return 'Nearby Ambulance';
  }, [language]);

  const subtitle = useMemo(() => {
    if (language === 'sinhala') return 'ඔබගේ ස්ථානය සක්‍රීය කළால் ආසන්න ඇම්බියුලන්ස් පෙන්වයි (UI ඩෙමෝ).';
    if (language === 'tamil') return 'உங்கள் இடத்தை இயக்கினால் அருகிலுள்ள ஆம்புலன்ஸ்களை காட்டும் (UI டெமோ).';
    return 'Turn on location to show nearby ambulances (UI demo).';
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

  const requestPermissionAndLocation = async () => {
    setLoading(true);
    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      setPermission(perm.status);
      if (perm.status !== Location.PermissionStatus.GRANTED) {
        setCoords(null);
        return;
      }

      const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setCoords(current.coords);
    } finally {
      setLoading(false);
    }
  };

  const ambulances = useMemo(() => {
    const base = buildAmbulances();
    if (!coords) return base;

    // Minor UI demo tweak based on coordinates to feel “dynamic”
    const nudge = clamp(((coords.latitude + coords.longitude) % 1) * 0.6, 0, 0.6);
    return base.map((a, idx) => ({
      ...a,
      distanceKm: Math.max(0.4, Number((a.distanceKm + (idx % 2 === 0 ? nudge : -nudge)).toFixed(1))),
      etaMin: Math.max(3, Math.round(a.etaMin + (idx % 2 === 0 ? nudge * 6 : -nudge * 6))),
    }));
  }, [coords]);

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
            const busy = a.status === 'busy';
            return (
              <View key={a.id} style={[styles.itemRow, { borderTopColor: colors.border }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.itemTitle, { color: colors.text }]}>{a.name}</Text>
                  <Text style={[styles.itemSub, { color: colors.subtext }]}>
                    {a.distanceKm.toFixed(1)} km • {a.etaMin} min • {busy ? (language === 'sinhala' ? 'කාර්යබහුලයි' : language === 'tamil' ? 'பணியில்' : 'Busy') : (language === 'sinhala' ? 'ලබා ගත හැක' : language === 'tamil' ? 'கிடைக்கும்' : 'Available')}
                  </Text>
                </View>

                <TouchableOpacity
                  activeOpacity={0.85}
                  style={[styles.callBtn, { backgroundColor: busy ? colors.border : colors.primary }]}
                  onPress={() => {
                    // UI only
                    console.log('Call ambulance (UI only):', a.phone);
                  }}
                >
                  <Text style={[styles.callBtnText, { color: '#ffffff' }]}>
                    {language === 'sinhala' ? 'කෝල්' : language === 'tamil' ? 'அழை' : 'Call'}
                  </Text>
                </TouchableOpacity>
              </View>
            );
          })}

          <Text style={[styles.note, { color: colors.subtext }]}>
            {language === 'sinhala'
              ? 'සටහන: මෙය UI පමණි. පසුව සැබෑ සේවා/API, රියදුරු GPS, සහ මාර්ගගත කිරීම එක් කළ හැක.'
              : language === 'tamil'
                ? 'குறிப்பு: இது UI மட்டும். பின்னர் உண்மை சேவை/API, ஓட்டுநர் GPS, வழித்தடம் சேர்க்கலாம்.'
                : 'Note: UI only. Later we can connect real services/API, driver GPS, and routing.'}
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
