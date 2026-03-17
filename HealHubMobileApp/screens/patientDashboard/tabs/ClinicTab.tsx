import React from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { styles } from '../styles';
import type { ClinicRow, DoctorRow } from '../types';

type ClinicDetailsCardData = {
  title: string;
  date: string;
  startTime: string;
  endTime?: string;
  status: string;
  notes?: string;
};

export type ClinicTabProps = {
  language: string;
  colors: any;

  clinicList: ClinicRow[];
  doctorById: Record<number, DoctorRow>;
  onShowClinicDetails: (details: ClinicDetailsCardData) => void;
};

export default function ClinicTab({ language, colors, clinicList, doctorById, onShowClinicDetails }: ClinicTabProps) {
  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
      <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>{language === 'sinhala' ? 'ක්ලිනික්' : language === 'tamil' ? 'கிளினிக்' : 'Clinic'}</Text>

        {clinicList.map((c) => {
          const doc = doctorById[c.doctor_id];
          const doctorName = doc?.full_name ? `Dr. ${doc.full_name}` : `Doctor #${c.doctor_id}`;
          const whenText = `${String(c.clinic_date || '')} • ${String(c.start_time || '').slice(0, 5)}`;
          return (
            <View key={String(c.clinic_id)} style={[styles.itemRow, { borderTopColor: colors.border }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.itemTitle, { color: colors.text }]}>{doctorName}</Text>
                <Text style={[styles.itemSub, { color: colors.subtext }]}>{whenText}</Text>
              </View>
              <TouchableOpacity
                activeOpacity={0.85}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                onPress={() => {
                  onShowClinicDetails({
                    title: doctorName,
                    date: String(c.clinic_date || ''),
                    startTime: String(c.start_time || '').slice(0, 5),
                    endTime: c.end_time ? String(c.end_time).slice(0, 5) : undefined,
                    status: String(c.status || ''),
                    notes: c.notes ? String(c.notes) : undefined,
                  });
                }}
                style={[styles.smallPill, { borderColor: colors.primary }]}
              >
                <Text style={[styles.smallPillText, { color: colors.primary }]}>{language === 'sinhala' ? 'විස්තර' : language === 'tamil' ? 'விவரம்' : 'Details'}</Text>
              </TouchableOpacity>
            </View>
          );
        })}

        {clinicList.length === 0 && (
          <Text style={[styles.cardText, { color: colors.subtext, marginTop: 8 }]}>
            {language === 'sinhala' ? 'ක්ලිනික් දත්ත නොමැත.' : language === 'tamil' ? 'கிளினிக் தரவு இல்லை.' : 'No clinic data.'}
          </Text>
        )}
      </View>
    </ScrollView>
  );
}
