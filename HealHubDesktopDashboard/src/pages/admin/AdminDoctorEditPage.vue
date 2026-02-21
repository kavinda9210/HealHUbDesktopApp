<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { api, ApiError } from '../../lib/api'
import { useAuthStore } from '../../stores/auth'

type DoctorRow = {
  doctor_id: number
  user_id: string
  full_name: string
  specialization?: string
  qualification?: string
  phone?: string
  email?: string
  consultation_fee?: number
  available_days?: unknown
  start_time?: string | null
  end_time?: string | null
  is_available?: boolean
}

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()

const doctorId = computed(() => {
  const raw = route.params.doctorId
  const n = Number(raw)
  return Number.isFinite(n) ? n : NaN
})

const isLoading = ref(false)
const isSaving = ref(false)
const error = ref<string | null>(null)
const saveError = ref<string | null>(null)

const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function normalizeDays(value: unknown): string[] {
  if (value == null) return []
  if (Array.isArray(value)) return value.map((x) => String(x).trim()).filter(Boolean)
  if (typeof value === 'string') {
    const s = value.trim()
    if (!s) return []
    if (s.startsWith('[') && s.endsWith(']')) {
      try {
        const parsed = JSON.parse(s)
        if (Array.isArray(parsed)) return parsed.map((x) => String(x).trim()).filter(Boolean)
      } catch {
        // fall back
      }
    }
    return s
      .split(',')
      .map((x) => x.trim())
      .filter(Boolean)
  }
  return []
}

function timeToMinutes(t: string) {
  const m = t.match(/^(\d{2}):(\d{2})/)
  if (!m) return NaN
  const hh = Number(m[1])
  const mm = Number(m[2])
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return NaN
  return hh * 60 + mm
}

function validateForm() {
  if (!form.value.email.trim()) return 'Email is required.'
  if (!form.value.full_name.trim()) return 'Full name is required.'
  if (!form.value.specialization.trim()) return 'Specialization is required.'
  if (!form.value.phone.trim()) return 'Phone is required.'

  if (form.value.is_available) {
    if (!form.value.available_days || form.value.available_days.length === 0)
      return 'Please select at least one available day.'
    if (!form.value.start_time.trim() || !form.value.end_time.trim())
      return 'Start time and end time are required when available.'
    const s = timeToMinutes(form.value.start_time.trim())
    const e = timeToMinutes(form.value.end_time.trim())
    if (!Number.isFinite(s) || !Number.isFinite(e)) return 'Invalid start or end time.'
    if (e <= s) return 'End time must be after start time.'
  }

  return null
}

