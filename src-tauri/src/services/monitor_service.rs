use chrono::Utc;

use crate::{
    db::models::MonitorSnapshot,
    error::AppError,
    services::local_store_service::LocalStoreService,
    state::AppState,
};

pub struct MonitorService;

impl MonitorService {
    pub async fn get_snapshot(_state: &AppState) -> Result<MonitorSnapshot, AppError> {
    tokio::time::timeout(
        std::time::Duration::from_secs(5),
        tokio::task::spawn_blocking(move || {
            LocalStoreService::with_data_mut(|data| {
                LocalStoreService::cleanup_expired_locks(data);
                LocalStoreService::cleanup_stale_app_instances(data);

                Ok(MonitorSnapshot {
                    app_instances: LocalStoreService::active_app_instances(data),
                    active_operations: LocalStoreService::active_operations(data),
                    active_locks: LocalStoreService::active_locks(data),
                    recent_operations: LocalStoreService::recent_operations(data, 1000),
                    machines: LocalStoreService::machines(data),
                    generated_at: Utc::now(),
                })
            })
            })
    )
    .await
    .map_err(|_| AppError::Io("Tempo limite de rede excedido ao acessar armazenamento".to_string()))?
    .map_err(|e| AppError::Internal(format!("Erro de thread: {}", e)))?
    }
}
