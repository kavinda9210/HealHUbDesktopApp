<script setup lang="ts">
import { computed, onActivated, onMounted, ref } from 'vue'
import { api, ApiError } from '../../lib/api'
import { useAuthStore } from '../../stores/auth'
import { useToastStore } from '../../stores/toast'

type AppointmentRow = {
  appointment_id: number
  patient_id: number
  doctor_id: number
  appointment_date: string
  appointment_time: string
  status: string
}

const auth = useAuthStore()
const toast = useToastStore()

const todayIso = computed(() => {
  const d = new Date()
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
})

const todaysAppointments = ref<AppointmentRow[]>([])
const isLoading = ref(false)
const error = ref<string | null>(null)

async function loadToday() {
  isLoading.value = true
  error.value = null
  try {
    const res = await api.get<{ success: boolean; data: AppointmentRow[] }>('/api/doctor/appointments', {
      token: auth.accessToken,
      query: { date_from: todayIso.value },
    })
    const rows = res.data || []
    todaysAppointments.value = rows.filter((r) => r.appointment_date === todayIso.value)
  } catch (e) {
    error.value = e instanceof ApiError ? e.message : 'Failed to load today\'s appointments'
  } finally {
    isLoading.value = false
  }
}

function refresh() {
  toast.show('Refreshing…', 'info', 1200)
  loadToday()
}

onMounted(loadToday)
onActivated(loadToday)
</script>

<template>
  <div>
    <div>
      <div class="text-xl font-semibold">Doctor Dashboard</div>
      <div class="mt-1 text-sm text-gray-600 dark:text-gray-300">Signed in as {{ auth.user?.email }}</div>
    </div>

    <div class="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      <div class="rounded border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
        <div class="flex items-center justify-between">
          <div>
            <div class="text-sm font-medium">Patients</div>
            <div class="text-xs text-gray-500 dark:text-gray-400">Search patients, clinics, medications, and reports</div>
          </div>
          <div class="inline-flex h-10 w-10 items-center justify-center rounded bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200">
            <svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <path d="M9 11a4 4 0 1 0 0-8a4 4 0 0 0 0 8" />
              <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
        </div>
        <router-link class="mt-4 inline-block text-sm underline text-gray-700 dark:text-gray-200" to="/doctor/patients">Go to patients</router-link>
      </div>

      <div class="rounded border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
        <div class="flex items-center justify-between">
          <div>
            <div class="text-sm font-medium">Appointments</div>
            <div class="text-xs text-gray-500 dark:text-gray-400">Accept or decline patient appointment requests</div>
          </div>
          <div class="inline-flex h-10 w-10 items-center justify-center rounded bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200">
            <svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M7 3v3" />
              <path d="M17 3v3" />
              <path d="M4 7h16" />
              <path d="M5 6h14a1 1 0 0 1 1 1v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a1 1 0 0 1 1-1" />
              <path d="M8 11h4" />
              <path d="M8 15h6" />
            </svg>
          </div>
        </div>
        <router-link class="mt-4 inline-block text-sm underline text-gray-700 dark:text-gray-200" to="/doctor/appointments">Go to appointments</router-link>
      </div>

      <div class="rounded border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
        <div class="flex items-center justify-between">
          <div>
            <div class="text-sm font-medium">Notifications</div>
            <div class="text-xs text-gray-500 dark:text-gray-400">Patient requests and billing alerts</div>
          </div>
          <div class="inline-flex h-10 w-10 items-center justify-center rounded bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200">
            <svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 7h18s-3 0-3-7" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
          </div>
        </div>
        <router-link class="mt-4 inline-block text-sm underline text-gray-700 dark:text-gray-200" to="/doctor/notifications">Go to notifications</router-link>
      </div>

      <div class="rounded border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
        <div class="flex items-center justify-between">
          <div>
            <div class="text-sm font-medium">Profile</div>
            <div class="text-xs text-gray-500 dark:text-gray-400">Update your account details</div>
          </div>
          <div class="inline-flex h-10 w-10 items-center justify-center rounded bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200">
            <svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 12a4 4 0 1 0-4-4a4 4 0 0 0 4 4" />
              <path d="M4 21v-1a7 7 0 0 1 14 0v1" />
            </svg>
          </div>
        </div>
        <router-link class="mt-4 inline-block text-sm underline text-gray-700 dark:text-gray-200" to="/doctor/profile">Go to profile</router-link>
      </div>
    </div>

    <div class="mt-6 rounded border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
      <div class="flex items-start justify-between gap-4">
        <div>
          <div class="text-lg font-semibold">Today’s appointments</div>
          <div class="mt-1 text-sm text-gray-500 dark:text-gray-400">Quick actions to add reports or prescribe medication</div>
        </div>
        <button class="rounded border border-gray-300 px-3 py-1.5 text-sm dark:border-gray-700" @click="refresh" :disabled="isLoading">Refresh</button>
      </div>

      <div v-if="error" class="mt-3 text-sm text-red-700 dark:text-red-200">{{ error }}</div>
      <div v-else-if="isLoading" class="mt-3 text-sm text-gray-600 dark:text-gray-300">Loading…</div>

      <div class="mt-3 overflow-auto">
        <table class="min-w-full text-left text-sm">
          <thead class="bg-gray-50 text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-200">
            <tr>
              <th class="px-3 py-2">Time</th>
              <th class="px-3 py-2">Status</th>
              <th class="px-3 py-2">Patient ID</th>
              <th class="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="a in todaysAppointments" :key="a.appointment_id" class="border-t border-gray-100 dark:border-gray-800">
              <td class="px-3 py-2">{{ a.appointment_time }}</td>
              <td class="px-3 py-2">{{ a.status }}</td>
              <td class="px-3 py-2">{{ a.patient_id }}</td>
              <td class="px-3 py-2 text-right space-x-2">
                <router-link class="rounded border border-gray-300 px-3 py-1.5 text-xs dark:border-gray-700" :to="`/doctor/patients/${a.patient_id}/overview`">Open</router-link>
                <router-link class="rounded border border-gray-300 px-3 py-1.5 text-xs dark:border-gray-700" :to="`/doctor/patients/${a.patient_id}/reports/add`">Add report</router-link>
                <router-link class="rounded bg-gray-900 px-3 py-1.5 text-xs text-white" :to="`/doctor/patients/${a.patient_id}/medicines/add`">Prescribe</router-link>
              </td>
            </tr>
            <tr v-if="!isLoading && todaysAppointments.length === 0">
              <td class="px-3 py-4 text-sm text-gray-600 dark:text-gray-300" colspan="4">No appointments scheduled for today.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
