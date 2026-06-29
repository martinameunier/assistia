use crate::common::{
    command_output_with_timeout, emit_runtime_log, emit_runtime_status, expand_user_path,
    hide_command_window, read_settings, run_streaming_command, write_settings,
    DeveloperAgentSettings, LauncherSettings, OLLAMA_BASE_URL, OPEN_WEBUI_PYTHON_VERSION,
};
use crate::{installation, python};
use serde::Serialize;
use std::collections::{BTreeMap, BTreeSet};
use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;
use std::time::Duration;
use tauri::{AppHandle, Manager};

const AIDER_PACKAGE: &str = "aider-chat";
const AIDER_INSTALL_PROGRESS: u8 = 86;
const SNAPSHOT_MAX_FILE_BYTES: u64 = 512 * 1024;
const SNAPSHOT_MAX_TOTAL_BYTES: usize = 4 * 1024 * 1024;
const SNAPSHOT_MAX_FILES: usize = 5_000;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DeveloperAgentResponse {
    pub message: String,
    pub stdout: String,
    pub stderr: String,
    pub git_status: String,
    pub git_diff: String,
}

#[tauri::command]
pub fn get_developer_agent_settings(app: AppHandle) -> Result<DeveloperAgentSettings, String> {
    Ok(read_settings(&app).developer_agent)
}

#[tauri::command]
pub fn set_developer_agent_settings(
    app: AppHandle,
    settings: DeveloperAgentSettings,
) -> Result<(), String> {
    let mut launcher_settings: LauncherSettings = read_settings(&app);
    let use_local_ollama_url = settings.use_local_ollama_url;
    let ollama_url = if use_local_ollama_url {
        OLLAMA_BASE_URL.to_string()
    } else {
        settings.ollama_url.trim().trim_end_matches('/').to_string()
    };

    launcher_settings.developer_agent = DeveloperAgentSettings {
        use_local_ollama_url,
        ollama_url,
        project_path: settings.project_path.trim().to_string(),
        model: settings.model.trim().to_string(),
    };

    write_settings(&app, &launcher_settings)
}

pub(crate) fn developer_agent_runtime_dir(app: &AppHandle) -> Result<PathBuf, String> {
    app.path()
        .app_data_dir()
        .map(|path| path.join("developer-agent"))
        .map_err(|e| e.to_string())
}

fn developer_agent_venv_dir(app: &AppHandle) -> Result<PathBuf, String> {
    Ok(developer_agent_runtime_dir(app)?.join("venv"))
}

fn developer_agent_history_dir(app: &AppHandle) -> Result<PathBuf, String> {
    Ok(developer_agent_runtime_dir(app)?.join("history"))
}

#[cfg(target_os = "windows")]
fn developer_agent_venv_bin_dir(venv_dir: PathBuf) -> PathBuf {
    venv_dir.join("Scripts")
}

#[cfg(not(target_os = "windows"))]
fn developer_agent_venv_bin_dir(venv_dir: PathBuf) -> PathBuf {
    venv_dir.join("bin")
}

#[cfg(target_os = "windows")]
fn developer_agent_python_executable(app: &AppHandle) -> Result<PathBuf, String> {
    Ok(developer_agent_venv_bin_dir(developer_agent_venv_dir(app)?).join("python.exe"))
}

#[cfg(not(target_os = "windows"))]
fn developer_agent_python_executable(app: &AppHandle) -> Result<PathBuf, String> {
    Ok(developer_agent_venv_bin_dir(developer_agent_venv_dir(app)?).join("python"))
}

#[cfg(target_os = "windows")]
fn developer_agent_aider_executable(app: &AppHandle) -> Result<PathBuf, String> {
    Ok(developer_agent_venv_bin_dir(developer_agent_venv_dir(app)?).join("aider.exe"))
}

#[cfg(not(target_os = "windows"))]
fn developer_agent_aider_executable(app: &AppHandle) -> Result<PathBuf, String> {
    Ok(developer_agent_venv_bin_dir(developer_agent_venv_dir(app)?).join("aider"))
}

