<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { api, ApiError } from '../../lib/api'
import { useAuthStore } from '../../stores/auth'

type PatientRow = {
  patient_id: number
  user_id: string
  full_name?: string
  email?: string
  phone?: string
}

const auth = useAuthStore()
const route = useRoute()

const patientId = computed(() => {
  const raw = route.params.patientId
  const n = Number(raw)
  return Number.isFinite(n) ? n : NaN
})

const patient = ref<PatientRow | null>(null)
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

async function loadPatient() {
  if (!Number.isFinite(patientId.value)) {
    error.value = 'Invalid patient id'
    return
  }

  isLoading.value = true
  error.value = null
  try {
    const res = await api.get<{ success: boolean; data: PatientRow }>(`/api/admin/patients/${patientId.value}`, {
      token: auth.accessToken,
    })
    patient.value = res.data
  } catch (e) {
    error.value = e instanceof ApiError ? e.message : 'Failed to load patient'
  } finally {
    isLoading.value = false
  }
}

async function sendAlert() {
  if (!Number.isFinite(patientId.value)) return

  isSending.value = true
  sendError.value = null
  sentOk.value = false

  try {
    const payload = {
      title: form.value.title.trim(),
      message: form.value.message.trim(),
      type: form.value.type.trim() || 'Alert',
    }

    await api.post(`/api/admin/patients/${patientId.value}/alerts`, payload, { token: auth.accessToken })
    form.value = { title: '', message: '', type: 'Alert' }
    sentOk.value = true
  } catch (e) {
    sendError.value = e instanceof ApiError ? e.message : 'Failed to send alert'
  } finally {
    isSending.value = false
  }
}

onMounted(loadPatient)
</script>

<template>
  <div>
    <div class="flex items-start justify-between gap-4">
      <div>
        <div class="text-xl font-semibold">Patient alerts</div>
        <div class="text-sm text-gray-500">Send an alert to this patient</div>
      </div>

      <div class="flex items-center gap-2">
        <router-link class="rounded border border-gray-300 px-3 py-2 text-sm" to="/admin/patients">Back</router-link>
        <router-link v-if="patient" class="rounded border border-gray-300 px-3 py-2 text-sm" :to="`/admin/patients/${patient.patient_id}`">
          Patient details
        </router-link>
      </div>
    </div>

    <div v-if="error" class="mt-6 rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{{ error }}</div>
    <div v-else-if="isLoading" class="mt-6 rounded border border-gray-200 bg-white px-4 py-3 text-sm text-gray-600">Loading…</div>

    <div v-else class="mt-6 rounded border border-gray-200 bg-white p-4">
      <div class="text-sm font-medium">Patient</div>
      <div class="mt-1 text-sm text-gray-700">
        <span class="font-medium text-gray-900">{{ patient?.full_name || '-' }}</span>
        <span v-if="patient?.email"> · {{ patient?.email }}</span>
        <span v-if="patient?.phone"> · {{ patient?.phone }}</span>
      </div>

      <div class="mt-6 text-sm font-medium">Create alert</div>
      <form class="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2" @submit.prevent="sendAlert">
        <div class="md:col-span-2">
          <label class="block text-xs font-medium text-gray-600">Title</label>
          <input v-model="form.title" class="mt-1 w-full rounded border border-gray-300 px-3 py-2" required />
        </div>

        <div class="md:col-span-2">
          <label class="block text-xs font-medium text-gray-600">Message</label>
          <textarea v-model="form.message" rows="4" class="mt-1 w-full rounded border border-gray-300 px-3 py-2" required />
        </div>

        <div>
          <label class="block text-xs font-medium text-gray-600">Type</label>
          <input v-model="form.type" class="mt-1 w-full rounded border border-gray-300 px-3 py-2" placeholder="Alert" />
        </div>

        <div class="flex items-end">
          <button class="rounded bg-gray-900 px-4 py-2 text-sm text-white disabled:opacity-60" :disabled="isSending">
            {{ isSending ? 'Sending…' : 'Send alert' }}
          </button>
        </div>

        <div v-if="sendError" class="md:col-span-2 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{{ sendError }}</div>
        <div v-else-if="sentOk" class="md:col-span-2 rounded border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">Alert sent.</div>
      </form>
    </div>
  </div>
</template>
