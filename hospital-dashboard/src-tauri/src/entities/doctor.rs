use chrono::{DateTime, NaiveTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Doctor {
    pub doctor_id: i32,
    pub user_id: Option<Uuid>,
    pub full_name: String,
    pub specialization: String,
    pub qualification: Option<String>,
    pub phone: String,
    pub email: Option<String>,
    pub consultation_fee: Option<f64>,
    pub available_days: Option<String>,
    pub start_time: Option<NaiveTime>,
    pub end_time: Option<NaiveTime>,
    pub is_available: Option<bool>,
    pub created_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NewDoctor {
    pub user_id: Uuid,
    pub full_name: String,
    pub specialization: String,
    pub qualification: Option<String>,
    pub phone: String,
    pub email: Option<String>,
    pub consultation_fee: Option<f64>,
    pub available_days: Option<String>,
    pub start_time: Option<NaiveTime>,
    pub end_time: Option<NaiveTime>,
    pub is_available: Option<bool>,
}
