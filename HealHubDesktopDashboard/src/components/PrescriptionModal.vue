<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { MedicinesService, PrescriptionsService, Medicine, PrescriptionItem } from '../lib/medicines'
import { useAuthStore } from '../stores/auth'
import { useToastStore } from '../stores/toast'

interface Props {
  patientId: number
  doctorId: number | string
  appointmentId?: number | null
  clinicId?: number | null
  isOpen: boolean
}

interface SelectedMedicineWithSchedule extends Medicine {
  dosage: string
  duration_type: 'day' | 'week' | 'month' | 'custom'
  duration_value: number
  frequency_type: 'once' | 'twice' | 'thrice' | 'custom'
  times_per_day: number
  specific_times: string[]
  start_date: string
}

const props = withDefaults(defineProps<Props>(), {
  appointmentId: null,
  clinicId: null,
})

const emit = defineEmits<{
  close: []
  'prescription-created': [{ prescription_id: number; items_created: number }]
}>()

const auth = useAuthStore()
const toast = useToastStore()

// ==================== WORKFLOW STEPS ====================
const step = ref<'medicine-list' | 'duration' | 'frequency' | 'next-clinic' | 'review'>('medicine-list')

// Step 1: Medicine List
const searchQuery = ref('')
const recentMedicines = ref<Medicine[]>([])
const searchResults = ref<Medicine[]>([])
const searchTab = ref<'recent' | 'all'>('all')
const currentPage = ref(0)
const pageSize = ref(15)
const totalMedicines = ref(0)
const isSearching = ref(false)
const selectedMedicineForSchedule = ref<Medicine | null>(null)

const displayedMedicines = computed(() => {
  if (searchTab.value === 'recent') {
    return recentMedicines.value
  }
  return searchResults.value
})

// Load recent medicines on mount
async function loadRecentMedicines() {
  try {
    const medicines = await MedicinesService.getRecentMedicines(props.patientId, 10, auth.accessToken)
    recentMedicines.value = medicines.map((m) => ({ ...m, selected: false }))
  } catch (e) {
    console.error('Error loading recent medicines:', e)
  }
}

// Search medicines
async function handleSearch() {
  if (searchQuery.value.length < 2) {
    searchResults.value = []
    currentPage.value = 0
    return
  }

  isSearching.value = true
  try {
    const medicines = await MedicinesService.searchMedicines(
      searchQuery.value,
      50,
      auth.accessToken,
    )
    searchResults.value = medicines.map((m) => ({ ...m, selected: false }))
  } catch (e) {
    console.error('Error searching medicines:', e)
    toast.show('Failed to search medicines', 'error')
  } finally {
    isSearching.value = false
  }
}

// Watch search query with debounce
let searchTimeout: number
watch(searchQuery, () => {
  clearTimeout(searchTimeout)
  currentPage.value = 0
  searchTimeout = window.setTimeout(handleSearch, 300)
})

// Toggle medicine selection
function selectMedicineForSchedule(medicine: Medicine) {
  selectedMedicineForSchedule.value = medicine
  step.value = 'duration'
}


// ==================== STEP 2: DURATION ====================

const currentDurationValue = ref(1)
const currentDurationType = ref<'day' | 'week' | 'month' | 'custom'>('day')

function selectDuration(type: string, value: number) {
  currentDurationType.value = type as any
  currentDurationValue.value = value
  step.value = 'frequency'
}

// ==================== STEP 3: FREQUENCY ====================

const currentFrequencyType = ref<'once' | 'twice' | 'thrice' | 'custom'>('once')
const customTimesForMedicine = ref<string[]>(['08:00', '14:00', '20:00'])
const timeLabels = ['Before Breakfast', 'After Breakfast', 'After Lunch', 'Before Dinner', 'After Dinner', 'At Bedtime']
const selectedTimeLabelsForMedicine = ref<{ time: string; label: string }[]>([])

