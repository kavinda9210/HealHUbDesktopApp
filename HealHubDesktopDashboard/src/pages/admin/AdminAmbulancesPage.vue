<script setup lang="ts">
import { onActivated, onMounted, ref } from 'vue'
import { type LocationQueryRaw, useRoute, useRouter } from 'vue-router'
import { api, ApiError } from '../../lib/api'
import { useAuthStore } from '../../stores/auth'

type AmbulanceRow = {
  ambulance_id: number
  user_id: string
  ambulance_number?: string
  driver_name?: string
  driver_phone?: string
  is_available?: boolean
  email?: string
  created_at?: string
}

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()

const rows = ref<AmbulanceRow[]>([])
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

  if (notice === 'ambulance_created') showSuccess('Ambulance staff created successfully.')
  else if (notice === 'ambulance_updated') showSuccess('Ambulance staff updated successfully.')
  else if (notice === 'ambulance_deleted') showSuccess('Ambulance staff deleted successfully.')

  const nextQuery: LocationQueryRaw = { ...route.query }
  delete (nextQuery as any).notice
  router.replace({ query: nextQuery })
}

async function load() {
  isLoading.value = true
  error.value = null
  try {
    const res = await api.get<{ success: boolean; data: AmbulanceRow[] }>('/api/admin/ambulances', {
      token: auth.accessToken,
      query: {
        q: filters.value.q.trim() || undefined,
      },
    })
    rows.value = res.data || []
  } catch (e) {
    error.value = e instanceof ApiError ? e.message : 'Failed to load ambulance staff'
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

async function deleteAmbulance(ambulanceId: number) {
  if (!confirm('Delete this ambulance staff?')) return
  actionError.value = null
  success.value = null
  try {
    await api.del(`/api/admin/ambulances/${ambulanceId}`, { token: auth.accessToken })
    showSuccess('Ambulance staff deleted successfully.')
    await load()
  } catch (e) {
    showError(e instanceof ApiError ? e.message : 'Failed to delete ambulance staff')
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
        <div class="text-xl font-semibold hh-title">Ambulances</div>
        <div class="text-sm hh-muted">Manage ambulance staff</div>
      </div>
      <div class="flex items-center gap-2">
        <router-link class="hh-btn-primary px-4 py-2 text-sm" to="/admin/ambulances/create">
          Create ambulance staff
        </router-link>
      </div>
    </div>

    <div v-if="success" class="mt-4 rounded border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700 dark:border-green-900/60 dark:bg-green-950/40 dark:text-green-200">
      {{ success }}
    </div>
    <div v-if="actionError" class="mt-4 rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200">
      {{ actionError }}
    </div>

    <div class="mt-4 hh-card p-4">
      <div class="text-sm font-medium hh-title">Filter ambulance staff</div>
      <form class="mt-3 grid grid-cols-1 gap-3 md:grid-cols-4" @submit.prevent="applyFilters">
        <div class="md:col-span-2">
          <label class="block text-xs font-medium hh-muted">Driver name</label>
          <input v-model="filters.q" class="mt-1 hh-input px-3 py-2 text-sm" placeholder="Search by driver name" />
        </div>

        <div class="md:col-span-4 flex items-center gap-2">
          <button class="hh-btn-primary px-4 py-2 text-sm" :disabled="isLoading">
            Apply filters
          </button>
          <button type="button" class="hh-btn px-4 py-2 text-sm" @click="clearFilters" :disabled="isLoading">
            Clear
          </button>
        </div>
      </form>
    </div>

    <div class="mt-6 hh-card">
      <div class="flex items-center justify-between border-b px-4 py-3" style="border-color: var(--border)">
        <div class="text-sm font-medium hh-title">Ambulance staff list</div>
        <button class="hh-btn px-3 py-1.5 text-sm" @click="load" :disabled="isLoading">
          Refresh
        </button>
      </div>

      <div v-if="error" class="px-4 py-3 text-sm text-red-700 dark:text-red-200">{{ error }}</div>
      <div v-else-if="isLoading" class="px-4 py-3 text-sm hh-muted">Loading…</div>

      <div class="overflow-auto">
        <table class="min-w-full text-left text-sm" style="color: var(--text-1)">
          <thead class="hh-thead text-xs">
            <tr>
              <th class="px-4 py-2">Driver</th>
              <th class="px-4 py-2">Phone</th>
              <th class="px-4 py-2">Available</th>
              <th class="px-4 py-2">Email</th>
              <th class="px-4 py-2">Ambulance number</th>
              <th class="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in rows" :key="r.ambulance_id" class="hh-row">
              <td class="px-4 py-2">{{ r.driver_name || '-' }}</td>
              <td class="px-4 py-2">{{ r.driver_phone || '-' }}</td>
              <td class="px-4 py-2">{{ r.is_available ? 'Yes' : 'No' }}</td>
              <td class="px-4 py-2">{{ r.email || '-' }}</td>
              <td class="px-4 py-2">{{ r.ambulance_number || '-' }}</td>
              <td class="px-4 py-2 text-right">
                <div class="flex justify-end gap-2">
                  <router-link class="hh-btn px-3 py-1.5 text-xs" :to="`/admin/ambulances/${r.ambulance_id}`">
                    View
                  </router-link>
                  <router-link class="hh-btn px-3 py-1.5 text-xs" :to="`/admin/ambulances/${r.ambulance_id}/edit`">
                    Edit
                  </router-link>
                  <router-link class="hh-btn px-3 py-1.5 text-xs" :to="`/admin/ambulances/${r.ambulance_id}/alerts`">
                    Alerts
                  </router-link>
                  <button class="hh-btn px-3 py-1.5 text-xs" @click="deleteAmbulance(r.ambulance_id)">
                    Delete
                  </button>
                </div>
              </td>
            </tr>
            <tr v-if="!isLoading && rows.length === 0">
              <td class="px-4 py-4 text-sm hh-muted" colspan="7">No ambulance staff found.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
