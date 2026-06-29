use crate::common::{
    command_output_with_timeout, emit_runtime_log, emit_runtime_status, expand_user_path,
    hide_command_window, kill_matching_processes, kill_process_tree, read_settings,
    run_streaming_command, stream_command_output, tcp_service_ready, wait_until_tcp_service_stops,
    write_settings, LauncherSettings, ServiceStatus, OLLAMA_API_ADDR,
};
use serde::{Deserialize, Serialize};
use std::env;
use std::io::{Read, Write};
use std::net::{Shutdown, TcpStream};
use std::path::PathBuf;
use std::process::{Child, Command, Stdio};
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::{Mutex, OnceLock};
use std::thread;
use std::time::{Duration, Instant};
use tauri::AppHandle;

static OLLAMA_PROCESS: OnceLock<Mutex<Option<Child>>> = OnceLock::new();
static OLLAMA_CHAT_STREAM: OnceLock<Mutex<Option<(u64, TcpStream)>>> = OnceLock::new();
static OLLAMA_CHAT_REQUEST_COUNTER: AtomicU64 = AtomicU64::new(1);

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct OllamaInstalledModel {
    pub name: String,
}

#[derive(Clone, Deserialize, Serialize)]
pub struct OllamaChatMessage {
    pub role: String,
    pub content: String,
}

#[derive(Serialize)]
pub struct OllamaChatResponse {
    pub message: String,
}

#[derive(Deserialize)]
struct OllamaApiChatMessage {
    content: String,
}

#[derive(Deserialize)]
struct OllamaApiChatResponse {
    message: Option<OllamaApiChatMessage>,
    response: Option<String>,
    error: Option<String>,
}

fn ollama_process() -> &'static Mutex<Option<Child>> {
    OLLAMA_PROCESS.get_or_init(|| Mutex::new(None))
}

fn ollama_chat_stream() -> &'static Mutex<Option<(u64, TcpStream)>> {
    OLLAMA_CHAT_STREAM.get_or_init(|| Mutex::new(None))
}

fn clear_active_chat_stream(request_id: u64) -> Result<(), String> {
    let mut stream = ollama_chat_stream().lock().map_err(|e| e.to_string())?;

    if stream
        .as_ref()
        .is_some_and(|(active_request_id, _)| *active_request_id == request_id)
    {
        *stream = None;
    }

    Ok(())
}

fn ollama_executable_name() -> &'static str {
    #[cfg(target_os = "windows")]
    {
        "ollama.exe"
    }

    #[cfg(not(target_os = "windows"))]
    {
        "ollama"
    }
}

fn configured_ollama_executable(app: &AppHandle) -> Option<PathBuf> {
    let path = read_settings(app).ollama_path?;
    let path = path.trim();

    if path.is_empty() {
        return None;
    }

    let path = expand_user_path(path);

    if path.is_dir() {
        Some(path.join(ollama_executable_name()))
    } else {
        Some(path)
    }
}

#[tauri::command]
pub fn get_ollama_executable_path(app: AppHandle) -> Result<Option<String>, String> {
    Ok(read_settings(&app).ollama_path)
}

#[tauri::command]
pub fn set_ollama_executable_path(app: AppHandle, ollama_path: String) -> Result<(), String> {
    let ollama_path = ollama_path.trim().to_string();
    let mut settings: LauncherSettings = read_settings(&app);
    settings.ollama_path = (!ollama_path.is_empty()).then_some(ollama_path);

    write_settings(&app, &settings)
}

fn ollama_executable_candidates(app: Option<&AppHandle>) -> Vec<PathBuf> {
    let executable_name = ollama_executable_name();
    let mut candidates = Vec::new();

    if let Some(configured_path) = app.and_then(configured_ollama_executable) {
        candidates.push(configured_path);
    }

    if let Some(path) = env::var_os("PATH") {
        candidates.extend(env::split_paths(&path).map(|path| path.join(executable_name)));
    }

    #[cfg(target_os = "macos")]
    {
        candidates.extend([
            PathBuf::from("/usr/local/bin/ollama"),
            PathBuf::from("/opt/homebrew/bin/ollama"),
            PathBuf::from("/Applications/Ollama.app/Contents/Resources/ollama"),
            PathBuf::from("/Applications/Ollama.app/Contents/MacOS/ollama"),
        ]);
    }

    #[cfg(target_os = "windows")]
    {
        if let Some(local_app_data) = env::var_os("LOCALAPPDATA") {
            candidates.push(
                PathBuf::from(local_app_data)
                    .join("Programs")
                    .join("Ollama")
                    .join("ollama.exe"),
            );
        }

        if let Some(program_files) = env::var_os("ProgramFiles") {
            candidates.push(
                PathBuf::from(program_files)
                    .join("Ollama")
                    .join("ollama.exe"),
            );
        }

        if let Some(program_files_x86) = env::var_os("ProgramFiles(x86)") {
            candidates.push(
                PathBuf::from(program_files_x86)
                    .join("Ollama")
                    .join("ollama.exe"),
            );
        }
    }

    #[cfg(target_os = "linux")]
    {
        candidates.extend([
            PathBuf::from("/usr/bin/ollama"),
            PathBuf::from("/usr/local/bin/ollama"),
            PathBuf::from("/snap/bin/ollama"),
        ]);
    }

    candidates
}

