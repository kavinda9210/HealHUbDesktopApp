import React, { useMemo } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons, FontAwesome5, Feather } from '@expo/vector-icons';
import PatientAmbulanceStatusCard from '../../../components/patient/ambulance/PatientAmbulanceStatusCard';
import type { PatientTabKey } from '../../../components/patient/tabs';
import type { ClinicRow, MedicalReportRow, PatientNotification } from '../types';

// Types (unchanged)
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
  const homeSections = useMemo(() => ({
    medicines: homeMedicines,
    clinics: homeClinics,
    reports: homeReports,
    recentAppointments: homeRecentAppointments,
  }), [homeMedicines, homeClinics, homeReports, homeRecentAppointments]);

  const HomeSectionHeader = ({ title, toTab }: { title: string; toTab: PatientTabKey }) => (
    <View style={styles.sectionHeaderRow}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => onChangeTab(toTab)}
        style={styles.viewAllButton}
      >
        <Text style={[styles.viewAllText, { color: colors.primary }]}>{viewAllLabel}</Text>
        <Feather name="arrow-right" size={14} color={colors.primary} />
      </TouchableOpacity>
    </View>
  );

  const ModernCard = ({ children }: { children: React.ReactNode }) => (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border + '40' }]}>
      {children}
    </View>
  );

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
      refreshControl={
        <RefreshControl
          refreshing={homeRefreshing}
          onRefresh={() => accessToken && onRefresh()}
          tintColor={colors.primary}
          colors={[colors.primary]}
        />
      }
    >
      {/* Loading */}
      {homeLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.subtext }]}>{loadingHomeLabel}</Text>
        </View>
      )}

      {/* Error */}
      {!!homeLoadError && (
        <ModernCard>
          <View style={styles.errorContainer}>
            <Ionicons name="warning-outline" size={24} color={colors.danger} />
            <Text style={[styles.errorText, { color: colors.text }]}>{homeLoadError}</Text>
            <TouchableOpacity
              onPress={() => accessToken && onRetry()}
              style={[styles.retryButton, { borderColor: colors.primary }]}
            >
              <Text style={[styles.retryText, { color: colors.primary }]}>{retryLabel}</Text>
            </TouchableOpacity>
          </View>
        </ModernCard>
      )}

      {/* ========== EMERGENCY CARD (red) – redesigned: top row icon + text, button below ========== */}
      <View style={[styles.emergencyCard, { backgroundColor: colors.danger + '08', borderLeftColor: colors.danger, borderLeftWidth: 4 }]}>
        <View style={styles.emergencyTopRow}>
          <View style={[styles.emergencyIconBg, { backgroundColor: colors.danger + '15' }]}>
            <FontAwesome5 name="ambulance" size={28} color={colors.danger} />
          </View>
          <View style={styles.emergencyTextWrapper}>
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
        </View>
        <TouchableOpacity
          style={[styles.emergencyBtn, { backgroundColor: colors.danger }]}
          onPress={onOpenNearbyAmbulance}
        >
          <Text style={styles.emergencyBtnText}>
            {language === 'sinhala' ? 'විවෘත කරන්න' : language === 'tamil' ? 'திற' : 'Open'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Ambulance Status Card (unchanged, already handles wrapping) */}
      <PatientAmbulanceStatusCard
        accessToken={accessToken}
        language={language}
        colors={{ card: colors.card, text: colors.text, subtext: colors.subtext, border: colors.border }}
        ambulanceStatus={ambulanceStatus}
      />

      {/* ========== AI CARD (greenish) – redesigned: top row icon + text, button below ========== */}
      <View style={[styles.aiCard, { backgroundColor: colors.primary + '05', borderLeftColor: colors.primary, borderLeftWidth: 4 }]}>
        <View style={styles.aiTopRow}>
          <View style={[styles.aiIconBg, { backgroundColor: colors.primary + '10' }]}>
            <MaterialCommunityIcons name="brain" size={32} color={colors.primary} />
          </View>
          <View style={styles.aiTextWrapper}>
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
        </View>
        <TouchableOpacity
          style={[styles.aiButton, { backgroundColor: colors.background, borderColor: colors.primary + '30' }]}
          onPress={onOpenAiDetect}
        >
          <Text style={[styles.aiButtonText, { color: colors.primary }]}>
            {language === 'sinhala' ? 'විවෘත කරන්න' : language === 'tamil' ? 'திற' : 'Open'}
          </Text>
          <Feather name="arrow-right" size={16} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* ========== MEDICINES SECTION ========== */}
      <ModernCard>
        <HomeSectionHeader
          title={language === 'sinhala' ? 'ඉදිරි ඖෂධ' : language === 'tamil' ? 'வரவிருக்கும் மருந்துகள்' : 'Upcoming medicines'}
          toTab="medicine"
        />
        {homeSections.medicines.map((m, idx) => (
          <View key={m.id} style={[styles.listItem, idx !== 0 && styles.listItemSeparator]}>
            <View style={styles.listIconWrapper}>
              <View style={[styles.listIconBg, { backgroundColor: colors.primary + '10' }]}>
                <MaterialCommunityIcons name="pill" size={22} color={colors.primary} />
              </View>
            </View>
            <View style={styles.listTextContainer}>
              <Text style={[styles.listTitle, { color: colors.text }]}>{m.name}</Text>
              <Text style={[styles.listSub, { color: colors.subtext }]}>{m.note}</Text>
            </View>
            <View style={[styles.timeBadge, { backgroundColor: colors.primary + '10' }]}>
              <Feather name="clock" size={12} color={colors.primary} />
              <Text style={[styles.timeText, { color: colors.primary }]}>{m.time}</Text>
            </View>
          </View>
        ))}
        {homeSections.medicines.length === 0 && (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="pill" size={48} color={colors.subtext + '30'} />
            <Text style={[styles.emptyText, { color: colors.subtext }]}>
              {language === 'sinhala' ? 'අද සඳහා ඖෂධ මතක් කිරීම් නැත.' : language === 'tamil' ? 'இன்றைக்கு மருந்து நினைவூட்டல்கள் இல்லை.' : 'No medicine reminders for today.'}
            </Text>
          </View>
        )}
      </ModernCard>

      {/* ========== CLINICS SECTION ========== */}
      <ModernCard>
        <HomeSectionHeader
          title={language === 'sinhala' ? 'ඉදිරි ක්ලිනික්' : language === 'tamil' ? 'வரவிருக்கும் கிளினிக்குகள்' : 'Upcoming clinics'}
          toTab="clinic"
        />
        {homeSections.clinics.map((c, idx) => (
          <View key={c.id} style={[styles.listItem, idx !== 0 && styles.listItemSeparator]}>
            <View style={styles.listIconWrapper}>
              <View style={[styles.listIconBg, { backgroundColor: (colors.success || '#10B981') + '10' }]}>
                <FontAwesome5 name="clinic-medical" size={20} color={colors.success || '#10B981'} />
              </View>
            </View>
            <View style={styles.listTextContainer}>
              <Text style={[styles.listTitle, { color: colors.text }]}>{c.title}</Text>
              <Text style={[styles.listSub, { color: colors.subtext }]}>
                {c.where ? `${c.when} • ${c.where}` : c.when}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => {
                const row = clinicById[String(c.id)];
                const whenParts = String(c.when || '').split('•').map(s => s.trim());
                const dateText = row?.clinic_date ? String(row.clinic_date) : whenParts[0] || '';
                const startText = row?.start_time ? String(row.start_time).slice(0,5) : (whenParts[1] ? String(whenParts[1]).slice(0,5) : '');
                const endText = row?.end_time ? String(row.end_time).slice(0,5) : '';
                onShowClinicDetails({
                  title: String(c.title),
                  date: dateText,
                  startTime: startText,
                  endTime: endText || undefined,
                  status: row?.status ? String(row.status) : 'Scheduled',
                  notes: row?.notes ? String(row.notes) : undefined,
                });
              }}
              style={[styles.detailButton, { backgroundColor: colors.primary + '10' }]}
            >
              <Text style={[styles.detailButtonText, { color: colors.primary }]}>
                {language === 'sinhala' ? 'විස්තර' : language === 'tamil' ? 'விவரம்' : 'Details'}
              </Text>
            </TouchableOpacity>
          </View>
        ))}
        {homeSections.clinics.length === 0 && (
          <View style={styles.emptyState}>
            <FontAwesome5 name="clinic-medical" size={48} color={colors.subtext + '30'} />
            <Text style={[styles.emptyText, { color: colors.subtext }]}>
              {language === 'sinhala' ? 'ඉදිරි ක්ලිනික් නොමැත.' : language === 'tamil' ? 'வரவிருக்கும் கிளினிக்குகள் இல்லை.' : 'No upcoming clinics.'}
            </Text>
          </View>
        )}
      </ModernCard>

      {/* ========== REPORTS SECTION ========== */}
      <ModernCard>
        <HomeSectionHeader
          title={language === 'sinhala' ? 'වෛද්‍ය වාර්තා' : language === 'tamil' ? 'மருத்துவ அறிக்கைகள்' : 'Medical reports'}
          toTab="reports"
        />
        {homeSections.reports.map((r, idx) => (
          <View key={r.id} style={[styles.listItem, idx !== 0 && styles.listItemSeparator]}>
            <View style={styles.listIconWrapper}>
              <View style={[styles.listIconBg, { backgroundColor: (colors.warning || '#F59E0B') + '10' }]}>
                <MaterialCommunityIcons name="file-document-multiple" size={22} color={colors.warning || '#F59E0B'} />
              </View>
            </View>
            <View style={styles.listTextContainer}>
              <Text style={[styles.listTitle, { color: colors.text }]} numberOfLines={2}>{r.title}</Text>
              <Text style={[styles.listSub, { color: colors.subtext }]} numberOfLines={2}>
                {r.sub || (language === 'sinhala' ? 'විස්තර නොමැත' : language === 'tamil' ? 'விவரம் இல்லை' : 'No details')}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => onOpenReportDetails(r.report, r.title, r.sub)}
              style={[styles.viewButton, { backgroundColor: colors.primary + '10' }]}
            >
              <Text style={[styles.viewButtonText, { color: colors.primary }]}>
                {language === 'sinhala' ? 'බලන්න' : language === 'tamil' ? 'பார்' : 'View'}
              </Text>
            </TouchableOpacity>
          </View>
        ))}
        {homeSections.reports.length === 0 && (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="file-document-multiple" size={48} color={colors.subtext + '30'} />
            <Text style={[styles.emptyText, { color: colors.subtext }]}>
              {language === 'sinhala' ? 'වාර්තා දත්ත නොමැත.' : language === 'tamil' ? 'அறிக்கை தரவு இல்லை.' : 'No reports found.'}
            </Text>
          </View>
        )}
      </ModernCard>

      {/* ========== APPOINTMENTS SECTION ========== */}
      <ModernCard>
        <HomeSectionHeader
          title={language === 'sinhala' ? 'මෑත වෙන්කිරීම්' : language === 'tamil' ? 'சமீபத்திய நியமனங்கள்' : 'Recent appointments'}
          toTab="appointment"
        />
        {homeSections.recentAppointments.map((a, idx) => {
          const statusColor = a.status === 'Confirmed' ? '#10B981' : a.status === 'Pending' ? '#F59E0B' : '#EF4444';
          const StatusIcon = a.status === 'Confirmed' ? MaterialCommunityIcons.CheckCircle : a.status === 'Pending' ? MaterialCommunityIcons.ClockOutline : MaterialCommunityIcons.CloseCircle;
          return (
            <View key={a.id} style={[styles.listItem, idx !== 0 && styles.listItemSeparator]}>
              <View style={styles.listIconWrapper}>
                <View style={[styles.listIconBg, { backgroundColor: (colors.info || '#3B82F6') + '10' }]}>
                  <FontAwesome5 name="calendar-check" size={20} color={colors.info || '#3B82F6'} />
                </View>
              </View>
              <View style={styles.listTextContainer}>
                <Text style={[styles.listTitle, { color: colors.text }]}>{a.doctor}</Text>
                <Text style={[styles.listSub, { color: colors.subtext }]}>{a.date} • {a.time}</Text>
                <View style={styles.statusBadge}>
                  <StatusIcon size={14} color={statusColor} />
                  <Text style={[styles.statusText, { color: statusColor }]}>{a.status}</Text>
                </View>
              </View>
              <Feather name="chevron-right" size={20} color={colors.subtext + '60'} />
            </View>
          );
        })}
        {homeSections.recentAppointments.length === 0 && (
          <View style={styles.emptyState}>
            <FontAwesome5 name="calendar-check" size={48} color={colors.subtext + '30'} />
            <Text style={[styles.emptyText, { color: colors.subtext }]}>
              {language === 'sinhala' ? 'වෙන්කිරීම් දත්ත නොමැත.' : language === 'tamil' ? 'நியமன தரவு இல்லை.' : 'No appointments found.'}
            </Text>
          </View>
        )}
      </ModernCard>
    </ScrollView>
  );
}

