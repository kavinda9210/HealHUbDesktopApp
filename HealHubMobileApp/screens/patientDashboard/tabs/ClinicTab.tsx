import React, { useMemo } from 'react';
import { ScrollView, Text, TouchableOpacity, View, StyleSheet } from 'react-native';
import { FontAwesome5, Ionicons } from '@expo/vector-icons';
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

export default function ClinicTab({
  language,
  colors,
  clinicList,
  doctorById,
  onShowClinicDetails,
}: ClinicTabProps) {
  // --- Dynamic styles based on theme ----------------------------------------
  const dynamicStyles = useMemo(() => {
    const cardElevation = {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: colors.mode === 'dark' ? 0.2 : 0.05,
      shadowRadius: 8,
      elevation: 3,
    };

    return StyleSheet.create({
      container: {
        paddingHorizontal: 20,
        paddingBottom: 32,
        paddingTop: 12,
      },
      card: {
        backgroundColor: colors.card,
        borderRadius: 28,
        borderWidth: 1,
        borderColor: colors.border,
        padding: 20,
        ...cardElevation,
      },
      headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
      },
      headerIcon: {
        marginRight: 12,
      },
      title: {
        fontSize: 22,
        fontWeight: '700',
        color: colors.text,
      },
      listItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        gap: 12,
      },
      listItemLast: {
        borderBottomWidth: 0,
      },
      infoContainer: {
        flex: 1,
        gap: 4,
      },
      doctorName: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.text,
      },
      whenText: {
        fontSize: 13,
        color: colors.subtext,
        lineHeight: 18,
      },
      detailsButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 40,
        backgroundColor: colors.primary + '10',
      },
      detailsButtonText: {
        fontSize: 13,
        fontWeight: '600',
        color: colors.primary,
      },
      emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 48,
        gap: 12,
      },
      emptyText: {
        fontSize: 14,
        textAlign: 'center',
        color: colors.subtext,
        lineHeight: 20,
      },
    });
  }, [colors]);

  // --- Helper to get clinic date/time string --------------------------------
  const formatClinicWhen = (clinic: ClinicRow) => {
    const date = clinic.clinic_date ? String(clinic.clinic_date) : '';
    const time = clinic.start_time ? String(clinic.start_time).slice(0, 5) : '';
    return date && time ? `${date} • ${time}` : date || time;
  };

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={dynamicStyles.container}
    >
      <View style={dynamicStyles.card}>
        <View style={dynamicStyles.headerRow}>
          <FontAwesome5
            name="clinic-medical"
            size={26}
            color={colors.primary}
            style={dynamicStyles.headerIcon}
          />
          <Text style={dynamicStyles.title}>
            {language === 'sinhala'
              ? 'ක්ලිනික්'
              : language === 'tamil'
              ? 'கிளினிக்'
              : 'Clinic'}
          </Text>
        </View>

        {clinicList.length === 0 ? (
          <View style={dynamicStyles.emptyContainer}>
            <Ionicons name="calendar-outline" size={48} color={colors.subtext + '40'} />
            <Text style={dynamicStyles.emptyText}>
              {language === 'sinhala'
                ? 'ක්ලිනික් දත්ත නොමැත.'
                : language === 'tamil'
                ? 'கிளினிக் தரவு இல்லை.'
                : 'No clinic data.'}
            </Text>
          </View>
        ) : (
          clinicList.map((c, index) => {
            const doc = doctorById[c.doctor_id];
            const doctorName = doc?.full_name
              ? `Dr. ${doc.full_name}`
              : `Doctor #${c.doctor_id}`;
            const whenText = formatClinicWhen(c);
            const isLast = index === clinicList.length - 1;

            return (
              <View
                key={String(c.clinic_id)}
                style={[
                  dynamicStyles.listItem,
                  isLast && dynamicStyles.listItemLast,
                ]}
              >
                <View style={dynamicStyles.infoContainer}>
                  <Text style={dynamicStyles.doctorName}>{doctorName}</Text>
                  <Text style={dynamicStyles.whenText}>{whenText}</Text>
                </View>

                <TouchableOpacity
                  activeOpacity={0.7}
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
                  style={dynamicStyles.detailsButton}
                >
                  <Text style={dynamicStyles.detailsButtonText}>
                    {language === 'sinhala'
                      ? 'විස්තර'
                      : language === 'tamil'
                      ? 'விவரம்'
                      : 'Details'}
                  </Text>
                </TouchableOpacity>
              </View>
            );
          })
        )}
      </View>
    </ScrollView>
  );
}