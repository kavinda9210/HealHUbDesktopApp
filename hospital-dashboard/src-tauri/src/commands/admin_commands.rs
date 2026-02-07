use std::collections::HashMap;

use tauri::State;
use uuid::Uuid;

use crate::{
    entities::user::{UpdateUser, UserPublic},
    error::AppError,
    repositories::supabase::SupabaseRestClient,
    services::admin_service::AdminService,
    state::AppState,
};

fn map_err(e: AppError) -> String {
    e.to_string()
}

#[tauri::command]
pub async fn admin_list_users(
    state: State<'_, AppState>,
    limit: u32,
    offset: u32,
) -> Result<Vec<UserPublic>, String> {
    let client = SupabaseRestClient::from_env().map_err(map_err)?;
    let svc = AdminService::new(client);
    svc.list_users(&state, limit, offset).await.map_err(map_err)
}

#[tauri::command]
pub async fn admin_update_user(
    state: State<'_, AppState>,
    user_id: String,
    patch: UpdateUser,
) -> Result<UserPublic, String> {
    let client = SupabaseRestClient::from_env().map_err(map_err)?;
    let svc = AdminService::new(client);
    let user_id = Uuid::parse_str(&user_id).map_err(|e| e.to_string())?;
    svc.update_user(&state, user_id, patch).await.map_err(map_err)
}

#[tauri::command]
pub async fn admin_delete_user(state: State<'_, AppState>, user_id: String) -> Result<(), String> {
    let client = SupabaseRestClient::from_env().map_err(map_err)?;
    let svc = AdminService::new(client);
    let user_id = Uuid::parse_str(&user_id).map_err(|e| e.to_string())?;
    svc.delete_user(&state, user_id).await.map_err(map_err)
}

#[tauri::command]
pub async fn admin_user_counts(state: State<'_, AppState>) -> Result<HashMap<String, usize>, String> {
    let client = SupabaseRestClient::from_env().map_err(map_err)?;
    let svc = AdminService::new(client);
    svc.get_counts_by_role(&state).await.map_err(map_err)
}
