<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { api, ApiError } from '../../lib/api'
import { useAuthStore } from '../../stores/auth'

type PatientRow = {
  patient_id: number
  user_id: string
  full_name?: string
  phone?: string
  email?: string
  dob?: string
  gender?: string
  address?: string
  blood_group?: string
  emergency_contact?: string
  has_chronic_condition?: boolean
  condition_notes?: string
}

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()

const patientId = computed(() => {
  const raw = route.params.patientId
  const n = Number(raw)
  return Number.isFinite(n) ? n : NaN
})

const isLoading = ref(false)
const isSaving = ref(false)
const error = ref<string | null>(null)
const saveError = ref<string | null>(null)

const form = ref({
  email: '',
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

async function load() {
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

    const p = res.data
    form.value = {
      email: p.email || '',
      full_name: p.full_name || '',
      phone: p.phone || '',
      dob: p.dob || '',
      gender: p.gender || '',
      address: p.address || '',
      blood_group: p.blood_group || '',
      emergency_contact: p.emergency_contact || '',
      has_chronic_condition: Boolean(p.has_chronic_condition ?? false),
      condition_notes: p.condition_notes || '',
    }
  } catch (e) {
    error.value = e instanceof ApiError ? e.message : 'Failed to load patient'
  } finally {
    isLoading.value = false
  }
}

async function save() {
  if (!Number.isFinite(patientId.value)) return

  isSaving.value = true
  saveError.value = null
  try {
    const payload = {
      email: form.value.email.trim(),
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

    await api.put(`/api/admin/patients/${patientId.value}`, payload, { token: auth.accessToken })
    router.replace({ path: `/admin/patients/${patientId.value}`, query: { notice: 'patient_updated' } })
  } catch (e) {
    saveError.value = e instanceof ApiError ? e.message : 'Failed to save patient'
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
        <div class="text-xl font-semibold">Edit patient</div>
        <div class="text-sm text-gray-500">Update patient information</div>
      </div>
      <div class="flex items-center gap-2">
        <router-link class="rounded border border-gray-300 px-3 py-2 text-sm" :to="`/admin/patients/${route.params.patientId}`">Cancel</router-link>
      </div>
    </div>

    <div v-if="error" class="mt-6 rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{{ error }}</div>
    <div v-else-if="isLoading" class="mt-6 rounded border border-gray-200 bg-white px-4 py-3 text-sm text-gray-600">Loading…</div>

    <form v-else class="mt-6 rounded border border-gray-200 bg-white p-4" @submit.prevent="save">
      <div class="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div>
          <label class="block text-xs font-medium text-gray-600">Email</label>
          <input v-model="form.email" type="email" class="mt-1 w-full rounded border border-gray-300 px-3 py-2" required />
        </div>
        <div>
          <label class="block text-xs font-medium text-gray-600">Phone</label>
          <input v-model="form.phone" class="mt-1 w-full rounded border border-gray-300 px-3 py-2" required />
        </div>

        <div>
          <label class="block text-xs font-medium text-gray-600">Full name</label>
          <input v-model="form.full_name" class="mt-1 w-full rounded border border-gray-300 px-3 py-2" required />
        </div>
        <div>
          <label class="block text-xs font-medium text-gray-600">DOB</label>
          <input v-model="form.dob" type="date" class="mt-1 w-full rounded border border-gray-300 px-3 py-2" required />
        </div>

        <div>
          <label class="block text-xs font-medium text-gray-600">Gender</label>
          <input v-model="form.gender" class="mt-1 w-full rounded border border-gray-300 px-3 py-2" required />
        </div>
        <div>
          <label class="block text-xs font-medium text-gray-600">Address</label>
          <input v-model="form.address" class="mt-1 w-full rounded border border-gray-300 px-3 py-2" required />
        </div>

        <div>
          <label class="block text-xs font-medium text-gray-600">Blood group</label>
          <input v-model="form.blood_group" class="mt-1 w-full rounded border border-gray-300 px-3 py-2" placeholder="Optional" />
        </div>
        <div>
          <label class="block text-xs font-medium text-gray-600">Emergency contact</label>
          <input v-model="form.emergency_contact" class="mt-1 w-full rounded border border-gray-300 px-3 py-2" placeholder="Optional" />
        </div>

        <div class="md:col-span-2 flex items-center gap-2">
          <input id="has_chronic_condition" v-model="form.has_chronic_condition" type="checkbox" class="h-4 w-4" />
          <label for="has_chronic_condition" class="text-sm text-gray-700">Has chronic condition</label>
        </div>

        <div class="md:col-span-2">
          <label class="block text-xs font-medium text-gray-600">Condition notes</label>
          <textarea v-model="form.condition_notes" rows="3" class="mt-1 w-full rounded border border-gray-300 px-3 py-2" placeholder="Optional" />
        </div>

        <div v-if="saveError" class="md:col-span-2 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
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
