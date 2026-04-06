use chrono::Utc;

use crate::{
    db::models::{BackendStatus, StorageCheckResult},
    error::AppError,
    services::{config_service::ConfigService, local_store_service::LocalStoreService},
    state::AppState,
};

pub struct HealthService;

impl HealthService {
    pub async fn backend_status(_state: &AppState) -> Result<BackendStatus, AppError> {
        let config = ConfigService::load()?;
        let storage_configured = ConfigService::storage_dir_path().is_ok();
        let storage_ready = LocalStoreService::is_ready();

        Ok(BackendStatus {
            app_name: "Plano de Corte Backend".to_string(),
            app_env: config.app_env,
            storage_configured,
            storage_ready,
            machine_name: config.machine_name,
            checked_at: Utc::now(),
        })
    }

    pub async fn test_storage(_state: &AppState) -> Result<StorageCheckResult, AppError> {
        let store_path = LocalStoreService::ensure_store()?;

        Ok(StorageCheckResult {
            ok: true,
            message: format!(
                "armazenamento compartilhado OK ({})",
                store_path.to_string_lossy()
            ),
            checked_at: Utc::now(),
        })
    }
}
