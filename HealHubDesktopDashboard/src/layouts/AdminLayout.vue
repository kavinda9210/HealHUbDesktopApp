<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()

const displayName = computed(() => auth.user?.full_name || auth.user?.email || 'Admin')

const isDoctorsOpen = ref(route.path.startsWith('/admin/doctors'))
const isPatientsOpen = ref(route.path.startsWith('/admin/patients'))

watch(
  () => route.path,
  (path) => {
    if (path.startsWith('/admin/doctors')) isDoctorsOpen.value = true
    if (path.startsWith('/admin/patients')) isPatientsOpen.value = true
  },
)

function toggleDoctors() {
  isDoctorsOpen.value = !isDoctorsOpen.value
}

function togglePatients() {
  isPatientsOpen.value = !isPatientsOpen.value
}

function logout() {
  auth.logout()
  router.replace('/login')
}
</script>

<template>
  <div class="h-full w-full flex bg-gray-50">
    <aside class="w-64 border-r border-gray-200 bg-white p-4">
      <div class="text-lg font-semibold">HealHub</div>
      <div class="text-xs text-gray-500">Admin Dashboard</div>

      <nav class="mt-6 space-y-2 text-sm">
        <router-link class="block rounded px-3 py-2 hover:bg-gray-100" to="/admin/dashboard">Dashboard</router-link>
        <button
          type="button"
          class="w-full rounded px-3 py-2 text-left text-xs font-medium text-gray-500 hover:bg-gray-100"
          :aria-expanded="isDoctorsOpen"
          @click="toggleDoctors"
        >
          Doctors
        </button>
        <router-link v-if="isDoctorsOpen" class="block rounded px-3 py-2 pl-6 hover:bg-gray-100" to="/admin/doctors">Manage doctors</router-link>
        <router-link v-if="isDoctorsOpen" class="block rounded px-3 py-2 pl-6 hover:bg-gray-100" to="/admin/doctors/create">Create doctor</router-link>
        <button
          type="button"
          class="w-full rounded px-3 py-2 text-left text-xs font-medium text-gray-500 hover:bg-gray-100"
          :aria-expanded="isPatientsOpen"
          @click="togglePatients"
        >
          Patients
        </button>
        <router-link v-if="isPatientsOpen" class="block rounded px-3 py-2 pl-6 hover:bg-gray-100" to="/admin/patients">Manage patients</router-link>
        <router-link v-if="isPatientsOpen" class="block rounded px-3 py-2 pl-6 hover:bg-gray-100" to="/admin/patients/create">Create patient</router-link>
        <router-link class="block rounded px-3 py-2 hover:bg-gray-100" to="/admin/ambulances">Ambulances</router-link>
        <router-link class="block rounded px-3 py-2 hover:bg-gray-100" to="/admin/notifications">Notifications</router-link>
      </nav>
    </aside>

    <div class="flex-1 flex flex-col">
      <header class="border-b border-gray-200 bg-white px-6 py-4 flex items-center justify-between">
        <div class="text-sm text-gray-600">Welcome, <span class="font-medium text-gray-900">{{ displayName }}</span></div>
        <div class="flex items-center gap-3">
          <router-link class="text-sm underline text-gray-700" to="/admin/profile">Profile</router-link>
          <button class="rounded border border-gray-300 px-3 py-2 text-sm" @click="logout">Logout</button>
        </div>
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
