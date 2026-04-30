use chrono::Utc;

use crate::{
    db::models::{
        AppInstanceHeartbeatInput, AppInstanceHeartbeatResult, BootstrapData, BootstrapResult,
        FinishOperationInput, FinishOperationResult, LockHeartbeatInput, LockHeartbeatResult,
        StartOperationInput, StartOperationResult,
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
use std::time::Duration;
use tokio::time::timeout;
use tokio::task::spawn_blocking;

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
        state: &AppState,
        input: StartOperationInput,
    ) -> Result<StartOperationResult, AppError> {
        validate_start_input(&input)?;

        // Tenta adquirir o lock distribuído para a máquina
        if !state.lock.try_acquire(input.maquina.trim()).map_err(|e| AppError::Internal(e))? {
            return Err(AppError::Config(format!("Máquina {} em uso por outra estação", input.maquina.trim())));
        }

        let owner_id = input
            .owner_id
            .clone()
            .filter(|value| !value.trim().is_empty())
            .unwrap_or_else(|| state.instance_id.clone());

        let operation_id = match LocalStoreService::with_data_mut(|data| {
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
        }) {
            Ok(id) => id,
            Err(e) => {
                let _ = state.lock.release(input.maquina.trim());
                return Err(e);
            }
        };

        let local_path = ConfigService::saidas_cnc_path()?;
        let saida = input.saida.trim().to_string();

        let file_op_result = timeout(
            Duration::from_secs(5),
            spawn_blocking(move || -> Result<(), AppError> {
                let src_file = resolve_source_file(&saida)?;
                let dst_file = Path::new(&local_path).join(&saida);
                FileService::copy_file(&src_file, &dst_file)?;
                Ok(())
            })
        )
        .await
        .map_err(|_| AppError::Io("Tempo limite de rede excedido".to_string()))?
        .map_err(|e| AppError::Internal(format!("Erro de thread: {}", e)))?;

        if let Err(error) = file_op_result {
            let _ = LocalStoreService::with_data_mut(|data| {
                LocalStoreService::rollback_start_operation(data, &operation_id)
            });
            let _ = state.lock.release(input.maquina.trim());
            return Err(error);
        }

        Ok(StartOperationResult {
            operation_id,
            status: "started".to_string(),
            message: "operacao iniciada com sucesso".to_string(),
        })
    }

    pub async fn finish_operation(
        state: &AppState,
        input: FinishOperationInput,
    ) -> Result<FinishOperationResult, AppError> {
        if input.operation_id.trim().is_empty() {
            return Err(AppError::Config("operation_id e obrigatorio".to_string()));
        }
        if !input.completed_full {
            let reason = input.incomplete_reason.as_deref().unwrap_or("");
            if reason.trim().is_empty() {
                return Err(AppError::Config(
                    "informe o motivo quando o plano nao for cortado completo".to_string(),
                ));
            }
            if reason.len() > 500 {
                return Err(AppError::Config(
                    "motivo muito longo (max 500 caracteres)".to_string(),
                ));
            }
        }

        let owner_id = format!("desktop:rollback:{}", input.operation_id.trim());
        let (operation_id, elapsed_seconds, saida, machine_name) = LocalStoreService::with_data_mut(|data| {
            let (op_id, elapsed, saida) = LocalStoreService::finish_operation(
                data,
                input.operation_id.trim(),
                input.completed_full,
                input.incomplete_reason.as_deref().map(str::trim),
            )?;

            // Busca o nome da máquina para liberar o lock
            let machine = data.operations.iter()
                .find(|o| o.operation_id == op_id)
                .map(|o| o.machine_name.clone())
                .unwrap_or_default();

            Ok((op_id, elapsed, saida, machine))
        })?;

        let completed_full = input.completed_full;
        let saida_clone = saida.clone();

        let file_op_result = timeout(
            Duration::from_secs(5),
            spawn_blocking(move || -> Result<(), AppError> {
                let src_file = resolve_finish_source_file(&saida_clone)?;
                let dst_file = if completed_full {
                    let cortadas_path = ConfigService::saidas_cortadas_path()?;
                    Path::new(&cortadas_path).join(&saida_clone)
                } else {
                    let server_path = ConfigService::server_path()?;
                    let partial_name = FileService::build_partial_filename(&saida_clone);
                    FileService::unique_destination_path(Path::new(&server_path), &partial_name)
                };

                if src_file != dst_file {
                    FileService::move_file(&src_file, &dst_file)?;
                }
                Ok(())
            })
        )
        .await
        .map_err(|_| AppError::Io("Tempo limite de rede excedido".to_string()))?
        .map_err(|e| AppError::Internal(format!("Erro de thread: {}", e)))?;

        if let Err(error) = file_op_result {
            let _ = LocalStoreService::with_data_mut(|data| {
                LocalStoreService::rollback_finish_operation(data, &operation_id, &owner_id)
            });
            return Err(error);
        }

        // Libera o lock distribuído somente após concluir as operações de arquivo
        if !machine_name.is_empty() {
            let _ = state.lock.release(&machine_name);
        }

        Ok(FinishOperationResult {
            operation_id,
            status: "finished".to_string(),
            elapsed_seconds,
            message: if input.completed_full {
                "operacao finalizada com sucesso".to_string()
            } else {
                format!(
                    "operacao finalizada como parcial; arquivo retornado para SAIDAS A CORTAR como {}",
                    dst_file
                        .file_name()
                        .and_then(|value| value.to_str())
                        .unwrap_or("plano_parcial")
                )
            },
        })
    }

    pub async fn touch_lock(
        state: &AppState,
        input: LockHeartbeatInput,
    ) -> Result<LockHeartbeatResult, AppError> {
        if input.operation_id.trim().is_empty() {
            return Err(AppError::Config("operation_id e obrigatorio".to_string()));
        }

        let operation_id = input.operation_id.trim().to_string();
        let lock_clone = state.lock.clone();

        let (touched, machine_name) = timeout(
            Duration::from_secs(5),
            spawn_blocking(move || {
                LocalStoreService::with_data_mut(|data| {
                    let touched = LocalStoreService::touch_lock(data, &operation_id);
                    let machine = if touched {
                        data.locks.iter()
                            .find(|l| l.operation_id == operation_id)
                            .map(|l| l.machine_name.clone())
                    } else {
                        None
                    };
                    Ok((touched, machine))
                })
            })
        )
        .await
        .map_err(|_| AppError::Io("Tempo limite de rede excedido no heartbeat".to_string()))?
        .map_err(|e| AppError::Internal(format!("Erro de thread: {}", e)))??;

        if let Some(machine) = machine_name {
            let _ = timeout(
                Duration::from_secs(5),
                spawn_blocking(move || {
                    lock_clone.refresh(&machine)
                })
            ).await;
        }

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

    pub async fn touch_app_instance(
        _state: &AppState,
        input: AppInstanceHeartbeatInput,
    ) -> Result<AppInstanceHeartbeatResult, AppError> {
        if input.instance_id.trim().is_empty() {
            return Err(AppError::Config("instance_id e obrigatorio".to_string()));
        }

        if input.machine_name.trim().is_empty() {
            return Err(AppError::Config("machine_name e obrigatorio".to_string()));
        }

        let instance_id = input.instance_id.trim().to_string();
        let machine_name = input.machine_name.trim().to_string();
        let view_label = input.view_label.trim().to_string();
        let active_operation_id = input.active_operation_id.clone();

        let touched = timeout(
            Duration::from_secs(5),
            spawn_blocking(move || {
                LocalStoreService::with_data_mut(|data| {
                    Ok(LocalStoreService::touch_app_instance(
                        data,
                        &instance_id,
                        &machine_name,
                        &view_label,
                        active_operation_id.as_deref(),
                    ))
                })
            })
        )
        .await
        .map_err(|_| AppError::Io("Tempo limite de rede excedido na presenca".to_string()))?
        .map_err(|e| AppError::Internal(format!("Erro de thread: {}", e)))??;

        Ok(AppInstanceHeartbeatResult {
            ok: touched,
            message: "instancia monitorada".to_string(),
            heartbeat_at: Utc::now(),
        })
    }

    pub async fn get_bootstrap_data(_state: &AppState) -> Result<BootstrapData, AppError> {
        let runtime = ConfigService::load()?;
        let runtime_clone = runtime.clone();

        let data = timeout(
            Duration::from_secs(5),
            spawn_blocking(move || {
                LocalStoreService::with_data_mut(|data| {
                    LocalStoreService::ensure_machine(data, &runtime_clone.machine_name);
                    Ok(data.clone())
                })
            })
        )
        .await
        .map_err(|_| AppError::Io("Tempo limite de rede excedido ao carregar bootstrap".to_string()))?
        .map_err(|e| AppError::Internal(format!("Erro de thread: {}", e)))??;

        Ok(BootstrapData {
            runtime,
            machines: LocalStoreService::machines(&data),
            operators: LocalStoreService::operators(&data),
            generated_at: Utc::now(),
        })
    }

    pub async fn force_finish_current_operation(state: &AppState) -> Result<(), AppError> {
        let machine_name = ConfigService::machine_name();
        let machine_name_clone = machine_name.clone();

        let maybe_finish: Option<(String, String)> = spawn_blocking(move || {
            LocalStoreService::with_data_mut(|data| {
                let active_ops = LocalStoreService::active_operations(data);
                let active = active_ops.into_iter().find(|op| {
                    op.status == "started" && op.machine_name == machine_name_clone
                });

                if let Some(op) = active {
                    Ok(Some((op.operation_id, op.saida)))
                } else {
                    Ok(None)
                }
            })
        })
        .await
        .map_err(|e| AppError::Internal(format!("Erro de thread: {}", e)))??;

        if let Some((operation_id, saida)) = maybe_finish {
            println!(">>> Finalizando operacao ativa automaticamente ao fechar: {} ({})", operation_id, saida);

            let incomplete_reason = "Finalizado automaticamente ao fechar o aplicativo";
            let op_id_to_finish = operation_id.clone();

            let (op_id, _, _) = spawn_blocking(move || {
                LocalStoreService::with_data_mut(|data| {
                    LocalStoreService::finish_operation(
                        data,
                        &op_id_to_finish,
                        false,
                        Some(incomplete_reason),
                    )
                })
            })
            .await
            .map_err(|e| AppError::Internal(format!("Erro de thread: {}", e)))??;

            // Tenta mover o arquivo para parcial se possivel
            if let Ok(src_file) = resolve_finish_source_file(&saida) {
                let server_path = ConfigService::server_path()?;
                let partial_name = FileService::build_partial_filename(&saida);
                let dst_file = FileService::unique_destination_path(Path::new(&server_path), &partial_name);

                if src_file != dst_file {
                    let _ = FileService::move_file(&src_file, &dst_file);
                }
            }

            // Libera o lock
            let _ = state.lock.release(&machine_name);

            println!(">>> Operacao {} finalizada como parcial.", op_id);
        }

        Ok(())
    }
}

fn validate_start_input(input: &StartOperationInput) -> Result<(), AppError> {
    let pedido = input.pedido.trim();
    if pedido.is_empty() {
        return Err(AppError::Config("pedido e obrigatorio".to_string()));
    }
    if pedido.len() > 50 {
        return Err(AppError::Config("pedido muito longo (max 50 caracteres)".to_string()));
    }

    let operador = input.operador.trim();
    if operador.is_empty() {
        return Err(AppError::Config("operador e obrigatorio".to_string()));
    }
    if operador.len() > 100 {
        return Err(AppError::Config("operador muito longo (max 100 caracteres)".to_string()));
    }

    let maquina = input.maquina.trim();
    if maquina.is_empty() {
        return Err(AppError::Config("maquina e obrigatoria".to_string()));
    }
    if maquina.len() > 100 {
        return Err(AppError::Config("maquina muito longa (max 100 caracteres)".to_string()));
    }

    if input.saida.trim().is_empty() {
        return Err(AppError::Config("saida e obrigatoria".to_string()));
    }
    Ok(())
}
