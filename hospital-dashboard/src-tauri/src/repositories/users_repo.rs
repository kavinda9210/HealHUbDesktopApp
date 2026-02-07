use uuid::Uuid;

use crate::{
    entities::user::{UpdateUser, User},
    error::AppResult,
    repositories::supabase::SupabaseRestClient,
};

#[derive(Clone)]
pub struct UsersRepo {
    client: SupabaseRestClient,
}

impl UsersRepo {
    pub fn new(client: SupabaseRestClient) -> Self {
        Self { client }
    }

    pub async fn get_by_id(&self, user_id: Uuid) -> AppResult<Option<User>> {
        let rows = self
            .client
            .select::<User>("users", &format!("user_id=eq.{}&limit=1", user_id))
            .await?;
        Ok(rows.into_iter().next())
    }

    pub async fn get_by_email(&self, email: &str) -> AppResult<Option<User>> {
        let email = urlencoding::encode(email);
        let rows = self
            .client
            .select::<User>("users", &format!("email=eq.{}&limit=1", email))
            .await?;
        Ok(rows.into_iter().next())
    }

    pub async fn list(&self, limit: u32, offset: u32) -> AppResult<Vec<User>> {
        self.client
            .select::<User>(
                "users",
                &format!("select=*&order=created_at.desc&limit={}&offset={}", limit, offset),
            )
            .await
    }

    pub async fn update(&self, user_id: Uuid, patch: &UpdateUser) -> AppResult<User> {
        let rows = self
            .client
            .update::<User, _>("users", &format!("user_id=eq.{}", user_id), patch)
            .await?;
        Ok(rows
            .into_iter()
            .next()
            .expect("supabase returned no updated row"))
    }

    pub async fn delete(&self, user_id: Uuid) -> AppResult<()> {
        let _ = self
            .client
            .delete::<User>("users", &format!("user_id=eq.{}", user_id))
            .await?;
        Ok(())
    }
}
