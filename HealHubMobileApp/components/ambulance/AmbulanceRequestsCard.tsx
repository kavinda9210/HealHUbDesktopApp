import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Platform,
  Image,
  Linking,
} from 'react-native';
import MapLibreView from '../maps/MapLibreView';

import type { AmbulanceStatus, AmbulanceRequest, ActiveMission } from './types';
import { MapErrorBoundary } from './MapErrorBoundary';

type MarkerModel = { id: number; title: string; message: string; lat: number; lng: number };

type LatLng = { latitude: number; longitude: number };

type Props = {
  colors: { card: string; text: string; subtext: string; border: string; primary: string; danger: string };
  status: AmbulanceStatus | null;

  loadingRequests: boolean;
  requests: AmbulanceRequest[];
  onRefreshRequests: () => void;

  ambulanceCoords: LatLng | null;
  markers: MarkerModel[];
  selectedRequestId: number | null;
  onSelectRequestId: (id: number | null) => void;

  staticMapUrl: string;
  staticMapStatus: 'loading' | 'ready' | 'error';
  onStaticMapLoad: () => void;
  onStaticMapError: () => void;

  activeMission: ActiveMission | null;
  routeLoading: boolean;
  routeSummary: { distanceKm: number; durationMin: number } | null;
  routeLine: Array<{ latitude: number; longitude: number }> | null;
  routeError: string;

  routeSteps?: string[] | null;
  reachedPatient?: boolean;
  patientPhone?: string | null;

  onAccept: (notificationId: number) => void;
  onReject: (notificationId: number) => void;
  onCompleteMission: () => void;
};