fn ollama_executable(app: Option<&AppHandle>) -> PathBuf {
    ollama_executable_candidates(app)
        .into_iter()
        .find(|candidate| candidate.exists())
        .unwrap_or_else(|| PathBuf::from(ollama_executable_name()))
}

fn ollama_command(app: Option<&AppHandle>) -> Command {
    let mut command = Command::new(ollama_executable(app));
    hide_command_window(&mut command);
    command
}

pub(crate) fn ollama_installed(app: &AppHandle) -> bool {
    let mut command = ollama_command(Some(app));
    command.arg("--version");

    command_output_with_timeout(command, Duration::from_secs(2), "Ollama")
        .map(|output| output.status.success())
        .unwrap_or(false)
}

fn ollama_api_ready() -> bool {
    tcp_service_ready(OLLAMA_API_ADDR)
}

fn ollama_version(app: &AppHandle) -> Option<String> {
    let mut command = ollama_command(Some(app));
    command.arg("--version");

    let output = command_output_with_timeout(command, Duration::from_secs(2), "Ollama").ok()?;
    let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
    let version = if stdout.is_empty() { stderr } else { stdout };

    (!version.is_empty()).then_some(version)
}

fn process_matches_ollama(process: &sysinfo::Process) -> bool {
    let name = process.name().to_ascii_lowercase();
    let exe = process
        .exe()
        .map(|path| path.to_string_lossy().to_ascii_lowercase())
        .unwrap_or_default();
    let command = process.cmd().join(" ").to_ascii_lowercase();

    name == "ollama"
        || name == "ollama.exe"
        || exe.ends_with("/ollama")
        || exe.ends_with("\\ollama.exe")
        || command.contains("ollama serve")
}

pub fn get_ollama_status(app: AppHandle) -> ServiceStatus {
    if !ollama_installed(&app) {
        return ServiceStatus {
            name: "ollama".to_string(),
            status: "not installed".to_string(),
        };
    }

    if !ollama_api_ready() {
        return ServiceStatus {
            name: "ollama".to_string(),
            status: "installed".to_string(),
        };
    }

    let version = ollama_version(&app).unwrap_or_else(|| "Ollama".to_string());

    ServiceStatus {
        name: "ollama".to_string(),
        status: format!("UP - {version}"),
    }
}

fn start_ollama_process(app: &AppHandle) -> Result<(), String> {
    let mut process = ollama_process().lock().map_err(|e| e.to_string())?;

    if let Some(child) = process.as_mut() {
        if child.try_wait().map_err(|e| e.to_string())?.is_none() {
            return Ok(());
        }
    }

    *process = None;

    let mut command = ollama_command(Some(app));
    command
        .arg("serve")
        .env("OLLAMA_NUM_THREADS", "8")
        .env("OLLAMA_MAX_LOADED_MODELS", "1")
        .env("OLLAMA_KEEP_ALIVE", "24h")
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());

    emit_runtime_status(app, "Démarrage d'Ollama...", 20);
    emit_runtime_log(app, "Démarrage du serveur Ollama local.");

    let mut child = command.spawn().map_err(|e| e.to_string())?;

    if let Some(stdout) = child.stdout.take() {
        stream_command_output(app.clone(), stdout, "ollama");
    }

    if let Some(stderr) = child.stderr.take() {
        stream_command_output(app.clone(), stderr, "ollama");
    }

    *process = Some(child);

    Ok(())
}

fn wait_for_ollama(app: &AppHandle) -> Result<(), String> {
    let timeout = Duration::from_secs(120);
    let started_at = Instant::now();

    while started_at.elapsed() < timeout {
        if ollama_api_ready() {
            emit_runtime_log(app, "Ollama est prêt.");
            emit_runtime_status(app, "Ollama est prêt.", 55);
            return Ok(());
        }

        let elapsed = started_at.elapsed().as_secs();
        let progress = 20 + ((elapsed.min(timeout.as_secs()) * 30) / timeout.as_secs()) as u8;

        emit_runtime_status(app, "Attente du démarrage d'Ollama...", progress);
        thread::sleep(Duration::from_secs(2));
    }

    Err("Ollama ne répond pas après 120 secondes.".to_string())
}

