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
        <div class="text-xl font-semibold hh-title">Doctor details</div>
        <div class="text-sm hh-muted">View doctor profile information</div>
      </div>

      <div class="flex items-center gap-2">
        <router-link class="hh-btn px-3 py-2 text-sm" to="/admin/doctors">
          Back
        </router-link>
        <router-link
          v-if="row"
          class="hh-btn px-3 py-2 text-sm"
          :to="`/admin/doctors/${row.doctor_id}/edit`"
        >
          Edit
        </router-link>
        <router-link
          v-if="row"
          class="hh-btn px-3 py-2 text-sm"
          :to="`/admin/doctors/${row.doctor_id}/alerts`"
        >
          Alerts
        </router-link>
        <button v-if="row" class="hh-btn px-3 py-2 text-sm" @click="deleteDoctor">
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
      class="mt-6 hh-card-subtle px-4 py-3 text-sm hh-muted"
    >
      Loading…
    </div>

    <div v-else-if="row" class="mt-6 hh-card">
      <div v-if="isLoading" class="border-b px-4 py-2 text-xs hh-muted" style="border-color: var(--border)">Refreshing…</div>
      <div class="grid grid-cols-1 gap-0 md:grid-cols-2">
        <div class="border-b p-4" style="border-color: var(--border)">
          <div class="text-xs font-medium hh-muted">Full name</div>
          <div class="mt-1 text-sm" style="color: var(--text-1)">{{ row.full_name }}</div>
        </div>
        <div class="border-b p-4" style="border-color: var(--border)">
          <div class="text-xs font-medium hh-muted">Specialization</div>
          <div class="mt-1 text-sm" style="color: var(--text-1)">{{ row.specialization || '-' }}</div>
        </div>

        <div class="border-b p-4" style="border-color: var(--border)">
          <div class="text-xs font-medium hh-muted">Email</div>
          <div class="mt-1 text-sm" style="color: var(--text-1)">{{ row.email || '-' }}</div>
        </div>
        <div class="border-b p-4" style="border-color: var(--border)">
          <div class="text-xs font-medium hh-muted">Phone</div>
          <div class="mt-1 text-sm" style="color: var(--text-1)">{{ row.phone || '-' }}</div>
        </div>

        <div class="border-b p-4" style="border-color: var(--border)">
          <div class="text-xs font-medium hh-muted">Qualification</div>
          <div class="mt-1 text-sm" style="color: var(--text-1)">{{ row.qualification || '-' }}</div>
        </div>
        <div class="border-b p-4" style="border-color: var(--border)">
          <div class="text-xs font-medium hh-muted">Consultation fee</div>
          <div class="mt-1 text-sm" style="color: var(--text-1)">{{ row.consultation_fee ?? '-' }}</div>
        </div>

        <div class="border-b p-4" style="border-color: var(--border)">
          <div class="text-xs font-medium hh-muted">Available</div>
          <div class="mt-1 text-sm" style="color: var(--text-1)">{{ row.is_available ? 'Yes' : 'No' }}</div>
        </div>

        <div class="border-b p-4" style="border-color: var(--border)">
          <div class="text-xs font-medium hh-muted">Available days</div>
          <div class="mt-1 text-sm" style="color: var(--text-1)">
            {{ row.is_available ? displayDays(row.available_days) : '-' }}
          </div>
        </div>

        <div class="border-b p-4" style="border-color: var(--border)">
          <div class="text-xs font-medium hh-muted">Start time</div>
          <div class="mt-1 text-sm" style="color: var(--text-1)">
            {{ row.is_available ? displayTime(row.start_time) : '-' }}
          </div>
        </div>

        <div class="border-b p-4" style="border-color: var(--border)">
          <div class="text-xs font-medium hh-muted">End time</div>
          <div class="mt-1 text-sm" style="color: var(--text-1)">
            {{ row.is_available ? displayTime(row.end_time) : '-' }}
          </div>
        </div>

        <div class="border-b p-4" style="border-color: var(--border)">
          <div class="text-xs font-medium hh-muted">Created</div>
          <div class="mt-1 text-sm" style="color: var(--text-1)">{{ row.created_at || '-' }}</div>
        </div>
      </div>
    </div>

    <div v-else class="mt-6 hh-card-subtle px-4 py-3 text-sm hh-muted">
      Doctor not found.
    </div>
  </div>
</template>
