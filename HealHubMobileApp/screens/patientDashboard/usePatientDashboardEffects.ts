import { useEffect, type Dispatch, type MutableRefObject, type SetStateAction } from 'react';
import type { ScrollView } from 'react-native';
import { apiGet } from '../../utils/api';
import { connectRealtime, type InvalidatePayload } from '../../utils/realtime';
import type { PatientTabKey } from '../../components/patient/tabs';
import type { PatientUser } from '../../components/patient/profile/ProfileViewCard';
import type {
  AppointmentRow,
  ClinicRow,
  DoctorRow,
  MedicalReportRow,
  MedicationRow,
  MedicineReminderRow,
  PatientNotification,
} from './types';

type PendingMedicineTake =
  | null
  | {
      reminderId: number;
      medicineName?: string;
      dosage?: string;
      reminderDate?: string;
      reminderTime?: string;
      alarmKey?: string;
    };

type ToastVariant = 'success' | 'error' | 'info';

export function usePatientDashboardEffects(input: {
  accessToken?: string;
  language: string;

  activeTab: PatientTabKey;
  setActiveTab: (tab: PatientTabKey) => void;

  pendingMedicineTake?: PendingMedicineTake;
  onConsumePendingMedicineTake?: () => void;
  pendingTab?: PatientTabKey | null;
  onConsumePendingTab?: () => void;

  reminderToastTimer: MutableRefObject<NodeJS.Timeout | null>;
  showReminderToast: (variant: ToastVariant, message: string) => void;

  medicineScrollRef: MutableRefObject<ScrollView | null>;
  takeMedicineCard: PendingMedicineTake;
  setTakeMedicineCard: (v: PendingMedicineTake) => void;

  user: PatientUser;
  setUser: (next: PatientUser) => void;
  profileLoadError: string;
  setProfileLoadError: (v: string) => void;

  realtimeAmbulanceTick: number;
  setRealtimeAmbulanceTick: Dispatch<SetStateAction<number>>;
  realtimeHomeTick: number;
  setRealtimeHomeTick: Dispatch<SetStateAction<number>>;

  doctorById: Record<number, DoctorRow>;
  setDoctorById: (map: Record<number, DoctorRow>) => void;
  setDoctors: (rows: DoctorRow[]) => void;
  setDoctorLoadError: (v: string) => void;
  doctorQuerySpecialty: string;
  doctorQueryName: string;

  setAmbulanceStatus: (n: PatientNotification | null) => void;
  setNotificationCount: (n: number) => void;

  setHomeLoadError: (v: string) => void;
  setHomeLoading: (v: boolean) => void;
  homeLoading: boolean;
  homeRefreshing: boolean;
  setHomeRefreshing: (v: boolean) => void;

  setClinicById: (m: Record<string, ClinicRow>) => void;
  setClinicList: (rows: ClinicRow[]) => void;
  setHomeClinics: (items: Array<{ id: string; title: string; when: string; where: string }>) => void;
  setHomeRecentAppointments: (items: Array<{ id: string; doctor: string; date: string; time: string; status: string }>) => void;

  setPatientReports: (items: Array<{ id: string; title: string; sub: string; report: MedicalReportRow }>) => void;
  setHomeReports: (items: Array<{ id: string; title: string; sub: string; report: MedicalReportRow }>) => void;

  getLocalYyyyMmDd: () => string;
  setTodayMedicineReminders: (items: Array<{ id: string; name: string; date: string; time: string; dosage: string; description: string; doctor: string }>) => void;
  setFutureMedicineReminders: (
    items: Array<{ id: string; name: string; date: string; time: string; when: string; dosage: string; description: string; doctor: string }>,
  ) => void;
  setHomeMedicines: (items: Array<{ id: string; name: string; time: string; note: string }>) => void;

  reconcilePatientAlarmScheduleAsync: (input: { clinics: ClinicRow[]; upcomingReminders: any[]; doctorMap: Record<number, DoctorRow> }) => Promise<void>;

  setAppointments: (rows: AppointmentRow[]) => void;

  setMedicineClockTick: Dispatch<SetStateAction<number>>;
}) {
  const {
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
  } = input;

  useEffect(() => {
    return () => {
      if (reminderToastTimer.current) clearTimeout(reminderToastTimer.current);
    };
  }, [reminderToastTimer]);

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

      const preferred =
        list.find((n) => String(n.title || '').toLowerCase().includes('accepted')) ||
        list.find((n) => String(n.title || '').toLowerCase().includes('rejected')) ||
        list[0];

      setAmbulanceStatus(preferred);
    }

    loadAmbulanceStatus();
    const interval = setInterval(loadAmbulanceStatus, 7000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [accessToken, realtimeAmbulanceTick, setAmbulanceStatus]);

  useEffect(() => {
    // Real data for home sections + notifications count.
    let cancelled = false;

    async function loadHomeData() {
      if (!accessToken) return;
      setHomeLoadError('');
      setHomeLoading(true);

      let docMap: Record<number, DoctorRow> = doctorById;

      let clinicsForSchedule: ClinicRow[] = [];

      try {
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

          const clinicItems = scheduledClinics.slice(0, 6).map((c) => {
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

          const apptItems = appts.slice(0, 6).map((a) => {
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
        } else if (!cancelled) {
          setHomeLoadError(
            language === 'sinhala'
              ? 'මුල් පිටු දත්ත ලබාගැනීමට අසමත් විය.'
              : language === 'tamil'
                ? 'முகப்பு தரவை ஏற்ற முடியவில்லை.'
                : 'Failed to load home data.',
          );
        }
      } catch {
        if (!cancelled) {
          setHomeLoadError(
            language === 'sinhala'
              ? 'මුල් පිටු දත්ත ලබාගැනීමට අසමත් විය.'
              : language === 'tamil'
                ? 'முகப்பு தரவை ஏற்ற முடியவில்லை.'
                : 'Failed to load home data.',
          );
        }
      }

      // Medical reports
      const reportsRes = await apiGet<any>('/api/patient/medical-reports', accessToken);
      if (!cancelled && reportsRes.ok) {
        const rows: MedicalReportRow[] = Array.isArray(reportsRes.data?.data) ? reportsRes.data.data : [];
        const items = rows.map((r, idx) => {
          const created = String(r.created_at || '').slice(0, 10) || '';
          const doctor = r.doctor_name ? `Dr. ${r.doctor_name}` : '';
          const title =
            String(r.diagnosis || '').trim() ||
            (language === 'sinhala' ? 'වාර්තාව' : language === 'tamil' ? 'அறிக்கை' : 'Report');
          const sub = [doctor, created].filter(Boolean).join(' • ');
          const id = String(r.report_id ?? `${created}-${idx}`);
          return { id, title, sub, report: r };
        });
        setPatientReports(items);
        setHomeReports(items.slice(0, 6));
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
      let futureItems: Array<{
        id: string;
        name: string;
        date: string;
        time: string;
        when: string;
        dosage: string;
        description: string;
        doctor: string;
      }> = [];
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
        })),
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

      if (!cancelled) setHomeLoading(false);
    }

    loadHomeData();
    return () => {
      cancelled = true;
      setHomeLoading(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, realtimeHomeTick]);

  useEffect(() => {
    if (!homeLoading && homeRefreshing) setHomeRefreshing(false);
  }, [homeLoading, homeRefreshing, setHomeRefreshing]);

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

      if (
        topics.some((t) => String(t).startsWith('patient:dashboard')) ||
        topics.some((t) => String(t).startsWith('patient:medications')) ||
        topics.some((t) => String(t).startsWith('patient:clinics')) ||
        topics.some((t) => String(t).startsWith('patient:reports'))
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
  }, [accessToken, setRealtimeAmbulanceTick, setRealtimeHomeTick]);

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
  }, [activeTab, accessToken, realtimeHomeTick, setAppointments]);

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
  }, [doctorQuerySpecialty, doctorQueryName, setDoctors, setDoctorLoadError]);

  useEffect(() => {
    if (!profileLoadError) return;
    showReminderToast('error', profileLoadError);
  }, [profileLoadError, showReminderToast]);

  useEffect(() => {
    if (!pendingMedicineTake) return;
    if (!pendingMedicineTake.reminderId) return;
    setActiveTab('medicine');
    setTakeMedicineCard(pendingMedicineTake);
    onConsumePendingMedicineTake?.();
  }, [pendingMedicineTake, onConsumePendingMedicineTake, setActiveTab, setTakeMedicineCard]);

  useEffect(() => {
    if (!pendingTab) return;
    setActiveTab(pendingTab);
    onConsumePendingTab?.();
  }, [pendingTab, onConsumePendingTab, setActiveTab]);

  useEffect(() => {
    if (activeTab !== 'medicine') return;
    if (!takeMedicineCard) return;
    medicineScrollRef.current?.scrollTo({ y: 0, animated: true });
  }, [activeTab, takeMedicineCard, medicineScrollRef]);

  useEffect(() => {
    if (activeTab !== 'medicine') return;
    const t = setInterval(() => setMedicineClockTick((x) => x + 1), 30_000);
    return () => clearInterval(t);
  }, [activeTab, setMedicineClockTick]);
}
