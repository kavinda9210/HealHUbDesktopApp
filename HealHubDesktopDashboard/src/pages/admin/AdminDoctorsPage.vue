<script setup lang="ts">
import { onActivated, onMounted, ref } from 'vue'
import { type LocationQueryRaw, useRoute, useRouter } from 'vue-router'
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
const route = useRoute()
const router = useRouter()

const rows = ref<DoctorRow[]>([])
const isLoading = ref(false)
const error = ref<string | null>(null)

const success = ref<string | null>(null)
const actionError = ref<string | null>(null)

let successTimer: number | null = null
let errorTimer: number | null = null

function showSuccess(msg: string) {
  success.value = msg
  if (successTimer) window.clearTimeout(successTimer)
  successTimer = window.setTimeout(() => {
    success.value = null
    successTimer = null
  }, 3000)
}

function showError(msg: string) {
  actionError.value = msg
  if (errorTimer) window.clearTimeout(errorTimer)
  errorTimer = window.setTimeout(() => {
    actionError.value = null
    errorTimer = null
  }, 4000)
}

const filters = ref({
  q: '',
  specialization: '',
  min_fee: '',
  max_fee: '',
})

async function load() {
  isLoading.value = true
  error.value = null
  try {
    const minFee = filters.value.min_fee.trim() ? Number(filters.value.min_fee) : NaN
    const maxFee = filters.value.max_fee.trim() ? Number(filters.value.max_fee) : NaN
    const res = await api.get<{ success: boolean; data: DoctorRow[] }>('/api/admin/doctors', {
      token: auth.accessToken,
      query: {
        q: filters.value.q.trim() || undefined,
        specialization: filters.value.specialization.trim() || undefined,
        min_fee: Number.isFinite(minFee) ? minFee : undefined,
        max_fee: Number.isFinite(maxFee) ? maxFee : undefined,
      },
    })
    rows.value = res.data || []
  } catch (e) {
    error.value = e instanceof ApiError ? e.message : 'Failed to load doctors'
  } finally {
    isLoading.value = false
  }
}

async function applyFilters() {
  success.value = null
  actionError.value = null
  await load()
}

async function clearFilters() {
  filters.value = { q: '', specialization: '', min_fee: '', max_fee: '' }
  success.value = null
  actionError.value = null
  await load()
}

function consumeNotice() {
  const notice = route.query.notice
  if (typeof notice !== 'string' || !notice) {
    // When returning to this keep-alive page, clear stale notices.
    success.value = null
    actionError.value = null
    return
  }

  if (notice === 'doctor_created') showSuccess('Doctor created successfully.')
  else if (notice === 'doctor_updated') showSuccess('Doctor updated successfully.')
  else if (notice === 'doctor_deleted') showSuccess('Doctor deleted successfully.')

  const nextQuery: LocationQueryRaw = { ...route.query }
  delete (nextQuery as any).notice
  router.replace({ query: nextQuery })
}

async function deleteDoctor(doctorId: number) {
  if (!confirm('Delete this doctor?')) return
  actionError.value = null
  success.value = null
  try {
    await api.del(`/api/admin/doctors/${doctorId}`, { token: auth.accessToken })
    showSuccess('Doctor deleted successfully.')
    await load()
  } catch (e) {
    showError(e instanceof ApiError ? e.message : 'Failed to delete doctor')
  }
}

onMounted(() => {
  consumeNotice()
  load()
})
onActivated(() => {
  consumeNotice()
  load()
})
</script>

