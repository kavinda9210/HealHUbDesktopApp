import React, { useEffect, useMemo, useState, useRef } from 'react';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Platform,
  Linking,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import MapLibreView, { MAPLIBRE_STYLE_STREETS_URL, type MapLibreMarker, type MapLibrePolylinePoint } from '../components/maps/MapLibreView';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';

type LatLng = { lat: number; lng: number };

type DirectionsMapProps = {
  origin?: LatLng | null;
  destination: LatLng;
  destinationName?: string;
  onBack?: () => void;
};

// ---------------------- Distance & Duration formatting (multi‑language) ----------------------
function formatDistance(meters: number, language: string): string {
  if (!Number.isFinite(meters) || meters <= 0) return language === 'sinhala' ? '0 m' : language === 'tamil' ? '0 மீ' : '0 m';
  if (meters >= 1000) {
    const km = (meters / 1000).toFixed(1);
    if (language === 'sinhala') return `${km} km`;
    if (language === 'tamil') return `${km} கிமீ`;
    return `${km} km`;
  }
  const rounded = Math.round(meters);
  if (language === 'sinhala') return `${rounded} m`;
  if (language === 'tamil') return `${rounded} மீ`;
  return `${rounded} m`;
}

function formatDuration(seconds: number, language: string): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return language === 'sinhala' ? '0 min' : language === 'tamil' ? '0 நிமிடம்' : '0 min';
  const mins = Math.round(seconds / 60);
  if (mins < 60) {
    if (language === 'sinhala') return `${mins} min`;
    if (language === 'tamil') return `${mins} நிமிடம்`;
    return `${mins} min`;
  }
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  const hourWord = language === 'sinhala' ? 'පැය' : language === 'tamil' ? 'மணி' : 'hr';
  const minWord = language === 'sinhala' ? 'min' : language === 'tamil' ? 'நிமிடம்' : 'min';
  return m ? `${h} ${hourWord} ${m} ${minWord}` : `${h} ${hourWord}`;
}

// ---------------------- Translation for OSRM step instructions (full Sinhala/Tamil) ----------------------
function translateModifier(modifier: string, language: string): string {
  if (language === 'sinhala') {
    const map: Record<string, string> = {
      left: 'වමට', right: 'දකුණට', 'slight left': 'තරමක් වමට', 'slight right': 'තරමක් දකුණට',
      'sharp left': 'තියුණු වමට', 'sharp right': 'තියුණු දකුණට', straight: 'කෙළින්ම',
      'keep left': 'වම් පැත්තේ රැඳෙන්න', 'keep right': 'දකුණු පැත්තේ රැඳෙන්න',
    };
    return map[modifier] || modifier;
  } else if (language === 'tamil') {
    const map: Record<string, string> = {
      left: 'இடது', right: 'வலது', 'slight left': 'சிறிது இடது', 'slight right': 'சிறிது வலது',
      'sharp left': 'கூரிய இடது', 'sharp right': 'கூரிய வலது', straight: 'நேராக',
      'keep left': 'இடதுபுறமாக செல்', 'keep right': 'வலதுபுறமாக செல்',
    };
    return map[modifier] || modifier;
  }
  return modifier;
}

function translateManeuverType(type: string, language: string): string {
  if (language === 'sinhala') {
    const map: Record<string, string> = {
      turn: 'හැරෙන්න', continue: 'දිගටම යන්න', merge: 'එක් වන්න',
      roundabout: 'වට රවුම', rotary: 'රවුම', arrive: 'ගමනාන්තයට ළඟා වන්න',
      depart: 'ආරම්භ කරන්න', fork: 'දෙකට බෙදීම', 'end of road': 'මාර්ගයේ අවසානය',
    };
    return map[type] || type;
  } else if (language === 'tamil') {
    const map: Record<string, string> = {
      turn: 'திரும்பு', continue: 'தொடர்ந்து செல்', merge: 'இணை', roundabout: 'வட்ட வழி',
      rotary: 'வட்ட வழி', arrive: 'இலக்கை அடைந்தது', depart: 'தொடங்கு',
      fork: 'பிரிவு', 'end of road': 'சாலையின் முடிவு',
    };
    return map[type] || type;
  }
  return type;
}

