<script setup lang="ts">
import { useAuthStore } from '../../stores/auth'

const auth = useAuthStore()
</script>

<template>
  <div>
    <div class="text-xl font-semibold">Profile</div>

    <div class="mt-6 rounded border border-gray-200 bg-white p-4">
      <div class="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div>
          <div class="text-xs text-gray-500">Email</div>
          <div class="text-sm">{{ auth.user?.email || '-' }}</div>
        </div>
        <div>
          <div class="text-xs text-gray-500">Name</div>
          <div class="text-sm">{{ auth.user?.full_name || '-' }}</div>
        </div>
        <div>
          <div class="text-xs text-gray-500">Role</div>
          <div class="text-sm">{{ auth.user?.role || '-' }}</div>
        </div>
        <div>
          <div class="text-xs text-gray-500">Phone</div>
          <div class="text-sm">{{ auth.user?.phone || '-' }}</div>
        </div>
      </div>
    </div>
  </div>
</template>
