<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { api, ApiError } from '../../lib/api'
import { useAuthStore } from '../../stores/auth'

const auth = useAuthStore()
const router = useRouter()

const createError = ref<string | null>(null)
const createLoading = ref(false)

const daysOfWeek = [
  { key: 'Mon', label: 'Mon' },
  { key: 'Tue', label: 'Tue' },
  { key: 'Wed', label: 'Wed' },
  { key: 'Thu', label: 'Thu' },
  { key: 'Fri', label: 'Fri' },
  { key: 'Sat', label: 'Sat' },
  { key: 'Sun', label: 'Sun' },
]

const form = ref({
  email: '',
  password: '',
  full_name: '',
  specialization: '',
  qualification: '',
  phone: '',
  consultation_fee: '',
  is_available: true,
  available_days: [] as string[],
  start_time: '',
  end_time: '',
})

async function createDoctor() {
  createLoading.value = true
  createError.value = null
  try {
    if (form.value.is_available) {
      if (!form.value.available_days.length) {
        createError.value = 'Please select at least one available day.'
        return
      }
      if (!form.value.start_time || !form.value.end_time) {
        createError.value = 'Please set start time and end time.'
        return
      }
      if (form.value.end_time <= form.value.start_time) {
        createError.value = 'End time must be after start time.'
        return
      }
    }

    const fee = form.value.consultation_fee.trim() ? Number(form.value.consultation_fee) : 0
    const payload = {
      email: form.value.email,
      password: form.value.password,
      full_name: form.value.full_name,
      specialization: form.value.specialization,
      qualification: form.value.qualification,
      phone: form.value.phone,
      consultation_fee: Number.isFinite(fee) ? fee : 0,
      is_available: Boolean(form.value.is_available),
      available_days: form.value.is_available ? form.value.available_days : null,
      start_time: form.value.is_available ? (form.value.start_time || null) : null,
      end_time: form.value.is_available ? (form.value.end_time || null) : null,
    }
    await api.post('/api/admin/doctors', payload, { token: auth.accessToken })
    router.replace({ path: '/admin/doctors', query: { notice: 'doctor_created' } })
  } catch (e) {
    createError.value = e instanceof ApiError ? e.message : 'Failed to create doctor'
  } finally {
    createLoading.value = false
  }
}
</script>

<template>
  <div>
    <div class="flex items-start justify-between gap-4">
      <div>
        <div class="text-xl font-semibold hh-title">Create doctor</div>
        <div class="text-sm hh-muted">Add a new doctor account</div>
      </div>
      <div class="flex items-center gap-2">
        <router-link
          class="hh-btn px-3 py-2 text-sm"
          to="/admin/doctors"
        >
          Back to list
        </router-link>
      </div>
    </div>

    <div class="mt-6 hh-card p-4">
      <form class="grid grid-cols-1 gap-3 md:grid-cols-2" @submit.prevent="createDoctor">
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
          <label class="block text-xs font-medium hh-muted">Specialization</label>
          <input
            v-model="form.specialization"
            class="mt-1 hh-input px-3 py-2 text-sm"
            required
          />
        </div>

        <div>
          <label class="block text-xs font-medium hh-muted">Qualification</label>
          <input
            v-model="form.qualification"
            class="mt-1 hh-input px-3 py-2 text-sm"
            placeholder="Optional"
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
          <label class="block text-xs font-medium hh-muted">Consultation fee</label>
          <input
            v-model="form.consultation_fee"
            inputmode="decimal"
            class="mt-1 hh-input px-3 py-2 text-sm"
            placeholder="0"
          />
        </div>

        <div class="md:col-span-2 hh-card-subtle p-4">
          <div class="text-sm font-medium hh-title">Availability</div>

          <div class="mt-3 flex items-center gap-2">
            <input id="is_available" v-model="form.is_available" type="checkbox" class="h-4 w-4" />
            <label for="is_available" class="text-sm" style="color: var(--text-2)">Available for appointments</label>
          </div>

          <div class="mt-4">
            <div class="text-xs font-medium hh-muted">Available days</div>
            <div class="mt-2 flex flex-wrap gap-3">
              <label
                v-for="d in daysOfWeek"
                :key="d.key"
                class="inline-flex items-center gap-2 text-sm"
                style="color: var(--text-2)"
              >
                <input
                  type="checkbox"
                  class="h-4 w-4"
                  :value="d.key"
                  v-model="form.available_days"
                  :disabled="!form.is_available"
                />
                <span>{{ d.label }}</span>
              </label>
            </div>
          </div>

          <div class="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <label class="block text-xs font-medium hh-muted">Start time</label>
              <input
                v-model="form.start_time"
                type="time"
                class="mt-1 hh-input px-3 py-2 text-sm"
                :disabled="!form.is_available"
              />
            </div>
            <div>
              <label class="block text-xs font-medium hh-muted">End time</label>
              <input
                v-model="form.end_time"
                type="time"
                class="mt-1 hh-input px-3 py-2 text-sm"
                :disabled="!form.is_available"
              />
            </div>
          </div>
        </div>

        <div
          v-if="createError"
          class="md:col-span-2 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-200"
        >
          {{ createError }}
        </div>

        <div class="md:col-span-2">
          <button class="hh-btn-primary px-4 py-2 text-sm" :disabled="createLoading">
            {{ createLoading ? 'Creating…' : 'Create doctor' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