function translateStepInstruction(
  maneuverType: string,
  modifier: string,
  distanceText: string,
  roadName: string,
  language: string
): string {
  const typeTrans = translateManeuverType(maneuverType, language);
  const dirTrans = modifier ? translateModifier(modifier, language) : '';

  if (maneuverType === 'arrive') {
    if (language === 'sinhala') return 'ගමනාන්තයට ළඟා වන්න';
    if (language === 'tamil') return 'இலக்கை அடைந்தது';
    return 'Arrive at destination';
  }
  if (maneuverType === 'depart') {
    if (distanceText) {
      if (language === 'sinhala') return `${distanceText} සඳහා දිගටම යන්න${roadName}`;
      if (language === 'tamil') return `${distanceText} தொடர்ந்து செல்லுங்கள்${roadName}`;
      return `Start and continue for ${distanceText}${roadName}`;
    }
    if (language === 'sinhala') return `ආරම්භ කරන්න${roadName}`;
    if (language === 'tamil') return `தொடங்குங்கள்${roadName}`;
    return `Start${roadName}`;
  }
  if (maneuverType === 'roundabout' || maneuverType === 'rotary') {
    if (distanceText) {
      if (language === 'sinhala') return `වට රවුමට ඇතුල් වී ${distanceText} සඳහා දිගටම යන්න${roadName}`;
      if (language === 'tamil') return `வட்ட வழிக்குள் சென்று ${distanceText} தொடரவும்${roadName}`;
      return `Enter roundabout and continue for ${distanceText}${roadName}`;
    }
    if (language === 'sinhala') return `වට රවුමට ඇතුල් වන්න${roadName}`;
    if (language === 'tamil') return `வட்ட வழிக்குள் செல்லுங்கள்${roadName}`;
    return `Enter roundabout${roadName}`;
  }
  if (maneuverType === 'turn') {
    if (distanceText) {
      if (language === 'sinhala') return `${dirTrans} ${distanceText} දී හැරෙන්න${roadName}`;
      if (language === 'tamil') return `${distanceText} இல் ${dirTrans} திரும்பவும்${roadName}`;
      return `Turn ${dirTrans} in ${distanceText}${roadName}`;
    }
    if (language === 'sinhala') return `${dirTrans} හැරෙන්න${roadName}`;
    if (language === 'tamil') return `${dirTrans} திரும்பவும்${roadName}`;
    return `Turn ${dirTrans}${roadName}`;
  }
  if (maneuverType === 'merge') {
    if (distanceText) {
      if (language === 'sinhala') return `${distanceText} දී එක් වන්න${roadName}`;
      if (language === 'tamil') return `${distanceText} இல் இணையுங்கள்${roadName}`;
      return `Merge in ${distanceText}${roadName}`;
    }
    if (language === 'sinhala') return `එක් වන්න${roadName}`;
    if (language === 'tamil') return `இணையுங்கள்${roadName}`;
    return `Merge${roadName}`;
  }
  if (maneuverType === 'continue' || maneuverType === 'new name') {
    if (distanceText) {
      if (language === 'sinhala') return `${distanceText} සඳහා දිගටම යන්න${roadName}`;
      if (language === 'tamil') return `${distanceText} தொடர்ந்து செல்லுங்கள்${roadName}`;
      return `Continue for ${distanceText}${roadName}`;
    }
    if (language === 'sinhala') return `දිගටම යන්න${roadName}`;
    if (language === 'tamil') return `தொடர்ந்து செல்லுங்கள்${roadName}`;
    return `Continue${roadName}`;
  }
  if (maneuverType === 'fork') {
    if (distanceText) {
      if (language === 'sinhala') return `${dirTrans} පැත්තේ ${distanceText} දී රැඳෙන්න${roadName}`;
      if (language === 'tamil') return `${dirTrans} பக்கமாக ${distanceText} இல் செல்லுங்கள்${roadName}`;
      return `Keep ${dirTrans} in ${distanceText}${roadName}`;
    }
    if (language === 'sinhala') return `${dirTrans} පැත්තේ රැඳෙන්න${roadName}`;
    if (language === 'tamil') return `${dirTrans} பக்கமாக செல்லுங்கள்${roadName}`;
    return `Keep ${dirTrans}${roadName}`;
  }
  if (maneuverType === 'end of road') {
    if (distanceText) {
      if (language === 'sinhala') return `${dirTrans} ${distanceText} දී හැරෙන්න${roadName}`;
      if (language === 'tamil') return `${distanceText} இல் ${dirTrans} திரும்பவும்${roadName}`;
      return `Turn ${dirTrans} in ${distanceText}${roadName}`;
    }
    if (language === 'sinhala') return `${dirTrans} හැරෙන්න${roadName}`;
    if (language === 'tamil') return `${dirTrans} திரும்பவும்${roadName}`;
    return `Turn ${dirTrans}${roadName}`;
  }
  return `${typeTrans}${dirTrans ? ' ' + dirTrans : ''}${roadName}`;
}

