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
    production_base_path: Option<String>,
    server_path: Option<String>,
    saidas_cnc_path: Option<String>,
    saidas_cortadas_path: Option<String>,
    pdf_planos_path: Option<String>,
    lock_timeout_seconds: Option<i64>,
    store_lock_stale_seconds: Option<i64>,
    monitor_username: Option<String>,
    monitor_password: Option<String>,
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

        let production_base_path = file_config
            .as_ref()
            .and_then(|config| config.production_base_path.clone())
            .unwrap_or_else(|| {
                env::var("PRODUCTION_BASE_PATH")
                    .unwrap_or_else(|_| "V:\\8. CONTROLE DE PRODU\u{00C7}\u{00C3}O".to_string())
            });

        let server_path = file_config
            .as_ref()
            .and_then(|config| config.server_path.clone())
            .unwrap_or_else(|| Self::server_path().unwrap_or_default());

        let saidas_cnc_path = file_config
            .as_ref()
            .and_then(|config| config.saidas_cnc_path.clone())
            .unwrap_or_else(|| Self::saidas_cnc_path().unwrap_or_default());

        let saidas_cortadas_path = file_config
            .as_ref()
            .and_then(|config| config.saidas_cortadas_path.clone())
            .unwrap_or_else(|| Self::saidas_cortadas_path().unwrap_or_default());

        let pdf_planos_path = file_config
            .as_ref()
            .and_then(|config| config.pdf_planos_path.clone())
            .unwrap_or_else(|| Self::pdf_planos_path().unwrap_or_default());

        let lock_timeout_seconds = file_config
            .as_ref()
            .and_then(|config| config.lock_timeout_seconds)
            .unwrap_or_else(Self::lock_timeout_seconds);

        let store_lock_stale_seconds = file_config
            .as_ref()
            .and_then(|config| config.store_lock_stale_seconds)
            .unwrap_or_else(Self::store_lock_stale_seconds);

        let monitor_username = file_config
            .as_ref()
            .and_then(|config| config.monitor_username.clone())
            .or_else(|| env::var("MONITOR_LOGIN_USERNAME").ok());

        let monitor_password = file_config
            .as_ref()
            .and_then(|config| config.monitor_password.clone())
            .or_else(|| env::var("MONITOR_LOGIN_PASSWORD").ok());

        Ok(RuntimeConfig {
            app_env,
            machine_name,
            storage_path: storage_path.to_string_lossy().to_string(),
            production_base_path,
            server_path,
            saidas_cnc_path,
            saidas_cortadas_path,
            pdf_planos_path,
            lock_timeout_seconds,
            store_lock_stale_seconds,
            monitor_username,
            monitor_password,
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
            app_env: Some(input.app_env),
            machine_name: Some(machine_name.to_string()),
            storage_path: Some(storage_path.to_string()),
            production_base_path: Some(input.production_base_path),
            server_path: Some(input.server_path),
            saidas_cnc_path: Some(input.saidas_cnc_path),
            saidas_cortadas_path: Some(input.saidas_cortadas_path),
            pdf_planos_path: Some(input.pdf_planos_path),
            lock_timeout_seconds: Some(input.lock_timeout_seconds),
            store_lock_stale_seconds: Some(input.store_lock_stale_seconds),
            monitor_username: input.monitor_username,
            monitor_password: input.monitor_password,
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
        if let Ok(Some(config)) = Self::read_file_config() {
            if let Some(user) = config.monitor_username {
                let trimmed = user.trim();
                if !trimmed.is_empty() {
                    return trimmed.to_string();
                }
            }
        }

        env::var("MONITOR_LOGIN_USERNAME")
            .ok()
            .map(|value| value.trim().to_string())
            .filter(|value| !value.is_empty())
            .unwrap_or_else(|| "admin".to_string())
    }

    pub fn monitor_login_password() -> String {
        if let Ok(Some(config)) = Self::read_file_config() {
            if let Some(pass) = config.monitor_password {
                let trimmed = pass.trim();
                if !trimmed.is_empty() {
                    return trimmed.to_string();
                }
            }
        }

        env::var("MONITOR_LOGIN_PASSWORD")
            .ok()
            .map(|value| value.trim().to_string())
            .filter(|value| !value.is_empty())
            .unwrap_or_else(|| "admin".to_string())
    }
}
