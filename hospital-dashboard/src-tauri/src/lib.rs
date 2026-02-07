pub mod commands;
pub mod entities;
pub mod error;
pub mod repositories;
pub mod services;
pub mod state;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(state::AppState::default())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            commands::auth_commands::auth_login,
            commands::auth_commands::auth_forgot_password,
            commands::auth_commands::auth_reset_password,
            commands::auth_commands::auth_logout,
            commands::auth_commands::auth_current_user,
            commands::admin_commands::admin_list_users,
            commands::admin_commands::admin_update_user,
            commands::admin_commands::admin_delete_user,
            commands::admin_commands::admin_user_counts,
            commands::doctor_commands::doctor_list_patients,
            commands::doctor_commands::doctor_get_patient_overview,
            commands::doctor_commands::doctor_list_appointments,
            commands::doctor_commands::doctor_accept_appointment,
            commands::doctor_commands::doctor_reject_appointment,
            commands::doctor_commands::doctor_add_medication,
            commands::doctor_commands::doctor_record_patient_visit,
            commands::doctor_commands::doctor_default_next_clinic_date,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
