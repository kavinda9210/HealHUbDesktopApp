<script setup lang="ts">
import { useAuthStore } from '../../stores/auth'

const auth = useAuthStore()
</script>

<template>
  <div>
    <div>
      <div class="text-xl font-semibold">Doctor Dashboard</div>
      <div class="mt-1 text-sm text-gray-600 dark:text-gray-300">Signed in as {{ auth.user?.email }}</div>
    </div>

    <div class="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      <div class="rounded border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
        <div class="flex items-center justify-between">
          <div>
            <div class="text-sm font-medium">Appointments</div>
            <div class="text-xs text-gray-500 dark:text-gray-400">Accept or decline patient appointment requests</div>
          </div>
          <div class="inline-flex h-10 w-10 items-center justify-center rounded bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200">
            <svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M7 3v3" />
              <path d="M17 3v3" />
              <path d="M4 7h16" />
              <path d="M5 6h14a1 1 0 0 1 1 1v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a1 1 0 0 1 1-1" />
              <path d="M8 11h4" />
              <path d="M8 15h6" />
            </svg>
          </div>
        </div>
        <router-link class="mt-4 inline-block text-sm underline text-gray-700 dark:text-gray-200" to="/doctor/appointments">Go to appointments</router-link>
      </div>

      <div class="rounded border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
        <div class="flex items-center justify-between">
          <div>
            <div class="text-sm font-medium">Notifications</div>
            <div class="text-xs text-gray-500 dark:text-gray-400">Patient requests and billing alerts</div>
          </div>
          <div class="inline-flex h-10 w-10 items-center justify-center rounded bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200">
            <svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 7h18s-3 0-3-7" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
          </div>
        </div>
        <router-link class="mt-4 inline-block text-sm underline text-gray-700 dark:text-gray-200" to="/doctor/notifications">Go to notifications</router-link>
      </div>

      <div class="rounded border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
        <div class="flex items-center justify-between">
          <div>
            <div class="text-sm font-medium">Profile</div>
            <div class="text-xs text-gray-500 dark:text-gray-400">Update your account details</div>
          </div>
          <div class="inline-flex h-10 w-10 items-center justify-center rounded bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200">
            <svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 12a4 4 0 1 0-4-4a4 4 0 0 0 4 4" />
              <path d="M4 21v-1a7 7 0 0 1 14 0v1" />
            </svg>
          </div>
        </div>
        <router-link class="mt-4 inline-block text-sm underline text-gray-700 dark:text-gray-200" to="/doctor/profile">Go to profile</router-link>
      </div>
    </div>
  </div>
</template>
