<script setup lang="ts">
import { computed } from 'vue'
import { useAuthStore } from '../../stores/auth'

const auth = useAuthStore()

const email = computed(() => auth.user?.email || '-')
const role = computed(() => auth.user?.role || '-')
const fullName = computed(() => auth.user?.full_name || '-')
const phone = computed(() => auth.user?.phone || '-')
</script>

<template>
  <div>
    <div class="text-xl font-semibold">Profile</div>
    <div class="text-sm text-gray-500 dark:text-gray-400">Your account details</div>

    <div class="mt-6 rounded border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
      <div class="grid grid-cols-1 md:grid-cols-2">
        <div class="border-b border-gray-100 p-4 dark:border-gray-800">
          <div class="text-xs font-medium text-gray-500 dark:text-gray-400">Email</div>
          <div class="mt-1 text-sm text-gray-900 dark:text-gray-100">{{ email }}</div>
        </div>
        <div class="border-b border-gray-100 p-4 dark:border-gray-800">
          <div class="text-xs font-medium text-gray-500 dark:text-gray-400">Role</div>
          <div class="mt-1 text-sm text-gray-900 dark:text-gray-100">{{ role }}</div>
        </div>

        <div class="border-b border-gray-100 p-4 dark:border-gray-800">
          <div class="text-xs font-medium text-gray-500 dark:text-gray-400">Full name</div>
          <div class="mt-1 text-sm text-gray-900 dark:text-gray-100">{{ fullName }}</div>
        </div>
        <div class="border-b border-gray-100 p-4 dark:border-gray-800">
          <div class="text-xs font-medium text-gray-500 dark:text-gray-400">Phone</div>
          <div class="mt-1 text-sm text-gray-900 dark:text-gray-100">{{ phone }}</div>
        </div>
      </div>
    </div>
  </div>
</template>
