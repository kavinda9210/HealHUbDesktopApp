import React, { useMemo } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import PatientAmbulanceStatusCard from '../../../components/patient/ambulance/PatientAmbulanceStatusCard';
import type { PatientTabKey } from '../../../components/patient/tabs';
import { styles } from '../styles';
import type { ClinicRow, MedicalReportRow, PatientNotification } from '../types';

type HomeMedicineItem = { id: string; name: string; time: string; note: string };
type HomeClinicItem = { id: string; title: string; when: string; where: string };
type HomeAppointmentItem = { id: string; doctor: string; date: string; time: string; status: string };
type HomeReportItem = { id: string; title: string; sub: string; report: MedicalReportRow };

type ClinicDetailsCardData = {
  title: string;
  date: string;
  startTime: string;
  endTime?: string;
  status: string;
  notes?: string;
};

export type HomeTabProps = {
  accessToken?: string;
  language: string;
  colors: any;

  homeLoading: boolean;
  homeRefreshing: boolean;
  homeLoadError: string;
  loadingHomeLabel: string;
  retryLabel: string;
  viewAllLabel: string;

  onChangeTab: (tab: PatientTabKey) => void;
  onRefresh: () => void;
  onRetry: () => void;

  onOpenAiDetect?: () => void;
  onOpenNearbyAmbulance?: () => void;

  ambulanceStatus: PatientNotification | null;

  homeMedicines: HomeMedicineItem[];
  homeClinics: HomeClinicItem[];
  homeReports: HomeReportItem[];
  homeRecentAppointments: HomeAppointmentItem[];

  clinicById: Record<string, ClinicRow>;
  onShowClinicDetails: (details: ClinicDetailsCardData) => void;
  onOpenReportDetails: (report: MedicalReportRow, titleText: string, subText: string) => void;
};

