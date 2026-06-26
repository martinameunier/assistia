use crate::common::{
    emit_runtime_log, emit_runtime_status, ensure_curl, hide_command_window, read_settings,
    run_streaming_command, write_settings, COMFYUI_PYTHON_VERSION, DEFAULT_SEARXNG_URL,
    OPEN_WEBUI_PYTHON_VERSION,
};
use crate::{comfyui, dev_agent, ollama, openwebui, python, searxng};
use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;
use tauri::AppHandle;

const COMFYUI_ARCHIVE_URL: &str =
    "https://github.com/Comfy-Org/ComfyUI/archive/refs/heads/master.tar.gz";
const COMFYUI_ARCHIVE_DIR: &str = "ComfyUI-master";

pub(crate) fn ensure_uv(app: &AppHandle) -> Result<PathBuf, String> {
    if let Some(uv_path) = python::find_uv() {
        return Ok(uv_path);
    }

    emit_runtime_status(app, "Installation d'uv...", 58);
    emit_runtime_log(
        app,
        "Installation d'uv pour récupérer Python 3.11 si nécessaire.",
    );

    ensure_curl(app)?;

    run_streaming_command(
        app,
        python::uv_install_command(),
        "uv-install",
        "Installation d'uv",
    )?;

    python::find_uv()
        .ok_or_else(|| "L'exécutable uv est introuvable après installation.".to_string())
}

fn remove_incomplete_open_webui_venv(app: &AppHandle) -> Result<(), String> {
    let venv_dir = openwebui::open_webui_venv_dir(app)?;

    if venv_dir.exists() {
        fs::remove_dir_all(venv_dir).map_err(|e| e.to_string())?;
    }

    Ok(())
}

fn managed_open_webui_python_version(app: &AppHandle) -> Result<Option<String>, String> {
    let python_path = openwebui::open_webui_python_executable(app)?;

    if !python_path.exists() {
        return Ok(None);
    }

    Ok(python::executable_version(
        &python_path,
        "Python Open WebUI",
    ))
}

fn ensure_managed_open_webui_python_version(app: &AppHandle) -> Result<(), String> {
    let python_path = openwebui::open_webui_python_executable(app)?;

    if !python_path.exists() {
        return Ok(());
    };

    let version = python::executable_version(&python_path, "Python Open WebUI");

    if version
        .as_deref()
        .is_some_and(python::is_python_311_version)
    {
        return Ok(());
    }

    let detected_version =
        version.unwrap_or_else(|| "une version de Python non reconnue".to_string());

    emit_runtime_status(app, "Migration de l'environnement Open WebUI...", 58);
    emit_runtime_log(
        app,
        format!(
            "L'environnement Open WebUI utilise {detected_version}. Recréation avec Python {OPEN_WEBUI_PYTHON_VERSION}."
        ),
    );

    remove_incomplete_open_webui_venv(app)
}

fn validate_managed_open_webui_python_version(app: &AppHandle) -> Result<(), String> {
    let Some(version) = managed_open_webui_python_version(app)? else {
        return Err("L'environnement Open WebUI ne contient pas d'exécutable Python.".to_string());
    };

    if python::is_python_311_version(&version) {
        return Ok(());
    }

    Err(format!(
        "Open WebUI nécessite Python {OPEN_WEBUI_PYTHON_VERSION}. Version détectée: {version}."
    ))
}

fn create_open_webui_venv(app: &AppHandle) -> Result<(), String> {
    if let Some(python) = python::find_python_311() {
        emit_runtime_log(app, "Python 3.11 détecté sur le système.");

        let mut create_venv_command = python.command();
        create_venv_command
            .arg("-m")
            .arg("venv")
            .arg(openwebui::open_webui_venv_dir(app)?);

        return run_streaming_command(
            app,
            create_venv_command,
            "open-webui-install",
            "Création de l'environnement Open WebUI",
        );
    }

    emit_runtime_status(app, "Installation de Python 3.11...", 62);
    emit_runtime_log(app, "Python 3.11 absent. Installation via uv.");

    let uv_path = ensure_uv(app)?;

    let mut install_python_command = Command::new(&uv_path);
    hide_command_window(&mut install_python_command);
    install_python_command.args(["python", "install", OPEN_WEBUI_PYTHON_VERSION]);

    run_streaming_command(
        app,
        install_python_command,
        "uv",
        "Installation de Python 3.11",
    )?;

    let mut create_venv_command = Command::new(uv_path);
    hide_command_window(&mut create_venv_command);
    create_venv_command
        .args(["venv", "--python", OPEN_WEBUI_PYTHON_VERSION])
        .arg(openwebui::open_webui_venv_dir(app)?);

    run_streaming_command(
        app,
        create_venv_command,
        "uv",
        "Création de l'environnement Open WebUI",
    )
}

