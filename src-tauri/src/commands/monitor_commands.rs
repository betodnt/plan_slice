use tauri::State;

use crate::{
    db::models::MonitorSnapshot,
    error::{AppError, ErrorResponse},
    services::{
        config_service::ConfigService,
        local_store_service::LocalStoreService,
        monitor_service::MonitorService,
    },
    state::AppState,
};

#[tauri::command]
pub async fn get_monitor_snapshot(
    state: State<'_, AppState>,
) -> Result<MonitorSnapshot, ErrorResponse> {
    MonitorService::get_snapshot(state.inner())
        .await
        .map_err(Into::into)
}

#[tauri::command]
pub async fn export_operations_xml(
    state: State<'_, AppState>,
) -> Result<String, ErrorResponse> {
    let snapshot = MonitorService::get_snapshot(state.inner())
        .await
        .map_err(AppError::from)?;

    quick_xml::se::to_string(&snapshot)
        .map_err(|e| ErrorResponse { message: format!("Erro ao gerar XML: {}", e) })
}

#[tauri::command]
pub async fn delete_operation(
    _state: State<'_, AppState>,
    operation_id: String,
    username: String,
    password: String,
) -> Result<(), ErrorResponse> {
    let expected_username = ConfigService::monitor_login_username();
    let expected_password = ConfigService::monitor_login_password();

    if expected_username.is_empty() || expected_password.is_empty() {
        return Err(ErrorResponse {
            message: "Credenciais administrativas não configuradas.".to_string(),
        });
    }

    if username.trim() != expected_username || password != expected_password {
        return Err(ErrorResponse {
            message: "Credenciais inválidas para exclusão.".to_string(),
        });
    }

    LocalStoreService::with_data_mut(|data| LocalStoreService::delete_operation(data, &operation_id))
        .map_err(Into::into)
}

#[tauri::command]
pub async fn delete_operations_bulk(
    _state: State<'_, AppState>,
    operation_ids: Vec<String>,
    username: String,
    password: String,
) -> Result<(), ErrorResponse> {
    let expected_username = ConfigService::monitor_login_username();
    let expected_password = ConfigService::monitor_login_password();

    if expected_username.is_empty() || expected_password.is_empty() {
        return Err(ErrorResponse {
            message: "Credenciais administrativas não configuradas.".to_string(),
        });
    }

    if username.trim() != expected_username || password != expected_password {
        return Err(ErrorResponse {
            message: "Credenciais inválidas para exclusão em massa.".to_string(),
        });
    }

    LocalStoreService::with_data_mut(|data| LocalStoreService::delete_operations_bulk(data, &operation_ids))
        .map_err(Into::into)
}
