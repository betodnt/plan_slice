use std::{env, path::PathBuf};

use crate::{
    db::models::RuntimeConfig,
    error::AppError,
};

pub struct ConfigService;

impl ConfigService {
    fn env_path(name: &str) -> Option<PathBuf> {
        env::var(name)
            .ok()
            .map(|value| value.trim().to_string())
            .filter(|value| !value.is_empty())
            .map(PathBuf::from)
    }

    fn production_base_path() -> PathBuf {
        env::var("PRODUCTION_BASE_PATH")
            .ok()
            .map(|value| value.trim().to_string())
            .filter(|value| !value.is_empty())
            .map(PathBuf::from)
            .unwrap_or_else(|| PathBuf::from("V:\\8. CONTROLE DE PRODU\u{00C7}\u{00C3}O"))
    }

    fn saidas_a_cortar_default_path() -> PathBuf {
        Self::production_base_path().join("1. SA\u{00CD}DAS A CORTAR")
    }

    fn saidas_cortadas_default_path() -> PathBuf {
        Self::production_base_path().join("2. SA\u{00CD}DAS CORTADAS")
    }

    fn dados_default_path() -> PathBuf {
        Self::production_base_path().join("3. DADOS")
    }

    pub fn load() -> Result<RuntimeConfig, AppError> {
        let app_env = env::var("APP_ENV").unwrap_or_else(|_| "development".to_string());
        let machine_name = Self::machine_name();
        let storage_path = Self::storage_file_path()?;

        Ok(RuntimeConfig {
            app_env,
            machine_name,
            storage_path: storage_path.to_string_lossy().to_string(),
        })
    }

    pub fn machine_name() -> String {
        env::var("MACHINE_NAME").unwrap_or_else(|_| "Bodor1 (12K)".to_string())
    }

    fn is_development() -> bool {
        env::var("APP_ENV")
            .ok()
            .map(|value| value.trim().eq_ignore_ascii_case("development"))
            .unwrap_or(true)
    }

    pub fn shared_storage_dir_path() -> Result<PathBuf, AppError> {
        if let Some(path) = Self::env_path("APP_SHARED_STORE_PATH") {
            return Ok(path);
        }

        Ok(Self::dados_default_path().join(".plan_slice"))
    }

    pub fn storage_dir_path() -> Result<PathBuf, AppError> {
        if Self::is_development() {
            if let Some(path) = Self::env_path("APP_LOCAL_STORE_PATH") {
                return Ok(path);
            }
        }

        Self::shared_storage_dir_path()
    }

    pub fn storage_file_path() -> Result<PathBuf, AppError> {
        Ok(Self::storage_dir_path()?.join("store.json"))
    }

    pub fn lock_timeout_seconds() -> i64 {
        env::var("LOCK_TIMEOUT_SECONDS")
            .ok()
            .and_then(|value| value.parse::<i64>().ok())
            .filter(|value| *value > 0)
            .unwrap_or(14_400)
    }

    pub fn store_lock_stale_seconds() -> i64 {
        env::var("STORE_LOCK_STALE_SECONDS")
            .ok()
            .and_then(|value| value.parse::<i64>().ok())
            .filter(|value| *value > 0)
            .unwrap_or(30)
    }

    pub fn server_path() -> Result<String, AppError> {
        if let Ok(value) = env::var("SERVER_PATH") {
            let trimmed = value.trim();
            if !trimmed.is_empty() {
                return Ok(trimmed.to_string());
            }
        }

        Ok(Self::saidas_a_cortar_default_path()
            .to_string_lossy()
            .to_string())
    }

    pub fn saidas_cnc_path() -> Result<String, AppError> {
        if let Ok(value) = env::var("SAIDAS_CNC_PATH") {
            let trimmed = value.trim();
            if !trimmed.is_empty() {
                return Ok(trimmed.to_string());
            }
        }

        Ok(Self::saidas_a_cortar_default_path()
            .to_string_lossy()
            .to_string())
    }

    pub fn saidas_cortadas_path() -> Result<String, AppError> {
        if let Ok(value) = env::var("SAIDAS_CORTADAS_PATH") {
            let trimmed = value.trim();
            if !trimmed.is_empty() {
                return Ok(trimmed.to_string());
            }
        }

        Ok(Self::saidas_cortadas_default_path()
            .to_string_lossy()
            .to_string())
    }

    pub fn monitor_login_username() -> String {
        env::var("MONITOR_LOGIN_USERNAME")
            .ok()
            .map(|value| value.trim().to_string())
            .filter(|value| !value.is_empty())
            .unwrap_or_else(|| "PCPCARDEROLI".to_string())
    }

    pub fn monitor_login_password() -> String {
        env::var("MONITOR_LOGIN_PASSWORD")
            .ok()
            .map(|value| value.trim().to_string())
            .filter(|value| !value.is_empty())
            .unwrap_or_else(|| "pcp2026".to_string())
    }
}