pub(crate) fn ensure_open_webui_installed(app: &AppHandle) -> Result<(), String> {
    if openwebui::open_webui_installed(app) {
        return Ok(());
    }

    let executable_path = openwebui::managed_open_webui_executable(app)?;

    ensure_managed_open_webui_python_version(app)?;

    if executable_path.exists() {
        return Ok(());
    }

    let runtime_dir = openwebui::open_webui_runtime_dir(app)?;
    fs::create_dir_all(&runtime_dir).map_err(|e| e.to_string())?;

    emit_runtime_status(app, "Préparation d'Open WebUI...", 72);
    emit_runtime_log(
        app,
        "Préparation d'un environnement Python local pour Open WebUI.",
    );

    if !openwebui::open_webui_python_executable(app)?.exists() {
        remove_incomplete_open_webui_venv(app)?;
        fs::create_dir_all(&runtime_dir).map_err(|e| e.to_string())?;
        create_open_webui_venv(app)?;
    }

    validate_managed_open_webui_python_version(app)?;

    let python_path = openwebui::open_webui_python_executable(app)?;
    let uv_path = ensure_uv(app)?;
    let mut install_command = Command::new(uv_path);
    hide_command_window(&mut install_command);
    install_command
        .args(["pip", "install", "--python"])
        .arg(&python_path)
        .args(["--upgrade", "open-webui"]);

    emit_runtime_status(app, "Installation d'Open WebUI...", 76);
    emit_runtime_log(
        app,
        "Installation d'Open WebUI dans l'environnement local avec uv.",
    );

    run_streaming_command(
        app,
        install_command,
        "open-webui-install",
        "Installation d'Open WebUI",
    )?;

    if !executable_path.exists() {
        return Err("L'exécutable Open WebUI est introuvable après installation.".to_string());
    }

    emit_runtime_log(app, "Open WebUI est installé.");

    Ok(())
}

fn remove_incomplete_comfyui_venv(app: &AppHandle) -> Result<(), String> {
    let venv_dir = comfyui::comfyui_venv_dir(app)?;

    if venv_dir.exists() {
        fs::remove_dir_all(venv_dir).map_err(|e| e.to_string())?;
    }

    Ok(())
}

#[cfg(target_os = "windows")]
fn powershell_quote(value: &str) -> String {
    format!("'{}'", value.replace('\'', "''"))
}

#[cfg(target_os = "windows")]
fn comfyui_download_command(archive_path: &Path) -> Command {
    let mut command = Command::new("powershell.exe");
    let archive_path = powershell_quote(&archive_path.to_string_lossy());
    let script = format!(
        "$ProgressPreference = 'SilentlyContinue'; Invoke-WebRequest -Uri '{}' -OutFile {}",
        COMFYUI_ARCHIVE_URL, archive_path
    );

    command.args([
        "-NoProfile",
        "-ExecutionPolicy",
        "Bypass",
        "-Command",
        &script,
    ]);
    hide_command_window(&mut command);
    command
}

#[cfg(not(target_os = "windows"))]
fn comfyui_download_command(archive_path: &Path) -> Command {
    let mut command = Command::new("curl");
    command
        .args(["-fSL", COMFYUI_ARCHIVE_URL, "-o"])
        .arg(archive_path);
    hide_command_window(&mut command);
    command
}

fn comfyui_extract_command(archive_path: &Path, runtime_dir: &Path) -> Command {
    let mut command = Command::new("tar");
    command
        .arg("-xzf")
        .arg(archive_path)
        .arg("-C")
        .arg(runtime_dir);
    hide_command_window(&mut command);
    command
}

