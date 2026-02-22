<script setup lang="ts">
import { computed, inject, ref, watch } from 'vue'
import { api, ApiError } from '../../../lib/api'
import { useAuthStore } from '../../../stores/auth'
import { useToastStore } from '../../../stores/toast'
import { DoctorPatientContextKey, type Patient } from './context'

const ctx = inject(DoctorPatientContextKey)!

const auth = useAuthStore()
const toast = useToastStore()

const patient = ctx.patient
const upcomingClinics = ctx.upcomingClinics

const bloodGroupDraft = ref('')
const isSavingBloodGroup = ref(false)

const canSaveBloodGroup = computed(() => {
  if (!patient.value) return false
  const current = (patient.value.blood_group || '').trim().toUpperCase()
  const next = (bloodGroupDraft.value || '').trim().toUpperCase()
  return current !== next && !isSavingBloodGroup.value
})

watch(
  () => patient.value?.blood_group,
  (bg) => {
    bloodGroupDraft.value = (bg || '').toString()
  },
  { immediate: true },
)

async function saveBloodGroup() {
  if (!patient.value) return
  isSavingBloodGroup.value = true
  try {
    const payload = { blood_group: bloodGroupDraft.value.trim() || null }
    await api.put(`/api/doctor/patients/${ctx.patientId.value}/blood-group`, payload, { token: auth.accessToken })

    ctx.setPatient({
      ...(patient.value as Patient),
      blood_group: payload.blood_group || null,
    })
    bloodGroupDraft.value = (ctx.patient.value?.blood_group || '').toString()
    toast.show('Blood group updated', 'success')
  } catch (e) {
    toast.show(e instanceof ApiError ? e.message : 'Failed to update blood group', 'error')
  } finally {
    isSavingBloodGroup.value = false
  }
}
</script>

<template>
  <div class="rounded border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
    <div v-if="!patient" class="text-sm text-gray-600 dark:text-gray-300">Loading…</div>
    <div v-else>
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div class="text-lg font-semibold">{{ patient.full_name }}</div>
          <div class="mt-1 text-sm text-gray-600 dark:text-gray-300">{{ patient.gender || '—' }} • DOB {{ patient.dob }} • {{ patient.phone }}</div>
        </div>
        <div class="text-sm">
          <span
            v-if="patient.has_chronic_condition"
            class="inline-flex items-center rounded border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-200"
          >
            Chronic condition
          </span>
        </div>
      </div>

      <div class="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
        <div class="rounded border border-gray-200 p-3 text-sm dark:border-gray-800">
          <div class="text-xs text-gray-500 dark:text-gray-400">Blood group</div>
          <div class="mt-2 flex items-center gap-2">
            <select
              v-model="bloodGroupDraft"
              class="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-950"
              :disabled="isSavingBloodGroup"
            >
              <option value="">—</option>
              <option value="A+">A+</option>
              <option value="A-">A-</option>
              <option value="B+">B+</option>
              <option value="B-">B-</option>
              <option value="AB+">AB+</option>
              <option value="AB-">AB-</option>
              <option value="O+">O+</option>
              <option value="O-">O-</option>
            </select>
            <button class="shrink-0 rounded bg-gray-900 px-3 py-2 text-sm text-white disabled:opacity-60" :disabled="!canSaveBloodGroup" @click="saveBloodGroup">
              {{ isSavingBloodGroup ? 'Saving…' : 'Save' }}
            </button>
          </div>
        </div>

        <div class="rounded border border-gray-200 p-3 text-sm dark:border-gray-800">
          <div class="text-xs text-gray-500 dark:text-gray-400">Emergency contact</div>
          <div class="mt-1 font-medium">{{ patient.emergency_contact || '—' }}</div>
        </div>

        <div class="rounded border border-gray-200 p-3 text-sm dark:border-gray-800">
          <div class="text-xs text-gray-500 dark:text-gray-400">Address</div>
          <div class="mt-1 font-medium">{{ patient.address || '—' }}</div>
        </div>
      </div>

      <div class="mt-4">
        <div class="text-sm font-medium">Upcoming clinics</div>
        <div v-if="upcomingClinics.length === 0" class="mt-1 text-sm text-gray-600 dark:text-gray-300">None scheduled.</div>
        <div v-else class="mt-2 overflow-auto">
          <table class="min-w-full text-left text-sm">
            <thead class="bg-gray-50 text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-200">
              <tr>
                <th class="px-3 py-2">Date</th>
                <th class="px-3 py-2">Start</th>
                <th class="px-3 py-2">End</th>
                <th class="px-3 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="c in upcomingClinics" :key="c.clinic_id" class="border-t border-gray-100 dark:border-gray-800">
                <td class="px-3 py-2">{{ c.clinic_date }}</td>
                <td class="px-3 py-2">{{ c.start_time }}</td>
                <td class="px-3 py-2">{{ c.end_time || '—' }}</td>
                <td class="px-3 py-2">{{ c.status }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>
