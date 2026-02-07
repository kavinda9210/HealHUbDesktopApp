use chrono::{DateTime, NaiveDate, NaiveTime, Utc};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Appointment {
    pub appointment_id: i32,
    pub patient_id: Option<i32>,
    pub doctor_id: Option<i32>,
    pub appointment_date: NaiveDate,
    pub appointment_time: NaiveTime,
    pub status: Option<String>,
    pub symptoms: Option<String>,
    pub notes: Option<String>,
    pub checked_by_doctor_at: Option<DateTime<Utc>>,
    pub booked_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct UpdateAppointment {
    pub status: Option<String>,
    pub checked_by_doctor_at: Option<DateTime<Utc>>,
    pub notes: Option<String>,
}
