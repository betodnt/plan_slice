// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::{WebviewUrl, WebviewWindowBuilder};

fn main() {
    tauri_app_lib::run_with_setup(|app| {
        WebviewWindowBuilder::new(
            app,
            "main",
            WebviewUrl::App("index.html".into()),
        )
        .title("Plano de Corte")
        .inner_size(1280.0, 800.0)
        .resizable(true)
        .build()
        .expect("falha ao criar janela principal");
        Ok(())
    })
}
