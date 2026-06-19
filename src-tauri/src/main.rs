#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod common;
mod installation;
mod ollama;
mod openwebui;
mod python;

use common::{emit_runtime_log, emit_runtime_status, ServiceStatus};
use installation::{install_all, install_ollama, install_open_webui};
use ollama::{get_ollama_executable_path, get_ollama_status, set_ollama_executable_path};
use openwebui::{get_open_webui_executable_path, set_open_webui_executable_path};

fn get_runtime_services_status(app: tauri::AppHandle) -> Vec<ServiceStatus> {
    vec![
        get_ollama_status(app.clone()),
        openwebui::get_open_webui_status(app),
    ]
}

fn start_application_runtime(app: tauri::AppHandle) -> Result<(), String> {
    ollama::ensure_ollama_runtime(&app)?;
    installation::ensure_open_webui_installed(&app)?;
    openwebui::start_open_webui_process(&app)?;

    emit_runtime_log(&app, "Ollama et Open WebUI démarrés.");
    emit_runtime_status(&app, "Ollama et Open WebUI démarrés.", 100);

    Ok(())
}

fn stop_application_runtime(app: tauri::AppHandle) -> Result<String, String> {
    let open_webui_result = openwebui::stop_open_webui_runtime(&app);
    let ollama_result = ollama::stop_ollama_runtime(&app);

    match (open_webui_result, ollama_result) {
        (Ok(open_webui), Ok(ollama)) => {
            emit_runtime_status(&app, "Services Assistia arrêtés.", 100);
            Ok(format!("{open_webui}\n{ollama}"))
        }
        (Err(error), Ok(_)) | (Ok(_), Err(error)) => Err(error),
        (Err(open_webui_error), Err(ollama_error)) => {
            Err(format!("{open_webui_error}\n{ollama_error}"))
        }
    }
}

#[tauri::command]
async fn check_ollama_status(app: tauri::AppHandle) -> ServiceStatus {
    tauri::async_runtime::spawn_blocking(move || get_ollama_status(app))
        .await
        .unwrap_or(ServiceStatus {
            name: "ollama".to_string(),
            status: "not installed".to_string(),
        })
}

#[tauri::command]
async fn start_runtime(app: tauri::AppHandle) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || start_application_runtime(app))
        .await
        .map_err(|e| e.to_string())?
}

#[tauri::command]
async fn stop_runtime(app: tauri::AppHandle) -> Result<String, String> {
    tauri::async_runtime::spawn_blocking(move || stop_application_runtime(app))
        .await
        .map_err(|e| e.to_string())?
}

#[tauri::command]
async fn get_services_status(app: tauri::AppHandle) -> Result<Vec<ServiceStatus>, String> {
    tauri::async_runtime::spawn_blocking(move || get_runtime_services_status(app))
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn start_ollama_installation(app: tauri::AppHandle) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || install_ollama(app))
        .await
        .map_err(|e| e.to_string())?
}

#[tauri::command]
async fn start_open_webui_installation(app: tauri::AppHandle) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || install_open_webui(app))
        .await
        .map_err(|e| e.to_string())?
}

#[tauri::command]
async fn start_full_installation(app: tauri::AppHandle) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || install_all(app))
        .await
        .map_err(|e| e.to_string())?
}

#[tauri::command]
fn open_webui() -> Result<(), String> {
    open::that("http://127.0.0.1:8080").map_err(|e| e.to_string())
}

#[tauri::command]
fn open_documentation() -> Result<(), String> {
    open::that("https://assistia.martinameunier.fr").map_err(|e| e.to_string())
}

#[tauri::command]
fn open_patreon() -> Result<(), String> {
    open::that("https://www.patreon.com/c/MartinAMeunier").map_err(|e| e.to_string())
}

#[tauri::command]
fn open_ollama_installation() -> Result<(), String> {
    #[cfg(target_os = "windows")]
    let url = "https://ollama.com/download/windows";

    #[cfg(target_os = "macos")]
    let url = "https://ollama.com/download";

    #[cfg(target_os = "linux")]
    let url = "https://ollama.com/download/linux";

    open::that(url).map_err(|e| e.to_string())
}

#[tauri::command]
fn open_ollama_terms() -> Result<(), String> {
    open::that("https://ollama.com/terms").map_err(|e| e.to_string())
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            check_ollama_status,
            start_runtime,
            stop_runtime,
            get_services_status,
            get_ollama_executable_path,
            set_ollama_executable_path,
            get_open_webui_executable_path,
            set_open_webui_executable_path,
            open_webui,
            open_documentation,
            open_patreon,
            open_ollama_installation,
            open_ollama_terms,
            start_ollama_installation,
            start_open_webui_installation,
            start_full_installation
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
