import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Platform,
  Image,
} from 'react-native';
import MapView, { Marker, Polyline, type LatLng } from 'react-native-maps';

import type { AmbulanceStatus, AmbulanceRequest, ActiveMission } from './types';
import { MapErrorBoundary } from './MapErrorBoundary';

type MarkerModel = { id: number; title: string; message: string; lat: number; lng: number };

type Props = {
  colors: { card: string; text: string; subtext: string; border: string; primary: string; danger: string };
  status: AmbulanceStatus | null;

  loadingRequests: boolean;
  requests: AmbulanceRequest[];
  onRefreshRequests: () => void;

  isMapSupported: boolean;
  mapRef: React.MutableRefObject<MapView | null>;
  initialRegion: { latitude: number; longitude: number; latitudeDelta: number; longitudeDelta: number };

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

  onAccept: (notificationId: number) => void;
  onReject: (notificationId: number) => void;
};

export default function AmbulanceRequestsCard(props: Props) {
  const {
    colors,
    status,
    loadingRequests,
    requests,
    onRefreshRequests,
    isMapSupported,
    mapRef,
    initialRegion,
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
    onAccept,
    onReject,
  } = props;

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
          ) : isMapSupported ? (
            <MapErrorBoundary
              fallback={(
                <View style={styles.mapFallbackCenter}>
                  <Text style={[styles.note, { color: colors.subtext, marginTop: 0, textAlign: 'center' }]}>Map failed to load in this build.</Text>
                </View>
              )}
            >
              <MapView
                ref={(r) => { mapRef.current = r; }}
                initialRegion={initialRegion}
                style={StyleSheet.absoluteFillObject}
                showsCompass
                showsScale
                rotateEnabled={false}
              >
                {!!ambulanceCoords && (
                  <Marker
                    coordinate={ambulanceCoords}
                    title="Ambulance"
                    description={status?.ambulance_number ? `Ambulance ${status.ambulance_number}` : undefined}
                    pinColor={colors.primary}
                  />
                )}

                {markers.map((m) => (
                  <Marker
                    key={String(m.id)}
                    coordinate={{ latitude: m.lat, longitude: m.lng }}
                    title={m.title}
                    description={m.message}
                    pinColor={selectedRequestId === m.id ? colors.danger : undefined}
                  />
                ))}

                {!!routeLine?.length && (
                  <Polyline
                    coordinates={routeLine}
                    strokeColor={colors.primary}
                    strokeWidth={4}
                  />
                )}
              </MapView>
            </MapErrorBoundary>
          ) : (
            <>
              <Image
                source={{ uri: staticMapUrl }}
                style={StyleSheet.absoluteFillObject}
                resizeMode="cover"
                onLoad={onStaticMapLoad}
                onError={onStaticMapError}
              />
              {staticMapStatus === 'loading' && (
                <View style={styles.mapFallbackCenter}>
                  <ActivityIndicator />
                </View>
              )}
              {staticMapStatus === 'error' && (
                <View style={styles.mapFallbackCenter}>
                  <Text style={[styles.note, { color: colors.subtext, marginTop: 0, textAlign: 'center' }]}>
                    Unable to load map image. Check your internet connection.
                  </Text>
                </View>
              )}
            </>
          )}
        </View>
      ) : (
        <Text style={[styles.note, { color: colors.subtext }]}>No request locations to show on the map.</Text>
      )}

      {!!activeMission && (
        <View style={[styles.routeCard, { borderTopColor: colors.border }]}
        >
          <Text style={[styles.itemTitle, { color: colors.text }]}>Best route</Text>
          {routeLoading ? (
            <Text style={[styles.itemSub, { color: colors.subtext }]}>Calculating route…</Text>
          ) : routeSummary ? (
            <Text style={[styles.itemSub, { color: colors.subtext }]}>Distance: {routeSummary.distanceKm} km • ETA: {routeSummary.durationMin} min</Text>
          ) : (
            <Text style={[styles.itemSub, { color: colors.subtext }]}>{routeError || 'Route is not available.'}</Text>
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
                      if (isMapSupported) {
                        mapRef.current?.animateToRegion(
                          {
                            latitude: lat,
                            longitude: lng,
                            latitudeDelta: 0.02,
                            longitudeDelta: 0.02,
                          },
                          350,
                        );
                      }
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
