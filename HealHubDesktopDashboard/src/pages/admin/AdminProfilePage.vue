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
    <div class="text-sm text-gray-500">Your account details</div>

    <div class="mt-6 rounded border border-gray-200 bg-white">
      <div class="grid grid-cols-1 md:grid-cols-2">
        <div class="border-b border-gray-100 p-4">
          <div class="text-xs font-medium text-gray-500">Email</div>
          <div class="mt-1 text-sm text-gray-900">{{ email }}</div>
        </div>
        <div class="border-b border-gray-100 p-4">
          <div class="text-xs font-medium text-gray-500">Role</div>
          <div class="mt-1 text-sm text-gray-900">{{ role }}</div>
        </div>

        <div class="border-b border-gray-100 p-4">
          <div class="text-xs font-medium text-gray-500">Full name</div>
          <div class="mt-1 text-sm text-gray-900">{{ fullName }}</div>
        </div>
        <div class="border-b border-gray-100 p-4">
          <div class="text-xs font-medium text-gray-500">Phone</div>
          <div class="mt-1 text-sm text-gray-900">{{ phone }}</div>
        </div>
      </div>
    </div>
  </div>
</template>