function selectFrequency(type: string) {
  currentFrequencyType.value = type as any
  
  if (type === 'once') {
    customTimesForMedicine.value = ['08:00']
  } else if (type === 'twice') {
    customTimesForMedicine.value = ['08:00', '20:00']
  } else if (type === 'thrice') {
    customTimesForMedicine.value = ['08:00', '14:00', '20:00']
  }
}

function updateCustomTime(index: number, newTime: string) {
  customTimesForMedicine.value[index] = newTime
}

function addCustomTime() {
  customTimesForMedicine.value.push('12:00')
}

function removeCustomTime(index: number) {
  customTimesForMedicine.value.splice(index, 1)
}

function finishMedicineAndAddToList() {
  if (!selectedMedicineForSchedule.value) return

  const startDate = new Date().toISOString().split('T')[0]
  const endDate = calculateEndDate(startDate, currentDurationType.value, currentDurationValue.value)
  const timesPerDay = ['once', 'twice', 'thrice'].includes(currentFrequencyType.value)
    ? parseInt(currentFrequencyType.value[0])
    : customTimesForMedicine.value.length

  const medicineWithSchedule: SelectedMedicineWithSchedule = {
    ...selectedMedicineForSchedule.value,
    dosage: '1 tablet',
    duration_type: currentDurationType.value,
    duration_value: currentDurationValue.value,
    frequency_type: currentFrequencyType.value,
    times_per_day: timesPerDay,
    specific_times: customTimesForMedicine.value,
    start_date: startDate,
  }

  prescribedMedicines.value.push(medicineWithSchedule)
  
  // Ask if want to add another medicine
  const addAnother = window.confirm('Medicine added! Want to add another medicine?')
  if (addAnother) {
    resetForNextMedicine()
    step.value = 'medicine-list'
  } else {
    step.value = 'next-clinic'
  }
}

function resetForNextMedicine() {
  selectedMedicineForSchedule.value = null
  currentDurationType.value = 'day'
  currentDurationValue.value = 1
  currentFrequencyType.value = 'once'
  customTimesForMedicine.value = ['08:00', '14:00', '20:00']
  searchQuery.value = ''
  currentPage.value = 0
}

// ==================== STEP 4: NEXT CLINIC DATE ====================

const nextClinicDate = ref<string | null>(null)

function setNextClinicDate(dateType: string) {
  const today = new Date()
  let clinicDate = new Date(today)

  if (dateType === 'next-week') {
    clinicDate.setDate(clinicDate.getDate() + 7)
  } else if (dateType === 'next-month') {
    clinicDate.setMonth(clinicDate.getMonth() + 1)
  }

  nextClinicDate.value = clinicDate.toISOString().split('T')[0]
  step.value = 'review'
}

// ==================== STEP 5: REVIEW & FINAL ====================

const prescribedMedicines = ref<SelectedMedicineWithSchedule[]>([])
const prescriptionNotes = ref('')
const isSubmitting = ref(false)

function calculateEndDate(startDate: string, durationType: string, durationValue: number): string {
  const start = new Date(startDate)

  if (durationType === 'day') {
    start.setDate(start.getDate() + durationValue)
  } else if (durationType === 'week') {
    start.setDate(start.getDate() + durationValue * 7)
  } else if (durationType === 'month') {
    start.setMonth(start.getMonth() + durationValue)
  } else {
    start.setDate(start.getDate() + durationValue)
  }

  return start.toISOString().split('T')[0]
}

