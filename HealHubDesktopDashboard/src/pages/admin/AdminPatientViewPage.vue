<script setup lang="ts">
import { computed, onActivated, onMounted, ref } from 'vue'
import { type LocationQueryRaw, useRoute, useRouter } from 'vue-router'
import { api, ApiError } from '../../lib/api'
import { useAuthStore } from '../../stores/auth'

type PatientRow = {
  patient_id: number
  user_id: string
  full_name?: string
  phone?: string
  email?: string
  dob?: string
  gender?: string
  address?: string
  blood_group?: string
  emergency_contact?: string
  has_chronic_condition?: boolean
  condition_notes?: string
  created_at?: string
  role?: string
  user_is_active?: boolean
  user_is_verified?: boolean
  user_created_at?: string
}

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()

const patientId = computed(() => {
  const raw = route.params.patientId
  const n = Number(raw)
  return Number.isFinite(n) ? n : NaN
})

const row = ref<PatientRow | null>(null)
const isLoading = ref(false)
const error = ref<string | null>(null)

const success = ref<string | null>(null)
const actionError = ref<string | null>(null)

let successTimer: number | null = null
let errorTimer: number | null = null

function showSuccess(msg: string) {
  success.value = msg
  if (successTimer) window.clearTimeout(successTimer)
  successTimer = window.setTimeout(() => {
    success.value = null
    successTimer = null
  }, 3000)
}

function showError(msg: string) {
  actionError.value = msg
  if (errorTimer) window.clearTimeout(errorTimer)
  errorTimer = window.setTimeout(() => {
    actionError.value = null
    errorTimer = null
  }, 4000)
}

function consumeNotice() {
  const notice = route.query.notice
  if (typeof notice !== 'string' || !notice) {
    success.value = null
    actionError.value = null
    return
  }

  if (notice === 'patient_updated') showSuccess('Patient updated successfully.')

  const nextQuery: LocationQueryRaw = { ...route.query }
  delete (nextQuery as any).notice
  router.replace({ query: nextQuery })
}

async function load() {
  if (!Number.isFinite(patientId.value)) {
    error.value = 'Invalid patient id'
    return
  }

  isLoading.value = true
  error.value = null
  try {
    const res = await api.get<{ success: boolean; data: PatientRow }>(`/api/admin/patients/${patientId.value}`, {
      token: auth.accessToken,
    })
    row.value = res.data
  } catch (e) {
    error.value = e instanceof ApiError ? e.message : 'Failed to load patient'
  } finally {
    isLoading.value = false
  }
}

async function deletePatient() {
  if (!row.value) return
  if (!confirm('Delete this patient?')) return
  actionError.value = null
  try {
    await api.del(`/api/admin/patients/${row.value.patient_id}`, { token: auth.accessToken })
    router.replace({ path: '/admin/patients', query: { notice: 'patient_deleted' } })
  } catch (e) {
    showError(e instanceof ApiError ? e.message : 'Failed to delete patient')
  }
}

onMounted(() => {
  consumeNotice()
  load()
})
onActivated(() => {
  consumeNotice()
  load()
})
</script>

