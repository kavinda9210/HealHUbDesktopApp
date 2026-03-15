import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Image, Platform, TouchableOpacity, Linking } from 'react-native';
import * as Location from 'expo-location';

import { apiGet } from '../../../utils/api';
import MapLibreView, { MAPLIBRE_STYLE_STREETS_URL } from '../../maps/MapLibreView';
import { MapErrorBoundary } from '../../ambulance/MapErrorBoundary';
import { buildStaticOsmMapUrl } from '../../ambulance/utils';

type PatientNotification = {
  notification_id: number;
  title: string;
  message: string;
  type: string;
  is_read?: boolean;
  created_at?: string;
};

type Props = {
  accessToken?: string;
  language: 'english' | 'sinhala' | 'tamil' | string;
  colors: { card: string; text: string; subtext: string; border: string };
  ambulanceStatus: PatientNotification | null;
};

function extractMetaValue(text: string | undefined | null, key: string): string | null {
  if (!text) return null;
  const match = String(text).match(new RegExp(`${key}=([^\\s]+)`));
  return match ? String(match[1]) : null;
}

function extractPhoneLoose(text: string | undefined | null): string | null {
  if (!text) return null;
  // Prefer a meta field if present.
  const meta = extractMetaValue(text, 'meta_ambulance_phone');
  if (meta) return meta;
  // Fallback: try to parse from "Driver: name phone".
  const m = String(text).match(/Driver:\s*[^\n]*?([+]?\d[\d\s\-()]{6,})/i);
  if (m && m[1]) return String(m[1]).trim();
  return null;
}

function extractAmbulanceNumber(text: string | undefined | null): string | null {
  const meta = extractMetaValue(text, 'meta_ambulance_number');
  if (meta) return meta;
  const m = String(text || '').match(/Ambulance\s+([^\s]+)\s+(accepted|rejected|is)/i);
  if (m && m[1]) return String(m[1]).trim();
  return null;
}

function approxDistanceMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  // Equirectangular approximation; fine for small distances.
  const toRad = (x: number) => (x * Math.PI) / 180;
  const x = toRad(b.lng - a.lng) * Math.cos(toRad((a.lat + b.lat) / 2));
  const y = toRad(b.lat - a.lat);
  return Math.sqrt(x * x + y * y) * 6371000;
}

