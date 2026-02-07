use uuid::Uuid;

use crate::{
    entities::user::{UpdateUser, User, UserPublic},
    error::{AppError, AppResult},
    repositories::{supabase::SupabaseRestClient, users_repo::UsersRepo},
    state::AppState,
};

#[derive(Clone)]
pub struct AdminService {
    users: UsersRepo,
}

impl AdminService {
    pub fn new(client: SupabaseRestClient) -> Self {
        Self {
            users: UsersRepo::new(client),
        }
    }

    fn require_admin(app: &AppState) -> AppResult<()> {
        let session = app
            .session
            .lock()
            .map_err(|_| AppError::Unexpected("failed to lock session".to_string()))?;
        let user = session
            .current_user
            .as_ref()
            .ok_or_else(|| AppError::Unauthorized("not logged in".to_string()))?;
        if user.role.as_deref() != Some("admin") {
            return Err(AppError::Unauthorized("admin only".to_string()));
        }
        Ok(())
    }

    pub async fn list_users(&self, app: &AppState, limit: u32, offset: u32) -> AppResult<Vec<UserPublic>> {
        Self::require_admin(app)?;
        let users = self.users.list(limit, offset).await?;
        Ok(users.into_iter().map(UserPublic::from).collect())
    }

    pub async fn update_user(&self, app: &AppState, user_id: Uuid, patch: UpdateUser) -> AppResult<UserPublic> {
        Self::require_admin(app)?;
        let updated = self.users.update(user_id, &patch).await?;
        Ok(UserPublic::from(updated))
    }

    pub async fn delete_user(&self, app: &AppState, user_id: Uuid) -> AppResult<()> {
        Self::require_admin(app)?;
        self.users.delete(user_id).await
    }

    pub async fn get_counts_by_role(&self, app: &AppState) -> AppResult<std::collections::HashMap<String, usize>> {
        Self::require_admin(app)?;
        // Simple (client-side) counts.
        let rows: Vec<User> = self
            .users
            .list(10_000, 0)
            .await?;
        let mut map: std::collections::HashMap<String, usize> = std::collections::HashMap::new();
        for u in rows {
            let role = u.role.unwrap_or_else(|| "unknown".to_string());
            *map.entry(role).or_insert(0) += 1;
        }
        Ok(map)
    }
}
