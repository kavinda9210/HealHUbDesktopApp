<script setup lang="ts">
import { inject, onMounted, ref } from 'vue'
import { api, ApiError } from '../../../lib/api'
import { useAuthStore } from '../../../stores/auth'
import { DoctorPatientContextKey } from './context'

type HistoryRow = {
  history_id: number
  patient_id: number
  doctor_id: number
  encounter_type: string
  encounter_date: string
  encounter_time: string | null
  notes: string | null
  recorded_at: string
  doctors?: { full_name?: string | null; specialization?: string | null } | null
}

const ctx = inject(DoctorPatientContextKey)!

const auth = useAuthStore()

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
      `/api/doctor/patients/${ctx.patientId.value}/doctor-history`,
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

onMounted(loadHistory)
</script>

<template>
  <div class="rounded border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
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
</template>
