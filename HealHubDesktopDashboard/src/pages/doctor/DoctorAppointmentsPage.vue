<script setup lang="ts">
import { onActivated, onMounted, ref } from 'vue'
import { api, ApiError } from '../../lib/api'
import { useAuthStore } from '../../stores/auth'

type AppointmentRow = {
  appointment_id: number
  patient_id: number
  doctor_id: number
  appointment_date: string
  appointment_time: string
  status: string
  created_at?: string
}

const auth = useAuthStore()

const rows = ref<AppointmentRow[]>([])
const isLoading = ref(false)
const error = ref<string | null>(null)

const feeOverrides = ref<Record<number, string>>({})

async function load() {
  isLoading.value = true
  error.value = null
  try {
    const res = await api.get<{ success: boolean; data: AppointmentRow[] }>('/api/doctor/appointments', {
      token: auth.accessToken,
    })
    rows.value = res.data || []
  } catch (e) {
    error.value = e instanceof ApiError ? e.message : 'Failed to load appointments'
  } finally {
    isLoading.value = false
  }
}

async function accept(appointmentId: number) {
  try {
    const raw = feeOverrides.value[appointmentId]
    const body = raw && raw.trim() ? { consultation_fee: Number(raw) } : undefined
    await api.post(`/api/doctor/appointments/${appointmentId}/accept`, body, { token: auth.accessToken })
    await load()
  } catch (e) {
    alert(e instanceof ApiError ? e.message : 'Failed to accept appointment')
  }
}

async function decline(appointmentId: number) {
  if (!confirm('Decline this appointment request?')) return
  try {
    await api.post(`/api/doctor/appointments/${appointmentId}/decline`, undefined, { token: auth.accessToken })
    await load()
  } catch (e) {
    alert(e instanceof ApiError ? e.message : 'Failed to decline appointment')
  }
}

onMounted(load)
onActivated(load)
</script>

<template>
  <div>
    <div class="flex items-center justify-between">
      <div>
        <div class="text-xl font-semibold">Appointments</div>
        <div class="text-sm text-gray-500 dark:text-gray-400">Accept/decline requests and optionally add a doctor charge</div>
      </div>
      <button
        class="rounded border border-gray-300 px-3 py-1.5 text-sm dark:border-gray-700 dark:text-gray-100"
        @click="load"
        :disabled="isLoading"
      >
        Refresh
      </button>
    </div>

    <div class="mt-6 rounded border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
      <div v-if="error" class="px-4 py-3 text-sm text-red-700 dark:text-red-200">{{ error }}</div>
      <div v-else-if="isLoading" class="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">Loading…</div>

      <div class="overflow-auto">
        <table class="min-w-full text-left text-sm text-gray-900 dark:text-gray-100">
          <thead class="bg-gray-50 text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-200">
            <tr>
              <th class="px-4 py-2">Date</th>
              <th class="px-4 py-2">Time</th>
              <th class="px-4 py-2">Status</th>
              <th class="px-4 py-2">Consultation fee (optional)</th>
              <th class="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in rows" :key="r.appointment_id" class="border-t border-gray-100 dark:border-gray-800">
              <td class="px-4 py-2">{{ r.appointment_date }}</td>
              <td class="px-4 py-2">{{ r.appointment_time }}</td>
              <td class="px-4 py-2">{{ r.status }}</td>
              <td class="px-4 py-2">
                <input
                  v-model="feeOverrides[r.appointment_id]"
                  inputmode="decimal"
                  class="w-40 rounded border border-gray-300 bg-white px-2 py-1 text-gray-900 placeholder-gray-400 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:placeholder-gray-500"
                  placeholder="Leave blank"
                  :disabled="r.status !== 'Scheduled'"
                />
              </td>
              <td class="px-4 py-2 text-right space-x-2">
                <button
                  class="rounded bg-gray-900 px-3 py-1.5 text-xs text-white disabled:opacity-60"
                  :disabled="r.status !== 'Scheduled'"
                  @click="accept(r.appointment_id)"
                >
                  Accept
                </button>
                <button
                  class="rounded border border-gray-300 px-3 py-1.5 text-xs disabled:opacity-60 dark:border-gray-700 dark:text-gray-100"
                  :disabled="r.status !== 'Scheduled'"
                  @click="decline(r.appointment_id)"
                >
                  Decline
                </button>
              </td>
            </tr>
            <tr v-if="!isLoading && rows.length === 0">
              <td class="px-4 py-4 text-sm text-gray-600 dark:text-gray-300" colspan="5">No appointments found.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
