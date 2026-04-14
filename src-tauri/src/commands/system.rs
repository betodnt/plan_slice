use crate::error::ErrorResponse;
use crate::models::PathStatus;
use crate::services::config_service::ConfigService;
use serde::Serialize;
use std::fs;

#[derive(Serialize)]
pub struct RuntimeConfig {
    pub machine_name: String,
    pub app_env: String,
    pub storage_path: String,
}

#[tauri::command]
pub async fn health_check() -> Result<String, String> {
    Ok("Sistema operacional".to_string())
}



#[tauri::command]
pub async fn validate_system_paths() -> Result<Vec<PathStatus>, ErrorResponse> {
    let paths = vec![
        (
            "Saidas a cortar",
            ConfigService::server_path().unwrap_or_else(|_| String::new()),
        ),
        (
            "Saidas cortadas",
            ConfigService::saidas_cortadas_path().unwrap_or_else(|_| String::new()),
        ),
        (
            "Dados",
            ConfigService::storage_dir_path()
                .map(|path| path.to_string_lossy().to_string())
                .unwrap_or_else(|_| String::new()),
        ),
    ];

    Ok(paths.into_iter().map(|(label, path)| {
        let meta = fs::metadata(&path);
        PathStatus {
            label: label.into(),
            path: path.into(),
            exists: meta.is_ok(),
            is_dir: meta.map(|m| m.is_dir()).unwrap_or(false),
        }
    }).collect())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::commands::config_commands::get_runtime_config;

    #[tokio::test]
    async fn test_health_check_returns_ok() {
        let result = health_check().await;
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), "Sistema operacional");
    }

    #[tokio::test]
    async fn test_runtime_config_has_production_env() {
        std::env::set_var("MACHINE_NAME", "Test-Machine");
        std::env::set_var("APP_ENV", "production");

        let config = get_runtime_config().await.unwrap();
        assert_eq!(config.machine_name, "Test-Machine");
        assert_eq!(config.app_env, "production");
    }
}
