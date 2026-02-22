<script setup lang="ts">
import { computed, onMounted, provide, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { api, ApiError } from '../../../lib/api'
import { useAuthStore } from '../../../stores/auth'
import { useToastStore } from '../../../stores/toast'
import { DoctorPatientContextKey, type ClinicRow, type Patient } from './context'

const auth = useAuthStore()
const toast = useToastStore()
const route = useRoute()
const router = useRouter()

const patientId = computed(() => {
  const raw = route.params.patientId
  const n = Number(raw)
  return Number.isFinite(n) ? n : NaN
})

const isLoadingOverview = ref(false)
const overviewError = ref<string | null>(null)
const patient = ref<Patient | null>(null)
const upcomingClinics = ref<ClinicRow[]>([])

async function reloadOverview() {
  if (!Number.isFinite(patientId.value) || patientId.value <= 0) {
    overviewError.value = 'Invalid patient ID'
    patient.value = null
    upcomingClinics.value = []
    return
  }

  isLoadingOverview.value = true
  overviewError.value = null
  try {
    const res = await api.get<{ success: boolean; data: { patient: Patient; upcoming_clinics: ClinicRow[] } }>(
      `/api/doctor/patients/${patientId.value}/overview`,
      { token: auth.accessToken },
    )
    patient.value = res.data.patient
    upcomingClinics.value = res.data.upcoming_clinics || []
  } catch (e) {
    overviewError.value = e instanceof ApiError ? e.message : 'Failed to load patient'
    patient.value = null
    upcomingClinics.value = []
  } finally {
    isLoadingOverview.value = false
  }
}

function setPatient(next: Patient) {
  patient.value = next
}

provide(DoctorPatientContextKey, {
  patientId: computed(() => patientId.value),
  patient,
  upcomingClinics,
  isLoadingOverview,
  overviewError,
  reloadOverview,
  setPatient,
})

watch(
  () => route.params.patientId,
  async () => {
    await reloadOverview()
  },
)

onMounted(async () => {
  if (!Number.isFinite(patientId.value) || patientId.value <= 0) {
    toast.show('Invalid patient ID', 'error')
    router.replace('/doctor/patients')
    return
  }
  await reloadOverview()
})

function navClass(active: boolean) {
  return [
    'rounded border border-gray-300 px-3 py-1.5 text-sm dark:border-gray-700',
    active ? 'bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900' : '',
  ].join(' ')
}

const base = computed(() => `/doctor/patients/${route.params.patientId}`)
const path = computed(() => String(route.path))
</script>

<template>
  <div>
    <div class="flex items-start justify-between gap-4">
      <div>
        <div class="text-xl font-semibold">Patient</div>
        <div v-if="patient" class="mt-1 text-sm text-gray-500 dark:text-gray-400">{{ patient.full_name }}</div>
        <div v-else class="mt-1 text-sm text-gray-500 dark:text-gray-400">Manage patient care records</div>
      </div>
      <router-link class="rounded border border-gray-300 px-3 py-1.5 text-sm dark:border-gray-700" to="/doctor/patients">Back</router-link>
    </div>

    <div v-if="overviewError" class="mt-4 rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
      {{ overviewError }}
    </div>
    <div v-else-if="isLoadingOverview" class="mt-4 rounded border border-gray-200 bg-white px-4 py-3 text-sm text-gray-600 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300">
      Loading…
    </div>

    <div class="mt-4 flex flex-wrap gap-2">
      <router-link :class="navClass(path.endsWith('/overview'))" :to="`${base}/overview`">Overview</router-link>
      <router-link :class="navClass(path.includes('/clinics'))" :to="`${base}/clinics`">Clinic participation</router-link>
      <router-link :class="navClass(path.includes('/medicines'))" :to="`${base}/medicines`">Medicines</router-link>
      <router-link :class="navClass(path.endsWith('/reminders'))" :to="`${base}/reminders`">Medicine reminders</router-link>
      <router-link :class="navClass(path.includes('/reports'))" :to="`${base}/reports`">Medical reports</router-link>
      <router-link :class="navClass(path.endsWith('/history'))" :to="`${base}/history`">Doctor history</router-link>
    </div>

    <router-view class="mt-4" />
  </div>
</template>