const form = ref({
  email: '',
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

async function load() {
  if (!Number.isFinite(doctorId.value)) {
    error.value = 'Invalid doctor id'
    return
  }

  isLoading.value = true
  error.value = null
  try {
    const res = await api.get<{ success: boolean; data: DoctorRow }>(`/api/admin/doctors/${doctorId.value}`, {
      token: auth.accessToken,
    })

    const d = res.data
    form.value = {
      email: d.email || '',
      full_name: d.full_name || '',
      specialization: d.specialization || '',
      qualification: d.qualification || '',
      phone: d.phone || '',
      consultation_fee: d.consultation_fee != null ? String(d.consultation_fee) : '',
      is_available: Boolean(d.is_available ?? true),
      available_days: normalizeDays(d.available_days),
      start_time: d.start_time ? String(d.start_time).slice(0, 5) : '',
      end_time: d.end_time ? String(d.end_time).slice(0, 5) : '',
    }
  } catch (e) {
    error.value = e instanceof ApiError ? e.message : 'Failed to load doctor'
  } finally {
    isLoading.value = false
  }
}

async function save() {
  if (!Number.isFinite(doctorId.value)) return

  const validationError = validateForm()
  if (validationError) {
    saveError.value = validationError
    return
  }

  isSaving.value = true
  saveError.value = null
  try {
    const fee = form.value.consultation_fee.trim() ? Number(form.value.consultation_fee) : 0
    const payload = {
      email: form.value.email.trim(),
      full_name: form.value.full_name.trim(),
      specialization: form.value.specialization.trim(),
      qualification: form.value.qualification.trim(),
      phone: form.value.phone.trim(),
      consultation_fee: Number.isFinite(fee) ? fee : 0,
      is_available: Boolean(form.value.is_available),
      available_days: form.value.is_available ? form.value.available_days : null,
      start_time: form.value.is_available ? form.value.start_time.trim() : null,
      end_time: form.value.is_available ? form.value.end_time.trim() : null,
    }

    await api.put(`/api/admin/doctors/${doctorId.value}`, payload, { token: auth.accessToken })
    router.replace({ path: `/admin/doctors/${doctorId.value}`, query: { notice: 'doctor_updated' } })
  } catch (e) {
    saveError.value = e instanceof ApiError ? e.message : 'Failed to save doctor'
  } finally {
    isSaving.value = false
  }
}

onMounted(load)
</script>

<template>
  <div>
    <div class="flex items-start justify-between gap-4">
      <div>
        <div class="text-xl font-semibold">Edit doctor</div>
        <div class="text-sm text-gray-500 dark:text-gray-400">Update doctor information</div>
      </div>
      <div class="flex items-center gap-2">
        <router-link
          class="rounded border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:text-gray-100"
          :to="`/admin/doctors/${route.params.doctorId}`"
        >
          Cancel
        </router-link>
      </div>
    </div>

    <div
      v-if="error"
      class="mt-6 rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-200"
    >
      {{ error }}
    </div>
    <div
      v-else-if="isLoading"
      class="mt-6 rounded border border-gray-200 bg-white px-4 py-3 text-sm text-gray-600 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300"
    >
      Loading…
    </div>

    <form v-else class="mt-6 rounded border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900" @submit.prevent="save">
      <div class="grid grid-cols-1 gap-3 md:grid-cols-2">
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
          <label class="block text-xs font-medium text-gray-600 dark:text-gray-300">Phone</label>
          <input
            v-model="form.phone"
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
          <label class="block text-xs font-medium text-gray-600 dark:text-gray-300">Specialization</label>
          <input
            v-model="form.specialization"
            class="mt-1 w-full rounded border border-gray-300 bg-white px-3 py-2 text-gray-900 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
            required
          />
        </div>

        <div>
          <label class="block text-xs font-medium text-gray-600 dark:text-gray-300">Qualification</label>
          <input
            v-model="form.qualification"
            class="mt-1 w-full rounded border border-gray-300 bg-white px-3 py-2 text-gray-900 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
          />
        </div>
        <div>
          <label class="block text-xs font-medium text-gray-600 dark:text-gray-300">Consultation fee</label>
          <input
            v-model="form.consultation_fee"
            inputmode="decimal"
            class="mt-1 w-full rounded border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder-gray-400 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:placeholder-gray-500"
            placeholder="0"
          />
        </div>

        <div class="md:col-span-2 flex items-center gap-2">
          <input id="is_available" v-model="form.is_available" type="checkbox" class="h-4 w-4" />
          <label for="is_available" class="text-sm text-gray-700 dark:text-gray-200">Available</label>
        </div>

        <div v-if="form.is_available" class="md:col-span-2">
          <label class="block text-xs font-medium text-gray-600 dark:text-gray-300">Available days</label>
          <div class="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <label v-for="d in daysOfWeek" :key="d" class="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
              <input v-model="form.available_days" :value="d" type="checkbox" class="h-4 w-4" />
              <span>{{ d }}</span>
            </label>
          </div>
        </div>

        <div v-if="form.is_available">
          <label class="block text-xs font-medium text-gray-600 dark:text-gray-300">Start time</label>
          <input
            v-model="form.start_time"
            type="time"
            class="mt-1 w-full rounded border border-gray-300 bg-white px-3 py-2 text-gray-900 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
          />
        </div>
        <div v-if="form.is_available">
          <label class="block text-xs font-medium text-gray-600 dark:text-gray-300">End time</label>
          <input
            v-model="form.end_time"
            type="time"
            class="mt-1 w-full rounded border border-gray-300 bg-white px-3 py-2 text-gray-900 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
          />
        </div>

        <div
          v-if="saveError"
          class="md:col-span-2 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-200"
        >
          {{ saveError }}
        </div>

        <div class="md:col-span-2">
          <button class="rounded bg-gray-900 px-4 py-2 text-sm text-white disabled:opacity-60" :disabled="isSaving">
            {{ isSaving ? 'Saving…' : 'Save changes' }}
          </button>
        </div>
      </div>
    </form>
  </div>
</template>
