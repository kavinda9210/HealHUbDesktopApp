import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, StatusBar, TouchableOpacity, ScrollView, TextInput, Platform, Modal, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as FileSystem from 'expo-file-system/legacy';
import PatientTabs, { PatientTabKey } from '../components/patient/tabs';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import AlertMessage from '../components/alerts/AlertMessage';
import { cancelAlarmAsync, cancelScheduledAlarmsByKeyAsync, scheduleAlarmAtAsync, scheduleCallLikeAlarmBurstAsync } from '../utils/alarms';
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
  medicine_name?: string | null;
  dosage?: string | null;
  notes?: string | null;
  doctor_name?: string | null;
  doctor_specialization?: string | null;
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
  onOpenAiDetect?: () => void;
  onOpenNotifications?: () => void;
  onOpenNearbyAmbulance?: () => void;
  onLogout?: () => void;
};

export default function Patientdashboard({ accessToken, pendingMedicineTake, onConsumePendingMedicineTake, onOpenAiDetect, onOpenNotifications, onOpenNearbyAmbulance, onLogout }: PatientdashboardProps) {
  const { language } = useLanguage();
  const { colors, mode } = useTheme();
  const [activeTab, setActiveTab] = useState<PatientTabKey>('home');

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
      reports: homeReports,
      recentAppointments: homeRecentAppointments,
    };
  }, [homeMedicines, homeClinics, homeReports, homeRecentAppointments]);

  const reconcilePatientAlarmScheduleAsync = async (input: {
    clinics: ClinicRow[];
    upcomingReminders: Array<any>;
    doctorMap: Record<number, DoctorRow>;
  }) => {
    const STORAGE_KEY = 'patient_alarm_schedule_v2';
    try {
      const desired: Array<{ key: string; title: string; body: string; date: Date; data?: any }> = [];
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
          data: {
            reminderId: r.reminder_id,
            medicationId: r.medication_id,
            medicineName,
            dosage,
            reminderDate: r.reminder_date,
            reminderTime: r.reminder_time,
          },
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
      let storedKeys: string[] = [];
      if (storedRaw) {
        try {
          storedKeys = JSON.parse(storedRaw) as string[];
        } catch {
          storedKeys = [];
        }
      }

      const storedSet = new Set(storedKeys);

      // Cancel alarms that are no longer desired
      for (const key of storedKeys) {
        if (desiredKeys.has(key)) continue;
        try {
          await cancelScheduledAlarmsByKeyAsync(key);
        } catch (e) {
          console.log('cancelScheduledAlarmsByKeyAsync failed:', e);
        }
        storedSet.delete(key);
      }

      // Schedule missing
      for (const d of limited) {
        if (storedSet.has(d.key)) continue;
        try {
          const secondsUntil = Math.floor((d.date.getTime() - Date.now()) / 1000);
          const isMedicine = String(d.key).startsWith('med:');
          const isNearTerm = secondsUntil > 0 && secondsUntil <= 12 * 60 * 60;

          if (isMedicine && isNearTerm) {
            // Burst so it keeps sounding/vibrating until patient taps Stop (or burst ends)
            await scheduleCallLikeAlarmBurstAsync({
              title: d.title,
              body: d.body,
              startInSeconds: secondsUntil,
              repeatEverySeconds: 6,
              repeatCount: 15,
              data: { alarmKey: d.key, ...(d.data ?? {}) },
            });
          } else {
            await scheduleAlarmAtAsync({ title: d.title, body: d.body, date: d.date, data: { alarmKey: d.key, ...(d.data ?? {}) } });
          }

          storedSet.add(d.key);
        } catch (e) {
          console.log('scheduleAlarmAtAsync (auto) failed:', e);
        }
      }

      await kvSet(STORAGE_KEY, JSON.stringify(Array.from(storedSet)));
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

  const parseTimeParts = (timeText: string): null | { hour: number; minute: number } => {
    const raw = String(timeText || '').trim();
    const text = raw.includes(':') ? raw : '';
    const parts = text.slice(0, 5).split(':');
    if (parts.length !== 2) return null;
    const hour = Number(parts[0]);
    const minute = Number(parts[1]);
    if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
    if (hour < 0 || hour > 23) return null;
    if (minute < 0 || minute > 59) return null;
    return { hour, minute };
  };

  const makeLocalDateTime = (dateText: string, timeText: string): Date | null => {
    const dateStr = String(dateText || '').trim();
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
    if (!m) return null;

    const yyyy = Number(m[1]);
    const mon = Number(m[2]);
    const dd = Number(m[3]);
    if (!Number.isFinite(yyyy) || !Number.isFinite(mon) || !Number.isFinite(dd)) return null;

    const tp = parseTimeParts(timeText) ?? { hour: 0, minute: 0 };
    const dt = new Date(yyyy, mon - 1, dd, tp.hour, tp.minute, 0, 0);
    if (Number.isNaN(dt.getTime())) return null;
    return dt;
  };

  const computeMedicineAlarmKey = (input: { reminderId: number | string; date: string; time: string }) => {
    const rid = String(input.reminderId || '').trim();
    const dateText = String(input.date || '').trim();
    const timeText = String(input.time || '').trim().slice(0, 5);
    if (!rid || !dateText || !timeText) return '';
    return `med:${rid}:${dateText} ${timeText}`;
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

        const clinicMap: Record<string, ClinicRow> = {};
        for (const c of clinics) clinicMap[String(c.clinic_id)] = c;
        setClinicById(clinicMap);

        const scheduledClinics = clinics
          .filter((c) => String(c.status || '').toLowerCase() === 'scheduled')
          .sort((a, b) => {
            const da = String(a.clinic_date || '');
            const db = String(b.clinic_date || '');
            if (da !== db) return da.localeCompare(db);
            return String(a.start_time || '').localeCompare(String(b.start_time || ''));
          });
        setClinicList(scheduledClinics);

        const clinicItems = scheduledClinics
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
          const name =
            (r as any).medicine_name && String((r as any).medicine_name).trim()
              ? String((r as any).medicine_name)
              : med?.medicine_name
                ? String(med.medicine_name)
                : `Medicine #${r.medication_id}`;
          const dosage = (r as any).dosage ? String((r as any).dosage) : med?.dosage ? String(med.dosage) : '';
          const description = (r as any).notes ? String((r as any).notes) : '';
          const doctor = (r as any).doctor_name ? `Dr. ${String((r as any).doctor_name)}` : '';
          return {
            id: String(r.reminder_id),
            name,
            date: todayText,
            time: String(r.reminder_time).slice(0, 5),
            dosage,
            description,
            doctor,
          };
        });

      // Future reminders come from upcoming endpoint so we can show real future days.
      let futureItems: Array<{ id: string; name: string; date: string; time: string; when: string; dosage: string; description: string; doctor: string }> = [];
      try {
        const upcomingRes = await apiGet<any>('/api/patient/medicine-reminders/upcoming?days=7', accessToken);
        const upcoming: any[] = Array.isArray(upcomingRes.data?.data) ? upcomingRes.data.data : [];
        futureItems = upcoming
          .filter((r) => String(r.status || '').toLowerCase() === 'pending')
          .filter((r) => {
            const dateText = String(r.reminder_date || '');
            return dateText && dateText > todayText;
          })
          .slice(0, 25)
          .map((r) => {
            const medicineName = String(r.medicine_name || '').trim() || `Medicine #${String(r.medication_id || '')}`;
            const dosage = String(r.dosage || '').trim();
            const description = String(r.notes || '').trim();
            const doctor = r.doctor_name ? `Dr. ${String(r.doctor_name)}` : '';
            const dateText = String(r.reminder_date || '');
            const timeText = String(r.reminder_time || '').slice(0, 5);
            const when = `${dateText} ${timeText}`;
            return {
              id: String(r.reminder_id),
              name: medicineName,
              date: dateText,
              time: timeText,
              when,
              dosage,
              description,
              doctor,
            };
          });
      } catch (e) {
        console.log('load upcoming reminders for future list failed:', e);
        futureItems = [];
      }

      setTodayMedicineReminders(todayItems);
      setFutureMedicineReminders(futureItems);

      // Home shows a compact version (today reminders first)
      setHomeMedicines(
        todayItems.slice(0, 6).map((m) => ({
          id: m.id,
          name: m.name,
          time: m.time,
          note: [m.dosage, m.description].filter(Boolean).join(' • '),
        }))
      );

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

  useEffect(() => {
    if (!pendingMedicineTake) return;
    if (!pendingMedicineTake.reminderId) return;
    setActiveTab('medicine');
    setTakeMedicineCard(pendingMedicineTake);
    onConsumePendingMedicineTake?.();
  }, [pendingMedicineTake, onConsumePendingMedicineTake]);

  useEffect(() => {
    if (activeTab !== 'medicine') return;
    if (!takeMedicineCard) return;
    medicineScrollRef.current?.scrollTo({ y: 0, animated: true });
  }, [activeTab, takeMedicineCard]);

  useEffect(() => {
    if (activeTab !== 'medicine') return;
    const t = setInterval(() => setMedicineClockTick((x) => x + 1), 30_000);
    return () => clearInterval(t);
  }, [activeTab]);

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

  const downloadReportAsTextAsync = async (report: MedicalReportRow) => {
    try {
      const rid = String(report.report_id ?? report.appointment_id ?? report.clinic_id ?? 'report');
      const created = String(report.created_at || '').slice(0, 10) || getLocalYyyyMmDd();
      const filename = `healhub_medical_report_${rid}_${created}.txt`;

      const baseDir = FileSystem.cacheDirectory || FileSystem.documentDirectory;
      if (!baseDir) {
        showReminderToast('error', 'Unable to download report.');
        return;
      }

      const uri = `${baseDir}${filename}`;

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

      // expo-sharing requires a native build. In Expo Go / older dev builds,
      // the native module may be missing, so we load it dynamically.
      let Sharing: any = null;
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        Sharing = require('expo-sharing');
      } catch {
        Sharing = null;
      }

      const canShare = Sharing && typeof Sharing.isAvailableAsync === 'function' ? await Sharing.isAvailableAsync() : false;
      if (canShare && typeof Sharing.shareAsync === 'function') {
        await Sharing.shareAsync(uri, {
          mimeType: 'text/plain',
          dialogTitle:
            language === 'sinhala'
              ? 'වෛද්‍ය වාර්තාව බාගත කරන්න'
              : language === 'tamil'
                ? 'மருத்துவ அறிக்கையை பதிவிறக்கு'
                : 'Download medical report',
        });
      } else {
        showReminderToast(
          'info',
          language === 'sinhala'
            ? 'Share කිරීම සඳහා dev build එකක් අවශ්‍යයි.'
            : language === 'tamil'
              ? 'Share செய்ய dev build தேவை.'
              : 'Sharing requires a development build.'
        );
      }

      showReminderToast(
        'success',
        language === 'sinhala' ? 'වාර්තාව සකස් කළා.' : language === 'tamil' ? 'அறிக்கை தயாராக உள்ளது.' : 'Report ready.'
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

      <Modal
        visible={!!medicineDetailsCard}
        transparent
        animationType="fade"
        presentationStyle="overFullScreen"
        statusBarTranslucent
        hardwareAccelerated
        onRequestClose={() => setMedicineDetailsCard(null)}
      >
        <View style={styles.modalWrap}>
          <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setMedicineDetailsCard(null)}>
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
                {language === 'sinhala'
                  ? 'ඖෂධ විස්තර'
                  : language === 'tamil'
                    ? 'மருந்து விவரங்கள்'
                    : 'Medicine details'}
              </Text>
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => setMedicineDetailsCard(null)}
                style={[styles.smallPill, { borderColor: colors.border }]}
              >
                <Text style={[styles.smallPillText, { color: colors.subtext }]}>
                  {language === 'sinhala' ? 'වසන්න' : language === 'tamil' ? 'மூடு' : 'Close'}
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={[styles.cardText, { color: colors.subtext, marginTop: 10 }]}>
              {[
                medicineDetailsCard?.name ? String(medicineDetailsCard.name) : '',
                medicineDetailsCard?.date && medicineDetailsCard?.time ? `${medicineDetailsCard.date} ${medicineDetailsCard.time}` : '',
              ]
                .filter(Boolean)
                .join(' • ')}
            </Text>

            {!!medicineDetailsCard?.dosage && (
              <Text style={[styles.cardText, { color: colors.subtext, marginTop: 6 }]}>
                {(language === 'sinhala' ? 'ඩෝස්: ' : language === 'tamil' ? 'அளவு: ' : 'Dosage: ') + String(medicineDetailsCard.dosage)}
              </Text>
            )}

            {!!medicineDetailsCard?.description && (
              <Text style={[styles.cardText, { color: colors.subtext, marginTop: 6 }]}>
                {(language === 'sinhala' ? 'විස්තර: ' : language === 'tamil' ? 'விளக்கம்: ' : 'Description: ') + String(medicineDetailsCard.description)}
              </Text>
            )}

            {!!medicineDetailsCard?.doctor && (
              <Text style={[styles.cardText, { color: colors.subtext, marginTop: 6 }]}>
                {(language === 'sinhala' ? 'එක් කළ වෛද්‍යවරයා: ' : language === 'tamil' ? 'சேர்த்த மருத்துவர்: ' : 'Added by: ') + String(medicineDetailsCard.doctor)}
              </Text>
            )}
          </View>
        </View>
      </Modal>

      <Modal
        visible={!!clinicDetailsCard}
        transparent
        animationType="fade"
        presentationStyle="overFullScreen"
        statusBarTranslucent
        hardwareAccelerated
        onRequestClose={() => setClinicDetailsCard(null)}
      >
        <View style={styles.modalWrap}>
          <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setClinicDetailsCard(null)}>
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
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => setClinicDetailsCard(null)}
                style={[styles.smallPill, { borderColor: colors.border }]}
              >
                <Text style={[styles.smallPillText, { color: colors.subtext }]}>
                  {language === 'sinhala' ? 'වසන්න' : language === 'tamil' ? 'மூடு' : 'Close'}
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={[styles.cardText, { color: colors.subtext, marginTop: 10 }]}>
              {clinicDetailsCard?.title ? String(clinicDetailsCard.title) : ''}
            </Text>

            <Text style={[styles.cardText, { color: colors.subtext, marginTop: 6 }]}>
              {[
                clinicDetailsCard?.date ? String(clinicDetailsCard.date) : '',
                clinicDetailsCard?.startTime ? String(clinicDetailsCard.startTime) : '',
                clinicDetailsCard?.endTime ? `- ${String(clinicDetailsCard.endTime)}` : '',
              ]
                .filter(Boolean)
                .join(' ')}
            </Text>

            <Text style={[styles.cardText, { color: colors.subtext, marginTop: 6 }]}>
              {(language === 'sinhala' ? 'තත්ත්වය: ' : language === 'tamil' ? 'நிலை: ' : 'Status: ') + String(clinicDetailsCard?.status || '')}
            </Text>

            {!!clinicDetailsCard?.notes && (
              <Text style={[styles.cardText, { color: colors.subtext, marginTop: 6 }]}>
                {(language === 'sinhala' ? 'සටහන්: ' : language === 'tamil' ? 'குறிப்பு: ' : 'Notes: ') + String(clinicDetailsCard.notes)}
              </Text>
            )}
          </View>
        </View>
      </Modal>

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
                  <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={() => {
                      const row = clinicById[String(c.id)];
                      const whenParts = String(c.when || '').split('•').map((s) => s.trim());
                      const dateText = row?.clinic_date ? String(row.clinic_date) : whenParts[0] || '';
                      const startText = row?.start_time
                        ? String(row.start_time).slice(0, 5)
                        : whenParts[1]
                          ? String(whenParts[1]).slice(0, 5)
                          : '';
                      const endText = row?.end_time ? String(row.end_time).slice(0, 5) : '';
                      const statusText = row?.status ? String(row.status) : 'Scheduled';
                      const notesText = row?.notes ? String(row.notes) : '';
                      setClinicDetailsCard({
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
                    <Text style={[styles.smallPillText, { color: colors.primary }]}>
                      {language === 'sinhala' ? 'විස්තර' : language === 'tamil' ? 'விவரம்' : 'Details'}
                    </Text>
                  </TouchableOpacity>
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
          <ScrollView ref={medicineScrollRef} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            {!!takeMedicineCard && (
              <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  {language === 'sinhala' ? 'ඖෂධ ගන්න' : language === 'tamil' ? 'மருந்தை எடுத்துக்கொள்' : 'Take medicine'}
                </Text>
                <Text style={[styles.cardText, { color: colors.subtext }]}>
                  {[
                    takeMedicineCard.medicineName ? String(takeMedicineCard.medicineName) : '',
                    takeMedicineCard.dosage ? String(takeMedicineCard.dosage) : '',
                    takeMedicineCard.reminderDate && takeMedicineCard.reminderTime
                      ? `${String(takeMedicineCard.reminderDate)} ${String(takeMedicineCard.reminderTime).slice(0, 5)}`
                      : takeMedicineCard.reminderTime
                        ? String(takeMedicineCard.reminderTime).slice(0, 5)
                        : '',
                  ]
                    .filter(Boolean)
                    .join(' • ') ||
                    (language === 'sinhala' ? 'ඖෂධ විස්තර ලබාගැනෙමින්...' : language === 'tamil' ? 'மருந்து விவரங்கள் ஏற்றப்படுகிறது...' : 'Loading medicine details...')}
                </Text>

                <TouchableOpacity
                  activeOpacity={0.85}
                  style={[styles.primaryAction, { backgroundColor: colors.primary }]}
                  onPress={() => {
                    void (async () => {
                      try {
                        const ok = await markReminderTakenAsync({
                          reminderId: Number(takeMedicineCard.reminderId),
                          alarmKey: takeMedicineCard.alarmKey ? String(takeMedicineCard.alarmKey) : undefined,
                        });
                        if (!ok) return;
                        setTakeMedicineCard(null);
                      } catch (e) {
                        console.log('mark-taken failed:', e);
                        showReminderToast('error', 'Failed to mark medicine taken');
                      }
                    })();
                  }}
                >
                  <Text style={styles.primaryActionText}>
                    {language === 'sinhala' ? 'ගත්තා' : language === 'tamil' ? 'எடுத்தேன்' : 'Taken'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                {language === 'sinhala' ? 'මඟහැරුණු ඖෂධ' : language === 'tamil' ? 'தவறிய மருந்துகள்' : 'Missed medicines'}
              </Text>

              {(() => {
                const _tick = medicineClockTick;
                const now = new Date(Date.now() + _tick * 0);
                const nowMinutes = now.getHours() * 60 + now.getMinutes();
                const graceMinutes = 2;
                const missed = todayMedicineReminders.filter((m) => {
                  const tp = parseTimeParts(m.time);
                  if (!tp) return false;
                  const mins = tp.hour * 60 + tp.minute;
                  return mins < nowMinutes - graceMinutes;
                });

                if (missed.length === 0) {
                  return (
                    <Text style={[styles.cardText, { color: colors.subtext, marginTop: 8 }]}>
                      {language === 'sinhala'
                        ? 'මඟහැරුණු ඖෂධ නැත.'
                        : language === 'tamil'
                          ? 'தவறிய மருந்துகள் இல்லை.'
                          : 'No missed medicines.'}
                    </Text>
                  );
                }

                return (
                  <>
                    {missed.map((m) => {
                      const alarmKey = computeMedicineAlarmKey({ reminderId: m.id, date: m.date, time: m.time });
                      return (
                        <View key={m.id} style={[styles.itemRow, { borderTopColor: colors.border }]}>
                          <TouchableOpacity
                            activeOpacity={0.8}
                            style={{ flex: 1 }}
                            onPress={() => {
                              setMedicineDetailsCard({
                                name: m.name,
                                date: m.date,
                                time: m.time,
                                dosage: m.dosage,
                                description: m.description,
                                doctor: m.doctor,
                              });
                            }}
                          >
                            <Text style={[styles.itemTitle, { color: colors.text }]}>{m.name}</Text>
                            <Text style={[styles.itemSub, { color: colors.subtext }]}>
                              {[m.dosage, m.description].filter(Boolean).join(' • ')}
                            </Text>
                          </TouchableOpacity>
                          <Text style={[styles.itemRight, { color: colors.danger }]}>{m.time}</Text>
                          <TouchableOpacity
                            activeOpacity={0.85}
                            onPress={() => void markReminderTakenAsync({ reminderId: Number(m.id), alarmKey })}
                            style={[styles.smallPill, { borderColor: colors.primary }]}
                          >
                            <Text style={[styles.smallPillText, { color: colors.primary }]}>
                              {language === 'sinhala' ? 'ගත්තා' : language === 'tamil' ? 'எடுத்தேன்' : 'Taken'}
                            </Text>
                          </TouchableOpacity>
                        </View>
                      );
                    })}
                  </>
                );
              })()}
            </View>

            <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                {language === 'sinhala' ? 'අද ඖෂධ (ඉදිරියට)' : language === 'tamil' ? 'இன்றைய மருந்துகள் (வரவிருக்கும்)' : 'Today medicines (upcoming)'}
              </Text>

              {(() => {
                const _tick = medicineClockTick;
                const now = new Date(Date.now() + _tick * 0);
                const nowMinutes = now.getHours() * 60 + now.getMinutes();
                const graceMinutes = 2;
                const upcoming = todayMedicineReminders
                  .filter((m) => {
                    const tp = parseTimeParts(m.time);
                    if (!tp) return true;
                    const mins = tp.hour * 60 + tp.minute;
                    return mins >= nowMinutes - graceMinutes;
                  })
                  .sort((a, b) => String(a.time).localeCompare(String(b.time)));

                if (upcoming.length === 0) {
                  return (
                    <Text style={[styles.cardText, { color: colors.subtext, marginTop: 8 }]}>
                      {language === 'sinhala'
                        ? 'අද සඳහා ඉදිරි ඖෂධ නැත.'
                        : language === 'tamil'
                          ? 'இன்றைக்கு வரவிருக்கும் மருந்துகள் இல்லை.'
                          : 'No upcoming medicines for today.'}
                    </Text>
                  );
                }

                return (
                  <>
                    {upcoming.map((m) => {
                      return (
                        <TouchableOpacity
                          key={m.id}
                          activeOpacity={0.8}
                          onPress={() => {
                            setMedicineDetailsCard({
                              name: m.name,
                              date: m.date,
                              time: m.time,
                              dosage: m.dosage,
                              description: m.description,
                              doctor: m.doctor,
                            });
                          }}
                          style={[styles.itemRow, { borderTopColor: colors.border }]}
                        >
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.itemTitle, { color: colors.text }]}>{m.name}</Text>
                            <Text style={[styles.itemSub, { color: colors.subtext }]}>
                              {[m.dosage, m.description].filter(Boolean).join(' • ')}
                            </Text>
                          </View>
                          <Text style={[styles.itemRight, { color: colors.primary }]}>{m.time}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </>
                );
              })()}
            </View>

            <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                {language === 'sinhala' ? 'ඉදිරි ඖෂධ' : language === 'tamil' ? 'வரவிருக்கும் மருந்துகள்' : 'Future medicines'}
              </Text>

              {futureMedicineReminders.map((m) => (
                <TouchableOpacity
                  key={m.id}
                  activeOpacity={0.8}
                  onPress={() => {
                    setMedicineDetailsCard({
                      name: m.name,
                      date: m.date,
                      time: m.time,
                      dosage: m.dosage,
                      description: m.description,
                      doctor: m.doctor,
                    });
                  }}
                  style={[styles.itemRow, { borderTopColor: colors.border }]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.itemTitle, { color: colors.text }]}>{m.name}</Text>
                    <Text style={[styles.itemSub, { color: colors.subtext }]}>
                      {[m.dosage, m.description].filter(Boolean).join(' • ')}
                    </Text>
                  </View>
                  <Text style={[styles.itemRight, { color: colors.primary }]}>{m.when}</Text>
                </TouchableOpacity>
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
                        setClinicDetailsCard({
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
                      <Text style={[styles.smallPillText, { color: colors.primary }]}>
                        {language === 'sinhala' ? 'විස්තර' : language === 'tamil' ? 'விவரம்' : 'Details'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                );
              })}

              {clinicList.length === 0 && (
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
  modalWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
  },
  modalCard: {
    width: '100%',
    maxWidth: 520,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    shadowOpacity: 0.35,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 10 },
    elevation: 14,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
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