pub(crate) fn developer_agent_installed(app: &AppHandle) -> bool {
    let Ok(aider_path) = developer_agent_aider_executable(app) else {
        return false;
    };

    if !aider_path.exists() {
        return false;
    }

    let mut command = Command::new(aider_path);
    hide_command_window(&mut command);
    command.arg("--version");

    command_output_with_timeout(command, Duration::from_secs(5), "Aider")
        .map(|output| output.status.success())
        .unwrap_or(false)
}

pub(crate) fn get_developer_agent_status(app: AppHandle) -> crate::common::ServiceStatus {
    crate::common::ServiceStatus {
        name: "developer-agent".to_string(),
        status: if developer_agent_installed(&app) {
            "installed".to_string()
        } else {
            "not installed".to_string()
        },
    }
}

fn remove_incomplete_developer_agent_venv(app: &AppHandle) -> Result<(), String> {
    let venv_dir = developer_agent_venv_dir(app)?;

    if venv_dir.exists() {
        fs::remove_dir_all(venv_dir).map_err(|e| e.to_string())?;
    }

    Ok(())
}

fn create_developer_agent_venv(app: &AppHandle) -> Result<(), String> {
    let venv_dir = developer_agent_venv_dir(app)?;

    if let Some(python) = python::find_python_311() {
        emit_runtime_log(app, "Python 3.11 détecté pour l'agent développeur.");

        let mut create_venv_command = python.command();
        create_venv_command.arg("-m").arg("venv").arg(&venv_dir);

        return run_streaming_command(
            app,
            create_venv_command,
            "aider-install",
            "Création de l'environnement Aider",
        );
    }

    emit_runtime_status(
        app,
        "Installation de Python 3.11 pour Aider...",
        AIDER_INSTALL_PROGRESS,
    );
    emit_runtime_log(app, "Python 3.11 absent. Installation via uv pour Aider.");

    let uv_path = installation::ensure_uv(app)?;

    let mut install_python_command = Command::new(&uv_path);
    hide_command_window(&mut install_python_command);
    install_python_command.args(["python", "install", OPEN_WEBUI_PYTHON_VERSION]);

    run_streaming_command(
        app,
        install_python_command,
        "uv",
        "Installation de Python 3.11 pour Aider",
    )?;

    let mut create_venv_command = Command::new(uv_path);
    hide_command_window(&mut create_venv_command);
    create_venv_command
        .args(["venv", "--python", OPEN_WEBUI_PYTHON_VERSION])
        .arg(venv_dir);

    run_streaming_command(
        app,
        create_venv_command,
        "uv",
        "Création de l'environnement Aider",
    )
}

pub(crate) fn ensure_developer_agent_installed(app: &AppHandle) -> Result<(), String> {
    if developer_agent_installed(app) {
        return Ok(());
    }

    let runtime_dir = developer_agent_runtime_dir(app)?;
    fs::create_dir_all(&runtime_dir).map_err(|e| e.to_string())?;

    emit_runtime_status(
        app,
        "Préparation de l'agent développeur...",
        AIDER_INSTALL_PROGRESS,
    );
    emit_runtime_log(
        app,
        "Préparation d'un environnement Python local pour Aider.",
    );

    if !developer_agent_python_executable(app)?.exists() {
        remove_incomplete_developer_agent_venv(app)?;
        fs::create_dir_all(&runtime_dir).map_err(|e| e.to_string())?;
        create_developer_agent_venv(app)?;
    }

    let python_path = developer_agent_python_executable(app)?;
    let uv_path = installation::ensure_uv(app)?;
    let mut install_command = Command::new(uv_path);
    hide_command_window(&mut install_command);
    install_command
        .args(["pip", "install", "--python"])
        .arg(&python_path)
        .args(["--upgrade", AIDER_PACKAGE]);

    emit_runtime_status(app, "Installation d'Aider...", AIDER_INSTALL_PROGRESS);
    emit_runtime_log(
        app,
        "Installation d'Aider dans l'environnement local avec uv.",
    );

    run_streaming_command(app, install_command, "aider-install", "Installation Aider")?;

    if !developer_agent_aider_executable(app)?.exists() {
        return Err("L'exécutable Aider est introuvable après installation.".to_string());
    }

    emit_runtime_log(app, "Aider est installé.");

    Ok(())
}

