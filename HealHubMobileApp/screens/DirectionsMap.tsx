import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';

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

function formatDistance(meters: number): string {
  if (!Number.isFinite(meters) || meters <= 0) return '0 m';
  if (meters >= 1000) return `${(meters / 1000).toFixed(1)} km`;
  return `${Math.round(meters)} m`;
}

function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return '0 min';
  const mins = Math.round(seconds / 60);
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h} hr ${m} min` : `${h} hr`;
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

export default function DirectionsMap(props: DirectionsMapProps) {
  const { origin: originProp, destination, destinationName, onBack } = props;

  const { language } = useLanguage();
  const { colors, mode } = useTheme();
  const insets = useSafeAreaInsets();

  const [origin, setOrigin] = useState<LatLng | null>(originProp ?? null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [distanceMeters, setDistanceMeters] = useState<number | null>(null);
  const [durationSeconds, setDurationSeconds] = useState<number | null>(null);
  const [polyline, setPolyline] = useState<MapLibrePolylinePoint[] | null>(null);
  const [steps, setSteps] = useState<string[]>([]);

  const title = useMemo(() => {
    if (language === 'sinhala') return 'දිශානතිය';
    if (language === 'tamil') return 'வழிநடத்து';
    return 'Directions';
  }, [language]);

  const loadOriginIfMissing = async () => {
    if (origin) return origin;

    const perm = await Location.requestForegroundPermissionsAsync();
    if (perm.status !== Location.PermissionStatus.GRANTED) {
      throw new Error(
        language === 'sinhala'
          ? 'ස්ථානයට අවසර අවශ්‍යයි. Location permission ලබා දෙන්න.'
          : language === 'tamil'
            ? 'இட அனுமதி தேவை. Location permission வழங்கவும்.'
            : 'Location permission is required.'
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
      if (!res.ok) {
        throw new Error(`Route failed (${res.status})`);
      }

      const data = await res.json();
      const route = data?.routes?.[0];
      const coords: any[] = route?.geometry?.coordinates;
      if (!Array.isArray(coords) || coords.length < 2) {
        throw new Error('No route found');
      }

      const line: MapLibrePolylinePoint[] = coords
        .map((c) => ({ lng: Number(c?.[0]), lat: Number(c?.[1]) }))
        .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng));

      setPolyline(line);

      const meters = Number(route?.distance);
      setDistanceMeters(Number.isFinite(meters) ? meters : null);

      const seconds = Number(route?.duration);
      setDurationSeconds(Number.isFinite(seconds) ? seconds : null);

      const rawSteps: any[] = route?.legs?.[0]?.steps;
      const list = Array.isArray(rawSteps)
        ? rawSteps
          .map((s) => formatOsrmStep(s))
          .filter((s): s is string => typeof s === 'string' && s.trim().length > 0)
        : [];
      setSteps(list);
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
    // Re-evaluate origin when prop changes.
    setOrigin(originProp ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [originProp?.lat, originProp?.lng]);

  useEffect(() => {
    fetchRoute();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [destination.lat, destination.lng]);

  const markers = useMemo<MapLibreMarker[]>(() => {
    const list: MapLibreMarker[] = [];
    if (origin) {
      list.push({ id: 'origin', lat: origin.lat, lng: origin.lng, kind: 'patient', iconText: '📍', title: 'You' });
    }
    list.push({ id: 'dest', lat: destination.lat, lng: destination.lng, kind: 'pin', iconText: '🏥', title: destinationName || 'Destination' });
    return list;
  }, [destination.lat, destination.lng, destinationName, origin]);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <StatusBar barStyle={mode === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={colors.background} translucent={false} />

      <View style={[styles.headerRow, { paddingTop: 12, paddingBottom: 10, paddingHorizontal: 20 }]}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: colors.primary }]} numberOfLines={1}>
            {title}
          </Text>
          {!!destinationName && (
            <Text style={[styles.subtitle, { color: colors.subtext }]} numberOfLines={1}>
              {destinationName}
            </Text>
          )}
        </View>

        {!!onBack && (
          <TouchableOpacity onPress={onBack} activeOpacity={0.7} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={[styles.backText, { color: colors.primary }]}>
              {language === 'sinhala' ? 'ආපසු' : language === 'tamil' ? 'பின்செல்' : 'Back'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        style={{ flex: 1, backgroundColor: colors.background }}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: Math.max(24, insets.bottom + 12) }}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.mapWrap, { borderColor: colors.border, backgroundColor: colors.background }]}
        >
          <View style={StyleSheet.absoluteFillObject}>
            <MapLibreView
              styleUrl={MAPLIBRE_STYLE_STREETS_URL}
              markers={markers}
              polyline={polyline}
              focus={null}
            />
          </View>
        </View>

        <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
          {loading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator />
              <Text style={[styles.loadingText, { color: colors.subtext }]}>
                {language === 'sinhala' ? 'මාර්ගය සොයමින්...' : language === 'tamil' ? 'வழித்தடம் ஏற்றுகிறது...' : 'Loading route...'}
              </Text>
            </View>
          ) : error ? (
            <View>
              <Text style={[styles.errorText, { color: colors.text }]}>{error}</Text>
              <TouchableOpacity
                style={[styles.retryBtn, { backgroundColor: colors.primary }]}
                activeOpacity={0.85}
                onPress={fetchRoute}
              >
                <Text style={styles.retryBtnText}>
                  {language === 'sinhala' ? 'නැවත උත්සාහ කරන්න' : language === 'tamil' ? 'மீண்டும் முயற்சி' : 'Retry'}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.summaryRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.summaryLabel, { color: colors.subtext }]}>
                  {language === 'sinhala' ? 'දුර' : language === 'tamil' ? 'தூரம்' : 'Distance'}
                </Text>
                <Text style={[styles.summaryValue, { color: colors.text }]}>
                  {distanceMeters != null ? formatDistance(distanceMeters) : '-'}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.summaryLabel, { color: colors.subtext }]}>
                  {language === 'sinhala' ? 'කාලය' : language === 'tamil' ? 'நேரம்' : 'Time'}
                </Text>
                <Text style={[styles.summaryValue, { color: colors.text }]}>
                  {durationSeconds != null ? formatDuration(durationSeconds) : '-'}
                </Text>
              </View>
            </View>
          )}
        </View>

        <View style={[styles.stepsCard, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
          <Text style={[styles.stepsTitle, { color: colors.text }]}>
            {language === 'sinhala' ? 'දිශානති' : language === 'tamil' ? 'வழிகாட்டுதல்' : 'Steps'}
          </Text>

          {!loading && !error && steps.length === 0 && (
            <Text style={[styles.stepText, { color: colors.subtext }]}>-
            </Text>
          )}

          {!loading && !error && steps.map((s, idx) => (
            <View key={idx} style={[styles.stepRow, { borderTopColor: colors.border }]}>
              <Text style={[styles.stepIndex, { color: colors.subtext }]}>{idx + 1}.</Text>
              <Text style={[styles.stepText, { color: colors.text }]}>{s}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '900',
  },
  subtitle: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: '700',
  },
  backText: {
    fontWeight: '900',
    fontSize: 14,
  },
  mapWrap: {
    height: 340,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
  },
  summaryCard: {
    marginTop: 12,
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: '800',
  },
  summaryValue: {
    marginTop: 4,
    fontSize: 18,
    fontWeight: '900',
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  loadingText: {
    fontSize: 13,
    fontWeight: '800',
  },
  errorText: {
    fontSize: 13,
    fontWeight: '900',
    textAlign: 'center',
  },
  retryBtn: {
    marginTop: 12,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  retryBtnText: {
    color: '#ffffff',
    fontWeight: '900',
    fontSize: 13,
  },
  stepsCard: {
    marginTop: 12,
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
  },
  stepsTitle: {
    fontSize: 14,
    fontWeight: '900',
  },
  stepRow: {
    flexDirection: 'row',
    gap: 10,
    paddingTop: 10,
    marginTop: 10,
    borderTopWidth: 1,
  },
  stepIndex: {
    width: 26,
    fontSize: 12,
    fontWeight: '900',
  },
  stepText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 18,
  },
});
