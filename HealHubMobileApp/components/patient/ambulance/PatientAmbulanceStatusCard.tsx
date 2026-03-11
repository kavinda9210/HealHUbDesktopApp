import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';

import { apiGet } from '../../../utils/api';

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

export default function PatientAmbulanceStatusCard({ accessToken, language, colors, ambulanceStatus }: Props) {
  const [trackedAmbulance, setTrackedAmbulance] = useState<{ lat: number; lng: number; lastUpdated?: string | null } | null>(null);
  const [trackingError, setTrackingError] = useState<string>('');

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

  const trackingMapUrl = useMemo(() => {
    if (!patientRequestCoords && !trackedAmbulance) return null;

    const centerLat = patientRequestCoords?.lat ?? trackedAmbulance?.lat ?? 0;
    const centerLng = patientRequestCoords?.lng ?? trackedAmbulance?.lng ?? 0;
    const zoom = patientRequestCoords && trackedAmbulance ? 14 : 13;

    const params: string[] = [];
    params.push(`center=${encodeURIComponent(String(centerLat))},${encodeURIComponent(String(centerLng))}`);
    params.push(`zoom=${encodeURIComponent(String(zoom))}`);
    params.push('size=640x360');
    params.push('maptype=mapnik');

    if (patientRequestCoords) {
      params.push(`markers=${encodeURIComponent(String(patientRequestCoords.lat))},${encodeURIComponent(String(patientRequestCoords.lng))},red-pushpin`);
    }
    if (trackedAmbulance) {
      params.push(`markers=${encodeURIComponent(String(trackedAmbulance.lat))},${encodeURIComponent(String(trackedAmbulance.lng))},blue-pushpin`);
      params.push(`ts=${encodeURIComponent(String(Date.now()))}`);
    }

    return `https://staticmap.openstreetmap.de/staticmap.php?${params.join('&')}`;
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

      {!!trackingMapUrl && (
        <View style={[styles.ambulanceMapWrap, { borderColor: colors.border }]}
        >
          <Image
            source={{ uri: trackingMapUrl }}
            style={StyleSheet.absoluteFillObject}
            resizeMode="cover"
          />
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
});