pub(crate) fn ensure_ollama_server(app: &AppHandle) -> Result<(), String> {
    emit_runtime_status(app, "Préparation d'Ollama...", 5);

    if !ollama_installed(app) {
        emit_runtime_status(app, "Ollama n'est pas installé.", 0);
        return Err("Ollama n'est pas installé.".to_string());
    }

    if ollama_api_ready() {
        emit_runtime_log(app, "Ollama est déjà en cours d'exécution.");
        emit_runtime_status(app, "Ollama est prêt.", 100);
        return Ok(());
    }

    start_ollama_process(app)?;
    wait_for_ollama(app)?;
    emit_runtime_status(app, "Ollama est prêt.", 100);

    Ok(())
}

pub(crate) fn installed_models(app: &AppHandle) -> Result<Vec<OllamaInstalledModel>, String> {
    if !ollama_installed(app) {
        return Ok(Vec::new());
    }

    let mut command = ollama_command(Some(app));
    command.arg("list");

    let output = command_output_with_timeout(command, Duration::from_secs(10), "Liste Ollama")?;

    if !output.status.success() {
        return Ok(Vec::new());
    }

    let stdout = String::from_utf8_lossy(&output.stdout);

    Ok(stdout
        .lines()
        .skip(1)
        .filter_map(|line| line.split_whitespace().next())
        .map(|name| OllamaInstalledModel {
            name: name.to_string(),
        })
        .collect())
}

pub(crate) fn pull_model(app: &AppHandle, model: String) -> Result<(), String> {
    let model = model.trim();

    if model.is_empty() {
        return Err("Le modèle Ollama est vide.".to_string());
    }

    ensure_ollama_server(app)?;

    emit_runtime_status(app, "Téléchargement du modèle Ollama...", 10);
    emit_runtime_log(app, format!("Téléchargement du modèle Ollama {model}."));

    let mut command = ollama_command(Some(app));
    command.arg("pull").arg(model);

    run_streaming_command(
        app,
        command,
        "ollama-models",
        "Téléchargement du modèle Ollama",
    )?;

    emit_runtime_status(app, "Modèle Ollama prêt.", 100);
    emit_runtime_log(app, format!("Modèle {model} prêt."));

    Ok(())
}

pub(crate) fn delete_model(app: &AppHandle, model: String) -> Result<(), String> {
    let model = model.trim();

    if model.is_empty() {
        return Err("Le modèle Ollama est vide.".to_string());
    }

    emit_runtime_status(app, "Suppression du modèle Ollama...", 10);
    emit_runtime_log(app, format!("Suppression du modèle Ollama {model}."));

    let mut command = ollama_command(Some(app));
    command.arg("rm").arg(model);

    run_streaming_command(
        app,
        command,
        "ollama-models",
        "Suppression du modèle Ollama",
    )?;

    emit_runtime_status(app, "Modèle Ollama supprimé.", 100);
    emit_runtime_log(app, format!("Modèle {model} supprimé."));

    Ok(())
}

fn find_header_end(response: &[u8]) -> Option<usize> {
    response
        .windows(4)
        .position(|window| window == b"\r\n\r\n")
        .map(|position| position + 4)
}

fn decode_chunked_body(body: &[u8]) -> Result<Vec<u8>, String> {
    let mut decoded = Vec::new();
    let mut offset = 0;

    loop {
        let Some(line_end) = body[offset..]
            .windows(2)
            .position(|window| window == b"\r\n")
            .map(|position| offset + position)
        else {
            return Err("Réponse Ollama chunked invalide.".to_string());
        };

        let size_line = String::from_utf8_lossy(&body[offset..line_end]);
        let size_token = size_line.split(';').next().unwrap_or("").trim();
        let size = usize::from_str_radix(size_token, 16).map_err(|e| e.to_string())?;

        offset = line_end + 2;

        if size == 0 {
            break;
        }

        let chunk_end = offset + size;

        if chunk_end > body.len() {
            return Err("Réponse Ollama chunked incomplète.".to_string());
        }

        decoded.extend_from_slice(&body[offset..chunk_end]);
        offset = chunk_end + 2;
    }

    Ok(decoded)
}

fn read_http_body(response: &[u8]) -> Result<Vec<u8>, String> {
    let header_end =
        find_header_end(response).ok_or_else(|| "Réponse HTTP Ollama invalide.".to_string())?;
    let headers = String::from_utf8_lossy(&response[..header_end]).to_ascii_lowercase();
    let body = &response[header_end..];

    if headers.contains("transfer-encoding: chunked") {
        return decode_chunked_body(body);
    }

    Ok(body.to_vec())
}

