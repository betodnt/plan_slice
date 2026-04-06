use std::{
    fs,
    fs::OpenOptions,
    io::ErrorKind,
    path::PathBuf,
    process,
    thread,
    time::Duration as StdDuration,
};

use chrono::{Duration, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::{
    db::models::{
        ActiveLockSummary, MachineSummary, OperationSummary, OperatorSummary,
    },
    error::AppError,
    services::config_service::ConfigService,
};

#[derive(Debug, Clone, Serialize, Deserialize)]
struct OperationRecord {
    operation_id: String,
    pedido: String,
    operator_name: String,
    machine_name: String,
    retalho: Option<String>,
    saida: String,
    tipo: Option<String>,
    status: String,
    started_at: chrono::DateTime<Utc>,
    finished_at: Option<chrono::DateTime<Utc>>,
    elapsed_seconds: Option<i32>,
    completed_full: Option<bool>,
    incomplete_reason: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct LockRecord {
    machine_name: String,
    saida: String,
    operator_name: String,
    operation_id: String,
    owner_id: String,
    heartbeat_at: chrono::DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub(crate) struct StoreData {
    next_machine_id: i64,
    next_operator_id: i64,
    machines: Vec<MachineSummary>,
    operators: Vec<OperatorSummary>,
    operations: Vec<OperationRecord>,
    locks: Vec<LockRecord>,
}

impl Default for StoreData {
    fn default() -> Self {
        Self {
            next_machine_id: 1,
            next_operator_id: 1,
            machines: Vec::new(),
            operators: Vec::new(),
            operations: Vec::new(),
            locks: Vec::new(),
        }
    }
}

pub struct LocalStoreService;

struct StoreLockGuard {
    path: PathBuf,
}

#[derive(Debug, Serialize, Deserialize)]
struct StoreLockMetadata {
    machine_name: String,
    pid: u32,
    created_at: chrono::DateTime<Utc>,
}

impl Drop for StoreLockGuard {
    fn drop(&mut self) {
        let _ = fs::remove_file(&self.path);
    }
}

impl LocalStoreService {
    fn lock_file_path() -> Result<PathBuf, AppError> {
        Ok(ConfigService::storage_dir_path()?.join("store.lock"))
    }

    fn acquire_store_lock() -> Result<StoreLockGuard, AppError> {
        let lock_path = Self::lock_file_path()?;

        if let Some(parent) = lock_path.parent() {
            fs::create_dir_all(parent)?;
        }

        for _ in 0..50 {
            match OpenOptions::new()
                .write(true)
                .create_new(true)
                .open(&lock_path)
            {
                Ok(file) => {
                    let metadata = StoreLockMetadata {
                        machine_name: ConfigService::machine_name(),
                        pid: process::id(),
                        created_at: Utc::now(),
                    };
                    serde_json::to_writer_pretty(file, &metadata)
                        .map_err(|error| AppError::Internal(format!("falha ao gravar lock: {error}")))?;

                    return Ok(StoreLockGuard { path: lock_path });
                }
                Err(error) if error.kind() == ErrorKind::AlreadyExists => {
                    Self::clear_stale_lock_file(&lock_path)?;
                    thread::sleep(StdDuration::from_millis(100));
                }
                Err(error) => return Err(AppError::Io(error.to_string())),
            }
        }

        Err(AppError::Io(
            "timeout ao aguardar liberacao do store local".to_string(),
        ))
    }

    fn clear_stale_lock_file(lock_path: &PathBuf) -> Result<(), AppError> {
        let metadata = match fs::metadata(lock_path) {
            Ok(metadata) => metadata,
            Err(error) if error.kind() == ErrorKind::NotFound => return Ok(()),
            Err(error) => return Err(AppError::Io(error.to_string())),
        };

        let modified = metadata
            .modified()
            .map_err(|error| AppError::Io(error.to_string()))?;

        let elapsed = modified
            .elapsed()
            .map_err(|error| AppError::Io(error.to_string()))?;

        if elapsed.as_secs() < ConfigService::store_lock_stale_seconds() as u64 {
            return Ok(());
        }

        fs::remove_file(lock_path).map_err(|error| AppError::Io(error.to_string()))
    }

    fn load_unlocked() -> Result<StoreData, AppError> {
        let store_path = Self::ensure_store()?;
        let content = fs::read_to_string(&store_path)?;

        serde_json::from_str(&content)
            .map_err(|error| AppError::Internal(format!("falha ao ler store local: {error}")))
    }

    fn save_unlocked(data: &StoreData) -> Result<(), AppError> {
        let store_path = Self::ensure_store()?;
        let temp_path = store_path.with_extension("json.tmp");
        let content = serde_json::to_string_pretty(data)
            .map_err(|error| AppError::Internal(format!("falha ao salvar store local: {error}")))?;

        fs::write(&temp_path, content)?;

        if store_path.exists() {
            fs::remove_file(&store_path)?;
        }

        fs::rename(temp_path, store_path)?;
        Ok(())
    }

    pub(crate) fn with_data_mut<T, F>(handler: F) -> Result<T, AppError>
    where
        F: FnOnce(&mut StoreData) -> Result<T, AppError>,
    {
        let _guard = Self::acquire_store_lock()?;
        let mut data = Self::load_unlocked()?;
        let result = handler(&mut data)?;
        Self::save_unlocked(&data)?;
        Ok(result)
    }

    pub fn ensure_store() -> Result<PathBuf, AppError> {
        let store_path = ConfigService::storage_file_path()?;

        if let Some(parent) = store_path.parent() {
            fs::create_dir_all(parent)?;
        }

        if !store_path.exists() {
            let initial = serde_json::to_string_pretty(&StoreData::default())
                .map_err(|error| AppError::Internal(error.to_string()))?;
            fs::write(&store_path, initial)?;
        }

        Ok(store_path)
    }

    pub fn is_ready() -> bool {
        Self::ensure_store().is_ok()
    }

    pub(crate) fn load() -> Result<StoreData, AppError> {
        let _guard = Self::acquire_store_lock()?;
        Self::load_unlocked()
    }

    pub(crate) fn save(data: &StoreData) -> Result<(), AppError> {
        let _guard = Self::acquire_store_lock()?;
        Self::save_unlocked(data)
    }

    pub fn bootstrap(machine_name: &str) -> Result<(), AppError> {
        Self::with_data_mut(|data| {
            Self::ensure_machine(data, machine_name);
            Ok(())
        })
    }

    pub(crate) fn cleanup_expired_locks(data: &mut StoreData) {
        let timeout = ConfigService::lock_timeout_seconds();
        let threshold = Utc::now() - Duration::seconds(timeout);
        data.locks.retain(|lock| lock.heartbeat_at >= threshold);
    }

    pub(crate) fn ensure_machine(data: &mut StoreData, machine_name: &str) -> i64 {
        if let Some(machine) = data.machines.iter().find(|item| item.name == machine_name) {
            return machine.id;
        }

        let id = data.next_machine_id;
        data.next_machine_id += 1;
        data.machines.push(MachineSummary {
            id,
            name: machine_name.to_string(),
            is_active: true,
        });
        data.machines.sort_by(|a, b| a.name.cmp(&b.name));
        id
    }

    pub(crate) fn ensure_operator(data: &mut StoreData, operator_name: &str) -> i64 {
        if let Some(operator) = data.operators.iter().find(|item| item.name == operator_name) {
            return operator.id;
        }

        let id = data.next_operator_id;
        data.next_operator_id += 1;
        data.operators.push(OperatorSummary {
            id,
            name: operator_name.to_string(),
        });
        data.operators.sort_by(|a, b| a.name.cmp(&b.name));
        id
    }

    pub(crate) fn start_operation(
        data: &mut StoreData,
        pedido: &str,
        operador: &str,
        maquina: &str,
        retalho: Option<&str>,
        saida: &str,
        tipo: Option<&str>,
        owner_id: &str,
    ) -> Result<String, AppError> {
        Self::cleanup_expired_locks(data);
        Self::ensure_machine(data, maquina);
        Self::ensure_operator(data, operador);

        if data.locks.iter().any(|lock| lock.saida == saida) {
            return Err(AppError::Config(
                "esta saida ja esta em uso por outro operador".to_string(),
            ));
        }

        let operation_id = Uuid::new_v4().simple().to_string();
        let now = Utc::now();

        data.operations.push(OperationRecord {
            operation_id: operation_id.clone(),
            pedido: pedido.to_string(),
            operator_name: operador.to_string(),
            machine_name: maquina.to_string(),
            retalho: retalho.map(ToOwned::to_owned),
            saida: saida.to_string(),
            tipo: tipo.map(ToOwned::to_owned),
            status: "started".to_string(),
            started_at: now,
            finished_at: None,
            elapsed_seconds: None,
            completed_full: None,
            incomplete_reason: None,
        });

        data.locks.push(LockRecord {
            machine_name: maquina.to_string(),
            saida: saida.to_string(),
            operator_name: operador.to_string(),
            operation_id: operation_id.clone(),
            owner_id: owner_id.to_string(),
            heartbeat_at: now,
        });

        Ok(operation_id)
    }

    pub(crate) fn rollback_start_operation(
        data: &mut StoreData,
        operation_id: &str,
    ) -> Result<(), AppError> {
        let before = data.operations.len();
        data.operations.retain(|item| item.operation_id != operation_id);
        data.locks.retain(|lock| lock.operation_id != operation_id);

        if data.operations.len() == before {
            return Err(AppError::Config("operacao nao encontrada".to_string()));
        }

        Ok(())
    }

    pub(crate) fn finish_operation(
        data: &mut StoreData,
        operation_id: &str,
        completed_full: bool,
        incomplete_reason: Option<&str>,
    ) -> Result<(String, i32, String), AppError> {
        Self::cleanup_expired_locks(data);

        let operation = data
            .operations
            .iter_mut()
            .find(|item| item.operation_id == operation_id)
            .ok_or_else(|| AppError::Config("operacao nao encontrada".to_string()))?;

        if operation.status == "finished" {
            return Ok((
                operation.operation_id.clone(),
                operation.elapsed_seconds.unwrap_or(0),
                operation.saida.clone(),
            ));
        }

        let finished_at = Utc::now();
        let elapsed_seconds = (finished_at - operation.started_at).num_seconds().max(0) as i32;
        operation.finished_at = Some(finished_at);
        operation.elapsed_seconds = Some(elapsed_seconds);
        operation.status = "finished".to_string();
        operation.completed_full = Some(completed_full);
        operation.incomplete_reason = incomplete_reason.map(ToOwned::to_owned);

        data.locks.retain(|lock| lock.operation_id != operation_id);

        Ok((
            operation.operation_id.clone(),
            elapsed_seconds,
            operation.saida.clone(),
        ))
    }

    pub(crate) fn rollback_finish_operation(
        data: &mut StoreData,
        operation_id: &str,
        owner_id: &str,
    ) -> Result<(), AppError> {
        Self::cleanup_expired_locks(data);

        let operation = data
            .operations
            .iter_mut()
            .find(|item| item.operation_id == operation_id)
            .ok_or_else(|| AppError::Config("operacao nao encontrada".to_string()))?;

        operation.finished_at = None;
        operation.elapsed_seconds = None;
        operation.status = "started".to_string();
        operation.completed_full = None;
        operation.incomplete_reason = None;

        if data.locks.iter().any(|lock| lock.operation_id == operation_id) {
            return Ok(());
        }

        data.locks.push(LockRecord {
            machine_name: operation.machine_name.clone(),
            saida: operation.saida.clone(),
            operator_name: operation.operator_name.clone(),
            operation_id: operation.operation_id.clone(),
            owner_id: owner_id.to_string(),
            heartbeat_at: Utc::now(),
        });

        Ok(())
    }

    pub(crate) fn touch_lock(data: &mut StoreData, operation_id: &str) -> bool {
        Self::cleanup_expired_locks(data);

        if let Some(lock) = data
            .locks
            .iter_mut()
            .find(|item| item.operation_id == operation_id)
        {
            lock.heartbeat_at = Utc::now();
            return true;
        }

        false
    }

    pub(crate) fn active_operations(data: &StoreData) -> Vec<OperationSummary> {
        let mut operations: Vec<_> = data
            .operations
            .iter()
            .filter(|item| item.status == "started")
            .map(Self::map_operation)
            .collect();

        operations.sort_by(|a, b| b.started_at.cmp(&a.started_at));
        operations
    }

    pub(crate) fn recent_operations(data: &StoreData, limit: usize) -> Vec<OperationSummary> {
        let mut operations: Vec<_> = data.operations.iter().map(Self::map_operation).collect();

        operations.sort_by(|a, b| {
            let left = a.finished_at.unwrap_or(a.started_at);
            let right = b.finished_at.unwrap_or(b.started_at);
            right.cmp(&left)
        });

        if operations.len() > limit {
            operations.truncate(limit);
        }

        operations
    }

    pub(crate) fn active_locks(data: &StoreData) -> Vec<ActiveLockSummary> {
        let mut locks: Vec<_> = data
            .locks
            .iter()
            .map(|lock| ActiveLockSummary {
                machine_name: lock.machine_name.clone(),
                saida: lock.saida.clone(),
                operator_name: lock.operator_name.clone(),
                operation_id: lock.operation_id.clone(),
                heartbeat_at: lock.heartbeat_at,
            })
            .collect();

        locks.sort_by(|a, b| b.heartbeat_at.cmp(&a.heartbeat_at));
        locks
    }

    pub(crate) fn machines(data: &StoreData) -> Vec<MachineSummary> {
        let mut machines = data.machines.clone();
        machines.sort_by(|a, b| a.name.cmp(&b.name));
        machines
    }

    pub(crate) fn operators(data: &StoreData) -> Vec<OperatorSummary> {
        let mut operators = data.operators.clone();
        operators.sort_by(|a, b| a.name.cmp(&b.name));
        operators
    }

    fn map_operation(item: &OperationRecord) -> OperationSummary {
        OperationSummary {
            operation_id: item.operation_id.clone(),
            pedido: item.pedido.clone(),
            operator_name: item.operator_name.clone(),
            machine_name: item.machine_name.clone(),
            saida: item.saida.clone(),
            tipo: item.tipo.clone(),
            status: item.status.clone(),
            started_at: item.started_at,
            finished_at: item.finished_at,
            elapsed_seconds: item.elapsed_seconds,
            completed_full: item.completed_full,
            incomplete_reason: item.incomplete_reason.clone(),
        }
    }
}
