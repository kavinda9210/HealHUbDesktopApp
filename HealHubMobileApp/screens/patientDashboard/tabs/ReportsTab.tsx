import React from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { styles } from '../styles';
import type { MedicalReportRow } from '../types';

type ReportListItem = { id: string; title: string; sub: string; report: MedicalReportRow };

export type ReportsTabProps = {
  language: string;
  colors: any;

  patientReports: ReportListItem[];
  onOpenReportDetails: (report: MedicalReportRow, titleText: string, subText: string) => void;
  onDownloadReportPdf: (report: MedicalReportRow) => Promise<void> | void;
};

export default function ReportsTab({ language, colors, patientReports, onOpenReportDetails, onDownloadReportPdf }: ReportsTabProps) {
  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
      <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>{language === 'sinhala' ? 'වාර්තා' : language === 'tamil' ? 'அறிக்கைகள்' : 'Reports'}</Text>

        {patientReports.map((r) => (
          <View key={r.id} style={[styles.itemRow, { borderTopColor: colors.border, alignItems: 'center' }]}>
            <TouchableOpacity activeOpacity={0.85} onPress={() => onOpenReportDetails(r.report, r.title, r.sub)} style={{ flex: 1 }}>
              <Text style={[styles.itemTitle, { color: colors.text }]} numberOfLines={1}>
                {r.title}
              </Text>
              <Text style={[styles.itemSub, { color: colors.subtext }]} numberOfLines={1}>
                {r.sub || (language === 'sinhala' ? 'විස්තර නොමැත' : language === 'tamil' ? 'விவரம் இல்லை' : 'No details')}
              </Text>
            </TouchableOpacity>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => onOpenReportDetails(r.report, r.title, r.sub)}
                style={[styles.smallPill, { borderColor: colors.border }]}
                accessibilityRole="button"
                accessibilityLabel="View report"
              >
                <Text style={[styles.smallPillText, { color: colors.subtext }]}>{language === 'sinhala' ? 'බලන්න' : language === 'tamil' ? 'பார்' : 'View'}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => void onDownloadReportPdf(r.report)}
                style={[styles.smallPill, { borderColor: colors.primary }]}
                accessibilityRole="button"
                accessibilityLabel="Download report"
              >
                <Text style={[styles.smallPillText, { color: colors.primary }]}>{language === 'sinhala' ? 'බාගත' : language === 'tamil' ? 'பதிவிறக்கு' : 'Download'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}

        {patientReports.length === 0 && (
          <Text style={[styles.cardText, { color: colors.subtext, marginTop: 8 }]}>
            {language === 'sinhala' ? 'වාර්තා දත්ත නොමැත.' : language === 'tamil' ? 'அறிக்கை தரவு இல்லை.' : 'No reports found.'}
          </Text>
        )}
      </View>
    </ScrollView>
  );
}
