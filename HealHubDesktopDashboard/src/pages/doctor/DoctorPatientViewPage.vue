<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { api, ApiError } from '../../lib/api'
import { useAuthStore } from '../../stores/auth'
import { useToastStore } from '../../stores/toast'

type Patient = {
  patient_id: number
  full_name: string
  dob: string
  gender: string | null
  phone: string
  address?: string | null
  blood_group?: string | null
  emergency_contact?: string | null
  has_chronic_condition?: boolean | null
  condition_notes?: string | null
}

type ClinicRow = {
  clinic_id: number
  clinic_date: string
  start_time: string
  end_time: string | null
  status: string
  notes: string | null
  doctor_id: number
}

type MedicationRow = {
  medication_id: number
  medicine_name: string
  dosage: string
  frequency: string
  times_per_day: number
  specific_times: unknown
  start_date: string
  end_date: string | null
  next_clinic_date: string
  is_active: boolean
  notes: string | null
  prescribed_at: string
  doctor_id: number
  doctors?: { full_name?: string | null; specialization?: string | null } | null
}

type ReminderRow = {
  reminder_id: number
  medication_id: number
  reminder_date: string
  reminder_time: string
  status: string
  taken_at?: string | null
}

type ReportRow = {
  report_id: number
  appointment_id: number | null
  clinic_id: number | null
  diagnosis: string
  prescription: string
  notes: string | null
  created_at: string
  created_by_doctor_id: number
  doctors?: { full_name?: string | null; specialization?: string | null } | null
}

type PrescriptionRecordRow = {
  prescription_id: number
  appointment_id: number | null
  clinic_id: number | null
  prescription_text: string
  created_at: string
  prescribed_by_doctor_id: number
  doctors?: { full_name?: string | null; specialization?: string | null } | null
}

type HistoryRow = {
  history_id: number
  encounter_type: string
  encounter_date: string
  encounter_time: string | null
  notes: string | null
  doctors?: { full_name?: string | null; specialization?: string | null } | null
}

type AppointmentRow = {
  appointment_id: number
  appointment_date: string
  appointment_time: string
  status: string
  patient_id: number
}

type TabKey = 'overview' | 'clinics' | 'medications' | 'reports' | 'history'

const auth = useAuthStore()
const toast = useToastStore()
const route = useRoute()
const router = useRouter()

const patientId = computed(() => Number(route.params.patientId))

const tab = ref<TabKey>('overview')

watch(
  () => route.query.tab,
  (t) => {
    const key = typeof t === 'string' ? t : ''
    if (key === 'overview' || key === 'clinics' || key === 'medications' || key === 'reports' || key === 'history') {
      tab.value = key
    }
  },
  { immediate: true },
)

function setTab(next: TabKey) {
  tab.value = next
  router.replace({ query: { ...route.query, tab: next } })
}

const isLoadingOverview = ref(false)
const overviewError = ref<string | null>(null)
const patient = ref<Patient | null>(null)
const upcomingClinics = ref<ClinicRow[]>([])

const bloodGroupDraft = ref('')
const isSavingBloodGroup = ref(false)

const canSaveBloodGroup = computed(() => {
  if (!patient.value) return false
  const current = (patient.value.blood_group || '').trim().toUpperCase()
  const next = (bloodGroupDraft.value || '').trim().toUpperCase()
  return current !== next && !isSavingBloodGroup.value
})

async function loadOverview() {
  isLoadingOverview.value = true
  overviewError.value = null
  try {
    const res = await api.get<{ success: boolean; data: { patient: Patient; upcoming_clinics: ClinicRow[] } }>(
      `/api/doctor/patients/${patientId.value}/overview`,
      { token: auth.accessToken },
    )
    patient.value = res.data.patient
    bloodGroupDraft.value = (res.data.patient?.blood_group || '').toString()
    upcomingClinics.value = res.data.upcoming_clinics || []
  } catch (e) {
    overviewError.value = e instanceof ApiError ? e.message : 'Failed to load patient'
  } finally {
    isLoadingOverview.value = false
  }
}

async function saveBloodGroup() {
  if (!patient.value) return
  isSavingBloodGroup.value = true
  try {
    const payload = { blood_group: bloodGroupDraft.value.trim() || null }
    const res = await api.put<{ success: boolean; message?: string; data?: Partial<Patient> | null }>(
      `/api/doctor/patients/${patientId.value}/blood-group`,
      payload,
      { token: auth.accessToken },
    )

    patient.value = {
      ...patient.value,
      ...(res.data || {}),
      blood_group: payload.blood_group || null,
    }
    bloodGroupDraft.value = (patient.value.blood_group || '').toString()
    toast.show('Blood group updated', 'success')
  } catch (e) {
    toast.show(e instanceof ApiError ? e.message : 'Failed to update blood group', 'error')
  } finally {
    isSavingBloodGroup.value = false
  }
}

// Clinics tab
const clinics = ref<ClinicRow[]>([])
const clinicsCount = ref(0)
const clinicsPage = ref(1)
const clinicsPageSize = ref(25)
const clinicsFrom = ref('')
const clinicsTo = ref('')
const selectedClinicDate = ref<string | null>(null)
const isLoadingClinics = ref(false)
const clinicsError = ref<string | null>(null)

const clinicDates = computed(() => {
  const set = new Set<string>()
  for (const c of clinics.value) set.add(c.clinic_date)
  return Array.from(set).sort().reverse()
})

const clinicsFiltered = computed(() => {
  if (!selectedClinicDate.value) return clinics.value
  return clinics.value.filter((c) => c.clinic_date === selectedClinicDate.value)
})

