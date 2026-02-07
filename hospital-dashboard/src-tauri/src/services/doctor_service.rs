use chrono::{NaiveTime, Timelike, Utc};

use crate::{
    entities::{
        appointment::UpdateAppointment,
        history::NewPatientDoctorHistory,
        medication::NewPatientMedication,
        patient::Patient,
    },
    error::{AppError, AppResult},
    repositories::{
        appointments_repo::AppointmentsRepo,
        clinic_repo::ClinicRepo,
        history_repo::HistoryRepo,
        medications_repo::MedicationsRepo,
        patients_repo::PatientsRepo,
        reports_repo::ReportsRepo,
        supabase::SupabaseRestClient,
    },
    state::AppState,
};

#[derive(Debug, serde::Serialize, serde::Deserialize)]
pub struct PatientOverview {
    pub patient: Patient,
    pub appointments: Vec<crate::entities::appointment::Appointment>,
    pub medications: Vec<crate::entities::medication::PatientMedication>,
    pub clinics: Vec<crate::entities::clinic::ClinicParticipation>,
    pub history: Vec<crate::entities::history::PatientDoctorHistory>,
    pub medical_reports: Vec<crate::entities::report::MedicalReport>,
    pub prescriptions: Vec<crate::entities::report::PrescriptionRecord>,
}

#[derive(Clone)]
pub struct DoctorService {
    patients: PatientsRepo,
    appointments: AppointmentsRepo,
    meds: MedicationsRepo,
    clinics: ClinicRepo,
    history: HistoryRepo,
    reports: ReportsRepo,
}

impl DoctorService {
    pub fn new(client: SupabaseRestClient) -> Self {
        Self {
            patients: PatientsRepo::new(client.clone()),
            appointments: AppointmentsRepo::new(client.clone()),
            meds: MedicationsRepo::new(client.clone()),
            clinics: ClinicRepo::new(client.clone()),
            history: HistoryRepo::new(client.clone()),
            reports: ReportsRepo::new(client),
        }
    }

    fn require_doctor(app: &AppState) -> AppResult<()> {
        let session = app
            .session
            .lock()
            .map_err(|_| AppError::Unexpected("failed to lock session".to_string()))?;
        let user = session
            .current_user
            .as_ref()
            .ok_or_else(|| AppError::Unauthorized("not logged in".to_string()))?;
        if user.role.as_deref() != Some("doctor") {
            return Err(AppError::Unauthorized("doctor only".to_string()));
        }
        Ok(())
    }

    pub async fn list_patients(&self, app: &AppState, limit: u32, offset: u32) -> AppResult<Vec<Patient>> {
        Self::require_doctor(app)?;
        self.patients.list(limit, offset).await
    }

    pub async fn get_patient_overview(&self, app: &AppState, patient_id: i32) -> AppResult<PatientOverview> {
        Self::require_doctor(app)?;

        let patient = self
            .patients
            .get_by_id(patient_id)
            .await?
            .ok_or_else(|| AppError::Validation("patient not found".to_string()))?;

        let appointments = self.appointments.list_for_patient(patient_id, 200).await?;
        let medications = self.meds.list_for_patient(patient_id, 200).await?;
        let clinics = self.clinics.list_for_patient(patient_id, 200).await?;
        let history = self.history.list_for_patient(patient_id, 200).await?;

        let appt_ids: Vec<i32> = appointments.iter().map(|a| a.appointment_id).collect();
        let clinic_ids: Vec<i32> = clinics.iter().map(|c| c.clinic_id).collect();

        let mut medical_reports = self.reports.medical_reports_for_appointment_ids(&appt_ids).await?;
        medical_reports.extend(self.reports.medical_reports_for_clinic_ids(&clinic_ids).await?);
        medical_reports.sort_by_key(|r| r.report_id);
        medical_reports.dedup_by_key(|r| r.report_id);

        let mut prescriptions = self.reports.prescriptions_for_appointment_ids(&appt_ids).await?;
        prescriptions.extend(self.reports.prescriptions_for_clinic_ids(&clinic_ids).await?);
        prescriptions.sort_by_key(|r| r.prescription_id);
        prescriptions.dedup_by_key(|r| r.prescription_id);

        Ok(PatientOverview {
            patient,
            appointments,
            medications,
            clinics,
            history,
            medical_reports,
            prescriptions,
        })
    }

    pub async fn list_appointments(&self, app: &AppState, doctor_id: i32, limit: u32, offset: u32) -> AppResult<Vec<crate::entities::appointment::Appointment>> {
        Self::require_doctor(app)?;
        self.appointments.list_for_doctor(doctor_id, limit, offset).await
    }

    pub async fn accept_appointment(&self, app: &AppState, appointment_id: i32) -> AppResult<crate::entities::appointment::Appointment> {
        Self::require_doctor(app)?;
        let patch = UpdateAppointment {
            status: Some("Confirmed".to_string()),
            checked_by_doctor_at: Some(Utc::now()),
            notes: None,
        };
        self.appointments.update(appointment_id, &patch).await
    }

    pub async fn reject_appointment(&self, app: &AppState, appointment_id: i32, reason: Option<String>) -> AppResult<crate::entities::appointment::Appointment> {
        Self::require_doctor(app)?;
        let patch = UpdateAppointment {
            status: Some("Cancelled".to_string()),
            checked_by_doctor_at: Some(Utc::now()),
            notes: reason,
        };
        self.appointments.update(appointment_id, &patch).await
    }

    pub async fn add_medication(
        &self,
        app: &AppState,
        new_med: NewPatientMedication,
    ) -> AppResult<crate::entities::medication::PatientMedication> {
        Self::require_doctor(app)?;
        self.meds.insert(&new_med).await
    }

    pub async fn record_patient_visit(
        &self,
        app: &AppState,
        patient_id: i32,
        doctor_id: i32,
        notes: Option<String>,
    ) -> AppResult<crate::entities::history::PatientDoctorHistory> {
        Self::require_doctor(app)?;

        let now = Utc::now();
        let new_row = NewPatientDoctorHistory {
            patient_id,
            doctor_id,
            encounter_type: "Consultation".to_string(),
            encounter_date: now.date_naive(),
            encounter_time: NaiveTime::from_hms_opt(now.hour(), now.minute(), now.second()),
            notes,
        };

        self.history.insert(&new_row).await
    }
}
