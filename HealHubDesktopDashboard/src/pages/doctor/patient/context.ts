import type { Ref, InjectionKey } from 'vue'

export type Patient = {
  patient_id: number
  full_name: string
  dob: string
  gender: string | null
  phone: string
  address?: string | null
  blood_group?: string | null
  emergency_contact?: string | null
  has_chronic_condition?: boolean | null
  condition_notes?: string | null
}

export type ClinicRow = {
  clinic_id: number
  clinic_date: string
  start_time: string
  end_time: string | null
  status: string
  notes: string | null
  doctor_id: number
}

export type DoctorPatientContext = {
  patientId: Ref<number>
  patient: Ref<Patient | null>
  upcomingClinics: Ref<ClinicRow[]>
  isLoadingOverview: Ref<boolean>
  overviewError: Ref<string | null>
  reloadOverview: () => Promise<void>
  setPatient: (next: Patient) => void
}

export const DoctorPatientContextKey: InjectionKey<DoctorPatientContext> = Symbol('DoctorPatientContext')