fn validate_developer_agent_settings(
    settings: &DeveloperAgentSettings,
) -> Result<(PathBuf, String, String), String> {
    let ollama_url = settings.ollama_url.trim();
    let model = settings.model.trim();
    let project_path = settings.project_path.trim();

    if ollama_url.is_empty() {
        return Err("L'URL Ollama est obligatoire.".to_string());
    }

    if !(ollama_url.starts_with("http://") || ollama_url.starts_with("https://")) {
        return Err("L'URL Ollama doit commencer par http:// ou https://.".to_string());
    }

    if model.is_empty() {
        return Err("Le modèle de l'agent développeur est obligatoire.".to_string());
    }

    if project_path.is_empty() {
        return Err("Le dossier du projet est obligatoire.".to_string());
    }

    let project_dir = expand_user_path(project_path);

    if !project_dir.exists() {
        return Err("Le dossier du projet configuré n'existe pas.".to_string());
    }

    if !project_dir.is_dir() {
        return Err("Le chemin du projet doit pointer vers un dossier.".to_string());
    }

    Ok((project_dir, ollama_url.to_string(), model.to_string()))
}

fn project_has_git_repository(project_dir: &Path) -> bool {
    let mut command = Command::new("git");
    hide_command_window(&mut command);
    command
        .arg("-C")
        .arg(project_dir)
        .args(["rev-parse", "--is-inside-work-tree"]);

    command_output_with_timeout(command, Duration::from_secs(5), "Git")
        .map(|output| output.status.success())
        .unwrap_or(false)
}

fn normalize_aider_model(model: &str) -> String {
    let model = model.trim();

    if model.contains('/') {
        model.to_string()
    } else {
        format!("ollama_chat/{model}")
    }
}

fn strip_message_token(token: &str) -> String {
    token
        .trim_matches(|character: char| {
            matches!(
                character,
                '"' | '\'' | '`' | ',' | ';' | ':' | '(' | ')' | '[' | ']' | '{' | '}' | '<' | '>'
            )
        })
        .trim_end_matches('.')
        .replace('\\', "/")
}

fn is_valid_message_file_path(path: &str) -> bool {
    if path.is_empty()
        || path.len() > 240
        || path.contains("://")
        || path.contains('\0')
        || path.contains("..")
        || path.ends_with('/')
    {
        return false;
    }

    if Path::new(path).is_absolute() {
        return false;
    }

    if !path.chars().all(|character| {
        character.is_ascii_alphanumeric() || matches!(character, '/' | '.' | '_' | '-' | '@')
    }) {
        return false;
    }

    let has_directory = path.contains('/');
    let extension = Path::new(path)
        .extension()
        .and_then(|extension| extension.to_str());

    if let Some(extension) = extension {
        return extension
            .chars()
            .any(|character| character.is_ascii_alphabetic());
    }

    has_directory
}

fn extract_message_file_paths(message: &str) -> Vec<PathBuf> {
    let mut paths = BTreeSet::new();

    for raw_token in message.split_whitespace() {
        let mut token = strip_message_token(raw_token);

        if let Some(stripped_token) = token.strip_prefix("./") {
            token = stripped_token.to_string();
        }

        if is_valid_message_file_path(&token) {
            paths.insert(token);
        }
    }

    paths.into_iter().map(PathBuf::from).collect()
}

fn run_git_command(project_dir: &Path, args: &[&str]) -> Result<String, String> {
    let mut command = Command::new("git");
    hide_command_window(&mut command);
    command.arg("-C").arg(project_dir).args(args);

    let output = command_output_with_timeout(command, Duration::from_secs(20), "Git")?;

    let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();

    if output.status.success() {
        return Ok(stdout);
    }

    Err(if stderr.is_empty() { stdout } else { stderr })
}

#[derive(Default)]
struct ProjectSnapshot {
    files: BTreeMap<String, String>,
    max_files_reached: bool,
    max_total_bytes_reached: bool,
    total_bytes: usize,
}

