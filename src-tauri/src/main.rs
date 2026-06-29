#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod chat_history;
mod comfyui;
mod common;
mod dev_agent;
mod installation;
mod ollama;
#[allow(dead_code)]
mod openwebui;
mod python;
mod searxng;
mod web_search;

use chat_history::{
    clear_chat_history_session_key, delete_chat_conversation, get_chat_conversation,
    get_chat_history_security_state, list_chat_conversations, reset_chat_history,
    save_chat_conversation, set_chat_history_password, unlock_chat_history,
};
use common::{emit_runtime_log, emit_runtime_status, read_settings, write_settings, ServiceStatus};
use dev_agent::{
    get_developer_agent_settings, get_developer_agent_status, send_developer_agent_message,
    set_developer_agent_settings,
};
use installation::{
    install_all, install_comfyui, install_developer_agent, install_ollama, install_open_webui,
    install_searxng,
};
use ollama::{get_ollama_executable_path, get_ollama_status, set_ollama_executable_path};
use openwebui::{get_open_webui_executable_path, set_open_webui_executable_path};
use web_search::{get_web_search_settings, search_web, set_web_search_settings};

fn get_runtime_services_status(app: tauri::AppHandle) -> Vec<ServiceStatus> {
    vec![
        get_ollama_status(app.clone()),
        comfyui::get_comfyui_status(app.clone()),
        get_developer_agent_status(app.clone()),
        searxng::get_searxng_status(app.clone()),
    ]
}

fn start_application_runtime(app: tauri::AppHandle) -> Result<(), String> {
    ollama::ensure_ollama_server(&app)?;

    emit_runtime_log(&app, "Ollama est prêt.");
    emit_runtime_status(&app, "Ollama est prêt.", 100);

    Ok(())
}

fn start_comfyui_runtime(app: tauri::AppHandle) -> Result<(), String> {
    installation::ensure_comfyui_installed(&app)?;
    comfyui::start_comfyui_process(&app)?;

    emit_runtime_log(&app, "ComfyUI démarré.");
    emit_runtime_status(&app, "ComfyUI démarré.", 100);

    Ok(())
}

fn start_searxng_runtime(app: tauri::AppHandle) -> Result<(), String> {
    searxng::ensure_searxng_installed(&app)?;
    searxng::start_searxng_process(&app)?;

    emit_runtime_log(&app, "SearXNG démarré.");
    emit_runtime_status(&app, "SearXNG démarré.", 100);

    Ok(())
}

fn stop_application_runtime(app: &tauri::AppHandle) -> Result<String, String> {
    emit_runtime_log(app, "Arrêt des services locaux Assistia.");

    let results = vec![
        comfyui::stop_comfyui_runtime(app),
        searxng::stop_searxng_runtime(app),
        ollama::stop_ollama_runtime(app),
    ];

    emit_runtime_status(app, "Services Assistia arrêtés.", 100);

    let errors = results
        .iter()
        .filter_map(|result| result.as_ref().err().cloned())
        .collect::<Vec<_>>();

    if errors.is_empty() {
        Ok(results
            .into_iter()
            .filter_map(Result::ok)
            .collect::<Vec<_>>()
            .join("\n"))
    } else {
        Err(errors.join("\n"))
    }
}

#[tauri::command]
fn get_installation_prompt_disabled(app: tauri::AppHandle) -> Result<bool, String> {
    Ok(read_settings(&app).installation_prompt_disabled)
}

#[tauri::command]
fn set_installation_prompt_disabled(app: tauri::AppHandle, disabled: bool) -> Result<(), String> {
    let mut settings = read_settings(&app);
    settings.installation_prompt_disabled = disabled;
    write_settings(&app, &settings)
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
    tauri::async_runtime::spawn_blocking(move || stop_application_runtime(&app))
        .await
        .map_err(|e| e.to_string())?
}

#[tauri::command]
async fn start_comfyui(app: tauri::AppHandle) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || start_comfyui_runtime(app))
        .await
        .map_err(|e| e.to_string())?
}

#[tauri::command]
async fn start_searxng(app: tauri::AppHandle) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || start_searxng_runtime(app))
        .await
        .map_err(|e| e.to_string())?
}

#[tauri::command]
async fn stop_comfyui(app: tauri::AppHandle) -> Result<String, String> {
    tauri::async_runtime::spawn_blocking(move || comfyui::stop_comfyui_runtime(&app))
        .await
        .map_err(|e| e.to_string())?
}

#[tauri::command]
async fn download_comfyui_model_files(
    app: tauri::AppHandle,
    downloads: Vec<comfyui::ComfyUIModelDownload>,
) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || comfyui::download_model_files(&app, downloads))
        .await
        .map_err(|e| e.to_string())?
}

#[tauri::command]
async fn delete_comfyui_model_files(
    app: tauri::AppHandle,
    downloads: Vec<comfyui::ComfyUIModelDownload>,
) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || comfyui::delete_model_files(&app, downloads))
        .await
        .map_err(|e| e.to_string())?
}

#[tauri::command]
async fn get_comfyui_model_availability(
    app: tauri::AppHandle,
    models: Vec<comfyui::ComfyUIConfiguredModel>,
) -> Result<Vec<comfyui::ComfyUIModelAvailability>, String> {
    tauri::async_runtime::spawn_blocking(move || comfyui::get_model_availability(&app, models))
        .await
        .map_err(|e| e.to_string())?
}

