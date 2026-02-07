use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MedicalReport {
    pub report_id: i32,
    pub appointment_id: Option<i32>,
    pub clinic_id: Option<i32>,
    pub diagnosis: String,
    pub prescription: String,
    pub notes: Option<String>,
    pub created_by_doctor_id: Option<i32>,
    pub created_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PrescriptionRecord {
    pub prescription_id: i32,
    pub appointment_id: Option<i32>,
    pub clinic_id: Option<i32>,
    pub prescription_text: String,
    pub prescribed_by_doctor_id: Option<i32>,
    pub created_at: Option<DateTime<Utc>>,
}
