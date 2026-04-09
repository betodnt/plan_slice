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
        LocalStoreService::with_data_mut(|data| {
            LocalStoreService::cleanup_expired_locks(data);

            Ok(MonitorSnapshot {
                active_operations: LocalStoreService::active_operations(data),
                active_locks: LocalStoreService::active_locks(data),
                recent_operations: LocalStoreService::recent_operations(data, 1000),
                machines: LocalStoreService::machines(data),
                generated_at: Utc::now(),
            })
        })
    }
}
