use crate::error::ErrorResponse;
use crate::models::PathStatus;
use crate::services::config_service::ConfigService;
use std::fs;

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
            label: label.to_string(),
            path,
            exists: meta.is_ok(),
            is_dir: meta.map(|m| m.is_dir()).unwrap_or(false),
        }
    }).collect())
}

#[cfg(test)]
mod tests {
    use crate::commands::config_commands::get_runtime_config;

    #[tokio::test]
    async fn test_runtime_config_has_production_env() {
        std::env::set_var("APP_CONFIG_PATH", "__missing_test_config__.json");
        std::env::set_var("MACHINE_NAME", "Test-Machine");
        std::env::set_var("APP_ENV", "production");

        let config = get_runtime_config().await.unwrap();
        assert_eq!(config.machine_name, "Test-Machine");
        assert_eq!(config.app_env, "production");

        std::env::remove_var("APP_CONFIG_PATH");
        std::env::remove_var("MACHINE_NAME");
        std::env::remove_var("APP_ENV");
    }
}