async function loadClinics() {
  isLoadingClinics.value = true
  clinicsError.value = null
  try {
    const res = await api.get<{ success: boolean; data: ClinicRow[]; count: number }>(
      `/api/doctor/patients/${patientId.value}/clinic-participation`,
      {
        token: auth.accessToken,
        query: {
          page: clinicsPage.value,
          page_size: clinicsPageSize.value,
          from: clinicsFrom.value || undefined,
          to: clinicsTo.value || undefined,
        },
      },
    )
    clinics.value = res.data || []
    clinicsCount.value = res.count || 0
    if (selectedClinicDate.value && !clinicDates.value.includes(selectedClinicDate.value)) {
      selectedClinicDate.value = null
    }
  } catch (e) {
    clinicsError.value = e instanceof ApiError ? e.message : 'Failed to load clinics'
  } finally {
    isLoadingClinics.value = false
  }
}

const createClinic = ref({
  clinic_date: '',
  start_time: '09:00',
  end_time: '',
  status: 'Scheduled',
  notes: '',
})

async function submitClinic() {
  if (!createClinic.value.clinic_date || !createClinic.value.start_time) {
    toast.show('Clinic date and start time are required', 'error')
    return
  }
  try {
    await api.post(
      `/api/doctor/patients/${patientId.value}/clinic-participation`,
      {
        clinic_date: createClinic.value.clinic_date,
        start_time: createClinic.value.start_time,
        end_time: createClinic.value.end_time || null,
        status: createClinic.value.status,
        notes: createClinic.value.notes || null,
      },
      { token: auth.accessToken },
    )
    toast.show('Clinic participation added', 'success')
    createClinic.value = { clinic_date: '', start_time: '09:00', end_time: '', status: 'Scheduled', notes: '' }
    await loadOverview()
    await loadClinics()
  } catch (e) {
    toast.show(e instanceof ApiError ? e.message : 'Failed to add clinic participation', 'error')
  }
}

// Medications tab
const meds = ref<MedicationRow[]>([])
const medsCount = ref(0)
const medsPage = ref(1)
const medsPageSize = ref(25)
const isLoadingMeds = ref(false)
const medsError = ref<string | null>(null)

async function loadMeds() {
  isLoadingMeds.value = true
  medsError.value = null
  try {
    const res = await api.get<{ success: boolean; data: MedicationRow[]; count: number }>(
      `/api/doctor/patients/${patientId.value}/medications`,
      { token: auth.accessToken, query: { page: medsPage.value, page_size: medsPageSize.value } },
    )
    meds.value = res.data || []
    medsCount.value = res.count || 0
  } catch (e) {
    medsError.value = e instanceof ApiError ? e.message : 'Failed to load medications'
  } finally {
    isLoadingMeds.value = false
  }
}

const reminders = ref<ReminderRow[]>([])
const remindersCount = ref(0)
const remindersFrom = ref('')
const remindersTo = ref('')
const remindersStatus = ref('')
const remindersPage = ref(1)
const remindersPageSize = ref(25)
const isLoadingReminders = ref(false)
const remindersError = ref<string | null>(null)

async function loadReminders() {
  isLoadingReminders.value = true
  remindersError.value = null
  try {
    const res = await api.get<{ success: boolean; data: ReminderRow[]; count: number }>(
      `/api/doctor/patients/${patientId.value}/medicine-reminders`,
      {
        token: auth.accessToken,
        query: {
          page: remindersPage.value,
          page_size: remindersPageSize.value,
          from: remindersFrom.value || undefined,
          to: remindersTo.value || undefined,
          status: remindersStatus.value || undefined,
        },
      },
    )
    reminders.value = res.data || []
    remindersCount.value = res.count || 0
  } catch (e) {
    remindersError.value = e instanceof ApiError ? e.message : 'Failed to load reminders'
  } finally {
    isLoadingReminders.value = false
  }
}

const createMed = ref({
  medicine_name: '',
  dosage: '',
  frequency: 'Daily',
  times_per_day: 1,
  specific_times_json: '[]',
  start_date: '',
  end_date: '',
  next_clinic_date: '',
  clinic_time: '09:00',
  notes: '',
})

async function submitMed() {
  if (!createMed.value.medicine_name || !createMed.value.dosage || !createMed.value.start_date) {
    toast.show('Medicine name, dosage, and start date are required', 'error')
    return
  }
  try {
    await api.post(
      `/api/doctor/patients/${patientId.value}/medications`,
      {
        medicine_name: createMed.value.medicine_name,
        dosage: createMed.value.dosage,
        frequency: createMed.value.frequency,
        times_per_day: Number(createMed.value.times_per_day) || 1,
        specific_times: createMed.value.specific_times_json,
        start_date: createMed.value.start_date,
        end_date: createMed.value.end_date || null,
        next_clinic_date: createMed.value.next_clinic_date || null,
        clinic_time: createMed.value.clinic_time || '09:00',
        notes: createMed.value.notes || null,
      },
      { token: auth.accessToken },
    )
    toast.show('Medication added', 'success')
    createMed.value = {
      medicine_name: '',
      dosage: '',
      frequency: 'Daily',
      times_per_day: 1,
      specific_times_json: '[]',
      start_date: '',
      end_date: '',
      next_clinic_date: '',
      clinic_time: '09:00',
      notes: '',
    }
    await loadOverview()
    await loadMeds()
    await loadReminders()
  } catch (e) {
    toast.show(e instanceof ApiError ? e.message : 'Failed to add medication', 'error')
  }
}

// Reports tab
const reports = ref<ReportRow[]>([])
const reportsCount = ref(0)
const reportsPage = ref(1)
const reportsPageSize = ref(25)
const isLoadingReports = ref(false)
const reportsError = ref<string | null>(null)

const prescriptionRecords = ref<PrescriptionRecordRow[]>([])
const prescriptionRecordsCount = ref(0)
const prescriptionRecordsPage = ref(1)
const prescriptionRecordsPageSize = ref(25)
const isLoadingPrescriptionRecords = ref(false)
const prescriptionRecordsError = ref<string | null>(null)

async function loadReports() {
  isLoadingReports.value = true
  reportsError.value = null
  try {
    const res = await api.get<{ success: boolean; data: ReportRow[]; count: number }>(
      `/api/doctor/patients/${patientId.value}/reports`,
      { token: auth.accessToken, query: { page: reportsPage.value, page_size: reportsPageSize.value } },
    )
    reports.value = res.data || []
    reportsCount.value = res.count || 0
  } catch (e) {
    reportsError.value = e instanceof ApiError ? e.message : 'Failed to load reports'
  } finally {
    isLoadingReports.value = false
  }
}

