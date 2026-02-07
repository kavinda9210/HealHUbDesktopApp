use chrono::{DateTime, NaiveDate, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Patient {
    pub patient_id: i32,
    pub user_id: Option<Uuid>,
    pub full_name: String,
    pub dob: NaiveDate,
    pub gender: Option<String>,
    pub phone: String,
    pub address: Option<String>,
    pub blood_group: Option<String>,
    pub emergency_contact: Option<String>,
    pub has_chronic_condition: Option<bool>,
    pub condition_notes: Option<String>,
    pub is_phone_verified: Option<bool>,
    pub created_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NewPatient {
    pub user_id: Uuid,
    pub full_name: String,
    pub dob: NaiveDate,
    pub gender: Option<String>,
    pub phone: String,
    pub address: Option<String>,
    pub blood_group: Option<String>,
    pub emergency_contact: Option<String>,
    pub has_chronic_condition: Option<bool>,
    pub condition_notes: Option<String>,
    pub is_phone_verified: Option<bool>,
}
