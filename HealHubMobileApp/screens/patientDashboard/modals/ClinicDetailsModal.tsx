import React from 'react';
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { styles } from '../styles';

export type ClinicDetailsCardData = {
  title: string;
  date: string;
  startTime: string;
  endTime?: string;
  status: string;
  notes?: string;
};

export type ClinicDetailsModalProps = {
  visible: boolean;
  language: string;
  colors: any;
  mode: 'light' | 'dark';
  data: ClinicDetailsCardData | null;
  onClose: () => void;
};

export default function ClinicDetailsModal({ visible, language, colors, mode, data, onClose }: ClinicDetailsModalProps) {
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

        <View
          style={[
            styles.modalCard,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              shadowColor: mode === 'light' ? colors.text : colors.background,
            },
          ]}
        >
          <View style={styles.modalHeaderRow}>
            <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 0, flex: 1 }]}>
              {language === 'sinhala' ? 'ක්ලිනික් විස්තර' : language === 'tamil' ? 'கிளினிக் விவரங்கள்' : 'Clinic details'}
            </Text>
            <TouchableOpacity activeOpacity={0.85} onPress={onClose} style={[styles.smallPill, { borderColor: colors.border }]}>
              <Text style={[styles.smallPillText, { color: colors.subtext }]}>{language === 'sinhala' ? 'වසන්න' : language === 'tamil' ? 'மூடு' : 'Close'}</Text>
            </TouchableOpacity>
          </View>

          <Text style={[styles.cardText, { color: colors.subtext, marginTop: 10 }]}>{data?.title ? String(data.title) : ''}</Text>

          <Text style={[styles.cardText, { color: colors.subtext, marginTop: 6 }]}>
            {[
              data?.date ? String(data.date) : '',
              data?.startTime ? String(data.startTime) : '',
              data?.endTime ? `- ${String(data.endTime)}` : '',
            ]
              .filter(Boolean)
              .join(' ')}
          </Text>

          <Text style={[styles.cardText, { color: colors.subtext, marginTop: 6 }]}>
            {(language === 'sinhala' ? 'තත්ත්වය: ' : language === 'tamil' ? 'நிலை: ' : 'Status: ') + String(data?.status || '')}
          </Text>

          {!!data?.notes && (
            <Text style={[styles.cardText, { color: colors.subtext, marginTop: 6 }]}>
              {(language === 'sinhala' ? 'සටහන්: ' : language === 'tamil' ? 'குறிப்பு: ' : 'Notes: ') + String(data.notes)}
            </Text>
          )}
        </View>
      </View>
    </Modal>
  );
}
