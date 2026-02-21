<script setup lang="ts">
import { onActivated, onMounted, ref } from 'vue'
import { api, ApiError } from '../../lib/api'
import { useAuthStore } from '../../stores/auth'

type PatientRow = {
  patient_id: number
  full_name?: string
  phone?: string
  email?: string
  dob?: string
  gender?: string
  created_at?: string
}

const auth = useAuthStore()

const rows = ref<PatientRow[]>([])
const isLoading = ref(false)
const error = ref<string | null>(null)

async function load() {
  isLoading.value = true
  error.value = null
  try {
    const res = await api.get<{ success: boolean; data: PatientRow[] }>('/api/admin/patients', {
      token: auth.accessToken,
    })
    rows.value = res.data || []
  } catch (e) {
    error.value = e instanceof ApiError ? e.message : 'Failed to load patients'
  } finally {
    isLoading.value = false
  }
}

onMounted(load)
onActivated(load)
</script>

<template>
  <div>
    <div class="text-xl font-semibold">Patients</div>

    <div class="mt-6 rounded border border-gray-200 bg-white">
      <div class="flex items-center justify-between border-b border-gray-200 px-4 py-3">
        <div class="text-sm font-medium">Patient list</div>
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
              <th class="px-4 py-2">Name</th>
              <th class="px-4 py-2">Email</th>
              <th class="px-4 py-2">Phone</th>
              <th class="px-4 py-2">DOB</th>
              <th class="px-4 py-2">Gender</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in rows" :key="r.patient_id" class="border-t border-gray-100">
              <td class="px-4 py-2">{{ r.full_name || '-' }}</td>
              <td class="px-4 py-2">{{ r.email || '-' }}</td>
              <td class="px-4 py-2">{{ r.phone || '-' }}</td>
              <td class="px-4 py-2">{{ r.dob || '-' }}</td>
              <td class="px-4 py-2">{{ r.gender || '-' }}</td>
            </tr>
            <tr v-if="!isLoading && rows.length === 0">
              <td class="px-4 py-4 text-sm text-gray-600" colspan="5">No patients found.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
