use crate::{
    entities::history::{NewPatientDoctorHistory, PatientDoctorHistory},
    error::AppResult,
    repositories::supabase::SupabaseRestClient,
};

#[derive(Clone)]
pub struct HistoryRepo {
    client: SupabaseRestClient,
}

impl HistoryRepo {
    pub fn new(client: SupabaseRestClient) -> Self {
        Self { client }
    }

    pub async fn list_for_patient(&self, patient_id: i32, limit: u32) -> AppResult<Vec<PatientDoctorHistory>> {
        self.client
            .select::<PatientDoctorHistory>(
                "patient_doctor_history",
                &format!("patient_id=eq.{}&order=recorded_at.desc&limit={}", patient_id, limit),
            )
            .await
    }

    pub async fn insert(&self, new_row: &NewPatientDoctorHistory) -> AppResult<PatientDoctorHistory> {
        let rows = self
            .client
            .insert::<PatientDoctorHistory, _>("patient_doctor_history", &vec![new_row])
            .await?;
        Ok(rows.into_iter().next().expect("no inserted row"))
    }
}
