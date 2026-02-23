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
    <div class="text-xl font-semibold hh-title">Profile</div>
    <div class="text-sm hh-muted">Your account details</div>

    <div class="mt-6 hh-card">
      <div class="grid grid-cols-1 md:grid-cols-2">
        <div class="border-b p-4" style="border-color: var(--border)">
          <div class="text-xs font-medium hh-muted">Email</div>
          <div class="mt-1 text-sm" style="color: var(--text-1)">{{ email }}</div>
        </div>
        <div class="border-b p-4" style="border-color: var(--border)">
          <div class="text-xs font-medium hh-muted">Role</div>
          <div class="mt-1 text-sm" style="color: var(--text-1)">{{ role }}</div>
        </div>

        <div class="border-b p-4" style="border-color: var(--border)">
          <div class="text-xs font-medium hh-muted">Full name</div>
          <div class="mt-1 text-sm" style="color: var(--text-1)">{{ fullName }}</div>
        </div>
        <div class="border-b p-4" style="border-color: var(--border)">
          <div class="text-xs font-medium hh-muted">Phone</div>
          <div class="mt-1 text-sm" style="color: var(--text-1)">{{ phone }}</div>
        </div>
      </div>
    </div>
  </div>
</template>