export default function AmbulanceRequestsCard(props: Props) {
  const {
    colors,
    status,
    loadingRequests,
    requests,
    onRefreshRequests,
    ambulanceCoords,
    markers,
    selectedRequestId,
    onSelectRequestId,
    staticMapUrl,
    staticMapStatus,
    onStaticMapLoad,
    onStaticMapError,
    activeMission,
    routeLoading,
    routeSummary,
    routeLine,
    routeError,
    routeSteps,
    reachedPatient,
    patientPhone,
    onAccept,
    onReject,
    onCompleteMission,
  } = props;

  const mapMarkers = React.useMemo(() => {
    const list: Array<{
      id: string | number;
      lat: number;
      lng: number;
      color?: string;
      title?: string;
      kind?: 'ambulance' | 'patient' | 'pin' | 'default';
      iconText?: string;
    }> = [];
    if (ambulanceCoords) {
      list.push({
        id: 'ambulance',
        lat: ambulanceCoords.latitude,
        lng: ambulanceCoords.longitude,
        color: colors.primary,
        title: status?.ambulance_number ? `Ambulance ${status.ambulance_number}` : 'Ambulance',
        kind: 'ambulance',
      });
    }
    for (const m of markers) {
      list.push({
        id: m.id,
        lat: m.lat,
        lng: m.lng,
        color: selectedRequestId === m.id ? colors.danger : '#2E8B57',
        title: m.title,
        kind: 'patient',
      });
    }
    return list;
  }, [ambulanceCoords, colors.danger, colors.primary, markers, selectedRequestId, status?.ambulance_number]);

  const routePoints = React.useMemo(() => {
    if (!routeLine || routeLine.length < 2) return [];
    return routeLine.map((p) => ({ lat: p.latitude, lng: p.longitude }));
  }, [routeLine]);

  const focus = React.useMemo(() => {
    if (!selectedRequestId) return null;
    const t = markers.find((m) => m.id === selectedRequestId);
    if (!t) return null;
    return { lat: t.lat, lng: t.lng, zoom: 15 };
  }, [markers, selectedRequestId]);

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.rowBetween}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Requests</Text>
        <TouchableOpacity onPress={onRefreshRequests} activeOpacity={0.8} style={[styles.outlineBtn, { borderColor: colors.border }]}>
          <Text style={[styles.outlineBtnText, { color: colors.subtext }]}>Refresh</Text>
        </TouchableOpacity>
      </View>

      {(markers.length > 0 || !!ambulanceCoords) ? (
        <View style={[styles.mapWrap, { borderColor: colors.border }]}
        >
          {Platform.OS === 'web' ? (
            <View style={styles.mapFallbackCenter}>
              <Text style={[styles.note, { color: colors.subtext, marginTop: 0 }]}>Map is not available on web.</Text>
            </View>
          ) : (
            <MapErrorBoundary
              fallback={(
                <View style={styles.mapFallbackCenter}>
                  <Text style={[styles.note, { color: colors.subtext, marginTop: 0, textAlign: 'center' }]}>Map failed to load. Check your internet connection.</Text>
                </View>
              )}
            >
              <View style={StyleSheet.absoluteFillObject}>
                <MapLibreView
                  markers={mapMarkers}
                  polyline={routePoints}
                  focus={focus}
                  onLoadError={() => {
                    // Fall back to static map image if interactive map fails.
                    onStaticMapError();
                  }}
                />

                {staticMapStatus === 'error' && (
                  <Image
                    source={{ uri: staticMapUrl }}
                    style={StyleSheet.absoluteFillObject}
                    resizeMode="cover"
                    onLoad={onStaticMapLoad}
                    onError={onStaticMapError}
                  />
                )}
              </View>
            </MapErrorBoundary>
          )}
        </View>
      ) : (
        <Text style={[styles.note, { color: colors.subtext }]}>No request locations to show on the map.</Text>
      )}

      {!!activeMission && (
        <View style={[styles.routeCard, { borderTopColor: colors.border }]}
        >
          <View style={styles.rowBetweenTight}>
            <Text style={[styles.itemTitle, { color: colors.text }]}>Best route</Text>
            <TouchableOpacity
              activeOpacity={0.85}
              style={[styles.outlineBtnSmall, { borderColor: colors.border }]}
              onPress={onCompleteMission}
            >
              <Text style={[styles.outlineBtnText, { color: colors.subtext }]}>Complete</Text>
            </TouchableOpacity>
          </View>
          {routeLoading ? (
            <Text style={[styles.itemSub, { color: colors.subtext }]}>Calculating route…</Text>
          ) : routeSummary ? (
            <Text style={[styles.itemSub, { color: colors.subtext }]}>Distance: {routeSummary.distanceKm} km • ETA: {routeSummary.durationMin} min</Text>
          ) : (
            <Text style={[styles.itemSub, { color: colors.subtext }]}>{routeError || 'Route is not available.'}</Text>
          )}

          {reachedPatient && (
            <Text style={[styles.itemSub, { color: colors.subtext, marginTop: 8 }]}>You reached the patient.</Text>
          )}

          {!!patientPhone && reachedPatient && (
            <TouchableOpacity
              activeOpacity={0.85}
              style={[styles.outlineBtnSmall, { borderColor: colors.border, alignSelf: 'flex-start', marginTop: 10 }]}
              onPress={() => {
                if (Platform.OS === 'web') return;
                void Linking.openURL(`tel:${encodeURIComponent(String(patientPhone))}`);
              }}
            >
              <Text style={[styles.outlineBtnText, { color: colors.subtext }]}>Call patient • {patientPhone}</Text>
            </TouchableOpacity>
          )}

          {!!routeSteps && routeSteps.length > 0 && (
            <View style={{ marginTop: 10 }}>
              {routeSteps.slice(0, 8).map((s, idx) => (
                <Text key={String(idx)} style={[styles.stepText, { color: colors.subtext }]} numberOfLines={2}>
                  {idx + 1}. {s}
                </Text>
              ))}
            </View>
          )}
        </View>
      )}

      {loadingRequests ? (
        <ActivityIndicator style={{ marginTop: 12 }} />
      ) : requests.length === 0 ? (
        <Text style={[styles.note, { color: colors.subtext }]}>No new requests.</Text>
      ) : (
        requests.map((r) => {
          const coordsMatch = r.message.match(/Location:\s*([-+]?\d+(?:\.\d+)?)\s*,\s*([-+]?\d+(?:\.\d+)?)/i);
          const hasCoords = !!coordsMatch;
          const lat = coordsMatch ? Number(coordsMatch[1]) : NaN;
          const lng = coordsMatch ? Number(coordsMatch[2]) : NaN;

          return (
            <View key={String(r.notification_id)} style={[styles.itemRow, { borderTopColor: colors.border }]}
            >
              <View style={{ flex: 1 }}>
                <Text style={[styles.itemTitle, { color: colors.text }]}>{r.title}</Text>
                <Text style={[styles.itemSub, { color: colors.subtext }]}>{r.message}</Text>
              </View>

              <View style={{ gap: 8, alignItems: 'flex-end' }}>
                {hasCoords && Number.isFinite(lat) && Number.isFinite(lng) && (
                  <TouchableOpacity
                    activeOpacity={0.85}
                    style={[styles.outlineBtnSmall, { borderColor: colors.border }]}
                    onPress={() => {
                      onSelectRequestId(r.notification_id);
                    }}
                  >
                    <Text style={[styles.outlineBtnText, { color: colors.subtext }]}>Show on map</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  activeOpacity={0.85}
                  style={[styles.primaryBtnSmall, { backgroundColor: colors.primary }]}
                  onPress={() => onAccept(r.notification_id)}
                >
                  <Text style={styles.primaryBtnText}>Accept</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.85}
                  style={[styles.outlineBtnSmall, { borderColor: colors.border }]}
                  onPress={() => onReject(r.notification_id)}
                >
                  <Text style={[styles.outlineBtnText, { color: colors.subtext }]}>Reject</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: 14,
    marginHorizontal: 20,
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
  },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  rowBetweenTight: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '900' },
  note: { marginTop: 10, fontSize: 12, fontWeight: '700' },
  mapWrap: {
    marginTop: 12,
    height: 240,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
  },
  mapFallbackCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  routeCard: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
  },
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
  stepText: { marginTop: 4, fontSize: 12, fontWeight: '700', lineHeight: 16 },
  primaryBtnSmall: {
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 86,
  },
  primaryBtnText: { color: '#ffffff', fontSize: 13, fontWeight: '900' },
});
