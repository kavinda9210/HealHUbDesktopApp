use crate::{
    entities::patient::Patient,
    error::AppResult,
    repositories::supabase::SupabaseRestClient,
};

#[derive(Clone)]
pub struct PatientsRepo {
    client: SupabaseRestClient,
}

impl PatientsRepo {
    pub fn new(client: SupabaseRestClient) -> Self {
        Self { client }
    }

    pub async fn list(&self, limit: u32, offset: u32) -> AppResult<Vec<Patient>> {
        self.client
            .select::<Patient>(
                "patients",
                &format!("select=*&order=created_at.desc&limit={}&offset={}", limit, offset),
            )
            .await
    }

    pub async fn get_by_id(&self, patient_id: i32) -> AppResult<Option<Patient>> {
        let rows = self
            .client
            .select::<Patient>("patients", &format!("patient_id=eq.{}&limit=1", patient_id))
            .await?;
        Ok(rows.into_iter().next())
    }

    pub async fn search_by_name(&self, q: &str, limit: u32) -> AppResult<Vec<Patient>> {
        let q = urlencoding::encode(q);
        self.client
            .select::<Patient>(
                "patients",
                &format!("full_name=ilike.*{}*&limit={}", q, limit),
            )
            .await
    }
}
