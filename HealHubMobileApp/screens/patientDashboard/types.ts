export type PatientNotification = {
  notification_id: number;
  title: string;
  message: string;
  type: string;
  is_read?: boolean;
  created_at?: string;
};

export type DoctorRow = {
  doctor_id: number;
  full_name: string;
  specialization: string;
  consultation_fee?: number;
  is_available?: boolean;
  start_time?: string | null;
  end_time?: string | null;
};

export type AppointmentRow = {
  appointment_id: number;
  patient_id: number;
  doctor_id: number;
  appointment_date: string;
  appointment_time: string;
  status: string;
  symptoms?: string | null;
  notes?: string | null;
  booked_at?: string;
};

export type ClinicRow = {
  clinic_id: number;
  patient_id: number;
  doctor_id: number;
  clinic_date: string;
  start_time: string;
  end_time?: string | null;
  status: string;
  notes?: string | null;
};

export type MedicationRow = {
  medication_id: number;
  patient_id: number;
  doctor_id: number;
  medicine_name: string;
  dosage: string;
  frequency: string;
  times_per_day: number;
  specific_times?: any;
  start_date: string;
  end_date?: string | null;
  next_clinic_date?: string | null;
  is_active?: boolean;
};

export type MedicineReminderRow = {
  reminder_id: number;
  patient_id: number;
  medication_id: number;
  reminder_date: string;
  reminder_time: string;
  status: string;
  medicine_name?: string | null;
  dosage?: string | null;
  notes?: string | null;
  doctor_name?: string | null;
  doctor_specialization?: string | null;
};

export type MedicalReportRow = {
  report_id?: number;
  appointment_id?: number | null;
  clinic_id?: number | null;
  diagnosis?: string | null;
  prescription?: string | null;
  notes?: string | null;
  created_at?: string | null;
  doctor_name?: string | null;
  specialization?: string | null;
};
