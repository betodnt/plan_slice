use chrono::Utc;

use crate::{
    db::models::{
        BootstrapData, BootstrapResult, FinishOperationInput, FinishOperationResult,
        LockHeartbeatInput, LockHeartbeatResult, StartOperationInput, StartOperationResult,
    },
    error::AppError,
    services::{
        config_service::ConfigService,
        file_service::FileService,
        local_store_service::LocalStoreService,
    },
    state::AppState,
};
use std::path::{Path, PathBuf};

pub struct OperationService;

fn resolve_source_file(saida: &str) -> Result<PathBuf, AppError> {
    let server_path = ConfigService::server_path()?;
    let cortadas_path = ConfigService::saidas_cortadas_path()?;
    let candidates = vec![PathBuf::from(server_path), PathBuf::from(cortadas_path)];

    FileService::find_existing_file(saida, &candidates).ok_or_else(|| {
        AppError::Io(format!("arquivo de corte nao encontrado para reinicio: {}", saida))
    })
}

fn resolve_finish_source_file(saida: &str) -> Result<PathBuf, AppError> {
    let local_path = ConfigService::saidas_cnc_path()?;
    let server_path = ConfigService::server_path()?;
    let cortadas_path = ConfigService::saidas_cortadas_path()?;
    let candidates = vec![
        PathBuf::from(local_path),
        PathBuf::from(server_path),
        PathBuf::from(cortadas_path),
    ];

    FileService::find_existing_file(saida, &candidates).ok_or_else(|| {
        AppError::Io(format!(
            "arquivo da operacao nao encontrado nas pastas configuradas: {}",
            saida
        ))
    })
}

impl OperationService {
    pub async fn bootstrap_storage(_state: &AppState) -> Result<BootstrapResult, AppError> {
        let config = ConfigService::load()?;
        LocalStoreService::bootstrap(&config.machine_name)?;

        Ok(BootstrapResult {
            ok: true,
            message: "store local inicializado com sucesso".to_string(),
        })
    }

    pub async fn start_operation(
        _state: &AppState,
        input: StartOperationInput,
    ) -> Result<StartOperationResult, AppError> {
        validate_start_input(&input)?;

        let owner_id = input
            .owner_id
            .clone()
            .filter(|value| !value.trim().is_empty())
            .unwrap_or_else(|| format!("desktop:{}", input.maquina.trim()));

        let operation_id = LocalStoreService::with_data_mut(|data| {
            LocalStoreService::start_operation(
                data,
                input.pedido.trim(),
                input.operador.trim(),
                input.maquina.trim(),
                input.retalho.as_deref(),
                input.saida.trim(),
                input.tipo.as_deref(),
                &owner_id,
            )
        })?;

        let local_path = ConfigService::saidas_cnc_path()?;
        let src_file = resolve_source_file(input.saida.trim())?;
        let dst_file = Path::new(&local_path).join(input.saida.trim());

        if let Err(error) = FileService::copy_file(&src_file, &dst_file) {
            let _ = LocalStoreService::with_data_mut(|data| {
                LocalStoreService::rollback_start_operation(data, &operation_id)
            });
            return Err(error);
        }

        Ok(StartOperationResult {
            operation_id,
            status: "started".to_string(),
            message: "operacao iniciada com sucesso".to_string(),
        })
    }

    pub async fn finish_operation(
        _state: &AppState,
        input: FinishOperationInput,
    ) -> Result<FinishOperationResult, AppError> {
        if input.operation_id.trim().is_empty() {
            return Err(AppError::Config("operation_id e obrigatorio".to_string()));
        }
        if !input.completed_full
            && input
                .incomplete_reason
                .as_deref()
                .map(|value| value.trim().is_empty())
                .unwrap_or(true)
        {
            return Err(AppError::Config(
                "informe o motivo quando o plano nao for cortado completo".to_string(),
            ));
        }

        let owner_id = format!("desktop:rollback:{}", input.operation_id.trim());
        let (operation_id, elapsed_seconds, saida) = LocalStoreService::with_data_mut(|data| {
            LocalStoreService::finish_operation(
                data,
                input.operation_id.trim(),
                input.completed_full,
                input.incomplete_reason.as_deref().map(str::trim),
            )
        })?;

        let cortadas_path = ConfigService::saidas_cortadas_path()?;
        let dst_file = Path::new(&cortadas_path).join(&saida);
        let src_file = resolve_finish_source_file(&saida)?;

        if src_file != dst_file {
            if let Err(error) = FileService::move_file(&src_file, &dst_file) {
                let _ = LocalStoreService::with_data_mut(|data| {
                    LocalStoreService::rollback_finish_operation(data, &operation_id, &owner_id)
                });
                return Err(error);
            }
        }

        Ok(FinishOperationResult {
            operation_id,
            status: "finished".to_string(),
            elapsed_seconds,
            message: "operacao finalizada com sucesso".to_string(),
        })
    }

    pub async fn touch_lock(
        _state: &AppState,
        input: LockHeartbeatInput,
    ) -> Result<LockHeartbeatResult, AppError> {
        if input.operation_id.trim().is_empty() {
            return Err(AppError::Config("operation_id e obrigatorio".to_string()));
        }

        let touched = LocalStoreService::with_data_mut(|data| {
            Ok(LocalStoreService::touch_lock(data, input.operation_id.trim()))
        })?;

        Ok(LockHeartbeatResult {
            ok: touched,
            message: if touched {
                "heartbeat atualizado".to_string()
            } else {
                "lock nao encontrado para esta operacao".to_string()
            },
            heartbeat_at: Utc::now(),
        })
    }

    pub async fn get_bootstrap_data(_state: &AppState) -> Result<BootstrapData, AppError> {
        let runtime = ConfigService::load()?;
        let data = LocalStoreService::with_data_mut(|data| {
            LocalStoreService::ensure_machine(data, &runtime.machine_name);
            Ok(data.clone())
        })?;

        Ok(BootstrapData {
            runtime,
            machines: LocalStoreService::machines(&data),
            operators: LocalStoreService::operators(&data),
            generated_at: Utc::now(),
        })
    }
}

fn validate_start_input(input: &StartOperationInput) -> Result<(), AppError> {
    if input.pedido.trim().is_empty() {
        return Err(AppError::Config("pedido e obrigatorio".to_string()));
    }
    if input.operador.trim().is_empty() {
        return Err(AppError::Config("operador e obrigatorio".to_string()));
    }
    if input.maquina.trim().is_empty() {
        return Err(AppError::Config("maquina e obrigatoria".to_string()));
    }
    if input.saida.trim().is_empty() {
        return Err(AppError::Config("saida e obrigatoria".to_string()));
    }
    Ok(())
}