export default function PatientAmbulanceStatusCard({ accessToken, language, colors, ambulanceStatus }: Props) {
  const [trackedAmbulance, setTrackedAmbulance] = useState<{ lat: number; lng: number; lastUpdated?: string | null } | null>(null);
  const [trackedAvailable, setTrackedAvailable] = useState<boolean | null>(null);
  const [trackingError, setTrackingError] = useState<string>('');
  const [mapStatus, setMapStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [livePatientCoords, setLivePatientCoords] = useState<{ lat: number; lng: number } | null>(null);

  const activeAmbulanceId = useMemo(() => {
    const idText = extractMetaValue(ambulanceStatus?.message, 'meta_ambulance_id');
    const id = idText ? Number(idText) : NaN;
    return Number.isFinite(id) ? id : null;
  }, [ambulanceStatus?.message]);

  const patientRequestCoords = useMemo(() => {
    const latText = extractMetaValue(ambulanceStatus?.message, 'meta_patient_lat');
    const lngText = extractMetaValue(ambulanceStatus?.message, 'meta_patient_lng');
    const lat = latText ? Number(latText) : NaN;
    const lng = lngText ? Number(lngText) : NaN;
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return { lat, lng };
  }, [ambulanceStatus?.message]);

  // Keep the patient's marker updated in realtime (no refresh required).
  // We avoid prompting for permission here; if permission is already granted (likely from the request flow), we watch.
  useEffect(() => {
    if (Platform.OS === 'web') return;
    if (!ambulanceStatus) {
      setLivePatientCoords(null);
      return;
    }

    let sub: Location.LocationSubscription | null = null;
    let cancelled = false;

    (async () => {
      try {
        const perm = await Location.getForegroundPermissionsAsync();
        if (cancelled) return;
        if (perm.status !== Location.PermissionStatus.GRANTED) return;

        sub = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.Balanced,
            timeInterval: 2500,
            distanceInterval: 3,
          },
          (pos) => {
            const lat = pos?.coords?.latitude;
            const lng = pos?.coords?.longitude;
            if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
            setLivePatientCoords({ lat, lng });
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
  }, [ambulanceStatus]);

  useEffect(() => {
    let cancelled = false;

    if (!accessToken || !activeAmbulanceId) {
      setTrackedAmbulance(null);
      setTrackingError('');
      return;
    }

    async function pollAmbulance() {
      try {
        const res = await apiGet<any>(`/api/patient/ambulances/${activeAmbulanceId}/status`, accessToken);
        if (cancelled) return;

        if (!res.ok || res.data?.success === false) {
          setTrackingError(String(res.data?.message || 'Unable to track ambulance'));
          return;
        }

        const data = res.data?.data ?? {};
        if (typeof data.is_available === 'boolean') {
          setTrackedAvailable(Boolean(data.is_available));
        } else {
          setTrackedAvailable(null);
        }
        const lat = Number(data.current_latitude);
        const lng = Number(data.current_longitude);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
          setTrackingError('Ambulance location is not available yet.');
          return;
        }

        setTrackingError('');
        setTrackedAmbulance({ lat, lng, lastUpdated: data.last_updated ?? null });
      } catch {
        if (!cancelled) setTrackingError('Unable to track ambulance');
      }
    }

    pollAmbulance();
    const interval = setInterval(pollAmbulance, 5000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [accessToken, activeAmbulanceId]);

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
    const patientCoords = livePatientCoords ?? patientRequestCoords;
    if (patientCoords) {
      list.push({
        id: 'patient',
        lat: patientCoords.lat,
        lng: patientCoords.lng,
        color: colors.text,
        title: language === 'sinhala' ? 'ඔබ' : language === 'tamil' ? 'நீங்கள்' : 'You',
        kind: 'patient',
      });
    }
    if (trackedAmbulance) {
      list.push({
        id: 'ambulance',
        lat: trackedAmbulance.lat,
        lng: trackedAmbulance.lng,
        color: colors.text,
        title: language === 'sinhala' ? 'ඇම්බියුලන්ස්' : language === 'tamil' ? 'ஆம்புலன்ஸ்' : 'Ambulance',
        kind: 'ambulance',
      });
    }
    return list;
  }, [colors.text, language, livePatientCoords, patientRequestCoords, trackedAmbulance]);

  const ambulancePhone = useMemo(() => extractPhoneLoose(ambulanceStatus?.message), [ambulanceStatus?.message]);
  const ambulanceNumber = useMemo(() => extractAmbulanceNumber(ambulanceStatus?.message), [ambulanceStatus?.message]);

  const hasReached = useMemo(() => {
    const patientCoords = livePatientCoords ?? patientRequestCoords;
    if (!patientCoords || !trackedAmbulance) return false;
    return approxDistanceMeters(patientCoords, trackedAmbulance) <= 40;
  }, [livePatientCoords, patientRequestCoords, trackedAmbulance]);

  const staticMapUrl = useMemo(() => {
    if (!patientRequestCoords && !trackedAmbulance) return null;

    const centerLat = patientRequestCoords?.lat ?? trackedAmbulance?.lat ?? 0;
    const centerLng = patientRequestCoords?.lng ?? trackedAmbulance?.lng ?? 0;
    const zoom = patientRequestCoords && trackedAmbulance ? 14 : 13;

    const markers: Array<{ lat: number; lng: number; color: 'red' | 'blue' }> = [];
    if (patientRequestCoords) markers.push({ lat: patientRequestCoords.lat, lng: patientRequestCoords.lng, color: 'red' });
    if (trackedAmbulance) markers.push({ lat: trackedAmbulance.lat, lng: trackedAmbulance.lng, color: 'blue' });

    return buildStaticOsmMapUrl({
      centerLat,
      centerLng,
      zoom,
      markers,
      cacheBuster: trackedAmbulance ? String(Date.now()) : undefined,
    });
  }, [patientRequestCoords, trackedAmbulance]);

  return (
    <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>
        {language === 'sinhala'
          ? 'ඇම්බියුලන්ස් ඉල්ලීමේ තත්ත්වය'
          : language === 'tamil'
            ? 'ஆம்புலன்ஸ் கோரிக்கை நிலை'
            : 'Ambulance request status'}
      </Text>

      {!ambulanceStatus ? (
        <Text style={[styles.cardText, { color: colors.subtext, marginTop: 8 }]}>
          {language === 'sinhala'
            ? 'දැනට ක්‍රියාකාරී ඉල්ලීමක් නැත.'
            : language === 'tamil'
              ? 'தற்போது செயலிலுள்ள கோரிக்கை இல்லை.'
              : 'No active request yet.'}
        </Text>
      ) : (
        <View style={[styles.itemRow, { borderTopColor: colors.border }]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.itemTitle, { color: colors.text }]}>{ambulanceStatus.title}</Text>
            <Text style={[styles.itemSub, { color: colors.subtext }]} numberOfLines={3}>
              {ambulanceStatus.message}
            </Text>
          </View>
        </View>
      )}

      {!!trackingError && (
        <Text style={[styles.cardText, { color: colors.subtext, marginTop: 8 }]}>
          {trackingError}
        </Text>
      )}

      {trackedAvailable === false && !!activeAmbulanceId && (
        <Text style={[styles.cardText, { color: colors.subtext, marginTop: 8 }]}>
          {language === 'sinhala'
            ? 'ඇම්බියුලන්ස් ගමන් කරමින් ඇත.'
            : language === 'tamil'
              ? 'ஆம்புலன்ஸ் வருகையில் உள்ளது.'
              : 'Ambulance is on the way.'}
        </Text>
      )}

      {!!ambulancePhone && (
        <TouchableOpacity
          activeOpacity={0.85}
          style={[styles.callBtn, { borderColor: colors.border }]}
          onPress={() => {
            if (Platform.OS === 'web') return;
            void Linking.openURL(`tel:${encodeURIComponent(String(ambulancePhone))}`);
          }}
        >
          <Text style={[styles.callBtnText, { color: colors.text }]}>
            {language === 'sinhala'
              ? `ඇම්බියුලන්ස් අමතන්න${ambulanceNumber ? ` (${ambulanceNumber})` : ''}`
              : language === 'tamil'
                ? `ஆம்புலன்ஸை அழைக்க${ambulanceNumber ? ` (${ambulanceNumber})` : ''}`
                : `Call ambulance${ambulanceNumber ? ` (${ambulanceNumber})` : ''}`}
          </Text>
          <Text style={[styles.callBtnSub, { color: colors.subtext }]}>{ambulancePhone}</Text>
        </TouchableOpacity>
      )}

      {hasReached && (
        <Text style={[styles.cardText, { color: colors.subtext, marginTop: 8 }]}> 
          {language === 'sinhala'
            ? 'ඇම්බියුලන්ස් ඔබ වෙත ළඟා වී ඇත.'
            : language === 'tamil'
              ? 'ஆம்புலன்ஸ் உங்களை அடைந்துள்ளது.'
              : 'Ambulance has reached you.'}
        </Text>
      )}

      {trackedAvailable === true && !!activeAmbulanceId && (
        <Text style={[styles.cardText, { color: colors.subtext, marginTop: 8 }]}>
          {language === 'sinhala'
            ? 'ඇම්බියුලන්ස් දැන් ලබා ගත හැක (මෙහෙයුම අවසන් වී ඇති olabilir).'
            : language === 'tamil'
              ? 'ஆம்புலன்ஸ் தற்போது கிடைக்கிறது (பயணம் முடிந்திருக்கலாம்).'
              : 'Ambulance is now available (mission may be completed).'}
        </Text>
      )}

      {!!staticMapUrl && (
        <View style={[styles.ambulanceMapWrap, { borderColor: colors.border }]}
        >
          {Platform.OS === 'web' ? (
            <Image
              source={{ uri: staticMapUrl }}
              style={StyleSheet.absoluteFillObject}
              resizeMode="cover"
            />
          ) : (
            <MapErrorBoundary
              fallback={(
                <Image
                  source={{ uri: staticMapUrl }}
                  style={StyleSheet.absoluteFillObject}
                  resizeMode="cover"
                />
              )}
            >
              <View style={StyleSheet.absoluteFillObject}>
                <MapLibreView
                  styleUrl={MAPLIBRE_STYLE_STREETS_URL}
                  markers={mapMarkers}
                  polyline={null}
                  focus={patientRequestCoords ? { lat: patientRequestCoords.lat, lng: patientRequestCoords.lng, zoom: 14 } : null}
                  onLoadError={() => setMapStatus('error')}
                />

                {mapStatus === 'error' && (
                  <Image
                    source={{ uri: staticMapUrl }}
                    style={StyleSheet.absoluteFillObject}
                    resizeMode="cover"
                  />
                )}
              </View>
            </MapErrorBoundary>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  sectionCard: {
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '900',
    marginBottom: 10,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
  },
  itemTitle: {
    fontSize: 13,
    fontWeight: '900',
  },
  itemSub: {
    marginTop: 3,
    fontSize: 12,
    fontWeight: '600',
  },
  cardText: {
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  ambulanceMapWrap: {
    marginTop: 12,
    height: 220,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
  },
  callBtn: {
    marginTop: 10,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  callBtnText: {
    fontSize: 13,
    fontWeight: '900',
  },
  callBtnSub: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: '700',
  },
});
