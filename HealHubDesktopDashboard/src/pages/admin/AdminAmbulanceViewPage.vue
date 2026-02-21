<script setup lang="ts">
import { computed, onActivated, onMounted, ref } from 'vue'
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
  role?: string
  user_is_active?: boolean
  user_is_verified?: boolean
  user_created_at?: string
}

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()

const ambulanceId = computed(() => {
  const raw = route.params.ambulanceId
  const n = Number(raw)
  return Number.isFinite(n) ? n : NaN
})

const row = ref<AmbulanceRow | null>(null)
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

  if (notice === 'ambulance_updated') showSuccess('Ambulance staff updated successfully.')

  const nextQuery: LocationQueryRaw = { ...route.query }
  delete (nextQuery as any).notice
  router.replace({ query: nextQuery })
}

async function load() {
  if (!Number.isFinite(ambulanceId.value)) {
    error.value = 'Invalid ambulance id'
    return
  }

  isLoading.value = true
  error.value = null
  try {
    const res = await api.get<{ success: boolean; data: AmbulanceRow }>(`/api/admin/ambulances/${ambulanceId.value}`, {
      token: auth.accessToken,
    })
    row.value = res.data
  } catch (e) {
    error.value = e instanceof ApiError ? e.message : 'Failed to load ambulance staff'
  } finally {
    isLoading.value = false
  }
}

async function deleteAmbulance() {
  if (!row.value) return
  if (!confirm('Delete this ambulance staff?')) return
  actionError.value = null
  try {
    await api.del(`/api/admin/ambulances/${row.value.ambulance_id}`, { token: auth.accessToken })
    router.replace({ path: '/admin/ambulances', query: { notice: 'ambulance_deleted' } })
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
        <div class="text-xl font-semibold">Ambulance staff details</div>
        <div class="text-sm text-gray-500">View ambulance staff information</div>
      </div>

      <div class="flex items-center gap-2">
        <router-link class="rounded border border-gray-300 px-3 py-2 text-sm" to="/admin/ambulances">Back</router-link>
        <router-link v-if="row" class="rounded border border-gray-300 px-3 py-2 text-sm" :to="`/admin/ambulances/${row.ambulance_id}/edit`">Edit</router-link>
        <router-link v-if="row" class="rounded border border-gray-300 px-3 py-2 text-sm" :to="`/admin/ambulances/${row.ambulance_id}/alerts`">Alerts</router-link>
        <button v-if="row" class="rounded bg-gray-900 px-3 py-2 text-sm text-white" @click="deleteAmbulance">Delete</button>
      </div>
    </div>

    <div v-if="success" class="mt-6 rounded border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">{{ success }}</div>
    <div v-if="actionError" class="mt-6 rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{{ actionError }}</div>

    <div v-if="error" class="mt-6 rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{{ error }}</div>
    <div v-else-if="isLoading && !row" class="mt-6 rounded border border-gray-200 bg-white px-4 py-3 text-sm text-gray-600">Loading…</div>

    <div v-else-if="row" class="mt-6 rounded border border-gray-200 bg-white">
      <div v-if="isLoading" class="border-b border-gray-100 px-4 py-2 text-xs text-gray-500">Refreshing…</div>
      <div class="grid grid-cols-1 gap-0 md:grid-cols-2">
        <div class="border-b border-gray-100 p-4">
          <div class="text-xs font-medium text-gray-500">Ambulance number</div>
          <div class="mt-1 text-sm text-gray-900">{{ row.ambulance_number || '-' }}</div>
        </div>
        <div class="border-b border-gray-100 p-4">
          <div class="text-xs font-medium text-gray-500">Driver name</div>
          <div class="mt-1 text-sm text-gray-900">{{ row.driver_name || '-' }}</div>
        </div>

        <div class="border-b border-gray-100 p-4">
          <div class="text-xs font-medium text-gray-500">Email</div>
          <div class="mt-1 text-sm text-gray-900">{{ row.email || '-' }}</div>
        </div>
        <div class="border-b border-gray-100 p-4">
          <div class="text-xs font-medium text-gray-500">Driver phone</div>
          <div class="mt-1 text-sm text-gray-900">{{ row.driver_phone || '-' }}</div>
        </div>

        <div class="border-b border-gray-100 p-4">
          <div class="text-xs font-medium text-gray-500">Available</div>
          <div class="mt-1 text-sm text-gray-900">{{ row.is_available ? 'Yes' : 'No' }}</div>
        </div>
        <div class="border-b border-gray-100 p-4">
          <div class="text-xs font-medium text-gray-500">Created</div>
          <div class="mt-1 text-sm text-gray-900">{{ row.created_at || '-' }}</div>
        </div>
      </div>
    </div>

    <div v-else class="mt-6 rounded border border-gray-200 bg-white px-4 py-3 text-sm text-gray-600">Ambulance staff not found.</div>
  </div>
</template>
