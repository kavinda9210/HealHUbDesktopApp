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
        <div class="text-xl font-semibold">Ambulances</div>
        <div class="text-sm text-gray-500">Manage ambulance staff</div>
      </div>
      <div class="flex items-center gap-2">
        <router-link class="rounded bg-gray-900 px-4 py-2 text-sm text-white" to="/admin/ambulances/create">
          Create ambulance staff
        </router-link>
      </div>
    </div>

    <div v-if="success" class="mt-4 rounded border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
      {{ success }}
    </div>
    <div v-if="actionError" class="mt-4 rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
      {{ actionError }}
    </div>

    <div class="mt-4 rounded border border-gray-200 bg-white p-4">
      <div class="text-sm font-medium">Filter ambulance staff</div>
      <form class="mt-3 grid grid-cols-1 gap-3 md:grid-cols-4" @submit.prevent="applyFilters">
        <div class="md:col-span-2">
          <label class="block text-xs font-medium text-gray-600">Driver name</label>
          <input v-model="filters.q" class="mt-1 w-full rounded border border-gray-300 px-3 py-2" placeholder="Search by driver name" />
        </div>

        <div class="md:col-span-4 flex items-center gap-2">
          <button class="rounded bg-gray-900 px-4 py-2 text-sm text-white disabled:opacity-60" :disabled="isLoading">
            Apply filters
          </button>
          <button type="button" class="rounded border border-gray-300 px-4 py-2 text-sm" @click="clearFilters" :disabled="isLoading">
            Clear
          </button>
        </div>
      </form>
    </div>

    <div class="mt-6 rounded border border-gray-200 bg-white">
      <div class="flex items-center justify-between border-b border-gray-200 px-4 py-3">
        <div class="text-sm font-medium">Ambulance staff list</div>
        <button class="rounded border border-gray-300 px-3 py-1.5 text-sm" @click="load" :disabled="isLoading">
          Refresh
        </button>
      </div>

      <div v-if="error" class="px-4 py-3 text-sm text-red-700">{{ error }}</div>
      <div v-else-if="isLoading" class="px-4 py-3 text-sm text-gray-600">Loading…</div>

      <div class="overflow-auto">
        <table class="min-w-full text-left text-sm">
          <thead class="bg-gray-50 text-xs text-gray-600">
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
            <tr v-for="r in rows" :key="r.ambulance_id" class="border-t border-gray-100">
              <td class="px-4 py-2">{{ r.driver_name || '-' }}</td>
              <td class="px-4 py-2">{{ r.driver_phone || '-' }}</td>
              <td class="px-4 py-2">{{ r.is_available ? 'Yes' : 'No' }}</td>
              <td class="px-4 py-2">{{ r.email || '-' }}</td>
              <td class="px-4 py-2">{{ r.ambulance_number || '-' }}</td>
              <td class="px-4 py-2 text-right">
                <div class="flex justify-end gap-2">
                  <router-link class="rounded border border-gray-300 px-3 py-1.5 text-xs" :to="`/admin/ambulances/${r.ambulance_id}`">
                    View
                  </router-link>
                  <router-link class="rounded border border-gray-300 px-3 py-1.5 text-xs" :to="`/admin/ambulances/${r.ambulance_id}/edit`">
                    Edit
                  </router-link>
                  <router-link class="rounded border border-gray-300 px-3 py-1.5 text-xs" :to="`/admin/ambulances/${r.ambulance_id}/alerts`">
                    Alerts
                  </router-link>
                  <button class="rounded border border-gray-300 px-3 py-1.5 text-xs" @click="deleteAmbulance(r.ambulance_id)">
                    Delete
                  </button>
                </div>
              </td>
            </tr>
            <tr v-if="!isLoading && rows.length === 0">
              <td class="px-4 py-4 text-sm text-gray-600" colspan="7">No ambulance staff found.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
