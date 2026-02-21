<script setup lang="ts">
import { useAuthStore } from '../../stores/auth'

const auth = useAuthStore()
</script>

<template>
  <div>
    <div class="text-xl font-semibold">Profile</div>

    <div class="mt-6 rounded border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
      <div class="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div>
          <div class="text-xs text-gray-500 dark:text-gray-400">Email</div>
          <div class="text-sm text-gray-900 dark:text-gray-100">{{ auth.user?.email || '-' }}</div>
        </div>
        <div>
          <div class="text-xs text-gray-500 dark:text-gray-400">Name</div>
          <div class="text-sm text-gray-900 dark:text-gray-100">{{ auth.user?.full_name || '-' }}</div>
        </div>
        <div>
          <div class="text-xs text-gray-500 dark:text-gray-400">Role</div>
          <div class="text-sm text-gray-900 dark:text-gray-100">{{ auth.user?.role || '-' }}</div>
        </div>
        <div>
          <div class="text-xs text-gray-500 dark:text-gray-400">Phone</div>
          <div class="text-sm text-gray-900 dark:text-gray-100">{{ auth.user?.phone || '-' }}</div>
        </div>
      </div>
    </div>
  </div>
</template>
