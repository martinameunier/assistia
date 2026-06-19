use crate::common::{
    emit_runtime_log, emit_runtime_status, hide_command_window, run_streaming_command,
    OPEN_WEBUI_PYTHON_VERSION,
};
use crate::{ollama, openwebui, python};
use std::fs;
use std::path::PathBuf;
use std::process::Command;
use tauri::AppHandle;

fn ensure_uv(app: &AppHandle) -> Result<PathBuf, String> {
    if let Some(uv_path) = python::find_uv() {
        return Ok(uv_path);
    }

    emit_runtime_status(app, "Installation d'uv...", 58);
    emit_runtime_log(
        app,
        "Installation d'uv pour récupérer Python 3.11 si nécessaire.",
    );

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

pub fn install_all(app: AppHandle) -> Result<(), String> {
    emit_runtime_status(&app, "Préparation de l'installation complète...", 5);
    emit_runtime_log(
        &app,
        "Vérification d'Ollama et d'Open WebUI avant installation.",
    );

    let ollama_installed = ollama::ollama_installed(&app);
    let open_webui_installed = openwebui::open_webui_installed(&app);

    if ollama_installed && open_webui_installed {
        emit_runtime_status(&app, "Tous les composants sont déjà installés.", 100);
        emit_runtime_log(&app, "Ollama et Open WebUI sont déjà installés.");
        return Ok(());
    }

    if ollama_installed {
        emit_runtime_log(&app, "Ollama est déjà installé. Installation ignorée.");
    } else {
        install_ollama(app.clone())?;
    }

    if open_webui_installed {
        emit_runtime_log(&app, "Open WebUI est déjà installé. Installation ignorée.");
    } else {
        install_open_webui(app.clone())?;
    }

    emit_runtime_status(&app, "Installation complète terminée.", 100);
    emit_runtime_log(&app, "Installation complète terminée.");

    Ok(())
}
