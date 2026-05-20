import React, { useMemo } from 'react';
import { ScrollView, Text, TouchableOpacity, View, StyleSheet } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import type { MedicalReportRow } from '../types';

type ReportListItem = { id: string; title: string; sub: string; report: MedicalReportRow };

export type ReportsTabProps = {
  language: string;
  colors: any;

  patientReports: ReportListItem[];
  onOpenReportDetails: (report: MedicalReportRow, titleText: string, subText: string) => void;
  onDownloadReportPdf: (report: MedicalReportRow) => Promise<void> | void;
};

export default function ReportsTab({
  language,
  colors,
  patientReports,
  onOpenReportDetails,
  onDownloadReportPdf,
}: ReportsTabProps) {
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
        justifyContent: 'space-between',
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        gap: 12,
      },
      listItemLast: {
        borderBottomWidth: 0,
      },
      textContainer: {
        flex: 1,
        gap: 4,
      },
      reportTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.text,
      },
      reportSub: {
        fontSize: 13,
        color: colors.subtext,
        lineHeight: 18,
      },
      buttonGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
      },
      viewButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderRadius: 30,
        backgroundColor: colors.primary + '10',
      },
      viewButtonText: {
        fontSize: 13,
        fontWeight: '600',
        color: colors.primary,
      },
      downloadButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderRadius: 30,
        backgroundColor: colors.primary + '10',
      },
      downloadButtonText: {
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

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={dynamicStyles.container}
    >
      <View style={dynamicStyles.card}>
        <View style={dynamicStyles.headerRow}>
          <MaterialCommunityIcons
            name="file-document-multiple"
            size={26}
            color={colors.primary}
            style={dynamicStyles.headerIcon}
          />
          <Text style={dynamicStyles.title}>
            {language === 'sinhala'
              ? 'වාර්තා'
              : language === 'tamil'
              ? 'அறிக்கைகள்'
              : 'Reports'}
          </Text>
        </View>

        {patientReports.length === 0 ? (
          <View style={dynamicStyles.emptyContainer}>
            <Ionicons name="document-text-outline" size={48} color={colors.subtext + '40'} />
            <Text style={dynamicStyles.emptyText}>
              {language === 'sinhala'
                ? 'වාර්තා දත්ත නොමැත.'
                : language === 'tamil'
                ? 'அறிக்கை தரவு இல்லை.'
                : 'No reports found.'}
            </Text>
          </View>
        ) : (
          patientReports.map((r, index) => {
            const isLast = index === patientReports.length - 1;
            return (
              <View
                key={r.id}
                style={[
                  dynamicStyles.listItem,
                  isLast && dynamicStyles.listItemLast,
                ]}
              >
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => onOpenReportDetails(r.report, r.title, r.sub)}
                  style={dynamicStyles.textContainer}
                >
                  <Text style={dynamicStyles.reportTitle} numberOfLines={1}>
                    {r.title}
                  </Text>
                  <Text style={dynamicStyles.reportSub} numberOfLines={1}>
                    {r.sub ||
                      (language === 'sinhala'
                        ? 'විස්තර නොමැත'
                        : language === 'tamil'
                        ? 'விவரம் இல்லை'
                        : 'No details')}
                  </Text>
                </TouchableOpacity>

                <View style={dynamicStyles.buttonGroup}>
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => onOpenReportDetails(r.report, r.title, r.sub)}
                    style={dynamicStyles.viewButton}
                  >
                    <Ionicons name="eye-outline" size={14} color={colors.primary} />
                    <Text style={dynamicStyles.viewButtonText}>
                      {language === 'sinhala'
                        ? 'බලන්න'
                        : language === 'tamil'
                        ? 'பார்'
                        : 'View'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => void onDownloadReportPdf(r.report)}
                    style={dynamicStyles.downloadButton}
                  >
                    <Ionicons name="download-outline" size={14} color={colors.primary} />
                    <Text style={dynamicStyles.downloadButtonText}>
                      {language === 'sinhala'
                        ? 'බාගත'
                        : language === 'tamil'
                        ? 'பதிவிறக்கு'
                        : 'Download'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
      </View>
    </ScrollView>
  );
}