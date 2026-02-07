<script setup lang="ts">
import { useAuthStore } from '../../stores/auth'

const auth = useAuthStore()
</script>

<template>
  <div>
    <div class="text-xl font-semibold">Doctor Dashboard</div>
    <div class="mt-2 text-sm text-gray-600">Signed in as {{ auth.user?.email }}</div>

    <div class="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
      <div class="rounded border border-gray-200 bg-white p-4">
        <div class="text-sm font-medium">Appointments</div>
        <div class="text-xs text-gray-500">Accept or decline patient appointment requests</div>
        <router-link class="mt-3 inline-block text-sm underline text-gray-700" to="/doctor/appointments">Go to appointments</router-link>
      </div>
      <div class="rounded border border-gray-200 bg-white p-4">
        <div class="text-sm font-medium">Notifications</div>
        <div class="text-xs text-gray-500">Patient requests and billing alerts</div>
        <router-link class="mt-3 inline-block text-sm underline text-gray-700" to="/doctor/notifications">Go to notifications</router-link>
      </div>
    </div>
  </div>
</template>
