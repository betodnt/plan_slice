pub mod commands;
pub mod db;
pub mod error;
pub mod models;
pub mod services;
pub mod state;

use crate::state::AppState;
use tauri::{Manager, WebviewUrl, WebviewWindowBuilder};

#[tauri::command]
fn open_monitor_window(app: tauri::AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("monitor") {
        if window
            .is_minimized()
            .map_err(|e| format!("erro ao consultar estado da janela do monitor: {e}"))?
        {
            window
                .unminimize()
                .map_err(|e| format!("erro ao restaurar janela do monitor: {e}"))?;
        }

        window
            .show()
            .map_err(|e| format!("erro ao exibir janela do monitor: {e}"))?;
        window
            .set_focus()
            .map_err(|e| format!("erro ao focar janela do monitor: {e}"))?;
        return Ok(());
    }

    WebviewWindowBuilder::new(
        &app,
        "monitor",
        WebviewUrl::App("index.html?view=monitor".into()),
    )
    .title("Monitor de Operações (Histórico)")
    .inner_size(1280.0, 900.0)
    .min_inner_size(1024.0, 768.0)
    .center()
    .maximized(true)
    .resizable(true)
    .focused(true)
    .build()
    .map(|window| {
        let _ = window.set_focus();
    })
    .map_err(|e| {
        eprintln!("Falha crítica ao criar janela do monitor: {e}");
        format!("erro ao abrir janela do monitor: {e}")
    })
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(AppState::default())
        .setup(|_app| {
            dotenvy::dotenv().ok();
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::system::validate_system_paths,
            commands::config_commands::get_runtime_config,
            commands::config_commands::save_config,
            commands::health_commands::get_backend_status,
            commands::health_commands::test_storage,
            commands::auth_commands::validate_monitor_login,
            commands::operation_commands::bootstrap_storage,
            commands::operation_commands::get_bootstrap_data,
            commands::operation_commands::start_operation,
            commands::operation_commands::finish_operation,
            commands::operation_commands::touch_operation_lock,
            commands::monitor_commands::get_monitor_snapshot,
            commands::file_commands::search_cnc_files,
            commands::file_commands::open_pdf,
            open_monitor_window
        ])
        .run(tauri::generate_context!())
        .expect("erro ao iniciar aplicacao tauri");
}
