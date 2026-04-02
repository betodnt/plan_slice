use crate::{
    db::models::{MonitorLoginInput, MonitorLoginResult},
    error::ErrorResponse,
    services::config_service::ConfigService,
};

#[tauri::command]
pub async fn validate_monitor_login(
    input: MonitorLoginInput,
) -> Result<MonitorLoginResult, ErrorResponse> {
    let expected_username = ConfigService::monitor_login_username();
    let expected_password = ConfigService::monitor_login_password();

    let is_valid =
        input.username.trim() == expected_username && input.password == expected_password;

    Ok(MonitorLoginResult {
        ok: is_valid,
        message: if is_valid {
            "login confirmado".to_string()
        } else {
            "usuario ou senha invalidos".to_string()
        },
    })
}
