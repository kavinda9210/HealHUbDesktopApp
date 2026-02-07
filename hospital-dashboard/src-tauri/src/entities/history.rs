use chrono::{DateTime, NaiveDate, NaiveTime, Utc};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PatientDoctorHistory {
    pub history_id: i32,
    pub patient_id: Option<i32>,
    pub doctor_id: Option<i32>,
    pub encounter_type: String,
    pub encounter_date: NaiveDate,
    pub encounter_time: Option<NaiveTime>,
    pub notes: Option<String>,
    pub recorded_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NewPatientDoctorHistory {
    pub patient_id: i32,
    pub doctor_id: i32,
    pub encounter_type: String,
    pub encounter_date: NaiveDate,
    pub encounter_time: Option<NaiveTime>,
    pub notes: Option<String>,
}