function formatOsrmStep(step: any, language: string): string | null {
  const distance = Number(step?.distance);
  const maneuverType = String(step?.maneuver?.type || '');
  const modifier = String(step?.maneuver?.modifier || '');
  const name = String(step?.name || '').trim();

  const distanceText = Number.isFinite(distance) ? formatDistance(distance, language) : '';
  const roadName = name ? (language === 'sinhala' ? ` ${name} මත` : language === 'tamil' ? ` ${name} இல்` : ` on ${name}`) : '';

  if (maneuverType === 'arrive') {
    if (language === 'sinhala') return 'ගමනාන්තයට ළඟා වන්න';
    if (language === 'tamil') return 'இலக்கை அடைந்தது';
    return 'Arrive at destination';
  }
  const instruction = translateStepInstruction(maneuverType, modifier, distanceText, roadName, language);
  return instruction;
}

// ---------------------- Main Component ----------------------
export default function DirectionsMap({ origin: originProp, destination, destinationName, onBack }: DirectionsMapProps) {
  const { language } = useLanguage();
  const { colors, mode } = useTheme();
  const insets = useSafeAreaInsets();

  const [origin, setOrigin] = useState<LatLng | null>(originProp ?? null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mapFocus, setMapFocus] = useState<{ lat: number; lng: number; zoom: number } | null>(null);
  const [fullScreenMap, setFullScreenMap] = useState(false);
  const [navigationMode, setNavigationMode] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  const [distanceMeters, setDistanceMeters] = useState<number | null>(null);
  const [durationSeconds, setDurationSeconds] = useState<number | null>(null);
  const [polyline, setPolyline] = useState<MapLibrePolylinePoint[] | null>(null);
  const [steps, setSteps] = useState<string[]>([]);

  // Translations
  const title = useMemo(() => {
    if (language === 'sinhala') return 'දිශානතිය';
    if (language === 'tamil') return 'வழிநடத்து';
    return 'Directions';
  }, [language]);

  const distanceLabel = useMemo(() => {
    if (language === 'sinhala') return 'දුර';
    if (language === 'tamil') return 'தூரம்';
    return 'Distance';
  }, [language]);

  const timeLabel = useMemo(() => {
    if (language === 'sinhala') return 'කාලය';
    if (language === 'tamil') return 'நேரம்';
    return 'Time';
  }, [language]);

  const stepsTitle = useMemo(() => {
    if (language === 'sinhala') return 'දිශානති';
    if (language === 'tamil') return 'வழிகாட்டுதல்';
    return 'Steps';
  }, [language]);

  const backLabel = useMemo(() => {
    if (language === 'sinhala') return 'ආපසු';
    if (language === 'tamil') return 'பின்செல்';
    return 'Back';
  }, [language]);

  const loadingText = useMemo(() => {
    if (language === 'sinhala') return 'මාර්ගය සොයමින්...';
    if (language === 'tamil') return 'வழித்தடம் ஏற்றுகிறது...';
    return 'Loading route...';
  }, [language]);

  const retryLabel = useMemo(() => {
    if (language === 'sinhala') return 'නැවත උත්සාහ කරන්න';
    if (language === 'tamil') return 'மீண்டும் முயற்சி';
    return 'Retry';
  }, [language]);

  const startNavLabel = useMemo(() => {
    if (language === 'sinhala') return 'ගමන ආරම්භ කරන්න';
    if (language === 'tamil') return 'வழிச்செலுத்தலைத் தொடங்கு';
    return 'Start Navigation';
  }, [language]);

  const exitNavLabel = useMemo(() => {
    if (language === 'sinhala') return 'ගමන අවසන්';
    if (language === 'tamil') return 'வழிச்செலுத்தலை முடி';
    return 'Exit Navigation';
  }, [language]);

  // Helpers
  const loadOriginIfMissing = async () => {
    if (origin) return origin;
    const perm = await Location.requestForegroundPermissionsAsync();
    if (perm.status !== Location.PermissionStatus.GRANTED) {
      throw new Error(
        language === 'sinhala'
          ? 'ස්ථානයට අවසර අවශ්‍යයි.'
          : language === 'tamil'
          ? 'இட அனுமதி தேவை.'
          : 'Location permission required.'
      );
    }
    const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    const o = { lat: current.coords.latitude, lng: current.coords.longitude };
    setOrigin(o);
    return o;
  };

  const fetchRoute = async () => {
    setError('');
    setLoading(true);
    try {
      const o = await loadOriginIfMissing();
      const url = `https://router.project-osrm.org/route/v1/driving/${o.lng},${o.lat};${destination.lng},${destination.lat}?overview=full&geometries=geojson&steps=true`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Route failed (${res.status})`);
      const data = await res.json();
      const route = data?.routes?.[0];
      const coords: any[] = route?.geometry?.coordinates;
      if (!Array.isArray(coords) || coords.length < 2) throw new Error('No route found');
      const line: MapLibrePolylinePoint[] = coords.map(c => ({ lng: Number(c?.[0]), lat: Number(c?.[1]) })).filter(p => Number.isFinite(p.lat) && Number.isFinite(p.lng));
      setPolyline(line);
      setDistanceMeters(Number(route?.distance) || null);
      setDurationSeconds(Number(route?.duration) || null);
      const rawSteps: any[] = route?.legs?.[0]?.steps;
      const list = Array.isArray(rawSteps)
        ? rawSteps.map(s => formatOsrmStep(s, language)).filter((s): s is string => typeof s === 'string' && s.trim().length > 0)
        : [];
      setSteps(list);
      setCurrentStepIndex(0);
      // Fit map to polyline if possible
      if (line.length > 0) {
        const bounds = line.reduce((acc, p) => ({
          minLat: Math.min(acc.minLat, p.lat), maxLat: Math.max(acc.maxLat, p.lat),
          minLng: Math.min(acc.minLng, p.lng), maxLng: Math.max(acc.maxLng, p.lng),
        }), { minLat: line[0].lat, maxLat: line[0].lat, minLng: line[0].lng, maxLng: line[0].lng });
        setMapFocus({ lat: (bounds.minLat + bounds.maxLat) / 2, lng: (bounds.minLng + bounds.maxLng) / 2, zoom: 12 });
      }
    } catch (e: any) {
      setPolyline(null);
      setSteps([]);
      setDistanceMeters(null);
      setDurationSeconds(null);
      setError(e?.message ? String(e.message) : 'Route failed');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setOrigin(originProp ?? null);
  }, [originProp?.lat, originProp?.lng]);

  useEffect(() => {
    fetchRoute();
  }, [destination.lat, destination.lng, language]);

  const centerOnCurrentLocation = async () => {
    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (perm.status !== Location.PermissionStatus.GRANTED) return;
      const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setMapFocus({ lat: current.coords.latitude, lng: current.coords.longitude, zoom: 15 });
    } catch (e) {
      if (origin) setMapFocus({ lat: origin.lat, lng: origin.lng, zoom: 15 });
      else setMapFocus({ lat: destination.lat, lng: destination.lng, zoom: 15 });
    }
  };

  const openStreetView = async () => {
    const url = `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${destination.lat},${destination.lng}`;
    try { await Linking.openURL(url); } catch {}
  };

  const nextStep = () => {
    if (currentStepIndex < steps.length - 1) setCurrentStepIndex(currentStepIndex + 1);
    else setNavigationMode(false);
  };
  const prevStep = () => {
    if (currentStepIndex > 0) setCurrentStepIndex(currentStepIndex - 1);
  };

  const markers = useMemo<MapLibreMarker[]>(() => {
    const list: MapLibreMarker[] = [];
    if (origin) list.push({ id: 'origin', lat: origin.lat, lng: origin.lng, kind: 'patient', iconText: '📍', title: 'You' });
    list.push({ id: 'dest', lat: destination.lat, lng: destination.lng, kind: 'pin', iconText: '🏥', title: destinationName || 'Destination' });
    return list;
  }, [destination.lat, destination.lng, destinationName, origin]);

  const ModernCard = ({ children, style }: { children: React.ReactNode; style?: any }) => (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border + '40' }, style]}>{children}</View>
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <StatusBar barStyle={mode === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={colors.background} translucent={false} />

      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <MaterialCommunityIcons name="directions" size={28} color={colors.primary} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: colors.primary }]} numberOfLines={1}>{title}</Text>
            {!!destinationName && <Text style={[styles.subtitle, { color: colors.subtext }]} numberOfLines={1}>{destinationName}</Text>}
          </View>
        </View>
        {!!onBack && (
          <TouchableOpacity onPress={onBack} activeOpacity={0.7} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.primary} />
            <Text style={[styles.backText, { color: colors.primary }]}>{backLabel}</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Map container with fixed height – no overlap with ScrollView below */}
      <View style={{ height: 300, position: 'relative' }}>
        <MapLibreView
          styleUrl={MAPLIBRE_STYLE_STREETS_URL}
          markers={markers}
          polyline={polyline}
          focus={mapFocus}
          style={{ flex: 1 }}
        />
        <View style={styles.mapControls}>
          <TouchableOpacity style={[styles.mapControlBtn, { backgroundColor: colors.card }]} onPress={centerOnCurrentLocation}>
            <MaterialCommunityIcons name="crosshairs-gps" size={22} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.mapControlBtn, { backgroundColor: colors.card }]} onPress={openStreetView}>
            <MaterialCommunityIcons name="street-view" size={22} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.mapControlBtn, { backgroundColor: colors.card }]} onPress={() => setFullScreenMap(true)}>
            <Feather name="maximize-2" size={20} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* ScrollView for all route details – placed below map, never overlapping */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(24, insets.bottom + 12) }]}
        showsVerticalScrollIndicator={false}
      >
        <ModernCard>
          {loading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={[styles.loadingText, { color: colors.subtext }]}>{loadingText}</Text>
            </View>
          ) : error ? (
            <View>
              <View style={styles.errorContainer}>
                <Ionicons name="warning-outline" size={24} color={colors.danger} />
                <Text style={[styles.errorText, { color: colors.text, flex: 1, flexWrap: 'wrap' }]}>{error}</Text>
              </View>
              <TouchableOpacity style={[styles.retryButton, { backgroundColor: colors.primary }]} onPress={fetchRoute}>
                <Text style={styles.retryButtonText}>{retryLabel}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.summaryRow}>
              <View style={styles.summaryItem}>
                <Feather name="map-pin" size={20} color={colors.primary} />
                <Text style={[styles.summaryLabel, { color: colors.subtext }]}>{distanceLabel}</Text>
                <Text style={[styles.summaryValue, { color: colors.text }]}>
                  {distanceMeters != null ? formatDistance(distanceMeters, language) : '-'}
                </Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryItem}>
                <Feather name="clock" size={20} color={colors.primary} />
                <Text style={[styles.summaryLabel, { color: colors.subtext }]}>{timeLabel}</Text>
                <Text style={[styles.summaryValue, { color: colors.text }]}>
                  {durationSeconds != null ? formatDuration(durationSeconds, language) : '-'}
                </Text>
              </View>
            </View>
          )}
        </ModernCard>

        {!navigationMode && steps.length > 0 && !loading && !error && (
          <TouchableOpacity style={[styles.startNavButton, { backgroundColor: colors.primary }]} onPress={() => setNavigationMode(true)}>
            <MaterialCommunityIcons name="navigation-variant" size={24} color="#fff" />
            <Text style={styles.startNavText}>{startNavLabel}</Text>
          </TouchableOpacity>
        )}

        {navigationMode && steps.length > 0 && (
          <View style={[styles.navigationPanel, { backgroundColor: colors.card }]}>
            <View style={styles.navHeader}>
              <Text style={[styles.navInstruction, { color: colors.text }]}>{steps[currentStepIndex]}</Text>
            </View>
            <View style={styles.navControls}>
              <TouchableOpacity onPress={prevStep} disabled={currentStepIndex === 0} style={styles.navButton}>
                <Ionicons name="arrow-back" size={24} color={currentStepIndex === 0 ? colors.subtext : colors.primary} />
                <Text style={[styles.navButtonText, { color: currentStepIndex === 0 ? colors.subtext : colors.primary }]}>
                  {language === 'sinhala' ? 'පෙර' : language === 'tamil' ? 'முந்தைய' : 'Prev'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={nextStep} style={styles.navButton}>
                <Text style={[styles.navButtonText, { color: colors.primary }]}>
                  {currentStepIndex === steps.length - 1
                    ? language === 'sinhala' ? 'අවසන්' : language === 'tamil' ? 'முடி' : 'Finish'
                    : language === 'sinhala' ? 'ඊළඟ' : language === 'tamil' ? 'அடுத்த' : 'Next'}
                </Text>
                <Ionicons name="arrow-forward" size={24} color={colors.primary} />
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.exitNavButton} onPress={() => setNavigationMode(false)}>
              <Text style={[styles.exitNavText, { color: colors.danger }]}>{exitNavLabel}</Text>
            </TouchableOpacity>
          </View>
        )}

        {!navigationMode && !loading && !error && steps.length > 0 && (
          <ModernCard>
            <View style={styles.stepsHeader}>
              <Feather name="list" size={20} color={colors.primary} />
              <Text style={[styles.stepsTitle, { color: colors.text }]}>{stepsTitle}</Text>
            </View>
            {steps.map((s, idx) => (
              <View key={idx} style={[styles.stepRow, idx !== 0 && styles.stepSeparator]}>
                <View style={styles.stepNumber}>
                  <Text style={[styles.stepNumberText, { color: colors.primary }]}>{idx + 1}</Text>
                </View>
                <Text style={[styles.stepText, { color: colors.text, flex: 1, flexWrap: 'wrap' }]}>{s}</Text>
              </View>
            ))}
          </ModernCard>
        )}
      </ScrollView>

      {/* Full Screen Map Modal */}
      <Modal visible={fullScreenMap} animationType="slide" onRequestClose={() => setFullScreenMap(false)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', padding: 16 }}>
            <TouchableOpacity onPress={() => setFullScreenMap(false)}><Ionicons name="close" size={28} color={colors.primary} /></TouchableOpacity>
            <TouchableOpacity onPress={centerOnCurrentLocation}><MaterialCommunityIcons name="crosshairs-gps" size={28} color={colors.primary} /></TouchableOpacity>
          </View>
          <View style={{ flex: 1 }}>
            <MapLibreView
              styleUrl={MAPLIBRE_STYLE_STREETS_URL}
              markers={markers}
              polyline={polyline}
              focus={mapFocus}
              style={{ flex: 1 }}
            />
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, gap: 16, paddingTop: 8 },
  card: { borderRadius: 20, borderWidth: 1, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8, gap: 12 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1, flexShrink: 1 },
  title: { fontSize: 20, fontWeight: '700', letterSpacing: -0.3, flexWrap: 'wrap', flexShrink: 1 },
  subtitle: { marginTop: 2, fontSize: 13, fontWeight: '500', flexWrap: 'wrap' },
  backButton: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 20 },
  backText: { fontSize: 14, fontWeight: '500' },
  mapControls: { position: 'absolute', bottom: 10, right: 10, flexDirection: 'row', gap: 8, zIndex: 10 },
  mapControlBtn: { padding: 10, borderRadius: 30, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3.84, elevation: 5 },
  summaryRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' },
  summaryItem: { flex: 1, alignItems: 'center', gap: 5 },
  summaryDivider: { width: 1, height: 40, backgroundColor: '#E5E7EB' },
  summaryLabel: { fontSize: 13, fontWeight: '500', marginTop: 4 },
  summaryValue: { fontSize: 20, fontWeight: '700', marginTop: 2 },
  loadingRow: { alignItems: 'center', justifyContent: 'center', paddingVertical: 20, gap: 12 },
  loadingText: { fontSize: 14, fontWeight: '500' },
  errorContainer: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  errorText: { fontSize: 14, fontWeight: '500', lineHeight: 20 },
  retryButton: { borderRadius: 40, paddingVertical: 10, alignItems: 'center', marginTop: 8 },
  retryButtonText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  startNavButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 40, paddingVertical: 14, marginVertical: 4 },
  startNavText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  navigationPanel: { borderRadius: 24, padding: 20, gap: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 6 },
  navHeader: { alignItems: 'center' },
  navInstruction: { fontSize: 18, fontWeight: '700', textAlign: 'center', lineHeight: 26, flexWrap: 'wrap' },
  navControls: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  navButton: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, paddingHorizontal: 16, borderRadius: 40, backgroundColor: '#F3F4F6' },
  navButtonText: { fontSize: 14, fontWeight: '600' },
  exitNavButton: { alignItems: 'center', paddingTop: 8 },
  exitNavText: { fontSize: 14, fontWeight: '600' },
  stepsHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  stepsTitle: { fontSize: 17, fontWeight: '600', letterSpacing: -0.3 },
  stepRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 12 },
  stepSeparator: { borderTopWidth: 1, borderTopColor: '#E5E7EB' },
  stepNumber: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  stepNumberText: { fontSize: 13, fontWeight: '700' },
  stepText: { fontSize: 14, lineHeight: 20, flexShrink: 1 },
});