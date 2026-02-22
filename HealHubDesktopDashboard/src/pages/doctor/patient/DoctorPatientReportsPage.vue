<script setup lang="ts">
import { inject, onMounted, ref } from 'vue'
import { api, ApiError } from '../../../lib/api'
import { useAuthStore } from '../../../stores/auth'
import { DoctorPatientContextKey } from './context'

type ReportRow = {
  report_id: number
  patient_id: number
  doctor_id: number
  appointment_id: number | null
  clinic_id: number | null
  diagnosis: string
  prescription: string
  notes: string | null
  created_at: string
  doctors?: { full_name?: string | null; specialization?: string | null } | null
}

type PrescriptionRecordRow = {
  prescription_id: number
  patient_id: number
  doctor_id: number
  appointment_id: number | null
  clinic_id: number | null
  prescription_text: string
  created_at: string
  doctors?: { full_name?: string | null; specialization?: string | null } | null
}

const ctx = inject(DoctorPatientContextKey)!

const auth = useAuthStore()

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
      `/api/doctor/patients/${ctx.patientId.value}/reports`,
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
      `/api/doctor/patients/${ctx.patientId.value}/prescription-records`,
      { token: auth.accessToken, query: { page: prescriptionRecordsPage.value, page_size: prescriptionRecordsPageSize.value } },
    )
    prescriptionRecords.value = res.data || []
    prescriptionRecordsCount.value = res.count || 0
  } catch (e) {
    prescriptionRecordsError.value = e instanceof ApiError ? e.message : 'Failed to load prescription records'
  } finally {
    isLoadingPrescriptionRecords.value = false
  }
}

async function refreshAll() {
  await Promise.all([loadReports(), loadPrescriptionRecords()])
}

onMounted(refreshAll)
</script>

<template>
  <div class="rounded border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
    <div class="flex flex-wrap items-end justify-between gap-3">
      <div>
        <div class="text-lg font-semibold">Medical reports</div>
        <div class="text-sm text-gray-500 dark:text-gray-400">Reports linked to an appointment or clinic participation</div>
      </div>
      <div class="flex flex-wrap gap-2">
        <router-link class="rounded border border-gray-300 px-3 py-1.5 text-sm dark:border-gray-700" :to="`/doctor/patients/${ctx.patientId.value}/reports/add`">Add medical reports</router-link>
        <button class="rounded border border-gray-300 px-3 py-1.5 text-sm dark:border-gray-700" @click="refreshAll" :disabled="isLoadingReports || isLoadingPrescriptionRecords">Refresh</button>
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
</template>
