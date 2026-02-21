<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const auth = useAuthStore()
const router = useRouter()

const displayName = computed(() => auth.user?.full_name || auth.user?.email || 'Doctor')

function logout() {
  auth.logout()
  router.replace('/login')
}
</script>

<template>
  <div class="h-full w-full flex bg-gray-50">
    <aside class="w-64 border-r border-gray-200 bg-white p-4">
      <div class="text-lg font-semibold">HealHub</div>
      <div class="text-xs text-gray-500">Doctor Dashboard</div>

      <nav class="mt-6 space-y-2 text-sm">
        <router-link class="block rounded px-3 py-2 hover:bg-gray-100" to="/doctor/dashboard">Dashboard</router-link>
        <router-link class="block rounded px-3 py-2 hover:bg-gray-100" to="/doctor/appointments">Appointments</router-link>
        <router-link class="block rounded px-3 py-2 hover:bg-gray-100" to="/doctor/notifications">Notifications</router-link>
        <router-link class="block rounded px-3 py-2 hover:bg-gray-100" to="/doctor/profile">Profile</router-link>
      </nav>
    </aside>

    <div class="flex-1 flex flex-col">
      <header class="border-b border-gray-200 bg-white px-6 py-4 flex items-center justify-between">
        <div class="text-sm text-gray-600">Welcome, <span class="font-medium text-gray-900">{{ displayName }}</span></div>
        <button class="rounded border border-gray-300 px-3 py-2 text-sm" @click="logout">Logout</button>
      </header>

      <main class="flex-1 p-6 overflow-auto">
        <router-view v-slot="{ Component }">
          <keep-alive>
            <component :is="Component" />
          </keep-alive>
        </router-view>
      </main>

      <footer class="border-t border-gray-200 bg-white px-6 py-3 text-xs text-gray-500">
        HealHub Desktop Dashboard
      </footer>
    </div>
  </div>
</template>