export default function HomeTab({
  accessToken,
  language,
  colors,
  homeLoading,
  homeRefreshing,
  homeLoadError,
  loadingHomeLabel,
  retryLabel,
  viewAllLabel,
  onChangeTab,
  onRefresh,
  onRetry,
  onOpenAiDetect,
  onOpenNearbyAmbulance,
  ambulanceStatus,
  homeMedicines,
  homeClinics,
  homeReports,
  homeRecentAppointments,
  clinicById,
  onShowClinicDetails,
  onOpenReportDetails,
}: HomeTabProps) {
  const homeSections = useMemo(() => {
    return {
      medicines: homeMedicines,
      clinics: homeClinics,
      reports: homeReports,
      recentAppointments: homeRecentAppointments,
    };
  }, [homeMedicines, homeClinics, homeReports, homeRecentAppointments]);

  const HomeSectionHeader = ({ title, toTab }: { title: string; toTab: PatientTabKey }) => {
    return (
      <View style={styles.sectionHeaderRow}>
        <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 0, flex: 1 }]}>{title}</Text>
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => onChangeTab(toTab)}
          style={[styles.smallPill, { borderColor: colors.primary }]}
          accessibilityRole="button"
          accessibilityLabel={`${viewAllLabel} ${title}`}
        >
          <Text style={[styles.smallPillText, { color: colors.primary }]}>{viewAllLabel}</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
      refreshControl={
        <RefreshControl
          refreshing={homeRefreshing}
          onRefresh={() => {
            if (!accessToken) return;
            onRefresh();
          }}
          tintColor={colors.primary}
          colors={[colors.primary]}
        />
      }
    >
      {homeLoading && (
        <View
          style={[
            styles.sectionCard,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 10,
            },
          ]}
        >
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={[styles.cardText, { color: colors.subtext }]}>{loadingHomeLabel}</Text>
        </View>
      )}

      {!!homeLoadError && (
        <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Ionicons name="warning-outline" size={18} color={colors.danger} />
            <Text style={[styles.cardText, { color: colors.text, flex: 1 }]}>{homeLoadError}</Text>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => {
                if (!accessToken) return;
                onRetry();
              }}
              style={[styles.smallPill, { borderColor: colors.primary }]}
              accessibilityRole="button"
              accessibilityLabel={retryLabel}
            >
              <Text style={[styles.smallPillText, { color: colors.primary }]}>{retryLabel}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <View
        style={[
          styles.emergencyCard,
          {
            backgroundColor: colors.card,
            borderColor: colors.danger,
          },
        ]}
      >
        <View style={{ flex: 1 }}>
          <Text style={[styles.emergencyTitle, { color: colors.text }]}>
            {language === 'sinhala' ? 'ආසන්න ඇම්බියුලන්ස්' : language === 'tamil' ? 'அருகிலுள்ள ஆம்புலன்ஸ்' : 'Nearby Ambulance'}
          </Text>
          <Text style={[styles.emergencySub, { color: colors.subtext }]}>
            {language === 'sinhala'
              ? 'ස්ථානය සක්‍රීය කර ආසන්න ඇම්බියුලන්ස් සොයන්න'
              : language === 'tamil'
                ? 'இடத்தை இயக்கி அருகிலுள்ள ஆம்புலன்ஸ்களை கண்டுபிடிக்கவும்'
                : 'Turn on location and find ambulances nearby'}
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.emergencyBtn, { backgroundColor: colors.danger }]}
          activeOpacity={0.85}
          onPress={onOpenNearbyAmbulance}
          disabled={!onOpenNearbyAmbulance}
        >
          <Text style={styles.emergencyBtnText}>{language === 'sinhala' ? 'විවෘත කරන්න' : language === 'tamil' ? 'திற' : 'Open'}</Text>
        </TouchableOpacity>
      </View>

      <PatientAmbulanceStatusCard
        accessToken={accessToken}
        language={language}
        colors={{ card: colors.card, text: colors.text, subtext: colors.subtext, border: colors.border }}
        ambulanceStatus={ambulanceStatus}
      />

      <View style={[styles.aiCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.aiTitle, { color: colors.text }]}>
            {language === 'sinhala'
              ? 'AI තුවාල/රෑෂ් හඳුනාගැනීම'
              : language === 'tamil'
                ? 'AI காயம்/ரேஷ் கண்டறிதல்'
                : 'AI Wound / Rash Detector'}
          </Text>
          <Text style={[styles.aiSub, { color: colors.subtext }]}>
            {language === 'sinhala'
              ? 'ඡායාරූපයක් ගෙන හෝ උඩුගත කර ප්‍රතිඵල බලන්න'
              : language === 'tamil'
                ? 'படத்தை எடுத்து/பதிவேற்றி முடிவுகளை பார்க்கவும்'
                : 'Take/upload a photo and view guidance'}
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.aiButton, { backgroundColor: colors.background }]}
          activeOpacity={0.85}
          onPress={onOpenAiDetect}
          disabled={!onOpenAiDetect}
        >
          <Text style={[styles.aiButtonText, { color: colors.primary }]}>{language === 'sinhala' ? 'විවෘත කරන්න' : language === 'tamil' ? 'திற' : 'Open'}</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <HomeSectionHeader
          title={language === 'sinhala' ? 'ඉදිරි ඖෂධ' : language === 'tamil' ? 'வரவிருக்கும் மருந்துகள்' : 'Upcoming medicines'}
          toTab="medicine"
        />

        {homeSections.medicines.map((m) => (
          <View key={m.id} style={[styles.itemRow, { borderTopColor: colors.border }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.itemTitle, { color: colors.text }]}>{m.name}</Text>
              <Text style={[styles.itemSub, { color: colors.subtext }]}>{m.note}</Text>
            </View>
            <Text style={[styles.itemRight, { color: colors.primary }]}>{m.time}</Text>
          </View>
        ))}

        {homeSections.medicines.length === 0 && (
          <Text style={[styles.cardText, { color: colors.subtext, marginTop: 8 }]}>
            {language === 'sinhala'
              ? 'අද සඳහා ඖෂධ මතක් කිරීම් නැත.'
              : language === 'tamil'
                ? 'இன்றைக்கு மருந்து நினைவூட்டல்கள் இல்லை.'
                : 'No medicine reminders for today.'}
          </Text>
        )}
      </View>

      <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <HomeSectionHeader
          title={language === 'sinhala' ? 'ඉදිරි ක්ලිනික්' : language === 'tamil' ? 'வரவிருக்கும் கிளினிக்குகள்' : 'Upcoming clinics'}
          toTab="clinic"
        />

        {homeSections.clinics.map((c) => (
          <View key={c.id} style={[styles.itemRow, { borderTopColor: colors.border }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.itemTitle, { color: colors.text }]}>{c.title}</Text>
              <Text style={[styles.itemSub, { color: colors.subtext }]}>{c.where ? `${c.when} • ${c.where}` : c.when}</Text>
            </View>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => {
                const row = clinicById[String(c.id)];
                const whenParts = String(c.when || '')
                  .split('•')
                  .map((s) => s.trim());
                const dateText = row?.clinic_date ? String(row.clinic_date) : whenParts[0] || '';
                const startText = row?.start_time
                  ? String(row.start_time).slice(0, 5)
                  : whenParts[1]
                    ? String(whenParts[1]).slice(0, 5)
                    : '';
                const endText = row?.end_time ? String(row.end_time).slice(0, 5) : '';
                const statusText = row?.status ? String(row.status) : 'Scheduled';
                const notesText = row?.notes ? String(row.notes) : '';

                onShowClinicDetails({
                  title: String(c.title || ''),
                  date: dateText,
                  startTime: startText,
                  endTime: endText || undefined,
                  status: statusText,
                  notes: notesText || undefined,
                });
              }}
              style={[styles.smallPill, { borderColor: colors.primary }]}
            >
              <Text style={[styles.smallPillText, { color: colors.primary }]}>{language === 'sinhala' ? 'විස්තර' : language === 'tamil' ? 'விவரம்' : 'Details'}</Text>
            </TouchableOpacity>
          </View>
        ))}

        {homeSections.clinics.length === 0 && (
          <Text style={[styles.cardText, { color: colors.subtext, marginTop: 8 }]}>
            {language === 'sinhala' ? 'ඉදිරි ක්ලිනික් නොමැත.' : language === 'tamil' ? 'வரவிருக்கும் கிளினிக்குகள் இல்லை.' : 'No upcoming clinics.'}
          </Text>
        )}
      </View>

      <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <HomeSectionHeader
          title={language === 'sinhala' ? 'වෛද්‍ය වාර්තා' : language === 'tamil' ? 'மருத்துவ அறிக்கைகள்' : 'Medical reports'}
          toTab="reports"
        />

        {homeSections.reports.map((r) => (
          <View key={r.id} style={[styles.itemRow, { borderTopColor: colors.border, alignItems: 'center' }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.itemTitle, { color: colors.text }]} numberOfLines={1}>
                {r.title}
              </Text>
              <Text style={[styles.itemSub, { color: colors.subtext }]} numberOfLines={1}>
                {r.sub || (language === 'sinhala' ? 'විස්තර නොමැත' : language === 'tamil' ? 'விவரம் இல்லை' : 'No details')}
              </Text>
            </View>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => onOpenReportDetails(r.report, r.title, r.sub)}
              accessibilityRole="button"
              accessibilityLabel="View report"
            >
              <Text style={[styles.itemRight, { color: colors.primary }]}>{language === 'sinhala' ? 'බලන්න' : language === 'tamil' ? 'பார்' : 'View'}</Text>
            </TouchableOpacity>
          </View>
        ))}

        {homeSections.reports.length === 0 && (
          <Text style={[styles.cardText, { color: colors.subtext, marginTop: 8 }]}>
            {language === 'sinhala' ? 'වාර්තා දත්ත නොමැත.' : language === 'tamil' ? 'அறிக்கை தரவு இல்லை.' : 'No reports found.'}
          </Text>
        )}
      </View>

      <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <HomeSectionHeader
          title={language === 'sinhala' ? 'මෑත වෙන්කිරීම්' : language === 'tamil' ? 'சமீபத்திய நியமனங்கள்' : 'Recent appointments'}
          toTab="appointment"
        />

        {homeSections.recentAppointments.map((a) => (
          <View key={a.id} style={[styles.itemRow, { borderTopColor: colors.border }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.itemTitle, { color: colors.text }]}>{a.doctor}</Text>
              <Text style={[styles.itemSub, { color: colors.subtext }]}>
                {a.date} • {a.time} • {a.status}
              </Text>
            </View>
          </View>
        ))}

        {homeSections.recentAppointments.length === 0 && (
          <Text style={[styles.cardText, { color: colors.subtext, marginTop: 8 }]}>
            {language === 'sinhala' ? 'වෙන්කිරීම් දත්ත නොමැත.' : language === 'tamil' ? 'நியமன தரவு இல்லை.' : 'No appointments found.'}
          </Text>
        )}
      </View>
    </ScrollView>
  );
}
