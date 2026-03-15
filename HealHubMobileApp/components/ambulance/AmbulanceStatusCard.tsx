import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, TextInput, StyleSheet } from 'react-native';

import type { AmbulanceStatus } from './types';

type Props = {
  colors: { background: string; card: string; text: string; subtext: string; border: string; primary: string };
  status: AmbulanceStatus | null;
  loading: boolean;
  sharing: boolean;
  errorMessage?: string;

  liveCoords?: { latitude: number; longitude: number } | null;

  onRefresh: () => void;
  onToggleAvailability: () => void;
  onToggleSharing: () => void;

  // registration
  regNumber: string;
  regDriverName: string;
  regDriverPhone: string;
  regSubmitting: boolean;
  setRegNumber: (v: string) => void;
  setRegDriverName: (v: string) => void;
  setRegDriverPhone: (v: string) => void;
  onSubmitRegister: () => void;
};

export default function AmbulanceStatusCard(props: Props) {
  const {
    colors,
    status,
    loading,
    sharing,
    liveCoords,
    onRefresh,
    onToggleAvailability,
    onToggleSharing,
    regNumber,
    regDriverName,
    regDriverPhone,
    regSubmitting,
    setRegNumber,
    setRegDriverName,
    setRegDriverPhone,
    onSubmitRegister,
  } = props;

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.rowBetween}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Status</Text>
        <TouchableOpacity onPress={onRefresh} activeOpacity={0.8} style={[styles.outlineBtn, { borderColor: colors.border }]}>
          <Text style={[styles.outlineBtnText, { color: colors.subtext }]}>Refresh</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator />
      ) : status ? (
        <>
          <Text style={[styles.kv, { color: colors.subtext }]}>Ambulance: {status.ambulance_number}</Text>
          <Text style={[styles.kv, { color: colors.subtext }]}>Driver: {status.driver_name} • {status.driver_phone}</Text>
          <Text style={[styles.kv, { color: colors.subtext }]}>
            Location: {typeof liveCoords?.latitude === 'number' ? liveCoords.latitude.toFixed(5) : typeof status.current_latitude === 'number' ? status.current_latitude.toFixed(5) : '-'} , {typeof liveCoords?.longitude === 'number' ? liveCoords.longitude.toFixed(5) : typeof status.current_longitude === 'number' ? status.current_longitude.toFixed(5) : '-'}
          </Text>
          <Text style={[styles.kv, { color: colors.subtext }]}>Available: {status.is_available ? 'Yes' : 'No'}</Text>

          <View style={{ flexDirection: 'row', gap: 10, marginTop: 10, flexWrap: 'wrap' }}>
            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
              activeOpacity={0.85}
              onPress={onToggleAvailability}
            >
              <Text style={styles.primaryBtnText}>{status.is_available ? 'Set Unavailable' : 'Set Available'}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.outlineBtn, { borderColor: colors.border }]}
              activeOpacity={0.85}
              onPress={onToggleSharing}
            >
              <Text style={[styles.outlineBtnText, { color: colors.subtext }]}>{sharing ? 'Stop sharing' : 'Share location'}</Text>
            </TouchableOpacity>
          </View>

          <Text style={[styles.note, { color: colors.subtext }]}>Location shares in background when enabled (stores latest offline and syncs when online).</Text>
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
            onPress={onSubmitRegister}
          >
            {regSubmitting ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.primaryBtnText}>Register ambulance</Text>}
          </TouchableOpacity>
        </>
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
  kv: { marginTop: 6, fontSize: 13, fontWeight: '700' },
  note: { marginTop: 10, fontSize: 12, fontWeight: '700' },
  primaryBtn: {
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: { color: '#ffffff', fontSize: 13, fontWeight: '900' },
  outlineBtn: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  outlineBtnText: { fontSize: 12, fontWeight: '800' },
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
