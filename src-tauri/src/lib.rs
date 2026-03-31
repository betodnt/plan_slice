// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
use std::sync::Mutex;

static CUT_STATUS: Mutex<&str> = Mutex::new("Parado");

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
fn start_cut() -> Result<(), String> {
    let mut status = CUT_STATUS.lock().unwrap();
    *status = "Cortando";
    Ok(())
}

#[tauri::command]
fn stop_cut() -> Result<(), String> {
    let mut status = CUT_STATUS.lock().unwrap();
    *status = "Parado";
    Ok(())
}

#[tauri::command]
fn get_cut_status() -> String {
    let status = CUT_STATUS.lock().unwrap();
    status.to_string()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![greet, start_cut, stop_cut, get_cut_status])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
