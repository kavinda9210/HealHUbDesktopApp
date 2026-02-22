<script setup lang="ts">
import { inject, onMounted, ref } from 'vue'
import { api, ApiError } from '../../../lib/api'
import { useAuthStore } from '../../../stores/auth'
import { DoctorPatientContextKey } from './context'

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

const ctx = inject(DoctorPatientContextKey)!

const auth = useAuthStore()

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
      `/api/doctor/patients/${ctx.patientId.value}/medications`,
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

onMounted(loadMeds)
</script>

<template>
  <div class="rounded border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
    <div class="flex flex-wrap items-end justify-between gap-3">
      <div>
        <div class="text-lg font-semibold">Medicines</div>
        <div class="text-sm text-gray-500 dark:text-gray-400">Patient medications</div>
      </div>
      <div class="flex flex-wrap gap-2">
        <router-link class="rounded border border-gray-300 px-3 py-1.5 text-sm dark:border-gray-700" :to="`/doctor/patients/${ctx.patientId.value}/medicines/add`">Add medicines</router-link>
        <button class="rounded border border-gray-300 px-3 py-1.5 text-sm dark:border-gray-700" @click="loadMeds" :disabled="isLoadingMeds">Refresh</button>
      </div>
    </div>

    <div class="mt-4 grid grid-cols-1 gap-3 md:grid-cols-4">
      <div>
        <label class="block text-sm font-medium">Page size</label>
        <select v-model.number="medsPageSize" class="mt-1 w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-950" @change="medsPage=1; loadMeds()">
          <option :value="10">10</option>
          <option :value="25">25</option>
          <option :value="50">50</option>
        </select>
      </div>
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
  </div>
</template>
