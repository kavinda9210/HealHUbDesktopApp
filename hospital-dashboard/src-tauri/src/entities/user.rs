use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct User {
    pub user_id: Uuid,
    pub email: String,
    pub password_hash: Option<String>,
    pub role: Option<String>,
    pub is_verified: Option<bool>,
    pub password_reset_token: Option<String>,
    pub password_reset_expires: Option<String>,
    pub is_active: Option<bool>,
    pub created_at: Option<DateTime<Utc>>,
    pub auth_user_id: Option<Uuid>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserPublic {
    pub user_id: Uuid,
    pub email: String,
    pub role: Option<String>,
    pub is_verified: Option<bool>,
    pub is_active: Option<bool>,
    pub created_at: Option<DateTime<Utc>>,
}

impl From<User> for UserPublic {
    fn from(value: User) -> Self {
        Self {
            user_id: value.user_id,
            email: value.email,
            role: value.role,
            is_verified: value.is_verified,
            is_active: value.is_active,
            created_at: value.created_at,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NewUser {
    pub email: String,
    pub password_hash: String,
    pub role: String,
    pub is_verified: bool,
    pub is_active: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct UpdateUser {
    pub email: Option<String>,
    pub role: Option<String>,
    pub is_verified: Option<bool>,
    pub is_active: Option<bool>,
    pub password_hash: Option<String>,
    pub password_reset_token: Option<String>,
    pub password_reset_expires: Option<String>,
}
