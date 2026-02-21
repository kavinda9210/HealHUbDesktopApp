<script setup lang="ts">
import { onActivated, onMounted, ref } from 'vue'
import { api, ApiError } from '../../lib/api'
import { useAuthStore } from '../../stores/auth'

type AmbulanceRow = {
  ambulance_id: number
  driver_name?: string
  driver_phone?: string
  license_plate?: string
  is_available?: boolean
  email?: string
  created_at?: string
}

const auth = useAuthStore()

const rows = ref<AmbulanceRow[]>([])
const isLoading = ref(false)
const error = ref<string | null>(null)

async function load() {
  isLoading.value = true
  error.value = null
  try {
    const res = await api.get<{ success: boolean; data: AmbulanceRow[] }>('/api/admin/ambulances', {
      token: auth.accessToken,
    })
    rows.value = res.data || []
  } catch (e) {
    error.value = e instanceof ApiError ? e.message : 'Failed to load ambulances'
  } finally {
    isLoading.value = false
  }
}

onMounted(load)
onActivated(load)
</script>

<template>
  <div>
    <div class="text-xl font-semibold">Ambulances</div>

    <div class="mt-6 rounded border border-gray-200 bg-white">
      <div class="flex items-center justify-between border-b border-gray-200 px-4 py-3">
        <div class="text-sm font-medium">Ambulance list</div>
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
              <th class="px-4 py-2">Plate</th>
              <th class="px-4 py-2">Available</th>
              <th class="px-4 py-2">Email</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in rows" :key="r.ambulance_id" class="border-t border-gray-100">
              <td class="px-4 py-2">{{ r.driver_name || '-' }}</td>
              <td class="px-4 py-2">{{ r.driver_phone || '-' }}</td>
              <td class="px-4 py-2">{{ r.license_plate || '-' }}</td>
              <td class="px-4 py-2">{{ r.is_available ? 'Yes' : 'No' }}</td>
              <td class="px-4 py-2">{{ r.email || '-' }}</td>
            </tr>
            <tr v-if="!isLoading && rows.length === 0">
              <td class="px-4 py-4 text-sm text-gray-600" colspan="5">No ambulances found.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
