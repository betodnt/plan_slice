use std::{env, fs, path::PathBuf};

use crate::{
    db::models::{RuntimeConfig, SaveConfigInput},
    error::AppError,
};
use serde::{Deserialize, Serialize};

pub struct ConfigService;

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
struct FileConfig {
    app_env: Option<String>,
    machine_name: Option<String>,
    storage_path: Option<String>,
}

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

    fn config_file_path_for_read() -> Result<Option<PathBuf>, AppError> {
        if let Some(path) = Self::env_path("APP_CONFIG_PATH") {
            return Ok(path.exists().then_some(path));
        }

        let current_dir_path = env::current_dir()
            .map_err(|error| AppError::Io(error.to_string()))?
            .join("config.json");
        if current_dir_path.exists() {
            return Ok(Some(current_dir_path));
        }

        let executable_path = env::current_exe().map_err(|error| AppError::Io(error.to_string()))?;
        let executable_dir_path = executable_path
            .parent()
            .map(|parent| parent.join("config.json"));

        Ok(executable_dir_path.filter(|path| path.exists()))
    }

    fn config_file_path_for_write() -> Result<PathBuf, AppError> {
        if let Some(path) = Self::env_path("APP_CONFIG_PATH") {
            return Ok(path);
        }

        Ok(env::current_dir()
            .map_err(|error| AppError::Io(error.to_string()))?
            .join("config.json"))
    }

    fn read_file_config() -> Result<Option<FileConfig>, AppError> {
        let Some(path) = Self::config_file_path_for_read()? else {
            return Ok(None);
        };

        let raw = fs::read_to_string(&path)?;
        let parsed = serde_json::from_str::<FileConfig>(&raw)
            .map_err(|error| AppError::Config(format!("falha ao ler {}: {error}", path.display())))?;

        Ok(Some(parsed))
    }

    fn normalize_storage_dir(path: PathBuf) -> PathBuf {
        if path
            .file_name()
            .and_then(|value| value.to_str())
            .map(|value| value.eq_ignore_ascii_case("store.json"))
            .unwrap_or(false)
        {
            return path
                .parent()
                .map(PathBuf::from)
                .unwrap_or(path);
        }

        path
    }

    fn file_storage_dir_path() -> Result<Option<PathBuf>, AppError> {
        let file_config = Self::read_file_config()?;
        let path = file_config
            .and_then(|config| config.storage_path)
            .map(|value| value.trim().to_string())
            .filter(|value| !value.is_empty())
            .map(PathBuf::from)
            .map(Self::normalize_storage_dir);

        Ok(path)
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

    fn pdf_planos_default_path() -> PathBuf {
        Self::production_base_path().join("6. PDF PLANOS")
    }

    pub fn load() -> Result<RuntimeConfig, AppError> {
        let file_config = Self::read_file_config()?;
        let app_env = file_config
            .as_ref()
            .and_then(|config| config.app_env.clone())
            .filter(|value| !value.trim().is_empty())
            .unwrap_or_else(|| env::var("APP_ENV").unwrap_or_else(|_| "development".to_string()));
        let machine_name = file_config
            .as_ref()
            .and_then(|config| config.machine_name.clone())
            .map(|value| value.trim().to_string())
            .filter(|value| !value.is_empty())
            .unwrap_or_else(Self::machine_name);
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
        if let Some(path) = Self::file_storage_dir_path()? {
            return Ok(path);
        }

        if let Some(path) = Self::env_path("APP_SHARED_STORE_PATH") {
            return Ok(Self::normalize_storage_dir(path));
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

    pub fn save(input: SaveConfigInput) -> Result<(), AppError> {
        let machine_name = input.machine_name.trim();
        if machine_name.is_empty() {
            return Err(AppError::Config(
                "informe um nome de maquina para salvar a configuracao".to_string(),
            ));
        }

        let storage_path = input.storage_path.trim();
        if storage_path.is_empty() {
            return Err(AppError::Config(
                "informe um caminho de armazenamento compartilhado".to_string(),
            ));
        }

        let path = Self::config_file_path_for_write()?;
        if let Some(parent) = path.parent() {
            fs::create_dir_all(parent)?;
        }

        let content = serde_json::to_string_pretty(&FileConfig {
            app_env: Some(env::var("APP_ENV").unwrap_or_else(|_| "production".to_string())),
            machine_name: Some(machine_name.to_string()),
            storage_path: Some(storage_path.to_string()),
        })
        .map_err(|error| AppError::Internal(format!("falha ao serializar config.json: {error}")))?;

        fs::write(path, content)?;
        Ok(())
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

    pub fn pdf_planos_path() -> Result<String, AppError> {
        if let Ok(value) = env::var("PDF_PLANOS_PATH") {
            let trimmed = value.trim();
            if !trimmed.is_empty() {
                return Ok(trimmed.to_string());
            }
        }

        Ok(Self::pdf_planos_default_path()
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
