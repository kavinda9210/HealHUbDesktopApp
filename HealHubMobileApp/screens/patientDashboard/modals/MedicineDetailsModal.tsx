import React from 'react';
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { styles } from '../styles';

export type MedicineDetailsCardData = {
  name: string;
  date: string;
  time: string;
  dosage?: string;
  description?: string;
  doctor?: string;
};

export type MedicineDetailsModalProps = {
  visible: boolean;
  language: string;
  colors: any;
  mode: 'light' | 'dark';
  data: MedicineDetailsCardData | null;
  onClose: () => void;
};

export default function MedicineDetailsModal({ visible, language, colors, mode, data, onClose }: MedicineDetailsModalProps) {
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
              {language === 'sinhala' ? 'ඖෂධ විස්තර' : language === 'tamil' ? 'மருந்து விவரங்கள்' : 'Medicine details'}
            </Text>
            <TouchableOpacity activeOpacity={0.85} onPress={onClose} style={[styles.smallPill, { borderColor: colors.border }]}>
              <Text style={[styles.smallPillText, { color: colors.subtext }]}>{language === 'sinhala' ? 'වසන්න' : language === 'tamil' ? 'மூடு' : 'Close'}</Text>
            </TouchableOpacity>
          </View>

          <Text style={[styles.cardText, { color: colors.subtext, marginTop: 10 }]}>
            {[
              data?.name ? String(data.name) : '',
              data?.date && data?.time ? `${data.date} ${data.time}` : '',
            ]
              .filter(Boolean)
              .join(' • ')}
          </Text>

          {!!data?.dosage && (
            <Text style={[styles.cardText, { color: colors.subtext, marginTop: 6 }]}>
              {(language === 'sinhala' ? 'ඩෝස්: ' : language === 'tamil' ? 'அளவு: ' : 'Dosage: ') + String(data.dosage)}
            </Text>
          )}

          {!!data?.description && (
            <Text style={[styles.cardText, { color: colors.subtext, marginTop: 6 }]}>
              {(language === 'sinhala' ? 'විස්තර: ' : language === 'tamil' ? 'விளக்கம்: ' : 'Description: ') + String(data.description)}
            </Text>
          )}

          {!!data?.doctor && (
            <Text style={[styles.cardText, { color: colors.subtext, marginTop: 6 }]}>
              {(language === 'sinhala' ? 'එක් කළ වෛද්‍යවරයා: ' : language === 'tamil' ? 'சேர்த்த மருத்துவர்: ' : 'Added by: ') + String(data.doctor)}
            </Text>
          )}
        </View>
      </View>
    </Modal>
  );
}