async function savePrescription() {
  if (prescribedMedicines.value.length === 0) {
    toast.show('No medicines added', 'error')
    return
  }

  isSubmitting.value = true
  try {
    const items = prescribedMedicines.value.map((medicine) => ({
      medicine_id: medicine.medicine_id,
      dosage: medicine.dosage,
      duration_type: medicine.duration_type,
      duration_value: medicine.duration_value,
      frequency_type: medicine.frequency_type,
      times_per_day: medicine.times_per_day,
      specific_times: medicine.specific_times,
      start_date: medicine.start_date,
      end_date: calculateEndDate(medicine.start_date, medicine.duration_type, medicine.duration_value),
      next_clinic_date: nextClinicDate.value,
      instructions: prescriptionNotes.value,
    }))

    const result = await PrescriptionsService.createPrescription(
      {
        patient_id: props.patientId,
        doctor_id: props.doctorId,
        appointment_id: props.appointmentId,
        clinic_id: props.clinicId,
        notes: prescriptionNotes.value,
        items,
      },
      auth.accessToken,
    )

    if (result) {
      toast.show(`Prescription saved! ${result.items_created} medicines added`, 'success')
      emit('prescription-created', result)
      resetForm()
      emit('close')
    } else {
      toast.show('Failed to save prescription', 'error')
    }
  } catch (e) {
    console.error('Error saving prescription:', e)
    toast.show('Error saving prescription', 'error')
  } finally {
    isSubmitting.value = false
  }
}

function editMedicine(index: number) {
  const medicine = prescribedMedicines.value[index]
  selectedMedicineForSchedule.value = medicine
  currentDurationType.value = medicine.duration_type
  currentDurationValue.value = medicine.duration_value
  currentFrequencyType.value = medicine.frequency_type
  customTimesForMedicine.value = medicine.specific_times
  
  prescribedMedicines.value.splice(index, 1)
  step.value = 'duration'
}

function deleteMedicine(index: number) {
  prescribedMedicines.value.splice(index, 1)
}

function resetForm() {
  step.value = 'medicine-list'
  searchQuery.value = ''
  selectedMedicineForSchedule.value = null
  prescribedMedicines.value = []
  prescriptionNotes.value = ''
  nextClinicDate.value = null
  currentPage.value = 0
  resetForNextMedicine()
}

function handleClose() {
  resetForm()
  emit('close')
}

// Load initial data
watch(
  () => props.isOpen,
  (newVal) => {
    if (newVal) {
      loadRecentMedicines()
      // Load first page of medicines
      handleSearch()
    }
  },
)
</script>

