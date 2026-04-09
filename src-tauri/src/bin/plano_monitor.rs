// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::{WebviewUrl, WebviewWindowBuilder};

fn main() {
    tauri_app_lib::run_with_setup(|app| {
        WebviewWindowBuilder::new(
            app,
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
        .expect("falha ao criar janela do monitor");

        Ok(())
    })
}