fn should_skip_snapshot_dir(path: &Path) -> bool {
    let Some(name) = path.file_name().and_then(|name| name.to_str()) else {
        return false;
    };

    matches!(
        name,
        ".git"
            | ".hg"
            | ".svn"
            | ".next"
            | ".nuxt"
            | ".svelte-kit"
            | ".turbo"
            | ".cache"
            | ".parcel-cache"
            | ".venv"
            | "venv"
            | "env"
            | "node_modules"
            | "target"
            | "dist"
            | "build"
            | "__pycache__"
    )
}

fn snapshot_project(project_dir: &Path) -> ProjectSnapshot {
    let mut snapshot = ProjectSnapshot::default();
    collect_snapshot_files(project_dir, project_dir, &mut snapshot);

    snapshot
}

fn collect_snapshot_files(root_dir: &Path, current_dir: &Path, snapshot: &mut ProjectSnapshot) {
    if snapshot.max_files_reached || snapshot.max_total_bytes_reached {
        return;
    }

    let Ok(entries) = fs::read_dir(current_dir) else {
        return;
    };

    for entry in entries.flatten() {
        if snapshot.files.len() >= SNAPSHOT_MAX_FILES {
            snapshot.max_files_reached = true;
            return;
        }

        if snapshot.total_bytes >= SNAPSHOT_MAX_TOTAL_BYTES {
            snapshot.max_total_bytes_reached = true;
            return;
        }

        let path = entry.path();
        let Ok(metadata) = fs::symlink_metadata(&path) else {
            continue;
        };

        if metadata.file_type().is_symlink() {
            continue;
        }

        if metadata.is_dir() {
            if !should_skip_snapshot_dir(&path) {
                collect_snapshot_files(root_dir, &path, snapshot);
            }
            continue;
        }

        if !metadata.is_file() || metadata.len() > SNAPSHOT_MAX_FILE_BYTES {
            continue;
        }

        let Ok(bytes) = fs::read(&path) else {
            continue;
        };

        if bytes.contains(&0) {
            continue;
        }

        let Ok(content) = String::from_utf8(bytes) else {
            continue;
        };

        if snapshot.total_bytes + content.len() > SNAPSHOT_MAX_TOTAL_BYTES {
            snapshot.max_total_bytes_reached = true;
            return;
        }

        let Ok(relative_path) = path.strip_prefix(root_dir) else {
            continue;
        };

        let relative_path = relative_path.to_string_lossy().replace('\\', "/");

        snapshot.total_bytes += content.len();
        snapshot.files.insert(relative_path, content);
    }
}

fn changed_snapshot_paths(before: &ProjectSnapshot, after: &ProjectSnapshot) -> Vec<String> {
    let mut paths = BTreeSet::new();

    paths.extend(before.files.keys().cloned());
    paths.extend(after.files.keys().cloned());

    paths
        .into_iter()
        .filter(|path| before.files.get(path) != after.files.get(path))
        .collect()
}

fn format_new_file_diff(path: &str, content: &str) -> String {
    let mut diff = format!("--- /dev/null\n+++ b/{path}\n@@ nouveau fichier @@\n");

    for line in content.lines() {
        diff.push('+');
        diff.push_str(line);
        diff.push('\n');
    }

    diff
}

fn format_deleted_file_diff(path: &str, content: &str) -> String {
    let mut diff = format!("--- a/{path}\n+++ /dev/null\n@@ fichier supprimé @@\n");

    for line in content.lines() {
        diff.push('-');
        diff.push_str(line);
        diff.push('\n');
    }

    diff
}

