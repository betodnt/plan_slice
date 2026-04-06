use crate::{
    db::models::{RuntimeConfig, SaveConfigInput},
    error::ErrorResponse,
    services::config_service::ConfigService,
};

#[tauri::command]
pub async fn get_runtime_config() -> Result<RuntimeConfig, ErrorResponse> {
    ConfigService::load().map_err(Into::into)
}

#[tauri::command]
pub async fn save_config(input: SaveConfigInput) -> Result<(), ErrorResponse> {
    ConfigService::save(input).map_err(Into::into)
}
