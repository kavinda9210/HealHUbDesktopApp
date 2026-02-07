use tauri::State;

use crate::{
    error::AppError,
    repositories::supabase::SupabaseRestClient,
    services::auth_service::AuthService,
    state::AppState,
};

#[derive(Debug, serde::Deserialize)]
pub struct LoginRequest {
    pub email: String,
    pub password: String,
}

#[derive(Debug, serde::Deserialize)]
pub struct ForgotPasswordRequest {
    pub email: String,
}

#[derive(Debug, serde::Deserialize)]
pub struct ResetPasswordRequest {
    pub email: String,
    pub code: String,
    pub new_password: String,
}

fn map_err(e: AppError) -> String {
    e.to_string()
}

#[tauri::command]
pub async fn auth_login(state: State<'_, AppState>, req: LoginRequest) -> Result<crate::entities::user::UserPublic, String> {
    let client = SupabaseRestClient::from_env().map_err(map_err)?;
    let svc = AuthService::new(client);
    svc.login(&state, &req.email, &req.password).await.map_err(map_err)
}

#[tauri::command]
pub async fn auth_forgot_password(_state: State<'_, AppState>, req: ForgotPasswordRequest) -> Result<(), String> {
    let client = SupabaseRestClient::from_env().map_err(map_err)?;
    let svc = AuthService::new(client);
    svc.forgot_password(&req.email).await.map_err(map_err)
}

#[tauri::command]
pub async fn auth_reset_password(_state: State<'_, AppState>, req: ResetPasswordRequest) -> Result<(), String> {
    let client = SupabaseRestClient::from_env().map_err(map_err)?;
    let svc = AuthService::new(client);
    svc.reset_password(&req.email, &req.code, &req.new_password)
        .await
        .map_err(map_err)
}

#[tauri::command]
pub fn auth_logout(state: State<'_, AppState>) -> Result<(), String> {
    let client = SupabaseRestClient::from_env().map_err(map_err)?;
    let svc = AuthService::new(client);
    svc.logout(&state).map_err(map_err)
}

#[tauri::command]
pub fn auth_current_user(state: State<'_, AppState>) -> Result<Option<crate::entities::user::UserPublic>, String> {
    AuthService::current_user(&state).map_err(map_err)
}
