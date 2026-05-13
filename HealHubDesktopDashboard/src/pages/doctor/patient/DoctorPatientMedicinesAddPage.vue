<script setup lang="ts">
import { computed, onMounted, ref, inject } from 'vue'
import { useRouter } from 'vue-router'
import PrescriptionModal from '../../../components/PrescriptionModal.vue'
import { useAuthStore } from '../../../stores/auth'
import { useToastStore } from '../../../stores/toast'
import { DoctorPatientContextKey } from './context'

const ctx = inject(DoctorPatientContextKey)!

const auth = useAuthStore()
const toast = useToastStore()
const router = useRouter()
const isOpen = ref(false)

const doctorId = computed(() => auth.user?.user_id ?? '')

onMounted(() => {
  isOpen.value = true
})

function closeModal() {
  isOpen.value = false
  router.push(`/doctor/patients/${ctx.patientId.value}/medicines`)
}

function handlePrescriptionCreated(result: { prescription_id: number; items_created: number }) {
  // Show success toast
  toast.show(`Prescription saved! ${result.items_created} medicine(s) added`, 'success')
  
  // Close modal and navigate back to medicines list
  closeModal()
}
</script>

<template>
  <div class="rounded border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
    <div class="flex items-start justify-between gap-4">
      <div>
        <div class="text-lg font-semibold">Add medicines</div>
        <div class="text-sm text-gray-500 dark:text-gray-400">Use the guided prescription workflow</div>
      </div>
      <router-link class="rounded border border-gray-300 px-3 py-1.5 text-sm dark:border-gray-700" :to="`/doctor/patients/${ctx.patientId.value}/medicines`">Back</router-link>
    </div>

    <PrescriptionModal
      :is-open="isOpen"
      :patient-id="ctx.patientId.value"
      :doctor-id="doctorId"
      @close="closeModal"
      @prescription-created="handlePrescriptionCreated"
    />
  </div>
</template>
