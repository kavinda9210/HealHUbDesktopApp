use crate::{
    entities::appointment::{Appointment, UpdateAppointment},
    error::AppResult,
    repositories::supabase::SupabaseRestClient,
};

#[derive(Clone)]
pub struct AppointmentsRepo {
    client: SupabaseRestClient,
}

impl AppointmentsRepo {
    pub fn new(client: SupabaseRestClient) -> Self {
        Self { client }
    }

    pub async fn list_for_doctor(&self, doctor_id: i32, limit: u32, offset: u32) -> AppResult<Vec<Appointment>> {
        self.client
            .select::<Appointment>(
                "appointments",
                &format!(
                    "doctor_id=eq.{}&order=appointment_date.desc,appointment_time.desc&limit={}&offset={}",
                    doctor_id, limit, offset
                ),
            )
            .await
    }

    pub async fn list_for_patient(&self, patient_id: i32, limit: u32) -> AppResult<Vec<Appointment>> {
        self.client
            .select::<Appointment>(
                "appointments",
                &format!(
                    "patient_id=eq.{}&order=appointment_date.desc,appointment_time.desc&limit={}",
                    patient_id, limit
                ),
            )
            .await
    }

    pub async fn update(&self, appointment_id: i32, patch: &UpdateAppointment) -> AppResult<Appointment> {
        let rows = self
            .client
            .update::<Appointment, _>(
                "appointments",
                &format!("appointment_id=eq.{}", appointment_id),
                patch,
            )
            .await?;
        Ok(rows
            .into_iter()
            .next()
            .expect("supabase returned no updated row"))
    }
}
