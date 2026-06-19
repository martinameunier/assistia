use crate::common::{
    emit_runtime_log, emit_runtime_status, expand_user_path, hide_command_window,
    kill_matching_processes, kill_process_tree, read_settings, stream_command_output,
    tcp_service_ready, wait_until_tcp_service_stops, write_settings, LauncherSettings,
    OLLAMA_BASE_URL, OPEN_WEBUI_ADDR, OPEN_WEBUI_URL,
};
use std::env;
use std::fs;
use std::path::{Path, PathBuf};
use std::process::{Child, Command, Stdio};
use std::sync::{Mutex, OnceLock};
use std::thread;
use std::time::{Duration, Instant};
use tauri::{AppHandle, Manager};

static OPEN_WEBUI_PROCESS: OnceLock<Mutex<Option<Child>>> = OnceLock::new();

fn open_webui_process() -> &'static Mutex<Option<Child>> {
    OPEN_WEBUI_PROCESS.get_or_init(|| Mutex::new(None))
}

fn open_webui_executable_name() -> &'static str {
    #[cfg(target_os = "windows")]
    {
        "open-webui.exe"
    }

    #[cfg(not(target_os = "windows"))]
    {
        "open-webui"
    }
}

pub(crate) fn configured_open_webui_executable(app: &AppHandle) -> Option<PathBuf> {
    let path = read_settings(app).open_webui_path?;
    let path = path.trim();

    if path.is_empty() {
        return None;
    }

    let path = expand_user_path(path);

    if path.is_dir() {
        Some(path.join(open_webui_executable_name()))
    } else {
        Some(path)
    }
}

#[tauri::command]
pub fn get_open_webui_executable_path(app: AppHandle) -> Result<Option<String>, String> {
    Ok(read_settings(&app).open_webui_path)
}

#[tauri::command]
pub fn set_open_webui_executable_path(
    app: AppHandle,
    open_webui_path: String,
) -> Result<(), String> {
    let open_webui_path = open_webui_path.trim().to_string();
    let mut settings: LauncherSettings = read_settings(&app);
    settings.open_webui_path = (!open_webui_path.is_empty()).then_some(open_webui_path);

    write_settings(&app, &settings)
}

pub(crate) fn open_webui_executable_candidates(app: Option<&AppHandle>) -> Vec<PathBuf> {
    let executable_name = open_webui_executable_name();
    let mut candidates = Vec::new();

    if let Some(configured_path) = app.and_then(configured_open_webui_executable) {
        candidates.push(configured_path);
    }

    if let Some(app) = app {
        if let Ok(path) = managed_open_webui_executable(app) {
            candidates.push(path);
        }
    }

    if let Some(path) = env::var_os("PATH") {
        candidates.extend(env::split_paths(&path).map(|path| path.join(executable_name)));
    }

    #[cfg(target_os = "macos")]
    {
        candidates.extend([
            PathBuf::from("/usr/local/bin/open-webui"),
            PathBuf::from("/opt/homebrew/bin/open-webui"),
        ]);
    }

    #[cfg(target_os = "windows")]
    {
        if let Some(app_data) = env::var_os("APPDATA") {
            candidates.push(
                PathBuf::from(app_data)
                    .join("Python")
                    .join("Scripts")
                    .join("open-webui.exe"),
            );
        }

        if let Some(local_app_data) = env::var_os("LOCALAPPDATA") {
            candidates.push(
                PathBuf::from(local_app_data)
                    .join("Programs")
                    .join("Python")
                    .join("Python311")
                    .join("Scripts")
                    .join("open-webui.exe"),
            );
        }
    }

    #[cfg(target_os = "linux")]
    {
        candidates.extend([
            PathBuf::from("/usr/local/bin/open-webui"),
            PathBuf::from("/usr/bin/open-webui"),
        ]);
    }

    candidates
}

fn open_webui_command_executable(app: &AppHandle) -> PathBuf {
    open_webui_executable_candidates(Some(app))
        .into_iter()
        .find(|candidate| candidate.exists())
        .unwrap_or_else(|| PathBuf::from(open_webui_executable_name()))
}

