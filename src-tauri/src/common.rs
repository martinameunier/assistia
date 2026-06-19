use serde::{Deserialize, Serialize};
use std::collections::HashSet;
use std::env;
use std::io::{BufReader, Read};
use std::net::{SocketAddr, TcpStream};
use std::path::PathBuf;
use std::process::{Child, Command, Output, Stdio};
use std::thread;
use std::time::{Duration, Instant};
use std::{fs, io};
use sysinfo::{Pid, Process, System};
use tauri::{AppHandle, Emitter, Manager};

#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;

#[cfg(target_os = "windows")]
const CREATE_NO_WINDOW: u32 = 0x08000000;

pub(crate) const OLLAMA_DEFAULT_MODEL: &str = "qwen3:4b";
pub(crate) const OLLAMA_API_ADDR: &str = "127.0.0.1:11434";
pub(crate) const OLLAMA_BASE_URL: &str = "http://127.0.0.1:11434";
pub(crate) const OPEN_WEBUI_ADDR: &str = "127.0.0.1:8080";
pub(crate) const OPEN_WEBUI_URL: &str = "http://127.0.0.1:8080";
pub(crate) const OPEN_WEBUI_PYTHON_VERSION: &str = "3.11";

#[derive(Serialize)]
pub struct ServiceStatus {
    pub name: String,
    pub status: String,
}

#[derive(Clone, Serialize)]
struct RuntimeProgressEvent {
    status: String,
    progress: u8,
}

#[derive(Default, Deserialize, Serialize)]
pub(crate) struct LauncherSettings {
    pub(crate) ollama_path: Option<String>,
    pub(crate) open_webui_path: Option<String>,
}

pub(crate) fn emit_runtime_log(app: &AppHandle, message: impl Into<String>) {
    let _ = app.emit("launcher-log", message.into());
}

pub(crate) fn emit_runtime_status(app: &AppHandle, status: impl Into<String>, progress: u8) {
    let _ = app.emit(
        "launcher-status",
        RuntimeProgressEvent {
            status: status.into(),
            progress,
        },
    );
}

pub(crate) fn command_output_with_timeout(
    mut command: Command,
    timeout: Duration,
    description: &str,
) -> Result<Output, String> {
    let mut child = command
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| e.to_string())?;

    let started_at = Instant::now();

    loop {
        if child.try_wait().map_err(|e| e.to_string())?.is_some() {
            return child.wait_with_output().map_err(|e| e.to_string());
        }

        if started_at.elapsed() >= timeout {
            let _ = child.kill();
            let _ = child.wait_with_output();

            return Err(format!(
                "{description} ne répond pas après {} secondes",
                timeout.as_secs()
            ));
        }

        thread::sleep(Duration::from_millis(50));
    }
}

#[cfg(target_os = "windows")]
pub(crate) fn hide_command_window(command: &mut Command) {
    command.creation_flags(CREATE_NO_WINDOW);
}

#[cfg(not(target_os = "windows"))]
pub(crate) fn hide_command_window(_command: &mut Command) {}

pub(crate) fn launcher_settings_path(app: &AppHandle) -> Result<PathBuf, String> {
    let config_dir = app.path().app_config_dir().map_err(|e| e.to_string())?;

    Ok(config_dir.join("ollama-settings.json"))
}

pub(crate) fn read_settings(app: &AppHandle) -> LauncherSettings {
    let Ok(settings_path) = launcher_settings_path(app) else {
        return LauncherSettings::default();
    };

    let Ok(settings) = fs::read_to_string(settings_path) else {
        return LauncherSettings::default();
    };

    serde_json::from_str(&settings).unwrap_or_default()
}

pub(crate) fn write_settings(app: &AppHandle, settings: &LauncherSettings) -> Result<(), String> {
    let settings_path = launcher_settings_path(app)?;

    if let Some(config_dir) = settings_path.parent() {
        fs::create_dir_all(config_dir).map_err(|e| e.to_string())?;
    }

    let settings = serde_json::to_string_pretty(settings).map_err(|e| e.to_string())?;

    fs::write(settings_path, settings).map_err(|e| e.to_string())
}

pub(crate) fn home_dir() -> Option<PathBuf> {
    env::var_os("HOME")
        .or_else(|| env::var_os("USERPROFILE"))
        .map(PathBuf::from)
}

pub(crate) fn expand_user_path(path: &str) -> PathBuf {
    let Some(home_dir) = home_dir() else {
        return PathBuf::from(path);
    };

    if path == "~" {
        return home_dir;
    }

    path.strip_prefix("~/")
        .or_else(|| path.strip_prefix("~\\"))
        .map(|path| home_dir.join(path))
        .unwrap_or_else(|| PathBuf::from(path))
}

pub(crate) fn tcp_service_ready(address: &str) -> bool {
    let Ok(address) = address.parse::<SocketAddr>() else {
        return false;
    };

    TcpStream::connect_timeout(&address, Duration::from_millis(500)).is_ok()
}

pub(crate) fn wait_until_tcp_service_stops(address: &str, timeout: Duration) -> bool {
    let started_at = Instant::now();

    while started_at.elapsed() < timeout {
        if !tcp_service_ready(address) {
            return true;
        }

        thread::sleep(Duration::from_millis(250));
    }

    !tcp_service_ready(address)
}

