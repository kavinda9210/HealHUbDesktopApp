<script setup lang="ts">
import { onActivated, onMounted, ref } from 'vue'
import { api, ApiError } from '../../lib/api'
import { useAuthStore } from '../../stores/auth'

type NotificationRow = {
  notification_id?: number
  title?: string
  message?: string
  type?: string
  is_read?: boolean
  created_at?: string
}

const auth = useAuthStore()

const rows = ref<NotificationRow[]>([])
const isLoading = ref(false)
const error = ref<string | null>(null)

async function load() {
  isLoading.value = true
  error.value = null
  try {
    const res = await api.get<{ success: boolean; data: NotificationRow[] }>(
      '/api/auth/notifications',
      { token: auth.accessToken, query: { limit: 50 } },
    )
    rows.value = res.data || []
  } catch (e) {
    error.value = e instanceof ApiError ? e.message : 'Failed to load notifications'
  } finally {
    isLoading.value = false
  }
}

onMounted(load)
onActivated(load)
</script>

<template>
  <div>
    <div class="flex items-center justify-between">
      <div>
        <div class="text-xl font-semibold">Notifications</div>
        <div class="text-sm text-gray-500 dark:text-gray-400">Latest notifications for your account</div>
      </div>
      <button
        class="rounded border border-gray-300 px-3 py-1.5 text-sm dark:border-gray-700 dark:text-gray-100"
        @click="load"
        :disabled="isLoading"
      >
        Refresh
      </button>
    </div>

    <div class="mt-6 rounded border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
      <div v-if="error" class="px-4 py-3 text-sm text-red-700 dark:text-red-200">{{ error }}</div>
      <div v-else-if="isLoading" class="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">Loading…</div>

      <div class="divide-y divide-gray-100 dark:divide-gray-800">
        <div v-for="n in rows" :key="n.notification_id || n.created_at" class="px-4 py-3">
          <div class="flex items-start justify-between gap-4">
            <div>
              <div class="text-sm font-medium text-gray-900 dark:text-gray-100">{{ n.title || 'Notification' }}</div>
              <div class="mt-1 text-sm text-gray-700 dark:text-gray-300">{{ n.message || '-' }}</div>
              <div class="mt-2 text-xs text-gray-500 dark:text-gray-400">
                <span v-if="n.type">{{ n.type }}</span>
                <span v-if="n.type && n.created_at"> · </span>
                <span v-if="n.created_at">{{ n.created_at }}</span>
              </div>
            </div>
            <div class="text-xs text-gray-500 dark:text-gray-400">{{ n.is_read ? 'Read' : 'Unread' }}</div>
          </div>
        </div>

        <div v-if="!isLoading && rows.length === 0" class="px-4 py-4 text-sm text-gray-600 dark:text-gray-300">
          No notifications.
        </div>
      </div>
    </div>
  </div>
</template>
