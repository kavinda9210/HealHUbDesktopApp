<script setup lang="ts">
import { computed, inject, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { api, ApiError } from '../../../lib/api'
import { useAuthStore } from '../../../stores/auth'
import { useToastStore } from '../../../stores/toast'
import { DoctorPatientContextKey, type ClinicRow } from './context'

type AppointmentRow = {
  appointment_id: number
  appointment_date: string
  appointment_time: string
  status: string
  patient_id: number
}

const ctx = inject(DoctorPatientContextKey)!

const auth = useAuthStore()
const toast = useToastStore()
const router = useRouter()

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
const isSaving = ref(false)

const hasAppointment = computed(() => createReport.value.link_type === 'appointment' && Boolean(createReport.value.appointment_id))
const hasClinic = computed(() => createReport.value.link_type === 'clinic' && Boolean(createReport.value.clinic_id))

async function loadReportLinks() {
  isLoadingReportLinks.value = true
  reportLinksError.value = null
  try {
    const [appts, cls] = await Promise.all([
      api.get<{ success: boolean; data: AppointmentRow[] }>(`/api/doctor/appointments`, {
        token: auth.accessToken,
        query: { patient_id: ctx.patientId.value },
      }),
      api.get<{ success: boolean; data: ClinicRow[] }>(`/api/doctor/patients/${ctx.patientId.value}/clinic-participation`, {
        token: auth.accessToken,
        query: { doctor_only: 1, page: 1, page_size: 50 },
      }),
    ])

    reportAppointments.value = (appts.data || []).filter((a) => a.patient_id === ctx.patientId.value)
    reportClinics.value = cls.data || []
  } catch (e) {
    reportLinksError.value = e instanceof ApiError ? e.message : 'Failed to load appointment/clinic links'
  } finally {
    isLoadingReportLinks.value = false
  }
}

async function submitReport() {
  if (!createReport.value.diagnosis || !createReport.value.prescription || (!hasAppointment.value && !hasClinic.value)) {
    toast.show('Diagnosis, prescription, and a link target are required', 'error')
    return
  }

  isSaving.value = true
  try {
    const body: any = {
      diagnosis: createReport.value.diagnosis,
      prescription: createReport.value.prescription,
      notes: createReport.value.notes || null,
    }
    if (createReport.value.link_type === 'appointment') body.appointment_id = Number(createReport.value.appointment_id)
    else body.clinic_id = Number(createReport.value.clinic_id)

    await api.post(`/api/doctor/patients/${ctx.patientId.value}/reports`, body, { token: auth.accessToken })
    toast.show('Report created', 'success')
    router.push(`/doctor/patients/${ctx.patientId.value}/reports`)
  } catch (e) {
    toast.show(e instanceof ApiError ? e.message : 'Failed to create report', 'error')
  } finally {
    isSaving.value = false
  }
}

onMounted(loadReportLinks)
</script>

<template>
  <div class="rounded border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
    <div class="flex items-start justify-between gap-4">
      <div>
        <div class="text-lg font-semibold">Add medical reports</div>
        <div class="text-sm text-gray-500 dark:text-gray-400">Link the report to an appointment or clinic participation</div>
      </div>
      <router-link class="rounded border border-gray-300 px-3 py-1.5 text-sm dark:border-gray-700" :to="`/doctor/patients/${ctx.patientId.value}/reports`">Back</router-link>
    </div>

    <div class="mt-4 rounded border border-gray-200 p-3 text-sm text-gray-700 dark:border-gray-800 dark:text-gray-200">
      <div class="font-medium">Report details</div>
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
          <button class="w-full rounded bg-gray-900 px-3 py-2 text-sm text-white disabled:opacity-60" :disabled="isSaving" @click="submitReport">
            {{ isSaving ? 'Saving…' : 'Create report' }}
          </button>
        </div>
      </div>

      <div class="mt-2 text-xs text-gray-500 dark:text-gray-400">Tip: appointments come from the Appointments page; clinics come from Clinic participation.</div>
    </div>
  </div>
</template>
