<script setup lang="ts">
import { computed, inject, onMounted, ref } from 'vue'
import { api, ApiError } from '../../../lib/api'
import { useAuthStore } from '../../../stores/auth'
import { DoctorPatientContextKey, type ClinicRow } from './context'

const ctx = inject(DoctorPatientContextKey)!

const auth = useAuthStore()

const clinics = ref<ClinicRow[]>([])
const clinicsCount = ref(0)
const clinicsPage = ref(1)
const clinicsPageSize = ref(25)
const clinicsFrom = ref('')
const clinicsTo = ref('')
const selectedClinicDate = ref<string | null>(null)
const isLoadingClinics = ref(false)
const clinicsError = ref<string | null>(null)

const clinicDates = computed(() => {
  const set = new Set<string>()
  for (const c of clinics.value) set.add(c.clinic_date)
  return Array.from(set).sort().reverse()
})

const clinicsFiltered = computed(() => {
  if (!selectedClinicDate.value) return clinics.value
  return clinics.value.filter((c) => c.clinic_date === selectedClinicDate.value)
})

async function loadClinics() {
  isLoadingClinics.value = true
  clinicsError.value = null
  try {
    const res = await api.get<{ success: boolean; data: ClinicRow[]; count: number }>(
      `/api/doctor/patients/${ctx.patientId.value}/clinic-participation`,
      {
        token: auth.accessToken,
        query: {
          page: clinicsPage.value,
          page_size: clinicsPageSize.value,
          from: clinicsFrom.value || undefined,
          to: clinicsTo.value || undefined,
        },
      },
    )
    clinics.value = res.data || []
    clinicsCount.value = res.count || 0
    if (selectedClinicDate.value && !clinicDates.value.includes(selectedClinicDate.value)) {
      selectedClinicDate.value = null
    }
  } catch (e) {
    clinicsError.value = e instanceof ApiError ? e.message : 'Failed to load clinics'
  } finally {
    isLoadingClinics.value = false
  }
}

onMounted(loadClinics)
</script>

<template>
  <div class="rounded border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
    <div class="flex flex-wrap items-end justify-between gap-3">
      <div>
        <div class="text-lg font-semibold">Clinic participation</div>
        <div class="text-sm text-gray-500 dark:text-gray-400">Click a date to filter records for that day</div>
      </div>
      <div class="flex flex-wrap gap-2">
        <router-link class="rounded border border-gray-300 px-3 py-1.5 text-sm dark:border-gray-700" :to="`/doctor/patients/${ctx.patientId.value}/clinics/add`">Add clinic participation</router-link>
        <router-link class="rounded border border-gray-300 px-3 py-1.5 text-sm dark:border-gray-700" :to="`/doctor/patients/${ctx.patientId.value}/clinics/attendance`">Patient come / not</router-link>
        <button class="rounded border border-gray-300 px-3 py-1.5 text-sm dark:border-gray-700" @click="loadClinics" :disabled="isLoadingClinics">Refresh</button>
      </div>
    </div>

    <div class="mt-4 grid grid-cols-1 gap-3 md:grid-cols-4">
      <div>
        <label class="block text-sm font-medium">From</label>
        <input v-model="clinicsFrom" type="date" class="mt-1 w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-950" />
      </div>
      <div>
        <label class="block text-sm font-medium">To</label>
        <input v-model="clinicsTo" type="date" class="mt-1 w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-950" />
      </div>
      <div>
        <label class="block text-sm font-medium">Page size</label>
        <select v-model.number="clinicsPageSize" class="mt-1 w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-950" @change="clinicsPage=1; loadClinics()">
          <option :value="10">10</option>
          <option :value="25">25</option>
          <option :value="50">50</option>
        </select>
      </div>
      <div class="flex items-end">
        <button class="w-full rounded bg-gray-900 px-3 py-2 text-sm text-white" @click="clinicsPage=1; loadClinics()">Apply</button>
      </div>
    </div>

    <div v-if="clinicsError" class="mt-4 text-sm text-red-700 dark:text-red-200">{{ clinicsError }}</div>
    <div v-else-if="isLoadingClinics" class="mt-4 text-sm text-gray-600 dark:text-gray-300">Loading…</div>
    <div v-else-if="clinics.length === 0" class="mt-4 text-sm text-gray-600 dark:text-gray-300">No clinic participation records.</div>
    <div v-else class="mt-4">
      <div class="mb-3 flex flex-wrap gap-2">
        <button
          class="rounded border border-gray-300 px-3 py-1.5 text-sm dark:border-gray-700"
          :class="selectedClinicDate===null ? 'bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900' : ''"
          @click="selectedClinicDate=null"
        >
          All
        </button>
        <button
          v-for="d in clinicDates"
          :key="d"
          class="rounded border border-gray-300 px-3 py-1.5 text-sm dark:border-gray-700"
          :class="selectedClinicDate===d ? 'bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900' : ''"
          @click="selectedClinicDate=d"
        >
          {{ d }}
        </button>
      </div>

      <div class="overflow-auto">
        <table class="min-w-full text-left text-sm">
          <thead class="bg-gray-50 text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-200">
            <tr>
              <th class="px-3 py-2">Date</th>
              <th class="px-3 py-2">Start</th>
              <th class="px-3 py-2">End</th>
              <th class="px-3 py-2">Status</th>
              <th class="px-3 py-2">Notes</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="c in clinicsFiltered" :key="c.clinic_id" class="border-t border-gray-100 dark:border-gray-800">
              <td class="px-3 py-2">{{ c.clinic_date }}</td>
              <td class="px-3 py-2">{{ c.start_time }}</td>
              <td class="px-3 py-2">{{ c.end_time || '—' }}</td>
              <td class="px-3 py-2">{{ c.status }}</td>
              <td class="px-3 py-2">{{ c.notes || '—' }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="mt-3 flex items-center justify-between gap-2 text-sm">
        <div class="text-gray-600 dark:text-gray-300">Total: {{ clinicsCount }}</div>
        <div class="flex items-center gap-2">
          <button class="rounded border border-gray-300 px-3 py-1.5 text-sm disabled:opacity-60 dark:border-gray-700" @click="clinicsPage=Math.max(1, clinicsPage-1); loadClinics()" :disabled="clinicsPage<=1 || isLoadingClinics">Prev</button>
          <button class="rounded border border-gray-300 px-3 py-1.5 text-sm disabled:opacity-60 dark:border-gray-700" @click="clinicsPage=clinicsPage+1; loadClinics()" :disabled="(clinicsPage*clinicsPageSize)>=clinicsCount || isLoadingClinics">Next</button>
        </div>
      </div>
    </div>
  </div>
</template>
