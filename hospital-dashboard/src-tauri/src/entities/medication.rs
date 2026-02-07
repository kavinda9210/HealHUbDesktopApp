use chrono::{DateTime, NaiveDate, Utc};
use serde::{Deserialize, Serialize};
use serde_json::Value;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PatientMedication {
    pub medication_id: i32,
    pub patient_id: Option<i32>,
    pub doctor_id: Option<i32>,
    pub medicine_name: String,
    pub dosage: String,
    pub frequency: Option<String>,
    pub times_per_day: Option<i32>,
    pub specific_times: Option<Value>,
    pub start_date: NaiveDate,
    pub end_date: Option<NaiveDate>,
    pub next_clinic_date: NaiveDate,
    pub is_active: Option<bool>,
    pub notes: Option<String>,
    pub prescribed_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NewPatientMedication {
    pub patient_id: i32,
    pub doctor_id: i32,
    pub medicine_name: String,
    pub dosage: String,
    pub frequency: String,
    pub times_per_day: i32,
    pub specific_times: Option<Value>,
    pub start_date: NaiveDate,
    pub end_date: Option<NaiveDate>,
    pub next_clinic_date: NaiveDate,
    pub is_active: bool,
    pub notes: Option<String>,
}
