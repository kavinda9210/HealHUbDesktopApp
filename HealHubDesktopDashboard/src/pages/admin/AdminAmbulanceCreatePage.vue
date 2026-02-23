<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { api, ApiError } from '../../lib/api'
import { useAuthStore } from '../../stores/auth'

const auth = useAuthStore()
const router = useRouter()

const createError = ref<string | null>(null)
const createLoading = ref(false)

const form = ref({
  email: '',
  password: '',
  ambulance_number: '',
  driver_name: '',
  driver_phone: '',
  is_available: true,
})

async function createAmbulance() {
  createLoading.value = true
  createError.value = null
  try {
    const payload = {
      email: form.value.email.trim(),
      password: form.value.password,
      ambulance_number: form.value.ambulance_number.trim(),
      driver_name: form.value.driver_name.trim(),
      driver_phone: form.value.driver_phone.trim(),
      is_available: Boolean(form.value.is_available),
    }

    await api.post('/api/admin/ambulances', payload, { token: auth.accessToken })
    router.replace({ path: '/admin/ambulances', query: { notice: 'ambulance_created' } })
  } catch (e) {
    createError.value = e instanceof ApiError ? e.message : 'Failed to create ambulance staff'
  } finally {
    createLoading.value = false
  }
}
</script>

<template>
  <div>
    <div class="flex items-start justify-between gap-4">
      <div>
        <div class="text-xl font-semibold hh-title">Create ambulance staff</div>
        <div class="text-sm hh-muted">Add a new ambulance staff account</div>
      </div>
      <div class="flex items-center gap-2">
        <router-link class="hh-btn px-3 py-2 text-sm" to="/admin/ambulances">Back to list</router-link>
      </div>
    </div>

    <div class="mt-6 hh-card p-4">
      <form class="grid grid-cols-1 gap-3 md:grid-cols-2" @submit.prevent="createAmbulance">
        <div>
          <label class="block text-xs font-medium hh-muted">Email</label>
          <input v-model="form.email" type="email" class="mt-1 hh-input px-3 py-2 text-sm" required />
        </div>
        <div>
          <label class="block text-xs font-medium hh-muted">Password</label>
          <input v-model="form.password" type="password" class="mt-1 hh-input px-3 py-2 text-sm" required />
        </div>

        <div>
          <label class="block text-xs font-medium hh-muted">Ambulance number</label>
          <input v-model="form.ambulance_number" class="mt-1 hh-input px-3 py-2 text-sm" required />
        </div>
        <div>
          <label class="block text-xs font-medium hh-muted">Driver name</label>
          <input v-model="form.driver_name" class="mt-1 hh-input px-3 py-2 text-sm" required />
        </div>

        <div>
          <label class="block text-xs font-medium hh-muted">Driver phone</label>
          <input v-model="form.driver_phone" class="mt-1 hh-input px-3 py-2 text-sm" required />
        </div>

        <div class="md:col-span-2 flex items-center gap-2">
          <input id="is_available" v-model="form.is_available" type="checkbox" class="h-4 w-4" />
          <label for="is_available" class="text-sm" style="color: var(--text-2)">Available</label>
        </div>

        <div v-if="createError" class="md:col-span-2 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {{ createError }}
        </div>

        <div class="md:col-span-2">
          <button class="hh-btn-primary px-4 py-2 text-sm" :disabled="createLoading">
            {{ createLoading ? 'Creating…' : 'Create ambulance staff' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