fn collect_descendant_pids(system: &System, root_pid: Pid) -> Vec<Pid> {
    let mut descendants = Vec::new();
    let mut stack = vec![root_pid];

    while let Some(parent_pid) = stack.pop() {
        for (pid, process) in system.processes() {
            if process.parent() == Some(parent_pid) && !descendants.contains(pid) {
                descendants.push(*pid);
                stack.push(*pid);
            }
        }
    }

    descendants
}

pub(crate) fn kill_process_tree(child: &mut Child) -> Result<(), String> {
    let root_pid = Pid::from_u32(child.id());
    let system = System::new_all();

    for pid in collect_descendant_pids(&system, root_pid).into_iter().rev() {
        if let Some(process) = system.process(pid) {
            let _ = process.kill();
        }
    }

    if child.try_wait().map_err(|e| e.to_string())?.is_none() {
        child.kill().map_err(|e| e.to_string())?;
    }

    let _ = child.wait();

    Ok(())
}

pub(crate) fn kill_matching_processes(mut matches_process: impl FnMut(&Process) -> bool) -> usize {
    let system = System::new_all();
    let root_pids: Vec<Pid> = system
        .processes()
        .iter()
        .filter_map(|(pid, process)| matches_process(process).then_some(*pid))
        .collect();
    let mut visited = HashSet::new();
    let mut ordered_pids = Vec::new();

    for root_pid in root_pids {
        for pid in collect_descendant_pids(&system, root_pid).into_iter().rev() {
            if visited.insert(pid) {
                ordered_pids.push(pid);
            }
        }

        if visited.insert(root_pid) {
            ordered_pids.push(root_pid);
        }
    }

    ordered_pids
        .into_iter()
        .filter_map(|pid| system.process(pid))
        .filter(|process| process.kill())
        .count()
}

fn normalize_stream_line(line: &[u8]) -> Option<String> {
    let line = String::from_utf8_lossy(line)
        .replace('\u{1b}', "")
        .trim()
        .to_string();

    (!line.is_empty()).then_some(line)
}

fn should_forward_runtime_log(label: &str, line: &str) -> bool {
    !(label == "ollama" && line.contains("[GIN]") && line.contains("/api/version"))
}

fn handle_runtime_line(app: &AppHandle, label: &str, line: String) {
    if should_forward_runtime_log(label, &line) {
        emit_runtime_log(app, format!("[{label}] {line}"));
    }

    let lower_line = line.to_lowercase();

    if lower_line.contains("pulling") && lower_line.contains('%') {
        emit_runtime_status(app, "Téléchargement du modèle Ollama...", 80);
    } else if lower_line.contains("pulling manifest") || lower_line.contains("pulling") {
        emit_runtime_status(app, "Récupération du modèle Ollama...", 70);
    } else if lower_line.contains("verifying")
        || lower_line.contains("writing manifest")
        || lower_line.contains("success")
    {
        emit_runtime_status(app, "Modèle Ollama prêt.", 95);
    }
}

pub(crate) fn stream_command_output<R>(
    app: AppHandle,
    reader: R,
    label: &'static str,
) -> thread::JoinHandle<()>
where
    R: Read + Send + 'static,
{
    thread::spawn(move || {
        let mut reader = BufReader::new(reader);
        let mut chunk = [0_u8; 1024];
        let mut line = Vec::new();

        loop {
            match reader.read(&mut chunk) {
                Ok(0) => break,
                Ok(read) => {
                    for byte in &chunk[..read] {
                        if *byte == b'\n' || *byte == b'\r' {
                            if let Some(message) = normalize_stream_line(&line) {
                                handle_runtime_line(&app, label, message);
                            }

                            line.clear();
                        } else {
                            line.push(*byte);
                        }
                    }
                }
                Err(error) if error.kind() == io::ErrorKind::Interrupted => {}
                Err(_) => break,
            }
        }

        if let Some(message) = normalize_stream_line(&line) {
            handle_runtime_line(&app, label, message);
        }
    })
}

pub(crate) fn run_streaming_command(
    app: &AppHandle,
    mut command: Command,
    label: &'static str,
    description: &str,
) -> Result<(), String> {
    command.stdout(Stdio::piped()).stderr(Stdio::piped());

    let mut child = command.spawn().map_err(|e| e.to_string())?;

    let stdout_handle = child
        .stdout
        .take()
        .map(|stdout| stream_command_output(app.clone(), stdout, label));

    let stderr_handle = child
        .stderr
        .take()
        .map(|stderr| stream_command_output(app.clone(), stderr, label));

    let status = child.wait().map_err(|e| e.to_string())?;

    if let Some(handle) = stdout_handle {
        let _ = handle.join();
    }

    if let Some(handle) = stderr_handle {
        let _ = handle.join();
    }

    if status.success() {
        return Ok(());
    }

    Err(format!(
        "{description} a échoué avec le code {}",
        status
            .code()
            .map_or_else(|| "inconnu".to_string(), |code| code.to_string())
    ))
}
