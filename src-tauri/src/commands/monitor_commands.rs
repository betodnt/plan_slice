use tauri::State;

use crate::{
    db::models::MonitorSnapshot,
    error::{AppError, ErrorResponse},
    services::monitor_service::MonitorService,
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
