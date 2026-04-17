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

    if expected_username.is_empty() || expected_password.is_empty() {
        return Ok(MonitorLoginResult {
            ok: false,
            message: "Credenciais administrativas nao configuradas. Defina MONITOR_LOGIN_USERNAME e MONITOR_LOGIN_PASSWORD no .env".to_string(),
        });
    }

    let username_match = input.username.trim() == expected_username;
    let password_match = input.password == expected_password;
    let is_valid = username_match && password_match;

    Ok(MonitorLoginResult {
        ok: is_valid,
        message: if is_valid {
            "login confirmado".to_string()
        } else {
            "usuario ou senha invalidos".to_string()
        },
    })
}