pub(crate) fn open_webui_runtime_dir(app: &AppHandle) -> Result<PathBuf, String> {
    app.path()
        .app_data_dir()
        .map(|path| path.join("open-webui"))
        .map_err(|e| e.to_string())
}

pub(crate) fn open_webui_data_dir(app: &AppHandle) -> Result<PathBuf, String> {
    Ok(open_webui_runtime_dir(app)?.join("data"))
}

pub(crate) fn open_webui_venv_dir(app: &AppHandle) -> Result<PathBuf, String> {
    Ok(open_webui_runtime_dir(app)?.join("venv"))
}

#[cfg(target_os = "windows")]
fn open_webui_venv_bin_dir(venv_dir: PathBuf) -> PathBuf {
    venv_dir.join("Scripts")
}

#[cfg(not(target_os = "windows"))]
fn open_webui_venv_bin_dir(venv_dir: PathBuf) -> PathBuf {
    venv_dir.join("bin")
}

#[cfg(target_os = "windows")]
pub(crate) fn managed_open_webui_executable(app: &AppHandle) -> Result<PathBuf, String> {
    Ok(open_webui_venv_bin_dir(open_webui_venv_dir(app)?).join("open-webui.exe"))
}

#[cfg(not(target_os = "windows"))]
pub(crate) fn managed_open_webui_executable(app: &AppHandle) -> Result<PathBuf, String> {
    Ok(open_webui_venv_bin_dir(open_webui_venv_dir(app)?).join("open-webui"))
}

#[cfg(target_os = "windows")]
pub(crate) fn open_webui_python_executable(app: &AppHandle) -> Result<PathBuf, String> {
    Ok(open_webui_venv_bin_dir(open_webui_venv_dir(app)?).join("python.exe"))
}

#[cfg(not(target_os = "windows"))]
pub(crate) fn open_webui_python_executable(app: &AppHandle) -> Result<PathBuf, String> {
    Ok(open_webui_venv_bin_dir(open_webui_venv_dir(app)?).join("python"))
}

pub(crate) fn open_webui_ready() -> bool {
    tcp_service_ready(OPEN_WEBUI_ADDR)
}

pub(crate) fn open_webui_installed(app: &AppHandle) -> bool {
    open_webui_executable_candidates(Some(app))
        .into_iter()
        .any(|path| path.exists())
}

pub(crate) fn get_open_webui_status(app: AppHandle) -> crate::common::ServiceStatus {
    if open_webui_ready() {
        return crate::common::ServiceStatus {
            name: "open-webui".to_string(),
            status: format!("UP - {OPEN_WEBUI_URL}"),
        };
    }

    crate::common::ServiceStatus {
        name: "open-webui".to_string(),
        status: if open_webui_installed(&app) {
            "installed".to_string()
        } else {
            "not installed".to_string()
        },
    }
}

fn process_matches_open_webui(process: &sysinfo::Process, runtime_dir: &Path) -> bool {
    let name = process.name().to_ascii_lowercase();
    let exe = process
        .exe()
        .map(|path| path.to_string_lossy().to_ascii_lowercase())
        .unwrap_or_default();
    let command = process.cmd().join(" ").to_ascii_lowercase();
    let cwd_is_managed = process
        .cwd()
        .is_some_and(|cwd| cwd == runtime_dir || cwd.starts_with(runtime_dir));
    let has_assistia_env = process.environ().iter().any(|value| {
        let value = value.to_ascii_lowercase();

        value == format!("webui_url={}", OPEN_WEBUI_URL)
            || value == format!("ollama_base_url={}", OLLAMA_BASE_URL)
            || (value.starts_with("data_dir=") && value.contains("open-webui"))
    });
    let command_is_open_webui = command.contains("open-webui") || command.contains("open_webui");

    cwd_is_managed
        || has_assistia_env
        || name == "open-webui"
        || name == "open-webui.exe"
        || exe.ends_with("/open-webui")
        || exe.ends_with("\\open-webui.exe")
        || (command_is_open_webui && (command.contains("serve") || command.contains("8080")))
}

