import React from 'react';
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { styles } from '../styles';

export type ReportDetailsCardData = {
  title: string;
  created: string;
  patientName?: string;
  doctor?: string;
  specialization?: string;
  link?: string;
  nextClinicDate?: string;
  diagnosis?: string;
  prescription?: string;
  notes?: string;
};

export type ReportDetailsModalProps = {
  visible: boolean;
  language: string;
  colors: any;
  mode: 'light' | 'dark';
  data: ReportDetailsCardData | null;
  onClose: () => void;
};

export default function ReportDetailsModal({ visible, language, colors, mode, data, onClose }: ReportDetailsModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      presentationStyle="overFullScreen"
      statusBarTranslucent
      hardwareAccelerated
      onRequestClose={onClose}
    >
      <View style={styles.modalWrap}>
        <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose}>
          <View
            style={[
              StyleSheet.absoluteFillObject,
              {
                backgroundColor: mode === 'light' ? colors.text : colors.background,
                opacity: mode === 'light' ? 0.35 : 0.78,
              },
            ]}
          />
        </Pressable>

        <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={{ backgroundColor: colors.primary, borderRadius: 22, padding: 18, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <View style={{ width: 54, height: 54, borderRadius: 16, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' }}>
              <View style={{ width: 30, height: 30, backgroundColor: colors.primary, borderRadius: 7, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: '#fff', fontSize: 18, fontWeight: '800' }}>+</Text>
              </View>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: '#fff', fontSize: 20, fontWeight: '800' }} numberOfLines={2}>
                {data?.title ? String(data.title) : ''}
              </Text>
              <Text style={{ color: 'rgba(255,255,255,0.9)', marginTop: 4 }} numberOfLines={2}>
                HealHub Medical Report
              </Text>
            </View>
            <TouchableOpacity activeOpacity={0.85} onPress={onClose} style={{ backgroundColor: 'rgba(255,255,255,0.18)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999 }}>
              <Text style={{ color: '#fff', fontWeight: '700' }}>{language === 'sinhala' ? 'වසන්න' : language === 'tamil' ? 'மூடு' : 'Close'}</Text>
            </TouchableOpacity>
          </View>

          <View style={{ marginTop: 16, backgroundColor: colors.background, borderRadius: 18, padding: 14, borderWidth: 1, borderColor: colors.border, gap: 8 }}>
            <Text style={{ color: colors.text, fontSize: 15, fontWeight: '700' }}>
              {data?.patientName ? `Patient: ${data.patientName}` : 'Patient'}
            </Text>
            <Text style={{ color: colors.subtext }}>
              {[data?.created, data?.doctor, data?.specialization ? `(${data.specialization})` : ''].filter(Boolean).join(' • ')}
            </Text>
            {!!data?.nextClinicDate && (
              <Text style={{ color: colors.subtext }}>
                {(language === 'sinhala' ? 'ඊළඟ ක්ලිනික් දිනය: ' : language === 'tamil' ? 'அடுத்த கிளினிக் தேதி: ' : 'Next clinic date: ') + String(data.nextClinicDate)}
              </Text>
            )}
          </View>

          <View style={{ marginTop: 14, gap: 10 }}>
            {!!data?.diagnosis && (
              <View style={{ backgroundColor: colors.background, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: colors.border }}>
                <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '700', marginBottom: 4 }}>{language === 'sinhala' ? 'රෝග නිර්ණය' : language === 'tamil' ? 'நோய் கண்டறிதல்' : 'Diagnosis'}</Text>
                <Text style={{ color: colors.text }}>{String(data.diagnosis)}</Text>
              </View>
            )}

            {!!data?.prescription && (
              <View style={{ backgroundColor: colors.background, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: colors.border }}>
                <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '700', marginBottom: 4 }}>{language === 'sinhala' ? 'ප්‍රතිකාර/ඖෂධ' : language === 'tamil' ? 'மருந்து' : 'Prescription'}</Text>
                <Text style={{ color: colors.text }}>{String(data.prescription)}</Text>
              </View>
            )}

            {!!data?.notes && (
              <View style={{ backgroundColor: colors.background, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: colors.border }}>
                <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '700', marginBottom: 4 }}>{language === 'sinhala' ? 'සටහන්' : language === 'tamil' ? 'குறிப்புகள்' : 'Notes'}</Text>
                <Text style={{ color: colors.text }}>{String(data.notes)}</Text>
              </View>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}