fn format_changed_file_diff(path: &str, before: &str, after: &str) -> String {
    let before_lines: Vec<&str> = before.lines().collect();
    let after_lines: Vec<&str> = after.lines().collect();

    let mut prefix_len = 0;

    while prefix_len < before_lines.len()
        && prefix_len < after_lines.len()
        && before_lines[prefix_len] == after_lines[prefix_len]
    {
        prefix_len += 1;
    }

    let mut suffix_len = 0;

    while suffix_len < before_lines.len().saturating_sub(prefix_len)
        && suffix_len < after_lines.len().saturating_sub(prefix_len)
        && before_lines[before_lines.len() - suffix_len - 1]
            == after_lines[after_lines.len() - suffix_len - 1]
    {
        suffix_len += 1;
    }

    let context_len = 3;
    let before_change_end = before_lines.len().saturating_sub(suffix_len);
    let after_change_end = after_lines.len().saturating_sub(suffix_len);
    let context_start = prefix_len.saturating_sub(context_len);
    let before_context_end = (before_change_end + context_len).min(before_lines.len());
    let after_context_end = (after_change_end + context_len).min(after_lines.len());

    let mut diff = format!(
        "--- a/{path}\n+++ b/{path}\n@@ lignes {}-{} -> {}-{} @@\n",
        context_start + 1,
        before_context_end,
        context_start + 1,
        after_context_end
    );

    for line in &before_lines[context_start..prefix_len] {
        diff.push(' ');
        diff.push_str(line);
        diff.push('\n');
    }

    for line in &before_lines[prefix_len..before_change_end] {
        diff.push('-');
        diff.push_str(line);
        diff.push('\n');
    }

    for line in &after_lines[prefix_len..after_change_end] {
        diff.push('+');
        diff.push_str(line);
        diff.push('\n');
    }

    for line in &after_lines[after_change_end..after_context_end] {
        diff.push(' ');
        diff.push_str(line);
        diff.push('\n');
    }

    diff
}

fn build_snapshot_diff(before: &ProjectSnapshot, after: &ProjectSnapshot) -> String {
    let changed_paths = changed_snapshot_paths(before, after);

    if changed_paths.is_empty() {
        return String::new();
    }

    let mut diff = String::new();

    for path in changed_paths {
        let file_diff = match (before.files.get(&path), after.files.get(&path)) {
            (None, Some(content)) => format_new_file_diff(&path, content),
            (Some(content), None) => format_deleted_file_diff(&path, content),
            (Some(before_content), Some(after_content)) => {
                format_changed_file_diff(&path, before_content, after_content)
            }
            (None, None) => String::new(),
        };

        if !file_diff.is_empty() {
            diff.push_str(&file_diff);
            diff.push('\n');
        }
    }

    if before.max_files_reached || after.max_files_reached {
        diff.push_str("[Assistia a arrêté l'analyse après le nombre maximal de fichiers suivis]\n");
    }

    if before.max_total_bytes_reached || after.max_total_bytes_reached {
        diff.push_str("[Assistia a arrêté l'analyse après le volume maximal de fichiers suivis]\n");
    }

    diff.trim().to_string()
}

fn truncate_for_chat(value: String, max_chars: usize) -> String {
    if value.chars().count() <= max_chars {
        return value;
    }

    let mut truncated: String = value.chars().take(max_chars).collect();
    truncated.push_str("\n\n[Sortie tronquée par Assistia]");

    truncated
}

#[tauri::command]
pub async fn send_developer_agent_message(
    app: AppHandle,
    message: String,
    settings: DeveloperAgentSettings,
) -> Result<DeveloperAgentResponse, String> {
    tauri::async_runtime::spawn_blocking(move || {
        run_developer_agent_message(&app, message, settings)
    })
    .await
    .map_err(|e| e.to_string())?
}

