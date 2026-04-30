use std::path::{Path, PathBuf};
use std::time::Duration;
use tokio::time::timeout;
use tokio::task::spawn_blocking;

use tauri_plugin_opener::OpenerExt;

use crate::{
    db::models::{OpenPdfInput, SearchCncInput, SearchCncResult},
    error::{AppError, ErrorResponse},
    services::{config_service::ConfigService, file_service::FileService},
};

#[tauri::command]
pub async fn search_cnc_files(input: SearchCncInput) -> Result<SearchCncResult, ErrorResponse> {
    let server_path_str = ConfigService::server_path()?;
    let cortadas_path_str = ConfigService::saidas_cortadas_path()?;
    let base_paths = vec![
        PathBuf::from(&server_path_str),
        PathBuf::from(&cortadas_path_str),
    ];

    let result = timeout(
        Duration::from_secs(5),
        spawn_blocking(move || {
            FileService::find_matching_saidas_in_paths(&input.pedido, &input.tipo, &base_paths)
        })
    )
    .await
    .map_err(|_| ErrorResponse { message: "Tempo limite de rede excedido".to_string() })?
    .map_err(|e| ErrorResponse { message: format!("Erro de thread: {}", e) })?
    .map_err(Into::into)?;
        
    Ok(SearchCncResult { files: result })
}

#[tauri::command]
pub async fn open_pdf(app: tauri::AppHandle, input: OpenPdfInput) -> Result<bool, ErrorResponse> {
    let pdf_planos_path_str = ConfigService::pdf_planos_path()?;
    let base_path = PathBuf::from(&pdf_planos_path_str);

    let safe_name = FileService::sanitize_filename(&input.cnc_filename);
    let pdf_filename = safe_name.replace(".cnc", ".pdf");

    let path_opt = timeout(
        Duration::from_secs(5),
        spawn_blocking(move || {
            FileService::find_pdf(&pdf_filename, &base_path)
        })
    )
    .await
    .map_err(|_| ErrorResponse { message: "Tempo limite de rede excedido".to_string() })?
    .map_err(|e| ErrorResponse { message: format!("Erro de thread: {}", e) })?
    .map_err(AppError::from)?;

    if let Some(path) = path_opt {
        app.opener()
            .open_path(&path, None::<&str>)
            .map_err(|e| AppError::Io(format!("Falha ao abrir PDF: {}", e)))?;
        Ok(true)
    } else {
        Err(AppError::Internal("PDF nao encontrado".to_string()).into())
    }
}

#[tauri::command]
pub async fn get_pdf_bytes(input: OpenPdfInput) -> Result<Vec<u8>, ErrorResponse> {
    let pdf_planos_path_str = ConfigService::pdf_planos_path()?;
    let base_path = PathBuf::from(&pdf_planos_path_str);

    let safe_name = FileService::sanitize_filename(&input.cnc_filename);
    let pdf_filename = safe_name.replace(".cnc", ".pdf");

    let result = timeout(
        Duration::from_secs(5),
        spawn_blocking(move || -> Result<Vec<u8>, AppError> {
            if let Some(path) = FileService::find_pdf(&pdf_filename, &base_path)? {
                let bytes = std::fs::read(path).map_err(|e| AppError::Io(e.to_string()))?;
                Ok(bytes)
            } else {
                Err(AppError::Internal("PDF nao encontrado".to_string()))
            }
        })
    )
    .await
    .map_err(|_| ErrorResponse { message: "Tempo limite de rede excedido".to_string() })?
    .map_err(|e| ErrorResponse { message: format!("Erro de thread: {}", e) })?
    .map_err(AppError::from)?;

    Ok(result)
}
