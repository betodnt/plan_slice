use crate::error::AppError;
use crate::services::protheus_service::{ProtheusOp, ProtheusService};

#[tauri::command]
pub async fn get_protheus_op(op_number: String) -> Result<ProtheusOp, AppError> {
    ProtheusService::fetch_op_data(&op_number).await
}
