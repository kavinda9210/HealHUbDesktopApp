use crate::{
    entities::medication::{NewPatientMedication, PatientMedication},
    error::AppResult,
    repositories::supabase::SupabaseRestClient,
};

#[derive(Clone)]
pub struct MedicationsRepo {
    client: SupabaseRestClient,
}

impl MedicationsRepo {
    pub fn new(client: SupabaseRestClient) -> Self {
        Self { client }
    }

    pub async fn list_for_patient(&self, patient_id: i32, limit: u32) -> AppResult<Vec<PatientMedication>> {
        self.client
            .select::<PatientMedication>(
                "patient_medications",
                &format!("patient_id=eq.{}&order=prescribed_at.desc&limit={}", patient_id, limit),
            )
            .await
    }

    pub async fn insert(&self, new_med: &NewPatientMedication) -> AppResult<PatientMedication> {
        let rows = self
            .client
            .insert::<PatientMedication, _>("patient_medications", &vec![new_med])
            .await?;
        Ok(rows.into_iter().next().expect("no inserted row"))
    }
}
