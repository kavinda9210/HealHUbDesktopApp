<script setup lang="ts">
import { onActivated, onMounted, ref } from 'vue'
import { api, ApiError } from '../../lib/api'
import { useAuthStore } from '../../stores/auth'

const auth = useAuthStore()

type DashboardStats = {
  doctors: number
  patients: number
  ambulances: number
  new_users: number
  new_users_since?: string
  as_of?: string
}

const stats = ref<DashboardStats | null>(null)
const isLoading = ref(false)
const error = ref<string | null>(null)

async function load() {
  isLoading.value = true
  error.value = null
  try {
    const res = await api.get<{ success: boolean; data: DashboardStats }>('/api/admin/dashboard-stats', {
      token: auth.accessToken,
    })
    stats.value = res.data
  } catch (e) {
    error.value = e instanceof ApiError ? e.message : 'Failed to load dashboard stats'
  } finally {
    isLoading.value = false
  }
}

onMounted(load)
onActivated(load)
</script>

<template>
  <div>
    <div class="flex items-start justify-between gap-4">
      <div>
        <div class="text-xl font-semibold">Admin Dashboard</div>
        <div class="mt-1 text-sm text-gray-600">Signed in as {{ auth.user?.email }}</div>
      </div>
      <div>
        <button class="rounded border border-gray-300 px-3 py-2 text-sm" @click="load" :disabled="isLoading">
          Refresh
        </button>
      </div>
    </div>

    <div v-if="error" class="mt-4 rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200">{{ error }}</div>

    <div class="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
      <div class="rounded border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
        <div class="flex items-center justify-between">
          <div class="text-xs font-medium text-gray-500 dark:text-gray-400">Doctors</div>
          <div class="inline-flex h-9 w-9 items-center justify-center rounded bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200">
            <svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M8 7a4 4 0 1 0 8 0a4 4 0 1 0-8 0" />
              <path d="M6 21v-1a6 6 0 0 1 12 0v1" />
              <path d="M12 10v4" />
              <path d="M10 12h4" />
            </svg>
          </div>
        </div>
        <div class="mt-2 text-3xl font-semibold text-gray-900 dark:text-gray-100">{{ stats?.doctors ?? (isLoading ? '…' : '-') }}</div>
        <router-link class="mt-3 inline-block text-sm underline text-gray-700 dark:text-gray-200" to="/admin/doctors">Manage doctors</router-link>
      </div>

      <div class="rounded border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
        <div class="flex items-center justify-between">
          <div class="text-xs font-medium text-gray-500 dark:text-gray-400">Patients</div>
          <div class="inline-flex h-9 w-9 items-center justify-center rounded bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200">
            <svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M9 6a3 3 0 1 0 6 0a3 3 0 1 0-6 0" />
              <path d="M4 21v-1a7 7 0 0 1 14 0v1" />
              <path d="M19 8v6" />
              <path d="M16 11h6" />
            </svg>
          </div>
        </div>
        <div class="mt-2 text-3xl font-semibold text-gray-900 dark:text-gray-100">{{ stats?.patients ?? (isLoading ? '…' : '-') }}</div>
        <router-link class="mt-3 inline-block text-sm underline text-gray-700 dark:text-gray-200" to="/admin/patients">Manage patients</router-link>
      </div>

      <div class="rounded border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
        <div class="flex items-center justify-between">
          <div class="text-xs font-medium text-gray-500 dark:text-gray-400">Ambulance staff</div>
          <div class="inline-flex h-9 w-9 items-center justify-center rounded bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200">
            <svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M3 16v-5a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v5" />
              <path d="M16 12h2a3 3 0 0 1 3 3v1h-5" />
              <path d="M6.5 20a1.5 1.5 0 1 0 0-3a1.5 1.5 0 0 0 0 3" />
              <path d="M17.5 20a1.5 1.5 0 1 0 0-3a1.5 1.5 0 0 0 0 3" />
              <path d="M7 12h4" />
              <path d="M9 10v4" />
            </svg>
          </div>
        </div>
        <div class="mt-2 text-3xl font-semibold text-gray-900 dark:text-gray-100">{{ stats?.ambulances ?? (isLoading ? '…' : '-') }}</div>
        <router-link class="mt-3 inline-block text-sm underline text-gray-700 dark:text-gray-200" to="/admin/ambulances">Manage ambulance staff</router-link>
      </div>

      <div class="rounded border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
        <div class="flex items-center justify-between">
          <div class="text-xs font-medium text-gray-500 dark:text-gray-400">New users (7 days)</div>
          <div class="inline-flex h-9 w-9 items-center justify-center rounded bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200">
            <svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 8v4l3 3" />
              <path d="M21 12a9 9 0 1 1-18 0a9 9 0 0 1 18 0" />
            </svg>
          </div>
        </div>
        <div class="mt-2 text-3xl font-semibold text-gray-900 dark:text-gray-100">{{ stats?.new_users ?? (isLoading ? '…' : '-') }}</div>
        <div class="mt-3 text-xs text-gray-500 dark:text-gray-400">Updated {{ stats?.as_of || '—' }}</div>
      </div>
    </div>
  </div>
</template>
