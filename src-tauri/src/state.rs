use std::sync::Arc;
use crate::services::distributed_lock::DistributedLock;

pub struct AppState {
    pub instance_id: String,
    pub lock: Arc<DistributedLock>,
}
