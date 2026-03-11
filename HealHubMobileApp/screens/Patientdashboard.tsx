import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, StatusBar, TouchableOpacity, ScrollView, TextInput, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import PatientTabs, { PatientTabKey } from '../components/patient/tabs';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import AlertMessage from '../components/alerts/AlertMessage';
import { cancelAlarmAsync, scheduleAlarmAtAsync } from '../utils/alarms';
import { kvGet, kvSet } from '../utils/kvStorage';

import ProfileViewCard, { PatientUser } from '../components/patient/profile/ProfileViewCard';
import ProfileEditCard from '../components/patient/profile/ProfileEditCard';
import EmailChangeVerificationCard from '../components/patient/profile/EmailChangeVerificationCard';
import DeleteAccountCard from '../components/patient/profile/DeleteAccountCard';
import LanguagePickerInline from '../components/settings/LanguagePickerInline';
import ThemeToggleCard from '../components/settings/ThemeToggleCard';
import { apiGet, apiPost } from '../utils/api';
import PatientAmbulanceStatusCard from '../components/patient/ambulance/PatientAmbulanceStatusCard';
import { connectRealtime, type InvalidatePayload } from '../utils/realtime';

type PatientNotification = {
  notification_id: number;
  title: string;
  message: string;
  type: string;
  is_read?: boolean;
  created_at?: string;
};

type DoctorRow = {
  doctor_id: number;
  full_name: string;
  specialization: string;
  consultation_fee?: number;
  is_available?: boolean;
  start_time?: string | null;
  end_time?: string | null;
};

type AppointmentRow = {
  appointment_id: number;
  patient_id: number;
  doctor_id: number;
  appointment_date: string;
  appointment_time: string;
  status: string;
  symptoms?: string | null;
  notes?: string | null;
  booked_at?: string;
};

type ClinicRow = {
  clinic_id: number;
  patient_id: number;
  doctor_id: number;
  clinic_date: string;
  start_time: string;
  end_time?: string | null;
  status: string;
  notes?: string | null;
};

type MedicationRow = {
  medication_id: number;
  patient_id: number;
  doctor_id: number;
  medicine_name: string;
  dosage: string;
  frequency: string;
  times_per_day: number;
  specific_times?: any;
  start_date: string;
  end_date?: string | null;
  next_clinic_date?: string | null;
  is_active?: boolean;
};

type MedicineReminderRow = {
  reminder_id: number;
  patient_id: number;
  medication_id: number;
  reminder_date: string;
  reminder_time: string;
  status: string;
};

type MedicalReportRow = {
  report_id?: number;
  appointment_id?: number | null;
  clinic_id?: number | null;
  diagnosis?: string | null;
  prescription?: string | null;
  notes?: string | null;
  created_at?: string | null;
  doctor_name?: string | null;
  specialization?: string | null;
};

type PatientdashboardProps = {
  accessToken?: string;
  onOpenAiDetect?: () => void;
  onOpenNotifications?: () => void;
  onOpenNearbyAmbulance?: () => void;
  onLogout?: () => void;
};

