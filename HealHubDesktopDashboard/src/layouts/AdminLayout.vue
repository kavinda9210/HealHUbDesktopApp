<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()

const displayName = computed(() => auth.user?.full_name || auth.user?.email || 'Admin')

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

const isDoctorsOpen = ref(route.path.startsWith('/admin/doctors'))
const isPatientsOpen = ref(route.path.startsWith('/admin/patients'))
const isAmbulancesOpen = ref(route.path.startsWith('/admin/ambulances'))

watch(
  () => route.path,
  (path) => {
    if (path.startsWith('/admin/doctors')) isDoctorsOpen.value = true
    if (path.startsWith('/admin/patients')) isPatientsOpen.value = true
    if (path.startsWith('/admin/ambulances')) isAmbulancesOpen.value = true
  },
)

function toggleDoctors() {
  isDoctorsOpen.value = !isDoctorsOpen.value
}

function togglePatients() {
  isPatientsOpen.value = !isPatientsOpen.value
}

function toggleAmbulances() {
  isAmbulancesOpen.value = !isAmbulancesOpen.value
}

function logout() {
  auth.logout()
  router.replace('/login')
}
</script>

<template>
  <div class="h-full w-full flex bg-gray-50 text-gray-900 dark:bg-gray-950 dark:text-gray-100">
    <aside class="w-64 border-r border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
      <div class="text-lg font-semibold">HealHub</div>
      <div class="text-xs text-gray-500 dark:text-gray-400">Admin Dashboard</div>

      <nav class="mt-6 space-y-2 text-sm">
        <router-link class="block rounded px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-800" to="/admin/dashboard">
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
        <button
          type="button"
          class="w-full rounded px-3 py-2 text-left text-xs font-medium text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
          :aria-expanded="isDoctorsOpen"
          @click="toggleDoctors"
        >
          <span class="flex items-center gap-2">
            <svg viewBox="0 0 24 24" class="h-4 w-4 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M8 7a4 4 0 1 0 8 0a4 4 0 1 0-8 0" />
              <path d="M6 21v-1a6 6 0 0 1 12 0v1" />
              <path d="M12 10v4" />
              <path d="M10 12h4" />
            </svg>
            <span>Doctors</span>
          </span>
        </button>
        <router-link v-if="isDoctorsOpen" class="block rounded px-3 py-2 pl-6 hover:bg-gray-100 dark:hover:bg-gray-800" to="/admin/doctors">
          <span class="flex items-center gap-2">
            <svg viewBox="0 0 24 24" class="h-4 w-4 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M4 6h16" />
              <path d="M4 12h16" />
              <path d="M4 18h16" />
            </svg>
            <span>Manage doctors</span>
          </span>
        </router-link>
        <router-link v-if="isDoctorsOpen" class="block rounded px-3 py-2 pl-6 hover:bg-gray-100 dark:hover:bg-gray-800" to="/admin/doctors/create">
          <span class="flex items-center gap-2">
            <svg viewBox="0 0 24 24" class="h-4 w-4 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 5v14" />
              <path d="M5 12h14" />
            </svg>
            <span>Create doctor</span>
          </span>
        </router-link>
        <button
          type="button"
          class="w-full rounded px-3 py-2 text-left text-xs font-medium text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
          :aria-expanded="isPatientsOpen"
          @click="togglePatients"
        >
          <span class="flex items-center gap-2">
            <svg viewBox="0 0 24 24" class="h-4 w-4 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M9 6a3 3 0 1 0 6 0a3 3 0 1 0-6 0" />
              <path d="M4 21v-1a7 7 0 0 1 14 0v1" />
            </svg>
            <span>Patients</span>
          </span>
        </button>
        <router-link v-if="isPatientsOpen" class="block rounded px-3 py-2 pl-6 hover:bg-gray-100 dark:hover:bg-gray-800" to="/admin/patients">
          <span class="flex items-center gap-2">
            <svg viewBox="0 0 24 24" class="h-4 w-4 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M4 6h16" />
              <path d="M4 12h16" />
              <path d="M4 18h16" />
            </svg>
            <span>Manage patients</span>
          </span>
        </router-link>
        <router-link v-if="isPatientsOpen" class="block rounded px-3 py-2 pl-6 hover:bg-gray-100 dark:hover:bg-gray-800" to="/admin/patients/create">
          <span class="flex items-center gap-2">
            <svg viewBox="0 0 24 24" class="h-4 w-4 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 5v14" />
              <path d="M5 12h14" />
            </svg>
            <span>Create patient</span>
          </span>
        </router-link>
        <button
          type="button"
          class="w-full rounded px-3 py-2 text-left text-xs font-medium text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
          :aria-expanded="isAmbulancesOpen"
          @click="toggleAmbulances"
        >
          <span class="flex items-center gap-2">
            <svg viewBox="0 0 24 24" class="h-4 w-4 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M3 16v-5a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v5" />
              <path d="M16 12h2a3 3 0 0 1 3 3v1h-5" />
              <path d="M6.5 20a1.5 1.5 0 1 0 0-3a1.5 1.5 0 0 0 0 3" />
              <path d="M17.5 20a1.5 1.5 0 1 0 0-3a1.5 1.5 0 0 0 0 3" />
            </svg>
            <span>Ambulances</span>
          </span>
        </button>
        <router-link v-if="isAmbulancesOpen" class="block rounded px-3 py-2 pl-6 hover:bg-gray-100 dark:hover:bg-gray-800" to="/admin/ambulances">
          <span class="flex items-center gap-2">
            <svg viewBox="0 0 24 24" class="h-4 w-4 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M4 6h16" />
              <path d="M4 12h16" />
              <path d="M4 18h16" />
            </svg>
            <span>Manage ambulance staff</span>
          </span>
        </router-link>
        <router-link v-if="isAmbulancesOpen" class="block rounded px-3 py-2 pl-6 hover:bg-gray-100 dark:hover:bg-gray-800" to="/admin/ambulances/create">
          <span class="flex items-center gap-2">
            <svg viewBox="0 0 24 24" class="h-4 w-4 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 5v14" />
              <path d="M5 12h14" />
            </svg>
            <span>Create ambulance staff</span>
          </span>
        </router-link>
        <router-link class="block rounded px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-800" to="/admin/notifications">
          <span class="flex items-center gap-2">
            <svg viewBox="0 0 24 24" class="h-4 w-4 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 7h18s-3 0-3-7" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            <span>Notifications</span>
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
          <router-link class="text-sm underline text-gray-700 dark:text-gray-200" to="/admin/profile">Profile</router-link>
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
