<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { api, ApiError } from '../../lib/api'
import { useAuthStore } from '../../stores/auth'

type AmbulanceRow = {
  ambulance_id: number
  user_id: string
  ambulance_number?: string
  driver_name?: string
  driver_phone?: string
  is_available?: boolean
  email?: string
}

const auth = useAuthStore()
const route = useRoute()

const ambulanceId = computed(() => {
  const raw = route.params.ambulanceId
  const n = Number(raw)
  return Number.isFinite(n) ? n : NaN
})

const isLoading = ref(false)
const isSending = ref(false)
const error = ref<string | null>(null)
const success = ref<string | null>(null)

const ambulance = ref<AmbulanceRow | null>(null)

const title = ref('')
const message = ref('')
const type = ref<'info' | 'warning' | 'success' | 'error'>('info')

let bannerTimer: number | undefined
function setSuccess(msg: string) {
  success.value = msg
  window.clearTimeout(bannerTimer)
  bannerTimer = window.setTimeout(() => {
    success.value = null
  }, 3500)
}

async function load() {
  if (!Number.isFinite(ambulanceId.value)) {
    error.value = 'Invalid ambulance id'
    return
  }

  isLoading.value = true
  error.value = null
  try {
    const res = await api.get<{ success: boolean; data: AmbulanceRow }>(`/api/admin/ambulances/${ambulanceId.value}`,
      { token: auth.accessToken },
    )
    ambulance.value = res.data
  } catch (e) {
    error.value = e instanceof ApiError ? e.message : 'Failed to load ambulance staff'
  } finally {
    isLoading.value = false
  }
}

async function sendAlert() {
  if (!Number.isFinite(ambulanceId.value)) return

  isSending.value = true
  error.value = null
  try {
    const payload = {
      title: title.value.trim() || 'Alert',
      message: message.value.trim(),
      type: type.value,
    }

    if (!payload.message) {
      error.value = 'Message is required'
      return
    }

    await api.post(`/api/admin/ambulances/${ambulanceId.value}/alerts`, payload, { token: auth.accessToken })

    title.value = ''
    message.value = ''
    type.value = 'info'
    setSuccess('Alert sent successfully')
  } catch (e) {
    error.value = e instanceof ApiError ? e.message : 'Failed to send alert'
  } finally {
    isSending.value = false
  }
}

onMounted(load)
</script>

<template>
  <div>
    <div class="flex items-start justify-between gap-4">
      <div>
        <div class="text-xl font-semibold hh-title">Ambulance alerts</div>
        <div class="text-sm hh-muted">
          Send an alert to this ambulance staff member
          <span v-if="ambulance?.driver_name">({{ ambulance.driver_name }})</span>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <router-link class="hh-btn px-3 py-2 text-sm" :to="`/admin/ambulances/${route.params.ambulanceId}`">Back</router-link>
      </div>
    </div>

    <div
      v-if="success"
      class="mt-6 rounded border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700 dark:border-green-900 dark:bg-green-950 dark:text-green-200"
    >
      {{ success }}
    </div>
    <div
      v-if="error"
      class="mt-6 rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-200"
    >
      {{ error }}
    </div>
    <div v-else-if="isLoading" class="mt-6 hh-card-subtle px-4 py-3 text-sm hh-muted">Loading…</div>

    <form v-else class="mt-6 hh-card p-4" @submit.prevent="sendAlert">
      <div class="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div class="md:col-span-2">
          <label class="block text-xs font-medium hh-muted">Title</label>
          <input v-model="title" class="mt-1 hh-input px-3 py-2 text-sm" placeholder="Alert title" />
        </div>

        <div>
          <label class="block text-xs font-medium hh-muted">Type</label>
          <select v-model="type" class="mt-1 hh-input px-3 py-2 text-sm">
            <option value="info">Info</option>
            <option value="warning">Warning</option>
            <option value="success">Success</option>
            <option value="error">Error</option>
          </select>
        </div>

        <div class="md:col-span-2">
          <label class="block text-xs font-medium hh-muted">Message</label>
          <textarea v-model="message" rows="5" class="mt-1 hh-input px-3 py-2 text-sm" placeholder="Write message…" required />
        </div>

        <div class="md:col-span-2">
          <button class="hh-btn-primary px-4 py-2 text-sm" :disabled="isSending">
            {{ isSending ? 'Sending…' : 'Send alert' }}
          </button>
        </div>
      </div>
    </form>
  </div>
</template>
