<script setup lang="ts">
import { onBeforeUnmount, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore, homePathForRole } from '../stores/auth'

const router = useRouter()
const auth = useAuthStore()

let timer: number | null = null

onMounted(() => {
  auth.initFromStorage()

  timer = window.setTimeout(() => {
    const next = auth.isAuthenticated ? homePathForRole(auth.role) : '/login'
    router.replace(next)
  }, 1200)
})

onBeforeUnmount(() => {
  if (timer) window.clearTimeout(timer)
  timer = null
})
</script>

<template>
  <div class="h-full w-full flex items-center justify-center bg-gray-50 text-gray-900 dark:bg-gray-950 dark:text-gray-100">
    <div class="text-center">
      <div class="text-3xl font-semibold tracking-tight">HealHub</div>
      <div class="mt-1 text-sm text-gray-500 dark:text-gray-400">Welcome</div>

      <div class="mt-6 flex items-center justify-center gap-2 text-sm text-gray-500 dark:text-gray-400">
        <span class="inline-block h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-900 dark:border-gray-700 dark:border-t-gray-100" />
        <span>Loading…</span>
      </div>
    </div>
  </div>
</template>