pub(crate) fn send_chat_message(
    app: &AppHandle,
    model: String,
    messages: Vec<OllamaChatMessage>,
) -> Result<OllamaChatResponse, String> {
    let model = model.trim();

    if model.is_empty() {
        return Err("Sélectionnez un modèle Ollama.".to_string());
    }

    ensure_ollama_server(app)?;

    let body = serde_json::json!({
        "model": model,
        "messages": messages,
        "stream": false
    })
    .to_string();

    let request = format!(
        "POST /api/chat HTTP/1.1\r\nHost: {OLLAMA_API_ADDR}\r\nContent-Type: application/json\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{body}",
        body.len()
    );

    let request_id = OLLAMA_CHAT_REQUEST_COUNTER.fetch_add(1, Ordering::Relaxed);
    let mut stream = TcpStream::connect(OLLAMA_API_ADDR).map_err(|e| e.to_string())?;
    stream
        .set_read_timeout(Some(Duration::from_secs(300)))
        .map_err(|e| e.to_string())?;
    stream
        .set_write_timeout(Some(Duration::from_secs(30)))
        .map_err(|e| e.to_string())?;
    stream
        .write_all(request.as_bytes())
        .map_err(|e| e.to_string())?;

    {
        let mut active_stream = ollama_chat_stream().lock().map_err(|e| e.to_string())?;
        *active_stream = Some((
            request_id,
            stream.try_clone().map_err(|e| e.to_string())?,
        ));
    }

    let mut response = Vec::new();
    let read_result = stream.read_to_end(&mut response);
    clear_active_chat_stream(request_id)?;
    read_result.map_err(|e| e.to_string())?;

    let response_start = String::from_utf8_lossy(&response[..response.len().min(64)]);

    if !response_start.starts_with("HTTP/1.1 200") && !response_start.starts_with("HTTP/1.0 200") {
        let body = read_http_body(&response).unwrap_or_default();
        let error_body = String::from_utf8_lossy(&body).trim().to_string();

        return Err(if error_body.is_empty() {
            "Ollama n'a pas accepté la demande de chat.".to_string()
        } else {
            error_body
        });
    }

    let body = read_http_body(&response)?;
    let chat_response: OllamaApiChatResponse =
        serde_json::from_slice(&body).map_err(|e| e.to_string())?;

    if let Some(error) = chat_response.error {
        return Err(error);
    }

    let message = chat_response
        .message
        .map(|message| message.content)
        .or(chat_response.response)
        .unwrap_or_default();

    Ok(OllamaChatResponse { message })
}

pub(crate) fn stop_chat_message() -> Result<bool, String> {
    let mut stream = ollama_chat_stream().lock().map_err(|e| e.to_string())?;
    let Some((_, active_stream)) = stream.take() else {
        return Ok(false);
    };

    active_stream
        .shutdown(Shutdown::Both)
        .map_err(|e| e.to_string())?;

    Ok(true)
}

pub(crate) fn stop_ollama_runtime(app: &AppHandle) -> Result<String, String> {
    emit_runtime_status(app, "Arrêt d'Ollama...", 20);

    let had_tracked_process = {
        let mut process = ollama_process().lock().map_err(|e| e.to_string())?;

        match process.as_mut() {
            Some(child) => {
                if child.try_wait().map_err(|e| e.to_string())?.is_none() {
                    kill_process_tree(child)?;
                }

                *process = None;
                true
            }
            None => false,
        }
    };

    if !had_tracked_process {
        emit_runtime_log(
            app,
            "Aucun processus Ollama lancé par Assistia n'est actif.",
        );
    }

    if !wait_until_tcp_service_stops(OLLAMA_API_ADDR, Duration::from_secs(5)) {
        let killed_processes = kill_matching_processes(process_matches_ollama);

        if killed_processes > 0 {
            emit_runtime_log(
                app,
                format!("{killed_processes} processus Ollama restant(s) arrêté(s)."),
            );
        }

        wait_until_tcp_service_stops(OLLAMA_API_ADDR, Duration::from_secs(5));
    }

    if ollama_api_ready() {
        emit_runtime_status(app, "Ollama est lancé hors d'Assistia.", 100);
        return Ok("Ollama est lancé hors d'Assistia.".to_string());
    }

    emit_runtime_log(app, "Ollama arrêté.");
    emit_runtime_status(app, "Ollama arrêté.", 100);

    Ok("Ollama arrêté.".to_string())
}
