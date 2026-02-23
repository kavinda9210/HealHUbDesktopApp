<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
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
const router = useRouter()

const ambulanceId = computed(() => {
  const raw = route.params.ambulanceId
  const n = Number(raw)
  return Number.isFinite(n) ? n : NaN
})

const isLoading = ref(false)
const isSaving = ref(false)
const error = ref<string | null>(null)
const saveError = ref<string | null>(null)

const form = ref({
  email: '',
  ambulance_number: '',
  driver_name: '',
  driver_phone: '',
  is_available: true,
})

async function load() {
  if (!Number.isFinite(ambulanceId.value)) {
    error.value = 'Invalid ambulance id'
    return
  }

  isLoading.value = true
  error.value = null
  try {
    const res = await api.get<{ success: boolean; data: AmbulanceRow }>(`/api/admin/ambulances/${ambulanceId.value}`, {
      token: auth.accessToken,
    })

    const a = res.data
    form.value = {
      email: a.email || '',
      ambulance_number: a.ambulance_number || '',
      driver_name: a.driver_name || '',
      driver_phone: a.driver_phone || '',
      is_available: Boolean(a.is_available ?? true),
    }
  } catch (e) {
    error.value = e instanceof ApiError ? e.message : 'Failed to load ambulance staff'
  } finally {
    isLoading.value = false
  }
}

async function save() {
  if (!Number.isFinite(ambulanceId.value)) return

  isSaving.value = true
  saveError.value = null
  try {
    const payload = {
      email: form.value.email.trim(),
      ambulance_number: form.value.ambulance_number.trim(),
      driver_name: form.value.driver_name.trim(),
      driver_phone: form.value.driver_phone.trim(),
      is_available: Boolean(form.value.is_available),
    }

    await api.put(`/api/admin/ambulances/${ambulanceId.value}`, payload, { token: auth.accessToken })
    router.replace({ path: `/admin/ambulances/${ambulanceId.value}`, query: { notice: 'ambulance_updated' } })
  } catch (e) {
    saveError.value = e instanceof ApiError ? e.message : 'Failed to save ambulance staff'
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
        <div class="text-xl font-semibold hh-title">Edit ambulance staff</div>
        <div class="text-sm hh-muted">Update ambulance staff information</div>
      </div>
      <div class="flex items-center gap-2">
        <router-link class="hh-btn px-3 py-2 text-sm" :to="`/admin/ambulances/${route.params.ambulanceId}`">Cancel</router-link>
      </div>
    </div>

    <div
      v-if="error"
      class="mt-6 rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-200"
    >
      {{ error }}
    </div>
    <div v-else-if="isLoading" class="mt-6 hh-card-subtle px-4 py-3 text-sm hh-muted">Loading…</div>

    <form v-else class="mt-6 hh-card p-4" @submit.prevent="save">
      <div class="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div>
          <label class="block text-xs font-medium hh-muted">Email</label>
          <input v-model="form.email" type="email" class="mt-1 hh-input px-3 py-2 text-sm" required />
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

        <div
          v-if="saveError"
          class="md:col-span-2 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-200"
        >
          {{ saveError }}
        </div>

        <div class="md:col-span-2">
          <button class="hh-btn-primary px-4 py-2 text-sm" :disabled="isSaving">
            {{ isSaving ? 'Saving…' : 'Save changes' }}
          </button>
        </div>
      </div>
    </form>
  </div>
</template>
