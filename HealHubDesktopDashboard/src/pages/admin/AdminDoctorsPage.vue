<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { api, ApiError } from '../../lib/api'
import { useAuthStore } from '../../stores/auth'

type DoctorRow = {
  doctor_id: number
  user_id: string
  full_name: string
  specialization?: string
  phone?: string
  email?: string
  consultation_fee?: number
  is_available?: boolean
  created_at?: string
}

const auth = useAuthStore()

const rows = ref<DoctorRow[]>([])
const isLoading = ref(false)
const error = ref<string | null>(null)

const createError = ref<string | null>(null)
const createLoading = ref(false)
const form = ref({
  email: '',
  password: '',
  full_name: '',
  specialization: '',
  phone: '',
  consultation_fee: '',
})

async function load() {
  isLoading.value = true
  error.value = null
  try {
    const res = await api.get<{ success: boolean; data: DoctorRow[] }>('/api/admin/doctors', {
      token: auth.accessToken,
    })
    rows.value = res.data || []
  } catch (e) {
    error.value = e instanceof ApiError ? e.message : 'Failed to load doctors'
  } finally {
    isLoading.value = false
  }
}

async function createDoctor() {
  createLoading.value = true
  createError.value = null
  try {
    const fee = form.value.consultation_fee ? Number(form.value.consultation_fee) : 0
    const payload = {
      email: form.value.email,
      password: form.value.password,
      full_name: form.value.full_name,
      specialization: form.value.specialization,
      phone: form.value.phone,
      consultation_fee: Number.isFinite(fee) ? fee : 0,
    }
    await api.post('/api/admin/doctors', payload, { token: auth.accessToken })
    form.value = { email: '', password: '', full_name: '', specialization: '', phone: '', consultation_fee: '' }
    await load()
  } catch (e) {
    createError.value = e instanceof ApiError ? e.message : 'Failed to create doctor'
  } finally {
    createLoading.value = false
  }
}

async function deleteDoctor(doctorId: number) {
  if (!confirm('Delete this doctor?')) return
  try {
    await api.del(`/api/admin/doctors/${doctorId}`, { token: auth.accessToken })
    await load()
  } catch (e) {
    alert(e instanceof ApiError ? e.message : 'Failed to delete doctor')
  }
}

onMounted(load)
</script>

<template>
  <div>
    <div class="text-xl font-semibold">Doctors</div>

    <div class="mt-4 rounded border border-gray-200 bg-white p-4">
      <div class="text-sm font-medium">Create doctor</div>
      <form class="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2" @submit.prevent="createDoctor">
        <div>
          <label class="block text-xs font-medium text-gray-600">Email</label>
          <input v-model="form.email" type="email" class="mt-1 w-full rounded border border-gray-300 px-3 py-2" required />
        </div>
        <div>
          <label class="block text-xs font-medium text-gray-600">Password</label>
          <input v-model="form.password" type="password" class="mt-1 w-full rounded border border-gray-300 px-3 py-2" required />
        </div>
        <div>
          <label class="block text-xs font-medium text-gray-600">Full name</label>
          <input v-model="form.full_name" class="mt-1 w-full rounded border border-gray-300 px-3 py-2" required />
        </div>
        <div>
          <label class="block text-xs font-medium text-gray-600">Specialization</label>
          <input v-model="form.specialization" class="mt-1 w-full rounded border border-gray-300 px-3 py-2" required />
        </div>
        <div>
          <label class="block text-xs font-medium text-gray-600">Phone</label>
          <input v-model="form.phone" class="mt-1 w-full rounded border border-gray-300 px-3 py-2" required />
        </div>
        <div>
          <label class="block text-xs font-medium text-gray-600">Consultation fee</label>
          <input v-model="form.consultation_fee" inputmode="decimal" class="mt-1 w-full rounded border border-gray-300 px-3 py-2" placeholder="0" />
        </div>

        <div v-if="createError" class="md:col-span-2 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {{ createError }}
        </div>

        <div class="md:col-span-2">
          <button class="rounded bg-gray-900 px-4 py-2 text-sm text-white disabled:opacity-60" :disabled="createLoading">
            {{ createLoading ? 'Creating…' : 'Create doctor' }}
          </button>
        </div>
      </form>
    </div>

    <div class="mt-6 rounded border border-gray-200 bg-white">
      <div class="flex items-center justify-between border-b border-gray-200 px-4 py-3">
        <div class="text-sm font-medium">Doctor list</div>
        <button class="rounded border border-gray-300 px-3 py-1.5 text-sm" @click="load" :disabled="isLoading">
          Refresh
        </button>
      </div>

      <div v-if="error" class="px-4 py-3 text-sm text-red-700">{{ error }}</div>
      <div v-else-if="isLoading" class="px-4 py-3 text-sm text-gray-600">Loading…</div>

      <div class="overflow-auto">
        <table class="min-w-full text-left text-sm">
          <thead class="bg-gray-50 text-xs text-gray-600">
            <tr>
              <th class="px-4 py-2">Name</th>
              <th class="px-4 py-2">Specialization</th>
              <th class="px-4 py-2">Email</th>
              <th class="px-4 py-2">Phone</th>
              <th class="px-4 py-2">Fee</th>
              <th class="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in rows" :key="r.doctor_id" class="border-t border-gray-100">
              <td class="px-4 py-2">{{ r.full_name }}</td>
              <td class="px-4 py-2">{{ r.specialization || '-' }}</td>
              <td class="px-4 py-2">{{ r.email || '-' }}</td>
              <td class="px-4 py-2">{{ r.phone || '-' }}</td>
              <td class="px-4 py-2">{{ r.consultation_fee ?? '-' }}</td>
              <td class="px-4 py-2 text-right">
                <button class="rounded border border-gray-300 px-3 py-1.5 text-xs" @click="deleteDoctor(r.doctor_id)">
                  Delete
                </button>
              </td>
            </tr>
            <tr v-if="!isLoading && rows.length === 0">
              <td class="px-4 py-4 text-sm text-gray-600" colspan="6">No doctors found.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