<template>
  <div>
    <div class="flex items-start justify-between gap-4">
      <div>
        <div class="text-xl font-semibold">Patient details</div>
        <div class="text-sm text-gray-500 dark:text-gray-400">View patient profile information</div>
      </div>

      <div class="flex items-center gap-2">
        <router-link class="rounded border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:text-gray-100" to="/admin/patients">
          Back
        </router-link>
        <router-link
          v-if="row"
          class="rounded border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:text-gray-100"
          :to="`/admin/patients/${row.patient_id}/edit`"
        >
          Edit
        </router-link>
        <router-link
          v-if="row"
          class="rounded border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:text-gray-100"
          :to="`/admin/patients/${row.patient_id}/alerts`"
        >
          Alerts
        </router-link>
        <button v-if="row" class="rounded bg-gray-900 px-3 py-2 text-sm text-white" @click="deletePatient">Delete</button>
      </div>
    </div>

    <div
      v-if="success"
      class="mt-6 rounded border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700 dark:border-green-900 dark:bg-green-950 dark:text-green-200"
    >
      {{ success }}
    </div>
    <div
      v-if="actionError"
      class="mt-6 rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-200"
    >
      {{ actionError }}
    </div>

    <div
      v-if="error"
      class="mt-6 rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-200"
    >
      {{ error }}
    </div>
    <div
      v-else-if="isLoading && !row"
      class="mt-6 rounded border border-gray-200 bg-white px-4 py-3 text-sm text-gray-600 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300"
    >
      Loading…
    </div>

    <div v-else-if="row" class="mt-6 rounded border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
      <div v-if="isLoading" class="border-b border-gray-100 px-4 py-2 text-xs text-gray-500 dark:border-gray-800 dark:text-gray-400">Refreshing…</div>
      <div class="grid grid-cols-1 gap-0 md:grid-cols-2">
        <div class="border-b border-gray-100 p-4 dark:border-gray-800">
          <div class="text-xs font-medium text-gray-500 dark:text-gray-400">Full name</div>
          <div class="mt-1 text-sm text-gray-900 dark:text-gray-100">{{ row.full_name || '-' }}</div>
        </div>
        <div class="border-b border-gray-100 p-4 dark:border-gray-800">
          <div class="text-xs font-medium text-gray-500 dark:text-gray-400">Email</div>
          <div class="mt-1 text-sm text-gray-900 dark:text-gray-100">{{ row.email || '-' }}</div>
        </div>

        <div class="border-b border-gray-100 p-4 dark:border-gray-800">
          <div class="text-xs font-medium text-gray-500 dark:text-gray-400">Phone</div>
          <div class="mt-1 text-sm text-gray-900 dark:text-gray-100">{{ row.phone || '-' }}</div>
        </div>
        <div class="border-b border-gray-100 p-4 dark:border-gray-800">
          <div class="text-xs font-medium text-gray-500 dark:text-gray-400">DOB</div>
          <div class="mt-1 text-sm text-gray-900 dark:text-gray-100">{{ row.dob || '-' }}</div>
        </div>

        <div class="border-b border-gray-100 p-4 dark:border-gray-800">
          <div class="text-xs font-medium text-gray-500 dark:text-gray-400">Gender</div>
          <div class="mt-1 text-sm text-gray-900 dark:text-gray-100">{{ row.gender || '-' }}</div>
        </div>
        <div class="border-b border-gray-100 p-4 dark:border-gray-800">
          <div class="text-xs font-medium text-gray-500 dark:text-gray-400">Address</div>
          <div class="mt-1 text-sm text-gray-900 dark:text-gray-100">{{ row.address || '-' }}</div>
        </div>

        <div class="border-b border-gray-100 p-4 dark:border-gray-800">
          <div class="text-xs font-medium text-gray-500 dark:text-gray-400">Blood group</div>
          <div class="mt-1 text-sm text-gray-900 dark:text-gray-100">{{ row.blood_group || '-' }}</div>
        </div>
        <div class="border-b border-gray-100 p-4 dark:border-gray-800">
          <div class="text-xs font-medium text-gray-500 dark:text-gray-400">Emergency contact</div>
          <div class="mt-1 text-sm text-gray-900 dark:text-gray-100">{{ row.emergency_contact || '-' }}</div>
        </div>

        <div class="border-b border-gray-100 p-4 dark:border-gray-800">
          <div class="text-xs font-medium text-gray-500 dark:text-gray-400">Chronic condition</div>
          <div class="mt-1 text-sm text-gray-900 dark:text-gray-100">{{ row.has_chronic_condition ? 'Yes' : 'No' }}</div>
        </div>
        <div class="border-b border-gray-100 p-4 dark:border-gray-800">
          <div class="text-xs font-medium text-gray-500 dark:text-gray-400">Created</div>
          <div class="mt-1 text-sm text-gray-900 dark:text-gray-100">{{ row.created_at || '-' }}</div>
        </div>

        <div class="border-b border-gray-100 p-4 md:col-span-2 dark:border-gray-800">
          <div class="text-xs font-medium text-gray-500 dark:text-gray-400">Condition notes</div>
          <div class="mt-1 text-sm text-gray-900 whitespace-pre-wrap dark:text-gray-100">{{ row.condition_notes || '-' }}</div>
        </div>
      </div>
    </div>

    <div v-else class="mt-6 rounded border border-gray-200 bg-white px-4 py-3 text-sm text-gray-600 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300">
      Patient not found.
    </div>
  </div>
</template>
