<script setup lang="ts">
import { inject, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { api, ApiError } from '../../../lib/api'
import { useAuthStore } from '../../../stores/auth'
import { useToastStore } from '../../../stores/toast'
import { DoctorPatientContextKey } from './context'

const ctx = inject(DoctorPatientContextKey)!

const auth = useAuthStore()
const toast = useToastStore()
const router = useRouter()

const createClinic = ref({
  clinic_date: '',
  start_time: '09:00',
  end_time: '',
  status: 'Scheduled',
  notes: '',
})

const isSaving = ref(false)

onMounted(() => {
  if (!createClinic.value.clinic_date) {
    // leave empty; user picks
  }
})

async function submitClinic() {
  if (!createClinic.value.clinic_date || !createClinic.value.start_time) {
    toast.show('Clinic date and start time are required', 'error')
    return
  }

  isSaving.value = true
  try {
    await api.post(
      `/api/doctor/patients/${ctx.patientId.value}/clinic-participation`,
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
    await ctx.reloadOverview()
    router.push(`/doctor/patients/${ctx.patientId.value}/clinics`)
  } catch (e) {
    toast.show(e instanceof ApiError ? e.message : 'Failed to add clinic participation', 'error')
  } finally {
    isSaving.value = false
  }
}
</script>

<template>
  <div class="rounded border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
    <div class="flex items-start justify-between gap-4">
      <div>
        <div class="text-lg font-semibold">Add clinic participation</div>
        <div class="text-sm text-gray-500 dark:text-gray-400">Schedule a clinic visit for this patient</div>
      </div>
      <router-link class="rounded border border-gray-300 px-3 py-1.5 text-sm dark:border-gray-700" :to="`/doctor/patients/${ctx.patientId.value}/clinics`">Back</router-link>
    </div>

    <div class="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
      <div>
        <label class="block text-sm font-medium">Clinic date</label>
        <input v-model="createClinic.clinic_date" type="date" class="mt-1 w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-950" />
      </div>
      <div>
        <label class="block text-sm font-medium">Status</label>
        <select v-model="createClinic.status" class="mt-1 w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-950">
          <option>Scheduled</option>
          <option>Confirmed</option>
          <option>Completed</option>
          <option>No-show</option>
          <option>Cancelled</option>
        </select>
      </div>

      <div>
        <label class="block text-sm font-medium">Start time</label>
        <input v-model="createClinic.start_time" type="time" class="mt-1 w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-950" />
      </div>
      <div>
        <label class="block text-sm font-medium">End time (optional)</label>
        <input v-model="createClinic.end_time" type="time" class="mt-1 w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-950" />
      </div>

      <div class="md:col-span-2">
        <label class="block text-sm font-medium">Notes (optional)</label>
        <input v-model="createClinic.notes" class="mt-1 w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-950" placeholder="Optional" />
      </div>

      <div class="md:col-span-2">
        <button class="rounded bg-gray-900 px-4 py-2 text-sm text-white disabled:opacity-60" :disabled="isSaving" @click="submitClinic">
          {{ isSaving ? 'Saving…' : 'Add clinic participation' }}
        </button>
      </div>
    </div>
  </div>
</template>