<template>
  <div>
    <div class="flex items-start justify-between gap-4">
      <div>
        <div class="text-xl font-semibold">Doctors</div>
        <div class="text-sm text-gray-500 dark:text-gray-400">Manage doctors</div>
      </div>
      <div class="flex items-center gap-2">
        <router-link class="rounded bg-gray-900 px-4 py-2 text-sm text-white" to="/admin/doctors/create">
          Create doctor
        </router-link>
      </div>
    </div>

    <div
      v-if="success"
      class="mt-4 rounded border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700 dark:border-green-900 dark:bg-green-950 dark:text-green-200"
    >
      {{ success }}
    </div>
    <div
      v-if="actionError"
      class="mt-4 rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-200"
    >
      {{ actionError }}
    </div>

    <div class="mt-4 rounded border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
      <div class="text-sm font-medium">Filter doctors</div>
      <form class="mt-3 grid grid-cols-1 gap-3 md:grid-cols-4" @submit.prevent="applyFilters">
        <div>
          <label class="block text-xs font-medium text-gray-600 dark:text-gray-300">Name</label>
          <input
            v-model="filters.q"
            class="mt-1 w-full rounded border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder-gray-400 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:placeholder-gray-500"
            placeholder="Search by name"
          />
        </div>
        <div>
          <label class="block text-xs font-medium text-gray-600 dark:text-gray-300">Specialization</label>
          <input
            v-model="filters.specialization"
            class="mt-1 w-full rounded border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder-gray-400 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:placeholder-gray-500"
            placeholder="e.g. Cardiologist"
          />
        </div>
        <div>
          <label class="block text-xs font-medium text-gray-600 dark:text-gray-300">Min fee</label>
          <input
            v-model="filters.min_fee"
            inputmode="decimal"
            class="mt-1 w-full rounded border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder-gray-400 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:placeholder-gray-500"
            placeholder="0"
          />
        </div>
        <div>
          <label class="block text-xs font-medium text-gray-600 dark:text-gray-300">Max fee</label>
          <input
            v-model="filters.max_fee"
            inputmode="decimal"
            class="mt-1 w-full rounded border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder-gray-400 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:placeholder-gray-500"
            placeholder="1000"
          />
        </div>

        <div class="md:col-span-4 flex items-center gap-2">
          <button class="rounded bg-gray-900 px-4 py-2 text-sm text-white disabled:opacity-60" :disabled="isLoading">
            Apply filters
          </button>
          <button
            type="button"
            class="rounded border border-gray-300 px-4 py-2 text-sm dark:border-gray-700 dark:text-gray-100"
            @click="clearFilters"
            :disabled="isLoading"
          >
            Clear
          </button>
        </div>
      </form>
    </div>

    <div class="mt-6 rounded border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
      <div class="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-800">
        <div class="text-sm font-medium">Doctor list</div>
        <button
          class="rounded border border-gray-300 px-3 py-1.5 text-sm dark:border-gray-700 dark:text-gray-100"
          @click="load"
          :disabled="isLoading"
        >
          Refresh
        </button>
      </div>

      <div v-if="error" class="px-4 py-3 text-sm text-red-700 dark:text-red-200">{{ error }}</div>
      <div v-else-if="isLoading" class="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">Loading…</div>

      <div class="overflow-auto">
        <table class="min-w-full text-left text-sm text-gray-900 dark:text-gray-100">
          <thead class="bg-gray-50 text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-200">
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
            <tr v-for="r in rows" :key="r.doctor_id" class="border-t border-gray-100 dark:border-gray-800">
              <td class="px-4 py-2">{{ r.full_name }}</td>
              <td class="px-4 py-2">{{ r.specialization || '-' }}</td>
              <td class="px-4 py-2">{{ r.email || '-' }}</td>
              <td class="px-4 py-2">{{ r.phone || '-' }}</td>
              <td class="px-4 py-2">{{ r.consultation_fee ?? '-' }}</td>
              <td class="px-4 py-2 text-right">
                <div class="flex justify-end gap-2">
                  <router-link
                    class="rounded border border-gray-300 px-3 py-1.5 text-xs dark:border-gray-700 dark:text-gray-100"
                    :to="`/admin/doctors/${r.doctor_id}`"
                  >
                    View
                  </router-link>
                  <router-link
                    class="rounded border border-gray-300 px-3 py-1.5 text-xs dark:border-gray-700 dark:text-gray-100"
                    :to="`/admin/doctors/${r.doctor_id}/edit`"
                  >
                    Edit
                  </router-link>
                  <router-link
                    class="rounded border border-gray-300 px-3 py-1.5 text-xs dark:border-gray-700 dark:text-gray-100"
                    :to="`/admin/doctors/${r.doctor_id}/alerts`"
                  >
                    Alerts
                  </router-link>
                  <button
                    class="rounded border border-gray-300 px-3 py-1.5 text-xs dark:border-gray-700 dark:text-gray-100"
                    @click="deleteDoctor(r.doctor_id)"
                  >
                    Delete
                  </button>
                </div>
              </td>
            </tr>
            <tr v-if="!isLoading && rows.length === 0">
              <td class="px-4 py-4 text-sm text-gray-600 dark:text-gray-300" colspan="6">No doctors found.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