const styles = {
  scrollContent: { paddingHorizontal: 16, paddingBottom: 24, gap: 16 },
  card: { borderRadius: 20, borderWidth: 1, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' },
  sectionTitle: { fontSize: 18, fontWeight: '600', letterSpacing: -0.3, lineHeight: 24, flexShrink: 1, flexWrap: 'wrap' },
  viewAllButton: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20 },
  viewAllText: { fontSize: 13, fontWeight: '500' },
  loadingContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 80, gap: 12 },
  loadingText: { fontSize: 14 },
  errorContainer: { alignItems: 'center', gap: 16, paddingVertical: 8 },
  errorText: { fontSize: 14, textAlign: 'center', lineHeight: 20, flexWrap: 'wrap' },
  retryButton: { paddingVertical: 8, paddingHorizontal: 20, borderRadius: 20, borderWidth: 1.5 },
  retryText: { fontSize: 14, fontWeight: '600' },

  // Emergency card
  emergencyCard: { borderRadius: 20, padding: 20, gap: 16, shadowColor: '#EF4444', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 3 },
  emergencyTopRow: { flexDirection: 'row', alignItems: 'center', gap: 16, flexWrap: 'wrap' },
  emergencyIconBg: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  emergencyTextWrapper: { flex: 1, flexShrink: 1, gap: 4 },
  emergencyTitle: { fontSize: 16, fontWeight: '600', lineHeight: 22, flexWrap: 'wrap' },
  emergencySub: { fontSize: 12, lineHeight: 18, flexWrap: 'wrap' },
  emergencyBtn: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 40, alignSelf: 'flex-start' },
  emergencyBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },

  // AI card
  aiCard: { borderRadius: 20, padding: 20, gap: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  aiTopRow: { flexDirection: 'row', alignItems: 'center', gap: 16, flexWrap: 'wrap' },
  aiIconBg: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  aiTextWrapper: { flex: 1, flexShrink: 1, gap: 4 },
  aiTitle: { fontSize: 16, fontWeight: '600', lineHeight: 22, flexWrap: 'wrap' },
  aiSub: { fontSize: 12, lineHeight: 18, flexWrap: 'wrap' },
  aiButton: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 40, borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start' },
  aiButtonText: { fontSize: 14, fontWeight: '600' },

  // List items (medicines, clinics, reports, appointments)
  listItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 12 },
  listItemSeparator: { borderTopWidth: 1, borderTopColor: '#E5E7EB' },
  listIconWrapper: { width: 44, alignItems: 'center' },
  listIconBg: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  listTextContainer: { flex: 1, flexShrink: 1, gap: 4 },
  listTitle: { fontSize: 15, fontWeight: '500', lineHeight: 20, flexWrap: 'wrap' },
  listSub: { fontSize: 12, lineHeight: 18, flexWrap: 'wrap' },
  timeBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  timeText: { fontSize: 13, fontWeight: '500' },
  detailButton: { paddingVertical: 6, paddingHorizontal: 14, borderRadius: 20 },
  detailButtonText: { fontSize: 13, fontWeight: '500' },
  viewButton: { paddingVertical: 6, paddingHorizontal: 14, borderRadius: 20 },
  viewButtonText: { fontSize: 13, fontWeight: '500' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  statusText: { fontSize: 11, fontWeight: '600' },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40, gap: 12 },
  emptyText: { fontSize: 14, textAlign: 'center', flexWrap: 'wrap', lineHeight: 20 },
};