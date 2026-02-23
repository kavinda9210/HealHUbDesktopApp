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
        <div class="text-xl font-semibold hh-title">Create patient</div>
        <div class="text-sm hh-muted">Add a new patient account</div>
      </div>
      <div class="flex items-center gap-2">
        <router-link
          class="hh-btn px-3 py-2 text-sm"
          to="/admin/patients"
        >
          Back to list
        </router-link>
      </div>
    </div>

    <div class="mt-6 hh-card p-4">
      <form class="grid grid-cols-1 gap-3 md:grid-cols-2" @submit.prevent="createPatient">
        <div>
          <label class="block text-xs font-medium hh-muted">Email</label>
          <input
            v-model="form.email"
            type="email"
            class="mt-1 hh-input px-3 py-2 text-sm"
            required
          />
        </div>
        <div>
          <label class="block text-xs font-medium hh-muted">Password</label>
          <input
            v-model="form.password"
            type="password"
            class="mt-1 hh-input px-3 py-2 text-sm"
            required
          />
        </div>

        <div>
          <label class="block text-xs font-medium hh-muted">Full name</label>
          <input
            v-model="form.full_name"
            class="mt-1 hh-input px-3 py-2 text-sm"
            required
          />
        </div>
        <div>
          <label class="block text-xs font-medium hh-muted">Phone</label>
          <input
            v-model="form.phone"
            class="mt-1 hh-input px-3 py-2 text-sm"
            required
          />
        </div>

        <div>
          <label class="block text-xs font-medium hh-muted">DOB</label>
          <input
            v-model="form.dob"
            type="date"
            class="mt-1 hh-input px-3 py-2 text-sm"
            required
          />
        </div>
        <div>
          <label class="block text-xs font-medium hh-muted">Gender</label>
          <input
            v-model="form.gender"
            class="mt-1 hh-input px-3 py-2 text-sm"
            placeholder="e.g. Male"
            required
          />
        </div>

        <div class="md:col-span-2">
          <label class="block text-xs font-medium hh-muted">Address</label>
          <input
            v-model="form.address"
            class="mt-1 hh-input px-3 py-2 text-sm"
            required
          />
        </div>

        <div>
          <label class="block text-xs font-medium hh-muted">Blood group</label>
          <input
            v-model="form.blood_group"
            class="mt-1 hh-input px-3 py-2 text-sm"
            placeholder="Optional"
          />
        </div>
        <div>
          <label class="block text-xs font-medium hh-muted">Emergency contact</label>
          <input
            v-model="form.emergency_contact"
            class="mt-1 hh-input px-3 py-2 text-sm"
            placeholder="Optional"
          />
        </div>

        <div class="md:col-span-2 flex items-center gap-2">
          <input id="has_chronic_condition" v-model="form.has_chronic_condition" type="checkbox" class="h-4 w-4" />
          <label for="has_chronic_condition" class="text-sm" style="color: var(--text-2)">Has chronic condition</label>
        </div>

        <div class="md:col-span-2">
          <label class="block text-xs font-medium hh-muted">Condition notes</label>
          <textarea
            v-model="form.condition_notes"
            rows="3"
            class="mt-1 hh-input px-3 py-2 text-sm"
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
          <button class="hh-btn-primary px-4 py-2 text-sm" :disabled="createLoading">
            {{ createLoading ? 'Creating…' : 'Create patient' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
