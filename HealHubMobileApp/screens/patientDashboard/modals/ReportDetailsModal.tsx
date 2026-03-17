import React from 'react';
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { styles } from '../styles';

export type ReportDetailsCardData = {
  title: string;
  created: string;
  doctor?: string;
  specialization?: string;
  link?: string;
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
          <View style={styles.modalHeaderRow}>
            <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 0, flex: 1 }]} numberOfLines={2}>
              {data?.title ? String(data.title) : ''}
            </Text>
            <TouchableOpacity activeOpacity={0.85} onPress={onClose} style={[styles.smallPill, { borderColor: colors.border }]}>
              <Text style={[styles.smallPillText, { color: colors.subtext }]}>{language === 'sinhala' ? 'වසන්න' : language === 'tamil' ? 'மூடு' : 'Close'}</Text>
            </TouchableOpacity>
          </View>

          <Text style={[styles.cardText, { color: colors.subtext, marginTop: 6 }]}>
            {[data?.created, data?.doctor, data?.specialization ? `(${data.specialization})` : ''].filter(Boolean).join(' • ')}
          </Text>

          {!!data?.link && (
            <Text style={[styles.cardText, { color: colors.subtext, marginTop: 6 }]}>
              {(language === 'sinhala' ? 'සබැඳිය: ' : language === 'tamil' ? 'இணைப்பு: ' : 'Link: ') + String(data.link)}
            </Text>
          )}

          {!!data?.diagnosis && (
            <Text style={[styles.cardText, { color: colors.text, marginTop: 10 }]}>
              {(language === 'sinhala' ? 'රෝග නිර්ණය: ' : language === 'tamil' ? 'நோய் கண்டறிதல்: ' : 'Diagnosis: ') + String(data.diagnosis)}
            </Text>
          )}

          {!!data?.prescription && (
            <Text style={[styles.cardText, { color: colors.text, marginTop: 6 }]}>
              {(language === 'sinhala' ? 'ප්‍රතිකාර/ඖෂධ: ' : language === 'tamil' ? 'மருந்து: ' : 'Prescription: ') + String(data.prescription)}
            </Text>
          )}

          {!!data?.notes && (
            <Text style={[styles.cardText, { color: colors.text, marginTop: 6 }]}>
              {(language === 'sinhala' ? 'සටහන්: ' : language === 'tamil' ? 'குறிப்புகள்: ' : 'Notes: ') + String(data.notes)}
            </Text>
          )}
        </View>
      </View>
    </Modal>
  );
}