fn extracted_comfyui_source_dir(runtime_dir: &Path) -> Result<PathBuf, String> {
    let expected_dir = runtime_dir.join(COMFYUI_ARCHIVE_DIR);

    if expected_dir.join("main.py").exists() {
        return Ok(expected_dir);
    }

    for entry in fs::read_dir(runtime_dir).map_err(|e| e.to_string())? {
        let path = entry.map_err(|e| e.to_string())?.path();
        let is_comfyui_archive_dir = path
            .file_name()
            .and_then(|name| name.to_str())
            .is_some_and(|name| name.starts_with("ComfyUI-"));

        if is_comfyui_archive_dir && path.join("main.py").exists() {
            return Ok(path);
        }
    }

    Err("Le dossier extrait de ComfyUI est introuvable après téléchargement.".to_string())
}

fn download_comfyui_source(app: &AppHandle) -> Result<(), String> {
    if comfyui::comfyui_main_path(app)?.exists() {
        return Ok(());
    }

    let runtime_dir = comfyui::comfyui_runtime_dir(app)?;
    let source_dir = comfyui::comfyui_source_dir(app)?;
    let archive_path = runtime_dir.join("comfyui.tar.gz");
    let extracted_dir = runtime_dir.join(COMFYUI_ARCHIVE_DIR);

    if source_dir.exists() {
        fs::remove_dir_all(&source_dir).map_err(|e| e.to_string())?;
    }

    if extracted_dir.exists() {
        fs::remove_dir_all(&extracted_dir).map_err(|e| e.to_string())?;
    }

    if archive_path.exists() {
        fs::remove_file(&archive_path).map_err(|e| e.to_string())?;
    }

    fs::create_dir_all(&runtime_dir).map_err(|e| e.to_string())?;

    emit_runtime_status(app, "Téléchargement de ComfyUI...", 56);
    emit_runtime_log(app, "Téléchargement de l'archive officielle ComfyUI.");

    ensure_curl(app)?;

    run_streaming_command(
        app,
        comfyui_download_command(&archive_path),
        "comfyui-install",
        "Téléchargement de ComfyUI",
    )?;

    emit_runtime_status(app, "Extraction de ComfyUI...", 58);
    emit_runtime_log(app, "Extraction de l'archive ComfyUI.");

    run_streaming_command(
        app,
        comfyui_extract_command(&archive_path, &runtime_dir),
        "comfyui-install",
        "Extraction de ComfyUI",
    )?;

    let extracted_source_dir = extracted_comfyui_source_dir(&runtime_dir)?;
    fs::rename(extracted_source_dir, &source_dir).map_err(|e| e.to_string())?;
    let _ = fs::remove_file(archive_path);

    if !comfyui::comfyui_main_path(app)?.exists() {
        return Err(
            "Le fichier main.py de ComfyUI est introuvable après téléchargement.".to_string(),
        );
    }

    Ok(())
}

fn create_comfyui_venv(app: &AppHandle) -> Result<(), String> {
    emit_runtime_status(app, "Installation de Python pour ComfyUI...", 62);
    emit_runtime_log(
        app,
        format!("Préparation de Python {COMFYUI_PYTHON_VERSION} pour ComfyUI via uv."),
    );

    let uv_path = ensure_uv(app)?;

    let mut install_python_command = Command::new(&uv_path);
    hide_command_window(&mut install_python_command);
    install_python_command.args(["python", "install", COMFYUI_PYTHON_VERSION]);

    run_streaming_command(
        app,
        install_python_command,
        "uv",
        "Installation de Python pour ComfyUI",
    )?;

    let mut create_venv_command = Command::new(uv_path);
    hide_command_window(&mut create_venv_command);
    create_venv_command
        .args(["venv", "--python", COMFYUI_PYTHON_VERSION])
        .arg(comfyui::comfyui_venv_dir(app)?);

    run_streaming_command(
        app,
        create_venv_command,
        "uv",
        "Création de l'environnement ComfyUI",
    )
}

