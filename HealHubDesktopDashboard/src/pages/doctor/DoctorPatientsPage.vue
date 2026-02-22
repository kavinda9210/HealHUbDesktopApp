<script setup lang="ts">
import { computed, onActivated, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { api, ApiError } from '../../lib/api'
import { useAuthStore } from '../../stores/auth'
import { useToastStore } from '../../stores/toast'

type PatientRow = {
  patient_id: number
  full_name: string
  dob: string
  gender: string | null
  phone: string
  blood_group: string | null
  emergency_contact: string | null
  has_chronic_condition: boolean | null
  created_at?: string
}

const auth = useAuthStore()
const toast = useToastStore()
const router = useRouter()

const q = ref('')
const chronicOnly = ref(false)
const todayAppointmentsOnly = ref(false)

const sortBy = ref<'created_at' | 'full_name' | 'dob' | 'phone' | 'blood_group' | 'has_chronic_condition'>('created_at')
const sortDir = ref<'asc' | 'desc'>('desc')

const page = ref(1)
const pageSize = ref(20)

const rows = ref<PatientRow[]>([])
const total = ref(0)
const isLoading = ref(false)
const error = ref<string | null>(null)

const totalPages = computed(() => Math.max(1, Math.ceil((total.value || 0) / pageSize.value)))

function toggleSort(col: typeof sortBy.value) {
  if (sortBy.value === col) {
    sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortBy.value = col
    sortDir.value = 'asc'
  }
}

function sortIndicator(col: typeof sortBy.value) {
  if (sortBy.value !== col) return ''
  return sortDir.value === 'asc' ? '▲' : '▼'
}

async function load() {
  isLoading.value = true
  error.value = null
  try {
    const res = await api.get<{
      success: boolean
      data: PatientRow[]
      count: number
      page: number
      page_size: number
    }>('/api/doctor/patients', {
      token: auth.accessToken,
      query: {
        q: q.value.trim() || undefined,
        chronic_only: chronicOnly.value ? 1 : undefined,
        today_appointments: todayAppointmentsOnly.value ? 1 : undefined,
        page: page.value,
        page_size: pageSize.value,
        sort_by: sortBy.value,
        sort_dir: sortDir.value,
      },
    })

    rows.value = res.data || []
    total.value = res.count || 0
  } catch (e) {
    error.value = e instanceof ApiError ? e.message : 'Failed to load patients'
  } finally {
    isLoading.value = false
  }
}

function openPatient(r: PatientRow) {
  router.push(`/doctor/patients/${r.patient_id}/overview`)
}

function resetToFirstPage() {
  page.value = 1
}

watch([chronicOnly, todayAppointmentsOnly, pageSize, sortBy, sortDir], () => {
  resetToFirstPage()
  load()
})

let qTimer: number | null = null
watch(q, () => {
  resetToFirstPage()
  if (qTimer) window.clearTimeout(qTimer)
  qTimer = window.setTimeout(() => {
    load()
  }, 300)
})

onMounted(load)
onActivated(load)

function nextPage() {
  if (page.value >= totalPages.value) return
  page.value += 1
  load()
}

function prevPage() {
  if (page.value <= 1) return
  page.value -= 1
  load()
}

function refresh() {
  toast.show('Refreshing…', 'info', 1200)
  load()
}
</script>

<template>
  <div>
    <div class="flex items-start justify-between gap-4">
      <div>
        <div class="text-xl font-semibold">Patients</div>
        <div class="mt-1 text-sm text-gray-500 dark:text-gray-400">Search, filter, and open patient care records</div>
      </div>
      <button
        class="rounded border border-gray-300 px-3 py-1.5 text-sm dark:border-gray-700"
        @click="refresh"
        :disabled="isLoading"
      >
        Refresh
      </button>
    </div>

    <div class="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
      <div class="md:col-span-2">
        <label class="block text-sm font-medium">Search</label>
        <input
          v-model="q"
          class="mt-1 w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-950"
          placeholder="Search by name or phone"
        />
      </div>
      <div>
        <label class="block text-sm font-medium">Page size</label>
        <select
          v-model.number="pageSize"
          class="mt-1 w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-950"
        >
          <option :value="10">10</option>
          <option :value="20">20</option>
          <option :value="50">50</option>
        </select>
      </div>
    </div>

    <div class="mt-3 flex flex-wrap items-center gap-4 text-sm">
      <label class="inline-flex items-center gap-2">
        <input v-model="chronicOnly" type="checkbox" class="h-4 w-4" />
        Chronic only
      </label>
      <label class="inline-flex items-center gap-2">
        <input v-model="todayAppointmentsOnly" type="checkbox" class="h-4 w-4" />
        Today’s appointments
      </label>
      <div class="text-gray-500 dark:text-gray-400">Showing {{ rows.length }} of {{ total }}</div>
    </div>

    <div class="mt-4 rounded border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
      <div v-if="error" class="px-4 py-3 text-sm text-red-700 dark:text-red-200">{{ error }}</div>
      <div v-else-if="isLoading" class="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">Loading…</div>

      <div class="overflow-auto">
        <table class="min-w-full text-left text-sm">
          <thead class="bg-gray-50 text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-200">
            <tr>
              <th class="px-4 py-2 cursor-pointer select-none" @click="toggleSort('full_name')">Name {{ sortIndicator('full_name') }}</th>
              <th class="px-4 py-2 cursor-pointer select-none" @click="toggleSort('dob')">DOB {{ sortIndicator('dob') }}</th>
              <th class="px-4 py-2">Gender</th>
              <th class="px-4 py-2 cursor-pointer select-none" @click="toggleSort('phone')">Phone {{ sortIndicator('phone') }}</th>
              <th class="px-4 py-2 cursor-pointer select-none" @click="toggleSort('blood_group')">Blood {{ sortIndicator('blood_group') }}</th>
              <th class="px-4 py-2">Emergency</th>
              <th class="px-4 py-2 cursor-pointer select-none" @click="toggleSort('has_chronic_condition')">Chronic {{ sortIndicator('has_chronic_condition') }}</th>
              <th class="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="r in rows"
              :key="r.patient_id"
              class="border-t border-gray-100 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-800/30"
            >
              <td class="px-4 py-2 font-medium">{{ r.full_name }}</td>
              <td class="px-4 py-2">{{ r.dob }}</td>
              <td class="px-4 py-2">{{ r.gender || '—' }}</td>
              <td class="px-4 py-2">{{ r.phone }}</td>
              <td class="px-4 py-2">{{ r.blood_group || '—' }}</td>
              <td class="px-4 py-2">{{ r.emergency_contact || '—' }}</td>
              <td class="px-4 py-2">
                <span
                  v-if="r.has_chronic_condition"
                  class="inline-flex items-center rounded border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-200"
                >
                  Yes
                </span>
                <span v-else class="text-gray-500 dark:text-gray-400">No</span>
              </td>
              <td class="px-4 py-2 text-right">
                <button
                  class="rounded bg-gray-900 px-3 py-1.5 text-xs text-white"
                  @click="openPatient(r)"
                >
                  Open
                </button>
              </td>
            </tr>
            <tr v-if="!isLoading && rows.length === 0">
              <td colspan="8" class="px-4 py-4 text-sm text-gray-600 dark:text-gray-300">No patients found.</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="flex items-center justify-between border-t border-gray-100 px-4 py-3 text-sm dark:border-gray-800">
        <div>Page {{ page }} / {{ totalPages }}</div>
        <div class="space-x-2">
          <button
            class="rounded border border-gray-300 px-3 py-1.5 text-sm disabled:opacity-60 dark:border-gray-700"
            @click="prevPage"
            :disabled="isLoading || page <= 1"
          >
            Prev
          </button>
          <button
            class="rounded border border-gray-300 px-3 py-1.5 text-sm disabled:opacity-60 dark:border-gray-700"
            @click="nextPage"
            :disabled="isLoading || page >= totalPages"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
