import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StatusBar,
  TouchableOpacity,
  ScrollView,
  Platform,
  Animated,
  Dimensions,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import PatientTabs, { PatientTabKey } from '../components/patient/tabs';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import type { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import AlertMessage from '../components/alerts/AlertMessage';
import { cancelScheduledAlarmsByKeyAsync, scheduleAlarmAtAsync } from '../utils/alarms';

import ProfileViewCard, { PatientUser } from '../components/patient/profile/ProfileViewCard';
import ProfileEditCard from '../components/patient/profile/ProfileEditCard';
import EmailChangeVerificationCard from '../components/patient/profile/EmailChangeVerificationCard';
import DeleteAccountCard from '../components/patient/profile/DeleteAccountCard';
import LanguagePickerInline from '../components/settings/LanguagePickerInline';
import ThemeToggleCard from '../components/settings/ThemeToggleCard';
import AlarmToneSettingsCard from '../components/settings/AlarmToneSettingsCard';
import { apiPost } from '../utils/api';

import HomeTab from './patientDashboard/tabs/HomeTab';
import AppointmentsTab from './patientDashboard/tabs/AppointmentsTab';
import MedicineTab from './patientDashboard/tabs/MedicineTab';
import ClinicTab from './patientDashboard/tabs/ClinicTab';
import ReportsTab from './patientDashboard/tabs/ReportsTab';
import MedicineDetailsModal from './patientDashboard/modals/MedicineDetailsModal';
import ReportDetailsModal from './patientDashboard/modals/ReportDetailsModal';
import ClinicDetailsModal from './patientDashboard/modals/ClinicDetailsModal';
import { downloadReportAsPdfAsync } from './patientDashboard/reportDownloads';
import { computeMedicineAlarmKey, getLocalYyyyMmDd, parseTimeParts } from './patientDashboard/dateTime';
import { reconcilePatientAlarmScheduleAsync as reconcilePatientAlarmScheduleAsyncLib } from './patientDashboard/alarmScheduler';
import { usePatientDashboardEffects } from './patientDashboard/usePatientDashboardEffects';
import type { AppointmentRow, ClinicRow, DoctorRow, MedicalReportRow, MedicationRow, MedicineReminderRow, PatientNotification } from './patientDashboard/types';

const { width: screenWidth } = Dimensions.get('window');

type PatientdashboardProps = {
  accessToken?: string;
  pendingMedicineTake?:
    | null
    | {
        reminderId: number;
        medicineName?: string;
        dosage?: string;
        reminderDate?: string;
        reminderTime?: string;
        alarmKey?: string;
      };
  onConsumePendingMedicineTake?: () => void;
  pendingTab?: PatientTabKey | null;
  onConsumePendingTab?: () => void;
  onOpenAiDetect?: () => void;
  onOpenNotifications?: () => void;
  onOpenNearbyAmbulance?: () => void;
  onLogout?: () => void;
};

const modernStyles = StyleSheet.create({
  container: {
    flex: 1,
  },
  statusBar: {
    backgroundColor: 'transparent',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingTop: 12,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: 0.3,
    opacity: 0.6,
    textTransform: 'uppercase',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  notificationButton: {
    position: 'relative',
    padding: 10,
    borderRadius: 12,
  },
  badge: {
    position: 'absolute',
    top: 2,
    right: 2,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  // Profile styles
  profileLogoutBtn: {
    marginTop: 28,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  profileLogoutText: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
});

export default function Patientdashboard({
  accessToken,
  pendingMedicineTake,
  onConsumePendingMedicineTake,
  pendingTab,
  onConsumePendingTab,
  onOpenAiDetect,
  onOpenNotifications,
  onOpenNearbyAmbulance,
  onLogout,
}: PatientdashboardProps) {
  const { language } = useLanguage();
  const { colors, mode } = useTheme();
  const [activeTab, setActiveTab] = useState<PatientTabKey>('home');
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  const reminderToastTimer = useRef<NodeJS.Timeout | null>(null);
  const medicineScrollRef = useRef<ScrollView | null>(null);
  const [reminderToastVisible, setReminderToastVisible] = useState(false);
  const [reminderToastVariant, setReminderToastVariant] = useState<'success' | 'error' | 'info'>('success');
  const [reminderToastMessage, setReminderToastMessage] = useState('');

  const [doctorQuerySpecialty, setDoctorQuerySpecialty] = useState<string>('');
  const [doctorQueryName, setDoctorQueryName] = useState<string>('');
  const [doctors, setDoctors] = useState<DoctorRow[]>([]);
  const [doctorById, setDoctorById] = useState<Record<number, DoctorRow>>({});
  const [doctorLoadError, setDoctorLoadError] = useState<string>('');
  const [selectedDoctor, setSelectedDoctor] = useState<DoctorRow | null>(null);
  const [appointmentDate, setAppointmentDate] = useState<Date | null>(null);
  const [appointmentTime, setAppointmentTime] = useState<Date | null>(null);
  const [appointmentReason, setAppointmentReason] = useState<string>('');
  const [appointmentError, setAppointmentError] = useState<string>('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [appointments, setAppointments] = useState<AppointmentRow[]>([]);

  const [profileView, setProfileView] = useState<'view' | 'edit' | 'verify-email'>('view');
  const [pendingEmail, setPendingEmail] = useState<string>('');

  const [user, setUser] = useState<PatientUser>({
    fullName: 'A. Patient',
    email: 'patient@email.com',
    phone: '+94 77 123 4567',
    gender: 'Female',
    dateOfBirth: '1998-04-12',
    address: 'Colombo, Sri Lanka',
  });

  const [profileLoadError, setProfileLoadError] = useState<string>('');
  const [ambulanceStatus, setAmbulanceStatus] = useState<PatientNotification | null>(null);
  const [realtimeHomeTick, setRealtimeHomeTick] = useState(0);
  const [realtimeAmbulanceTick, setRealtimeAmbulanceTick] = useState(0);
  const [notificationCount, setNotificationCount] = useState<number>(0);
  const [medicineClockTick, setMedicineClockTick] = useState(0);

  const [homeLoading, setHomeLoading] = useState(false);
  const [homeRefreshing, setHomeRefreshing] = useState(false);
  const [homeLoadError, setHomeLoadError] = useState<string>('');

  const [homeMedicines, setHomeMedicines] = useState<Array<{ id: string; name: string; time: string; note: string }>>([]);
  const [todayMedicineReminders, setTodayMedicineReminders] = useState<
    Array<{ id: string; name: string; date: string; time: string; dosage: string; description: string; doctor: string }>
  >([]);
  const [futureMedicineReminders, setFutureMedicineReminders] = useState<
    Array<{ id: string; name: string; date: string; time: string; when: string; dosage: string; description: string; doctor: string }>
  >([]);
  const [medicineDetailsCard, setMedicineDetailsCard] = useState<
    null | { name: string; date: string; time: string; dosage?: string; description?: string; doctor?: string }
  >(null);
  const [takeMedicineCard, setTakeMedicineCard] = useState<
    | null
    | {
        reminderId: number;
        medicineName?: string;
        dosage?: string;
        reminderDate?: string;
        reminderTime?: string;
        alarmKey?: string;
      }
  >(null);
  const [homeClinics, setHomeClinics] = useState<Array<{ id: string; title: string; when: string; where: string }>>([]);
  const [clinicById, setClinicById] = useState<Record<string, ClinicRow>>({});
  const [clinicList, setClinicList] = useState<ClinicRow[]>([]);
  const [clinicDetailsCard, setClinicDetailsCard] = useState<
    null | { title: string; date: string; startTime: string; endTime?: string; status: string; notes?: string }
  >(null);
  const [homeRecentAppointments, setHomeRecentAppointments] = useState<
    Array<{ id: string; doctor: string; date: string; time: string; status: string }>
  >([]);
  const [homeReports, setHomeReports] = useState<Array<{ id: string; title: string; sub: string; report: MedicalReportRow }>>([]);
  const [patientReports, setPatientReports] = useState<Array<{ id: string; title: string; sub: string; report: MedicalReportRow }>>([]);
  const [reportDetailsCard, setReportDetailsCard] = useState<
    | null
    | {
        title: string;
        created: string;
        doctor?: string;
        specialization?: string;
        link?: string;
        diagnosis?: string;
        prescription?: string;
        notes?: string;
      }
  >(null);

  // Animation on mount
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  const title = useMemo(() => {
    if (language === 'sinhala') return 'රෝගී පුවරුව';
    if (language === 'tamil') return 'நோயாளர் டாஷ்போர்டு';
    return 'Patient Dashboard';
  }, [language]);

  const tabTitle = useMemo(() => {
    if (activeTab === 'home') {
      return language === 'sinhala' ? 'මුල් පිටුව' : language === 'tamil' ? 'முகப்பு' : 'Home';
    }
    if (activeTab === 'appointment') {
      return language === 'sinhala' ? 'වෙන්කිරීම්' : language === 'tamil' ? 'நியமனங்கள்' : 'Appointments';
    }
    if (activeTab === 'medicine') {
      return language === 'sinhala' ? 'ඖෂධ' : language === 'tamil' ? 'மருந்துகள்' : 'Medicine';
    }
    if (activeTab === 'clinic') {
      return language === 'sinhala' ? 'ක්ලිනික්' : language === 'tamil' ? 'கிளினிக்' : 'Clinic';
    }
    if (activeTab === 'reports') {
      return language === 'sinhala' ? 'වාර්තා' : language === 'tamil' ? 'அறிக்கைகள்' : 'Reports';
    }
    return language === 'sinhala' ? 'පැතිකඩ' : language === 'tamil' ? 'சுயவிவரம்' : 'Profile';
  }, [activeTab, language]);

  const viewAllLabel = useMemo(() => {
    if (language === 'sinhala') return 'සියල්ල බලන්න';
    if (language === 'tamil') return 'அனைத்தையும் பார்க்க';
    return 'View all';
  }, [language]);

  const retryLabel = useMemo(() => {
    if (language === 'sinhala') return 'නැවත උත්සාහ කරන්න';
    if (language === 'tamil') return 'மீண்டும் முயற்சி';
    return 'Retry';
  }, [language]);

  const loadingHomeLabel = useMemo(() => {
    if (language === 'sinhala') return 'දත්ත ලබාගැනෙමින්...';
    if (language === 'tamil') return 'தரவு ஏற்றப்படுகிறது...';
    return 'Loading...';
  }, [language]);

  const openReportDetails = (report: MedicalReportRow, titleText: string, subText: string) => {
    const created = String(report.created_at || '').slice(0, 10) || '';
    const doctor = report.doctor_name ? `Dr. ${report.doctor_name}` : '';
    const specialization = report.specialization ? String(report.specialization) : '';
    const link = report.appointment_id ? `Appt #${String(report.appointment_id)}` : report.clinic_id ? `Clinic #${String(report.clinic_id)}` : '';
    setReportDetailsCard({
      title: titleText,
      created,
      doctor: doctor || undefined,
      specialization: specialization || undefined,
      link: link || undefined,
      diagnosis: report.diagnosis ? String(report.diagnosis) : undefined,
      prescription: report.prescription ? String(report.prescription) : undefined,
      notes: report.notes ? String(report.notes) : undefined,
    });
  };

  const reconcilePatientAlarmScheduleAsync = async (input: {
    clinics: ClinicRow[];
    upcomingReminders: Array<any>;
    doctorMap: Record<number, DoctorRow>;
  }) => {
    await reconcilePatientAlarmScheduleAsyncLib({ language, ...input });
  };

  const bookAppointmentLabel = useMemo(() => {
    if (language === 'sinhala') return 'වෙන්කරගන්න';
    if (language === 'tamil') return 'முன்பதிவு';
    return 'Book appointment';
  }, [language]);

  const appointmentsHint = useMemo(() => {
    if (language === 'sinhala') return 'ආකෘතිය: YYYY-MM-DD සහ 10:30 AM';
    if (language === 'tamil') return 'வடிவம்: YYYY-MM-DD மற்றும் 10:30 AM';
    return 'Format: YYYY-MM-DD and 10:30 AM';
  }, [language]);

  const cannotPastErrorText = useMemo(() => {
    if (language === 'sinhala') return 'පසුගිය දිනයකට/වේලාවකට වෙන්කර ගත නොහැක.';
    if (language === 'tamil') return 'கடந்த தேதி/நேரத்திற்கு முன்பதிவு செய்ய முடியாது.';
    return 'Cannot book an appointment in the past.';
  }, [language]);

  const formatDateLabel = (d: Date | null) => {
    if (!d) return language === 'sinhala' ? 'දිනය තෝරන්න' : language === 'tamil' ? 'தேதியை தேர்வு செய்' : 'Select date';
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const formatTimeLabel = (t: Date | null) => {
    if (!t) return language === 'sinhala' ? 'වේලාව තෝරන්න' : language === 'tamil' ? 'நேரத்தை தேர்வு செய்' : 'Select time';
    const hh = String(t.getHours()).padStart(2, '0');
    const mm = String(t.getMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
  };

  const buildAppointmentDateTime = (d: Date | null, t: Date | null) => {
    if (!d || !t) return null;
    const dt = new Date(d);
    dt.setHours(t.getHours(), t.getMinutes(), 0, 0);
    return dt;
  };

  const selectedDateTime = useMemo(() => buildAppointmentDateTime(appointmentDate, appointmentTime), [appointmentDate, appointmentTime]);

  const validateNotPast = (dt: Date | null) => {
    if (!dt) return true;
    return dt.getTime() >= Date.now();
  };

  const onDateChange = (_event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS !== 'ios') setShowDatePicker(false);
    if (!date) return;

    setAppointmentDate(date);
    setAppointmentError('');

    const dt = buildAppointmentDateTime(date, appointmentTime);
    if (dt && !validateNotPast(dt)) setAppointmentError(cannotPastErrorText);
  };

  const onTimeChange = (_event: DateTimePickerEvent, time?: Date) => {
    if (Platform.OS !== 'ios') setShowTimePicker(false);
    if (!time) return;

    setAppointmentTime(time);
    setAppointmentError('');

    const dt = buildAppointmentDateTime(appointmentDate, time);
    if (dt && !validateNotPast(dt)) setAppointmentError(cannotPastErrorText);
  };

  const handleBookAppointment = () => {
    const doctor = selectedDoctor;
    const dt = selectedDateTime;
    const reason = appointmentReason.trim();

    if (!doctor) {
      setAppointmentError(
        language === 'sinhala'
          ? 'වෛද්‍යවරයෙකු තෝරන්න.'
          : language === 'tamil'
            ? 'மருத்துவரை தேர்வு செய்யவும்.'
            : 'Please select a doctor.'
      );
      return;
    }

    if (!appointmentDate || !appointmentTime || !dt) {
      setAppointmentError(
        language === 'sinhala'
          ? 'දිනය සහ වේලාව තෝරන්න.'
          : language === 'tamil'
            ? 'தேதி மற்றும் நேரம் தேர்வு செய்யவும்.'
            : 'Please select a date and time.'
      );
      return;
    }

    if (!validateNotPast(dt)) {
      setAppointmentError(cannotPastErrorText);
      return;
    }

    void (async () => {
      try {
        if (!accessToken) {
          setAppointmentError('Not authenticated');
          return;
        }

        const appointment_date = formatDateLabel(appointmentDate);
        const appointment_time = formatTimeLabel(appointmentTime);

        const apiRes = await apiPost<any>(
          '/api/patient/appointments',
          {
            doctor_id: doctor.doctor_id,
            appointment_date,
            appointment_time,
            symptoms: reason,
          },
          accessToken
        );

        if (!apiRes.ok || !apiRes.data?.success) {
          const msg = (apiRes.data && (apiRes.data.message || apiRes.data.error)) || 'Failed to book appointment';
          setAppointmentError(String(msg));
          return;
        }

        const created = apiRes.data?.data as AppointmentRow | undefined;
        if (created) {
          setAppointments((prev) => [created, ...prev]);
        }

        await scheduleAlarmAtAsync({
          title: language === 'sinhala' ? 'වෙන්කිරීම් මතක් කිරීම' : language === 'tamil' ? 'நியமன நினைவூட்டல்' : 'Appointment reminder',
          body: `Dr. ${doctor.full_name} • ${appointment_date} ${appointment_time}`,
          date: dt,
        });

        showReminderToast(
          'success',
          language === 'sinhala'
            ? 'වෙන්කිරීම් ඇලර්ම් එකක් සැකසුම් විය.'
            : language === 'tamil'
              ? 'நியமன அலாரம் அமைக்கப்பட்டது.'
              : 'Appointment alarm scheduled.'
        );
      } catch (e) {
        console.log('scheduleAlarmAtAsync failed:', e);
        showReminderToast(
          'error',
          language === 'sinhala'
            ? 'ඇලර්ම් එක සැකසීමට අසමත් විය. Notification අවසර පරීක්ෂා කරන්න.'
            : language === 'tamil'
              ? 'அலாரம் அமைக்க முடியவில்லை. Notification அனுமதி சரிபார்க்கவும்.'
              : 'Failed to schedule alarm. Check notification permission.'
        );
      }
    })();

    setAppointmentReason('');
    setAppointmentError('');
  };

  const showReminderToast = (variant: 'success' | 'error' | 'info', message: string) => {
    if (reminderToastTimer.current) {
      clearTimeout(reminderToastTimer.current);
      reminderToastTimer.current = null;
    }

    setReminderToastVariant(variant);
    setReminderToastMessage(message);
    setReminderToastVisible(true);

    reminderToastTimer.current = setTimeout(() => {
      setReminderToastVisible(false);
    }, 2500);
  };

  usePatientDashboardEffects({
    accessToken,
    language,
    activeTab,
    setActiveTab,
    pendingMedicineTake,
    onConsumePendingMedicineTake,
    pendingTab,
    onConsumePendingTab,
    reminderToastTimer,
    showReminderToast,
    medicineScrollRef,
    takeMedicineCard,
    setTakeMedicineCard,
    user,
    setUser,
    profileLoadError,
    setProfileLoadError,
    realtimeAmbulanceTick,
    setRealtimeAmbulanceTick,
    realtimeHomeTick,
    setRealtimeHomeTick,
    doctorById,
    setDoctorById,
    setDoctors,
    setDoctorLoadError,
    doctorQuerySpecialty,
    doctorQueryName,
    setAmbulanceStatus,
    setNotificationCount,
    setHomeLoadError,
    setHomeLoading,
    homeLoading,
    homeRefreshing,
    setHomeRefreshing,
    setClinicById,
    setClinicList,
    setHomeClinics,
    setHomeRecentAppointments,
    setPatientReports,
    setHomeReports,
    getLocalYyyyMmDd,
    setTodayMedicineReminders,
    setFutureMedicineReminders,
    setHomeMedicines,
    reconcilePatientAlarmScheduleAsync,
    setAppointments,
    setMedicineClockTick,
  });

  const markReminderTakenAsync = async (input: { reminderId: number; alarmKey?: string }) => {
    try {
      if (!accessToken) {
        showReminderToast('error', 'Not authenticated');
        return false;
      }

      const reminderId = Number(input.reminderId);
      if (!Number.isFinite(reminderId) || reminderId <= 0) return false;

      const res = await apiPost<any>(`/api/patient/medicine-reminders/${reminderId}/mark-taken`, {}, accessToken);
      if (!res.ok || !res.data?.success) {
        const msg = (res.data && (res.data.message || res.data.error)) || 'Failed to mark medicine taken';
        showReminderToast('error', String(msg));
        return false;
      }

      const rid = String(reminderId);
      setTodayMedicineReminders((prev) => prev.filter((x) => String(x.id) !== rid));
      setFutureMedicineReminders((prev) => prev.filter((x) => String(x.id) !== rid));
      setHomeMedicines((prev) => prev.filter((x) => String(x.id) !== rid));

      if (input.alarmKey) {
        try {
          await cancelScheduledAlarmsByKeyAsync(String(input.alarmKey));
        } catch {
          // ignore
        }
      }

      setRealtimeHomeTick((x) => x + 1);
      showReminderToast(
        'success',
        language === 'sinhala' ? 'ඖෂධ ගත්තා ලෙස සලකුණු කළා.' : language === 'tamil' ? 'மருந்து எடுத்ததாக குறிக்கப்பட்டது.' : 'Marked as taken.'
      );
      return true;
    } catch (e) {
      console.log('markReminderTakenAsync failed:', e);
      showReminderToast('error', 'Failed to mark medicine taken');
      return false;
    }
  };

  const handleDownloadReportPdf = async (report: MedicalReportRow) => {
    await downloadReportAsPdfAsync({ report, language, getLocalYyyyMmDd, showToast: showReminderToast });
  };

  return (
    <SafeAreaView style={[modernStyles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <StatusBar barStyle={mode === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={colors.background} translucent={false} />

      <MedicineDetailsModal
        visible={!!medicineDetailsCard}
        language={language}
        colors={colors}
        mode={mode}
        data={medicineDetailsCard}
        onClose={() => setMedicineDetailsCard(null)}
      />

      <ReportDetailsModal
        visible={!!reportDetailsCard}
        language={language}
        colors={colors}
        mode={mode}
        data={reportDetailsCard}
        onClose={() => setReportDetailsCard(null)}
      />

      <ClinicDetailsModal
        visible={!!clinicDetailsCard}
        language={language}
        colors={colors}
        mode={mode}
        data={clinicDetailsCard}
        onClose={() => setClinicDetailsCard(null)}
      />

      {/* Modern Header with Animated Entrance */}
      <Animated.View
        style={[
          modernStyles.header,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <View style={modernStyles.headerTop}>
          <View style={modernStyles.titleContainer}>
            <Text style={[modernStyles.title, { color: colors.primary }]}>{title}</Text>
          </View>
          <View style={modernStyles.headerActions}>
            {!!onOpenNotifications && (
              <TouchableOpacity
                onPress={onOpenNotifications}
                activeOpacity={0.6}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                accessibilityRole="button"
                accessibilityLabel="Notifications"
                style={[modernStyles.notificationButton, { backgroundColor: colors.card }]}
              >
                <Ionicons name="notifications" size={20} color={colors.primary} />
                {notificationCount > 0 && (
                  <View style={[modernStyles.badge, { backgroundColor: colors.danger, borderColor: colors.background }]}>
                    <Text style={modernStyles.badgeText}>{notificationCount}</Text>
                  </View>
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>
        <Text style={[modernStyles.subtitle, { color: colors.subtext }]}>{tabTitle}</Text>
      </Animated.View>

      {/* Content Area */}
      <View style={modernStyles.content}>
        {activeTab === 'home' ? (
          <HomeTab
            accessToken={accessToken}
            language={language}
            colors={colors}
            homeLoading={homeLoading}
            homeRefreshing={homeRefreshing}
            homeLoadError={homeLoadError}
            loadingHomeLabel={loadingHomeLabel}
            retryLabel={retryLabel}
            viewAllLabel={viewAllLabel}
            onChangeTab={setActiveTab}
            onRefresh={() => {
              if (!accessToken) return;
              setHomeRefreshing(true);
              setHomeLoadError('');
              setRealtimeHomeTick((x) => x + 1);
              setRealtimeAmbulanceTick((x) => x + 1);
            }}
            onRetry={() => {
              if (!accessToken) return;
              setHomeRefreshing(true);
              setHomeLoadError('');
              setRealtimeHomeTick((x) => x + 1);
              setRealtimeAmbulanceTick((x) => x + 1);
            }}
            onOpenAiDetect={onOpenAiDetect}
            onOpenNearbyAmbulance={() => {
              if (!onOpenNearbyAmbulance) return;

              void (async () => {
                if (accessToken) {
                  try {
                    await apiPost<any>('/api/patient/notifications/clear', { type: 'Ambulance' }, accessToken);
                  } catch {
                    // ignore (best-effort)
                  }
                }

                onOpenNearbyAmbulance();
              })();
            }}
            ambulanceStatus={ambulanceStatus}
            homeMedicines={homeMedicines}
            homeClinics={homeClinics}
            homeReports={homeReports}
            homeRecentAppointments={homeRecentAppointments}
            clinicById={clinicById}
            onShowClinicDetails={setClinicDetailsCard}
            onOpenReportDetails={openReportDetails}
          />
        ) : activeTab === 'appointment' ? (
          <AppointmentsTab
            language={language}
            colors={colors}
            mode={mode}
            appointmentsHint={appointmentsHint}
            bookAppointmentLabel={bookAppointmentLabel}
            doctorQuerySpecialty={doctorQuerySpecialty}
            setDoctorQuerySpecialty={setDoctorQuerySpecialty}
            doctorQueryName={doctorQueryName}
            setDoctorQueryName={setDoctorQueryName}
            doctors={doctors}
            doctorLoadError={doctorLoadError}
            selectedDoctor={selectedDoctor}
            setSelectedDoctor={setSelectedDoctor}
            appointmentDate={appointmentDate}
            appointmentTime={appointmentTime}
            appointmentReason={appointmentReason}
            setAppointmentReason={setAppointmentReason}
            appointmentError={appointmentError}
            setAppointmentError={setAppointmentError}
            showDatePicker={showDatePicker}
            setShowDatePicker={setShowDatePicker}
            showTimePicker={showTimePicker}
            setShowTimePicker={setShowTimePicker}
            formatDateLabel={formatDateLabel}
            formatTimeLabel={formatTimeLabel}
            onDateChange={onDateChange}
            onTimeChange={onTimeChange}
            onBookAppointment={handleBookAppointment}
            appointments={appointments}
            doctorById={doctorById}
          />
        ) : activeTab === 'medicine' ? (
          <MedicineTab
            language={language}
            colors={colors}
            medicineScrollRef={medicineScrollRef}
            takeMedicineCard={takeMedicineCard}
            onClearTakeMedicineCard={() => setTakeMedicineCard(null)}
            onMarkReminderTaken={markReminderTakenAsync}
            todayMedicineReminders={todayMedicineReminders}
            futureMedicineReminders={futureMedicineReminders}
            medicineClockTick={medicineClockTick}
            parseTimeParts={parseTimeParts}
            computeMedicineAlarmKey={computeMedicineAlarmKey}
            onShowMedicineDetails={(details) => setMedicineDetailsCard(details)}
          />
        ) : activeTab === 'clinic' ? (
          <ClinicTab
            language={language}
            colors={colors}
            clinicList={clinicList}
            doctorById={doctorById}
            onShowClinicDetails={setClinicDetailsCard}
          />
        ) : activeTab === 'reports' ? (
          <ReportsTab
            language={language}
            colors={colors}
            patientReports={patientReports}
            onOpenReportDetails={openReportDetails}
            onDownloadReportPdf={handleDownloadReportPdf}
          />
        ) : (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={modernStyles.scrollContent}>
            {profileView === 'verify-email' ? (
              <EmailChangeVerificationCard
                pendingEmail={pendingEmail}
                onVerified={() => {
                  setUser((u) => ({ ...u, email: pendingEmail }));
                  setPendingEmail('');
                  setProfileView('view');
                }}
                onCancel={() => {
                  setPendingEmail('');
                  setProfileView('edit');
                }}
              />
            ) : profileView === 'edit' ? (
              <ProfileEditCard
                user={user}
                onSave={(next) => {
                  setUser(next);
                  setProfileView('view');
                }}
                onCancel={() => setProfileView('view')}
                onRequestEmailChange={(email) => {
                  setPendingEmail(email);
                  setProfileView('verify-email');
                }}
              />
            ) : (
              <ProfileViewCard user={user} onEdit={() => setProfileView('edit')} />
            )}

            {!!onLogout && (
              <TouchableOpacity
                style={[modernStyles.profileLogoutBtn, { borderColor: colors.danger }]}
                activeOpacity={0.65}
                onPress={onLogout}
                accessibilityRole="button"
                accessibilityLabel="Logout"
              >
                <Text style={[modernStyles.profileLogoutText, { color: colors.danger }]}>
                  {language === 'sinhala' ? 'පිටවීම' : language === 'tamil' ? 'வெளியேறு' : 'Logout'}
                </Text>
              </TouchableOpacity>
            )}

            <LanguagePickerInline />
            <ThemeToggleCard />
            <AlarmToneSettingsCard />
            <DeleteAccountCard />
          </ScrollView>
        )}
      </View>

      {/* Bottom Tab Navigation */}
      <PatientTabs activeTab={activeTab} onChange={setActiveTab} />
    </SafeAreaView>
  );
}