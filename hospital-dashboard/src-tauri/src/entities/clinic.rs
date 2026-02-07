use chrono::{DateTime, NaiveDate, NaiveTime, Utc};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ClinicParticipation {
    pub clinic_id: i32,
    pub patient_id: Option<i32>,
    pub doctor_id: Option<i32>,
    pub clinic_date: NaiveDate,
    pub start_time: NaiveTime,
    pub end_time: Option<NaiveTime>,
    pub status: Option<String>,
    pub notes: Option<String>,
    pub checked_at: Option<DateTime<Utc>>,
    pub created_at: Option<DateTime<Utc>>,
}