async function loadPrescriptionRecords() {
  isLoadingPrescriptionRecords.value = true
  prescriptionRecordsError.value = null
  try {
    const res = await api.get<{ success: boolean; data: PrescriptionRecordRow[]; count: number }>(
      `/api/doctor/patients/${patientId.value}/prescription-records`,
      {
        token: auth.accessToken,
        query: { page: prescriptionRecordsPage.value, page_size: prescriptionRecordsPageSize.value },
      },
    )
    prescriptionRecords.value = res.data || []
    prescriptionRecordsCount.value = res.count || 0
  } catch (e) {
    prescriptionRecordsError.value = e instanceof ApiError ? e.message : 'Failed to load prescription records'
  } finally {
    isLoadingPrescriptionRecords.value = false
  }
}

const createReport = ref({
  link_type: 'appointment' as 'appointment' | 'clinic',
  appointment_id: '' as string,
  clinic_id: '' as string,
  diagnosis: '',
  prescription: '',
  notes: '',
})

const reportAppointments = ref<AppointmentRow[]>([])
const reportClinics = ref<ClinicRow[]>([])
const isLoadingReportLinks = ref(false)
const reportLinksError = ref<string | null>(null)

async function loadReportLinks() {
  isLoadingReportLinks.value = true
  reportLinksError.value = null
  try {
    const [appts, cls] = await Promise.all([
      api.get<{ success: boolean; data: AppointmentRow[] }>(`/api/doctor/appointments`, {
        token: auth.accessToken,
        query: { patient_id: patientId.value },
      }),
      api.get<{ success: boolean; data: ClinicRow[] }>(`/api/doctor/patients/${patientId.value}/clinic-participation`, {
        token: auth.accessToken,
        query: { doctor_only: 1, page: 1, page_size: 50 },
      }),
    ])

    reportAppointments.value = (appts.data || []).filter((a) => a.patient_id === patientId.value)
    reportClinics.value = cls.data || []
  } catch (e) {
    reportLinksError.value = e instanceof ApiError ? e.message : 'Failed to load appointment/clinic links'
  } finally {
    isLoadingReportLinks.value = false
  }
}

async function submitReport() {
  const hasAppointment = createReport.value.link_type === 'appointment' && Boolean(createReport.value.appointment_id)
  const hasClinic = createReport.value.link_type === 'clinic' && Boolean(createReport.value.clinic_id)
  if (!createReport.value.diagnosis || !createReport.value.prescription || (!hasAppointment && !hasClinic)) {
    toast.show('Diagnosis, prescription, and a link target are required', 'error')
    return
  }
  try {
    const body: any = {
      diagnosis: createReport.value.diagnosis,
      prescription: createReport.value.prescription,
      notes: createReport.value.notes || null,
    }
    if (createReport.value.link_type === 'appointment') body.appointment_id = Number(createReport.value.appointment_id)
    else body.clinic_id = Number(createReport.value.clinic_id)

    await api.post(`/api/doctor/patients/${patientId.value}/reports`, body, { token: auth.accessToken })
    toast.show('Report created', 'success')
    createReport.value = { link_type: 'appointment', appointment_id: '', clinic_id: '', diagnosis: '', prescription: '', notes: '' }
    await loadReports()
  } catch (e) {
    toast.show(e instanceof ApiError ? e.message : 'Failed to create report', 'error')
  }
}

// Doctor history tab
const history = ref<HistoryRow[]>([])
const historyCount = ref(0)
const historyPage = ref(1)
const historyPageSize = ref(25)
const isLoadingHistory = ref(false)
const historyError = ref<string | null>(null)

async function loadHistory() {
  isLoadingHistory.value = true
  historyError.value = null
  try {
    const res = await api.get<{ success: boolean; data: HistoryRow[]; count: number }>(
      `/api/doctor/patients/${patientId.value}/doctor-history`,
      { token: auth.accessToken, query: { page: historyPage.value, page_size: historyPageSize.value } },
    )
    history.value = res.data || []
    historyCount.value = res.count || 0
  } catch (e) {
    historyError.value = e instanceof ApiError ? e.message : 'Failed to load doctor history'
  } finally {
    isLoadingHistory.value = false
  }
}

watch(tab, (t) => {
  if (t === 'clinics') loadClinics()
  if (t === 'medications') {
    loadMeds()
    loadReminders()
  }
  if (t === 'reports') {
    loadReports()
    loadPrescriptionRecords()
    loadReportLinks()
  }
  if (t === 'history') loadHistory()
})

onMounted(async () => {
  if (!Number.isFinite(patientId.value) || patientId.value <= 0) {
    toast.show('Invalid patient ID', 'error')
    router.replace('/doctor/patients')
    return
  }
  await loadOverview()
})
</script>