fn run_developer_agent_message(
    app: &AppHandle,
    message: String,
    settings: DeveloperAgentSettings,
) -> Result<DeveloperAgentResponse, String> {
    let message = message.trim().to_string();

    if message.is_empty() {
        return Err("Le message envoyé à l'agent est vide.".to_string());
    }

    ensure_developer_agent_installed(app)?;

    let (project_dir, ollama_url, model) = validate_developer_agent_settings(&settings)?;
    let git_tracking_enabled = project_has_git_repository(&project_dir);
    let before_snapshot = snapshot_project(&project_dir);

    emit_runtime_log(
        app,
        format!(
            "Aider traite une demande sur le projet {}{}.",
            project_dir.to_string_lossy(),
            if git_tracking_enabled {
                " avec suivi Git"
            } else {
                " sans suivi Git"
            }
        ),
    );

    let aider_path = developer_agent_aider_executable(app)?;
    let aider_model = normalize_aider_model(&model);
    let target_files = extract_message_file_paths(&message);
    let history_dir = developer_agent_history_dir(app)?;

    fs::create_dir_all(&history_dir).map_err(|e| e.to_string())?;

    let mut command = Command::new(aider_path);
    hide_command_window(&mut command);
    command
        .current_dir(&project_dir)
        .env("OLLAMA_API_BASE", &ollama_url)
        .env("NO_COLOR", "1")
        .arg("--model")
        .arg(aider_model)
        .arg("--message")
        .arg(&message)
        .arg("--yes")
        .arg("--analytics-disable")
        .arg("--no-fancy-input")
        .arg("--no-pretty")
        .arg("--no-stream")
        .arg("--no-check-update")
        .arg("--no-gitignore")
        .arg("--no-restore-chat-history")
        .arg("--input-history-file")
        .arg(history_dir.join("input.history"))
        .arg("--chat-history-file")
        .arg(history_dir.join("chat.history.md"))
        .arg("--no-show-model-warnings")
        .arg("--no-detect-urls")
        .arg("--no-browser");

    if git_tracking_enabled {
        command
            .arg("--git")
            .arg("--no-auto-commits")
            .arg("--no-dirty-commits");
    } else {
        command.arg("--no-git");
    }

    if !target_files.is_empty() {
        command.args(&target_files);
    }

    let output = command_output_with_timeout(command, Duration::from_secs(900), "Aider")?;
    let after_snapshot = snapshot_project(&project_dir);

    let stdout = truncate_for_chat(
        String::from_utf8_lossy(&output.stdout).trim().to_string(),
        12_000,
    );
    let stderr = truncate_for_chat(
        String::from_utf8_lossy(&output.stderr).trim().to_string(),
        8_000,
    );

    if !output.status.success() {
        let details = if stderr.is_empty() { &stdout } else { &stderr };
        return Err(format!("Aider n'a pas pu appliquer la demande.\n{details}"));
    }

    let detected_paths = changed_snapshot_paths(&before_snapshot, &after_snapshot);
    let snapshot_diff = build_snapshot_diff(&before_snapshot, &after_snapshot);
    let git_status = if git_tracking_enabled {
        run_git_command(&project_dir, &["status", "--short"]).unwrap_or_default()
    } else {
        String::new()
    };
    let git_diff_stat = if git_tracking_enabled {
        run_git_command(&project_dir, &["diff", "--stat"]).unwrap_or_default()
    } else {
        String::new()
    };
    let git_diff = truncate_for_chat(
        if snapshot_diff.is_empty() && git_tracking_enabled {
            run_git_command(&project_dir, &["diff", "--"]).unwrap_or_default()
        } else {
            snapshot_diff
        },
        24_000,
    );

    let response_message = if detected_paths.is_empty() && git_status.trim().is_empty() {
        if git_tracking_enabled {
            "Aider a terminé, mais aucun changement n'a été détecté dans le dépôt Git.".to_string()
        } else {
            "Aider a terminé sans suivi Git, mais aucun changement textuel n'a été détecté par Assistia.".to_string()
        }
    } else {
        let change_summary = if !detected_paths.is_empty() {
            detected_paths
                .iter()
                .take(20)
                .map(|path| format!("- {path}"))
                .collect::<Vec<_>>()
                .join("\n")
        } else if git_diff_stat.trim().is_empty() {
            git_status.trim().to_string()
        } else {
            git_diff_stat.trim().to_string()
        };

        format!(
            "Aider a appliqué la demande. {}.\nModifications détectées:\n{}",
            if git_tracking_enabled {
                "Le suivi Git est actif"
            } else {
                "Aucun dépôt Git n'a été détecté, l'historique n'est pas suivi"
            },
            change_summary
        )
    };

    Ok(DeveloperAgentResponse {
        message: response_message,
        stdout,
        stderr,
        git_status,
        git_diff,
    })
}
