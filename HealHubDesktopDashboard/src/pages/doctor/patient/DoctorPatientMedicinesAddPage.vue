<script setup lang="ts">
import { inject, ref } from 'vue'
import { useRouter } from 'vue-router'
import { api, ApiError } from '../../../lib/api'
import { useAuthStore } from '../../../stores/auth'
import { useToastStore } from '../../../stores/toast'
import { DoctorPatientContextKey } from './context'

const ctx = inject(DoctorPatientContextKey)!

const auth = useAuthStore()
const toast = useToastStore()
const router = useRouter()

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

const isSaving = ref(false)

async function submitMed() {
  if (!createMed.value.medicine_name || !createMed.value.dosage || !createMed.value.start_date) {
    toast.show('Medicine name, dosage, and start date are required', 'error')
    return
  }

  isSaving.value = true
  try {
    await api.post(
      `/api/doctor/patients/${ctx.patientId.value}/medications`,
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
    await ctx.reloadOverview()
    router.push(`/doctor/patients/${ctx.patientId.value}/medicines`)
  } catch (e) {
    toast.show(e instanceof ApiError ? e.message : 'Failed to add medication', 'error')
  } finally {
    isSaving.value = false
  }
}
</script>

<template>
  <div class="rounded border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
    <div class="flex items-start justify-between gap-4">
      <div>
        <div class="text-lg font-semibold">Add medicines</div>
        <div class="text-sm text-gray-500 dark:text-gray-400">Create a new medication prescription</div>
      </div>
      <router-link class="rounded border border-gray-300 px-3 py-1.5 text-sm dark:border-gray-700" :to="`/doctor/patients/${ctx.patientId.value}/medicines`">Back</router-link>
    </div>

    <div class="mt-4 grid grid-cols-1 gap-3 md:grid-cols-4">
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

      <div class="md:col-span-4">
        <button class="rounded bg-gray-900 px-4 py-2 text-sm text-white disabled:opacity-60" :disabled="isSaving" @click="submitMed">
          {{ isSaving ? 'Saving…' : 'Add medication' }}
        </button>
      </div>
    </div>
  </div>
</template>
