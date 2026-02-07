use crate::{
    entities::doctor::Doctor,
    error::AppResult,
    repositories::supabase::SupabaseRestClient,
};

#[derive(Clone)]
pub struct DoctorsRepo {
    client: SupabaseRestClient,
}

impl DoctorsRepo {
    pub fn new(client: SupabaseRestClient) -> Self {
        Self { client }
    }

    pub async fn get_by_id(&self, doctor_id: i32) -> AppResult<Option<Doctor>> {
        let rows = self
            .client
            .select::<Doctor>("doctors", &format!("doctor_id=eq.{}&limit=1", doctor_id))
            .await?;
        Ok(rows.into_iter().next())
    }

    pub async fn list(&self, limit: u32, offset: u32) -> AppResult<Vec<Doctor>> {
        self.client
            .select::<Doctor>(
                "doctors",
                &format!("select=*&order=created_at.desc&limit={}&offset={}", limit, offset),
            )
            .await
    }

    pub async fn search_by_name(&self, q: &str, limit: u32) -> AppResult<Vec<Doctor>> {
        let q = urlencoding::encode(q);
        self.client
            .select::<Doctor>(
                "doctors",
                &format!("full_name=ilike.*{}*&limit={}", q, limit),
            )
            .await
    }
}
