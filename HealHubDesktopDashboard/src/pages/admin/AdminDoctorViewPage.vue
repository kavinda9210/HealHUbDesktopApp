<script setup lang="ts">
import { computed, onActivated, onMounted, ref } from 'vue'
import { type LocationQueryRaw, useRoute, useRouter } from 'vue-router'
import { api, ApiError } from '../../lib/api'
import { useAuthStore } from '../../stores/auth'

type DoctorRow = {
  doctor_id: number
  user_id: string
  full_name: string
  specialization?: string
  qualification?: string
  phone?: string
  email?: string
  consultation_fee?: number
  available_days?: unknown
  start_time?: string | null
  end_time?: string | null
  is_available?: boolean
  created_at?: string
  role?: string
  user_is_active?: boolean
  user_is_verified?: boolean
  user_created_at?: string
}

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()

const doctorId = computed(() => {
  const raw = route.params.doctorId
  const n = Number(raw)
  return Number.isFinite(n) ? n : NaN
})

const row = ref<DoctorRow | null>(null)
const isLoading = ref(false)
const error = ref<string | null>(null)

const success = ref<string | null>(null)
const actionError = ref<string | null>(null)

function displayDays(days?: unknown) {
  if (days == null) return '-'

  // Backend/DB may return available_days as array, JSON string, or comma-separated string.
  const raw: unknown = days
  if (Array.isArray(raw)) {
    const parts = raw.map((x) => String(x).trim()).filter(Boolean)
    return parts.length ? parts.join(', ') : '-'
  }
  if (typeof raw === 'string') {
    const s = raw.trim()
    if (!s) return '-'
    if (s.startsWith('[') && s.endsWith(']')) {
      try {
        const parsed = JSON.parse(s)
        if (Array.isArray(parsed)) {
          const parts = parsed.map((x) => String(x).trim()).filter(Boolean)
          return parts.length ? parts.join(', ') : '-'
        }
      } catch {
        // fall back to CSV split
      }
    }
    const parts = s
      .split(',')
      .map((x) => x.trim())
      .filter(Boolean)
    return parts.length ? parts.join(', ') : '-'
  }

  return '-'
}

function displayTime(t?: string | null) {
  if (!t) return '-'
  const m = String(t).match(/^(\d{2}:\d{2})/)
  return m ? m[1] : String(t)
}

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
    // Clear stale messages when returning to this keep-alive page.
    success.value = null
    actionError.value = null
    return
  }

  if (notice === 'doctor_updated') showSuccess('Doctor updated successfully.')

  const nextQuery: LocationQueryRaw = { ...route.query }
  delete (nextQuery as any).notice
  router.replace({ query: nextQuery })
}

async function load() {
  if (!Number.isFinite(doctorId.value)) {
    error.value = 'Invalid doctor id'
    return
  }

  isLoading.value = true
  error.value = null
  try {
    const res = await api.get<{ success: boolean; data: DoctorRow }>(`/api/admin/doctors/${doctorId.value}`, {
      token: auth.accessToken,
    })
    row.value = res.data
  } catch (e) {
    error.value = e instanceof ApiError ? e.message : 'Failed to load doctor'
  } finally {
    isLoading.value = false
  }
}

async function deleteDoctor() {
  if (!row.value) return
  if (!confirm('Delete this doctor?')) return
  actionError.value = null
  try {
    await api.del(`/api/admin/doctors/${row.value.doctor_id}`, { token: auth.accessToken })
    router.replace({ path: '/admin/doctors', query: { notice: 'doctor_deleted' } })
  } catch (e) {
    showError(e instanceof ApiError ? e.message : 'Failed to delete doctor')
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
        <div class="text-xl font-semibold">Doctor details</div>
        <div class="text-sm text-gray-500 dark:text-gray-400">View doctor profile information</div>
      </div>

      <div class="flex items-center gap-2">
        <router-link class="rounded border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:text-gray-100" to="/admin/doctors">
          Back
        </router-link>
        <router-link
          v-if="row"
          class="rounded border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:text-gray-100"
          :to="`/admin/doctors/${row.doctor_id}/edit`"
        >
          Edit
        </router-link>
        <router-link
          v-if="row"
          class="rounded border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:text-gray-100"
          :to="`/admin/doctors/${row.doctor_id}/alerts`"
        >
          Alerts
        </router-link>
        <button v-if="row" class="rounded bg-gray-900 px-3 py-2 text-sm text-white" @click="deleteDoctor">
          Delete
        </button>
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
          <div class="mt-1 text-sm text-gray-900 dark:text-gray-100">{{ row.full_name }}</div>
        </div>
        <div class="border-b border-gray-100 p-4 dark:border-gray-800">
          <div class="text-xs font-medium text-gray-500 dark:text-gray-400">Specialization</div>
          <div class="mt-1 text-sm text-gray-900 dark:text-gray-100">{{ row.specialization || '-' }}</div>
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
          <div class="text-xs font-medium text-gray-500 dark:text-gray-400">Qualification</div>
          <div class="mt-1 text-sm text-gray-900 dark:text-gray-100">{{ row.qualification || '-' }}</div>
        </div>
        <div class="border-b border-gray-100 p-4 dark:border-gray-800">
          <div class="text-xs font-medium text-gray-500 dark:text-gray-400">Consultation fee</div>
          <div class="mt-1 text-sm text-gray-900 dark:text-gray-100">{{ row.consultation_fee ?? '-' }}</div>
        </div>

        <div class="border-b border-gray-100 p-4 dark:border-gray-800">
          <div class="text-xs font-medium text-gray-500 dark:text-gray-400">Available</div>
          <div class="mt-1 text-sm text-gray-900 dark:text-gray-100">{{ row.is_available ? 'Yes' : 'No' }}</div>
        </div>

        <div class="border-b border-gray-100 p-4 dark:border-gray-800">
          <div class="text-xs font-medium text-gray-500 dark:text-gray-400">Available days</div>
          <div class="mt-1 text-sm text-gray-900 dark:text-gray-100">
            {{ row.is_available ? displayDays(row.available_days) : '-' }}
          </div>
        </div>

        <div class="border-b border-gray-100 p-4 dark:border-gray-800">
          <div class="text-xs font-medium text-gray-500 dark:text-gray-400">Start time</div>
          <div class="mt-1 text-sm text-gray-900 dark:text-gray-100">
            {{ row.is_available ? displayTime(row.start_time) : '-' }}
          </div>
        </div>

        <div class="border-b border-gray-100 p-4 dark:border-gray-800">
          <div class="text-xs font-medium text-gray-500 dark:text-gray-400">End time</div>
          <div class="mt-1 text-sm text-gray-900 dark:text-gray-100">
            {{ row.is_available ? displayTime(row.end_time) : '-' }}
          </div>
        </div>

        <div class="border-b border-gray-100 p-4 dark:border-gray-800">
          <div class="text-xs font-medium text-gray-500 dark:text-gray-400">Created</div>
          <div class="mt-1 text-sm text-gray-900 dark:text-gray-100">{{ row.created_at || '-' }}</div>
        </div>
      </div>
    </div>

    <div v-else class="mt-6 rounded border border-gray-200 bg-white px-4 py-3 text-sm text-gray-600 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300">
      Doctor not found.
    </div>
  </div>
</template>