fn stop_remaining_open_webui_processes(app: &AppHandle) -> Result<usize, String> {
    let runtime_dir = open_webui_runtime_dir(app)?;

    Ok(kill_matching_processes(|process| {
        process_matches_open_webui(process, &runtime_dir)
    }))
}

fn wait_for_open_webui(app: &AppHandle) -> Result<(), String> {
    let timeout = Duration::from_secs(180);
    let started_at = Instant::now();

    while started_at.elapsed() < timeout {
        if open_webui_ready() {
            emit_runtime_log(app, "Open WebUI est prêt.");
            emit_runtime_status(app, "Open WebUI est prêt.", 95);
            return Ok(());
        }

        let elapsed = started_at.elapsed().as_secs();
        let progress = 82 + ((elapsed.min(timeout.as_secs()) * 12) / timeout.as_secs()) as u8;

        emit_runtime_status(app, "Attente du démarrage d'Open WebUI...", progress);
        thread::sleep(Duration::from_secs(2));
    }

    Err("Open WebUI ne répond pas après 180 secondes.".to_string())
}

pub(crate) fn start_open_webui_process(app: &AppHandle) -> Result<(), String> {
    if open_webui_ready() {
        emit_runtime_log(app, "Open WebUI est déjà en cours d'exécution.");
        emit_runtime_status(app, "Open WebUI est prêt.", 95);
        return Ok(());
    }

    let mut process = open_webui_process().lock().map_err(|e| e.to_string())?;

    if let Some(child) = process.as_mut() {
        if child.try_wait().map_err(|e| e.to_string())?.is_none() {
            return Ok(());
        }
    }

    *process = None;

    let runtime_dir = open_webui_runtime_dir(app)?;
    let data_dir = open_webui_data_dir(app)?;

    fs::create_dir_all(&data_dir).map_err(|e| e.to_string())?;

    let executable_path = open_webui_command_executable(app);
    let mut command = Command::new(executable_path);
    hide_command_window(&mut command);
    command
        .args(["serve", "--host", "127.0.0.1", "--port", "8080"])
        .current_dir(runtime_dir)
        .env("OLLAMA_BASE_URL", OLLAMA_BASE_URL)
        .env("DATA_DIR", data_dir)
        .env("WEBUI_URL", OPEN_WEBUI_URL)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());

    emit_runtime_status(app, "Démarrage d'Open WebUI...", 82);
    emit_runtime_log(app, "Démarrage d'Open WebUI connecté à Ollama.");

    let mut child = command.spawn().map_err(|e| e.to_string())?;

    if let Some(stdout) = child.stdout.take() {
        stream_command_output(app.clone(), stdout, "open-webui");
    }

    if let Some(stderr) = child.stderr.take() {
        stream_command_output(app.clone(), stderr, "open-webui");
    }

    *process = Some(child);
    drop(process);

    wait_for_open_webui(app)
}

pub(crate) fn stop_open_webui_runtime(app: &AppHandle) -> Result<String, String> {
    emit_runtime_status(app, "Arrêt d'Open WebUI...", 15);

    let had_tracked_process = {
        let mut process = open_webui_process().lock().map_err(|e| e.to_string())?;

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
            "Aucun processus Open WebUI lancé par Assistia n'est actif.",
        );
    }

    if !wait_until_tcp_service_stops(OPEN_WEBUI_ADDR, Duration::from_secs(5)) {
        let killed_processes = stop_remaining_open_webui_processes(app)?;

        if killed_processes > 0 {
            emit_runtime_log(
                app,
                format!("{killed_processes} processus Open WebUI restant(s) arrêté(s)."),
            );
        }

        wait_until_tcp_service_stops(OPEN_WEBUI_ADDR, Duration::from_secs(5));
    }

    if open_webui_ready() {
        emit_runtime_status(app, "Open WebUI est lancé hors d'Assistia.", 35);
        return Ok("Open WebUI est lancé hors d'Assistia.".to_string());
    }

    emit_runtime_log(app, "Open WebUI arrêté.");
    emit_runtime_status(app, "Open WebUI arrêté.", 35);

    Ok("Open WebUI arrêté.".to_string())
}