pub(crate) fn ensure_comfyui_installed(app: &AppHandle) -> Result<(), String> {
    if comfyui::comfyui_installed(app) {
        return Ok(());
    }

    let runtime_dir = comfyui::comfyui_runtime_dir(app)?;
    fs::create_dir_all(&runtime_dir).map_err(|e| e.to_string())?;

    download_comfyui_source(app)?;

    let python_path = comfyui::comfyui_python_executable(app)?;

    if !python_path.exists() {
        remove_incomplete_comfyui_venv(app)?;
        create_comfyui_venv(app)?;
    }

    let requirements_path = comfyui::comfyui_requirements_path(app)?;

    if !requirements_path.exists() {
        return Err("Le fichier requirements.txt de ComfyUI est introuvable.".to_string());
    }

    let uv_path = ensure_uv(app)?;
    let mut install_command = Command::new(uv_path);
    hide_command_window(&mut install_command);
    install_command
        .args(["pip", "install", "--python"])
        .arg(&python_path)
        .args(["--upgrade", "-r"])
        .arg(requirements_path);

    emit_runtime_status(app, "Installation de ComfyUI...", 70);
    emit_runtime_log(
        app,
        "Installation des dépendances ComfyUI dans l'environnement local.",
    );

    run_streaming_command(
        app,
        install_command,
        "comfyui-install",
        "Installation de ComfyUI",
    )?;

    fs::write(comfyui::comfyui_install_marker(app)?, "installed").map_err(|e| e.to_string())?;

    emit_runtime_log(app, "ComfyUI est installé.");

    Ok(())
}

#[cfg(any(target_os = "macos", target_os = "linux"))]
fn ollama_install_command() -> Command {
    let mut command = Command::new("sh");
    command
        .arg("-c")
        .arg("curl -fsSL https://ollama.com/install.sh | sh");
    hide_command_window(&mut command);
    command
}

#[cfg(target_os = "windows")]
fn ollama_install_command() -> Command {
    let mut command = Command::new("powershell.exe");
    command.args([
        "-NoProfile",
        "-ExecutionPolicy",
        "Bypass",
        "-Command",
        "irm https://ollama.com/install.ps1 | iex",
    ]);
    hide_command_window(&mut command);
    command
}

pub fn install_ollama(app: AppHandle) -> Result<(), String> {
    if ollama::ollama_installed(&app) {
        emit_runtime_status(&app, "Ollama est déjà installé.", 100);
        emit_runtime_log(&app, "Ollama est déjà installé. Installation ignorée.");
        return Ok(());
    }

    emit_runtime_status(&app, "Préparation de l'installation Ollama...", 5);
    emit_runtime_log(
        &app,
        "Assistia lance le script officiel d'installation Ollama depuis ollama.com.",
    );

    ensure_curl(&app)?;

    let command = ollama_install_command();
    emit_runtime_status(&app, "Téléchargement et installation d'Ollama...", 35);

    run_streaming_command(&app, command, "ollama-install", "Installation Ollama")?;

    emit_runtime_status(&app, "Installation Ollama terminée.", 100);
    emit_runtime_log(&app, "Installation Ollama terminée.");

    Ok(())
}

pub fn install_open_webui(app: AppHandle) -> Result<(), String> {
    if openwebui::open_webui_installed(&app) {
        emit_runtime_status(&app, "Open WebUI est déjà installé.", 100);
        emit_runtime_log(&app, "Open WebUI est déjà installé. Installation ignorée.");
        return Ok(());
    }

    emit_runtime_status(&app, "Préparation de l'installation Open WebUI...", 45);
    emit_runtime_log(
        &app,
        "Assistia installe Open WebUI dans un environnement local.",
    );

    ensure_open_webui_installed(&app)?;

    emit_runtime_status(&app, "Installation Open WebUI terminée.", 100);
    emit_runtime_log(&app, "Installation Open WebUI terminée.");

    Ok(())
}

