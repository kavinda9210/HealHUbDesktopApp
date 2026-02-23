<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { api, ApiError } from '../../lib/api'
import { useAuthStore } from '../../stores/auth'

type DoctorRow = {
  doctor_id: number
  user_id: string
  full_name: string
  specialization?: string
  email?: string
}

const auth = useAuthStore()
const route = useRoute()

const doctorId = computed(() => {
  const raw = route.params.doctorId
  const n = Number(raw)
  return Number.isFinite(n) ? n : NaN
})

const doctor = ref<DoctorRow | null>(null)
const isLoading = ref(false)
const error = ref<string | null>(null)

const form = ref({
  title: '',
  message: '',
  type: 'Alert',
})

const isSending = ref(false)
const sendError = ref<string | null>(null)
const sentOk = ref(false)

async function loadDoctor() {
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
    doctor.value = res.data
  } catch (e) {
    error.value = e instanceof ApiError ? e.message : 'Failed to load doctor'
  } finally {
    isLoading.value = false
  }
}

async function sendAlert() {
  if (!Number.isFinite(doctorId.value)) return

  isSending.value = true
  sendError.value = null
  sentOk.value = false

  try {
    const payload = {
      title: form.value.title.trim(),
      message: form.value.message.trim(),
      type: form.value.type.trim() || 'Alert',
    }

    await api.post(`/api/admin/doctors/${doctorId.value}/alerts`, payload, { token: auth.accessToken })
    form.value = { title: '', message: '', type: 'Alert' }
    sentOk.value = true
  } catch (e) {
    sendError.value = e instanceof ApiError ? e.message : 'Failed to send alert'
  } finally {
    isSending.value = false
  }
}

onMounted(loadDoctor)
</script>

<template>
  <div>
    <div class="flex items-start justify-between gap-4">
      <div>
        <div class="text-xl font-semibold hh-title">Doctor alerts</div>
        <div class="text-sm hh-muted">Send an alert to this doctor</div>
      </div>

      <div class="flex items-center gap-2">
        <router-link class="hh-btn px-3 py-2 text-sm" to="/admin/doctors">Back</router-link>
        <router-link
          v-if="doctor"
          class="hh-btn px-3 py-2 text-sm"
          :to="`/admin/doctors/${doctor.doctor_id}`"
        >
          Doctor details
        </router-link>
      </div>
    </div>

    <div
      v-if="error"
      class="mt-6 rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-200"
    >
      {{ error }}
    </div>
    <div v-else-if="isLoading" class="mt-6 hh-card-subtle px-4 py-3 text-sm hh-muted">
      Loading…
    </div>

    <div v-else class="mt-6 hh-card p-4">
      <div class="text-sm font-medium hh-title">Doctor</div>
      <div class="mt-1 text-sm" style="color: var(--text-2)">
        <span class="font-medium" style="color: var(--text-1)">{{ doctor?.full_name || '-' }}</span>
        <span v-if="doctor?.specialization"> · {{ doctor?.specialization }}</span>
        <span v-if="doctor?.email"> · {{ doctor?.email }}</span>
      </div>

      <div class="mt-6 text-sm font-medium hh-title">Create alert</div>
      <form class="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2" @submit.prevent="sendAlert">
        <div class="md:col-span-2">
          <label class="block text-xs font-medium hh-muted">Title</label>
          <input v-model="form.title" class="mt-1 hh-input px-3 py-2 text-sm" required />
        </div>

        <div class="md:col-span-2">
          <label class="block text-xs font-medium hh-muted">Message</label>
          <textarea v-model="form.message" rows="4" class="mt-1 hh-input px-3 py-2 text-sm" required />
        </div>

        <div>
          <label class="block text-xs font-medium hh-muted">Type</label>
          <input v-model="form.type" class="mt-1 hh-input px-3 py-2 text-sm" placeholder="Alert" />
        </div>

        <div class="flex items-end">
          <button class="hh-btn-primary px-4 py-2 text-sm" :disabled="isSending">
            {{ isSending ? 'Sending…' : 'Send alert' }}
          </button>
        </div>

        <div
          v-if="sendError"
          class="md:col-span-2 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-200"
        >
          {{ sendError }}
        </div>
        <div
          v-else-if="sentOk"
          class="md:col-span-2 rounded border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700 dark:border-green-900 dark:bg-green-950 dark:text-green-200"
        >
          Alert sent.
        </div>
      </form>
    </div>
  </div>
</template>