<template>
  <div>
    <div class="flex items-start justify-between gap-4">
      <div>
        <div class="text-xl font-semibold">Patient</div>
        <div class="mt-1 text-sm text-gray-500 dark:text-gray-400">Manage patient care records</div>
      </div>
      <router-link class="rounded border border-gray-300 px-3 py-1.5 text-sm dark:border-gray-700" to="/doctor/patients">Back</router-link>
    </div>

    <div class="mt-4 rounded border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
      <div v-if="overviewError" class="text-sm text-red-700 dark:text-red-200">{{ overviewError }}</div>
      <div v-else-if="isLoadingOverview" class="text-sm text-gray-600 dark:text-gray-300">Loading…</div>
      <div v-else-if="patient">
        <div class="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div class="text-lg font-semibold">{{ patient.full_name }}</div>
            <div class="mt-1 text-sm text-gray-600 dark:text-gray-300">{{ patient.gender || '—' }} • DOB {{ patient.dob }} • {{ patient.phone }}</div>
          </div>
          <div class="text-sm">
            <span
              v-if="patient.has_chronic_condition"
              class="inline-flex items-center rounded border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-200"
            >
              Chronic condition
            </span>
          </div>
        </div>

        <div class="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
          <div class="rounded border border-gray-200 p-3 text-sm dark:border-gray-800">
            <div class="text-xs text-gray-500 dark:text-gray-400">Blood group</div>
            <div class="mt-2 flex items-center gap-2">
              <select
                v-model="bloodGroupDraft"
                class="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-950"
                :disabled="isSavingBloodGroup"
              >
                <option value="">—</option>
                <option value="A+">A+</option>
                <option value="A-">A-</option>
                <option value="B+">B+</option>
                <option value="B-">B-</option>
                <option value="AB+">AB+</option>
                <option value="AB-">AB-</option>
                <option value="O+">O+</option>
                <option value="O-">O-</option>
              </select>
              <button
                class="shrink-0 rounded bg-gray-900 px-3 py-2 text-sm text-white disabled:opacity-60"
                :disabled="!canSaveBloodGroup"
                @click="saveBloodGroup"
              >
                {{ isSavingBloodGroup ? 'Saving…' : 'Save' }}
              </button>
            </div>
          </div>
          <div class="rounded border border-gray-200 p-3 text-sm dark:border-gray-800">
            <div class="text-xs text-gray-500 dark:text-gray-400">Emergency contact</div>
            <div class="mt-1 font-medium">{{ patient.emergency_contact || '—' }}</div>
          </div>
          <div class="rounded border border-gray-200 p-3 text-sm dark:border-gray-800">
            <div class="text-xs text-gray-500 dark:text-gray-400">Address</div>
            <div class="mt-1 font-medium">{{ patient.address || '—' }}</div>
          </div>
        </div>

        <div class="mt-4">
          <div class="text-sm font-medium">Upcoming clinics</div>
          <div v-if="upcomingClinics.length === 0" class="mt-1 text-sm text-gray-600 dark:text-gray-300">None scheduled.</div>
          <div v-else class="mt-2 overflow-auto">
            <table class="min-w-full text-left text-sm">
              <thead class="bg-gray-50 text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-200">
                <tr>
                  <th class="px-3 py-2">Date</th>
                  <th class="px-3 py-2">Start</th>
                  <th class="px-3 py-2">End</th>
                  <th class="px-3 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="c in upcomingClinics" :key="c.clinic_id" class="border-t border-gray-100 dark:border-gray-800">
                  <td class="px-3 py-2">{{ c.clinic_date }}</td>
                  <td class="px-3 py-2">{{ c.start_time }}</td>
                  <td class="px-3 py-2">{{ c.end_time || '—' }}</td>
                  <td class="px-3 py-2">{{ c.status }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    <div class="mt-4 flex flex-wrap gap-2">
      <button class="rounded border border-gray-300 px-3 py-1.5 text-sm dark:border-gray-700" :class="tab==='overview' ? 'bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900' : ''" @click="setTab('overview')">Overview</button>
      <button class="rounded border border-gray-300 px-3 py-1.5 text-sm dark:border-gray-700" :class="tab==='clinics' ? 'bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900' : ''" @click="setTab('clinics')">Clinic participation</button>
      <button class="rounded border border-gray-300 px-3 py-1.5 text-sm dark:border-gray-700" :class="tab==='medications' ? 'bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900' : ''" @click="setTab('medications')">Medications</button>
      <button class="rounded border border-gray-300 px-3 py-1.5 text-sm dark:border-gray-700" :class="tab==='reports' ? 'bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900' : ''" @click="setTab('reports')">Medical reports</button>
      <button class="rounded border border-gray-300 px-3 py-1.5 text-sm dark:border-gray-700" :class="tab==='history' ? 'bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900' : ''" @click="setTab('history')">Doctor history</button>
    </div>

    <!-- Clinics -->
    <div v-if="tab==='clinics'" class="mt-4 rounded border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
      <div class="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div class="text-lg font-semibold">Clinic participation</div>
          <div class="text-sm text-gray-500 dark:text-gray-400">Click a date to filter records for that day</div>
        </div>
        <button class="rounded border border-gray-300 px-3 py-1.5 text-sm dark:border-gray-700" @click="loadClinics" :disabled="isLoadingClinics">Refresh</button>
      </div>

      <div class="mt-4 grid grid-cols-1 gap-3 md:grid-cols-4">
        <div>
          <label class="block text-sm font-medium">From</label>
          <input v-model="clinicsFrom" type="date" class="mt-1 w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-950" />
        </div>
        <div>
          <label class="block text-sm font-medium">To</label>
          <input v-model="clinicsTo" type="date" class="mt-1 w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-950" />
        </div>
        <div>
          <label class="block text-sm font-medium">Page size</label>
          <select v-model.number="clinicsPageSize" class="mt-1 w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-950" @change="clinicsPage=1; loadClinics()">
            <option :value="10">10</option>
            <option :value="25">25</option>
            <option :value="50">50</option>
          </select>
        </div>
        <div class="flex items-end">
          <button class="w-full rounded bg-gray-900 px-3 py-2 text-sm text-white" @click="clinicsPage=1; loadClinics()">Apply</button>
        </div>
      </div>

      <div class="mt-3 flex flex-wrap gap-2">
        <button
          class="rounded border border-gray-300 px-2 py-1 text-xs dark:border-gray-700"
          :class="selectedClinicDate===null ? 'bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900' : ''"
          @click="selectedClinicDate=null"
        >
          All dates
        </button>
        <button
          v-for="d in clinicDates"
          :key="d"
          class="rounded border border-gray-300 px-2 py-1 text-xs dark:border-gray-700"
          :class="selectedClinicDate===d ? 'bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900' : ''"
          @click="selectedClinicDate=d"
        >
          {{ d }}
        </button>
      </div>

      <div v-if="clinicsError" class="mt-3 text-sm text-red-700 dark:text-red-200">{{ clinicsError }}</div>
      <div v-else-if="isLoadingClinics" class="mt-3 text-sm text-gray-600 dark:text-gray-300">Loading…</div>

      <div class="mt-3 overflow-auto">
        <table class="min-w-full text-left text-sm">
          <thead class="bg-gray-50 text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-200">
            <tr>
              <th class="px-3 py-2">Date</th>
              <th class="px-3 py-2">Start</th>
              <th class="px-3 py-2">End</th>
              <th class="px-3 py-2">Status</th>
              <th class="px-3 py-2">Notes</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="c in clinicsFiltered" :key="c.clinic_id" class="border-t border-gray-100 dark:border-gray-800">
              <td class="px-3 py-2">{{ c.clinic_date }}</td>
              <td class="px-3 py-2">{{ c.start_time }}</td>
              <td class="px-3 py-2">{{ c.end_time || '—' }}</td>
              <td class="px-3 py-2">{{ c.status }}</td>
              <td class="px-3 py-2">{{ c.notes || '—' }}</td>
            </tr>
            <tr v-if="!isLoadingClinics && clinicsFiltered.length===0">
              <td colspan="5" class="px-3 py-4 text-sm text-gray-600 dark:text-gray-300">No clinic participation records.</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="mt-3 flex items-center justify-between text-sm">
        <div>Records: {{ clinicsCount }}</div>
        <div class="space-x-2">
          <button class="rounded border border-gray-300 px-3 py-1.5 text-sm disabled:opacity-60 dark:border-gray-700" @click="clinicsPage=Math.max(1, clinicsPage-1); loadClinics()" :disabled="clinicsPage<=1 || isLoadingClinics">Prev</button>
          <button class="rounded border border-gray-300 px-3 py-1.5 text-sm disabled:opacity-60 dark:border-gray-700" @click="clinicsPage=clinicsPage+1; loadClinics()" :disabled="(clinicsPage*clinicsPageSize)>=clinicsCount || isLoadingClinics">Next</button>
        </div>
      </div>

      <div class="mt-6 border-t border-gray-100 pt-4 dark:border-gray-800">
        <div class="text-sm font-medium">Add clinic participation</div>
        <div class="mt-3 grid grid-cols-1 gap-3 md:grid-cols-5">
          <div>
            <label class="block text-xs text-gray-500 dark:text-gray-400">Clinic date</label>
            <input v-model="createClinic.clinic_date" type="date" class="mt-1 w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-950" />
          </div>
          <div>
            <label class="block text-xs text-gray-500 dark:text-gray-400">Start</label>
            <input v-model="createClinic.start_time" type="time" class="mt-1 w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-950" />
          </div>
          <div>
            <label class="block text-xs text-gray-500 dark:text-gray-400">End</label>
            <input v-model="createClinic.end_time" type="time" class="mt-1 w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-950" />
          </div>
          <div>
            <label class="block text-xs text-gray-500 dark:text-gray-400">Status</label>
            <select v-model="createClinic.status" class="mt-1 w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-950">
              <option>Scheduled</option>
              <option>Attended</option>
              <option>Missed</option>
              <option>Cancelled</option>
            </select>
          </div>
          <div class="flex items-end">
            <button class="w-full rounded bg-gray-900 px-3 py-2 text-sm text-white" @click="submitClinic">Add</button>
          </div>
          <div class="md:col-span-5">
            <label class="block text-xs text-gray-500 dark:text-gray-400">Notes</label>
            <input v-model="createClinic.notes" class="mt-1 w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-950" placeholder="Optional" />
          </div>
        </div>
      </div>
    </div>

    <!-- Medications -->
    <div v-if="tab==='medications'" class="mt-4 rounded border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
      <div class="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div class="text-lg font-semibold">Medications</div>
          <div class="text-sm text-gray-500 dark:text-gray-400">Prescriptions + reminders</div>
        </div>
        <button class="rounded border border-gray-300 px-3 py-1.5 text-sm dark:border-gray-700" @click="() => { loadMeds(); loadReminders(); }" :disabled="isLoadingMeds || isLoadingReminders">Refresh</button>
      </div>

      <div v-if="medsError" class="mt-3 text-sm text-red-700 dark:text-red-200">{{ medsError }}</div>
      <div v-else-if="isLoadingMeds" class="mt-3 text-sm text-gray-600 dark:text-gray-300">Loading medications…</div>

      <div class="mt-3 overflow-auto">
        <table class="min-w-full text-left text-sm">
          <thead class="bg-gray-50 text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-200">
            <tr>
              <th class="px-3 py-2">Medicine</th>
              <th class="px-3 py-2">Dosage</th>
              <th class="px-3 py-2">Frequency</th>
              <th class="px-3 py-2">Times/day</th>
              <th class="px-3 py-2">Specific times (JSON)</th>
              <th class="px-3 py-2">Start</th>
              <th class="px-3 py-2">End</th>
              <th class="px-3 py-2">Next clinic</th>
              <th class="px-3 py-2">Active</th>
              <th class="px-3 py-2">Prescribed by</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="m in meds" :key="m.medication_id" class="border-t border-gray-100 dark:border-gray-800">
              <td class="px-3 py-2 font-medium">{{ m.medicine_name }}</td>
              <td class="px-3 py-2">{{ m.dosage }}</td>
              <td class="px-3 py-2">{{ m.frequency }}</td>
              <td class="px-3 py-2">{{ m.times_per_day }}</td>
              <td class="px-3 py-2"><span class="text-xs text-gray-600 dark:text-gray-300">{{ JSON.stringify(m.specific_times ?? null) }}</span></td>
              <td class="px-3 py-2">{{ m.start_date }}</td>
              <td class="px-3 py-2">{{ m.end_date || '—' }}</td>
              <td class="px-3 py-2">{{ m.next_clinic_date }}</td>
              <td class="px-3 py-2">{{ m.is_active ? 'Yes' : 'No' }}</td>
              <td class="px-3 py-2">{{ m.doctors?.full_name || '—' }}<span v-if="m.doctors?.specialization" class="text-xs text-gray-500"> ({{ m.doctors.specialization }})</span></td>
            </tr>
            <tr v-if="!isLoadingMeds && meds.length===0">
              <td colspan="10" class="px-3 py-4 text-sm text-gray-600 dark:text-gray-300">No medications found.</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="mt-3 flex items-center justify-between text-sm">
        <div>Records: {{ medsCount }}</div>
        <div class="space-x-2">
          <button class="rounded border border-gray-300 px-3 py-1.5 text-sm disabled:opacity-60 dark:border-gray-700" @click="medsPage=Math.max(1, medsPage-1); loadMeds()" :disabled="medsPage<=1 || isLoadingMeds">Prev</button>
          <button class="rounded border border-gray-300 px-3 py-1.5 text-sm disabled:opacity-60 dark:border-gray-700" @click="medsPage=medsPage+1; loadMeds()" :disabled="(medsPage*medsPageSize)>=medsCount || isLoadingMeds">Next</button>
        </div>
      </div>

      <div class="mt-6 border-t border-gray-100 pt-4 dark:border-gray-800">
        <div class="text-sm font-medium">Add medication</div>
        <div class="mt-3 grid grid-cols-1 gap-3 md:grid-cols-4">
          <div>
            <label class="block text-xs text-gray-500 dark:text-gray-400">Medicine name</label>
            <input v-model="createMed.medicine_name" class="mt-1 w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-950" />
          </div>
          <div>
            <label class="block text-xs text-gray-500 dark:text-gray-400">Dosage</label>
            <input v-model="createMed.dosage" class="mt-1 w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-950" placeholder="e.g., 1 tablet" />
          </div>
          <div>
            <label class="block text-xs text-gray-500 dark:text-gray-400">Frequency</label>
            <select v-model="createMed.frequency" class="mt-1 w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-950">
              <option>Daily</option>
              <option>Weekly</option>
              <option>Monthly</option>
              <option>As Needed</option>
            </select>
          </div>
          <div>
            <label class="block text-xs text-gray-500 dark:text-gray-400">Times per day</label>
            <input v-model.number="createMed.times_per_day" type="number" min="1" class="mt-1 w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-950" />
          </div>

          <div class="md:col-span-2">
            <label class="block text-xs text-gray-500 dark:text-gray-400">Specific times (JSON array, optional)</label>
            <input v-model="createMed.specific_times_json" class="mt-1 w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-950" placeholder='["08:00","20:00"]' />
          </div>
          <div>
            <label class="block text-xs text-gray-500 dark:text-gray-400">Start date</label>
            <input v-model="createMed.start_date" type="date" class="mt-1 w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-950" />
          </div>
          <div>
            <label class="block text-xs text-gray-500 dark:text-gray-400">End date</label>
            <input v-model="createMed.end_date" type="date" class="mt-1 w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-950" />
          </div>

          <div>
            <label class="block text-xs text-gray-500 dark:text-gray-400">Next clinic date</label>
            <input v-model="createMed.next_clinic_date" type="date" class="mt-1 w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-950" />
          </div>
          <div>
            <label class="block text-xs text-gray-500 dark:text-gray-400">Clinic time</label>
            <input v-model="createMed.clinic_time" type="time" class="mt-1 w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-950" />
          </div>
          <div class="md:col-span-2">
            <label class="block text-xs text-gray-500 dark:text-gray-400">Notes</label>
            <input v-model="createMed.notes" class="mt-1 w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-950" placeholder="Optional" />
          </div>
          <div class="flex items-end">
            <button class="w-full rounded bg-gray-900 px-3 py-2 text-sm text-white" @click="submitMed">Add medication</button>
          </div>
        </div>
      </div>

      <div class="mt-6 border-t border-gray-100 pt-4 dark:border-gray-800">
        <div class="text-sm font-medium">Medicine reminders</div>
        <div class="mt-3 grid grid-cols-1 gap-3 md:grid-cols-5">
          <div>
            <label class="block text-xs text-gray-500 dark:text-gray-400">From</label>
            <input v-model="remindersFrom" type="date" class="mt-1 w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-950" />
          </div>
          <div>
            <label class="block text-xs text-gray-500 dark:text-gray-400">To</label>
            <input v-model="remindersTo" type="date" class="mt-1 w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-950" />
          </div>
          <div>
            <label class="block text-xs text-gray-500 dark:text-gray-400">Status</label>
            <select v-model="remindersStatus" class="mt-1 w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-950">
              <option value="">All</option>
              <option>Pending</option>
              <option>Taken</option>
              <option>Skipped</option>
              <option>Missed</option>
            </select>
          </div>
          <div>
            <label class="block text-xs text-gray-500 dark:text-gray-400">Page size</label>
            <select v-model.number="remindersPageSize" class="mt-1 w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-950" @change="remindersPage=1; loadReminders()">
              <option :value="10">10</option>
              <option :value="25">25</option>
              <option :value="50">50</option>
            </select>
          </div>
          <div class="flex items-end">
            <button class="w-full rounded bg-gray-900 px-3 py-2 text-sm text-white" @click="remindersPage=1; loadReminders()">Apply</button>
          </div>
        </div>

        <div v-if="remindersError" class="mt-3 text-sm text-red-700 dark:text-red-200">{{ remindersError }}</div>
        <div v-else-if="isLoadingReminders" class="mt-3 text-sm text-gray-600 dark:text-gray-300">Loading reminders…</div>

        <div class="mt-3 overflow-auto">
          <table class="min-w-full text-left text-sm">
            <thead class="bg-gray-50 text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-200">
              <tr>
                <th class="px-3 py-2">Date</th>
                <th class="px-3 py-2">Time</th>
                <th class="px-3 py-2">Status</th>
                <th class="px-3 py-2">Medication ID</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="r in reminders" :key="r.reminder_id" class="border-t border-gray-100 dark:border-gray-800">
                <td class="px-3 py-2">{{ r.reminder_date }}</td>
                <td class="px-3 py-2">{{ r.reminder_time }}</td>
                <td class="px-3 py-2">{{ r.status }}</td>
                <td class="px-3 py-2">{{ r.medication_id }}</td>
              </tr>
              <tr v-if="!isLoadingReminders && reminders.length===0">
                <td colspan="4" class="px-3 py-4 text-sm text-gray-600 dark:text-gray-300">No reminders found.</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="mt-3 flex items-center justify-between text-sm">
          <div>Records: {{ remindersCount }}</div>
          <div class="space-x-2">
            <button class="rounded border border-gray-300 px-3 py-1.5 text-sm disabled:opacity-60 dark:border-gray-700" @click="remindersPage=Math.max(1, remindersPage-1); loadReminders()" :disabled="remindersPage<=1 || isLoadingReminders">Prev</button>
            <button class="rounded border border-gray-300 px-3 py-1.5 text-sm disabled:opacity-60 dark:border-gray-700" @click="remindersPage=remindersPage+1; loadReminders()" :disabled="(remindersPage*remindersPageSize)>=remindersCount || isLoadingReminders">Next</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Reports -->
    <div v-if="tab==='reports'" class="mt-4 rounded border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
      <div class="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div class="text-lg font-semibold">Medical reports</div>
          <div class="text-sm text-gray-500 dark:text-gray-400">Add reports linked to an appointment or clinic participation</div>
        </div>
        <button class="rounded border border-gray-300 px-3 py-1.5 text-sm dark:border-gray-700" @click="() => { loadReports(); loadPrescriptionRecords(); }" :disabled="isLoadingReports || isLoadingPrescriptionRecords">Refresh</button>
      </div>

        <div class="mt-4 rounded border border-gray-200 p-3 text-sm text-gray-700 dark:border-gray-800 dark:text-gray-200">
        <div class="font-medium">Add report</div>
          <div v-if="reportLinksError" class="mt-2 text-sm text-red-700 dark:text-red-200">{{ reportLinksError }}</div>
          <div v-else-if="isLoadingReportLinks" class="mt-2 text-sm text-gray-600 dark:text-gray-300">Loading appointments/clinics…</div>
        <div class="mt-2 grid grid-cols-1 gap-3 md:grid-cols-5">
          <div>
            <label class="block text-xs text-gray-500 dark:text-gray-400">Link type</label>
            <select v-model="createReport.link_type" class="mt-1 w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-950">
              <option value="appointment">Appointment</option>
              <option value="clinic">Clinic participation</option>
            </select>
          </div>
          <div>
              <label class="block text-xs text-gray-500 dark:text-gray-400">Link</label>
              <select
                v-if="createReport.link_type === 'appointment'"
                v-model="createReport.appointment_id"
                class="mt-1 w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-950"
              >
                <option value="">Select appointment…</option>
                <option v-for="a in reportAppointments" :key="a.appointment_id" :value="String(a.appointment_id)">
                  #{{ a.appointment_id }} • {{ a.appointment_date }} {{ a.appointment_time }} • {{ a.status }}
                </option>
              </select>

              <select
                v-else
                v-model="createReport.clinic_id"
                class="mt-1 w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-950"
              >
                <option value="">Select clinic…</option>
                <option v-for="c in reportClinics" :key="c.clinic_id" :value="String(c.clinic_id)">
                  #{{ c.clinic_id }} • {{ c.clinic_date }} {{ c.start_time }} • {{ c.status }}
                </option>
              </select>
          </div>
          <div class="md:col-span-3">
            <label class="block text-xs text-gray-500 dark:text-gray-400">Diagnosis</label>
            <input v-model="createReport.diagnosis" class="mt-1 w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-950" />
          </div>
          <div class="md:col-span-3">
            <label class="block text-xs text-gray-500 dark:text-gray-400">Prescription</label>
            <input v-model="createReport.prescription" class="mt-1 w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-950" />
          </div>
          <div class="md:col-span-2">
            <label class="block text-xs text-gray-500 dark:text-gray-400">Notes</label>
            <input v-model="createReport.notes" class="mt-1 w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-950" placeholder="Optional" />
          </div>
          <div class="flex items-end">
            <button class="w-full rounded bg-gray-900 px-3 py-2 text-sm text-white" @click="submitReport">Create report</button>
          </div>
        </div>
        <div class="mt-2 text-xs text-gray-500 dark:text-gray-400">
          Tip: use a clinic ID from the Clinic Participation tab, or an appointment ID from the Appointments page.
        </div>
      </div>

      <div v-if="reportsError" class="mt-3 text-sm text-red-700 dark:text-red-200">{{ reportsError }}</div>
      <div v-else-if="isLoadingReports" class="mt-3 text-sm text-gray-600 dark:text-gray-300">Loading reports…</div>

      <div class="mt-3 overflow-auto">
        <table class="min-w-full text-left text-sm">
          <thead class="bg-gray-50 text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-200">
            <tr>
              <th class="px-3 py-2">Created</th>
              <th class="px-3 py-2">Diagnosis</th>
              <th class="px-3 py-2">Prescription</th>
              <th class="px-3 py-2">Doctor</th>
              <th class="px-3 py-2">Link</th>
              <th class="px-3 py-2">Notes</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in reports" :key="r.report_id" class="border-t border-gray-100 dark:border-gray-800">
              <td class="px-3 py-2">{{ r.created_at }}</td>
              <td class="px-3 py-2 font-medium">{{ r.diagnosis }}</td>
              <td class="px-3 py-2">{{ r.prescription }}</td>
              <td class="px-3 py-2">{{ r.doctors?.full_name || '—' }}<span v-if="r.doctors?.specialization" class="text-xs text-gray-500"> ({{ r.doctors.specialization }})</span></td>
              <td class="px-3 py-2">
                <span v-if="r.appointment_id">Appt #{{ r.appointment_id }}</span>
                <span v-else-if="r.clinic_id">Clinic #{{ r.clinic_id }}</span>
                <span v-else>—</span>
              </td>
              <td class="px-3 py-2">{{ r.notes || '—' }}</td>
            </tr>
            <tr v-if="!isLoadingReports && reports.length===0">
              <td colspan="6" class="px-3 py-4 text-sm text-gray-600 dark:text-gray-300">No reports found.</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="mt-3 flex items-center justify-between text-sm">
        <div>Records: {{ reportsCount }}</div>
        <div class="space-x-2">
          <button class="rounded border border-gray-300 px-3 py-1.5 text-sm disabled:opacity-60 dark:border-gray-700" @click="reportsPage=Math.max(1, reportsPage-1); loadReports()" :disabled="reportsPage<=1 || isLoadingReports">Prev</button>
          <button class="rounded border border-gray-300 px-3 py-1.5 text-sm disabled:opacity-60 dark:border-gray-700" @click="reportsPage=reportsPage+1; loadReports()" :disabled="(reportsPage*reportsPageSize)>=reportsCount || isLoadingReports">Next</button>
        </div>
      </div>

      <div class="mt-6 border-t border-gray-100 pt-4 dark:border-gray-800">
        <div class="text-sm font-medium">Prescription records</div>

        <div v-if="prescriptionRecordsError" class="mt-3 text-sm text-red-700 dark:text-red-200">{{ prescriptionRecordsError }}</div>
        <div v-else-if="isLoadingPrescriptionRecords" class="mt-3 text-sm text-gray-600 dark:text-gray-300">Loading prescription records…</div>

        <div class="mt-3 overflow-auto">
          <table class="min-w-full text-left text-sm">
            <thead class="bg-gray-50 text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-200">
              <tr>
                <th class="px-3 py-2">Created</th>
                <th class="px-3 py-2">Prescription</th>
                <th class="px-3 py-2">Doctor</th>
                <th class="px-3 py-2">Link</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="p in prescriptionRecords" :key="p.prescription_id" class="border-t border-gray-100 dark:border-gray-800">
                <td class="px-3 py-2">{{ p.created_at }}</td>
                <td class="px-3 py-2">{{ p.prescription_text }}</td>
                <td class="px-3 py-2">{{ p.doctors?.full_name || '—' }}<span v-if="p.doctors?.specialization" class="text-xs text-gray-500"> ({{ p.doctors.specialization }})</span></td>
                <td class="px-3 py-2">
                  <span v-if="p.appointment_id">Appt #{{ p.appointment_id }}</span>
                  <span v-else-if="p.clinic_id">Clinic #{{ p.clinic_id }}</span>
                  <span v-else>—</span>
                </td>
              </tr>
              <tr v-if="!isLoadingPrescriptionRecords && prescriptionRecords.length===0">
                <td colspan="4" class="px-3 py-4 text-sm text-gray-600 dark:text-gray-300">No prescription records found.</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="mt-3 flex items-center justify-between text-sm">
          <div>Records: {{ prescriptionRecordsCount }}</div>
          <div class="space-x-2">
            <button class="rounded border border-gray-300 px-3 py-1.5 text-sm disabled:opacity-60 dark:border-gray-700" @click="prescriptionRecordsPage=Math.max(1, prescriptionRecordsPage-1); loadPrescriptionRecords()" :disabled="prescriptionRecordsPage<=1 || isLoadingPrescriptionRecords">Prev</button>
            <button class="rounded border border-gray-300 px-3 py-1.5 text-sm disabled:opacity-60 dark:border-gray-700" @click="prescriptionRecordsPage=prescriptionRecordsPage+1; loadPrescriptionRecords()" :disabled="(prescriptionRecordsPage*prescriptionRecordsPageSize)>=prescriptionRecordsCount || isLoadingPrescriptionRecords">Next</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Doctor history -->
    <div v-if="tab==='history'" class="mt-4 rounded border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
      <div class="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div class="text-lg font-semibold">Doctor history</div>
          <div class="text-sm text-gray-500 dark:text-gray-400">All encounters with other doctors</div>
        </div>
        <button class="rounded border border-gray-300 px-3 py-1.5 text-sm dark:border-gray-700" @click="loadHistory" :disabled="isLoadingHistory">Refresh</button>
      </div>

      <div v-if="historyError" class="mt-3 text-sm text-red-700 dark:text-red-200">{{ historyError }}</div>
      <div v-else-if="isLoadingHistory" class="mt-3 text-sm text-gray-600 dark:text-gray-300">Loading…</div>

      <div class="mt-3 overflow-auto">
        <table class="min-w-full text-left text-sm">
          <thead class="bg-gray-50 text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-200">
            <tr>
              <th class="px-3 py-2">Date</th>
              <th class="px-3 py-2">Time</th>
              <th class="px-3 py-2">Type</th>
              <th class="px-3 py-2">Doctor</th>
              <th class="px-3 py-2">Notes</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="h in history" :key="h.history_id" class="border-t border-gray-100 dark:border-gray-800">
              <td class="px-3 py-2">{{ h.encounter_date }}</td>
              <td class="px-3 py-2">{{ h.encounter_time || '—' }}</td>
              <td class="px-3 py-2">{{ h.encounter_type }}</td>
              <td class="px-3 py-2">{{ h.doctors?.full_name || '—' }}<span v-if="h.doctors?.specialization" class="text-xs text-gray-500"> ({{ h.doctors.specialization }})</span></td>
              <td class="px-3 py-2">{{ h.notes || '—' }}</td>
            </tr>
            <tr v-if="!isLoadingHistory && history.length===0">
              <td colspan="5" class="px-3 py-4 text-sm text-gray-600 dark:text-gray-300">No history found.</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="mt-3 flex items-center justify-between text-sm">
        <div>Records: {{ historyCount }}</div>
        <div class="space-x-2">
          <button class="rounded border border-gray-300 px-3 py-1.5 text-sm disabled:opacity-60 dark:border-gray-700" @click="historyPage=Math.max(1, historyPage-1); loadHistory()" :disabled="historyPage<=1 || isLoadingHistory">Prev</button>
          <button class="rounded border border-gray-300 px-3 py-1.5 text-sm disabled:opacity-60 dark:border-gray-700" @click="historyPage=historyPage+1; loadHistory()" :disabled="(historyPage*historyPageSize)>=historyCount || isLoadingHistory">Next</button>
        </div>
      </div>
    </div>
  </div>
</template>