export default function Patientdashboard({ accessToken, onOpenAiDetect, onOpenNotifications, onOpenNearbyAmbulance, onLogout }: PatientdashboardProps) {
  const { language } = useLanguage();
  const { colors, mode } = useTheme();
  const [activeTab, setActiveTab] = useState<PatientTabKey>('home');

  const reminderToastTimer = useRef<NodeJS.Timeout | null>(null);
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

  const [homeMedicines, setHomeMedicines] = useState<Array<{ id: string; name: string; time: string; note: string }>>([]);
  const [todayMedicineReminders, setTodayMedicineReminders] = useState<
    Array<{ id: string; name: string; time: string; note: string }>
  >([]);
  const [futureMedicineReminders, setFutureMedicineReminders] = useState<
    Array<{ id: string; name: string; when: string; note: string }>
  >([]);
  const [homeClinics, setHomeClinics] = useState<Array<{ id: string; title: string; when: string; where: string }>>([]);
  const [homeRecentAppointments, setHomeRecentAppointments] = useState<
    Array<{ id: string; doctor: string; date: string; time: string; status: string }>
  >([]);
  const [homeReports, setHomeReports] = useState<Array<{ id: string; title: string; sub: string; report: MedicalReportRow }>>([]);

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

  const homeSections = useMemo(() => {
    return {
      medicines: homeMedicines,
      clinics: homeClinics,
      recentAppointments: homeRecentAppointments,
      reports: homeReports,
    };
  }, [homeMedicines, homeClinics, homeRecentAppointments, homeReports]);

  const parseTimeParts = (timeText: string): { hour: number; minute: number } | null => {
    const t = String(timeText || '').trim();
    if (!t) return null;
    const hhmm = t.split(':');
    if (hhmm.length < 2) return null;
    const hour = Number(hhmm[0]);
    const minute = Number(hhmm[1]);
    if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
    if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
    return { hour, minute };
  };

  const makeLocalDateTime = (dateText: string, timeText: string): Date | null => {
    const d = String(dateText || '').trim();
    const parts = d.split('-');
    if (parts.length !== 3) return null;
    const year = Number(parts[0]);
    const month = Number(parts[1]);
    const day = Number(parts[2]);
    if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;
    const tp = parseTimeParts(timeText);
    const hour = tp?.hour ?? 9;
    const minute = tp?.minute ?? 0;
    return new Date(year, month - 1, day, hour, minute, 0, 0);
  };

  const downloadReportAsTextAsync = async (report: MedicalReportRow) => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const FileSystem = require('expo-file-system') as any;
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const Sharing = require('expo-sharing') as any;

      const created = (report.created_at || '').slice(0, 10) || new Date().toISOString().slice(0, 10);
      const rid = report.report_id ?? 'report';
      const filename = `healhub_medical_report_${rid}_${created}.txt`;
      const uri = `${String(FileSystem.cacheDirectory || '')}${filename}`;

      const content = [
        'HealHub Medical Report',
        `Date: ${created}`,
        `Doctor: ${report.doctor_name || 'Unknown'}`,
        report.specialization ? `Specialization: ${report.specialization}` : '',
        '',
        `Diagnosis: ${report.diagnosis || ''}`,
        '',
        `Prescription: ${report.prescription || ''}`,
        report.notes ? `\nNotes: ${report.notes}` : '',
        '',
      ]
        .filter(Boolean)
        .join('\n');

      await FileSystem.writeAsStringAsync(uri, content, { encoding: FileSystem.EncodingType?.UTF8 ?? 'utf8' });

      const canShare = typeof Sharing.isAvailableAsync === 'function' ? await Sharing.isAvailableAsync() : false;
      if (canShare) {
        await Sharing.shareAsync(uri, {
          mimeType: 'text/plain',
          dialogTitle: language === 'sinhala' ? 'වෛද්‍ය වාර්තාව බාගත කරන්න' : language === 'tamil' ? 'மருத்துவ அறிக்கையை பதிவிறக்கு' : 'Download medical report',
        });
      }

      showReminderToast(
        'success',
        language === 'sinhala'
          ? 'වාර්තාව සකස් කළා.'
          : language === 'tamil'
            ? 'அறிக்கை தயாராக உள்ளது.'
            : 'Report ready.'
      );
    } catch (e) {
      console.log('downloadReportAsTextAsync failed:', e);
      showReminderToast(
        'error',
        language === 'sinhala'
          ? 'වාර්තාව බාගත කළ නොහැක. Dev build එකක් භාවිතා කරන්න.'
          : language === 'tamil'
            ? 'அறிக்கையை பதிவிறக்க முடியவில்லை. Dev build பயன்படுத்தவும்.'
            : 'Unable to download report. Use a development build.'
      );
    }
  };

  const reconcilePatientAlarmScheduleAsync = async (input: {
    clinics: ClinicRow[];
    upcomingReminders: Array<any>;
    doctorMap: Record<number, DoctorRow>;
  }) => {
    const STORAGE_KEY = 'patient_alarm_schedule_v1';
    try {
      const desired: Array<{ key: string; title: string; body: string; date: Date }> = [];
      const now = Date.now();

      for (const r of input.upcomingReminders) {
        const dt = makeLocalDateTime(String(r.reminder_date || ''), String(r.reminder_time || ''));
        if (!dt) continue;
        if (dt.getTime() <= now + 15_000) continue;

        const medicineName = String(r.medicine_name || '').trim() || `Medicine #${String(r.medication_id || '')}`;
        const dosage = String(r.dosage || '').trim();
        const when = `${String(r.reminder_date || '')} ${String(r.reminder_time || '').slice(0, 5)}`;
        desired.push({
          key: `med:${String(r.reminder_id || r.medication_id || medicineName)}:${when}`,
          title: language === 'sinhala' ? 'ඖෂධ මතක් කිරීම' : language === 'tamil' ? 'மருந்து நினைவூட்டல்' : 'Medicine reminder',
          body: dosage ? `${medicineName} • ${dosage} • ${when}` : `${medicineName} • ${when}`,
          date: dt,
        });
      }

      // Clinics: schedule only Scheduled clinics within 30 days
      const maxClinicTime = now + 30 * 24 * 60 * 60 * 1000;
      for (const c of input.clinics) {
        if (String(c.status || '').toLowerCase() !== 'scheduled') continue;
        const dt = makeLocalDateTime(String(c.clinic_date || ''), String(c.start_time || '09:00'));
        if (!dt) continue;
        const t = dt.getTime();
        if (t <= now + 15_000 || t > maxClinicTime) continue;

        const doc = input.doctorMap[c.doctor_id];
        const doctorName = doc?.full_name ? `Dr. ${doc.full_name}` : `Doctor #${c.doctor_id}`;
        const when = `${String(c.clinic_date || '')} ${String(c.start_time || '').slice(0, 5)}`;
        desired.push({
          key: `clinic:${String(c.clinic_id)}:${when}`,
          title: language === 'sinhala' ? 'ක්ලිනික් මතක් කිරීම' : language === 'tamil' ? 'கிளினிக் நினைவூட்டல்' : 'Clinic reminder',
          body: `${doctorName} • ${when}`,
          date: dt,
        });
      }

      desired.sort((a, b) => a.date.getTime() - b.date.getTime());
      const limited = desired.slice(0, 50);
      const desiredKeys = new Set(limited.map((d) => d.key));

      const storedRaw = await kvGet(STORAGE_KEY);
      let stored: Record<string, string> = {};
      if (storedRaw) {
        try {
          stored = JSON.parse(storedRaw) as Record<string, string>;
        } catch {
          stored = {};
        }
      }

      // Cancel alarms that are no longer desired
      for (const [key, notifId] of Object.entries(stored)) {
        if (desiredKeys.has(key)) continue;
        try {
          await cancelAlarmAsync(notifId);
        } catch (e) {
          console.log('cancelAlarmAsync failed:', e);
        }
        delete stored[key];
      }

      // Schedule missing
      for (const d of limited) {
        if (stored[d.key]) continue;
        try {
          const res = await scheduleAlarmAtAsync({ title: d.title, body: d.body, date: d.date });
          stored[d.key] = res.id;
        } catch (e) {
          console.log('scheduleAlarmAtAsync (auto) failed:', e);
        }
      }

      await kvSet(STORAGE_KEY, JSON.stringify(stored));
    } catch (e) {
      console.log('reconcilePatientAlarmScheduleAsync failed:', e);
    }
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

  const getLocalYyyyMmDd = () => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
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

  useEffect(() => {
    return () => {
      if (reminderToastTimer.current) clearTimeout(reminderToastTimer.current);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadProfile() {
      if (!accessToken) return;
      setProfileLoadError('');

      const result = await apiGet<any>('/api/auth/profile', accessToken);
      if (cancelled) return;

      if (!result.ok) {
        const msg = (result.data && (result.data.message || result.data.error)) || 'Failed to load profile';
        setProfileLoadError(String(msg));
        return;
      }

      const data = result.data?.data ?? result.data;
      if (!data) {
        setProfileLoadError('Failed to load profile');
        return;
      }

      const mapped: PatientUser = {
        fullName: String(data.full_name ?? data.fullName ?? user.fullName),
        email: String(data.email ?? user.email),
        phone: String(data.phone ?? user.phone),
        gender: String(data.gender ?? user.gender),
        dateOfBirth: String(data.dob ?? data.date_of_birth ?? data.dateOfBirth ?? user.dateOfBirth),
        address: String(data.address ?? user.address),
      };

      setUser(mapped);
    }

    loadProfile();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken]);

  useEffect(() => {
    let cancelled = false;

    async function loadAmbulanceStatus() {
      if (!accessToken) return;

      const result = await apiGet<any>('/api/patient/notifications?type=Ambulance&limit=20', accessToken);
      if (cancelled) return;

      if (!result.ok) {
        setAmbulanceStatus(null);
        return;
      }

      const list: PatientNotification[] = Array.isArray(result.data?.data) ? result.data.data : [];
      if (!list.length) {
        setAmbulanceStatus(null);
        return;
      }

      const preferred = list.find((n) => String(n.title || '').toLowerCase().includes('accepted'))
        || list.find((n) => String(n.title || '').toLowerCase().includes('rejected'))
        || list[0];

      setAmbulanceStatus(preferred);
    }

    loadAmbulanceStatus();
    const interval = setInterval(loadAmbulanceStatus, 7000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [accessToken, realtimeAmbulanceTick]);

  useEffect(() => {
    // Real data for home sections + notifications count.
    let cancelled = false;

    async function loadHomeData() {
      if (!accessToken) return;

      let docMap: Record<number, DoctorRow> = doctorById;

      // Unread notifications count
      const notifRes = await apiGet<any>('/api/patient/notifications?is_read=false&limit=100', accessToken);
      if (!cancelled && notifRes.ok) {
        const rows = Array.isArray(notifRes.data?.data) ? notifRes.data.data : [];
        setNotificationCount(rows.length);
      }

      // Doctor list (for mapping id -> name)
      const docsRes = await apiGet<any>('/api/appointment/doctors');
      if (!cancelled && docsRes.ok) {
        const rows: DoctorRow[] = Array.isArray(docsRes.data?.data) ? docsRes.data.data : [];
        const map: Record<number, DoctorRow> = {};
        for (const doc of rows) map[doc.doctor_id] = doc;
        docMap = map;
        setDoctorById(map);
      }

      // Dashboard (clinics + appointments)
      const dashRes = await apiGet<any>('/api/patient/dashboard', accessToken);
      let clinicsForSchedule: ClinicRow[] = [];
      if (!cancelled && dashRes.ok) {
        const data = dashRes.data?.data ?? {};
        const clinics: ClinicRow[] = Array.isArray(data.clinics) ? data.clinics : [];
        const appts: AppointmentRow[] = Array.isArray(data.appointments) ? data.appointments : [];

        clinicsForSchedule = clinics;

        const clinicItems = clinics
          .filter((c) => String(c.status || '').toLowerCase() === 'scheduled')
          .slice(0, 6)
          .map((c) => {
            const doc = docMap[c.doctor_id];
            const doctorName = doc?.full_name ? `Dr. ${doc.full_name}` : `Doctor #${c.doctor_id}`;
            return {
              id: String(c.clinic_id),
              title: doctorName,
              when: `${c.clinic_date} • ${String(c.start_time || '').slice(0, 5)}`,
              where: '',
            };
          });
        setHomeClinics(clinicItems);

        const apptItems = appts
          .slice(0, 6)
          .map((a) => {
            const doc = docMap[a.doctor_id];
            const doctorName = doc?.full_name ? `Dr. ${doc.full_name}` : `Doctor #${a.doctor_id}`;
            return {
              id: String(a.appointment_id),
              doctor: doctorName,
              date: String(a.appointment_date),
              time: String(a.appointment_time).slice(0, 5),
              status: String(a.status),
            };
          });
        setHomeRecentAppointments(apptItems);
      }

      // Medical reports
      const reportsRes = await apiGet<any>('/api/patient/medical-reports', accessToken);
      if (!cancelled && reportsRes.ok) {
        const rows: MedicalReportRow[] = Array.isArray(reportsRes.data?.data) ? reportsRes.data.data : [];
        const items = rows.slice(0, 6).map((r, idx) => {
          const created = String(r.created_at || '').slice(0, 10) || '';
          const doctor = r.doctor_name ? `Dr. ${r.doctor_name}` : '';
          const title = String(r.diagnosis || '').trim() || (language === 'sinhala' ? 'වාර්තාව' : language === 'tamil' ? 'அறிக்கை' : 'Report');
          const sub = [doctor, created].filter(Boolean).join(' • ');
          const id = String(r.report_id ?? `${created}-${idx}`);
          return { id, title, sub, report: r };
        });
        setHomeReports(items);
      }

      // Medicines (today reminders + medication lookup)
      const [medsRes, remindersRes] = await Promise.all([
        apiGet<any>('/api/patient/medications', accessToken),
        apiGet<any>('/api/patient/medicine-reminders', accessToken),
      ]);

      if (cancelled) return;

      const meds: MedicationRow[] = Array.isArray(medsRes.data?.data) ? medsRes.data.data : [];
      const medsById: Record<number, MedicationRow> = {};
      for (const m of meds) medsById[m.medication_id] = m;

      const reminders: MedicineReminderRow[] = Array.isArray(remindersRes.data?.data) ? remindersRes.data.data : [];
      const pending = reminders
        .filter((r) => String(r.status || '').toLowerCase() === 'pending')
        .sort((a, b) => {
          const da = String(a.reminder_date || '');
          const db = String(b.reminder_date || '');
          if (da !== db) return da.localeCompare(db);
          return String(a.reminder_time).localeCompare(String(b.reminder_time));
        });

      const todayText = getLocalYyyyMmDd();
      const todayItems = pending
        .filter((r) => String(r.reminder_date || '') === todayText)
        .map((r) => {
          const med = medsById[r.medication_id];
          return {
            id: String(r.reminder_id),
            name: med?.medicine_name ? String(med.medicine_name) : `Medicine #${r.medication_id}`,
            time: String(r.reminder_time).slice(0, 5),
            note: med?.dosage ? String(med.dosage) : '',
          };
        });

      const futureItems = pending
        .filter((r) => {
          const dateText = String(r.reminder_date || '');
          return dateText && dateText > todayText;
        })
        .map((r) => {
          const med = medsById[r.medication_id];
          const when = `${String(r.reminder_date || '')} ${String(r.reminder_time || '').slice(0, 5)}`;
          return {
            id: String(r.reminder_id),
            name: med?.medicine_name ? String(med.medicine_name) : `Medicine #${r.medication_id}`,
            when,
            note: med?.dosage ? String(med.dosage) : '',
          };
        });

      setTodayMedicineReminders(todayItems);
      setFutureMedicineReminders(futureItems);

      // Home shows a compact version (today reminders first)
      setHomeMedicines(todayItems.slice(0, 6));

      // Auto-schedule alarms for upcoming reminders + clinics
      try {
        const upcomingRes = await apiGet<any>('/api/patient/medicine-reminders/upcoming?days=3', accessToken);
        const upcoming = Array.isArray(upcomingRes.data?.data) ? upcomingRes.data.data : [];
        if (!cancelled) {
          await reconcilePatientAlarmScheduleAsync({
            clinics: clinicsForSchedule,
            upcomingReminders: upcoming,
            doctorMap: docMap,
          });
        }
      } catch (e) {
        console.log('Auto scheduling alarms failed:', e);
      }
    }

    loadHomeData();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, realtimeHomeTick]);

  useEffect(() => {
    if (!accessToken) return;

    const socket = connectRealtime(accessToken);
    let lastAt = 0;

    const onInvalidate = (payload: InvalidatePayload) => {
      const now = Date.now();
      if (now - lastAt < 600) return;
      lastAt = now;

      const topics = Array.isArray(payload?.topics) ? payload.topics : [];
      if (!topics.length) {
        setRealtimeHomeTick((x) => x + 1);
        setRealtimeAmbulanceTick((x) => x + 1);
        return;
      }

      if (topics.some((t) => String(t).startsWith('patient:dashboard'))
        || topics.some((t) => String(t).startsWith('patient:medications'))
        || topics.some((t) => String(t).startsWith('patient:clinics'))
        || topics.some((t) => String(t).startsWith('patient:reports'))
      ) {
        setRealtimeHomeTick((x) => x + 1);
      }

      if (topics.some((t) => String(t).startsWith('patient:ambulance')) || topics.some((t) => String(t) === 'notifications')) {
        setRealtimeAmbulanceTick((x) => x + 1);
      }
    };

    socket.on('invalidate', onInvalidate);

    return () => {
      socket.off('invalidate', onInvalidate);
      socket.disconnect();
    };
  }, [accessToken]);

  useEffect(() => {
    // Load appointments when appointment tab is active.
    let cancelled = false;

    async function loadAppointments() {
      if (!accessToken) return;
      const res = await apiGet<any>('/api/patient/appointments', accessToken);
      if (cancelled) return;
      if (!res.ok) return;
      const rows: AppointmentRow[] = Array.isArray(res.data?.data) ? res.data.data : [];
      setAppointments(rows);
    }

    if (activeTab === 'appointment') {
      loadAppointments();
    }

    return () => {
      cancelled = true;
    };
  }, [activeTab, accessToken, realtimeHomeTick]);

  useEffect(() => {
    // Doctor search by specialization + name.
    let cancelled = false;
    const handle = setTimeout(async () => {
      try {
        setDoctorLoadError('');
        const params = new URLSearchParams();
        if (doctorQuerySpecialty.trim()) params.set('specialization', doctorQuerySpecialty.trim());
        if (doctorQueryName.trim()) params.set('q', doctorQueryName.trim());

        const url = params.toString() ? `/api/appointment/doctors?${params.toString()}` : '/api/appointment/doctors';
        const res = await apiGet<any>(url);
        if (cancelled) return;
        if (!res.ok) {
          setDoctors([]);
          setDoctorLoadError('Failed to load doctors');
          return;
        }
        const rows: DoctorRow[] = Array.isArray(res.data?.data) ? res.data.data : [];
        setDoctors(rows);
      } catch (e: any) {
        if (cancelled) return;
        setDoctors([]);
        setDoctorLoadError(e?.message ? String(e.message) : 'Failed to load doctors');
      }
    }, 350);

    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [doctorQuerySpecialty, doctorQueryName]);

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

  useEffect(() => {
    if (!profileLoadError) return;
    showReminderToast('error', profileLoadError);
  }, [profileLoadError]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <StatusBar barStyle={mode === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={colors.background} translucent={false} />

      <AlertMessage
        visible={reminderToastVisible}
        mode="toast"
        variant={reminderToastVariant}
        message={reminderToastMessage}
        onClose={() => setReminderToastVisible(false)}
      />

      <View style={[styles.header, { borderBottomColor: colors.border }]}> 
        <View style={styles.headerTop}>
          <Text style={[styles.title, { color: colors.primary }]}>{title}</Text>
          <View style={styles.headerActions}>
            {!!onOpenNotifications && (
              <TouchableOpacity
                onPress={onOpenNotifications}
                activeOpacity={0.8}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="button"
                accessibilityLabel="Notifications"
                style={styles.bellWrap}
              >
                <Text style={[styles.bellIcon, { color: colors.text }]}>🔔</Text>
                {notificationCount > 0 && (
                  <View style={[styles.badge, { backgroundColor: colors.danger, borderColor: colors.background }]}>
                    <Text style={styles.badgeText}>{notificationCount}</Text>
                  </View>
                )}
              </TouchableOpacity>
            )}

                <TouchableOpacity
                  onPress={() => {
                    setActiveTab('profile');
                  }}
                  activeOpacity={0.7}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityRole="button"
                  accessibilityLabel="Profile"
                >
                  <Text style={[styles.profileText, { color: colors.primary }]}>
                    {language === 'sinhala' ? 'පැතිකඩ' : language === 'tamil' ? 'சுயவிவரம்' : 'Profile'}
                  </Text>
                </TouchableOpacity>
          </View>
        </View>
        <Text style={[styles.subtitle, { color: colors.subtext }]}>{tabTitle}</Text>
      </View>

      <View style={styles.content}>
        {activeTab === 'home' ? (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            <View
              style={[
                styles.emergencyCard,
                {
                  backgroundColor: mode === 'dark' ? '#2b1d1f' : '#fee2e2',
                  borderColor: colors.border,
                },
              ]}
            >
              <View style={{ flex: 1 }}>
                <Text style={[styles.emergencyTitle, { color: colors.text }]}>
                  {language === 'sinhala'
                    ? 'ආසන්න ඇම්බියුලන්ස්'
                    : language === 'tamil'
                      ? 'அருகிலுள்ள ஆம்புலன்ஸ்'
                      : 'Nearby Ambulance'}
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
                onPress={() => {
                  if (!onOpenNearbyAmbulance) return;

                  // Clear previous ambulance request status/notifications before trying again.
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
                disabled={!onOpenNearbyAmbulance}
              >
                <Text style={styles.emergencyBtnText}>
                  {language === 'sinhala' ? 'විවෘත කරන්න' : language === 'tamil' ? 'திற' : 'Open'}
                </Text>
              </TouchableOpacity>
            </View>

            <PatientAmbulanceStatusCard
              accessToken={accessToken}
              language={language}
              colors={{ card: colors.card, text: colors.text, subtext: colors.subtext, border: colors.border }}
              ambulanceStatus={ambulanceStatus}
            />

            <View
              style={[
                styles.aiCard,
                {
                  backgroundColor: mode === 'dark' ? '#123527' : colors.primary,
                },
              ]}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.aiTitle}>
                  {language === 'sinhala'
                    ? 'AI තුවාල/රෑෂ් හඳුනාගැනීම'
                    : language === 'tamil'
                      ? 'AI காயம்/ரேஷ் கண்டறிதல்'
                      : 'AI Wound / Rash Detector'}
                </Text>
                <Text style={styles.aiSub}>
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
                <Text style={[styles.aiButtonText, { color: colors.primary }]}>
                  {language === 'sinhala' ? 'විවෘත කරන්න' : language === 'tamil' ? 'திற' : 'Open'}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                {language === 'sinhala' ? 'ඉදිරි ඖෂධ' : language === 'tamil' ? 'வரவிருக்கும் மருந்துகள்' : 'Upcoming medicines'}
              </Text>

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
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                {language === 'sinhala' ? 'ඉදිරි ක්ලිනික්' : language === 'tamil' ? 'வரவிருக்கும் கிளினிக்குகள்' : 'Upcoming clinics'}
              </Text>

              {homeSections.clinics.map((c) => (
                <View key={c.id} style={[styles.itemRow, { borderTopColor: colors.border }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.itemTitle, { color: colors.text }]}>{c.title}</Text>
                    <Text style={[styles.itemSub, { color: colors.subtext }]}>
                      {c.where ? `${c.when} • ${c.where}` : c.when}
                    </Text>
                  </View>
                  <Text style={[styles.itemRight, { color: colors.primary }]}>
                    {language === 'sinhala' ? 'විස්තර' : language === 'tamil' ? 'விவரம்' : 'Details'}
                  </Text>
                </View>
              ))}

              {homeSections.clinics.length === 0 && (
                <Text style={[styles.cardText, { color: colors.subtext, marginTop: 8 }]}>
                  {language === 'sinhala'
                    ? 'ඉදිරි ක්ලිනික් නොමැත.'
                    : language === 'tamil'
                      ? 'வரவிருக்கும் கிளினிக்குகள் இல்லை.'
                      : 'No upcoming clinics.'}
                </Text>
              )}
            </View>

            <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                {language === 'sinhala' ? 'වෛද්‍ය වාර්තා' : language === 'tamil' ? 'மருத்துவ அறிக்கைகள்' : 'Medical reports'}
              </Text>

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
                    onPress={() => void downloadReportAsTextAsync(r.report)}
                    accessibilityRole="button"
                    accessibilityLabel="Download report"
                  >
                    <Text style={[styles.itemRight, { color: colors.primary }]}>
                      {language === 'sinhala' ? 'බාගත' : language === 'tamil' ? 'பதிவிறக்கு' : 'Download'}
                    </Text>
                  </TouchableOpacity>
                </View>
              ))}

              {homeSections.reports.length === 0 && (
                <Text style={[styles.cardText, { color: colors.subtext, marginTop: 8 }]}>
                  {language === 'sinhala'
                    ? 'වාර්තා දත්ත නොමැත.'
                    : language === 'tamil'
                      ? 'அறிக்கை தரவு இல்லை.'
                      : 'No reports found.'}
                </Text>
              )}
            </View>

            <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                {language === 'sinhala' ? 'මෑත වෙන්කිරීම්' : language === 'tamil' ? 'சமீபத்திய நியமனங்கள்' : 'Recent appointments'}
              </Text>

              {homeSections.recentAppointments.map((a) => (
                <View key={a.id} style={[styles.itemRow, { borderTopColor: colors.border }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.itemTitle, { color: colors.text }]}>{a.doctor}</Text>
                    <Text style={[styles.itemSub, { color: colors.subtext }]}>
                      {a.date} • {a.time} • {a.status}
                    </Text>
                  </View>
                  <Text style={[styles.itemRight, { color: colors.primary }]}>⭐</Text>
                </View>
              ))}

              {homeSections.recentAppointments.length === 0 && (
                <Text style={[styles.cardText, { color: colors.subtext, marginTop: 8 }]}>
                  {language === 'sinhala'
                    ? 'වෙන්කිරීම් දත්ත නොමැත.'
                    : language === 'tamil'
                      ? 'நியமன தரவு இல்லை.'
                      : 'No appointments found.'}
                </Text>
              )}
            </View>
          </ScrollView>
        ) : activeTab === 'appointment' ? (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                {language === 'sinhala' ? 'වෛද්‍යවරයෙක් වෙන්කරගන්න' : language === 'tamil' ? 'மருத்துவரை முன்பதிவு செய்' : 'Book a doctor'}
              </Text>

              <Text style={[styles.itemSub, { color: colors.subtext, marginTop: 0 }]}>{appointmentsHint}</Text>

              <AlertMessage
                visible={appointmentError.length > 0}
                mode="inline"
                variant="error"
                message={appointmentError}
                onClose={() => setAppointmentError('')}
                style={{ marginTop: 12 }}
              />

              <Text style={[styles.fieldLabel, { color: colors.subtext }]}>
                {language === 'sinhala' ? 'වෛද්‍යවරයා' : language === 'tamil' ? 'மருத்துவர்' : 'Doctor'}
              </Text>

              <TextInput
                value={doctorQuerySpecialty}
                onChangeText={(v) => {
                  setDoctorQuerySpecialty(v);
                  setSelectedDoctor(null);
                }}
                placeholder={language === 'sinhala' ? 'විශේෂත්වය අනුව සොයන්න' : language === 'tamil' ? 'சிறப்பு மூலம் தேடு' : 'Search by specialty'}
                placeholderTextColor={colors.subtext}
                style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.background }]}
              />

              <TextInput
                value={doctorQueryName}
                onChangeText={(v) => {
                  setDoctorQueryName(v);
                  setSelectedDoctor(null);
                }}
                placeholder={language === 'sinhala' ? 'නම අනුව සොයන්න' : language === 'tamil' ? 'பெயர் மூலம் தேடு' : 'Search by doctor name'}
                placeholderTextColor={colors.subtext}
                style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.background, marginTop: 10 }]}
              />

              {!!doctorLoadError && (
                <Text style={[styles.noteText, { color: colors.subtext }]}>{doctorLoadError}</Text>
              )}

              <View style={styles.pillsWrap}>
                {doctors.map((d) => {
                  const active = selectedDoctor?.doctor_id === d.doctor_id;
                  return (
                    <TouchableOpacity
                      key={String(d.doctor_id)}
                      activeOpacity={0.85}
                      onPress={() => {
                        setSelectedDoctor(d);
                        setAppointmentError('');
                      }}
                      style={[
                        styles.pillChip,
                        {
                          borderColor: active ? colors.primary : colors.border,
                          backgroundColor: active ? (mode === 'dark' ? '#0b2a22' : '#f0f9ff') : 'transparent',
                        },
                      ]}
                    >
                      <Text style={[styles.pillChipText, { color: active ? colors.primary : colors.subtext }]}>
                        {`Dr. ${d.full_name}`}
                      </Text>
                      <Text style={[styles.pillChipSub, { color: colors.subtext }]}>{d.specialization}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={[styles.fieldLabel, { color: colors.subtext }]}>
                {language === 'sinhala' ? 'දිනය' : language === 'tamil' ? 'தேதி' : 'Date'}
              </Text>
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => {
                  setShowDatePicker(true);
                  setAppointmentError('');
                }}
                style={[styles.pickerBtn, { borderColor: colors.border, backgroundColor: colors.background }]}
              >
                <Text style={[styles.pickerBtnText, { color: appointmentDate ? colors.text : colors.subtext }]}>
                  📅 {formatDateLabel(appointmentDate)}
                </Text>
              </TouchableOpacity>

              {showDatePicker && (
                <View style={{ marginTop: 8 }}>
                  <DateTimePicker
                    value={appointmentDate ?? new Date()}
                    mode="date"
                    onChange={onDateChange}
                    minimumDate={new Date()}
                    display={Platform.OS === 'ios' ? 'inline' : 'default'}
                  />
                </View>
              )}

              <Text style={[styles.fieldLabel, { color: colors.subtext }]}>
                {language === 'sinhala' ? 'වේලාව' : language === 'tamil' ? 'நேரம்' : 'Time'}
              </Text>
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => {
                  setShowTimePicker(true);
                  setAppointmentError('');
                }}
                style={[styles.pickerBtn, { borderColor: colors.border, backgroundColor: colors.background }]}
              >
                <Text style={[styles.pickerBtnText, { color: appointmentTime ? colors.text : colors.subtext }]}>
                  ⏰ {formatTimeLabel(appointmentTime)}
                </Text>
              </TouchableOpacity>

              {showTimePicker && (
                <View style={{ marginTop: 8 }}>
                  <DateTimePicker
                    value={appointmentTime ?? new Date()}
                    mode="time"
                    onChange={onTimeChange}
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  />
                </View>
              )}

              <Text style={[styles.fieldLabel, { color: colors.subtext }]}>
                {language === 'sinhala' ? 'හේතුව' : language === 'tamil' ? 'காரணம்' : 'Reason'}
              </Text>
              <TextInput
                value={appointmentReason}
                onChangeText={setAppointmentReason}
                placeholder={language === 'sinhala' ? 'උදා: රෑෂ් පරීක්ෂාව' : language === 'tamil' ? 'உ.தா: ரேஷ் பரிசோதனை' : 'e.g., rash check'}
                placeholderTextColor={colors.subtext}
                style={[styles.input, styles.inputMultiline, { borderColor: colors.border, color: colors.text, backgroundColor: colors.background }]}
                multiline
              />

              <TouchableOpacity
                activeOpacity={0.85}
                style={[styles.primaryAction, { backgroundColor: colors.primary }]}
                onPress={() => {
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

                  if (!dt) return;

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
                }}
              >
                <Text style={styles.primaryActionText}>{bookAppointmentLabel}</Text>
              </TouchableOpacity>

              <Text style={[styles.noteText, { color: colors.subtext }]}>
                {language === 'sinhala'
                  ? 'සටහන: වෙන්කිරීම සැබෑ දත්ත (API) මත පදනම්ව සිදු වේ.'
                  : language === 'tamil'
                    ? 'குறிப்பு: முன்பதிவு உண்மை தரவு (API) மூலம் செய்யப்படுகிறது.'
                    : 'Note: Booking uses real backend data (API).'}
              </Text>
            </View>

            <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                {language === 'sinhala' ? 'ඔබගේ වෙන්කිරීම්' : language === 'tamil' ? 'உங்கள் நியமனங்கள்' : 'Your appointments'}
              </Text>

              {appointments.length === 0 ? (
                <Text style={[styles.cardText, { color: colors.subtext }]}>
                  {language === 'sinhala'
                    ? 'තවම වෙන්කිරීම් නැත.'
                    : language === 'tamil'
                      ? 'இன்னும் நியமனங்கள் இல்லை.'
                      : 'No appointments yet.'}
                </Text>
              ) : (
                appointments.map((a) => {
                  const doc = doctorById[a.doctor_id];
                  const doctorName = doc?.full_name ? `Dr. ${doc.full_name}` : `Doctor #${a.doctor_id}`;
                  return (
                    <View key={String(a.appointment_id)} style={[styles.itemRow, { borderTopColor: colors.border }]}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.itemTitle, { color: colors.text }]}>{doctorName}</Text>
                        <Text style={[styles.itemSub, { color: colors.subtext }]}>
                          {String(a.appointment_date)} • {String(a.appointment_time).slice(0, 5)}
                          {a.symptoms ? ` • ${a.symptoms}` : ''}
                        </Text>
                      </View>
                      <View style={[styles.smallPill, { borderColor: colors.primary }]}>
                        <Text style={[styles.smallPillText, { color: colors.primary }]}>{String(a.status)}</Text>
                      </View>
                    </View>
                  );
                })
              )}
            </View>
          </ScrollView>
        ) : activeTab === 'medicine' ? (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                {language === 'sinhala' ? 'අද ඖෂධ' : language === 'tamil' ? 'இன்றைய மருந்துகள்' : 'Today medicines'}
              </Text>

              {todayMedicineReminders.map((m) => (
                <View key={m.id} style={[styles.itemRow, { borderTopColor: colors.border }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.itemTitle, { color: colors.text }]}>{m.name}</Text>
                    <Text style={[styles.itemSub, { color: colors.subtext }]}>{m.note}</Text>
                  </View>
                  <Text style={[styles.itemRight, { color: colors.primary }]}>{m.time}</Text>
                </View>
              ))}

              {todayMedicineReminders.length === 0 && (
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
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                {language === 'sinhala' ? 'ඉදිරි ඖෂධ' : language === 'tamil' ? 'வரவிருக்கும் மருந்துகள்' : 'Future medicines'}
              </Text>

              {futureMedicineReminders.map((m) => (
                <View key={m.id} style={[styles.itemRow, { borderTopColor: colors.border }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.itemTitle, { color: colors.text }]}>{m.name}</Text>
                    <Text style={[styles.itemSub, { color: colors.subtext }]}>{m.note}</Text>
                  </View>
                  <Text style={[styles.itemRight, { color: colors.primary }]}>{m.when}</Text>
                </View>
              ))}

              {futureMedicineReminders.length === 0 && (
                <Text style={[styles.cardText, { color: colors.subtext, marginTop: 8 }]}>
                  {language === 'sinhala'
                    ? 'ඉදිරි ඖෂධ මතක් කිරීම් නැත.'
                    : language === 'tamil'
                      ? 'வரவிருக்கும் மருந்து நினைவூட்டல்கள் இல்லை.'
                      : 'No future medicine reminders.'}
                </Text>
              )}
            </View>
          </ScrollView>
        ) : activeTab === 'clinic' ? (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                {language === 'sinhala' ? 'ක්ලිනික්' : language === 'tamil' ? 'கிளினிக்' : 'Clinic'}
              </Text>

              {homeSections.clinics.map((c) => (
                <View key={c.id} style={[styles.itemRow, { borderTopColor: colors.border }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.itemTitle, { color: colors.text }]}>{c.title}</Text>
                    <Text style={[styles.itemSub, { color: colors.subtext }]}>
                      {c.where ? `${c.when} • ${c.where}` : c.when}
                    </Text>
                  </View>
                  <Text style={[styles.itemRight, { color: colors.primary }]}>
                    {language === 'sinhala' ? 'විස්තර' : language === 'tamil' ? 'விவரம்' : 'Details'}
                  </Text>
                </View>
              ))}

              {homeSections.clinics.length === 0 && (
                <Text style={[styles.cardText, { color: colors.subtext, marginTop: 8 }]}>
                  {language === 'sinhala'
                    ? 'ක්ලිනික් දත්ත නොමැත.'
                    : language === 'tamil'
                      ? 'கிளினிக் தரவு இல்லை.'
                      : 'No clinic data.'}
                </Text>
              )}
            </View>
          </ScrollView>
        ) : activeTab === 'reports' ? (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                {language === 'sinhala' ? 'වාර්තා' : language === 'tamil' ? 'அறிக்கைகள்' : 'Reports'}
              </Text>

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
                    onPress={() => void downloadReportAsTextAsync(r.report)}
                    accessibilityRole="button"
                    accessibilityLabel="Download report"
                  >
                    <Text style={[styles.itemRight, { color: colors.primary }]}>
                      {language === 'sinhala' ? 'බාගත' : language === 'tamil' ? 'பதிவிறக்கு' : 'Download'}
                    </Text>
                  </TouchableOpacity>
                </View>
              ))}

              {homeSections.reports.length === 0 && (
                <Text style={[styles.cardText, { color: colors.subtext, marginTop: 8 }]}>
                  {language === 'sinhala'
                    ? 'වාර්තා දත්ත නොමැත.'
                    : language === 'tamil'
                      ? 'அறிக்கை தரவு இல்லை.'
                      : 'No reports found.'}
                </Text>
              )}
            </View>
          </ScrollView>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
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
                style={[styles.profileLogoutBtn, { borderColor: colors.danger }]}
                activeOpacity={0.85}
                onPress={onLogout}
                accessibilityRole="button"
                accessibilityLabel="Logout"
              >
                <Text style={[styles.profileLogoutText, { color: colors.danger }]}>
                  {language === 'sinhala' ? 'පිටවීම' : language === 'tamil' ? 'வெளியேறு' : 'Logout'}
                </Text>
              </TouchableOpacity>
            )}

            <LanguagePickerInline />
            <ThemeToggleCard />
            <DeleteAccountCard />
          </ScrollView>
        )}
      </View>

      <PatientTabs activeTab={activeTab} onChange={setActiveTab} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
  },
  bellWrap: {
    position: 'relative',
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  bellIcon: {
    fontSize: 20,
  },
  badge: {
    position: 'absolute',
    top: 0,
    right: 0,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
    borderWidth: 2,
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '900',
    marginTop: -1,
  },
  logoutText: {
    fontWeight: '900',
    fontSize: 14,
  },
  profileText: {
    fontWeight: '900',
    fontSize: 14,
  },
  subtitle: {
    marginTop: 6,
    fontSize: 14,
    fontWeight: '700',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  scrollContent: {
    paddingBottom: 20,
    gap: 14,
  },
  emergencyCard: {
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  emergencyTitle: {
    fontSize: 15,
    fontWeight: '900',
    marginBottom: 4,
  },
  emergencySub: {
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 16,
  },
  emergencyBtn: {
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  emergencyBtnText: {
    color: '#ffffff',
    fontWeight: '900',
    fontSize: 12,
  },
  fieldLabel: {
    marginTop: 12,
    marginBottom: 8,
    fontSize: 12,
    fontWeight: '800',
  },
  pillsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 6,
  },
  pillChip: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  pillChipText: {
    fontSize: 13,
    fontWeight: '900',
  },
  pillChipSub: {
    marginTop: 2,
    fontSize: 11,
    fontWeight: '800',
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    fontWeight: '700',
  },
  inputMultiline: {
    minHeight: 90,
    textAlignVertical: 'top',
  },
  pickerBtn: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  pickerBtnText: {
    fontSize: 14,
    fontWeight: '800',
  },
  primaryAction: {
    marginTop: 14,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  primaryActionText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '900',
  },
  noteText: {
    marginTop: 10,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 16,
  },
  smallPill: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  smallPillText: {
    fontSize: 12,
    fontWeight: '900',
  },
  card: {
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
  },
  sectionCard: {
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '900',
    marginBottom: 10,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
  },
  itemTitle: {
    fontSize: 13,
    fontWeight: '900',
  },
  itemSub: {
    marginTop: 3,
    fontSize: 12,
    fontWeight: '600',
  },
  itemRight: {
    fontSize: 12,
    fontWeight: '900',
  },
  aiCard: {
    borderRadius: 18,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  aiTitle: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '900',
    marginBottom: 4,
  },
  aiSub: {
    color: '#e5e7eb',
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 16,
  },
  aiButton: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  aiButtonText: {
    fontWeight: '900',
    fontSize: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 8,
  },
  cardText: {
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  profileLogoutBtn: {
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
  },
  profileLogoutText: {
    fontSize: 13,
    fontWeight: '900',
  },
});