#[tauri::command]
async fn list_ollama_models(
    app: tauri::AppHandle,
) -> Result<Vec<ollama::OllamaInstalledModel>, String> {
    tauri::async_runtime::spawn_blocking(move || ollama::installed_models(&app))
        .await
        .map_err(|e| e.to_string())?
}

#[tauri::command]
async fn pull_ollama_model(app: tauri::AppHandle, model: String) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || ollama::pull_model(&app, model))
        .await
        .map_err(|e| e.to_string())?
}

#[tauri::command]
async fn delete_ollama_model(app: tauri::AppHandle, model: String) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || ollama::delete_model(&app, model))
        .await
        .map_err(|e| e.to_string())?
}

#[tauri::command]
async fn send_ollama_chat_message(
    app: tauri::AppHandle,
    model: String,
    messages: Vec<ollama::OllamaChatMessage>,
) -> Result<ollama::OllamaChatResponse, String> {
    tauri::async_runtime::spawn_blocking(move || ollama::send_chat_message(&app, model, messages))
        .await
        .map_err(|e| e.to_string())?
}

#[tauri::command]
async fn stop_ollama_chat_message() -> Result<bool, String> {
    tauri::async_runtime::spawn_blocking(ollama::stop_chat_message)
        .await
        .map_err(|e| e.to_string())?
}

#[tauri::command]
async fn queue_comfyui_image_generation(
    app: tauri::AppHandle,
    workflow: serde_json::Value,
) -> Result<comfyui::ComfyUIImageGenerationResponse, String> {
    tauri::async_runtime::spawn_blocking(move || comfyui::queue_image_generation(&app, workflow))
        .await
        .map_err(|e| e.to_string())?
}

#[tauri::command]
async fn interrupt_comfyui_image_generation(app: tauri::AppHandle) -> Result<bool, String> {
    tauri::async_runtime::spawn_blocking(move || comfyui::interrupt_image_generation(&app))
        .await
        .map_err(|e| e.to_string())?
}

#[tauri::command]
async fn save_comfyui_generated_image(
    app: tauri::AppHandle,
    image: comfyui::ComfyUIImageReference,
) -> Result<bool, String> {
    tauri::async_runtime::spawn_blocking(move || comfyui::save_generated_image(&app, image))
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
async fn start_comfyui_installation(app: tauri::AppHandle) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || install_comfyui(app))
        .await
        .map_err(|e| e.to_string())?
}

#[tauri::command]
async fn start_developer_agent_installation(app: tauri::AppHandle) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || install_developer_agent(app))
        .await
        .map_err(|e| e.to_string())?
}

#[tauri::command]
async fn start_searxng_installation(app: tauri::AppHandle) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || install_searxng(app))
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
fn open_comfyui(app: tauri::AppHandle) -> Result<(), String> {
    let settings = read_settings(&app).image_generator;
    open::that(settings.comfyui_url).map_err(|e| e.to_string())
}

#[tauri::command]
fn open_documentation() -> Result<(), String> {
    open::that("https://assistia.martinameunier.fr/documentation").map_err(|e| e.to_string())
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

#[tauri::command]
fn open_external_url(url: String) -> Result<(), String> {
    let trimmed_url = url.trim();
    let normalized_url = trimmed_url.to_ascii_lowercase();

    if !normalized_url.starts_with("https://") && !normalized_url.starts_with("http://") {
        return Err("Seules les URL HTTP et HTTPS peuvent être ouvertes.".to_string());
    }

    open::that(trimmed_url).map_err(|e| e.to_string())
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            check_ollama_status,
            start_runtime,
            stop_runtime,
            get_services_status,
            get_installation_prompt_disabled,
            set_installation_prompt_disabled,
            get_chat_history_security_state,
            unlock_chat_history,
            set_chat_history_password,
            reset_chat_history,
            list_chat_conversations,
            get_chat_conversation,
            save_chat_conversation,
            delete_chat_conversation,
            get_ollama_executable_path,
            set_ollama_executable_path,
            get_open_webui_executable_path,
            set_open_webui_executable_path,
            get_developer_agent_settings,
            set_developer_agent_settings,
            send_developer_agent_message,
            get_web_search_settings,
            set_web_search_settings,
            comfyui::get_image_generator_settings,
            comfyui::set_image_generator_settings,
            search_web,
            open_webui,
            open_comfyui,
            open_documentation,
            open_patreon,
            open_ollama_installation,
            open_ollama_terms,
            open_external_url,
            start_ollama_installation,
            start_open_webui_installation,
            start_comfyui_installation,
            start_developer_agent_installation,
            start_searxng_installation,
            start_full_installation,
            start_comfyui,
            start_searxng,
            stop_comfyui,
            download_comfyui_model_files,
            delete_comfyui_model_files,
            get_comfyui_model_availability,
            list_ollama_models,
            pull_ollama_model,
            delete_ollama_model,
            send_ollama_chat_message,
            stop_ollama_chat_message,
            queue_comfyui_image_generation,
            interrupt_comfyui_image_generation,
            save_comfyui_generated_image
        ])
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|app, event| {
            if let tauri::RunEvent::ExitRequested { .. } = event {
                clear_chat_history_session_key();

                if let Err(error) = stop_application_runtime(app) {
                    eprintln!("Erreur pendant l'arrêt des services Assistia: {error}");
                }
            }
        });
}
