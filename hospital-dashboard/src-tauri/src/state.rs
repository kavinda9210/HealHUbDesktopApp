use std::sync::Mutex;

use crate::entities::user::User;

#[derive(Debug, Default, Clone)]
pub struct SessionState {
    pub current_user: Option<User>,
}

pub struct AppState {
    pub session: Mutex<SessionState>,
}

impl Default for AppState {
    fn default() -> Self {
        Self {
            session: Mutex::new(SessionState::default()),
        }
    }
}