pub fn install_developer_agent(app: AppHandle) -> Result<(), String> {
    if dev_agent::developer_agent_installed(&app) {
        emit_runtime_status(&app, "Aider est déjà installé.", 100);
        emit_runtime_log(&app, "Aider est déjà installé. Installation ignorée.");
        return Ok(());
    }

    emit_runtime_status(&app, "Préparation de l'installation Aider...", 82);
    emit_runtime_log(&app, "Assistia installe Aider dans un environnement local.");

    dev_agent::ensure_developer_agent_installed(&app)?;

    emit_runtime_status(&app, "Installation Aider terminée.", 100);
    emit_runtime_log(&app, "Installation Aider terminée.");

    Ok(())
}

pub fn install_comfyui(app: AppHandle) -> Result<(), String> {
    if comfyui::comfyui_installed(&app) {
        emit_runtime_status(&app, "ComfyUI est déjà installé.", 100);
        emit_runtime_log(&app, "ComfyUI est déjà installé. Installation ignorée.");
        return Ok(());
    }

    emit_runtime_status(&app, "Préparation de l'installation ComfyUI...", 52);
    emit_runtime_log(
        &app,
        "Assistia installe ComfyUI dans un environnement local.",
    );

    ensure_comfyui_installed(&app)?;

    emit_runtime_status(&app, "Installation ComfyUI terminée.", 100);
    emit_runtime_log(&app, "Installation ComfyUI terminée.");

    Ok(())
}

pub fn install_searxng(app: AppHandle) -> Result<(), String> {
    if searxng::searxng_installed(&app) {
        if !searxng::searxng_ready() {
            searxng::start_searxng_process(&app)?;
        }

        enable_managed_web_search(&app)?;
        emit_runtime_status(&app, "SearXNG est déjà installé.", 100);
        emit_runtime_log(&app, "SearXNG est déjà installé. Installation ignorée.");
        return Ok(());
    }

    emit_runtime_status(&app, "Préparation de l'installation SearXNG...", 52);
    emit_runtime_log(
        &app,
        "Assistia installe SearXNG dans un environnement Python local.",
    );

    searxng::ensure_searxng_installed(&app)?;
    searxng::start_searxng_process(&app)?;
    enable_managed_web_search(&app)?;

    emit_runtime_status(&app, "Installation SearXNG terminée.", 100);
    emit_runtime_log(&app, "Installation SearXNG terminée.");

    Ok(())
}

fn enable_managed_web_search(app: &AppHandle) -> Result<(), String> {
    let mut settings = read_settings(app);

    settings.web_search.enabled = true;
    settings.web_search.searxng_url = DEFAULT_SEARXNG_URL.to_string();

    write_settings(app, &settings)
}

pub fn install_all(app: AppHandle) -> Result<(), String> {
    emit_runtime_status(&app, "Préparation de l'installation complète...", 5);
    emit_runtime_log(
        &app,
        "Vérification d'Ollama, de ComfyUI, d'Aider et de SearXNG avant installation.",
    );

    let ollama_installed = ollama::ollama_installed(&app);
    let comfyui_installed = comfyui::comfyui_installed(&app);
    let developer_agent_installed = dev_agent::developer_agent_installed(&app);
    let searxng_installed = searxng::searxng_installed(&app);

    if ollama_installed && comfyui_installed && developer_agent_installed && searxng_installed {
        emit_runtime_status(&app, "Tous les composants sont déjà installés.", 100);
        emit_runtime_log(
            &app,
            "Ollama, ComfyUI, Aider et SearXNG sont déjà installés.",
        );
        return Ok(());
    }

    if ollama_installed {
        emit_runtime_log(&app, "Ollama est déjà installé. Installation ignorée.");
    } else {
        install_ollama(app.clone())?;
    }

    if comfyui_installed {
        emit_runtime_log(&app, "ComfyUI est déjà installé. Installation ignorée.");
    } else {
        install_comfyui(app.clone())?;
    }

    if developer_agent_installed {
        emit_runtime_log(&app, "Aider est déjà installé. Installation ignorée.");
    } else {
        install_developer_agent(app.clone())?;
    }

    if searxng_installed {
        emit_runtime_log(&app, "SearXNG est déjà installé. Installation ignorée.");
    } else {
        install_searxng(app.clone())?;
    }

    emit_runtime_status(&app, "Installation complète terminée.", 100);
    emit_runtime_log(&app, "Installation complète terminée.");

    Ok(())
}
