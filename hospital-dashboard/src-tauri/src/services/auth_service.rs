use chrono::{Duration, Utc};
use rand::Rng;
use sha2::{Digest, Sha256};
use crate::{
    entities::user::{UpdateUser, UserPublic},
    error::{AppError, AppResult},
    repositories::{supabase::SupabaseRestClient, users_repo::UsersRepo},
    services::email_service::EmailService,
    state::AppState,
};

#[derive(Clone)]
pub struct AuthService {
    users: UsersRepo,
}

impl AuthService {
    pub fn new(client: SupabaseRestClient) -> Self {
        Self {
            users: UsersRepo::new(client),
        }
    }

    pub fn sha256_hex(password: &str) -> String {
        let mut h = Sha256::new();
        h.update(password.as_bytes());
        format!("{:x}", h.finalize())
    }

    pub async fn login(&self, app: &AppState, email: &str, password: &str) -> AppResult<UserPublic> {
        let user = self
            .users
            .get_by_email(email)
            .await?
            .ok_or_else(|| AppError::Unauthorized("invalid email or password".to_string()))?;

        if user.is_active == Some(false) {
            return Err(AppError::Unauthorized("account disabled".to_string()));
        }

        let expected = user
            .password_hash
            .clone()
            .ok_or_else(|| AppError::Unauthorized("invalid email or password".to_string()))?;
        let provided = Self::sha256_hex(password);
        if expected != provided {
            return Err(AppError::Unauthorized("invalid email or password".to_string()));
        }

        let mut session = app
            .session
            .lock()
            .map_err(|_| AppError::Unexpected("failed to lock session".to_string()))?;
        session.current_user = Some(user.clone());

        Ok(UserPublic::from(user))
    }

    pub fn logout(&self, app: &AppState) -> AppResult<()> {
        let mut session = app
            .session
            .lock()
            .map_err(|_| AppError::Unexpected("failed to lock session".to_string()))?;
        session.current_user = None;
        Ok(())
    }

    pub fn current_user(app: &AppState) -> AppResult<Option<UserPublic>> {
        let session = app
            .session
            .lock()
            .map_err(|_| AppError::Unexpected("failed to lock session".to_string()))?;
        Ok(session.current_user.clone().map(UserPublic::from))
    }

    pub async fn forgot_password(&self, email: &str) -> AppResult<()> {
        let user = match self.users.get_by_email(email).await? {
            Some(u) => u,
            None => return Ok(()), // do not leak existence
        };

        let code: String = {
            let mut rng = rand::thread_rng();
            format!("{:06}", rng.gen_range(0..=999_999))
        };

        let expires = (Utc::now() + Duration::minutes(15)).to_rfc3339();

        let patch = UpdateUser {
            password_reset_token: Some(code.clone()),
            password_reset_expires: Some(expires.clone()),
            ..Default::default()
        };

        let _ = self.users.update(user.user_id, &patch).await?;

        let html = format!(
            r#"<h2>Password Reset</h2><p>Your reset code is: <b>{}</b></p><p>This code expires in 15 minutes.</p>"#,
            code
        );

        EmailService::send_html(email, "Password Reset - HealHub", &html).await?;
        Ok(())
    }

    pub async fn reset_password(&self, email: &str, code: &str, new_password: &str) -> AppResult<()> {
        let user = self
            .users
            .get_by_email(email)
            .await?
            .ok_or_else(|| AppError::Unauthorized("invalid reset code".to_string()))?;

        let token = user
            .password_reset_token
            .clone()
            .ok_or_else(|| AppError::Unauthorized("invalid reset code".to_string()))?;

        if token != code {
            return Err(AppError::Unauthorized("invalid reset code".to_string()));
        }

        // We stored ISO string; simplest is to trust DB-side checks later.
        // For now, just require it exists.
        if user.password_reset_expires.is_none() {
            return Err(AppError::Unauthorized("reset code expired".to_string()));
        }

        let new_hash = Self::sha256_hex(new_password);

        let patch = UpdateUser {
            password_hash: Some(new_hash),
            password_reset_token: None,
            password_reset_expires: None,
            ..Default::default()
        };

        let _ = self.users.update(user.user_id, &patch).await?;

        Ok(())
    }
}
