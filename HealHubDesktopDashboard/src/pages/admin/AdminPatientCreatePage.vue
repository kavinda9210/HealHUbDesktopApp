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
  full_name: '',
  phone: '',
  dob: '',
  gender: '',
  address: '',
  blood_group: '',
  emergency_contact: '',
  has_chronic_condition: false,
  condition_notes: '',
})

async function createPatient() {
  createLoading.value = true
  createError.value = null
  try {
    const payload = {
      email: form.value.email.trim(),
      password: form.value.password,
      full_name: form.value.full_name.trim(),
      phone: form.value.phone.trim(),
      dob: form.value.dob,
      gender: form.value.gender.trim(),
      address: form.value.address.trim(),
      blood_group: form.value.blood_group.trim() || null,
      emergency_contact: form.value.emergency_contact.trim() || null,
      has_chronic_condition: Boolean(form.value.has_chronic_condition),
      condition_notes: form.value.condition_notes.trim() || null,
    }

    await api.post('/api/admin/patients', payload, { token: auth.accessToken })
    router.replace({ path: '/admin/patients', query: { notice: 'patient_created' } })
  } catch (e) {
    createError.value = e instanceof ApiError ? e.message : 'Failed to create patient'
  } finally {
    createLoading.value = false
  }
}
</script>

<template>
  <div>
    <div class="flex items-start justify-between gap-4">
      <div>
        <div class="text-xl font-semibold">Create patient</div>
        <div class="text-sm text-gray-500 dark:text-gray-400">Add a new patient account</div>
      </div>
      <div class="flex items-center gap-2">
        <router-link
          class="rounded border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:text-gray-100"
          to="/admin/patients"
        >
          Back to list
        </router-link>
      </div>
    </div>

    <div class="mt-6 rounded border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
      <form class="grid grid-cols-1 gap-3 md:grid-cols-2" @submit.prevent="createPatient">
        <div>
          <label class="block text-xs font-medium text-gray-600 dark:text-gray-300">Email</label>
          <input
            v-model="form.email"
            type="email"
            class="mt-1 w-full rounded border border-gray-300 bg-white px-3 py-2 text-gray-900 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
            required
          />
        </div>
        <div>
          <label class="block text-xs font-medium text-gray-600 dark:text-gray-300">Password</label>
          <input
            v-model="form.password"
            type="password"
            class="mt-1 w-full rounded border border-gray-300 bg-white px-3 py-2 text-gray-900 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
            required
          />
        </div>

        <div>
          <label class="block text-xs font-medium text-gray-600 dark:text-gray-300">Full name</label>
          <input
            v-model="form.full_name"
            class="mt-1 w-full rounded border border-gray-300 bg-white px-3 py-2 text-gray-900 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
            required
          />
        </div>
        <div>
          <label class="block text-xs font-medium text-gray-600 dark:text-gray-300">Phone</label>
          <input
            v-model="form.phone"
            class="mt-1 w-full rounded border border-gray-300 bg-white px-3 py-2 text-gray-900 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
            required
          />
        </div>

        <div>
          <label class="block text-xs font-medium text-gray-600 dark:text-gray-300">DOB</label>
          <input
            v-model="form.dob"
            type="date"
            class="mt-1 w-full rounded border border-gray-300 bg-white px-3 py-2 text-gray-900 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
            required
          />
        </div>
        <div>
          <label class="block text-xs font-medium text-gray-600 dark:text-gray-300">Gender</label>
          <input
            v-model="form.gender"
            class="mt-1 w-full rounded border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder-gray-400 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:placeholder-gray-500"
            placeholder="e.g. Male"
            required
          />
        </div>

        <div class="md:col-span-2">
          <label class="block text-xs font-medium text-gray-600 dark:text-gray-300">Address</label>
          <input
            v-model="form.address"
            class="mt-1 w-full rounded border border-gray-300 bg-white px-3 py-2 text-gray-900 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
            required
          />
        </div>

        <div>
          <label class="block text-xs font-medium text-gray-600 dark:text-gray-300">Blood group</label>
          <input
            v-model="form.blood_group"
            class="mt-1 w-full rounded border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder-gray-400 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:placeholder-gray-500"
            placeholder="Optional"
          />
        </div>
        <div>
          <label class="block text-xs font-medium text-gray-600 dark:text-gray-300">Emergency contact</label>
          <input
            v-model="form.emergency_contact"
            class="mt-1 w-full rounded border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder-gray-400 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:placeholder-gray-500"
            placeholder="Optional"
          />
        </div>

        <div class="md:col-span-2 flex items-center gap-2">
          <input id="has_chronic_condition" v-model="form.has_chronic_condition" type="checkbox" class="h-4 w-4" />
          <label for="has_chronic_condition" class="text-sm text-gray-700 dark:text-gray-200">Has chronic condition</label>
        </div>

        <div class="md:col-span-2">
          <label class="block text-xs font-medium text-gray-600 dark:text-gray-300">Condition notes</label>
          <textarea
            v-model="form.condition_notes"
            rows="3"
            class="mt-1 w-full rounded border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder-gray-400 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:placeholder-gray-500"
            placeholder="Optional"
          />
        </div>

        <div
          v-if="createError"
          class="md:col-span-2 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-200"
        >
          {{ createError }}
        </div>

        <div class="md:col-span-2">
          <button class="rounded bg-gray-900 px-4 py-2 text-sm text-white disabled:opacity-60" :disabled="createLoading">
            {{ createLoading ? 'Creating…' : 'Create patient' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
