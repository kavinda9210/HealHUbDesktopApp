use crate::{
    entities::clinic::ClinicParticipation,
    error::AppResult,
    repositories::supabase::SupabaseRestClient,
};

#[derive(Clone)]
pub struct ClinicRepo {
    client: SupabaseRestClient,
}

impl ClinicRepo {
    pub fn new(client: SupabaseRestClient) -> Self {
        Self { client }
    }

    pub async fn list_for_patient(&self, patient_id: i32, limit: u32) -> AppResult<Vec<ClinicParticipation>> {
        self.client
            .select::<ClinicParticipation>(
                "clinic_participation",
                &format!("patient_id=eq.{}&order=clinic_date.desc&limit={}", patient_id, limit),
            )
            .await
    }
}
