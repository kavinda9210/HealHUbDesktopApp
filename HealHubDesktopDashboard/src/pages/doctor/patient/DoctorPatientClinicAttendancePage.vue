<script setup lang="ts">
import { inject, onMounted, ref } from 'vue'
import { api, ApiError } from '../../../lib/api'
import { useAuthStore } from '../../../stores/auth'
import { useToastStore } from '../../../stores/toast'
import { DoctorPatientContextKey, type ClinicRow } from './context'

const ctx = inject(DoctorPatientContextKey)!

const auth = useAuthStore()
const toast = useToastStore()

const clinics = ref<ClinicRow[]>([])
const isLoading = ref(false)
const error = ref<string | null>(null)

async function load() {
  isLoading.value = true
  error.value = null
  try {
    const res = await api.get<{ success: boolean; data: ClinicRow[] }>(`/api/doctor/patients/${ctx.patientId.value}/clinic-participation`, {
      token: auth.accessToken,
      query: { doctor_only: 1, page: 1, page_size: 50 },
    })
    clinics.value = res.data || []
  } catch (e) {
    error.value = e instanceof ApiError ? e.message : 'Failed to load clinics'
  } finally {
    isLoading.value = false
  }
}

async function mark(clinicId: number, status: 'Completed' | 'No-show') {
  try {
    await api.put(
      `/api/doctor/patients/${ctx.patientId.value}/clinic-participation/${clinicId}`,
      { status },
      { token: auth.accessToken },
    )
    toast.show('Clinic status updated', 'success')
    await load()
    await ctx.reloadOverview()
  } catch (e) {
    toast.show(e instanceof ApiError ? e.message : 'Failed to update clinic status', 'error')
  }
}

onMounted(load)
</script>

<template>
  <div class="rounded border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
    <div class="flex items-start justify-between gap-4">
      <div>
        <div class="text-lg font-semibold">Patient come / not clinic</div>
        <div class="text-sm text-gray-500 dark:text-gray-400">Mark the clinic attendance status</div>
      </div>
      <div class="flex items-center gap-2">
        <router-link class="rounded border border-gray-300 px-3 py-1.5 text-sm dark:border-gray-700" :to="`/doctor/patients/${ctx.patientId.value}/clinics`">Back</router-link>
        <button class="rounded border border-gray-300 px-3 py-1.5 text-sm dark:border-gray-700" @click="load" :disabled="isLoading">Refresh</button>
      </div>
    </div>

    <div v-if="error" class="mt-4 text-sm text-red-700 dark:text-red-200">{{ error }}</div>
    <div v-else-if="isLoading" class="mt-4 text-sm text-gray-600 dark:text-gray-300">Loading…</div>
    <div v-else-if="clinics.length === 0" class="mt-4 text-sm text-gray-600 dark:text-gray-300">No clinic participation records.</div>
    <div v-else class="mt-4 overflow-auto">
      <table class="min-w-full text-left text-sm">
        <thead class="bg-gray-50 text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-200">
          <tr>
            <th class="px-3 py-2">Date</th>
            <th class="px-3 py-2">Start</th>
            <th class="px-3 py-2">End</th>
            <th class="px-3 py-2">Status</th>
            <th class="px-3 py-2">Action</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="c in clinics" :key="c.clinic_id" class="border-t border-gray-100 dark:border-gray-800">
            <td class="px-3 py-2">{{ c.clinic_date }}</td>
            <td class="px-3 py-2">{{ c.start_time }}</td>
            <td class="px-3 py-2">{{ c.end_time || '—' }}</td>
            <td class="px-3 py-2">{{ c.status }}</td>
            <td class="px-3 py-2">
              <div class="flex flex-wrap gap-2">
                <button class="rounded bg-gray-900 px-3 py-1.5 text-xs text-white" @click="mark(c.clinic_id, 'Completed')">Come</button>
                <button class="rounded border border-gray-300 px-3 py-1.5 text-xs dark:border-gray-700" @click="mark(c.clinic_id, 'No-show')">Not come</button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