<template>
  <!-- Modal backdrop -->
  <Teleport to="body">
    <Transition name="modal-fade">
      <div v-if="isOpen" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <!-- Modal container -->
        <div class="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] flex flex-col">
          <!-- Header -->
          <div class="flex items-center justify-between p-6 border-b border-gray-200">
            <div>
              <h2 class="text-2xl font-bold text-gray-900">Add Prescription</h2>
              <p class="text-sm text-gray-600 mt-1">
                {{ step === 'medicine-list' ? '① Select Medicine' : 
                   step === 'duration' ? '② Choose Duration' : 
                   step === 'frequency' ? '③ Set Frequency' : 
                   step === 'next-clinic' ? '④ Next Clinic Date' : 
                   '⑤ Review & Save' }}
              </p>
            </div>
            <button
              @click="handleClose"
              class="text-gray-500 hover:text-gray-700 transition"
              aria-label="Close"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="24" height="24">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>
          </div>

          <!-- Content -->
          <div class="flex-1 overflow-y-auto p-6">
            <!-- STEP 1: Medicine List -->
            <div v-if="step === 'medicine-list'" class="space-y-4">
              <p class="text-gray-700 font-medium">Select a medicine to add:</p>

              <!-- Search Input -->
              <div class="relative">
                <input
                  v-model="searchQuery"
                  type="text"
                  placeholder="Search medicine by name..."
                  class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                />
                <div v-if="isSearching" class="absolute right-3 top-2">
                  <svg
                    class="animate-spin h-5 w-5 text-gray-400"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                    <path
                      class="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                </div>
              </div>

              <!-- Medicines Grid -->
              <div v-if="displayedMedicines.length > 0" class="space-y-2 max-h-96 overflow-y-auto">
                <button
                  v-for="medicine in displayedMedicines"
                  :key="medicine.medicine_id"
                  @click="selectMedicineForSchedule(medicine)"
                  class="w-full text-left p-4 rounded-lg border-2 border-gray-200 bg-white hover:border-blue-400 hover:bg-blue-50 transition"
                >
                  <div class="flex items-start justify-between">
                    <div>
                      <p class="font-semibold text-gray-900">{{ medicine.medicine_name }}</p>
                      <p class="text-sm text-gray-600">{{ medicine.generic_name || 'N/A' }}</p>
                      <div class="flex gap-2 mt-2 text-xs text-gray-500 flex-wrap">
                        <span v-if="medicine.dosage_form" class="bg-gray-100 px-2 py-1 rounded">
                          {{ medicine.dosage_form }}
                        </span>
                        <span v-if="medicine.strength" class="bg-gray-100 px-2 py-1 rounded">
                          {{ medicine.strength }}
                        </span>
                        <span v-if="medicine.category" class="bg-blue-100 text-blue-800 px-2 py-1 rounded">
                          {{ medicine.category }}
                        </span>
                      </div>
                    </div>
                    <div class="text-right">
                      <p v-if="medicine.is_low_stock" class="text-xs text-amber-600 font-medium mb-2">
                        ⚠️ Low Stock
                      </p>
                      <p class="text-xs text-gray-500">Stock: {{ medicine.quantity_in_stock }}</p>
                    </div>
                  </div>
                </button>
              </div>

              <div v-else-if="searchQuery && !isSearching" class="text-center py-8 text-gray-500">
                <p>No medicines found</p>
              </div>

              <div v-else-if="!searchQuery" class="text-center py-8 text-gray-500">
                <p>Start typing to search for medicines...</p>
              </div>
            </div>

            <!-- STEP 2: Duration Selection -->
            <div v-if="step === 'duration'" class="space-y-4">
              <div v-if="selectedMedicineForSchedule" class="mb-4 p-3 bg-blue-50 rounded-lg">
                <p class="text-sm font-medium text-blue-900">
                  Selected: <strong>{{ selectedMedicineForSchedule.medicine_name }}</strong>
                </p>
              </div>

              <p class="text-gray-700 font-medium">How long should this medicine be used?</p>

              <div class="grid grid-cols-2 gap-3">
                <button
                  @click="selectDuration('day', 1)"
                  :class="[
                    'px-4 py-3 rounded border-2 font-medium transition',
                    currentDurationType === 'day' && currentDurationValue === 1
                      ? 'border-blue-500 bg-blue-50 text-blue-600'
                      : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400',
                  ]"
                >
                  1 Day
                </button>
                <button
                  @click="selectDuration('week', 1)"
                  :class="[
                    'px-4 py-3 rounded border-2 font-medium transition',
                    currentDurationType === 'week' && currentDurationValue === 1
                      ? 'border-blue-500 bg-blue-50 text-blue-600'
                      : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400',
                  ]"
                >
                  1 Week
                </button>
                <button
                  @click="selectDuration('week', 2)"
                  :class="[
                    'px-4 py-3 rounded border-2 font-medium transition',
                    currentDurationType === 'week' && currentDurationValue === 2
                      ? 'border-blue-500 bg-blue-50 text-blue-600'
                      : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400',
                  ]"
                >
                  2 Weeks
                </button>
                <button
                  @click="selectDuration('week', 3)"
                  :class="[
                    'px-4 py-3 rounded border-2 font-medium transition',
                    currentDurationType === 'week' && currentDurationValue === 3
                      ? 'border-blue-500 bg-blue-50 text-blue-600'
                      : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400',
                  ]"
                >
                  3 Weeks
                </button>
                <button
                  @click="selectDuration('month', 1)"
                  :class="[
                    'px-4 py-3 rounded border-2 font-medium transition',
                    currentDurationType === 'month' && currentDurationValue === 1
                      ? 'border-blue-500 bg-blue-50 text-blue-600'
                      : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400',
                  ]"
                >
                  1 Month
                </button>
                <button
                  @click="selectDuration('custom', 0)"
                  :class="[
                    'px-4 py-3 rounded border-2 font-medium transition',
                    currentDurationType === 'custom'
                      ? 'border-blue-500 bg-blue-50 text-blue-600'
                      : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400',
                  ]"
                >
                  Custom Days
                </button>
              </div>

              <div v-if="currentDurationType === 'custom'" class="mt-3">
                <label class="block text-sm font-medium text-gray-700 mb-2">Number of days:</label>
                <input
                  v-model.number="currentDurationValue"
                  type="number"
                  placeholder="Enter number of days"
                  min="1"
                  class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <!-- STEP 3: Frequency Selection -->
            <div v-if="step === 'frequency'" class="space-y-4">
              <p class="text-gray-700 font-medium">How many times per day?</p>

              <div class="space-y-2">
                <button
                  @click="selectFrequency('once')"
                  :class="[
                    'w-full px-4 py-3 rounded border-2 font-medium transition text-left',
                    currentFrequencyType === 'once'
                      ? 'border-blue-500 bg-blue-50 text-blue-600'
                      : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400',
                  ]"
                >
                  Once a day (1 time)
                </button>
                <button
                  @click="selectFrequency('twice')"
                  :class="[
                    'w-full px-4 py-3 rounded border-2 font-medium transition text-left',
                    currentFrequencyType === 'twice'
                      ? 'border-blue-500 bg-blue-50 text-blue-600'
                      : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400',
                  ]"
                >
                  Twice a day (2 times)
                </button>
                <button
                  @click="selectFrequency('thrice')"
                  :class="[
                    'w-full px-4 py-3 rounded border-2 font-medium transition text-left',
                    currentFrequencyType === 'thrice'
                      ? 'border-blue-500 bg-blue-50 text-blue-600'
                      : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400',
                  ]"
                >
                  Thrice a day (3 times)
                </button>
                <button
                  @click="selectFrequency('custom')"
                  :class="[
                    'w-full px-4 py-3 rounded border-2 font-medium transition text-left',
                    currentFrequencyType === 'custom'
                      ? 'border-blue-500 bg-blue-50 text-blue-600'
                      : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400',
                  ]"
                >
                  Custom times
                </button>
              </div>

              <!-- Custom Times -->
              <div v-if="currentFrequencyType === 'custom'" class="mt-4 space-y-3 bg-gray-50 p-4 rounded-lg">
                <p class="text-sm font-medium text-gray-700">Select specific times:</p>
                <div class="space-y-2">
                  <div
                    v-for="(time, idx) in customTimesForMedicine"
                    :key="idx"
                    class="flex items-center gap-2"
                  >
                    <input
                      :value="time"
                      @input="updateCustomTime(idx, ($event.target as HTMLInputElement).value)"
                      type="time"
                      class="flex-1 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                    />
                    <select class="px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500 text-sm">
                      <option v-for="label in timeLabels" :key="label" :value="label">
                        {{ label }}
                      </option>
                    </select>
                    <button
                      v-if="customTimesForMedicine.length > 1"
                      @click="removeCustomTime(idx)"
                      class="text-red-500 hover:text-red-700 p-2"
                    >
                      ✕
                    </button>
                  </div>
                </div>
                <button
                  @click="addCustomTime"
                  class="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  + Add Time
                </button>
              </div>
            </div>

            <!-- STEP 4: Next Clinic Date -->
            <div v-if="step === 'next-clinic'" class="space-y-4">
              <p class="text-gray-700 font-medium">When is the next clinic appointment?</p>

              <div class="space-y-2">
                <button
                  @click="setNextClinicDate('next-week')"
                  :class="[
                    'w-full px-4 py-3 rounded border-2 font-medium transition text-left',
                    nextClinicDate === new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
                      ? 'border-blue-500 bg-blue-50 text-blue-600'
                      : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400',
                  ]"
                >
                  Next Week
                </button>
                <button
                  @click="setNextClinicDate('next-month')"
                  :class="[
                    'w-full px-4 py-3 rounded border-2 font-medium transition text-left',
                    nextClinicDate === new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
                      ? 'border-blue-500 bg-blue-50 text-blue-600'
                      : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400',
                  ]"
                >
                  Next Month
                </button>
              </div>

              <div class="mt-4">
                <label class="block text-sm font-medium text-gray-700 mb-2">Or select custom date:</label>
                <input
                  type="date"
                  :value="nextClinicDate"
                  @input="nextClinicDate = ($event.target as HTMLInputElement).value; step = 'review'"
                  class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <!-- STEP 5: Review -->
            <div v-if="step === 'review'" class="space-y-4">
              <p class="text-gray-700 font-medium">Review medicines added to prescription:</p>

              <div v-if="prescribedMedicines.length > 0" class="space-y-3">
                <div
                  v-for="(medicine, idx) in prescribedMedicines"
                  :key="idx"
                  class="border border-gray-200 rounded-lg p-4 hover:shadow-md transition"
                >
                  <div class="flex items-start justify-between mb-2">
                    <div>
                      <p class="font-semibold text-gray-900">{{ medicine.medicine_name }}</p>
                      <p class="text-xs text-gray-600">{{ medicine.generic_name }}</p>
                    </div>
                    <div class="flex gap-2">
                      <button
                        @click="editMedicine(idx)"
                        class="text-blue-600 hover:text-blue-700 text-sm font-medium"
                      >
                        Edit
                      </button>
                      <button
                        @click="deleteMedicine(idx)"
                        class="text-red-600 hover:text-red-700 text-sm font-medium"
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  <div class="grid grid-cols-2 gap-2 text-sm text-gray-600">
                    <p><strong>Duration:</strong> {{ medicine.duration_value }} {{ medicine.duration_type }}{{ medicine.duration_value > 1 ? 's' : '' }}</p>
                    <p><strong>Frequency:</strong> {{ medicine.times_per_day }}x daily</p>
                    <p><strong>Times:</strong> {{ medicine.specific_times.join(', ') }}</p>
                    <p><strong>Start:</strong> {{ medicine.start_date }}</p>
                  </div>
                </div>
              </div>

              <div class="mt-4">
                <label class="block text-sm font-medium text-gray-700 mb-2">Additional Notes (Optional):</label>
                <textarea
                  v-model="prescriptionNotes"
                  placeholder="Special instructions, warnings, etc..."
                  rows="3"
                  class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                />
              </div>

              <div v-if="nextClinicDate" class="mt-3 p-3 bg-green-50 rounded-lg">
                <p class="text-sm text-green-900">
                  <strong>Next Clinic:</strong> {{ new Date(nextClinicDate).toLocaleDateString() }}
                </p>
              </div>
            </div>
          </div>

          <!-- Footer -->
          <div class="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
            <button
              v-if="step !== 'medicine-list'"
              @click="
                step === 'review'
                  ? (prescribedMedicines.length > 0 ? (step = 'next-clinic') : null)
                  : (step = 'medicine-list')
              "
              class="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-100 transition font-medium"
            >
              Back
            </button>
            <div v-else></div>

            <div class="flex gap-3">
              <button
                @click="handleClose"
                class="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-100 transition font-medium"
              >
                Cancel
              </button>

              <!-- Next button for steps 1-4 -->
              <button
                v-if="step === 'duration' || step === 'frequency'"
                @click="step === 'duration' ? (step = 'frequency') : finishMedicineAndAddToList()"
                class="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
              >
                {{ step === 'duration' ? 'Next' : 'Done with this medicine' }}
              </button>

              <!-- Save button for review -->
              <button
                v-if="step === 'review'"
                @click="savePrescription"
                :disabled="isSubmitting || prescribedMedicines.length === 0"
                class="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition font-medium flex items-center gap-2"
              >
                <svg
                  v-if="isSubmitting"
                  class="animate-spin h-4 w-4"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                  <path
                    class="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                {{ isSubmitting ? 'Saving...' : 'Save Prescription' }}
              </button>

              <!-- Next for next-clinic -->
              <button
                v-if="step === 'next-clinic' && nextClinicDate"
                @click="step = 'review'"
                class="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
              >
                Review
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.2s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}
</style>
