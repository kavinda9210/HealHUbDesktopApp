<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const auth = useAuthStore()
const router = useRouter()

const displayName = computed(() => auth.user?.full_name || auth.user?.email || 'Doctor')

type ThemeMode = 'light' | 'dark'
const theme = ref<ThemeMode>('light')

function applyTheme(next: ThemeMode) {
  theme.value = next
  document.documentElement.classList.toggle('dark', next === 'dark')
  localStorage.setItem('theme', next)
}

function initTheme() {
  const saved = (localStorage.getItem('theme') || '').toLowerCase()
  if (saved === 'dark' || saved === 'light') {
    applyTheme(saved)
    return
  }
  const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
  applyTheme(prefersDark ? 'dark' : 'light')
}

function toggleTheme() {
  applyTheme(theme.value === 'dark' ? 'light' : 'dark')
}

initTheme()

function logout() {
  auth.logout()
  router.replace('/login')
}
</script>

<template>
  <div class="h-full w-full flex bg-gray-50 text-gray-900 dark:bg-gray-950 dark:text-gray-100">
    <aside class="w-64 border-r border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
      <div class="text-lg font-semibold">HealHub</div>
      <div class="text-xs text-gray-500 dark:text-gray-400">Doctor Dashboard</div>

      <nav class="mt-6 space-y-2 text-sm">
        <router-link class="block rounded px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-800" to="/doctor/dashboard">
          <span class="flex items-center gap-2">
            <svg viewBox="0 0 24 24" class="h-4 w-4 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M3 13h8V3H3z" />
              <path d="M13 21h8v-8h-8z" />
              <path d="M13 3h8v6h-8z" />
              <path d="M3 13h8v8H3z" />
            </svg>
            <span>Dashboard</span>
          </span>
        </router-link>

        <router-link class="block rounded px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-800" to="/doctor/appointments">
          <span class="flex items-center gap-2">
            <svg viewBox="0 0 24 24" class="h-4 w-4 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M7 3v3" />
              <path d="M17 3v3" />
              <path d="M4 7h16" />
              <path d="M5 6h14a1 1 0 0 1 1 1v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a1 1 0 0 1 1-1" />
              <path d="M8 11h4" />
              <path d="M8 15h6" />
            </svg>
            <span>Appointments</span>
          </span>
        </router-link>

        <router-link class="block rounded px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-800" to="/doctor/notifications">
          <span class="flex items-center gap-2">
            <svg viewBox="0 0 24 24" class="h-4 w-4 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 7h18s-3 0-3-7" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            <span>Notifications</span>
          </span>
        </router-link>

        <router-link class="block rounded px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-800" to="/doctor/profile">
          <span class="flex items-center gap-2">
            <svg viewBox="0 0 24 24" class="h-4 w-4 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 12a4 4 0 1 0-4-4a4 4 0 0 0 4 4" />
              <path d="M4 21v-1a7 7 0 0 1 14 0v1" />
            </svg>
            <span>Profile</span>
          </span>
        </router-link>
      </nav>
    </aside>

    <div class="flex-1 flex flex-col">
      <header class="border-b border-gray-200 bg-white px-6 py-4 flex items-center justify-between dark:border-gray-800 dark:bg-gray-900">
        <div class="text-sm text-gray-600 dark:text-gray-300">Welcome, <span class="font-medium text-gray-900 dark:text-gray-100">{{ displayName }}</span></div>
        <div class="flex items-center gap-3">
          <button class="rounded border border-gray-300 px-3 py-2 text-sm dark:border-gray-700" @click="toggleTheme">
            {{ theme === 'dark' ? 'Light' : 'Dark' }}
          </button>
          <button class="rounded border border-gray-300 px-3 py-2 text-sm dark:border-gray-700" @click="logout">Logout</button>
        </div>
      </header>

      <main class="flex-1 p-6 overflow-auto">
        <router-view v-slot="{ Component }">
          <keep-alive>
            <component :is="Component" />
          </keep-alive>
        </router-view>
      </main>

      <footer class="border-t border-gray-200 bg-white px-6 py-3 text-xs text-gray-500 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400">
        HealHub Desktop Dashboard
      </footer>
    </div>
  </div>
</template>
