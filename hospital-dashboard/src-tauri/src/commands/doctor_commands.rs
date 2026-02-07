use tauri::State;

use crate::{
    entities::medication::NewPatientMedication,
    error::AppError,
    repositories::supabase::SupabaseRestClient,
    services::{clinic_date, doctor_service::DoctorService},
    state::AppState,
};

fn map_err(e: AppError) -> String {
    e.to_string()
}

#[derive(Debug, serde::Deserialize)]
pub struct AddMedicationRequest {
    pub patient_id: i32,
    pub doctor_id: i32,
    pub medicine_name: String,
    pub dosage: String,
    pub frequency: String,
    pub times_per_day: i32,
    pub specific_times: Option<serde_json::Value>,
    pub start_date: chrono::NaiveDate,
    pub end_date: Option<chrono::NaiveDate>,
    pub next_clinic_date: Option<chrono::NaiveDate>,
    pub is_active: bool,
    pub notes: Option<String>,
}

#[tauri::command]
pub async fn doctor_list_patients(
    state: State<'_, AppState>,
    limit: u32,
    offset: u32,
) -> Result<Vec<crate::entities::patient::Patient>, String> {
    let client = SupabaseRestClient::from_env().map_err(map_err)?;
    let svc = DoctorService::new(client);
    svc.list_patients(&state, limit, offset).await.map_err(map_err)
}

#[tauri::command]
pub async fn doctor_get_patient_overview(
    state: State<'_, AppState>,
    patient_id: i32,
) -> Result<crate::services::doctor_service::PatientOverview, String> {
    let client = SupabaseRestClient::from_env().map_err(map_err)?;
    let svc = DoctorService::new(client);
    svc.get_patient_overview(&state, patient_id).await.map_err(map_err)
}

#[tauri::command]
pub async fn doctor_list_appointments(
    state: State<'_, AppState>,
    doctor_id: i32,
    limit: u32,
    offset: u32,
) -> Result<Vec<crate::entities::appointment::Appointment>, String> {
    let client = SupabaseRestClient::from_env().map_err(map_err)?;
    let svc = DoctorService::new(client);
    svc.list_appointments(&state, doctor_id, limit, offset)
        .await
        .map_err(map_err)
}

#[tauri::command]
pub async fn doctor_accept_appointment(
    state: State<'_, AppState>,
    appointment_id: i32,
) -> Result<crate::entities::appointment::Appointment, String> {
    let client = SupabaseRestClient::from_env().map_err(map_err)?;
    let svc = DoctorService::new(client);
    svc.accept_appointment(&state, appointment_id)
        .await
        .map_err(map_err)
}

#[tauri::command]
pub async fn doctor_reject_appointment(
    state: State<'_, AppState>,
    appointment_id: i32,
    reason: Option<String>,
) -> Result<crate::entities::appointment::Appointment, String> {
    let client = SupabaseRestClient::from_env().map_err(map_err)?;
    let svc = DoctorService::new(client);
    svc.reject_appointment(&state, appointment_id, reason)
        .await
        .map_err(map_err)
}

#[tauri::command]
pub async fn doctor_add_medication(
    state: State<'_, AppState>,
    req: AddMedicationRequest,
) -> Result<crate::entities::medication::PatientMedication, String> {
    let client = SupabaseRestClient::from_env().map_err(map_err)?;
    let svc = DoctorService::new(client);

    let next_clinic_date = match req.next_clinic_date {
        Some(d) => d,
        None => clinic_date::next_default_clinic_date(req.start_date).map_err(map_err)?,
    };

    let new_med = NewPatientMedication {
        patient_id: req.patient_id,
        doctor_id: req.doctor_id,
        medicine_name: req.medicine_name,
        dosage: req.dosage,
        frequency: req.frequency,
        times_per_day: req.times_per_day,
        specific_times: req.specific_times,
        start_date: req.start_date,
        end_date: req.end_date,
        next_clinic_date,
        is_active: req.is_active,
        notes: req.notes,
    };

    svc.add_medication(&state, new_med).await.map_err(map_err)
}

#[tauri::command]
pub async fn doctor_record_patient_visit(
    state: State<'_, AppState>,
    patient_id: i32,
    doctor_id: i32,
    notes: Option<String>,
) -> Result<crate::entities::history::PatientDoctorHistory, String> {
    let client = SupabaseRestClient::from_env().map_err(map_err)?;
    let svc = DoctorService::new(client);
    svc.record_patient_visit(&state, patient_id, doctor_id, notes)
        .await
        .map_err(map_err)
}

#[tauri::command]
pub fn doctor_default_next_clinic_date(from_date: chrono::NaiveDate) -> Result<chrono::NaiveDate, String> {
    clinic_date::next_default_clinic_date(from_date).map_err(|e| e.to_string())
}
