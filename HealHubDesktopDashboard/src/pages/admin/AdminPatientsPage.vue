<script setup lang="ts">
import { onActivated, onMounted, ref } from 'vue'
import { type LocationQueryRaw, useRoute, useRouter } from 'vue-router'
import { api, ApiError } from '../../lib/api'
import { useAuthStore } from '../../stores/auth'

type PatientRow = {
  patient_id: number
  user_id?: string
  full_name?: string
  phone?: string
  email?: string
  dob?: string
  gender?: string
  address?: string
  created_at?: string
}

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()

const rows = ref<PatientRow[]>([])
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

const filters = ref({
  q: '',
})

function consumeNotice() {
  const notice = route.query.notice
  if (typeof notice !== 'string' || !notice) {
    success.value = null
    actionError.value = null
    return
  }

  if (notice === 'patient_created') showSuccess('Patient created successfully.')
  else if (notice === 'patient_updated') showSuccess('Patient updated successfully.')
  else if (notice === 'patient_deleted') showSuccess('Patient deleted successfully.')

  const nextQuery: LocationQueryRaw = { ...route.query }
  delete (nextQuery as any).notice
  router.replace({ query: nextQuery })
}

async function load() {
  isLoading.value = true
  error.value = null
  try {
    const res = await api.get<{ success: boolean; data: PatientRow[] }>('/api/admin/patients', {
      token: auth.accessToken,
      query: {
        q: filters.value.q.trim() || undefined,
      },
    })
    rows.value = res.data || []
  } catch (e) {
    error.value = e instanceof ApiError ? e.message : 'Failed to load patients'
  } finally {
    isLoading.value = false
  }
}

async function applyFilters() {
  success.value = null
  actionError.value = null
  await load()
}

async function clearFilters() {
  filters.value = { q: '' }
  success.value = null
  actionError.value = null
  await load()
}

async function deletePatient(patientId: number) {
  if (!confirm('Delete this patient?')) return
  actionError.value = null
  success.value = null
  try {
    await api.del(`/api/admin/patients/${patientId}`, { token: auth.accessToken })
    showSuccess('Patient deleted successfully.')
    await load()
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
        <div class="text-xl font-semibold hh-title">Patients</div>
        <div class="text-sm hh-muted">Manage patients</div>
      </div>
      <div class="flex items-center gap-2">
        <router-link class="hh-btn-primary px-4 py-2 text-sm" to="/admin/patients/create">
          Create patient
        </router-link>
      </div>
    </div>

    <div
      v-if="success"
      class="mt-4 rounded border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700 dark:border-green-900 dark:bg-green-950 dark:text-green-200"
    >
      {{ success }}
    </div>
    <div
      v-if="actionError"
      class="mt-4 rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-200"
    >
      {{ actionError }}
    </div>

    <div class="mt-4 hh-card p-4">
      <div class="text-sm font-medium hh-title">Filter patients</div>
      <form class="mt-3 grid grid-cols-1 gap-3 md:grid-cols-4" @submit.prevent="applyFilters">
        <div class="md:col-span-2">
          <label class="block text-xs font-medium hh-muted">Name</label>
          <input
            v-model="filters.q"
            class="mt-1 hh-input px-3 py-2 text-sm"
            placeholder="Search by name"
          />
        </div>

        <div class="md:col-span-4 flex items-center gap-2">
          <button class="hh-btn-primary px-4 py-2 text-sm" :disabled="isLoading">
            Apply filters
          </button>
          <button
            type="button"
            class="hh-btn px-4 py-2 text-sm"
            @click="clearFilters"
            :disabled="isLoading"
          >
            Clear
          </button>
        </div>
      </form>
    </div>

    <div class="mt-6 hh-card">
      <div class="flex items-center justify-between border-b px-4 py-3" style="border-color: var(--border)">
        <div class="text-sm font-medium hh-title">Patient list</div>
        <button
          class="hh-btn px-3 py-1.5 text-sm"
          @click="load"
          :disabled="isLoading"
        >
          Refresh
        </button>
      </div>

      <div v-if="error" class="px-4 py-3 text-sm text-red-700 dark:text-red-200">{{ error }}</div>
      <div v-else-if="isLoading" class="px-4 py-3 text-sm hh-muted">Loading…</div>

      <div class="overflow-auto">
        <table class="min-w-full text-left text-sm" style="color: var(--text-1)">
          <thead class="hh-thead text-xs">
            <tr>
              <th class="px-4 py-2">Name</th>
              <th class="px-4 py-2">Email</th>
              <th class="px-4 py-2">Phone</th>
              <th class="px-4 py-2">DOB</th>
              <th class="px-4 py-2">Gender</th>
              <th class="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in rows" :key="r.patient_id" class="hh-row">
              <td class="px-4 py-2">{{ r.full_name || '-' }}</td>
              <td class="px-4 py-2">{{ r.email || '-' }}</td>
              <td class="px-4 py-2">{{ r.phone || '-' }}</td>
              <td class="px-4 py-2">{{ r.dob || '-' }}</td>
              <td class="px-4 py-2">{{ r.gender || '-' }}</td>
              <td class="px-4 py-2 text-right">
                <div class="flex justify-end gap-2">
                  <router-link
                    class="hh-btn px-3 py-1.5 text-xs"
                    :to="`/admin/patients/${r.patient_id}`"
                  >
                    View
                  </router-link>
                  <router-link
                    class="hh-btn px-3 py-1.5 text-xs"
                    :to="`/admin/patients/${r.patient_id}/edit`"
                  >
                    Edit
                  </router-link>
                  <router-link
                    class="hh-btn px-3 py-1.5 text-xs"
                    :to="`/admin/patients/${r.patient_id}/alerts`"
                  >
                    Alerts
                  </router-link>
                  <button
                    class="hh-btn px-3 py-1.5 text-xs"
                    @click="deletePatient(r.patient_id)"
                  >
                    Delete
                  </button>
                </div>
              </td>
            </tr>
            <tr v-if="!isLoading && rows.length === 0">
              <td class="px-4 py-4 text-sm hh-muted" colspan="6">No patients found.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
