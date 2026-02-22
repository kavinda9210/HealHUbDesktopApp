<script setup lang="ts">
import { inject, onMounted, ref } from 'vue'
import { api, ApiError } from '../../../lib/api'
import { useAuthStore } from '../../../stores/auth'
import { DoctorPatientContextKey } from './context'

type ReminderRow = {
  reminder_id: number
  medication_id: number
  reminder_date: string
  reminder_time: string
  status: string
}

const ctx = inject(DoctorPatientContextKey)!

const auth = useAuthStore()

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
      `/api/doctor/patients/${ctx.patientId.value}/medicine-reminders`,
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

onMounted(loadReminders)
</script>

<template>
  <div class="rounded border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
    <div class="flex flex-wrap items-end justify-between gap-3">
      <div>
        <div class="text-lg font-semibold">Medicine reminders</div>
        <div class="text-sm text-gray-500 dark:text-gray-400">Patient reminder schedule</div>
      </div>
      <button class="rounded border border-gray-300 px-3 py-1.5 text-sm dark:border-gray-700" @click="loadReminders" :disabled="isLoadingReminders">Refresh</button>
    </div>

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
</template>
