use crate::common::{
    emit_runtime_log, emit_runtime_status, ensure_curl, hide_command_window,
    kill_matching_processes, kill_process_tree, run_streaming_command, stream_command_output,
    tcp_service_ready, wait_until_tcp_service_stops, DEFAULT_SEARXNG_URL,
    OPEN_WEBUI_PYTHON_VERSION, SEARXNG_ADDR,
};
use crate::{installation, python};
use std::fs;
use std::path::{Path, PathBuf};
use std::process::{Child, Command, Stdio};
use std::sync::{Mutex, OnceLock};
use std::thread;
use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};
use tauri::{AppHandle, Manager};

static SEARXNG_PROCESS: OnceLock<Mutex<Option<Child>>> = OnceLock::new();

const SEARXNG_ARCHIVE_URL: &str =
    "https://github.com/searxng/searxng/archive/refs/heads/master.tar.gz";
const SEARXNG_ARCHIVE_DIR: &str = "searxng-master";

fn searxng_process() -> &'static Mutex<Option<Child>> {
    SEARXNG_PROCESS.get_or_init(|| Mutex::new(None))
}

pub(crate) fn searxng_runtime_dir(app: &AppHandle) -> Result<PathBuf, String> {
    app.path()
        .app_data_dir()
        .map(|path| path.join("searxng"))
        .map_err(|e| e.to_string())
}

pub(crate) fn searxng_source_dir(app: &AppHandle) -> Result<PathBuf, String> {
    Ok(searxng_runtime_dir(app)?.join("searxng-src"))
}

pub(crate) fn searxng_venv_dir(app: &AppHandle) -> Result<PathBuf, String> {
    Ok(searxng_runtime_dir(app)?.join("venv"))
}

fn searxng_config_dir(app: &AppHandle) -> Result<PathBuf, String> {
    Ok(searxng_runtime_dir(app)?.join("config"))
}

#[cfg(target_os = "windows")]
fn searxng_venv_bin_dir(venv_dir: PathBuf) -> PathBuf {
    venv_dir.join("Scripts")
}

#[cfg(not(target_os = "windows"))]
fn searxng_venv_bin_dir(venv_dir: PathBuf) -> PathBuf {
    venv_dir.join("bin")
}

#[cfg(target_os = "windows")]
pub(crate) fn searxng_python_executable(app: &AppHandle) -> Result<PathBuf, String> {
    Ok(searxng_venv_bin_dir(searxng_venv_dir(app)?).join("python.exe"))
}

#[cfg(not(target_os = "windows"))]
pub(crate) fn searxng_python_executable(app: &AppHandle) -> Result<PathBuf, String> {
    Ok(searxng_venv_bin_dir(searxng_venv_dir(app)?).join("python"))
}

fn searxng_settings_path(app: &AppHandle) -> Result<PathBuf, String> {
    Ok(searxng_config_dir(app)?.join("settings.yml"))
}

fn searxng_install_marker(app: &AppHandle) -> Result<PathBuf, String> {
    Ok(searxng_runtime_dir(app)?.join(".assistia-searxng-installed"))
}

fn searxng_package_path(app: &AppHandle) -> Result<PathBuf, String> {
    Ok(searxng_source_dir(app)?.join("searx"))
}

pub(crate) fn searxng_ready() -> bool {
    tcp_service_ready(SEARXNG_ADDR)
}

pub(crate) fn searxng_installed(app: &AppHandle) -> bool {
    searxng_package_path(app).is_ok_and(|path| path.exists())
        && searxng_python_executable(app).is_ok_and(|path| path.exists())
        && searxng_install_marker(app).is_ok_and(|path| path.exists())
}

pub(crate) fn get_searxng_status(app: AppHandle) -> crate::common::ServiceStatus {
    if searxng_ready() {
        return crate::common::ServiceStatus {
            name: "searxng".to_string(),
            status: format!("UP - {DEFAULT_SEARXNG_URL}"),
        };
    }

    crate::common::ServiceStatus {
        name: "searxng".to_string(),
        status: if searxng_installed(&app) {
            "installed".to_string()
        } else {
            "not installed".to_string()
        },
    }
}

#[cfg(target_os = "windows")]
fn powershell_quote(value: &str) -> String {
    format!("'{}'", value.replace('\'', "''"))
}

#[cfg(target_os = "windows")]
fn searxng_download_command(archive_path: &Path) -> Command {
    let mut command = Command::new("powershell.exe");
    let archive_path = powershell_quote(&archive_path.to_string_lossy());
    let script = format!(
        "$ProgressPreference = 'SilentlyContinue'; Invoke-WebRequest -Uri '{}' -OutFile {}",
        SEARXNG_ARCHIVE_URL, archive_path
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
fn searxng_download_command(archive_path: &Path) -> Command {
    let mut command = Command::new("curl");
    command
        .args(["-fSL", SEARXNG_ARCHIVE_URL, "-o"])
        .arg(archive_path);
    hide_command_window(&mut command);
    command
}

fn searxng_extract_command(archive_path: &Path, runtime_dir: &Path) -> Command {
    let mut command = Command::new("tar");
    command
        .arg("-xzf")
        .arg(archive_path)
        .arg("-C")
        .arg(runtime_dir);
    hide_command_window(&mut command);
    command
}

fn extracted_searxng_source_dir(runtime_dir: &Path) -> Result<PathBuf, String> {
    let expected_dir = runtime_dir.join(SEARXNG_ARCHIVE_DIR);

    if expected_dir.join("searx").exists() {
        return Ok(expected_dir);
    }

    for entry in fs::read_dir(runtime_dir).map_err(|e| e.to_string())? {
        let path = entry.map_err(|e| e.to_string())?.path();
        let is_searxng_archive_dir = path
            .file_name()
            .and_then(|name| name.to_str())
            .is_some_and(|name| name.starts_with("searxng-"));

        if is_searxng_archive_dir && path.join("searx").exists() {
            return Ok(path);
        }
    }

    Err("Le dossier extrait de SearXNG est introuvable après téléchargement.".to_string())
}

fn remove_incomplete_searxng_venv(app: &AppHandle) -> Result<(), String> {
    let venv_dir = searxng_venv_dir(app)?;

    if venv_dir.exists() {
        fs::remove_dir_all(venv_dir).map_err(|e| e.to_string())?;
    }

    Ok(())
}

fn prepare_searxng_directories(app: &AppHandle) -> Result<(), String> {
    fs::create_dir_all(searxng_runtime_dir(app)?).map_err(|e| e.to_string())?;
    fs::create_dir_all(searxng_config_dir(app)?).map_err(|e| e.to_string())
}

fn generated_secret_key() -> String {
    let timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_nanos())
        .unwrap_or_default();

    format!("assistia-{timestamp}-{}", std::process::id())
}

fn write_managed_settings(app: &AppHandle) -> Result<(), String> {
    prepare_searxng_directories(app)?;

    let settings = format!(
        r#"use_default_settings: true

general:
  debug: false
  instance_name: "Assistia SearXNG"

search:
  safe_search: 0
  autocomplete: ""
  formats:
    - html
    - json

server:
  secret_key: "{secret_key}"
  bind_address: "127.0.0.1"
  port: 8888
  base_url: "{base_url}/"
  limiter: false
  public_instance: false
  image_proxy: false
  method: "GET"

valkey:
  url: false
"#,
        secret_key = generated_secret_key(),
        base_url = DEFAULT_SEARXNG_URL
    );

    fs::write(searxng_settings_path(app)?, settings).map_err(|e| e.to_string())
}

fn download_searxng_source(app: &AppHandle) -> Result<(), String> {
    if searxng_package_path(app)?.exists() {
        return Ok(());
    }

    let runtime_dir = searxng_runtime_dir(app)?;
    let source_dir = searxng_source_dir(app)?;
    let archive_path = runtime_dir.join("searxng.tar.gz");
    let extracted_dir = runtime_dir.join(SEARXNG_ARCHIVE_DIR);

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

    emit_runtime_status(app, "Téléchargement de SearXNG...", 56);
    emit_runtime_log(app, "Téléchargement de l'archive officielle SearXNG.");

    ensure_curl(app)?;

    run_streaming_command(
        app,
        searxng_download_command(&archive_path),
        "searxng-install",
        "Téléchargement de SearXNG",
    )?;

    emit_runtime_status(app, "Extraction de SearXNG...", 58);
    emit_runtime_log(app, "Extraction de l'archive SearXNG.");

    run_streaming_command(
        app,
        searxng_extract_command(&archive_path, &runtime_dir),
        "searxng-install",
        "Extraction de SearXNG",
    )?;

    let extracted_source_dir = extracted_searxng_source_dir(&runtime_dir)?;
    fs::rename(extracted_source_dir, &source_dir).map_err(|e| e.to_string())?;
    let _ = fs::remove_file(archive_path);

    if !searxng_package_path(app)?.exists() {
        return Err(
            "Le module Python de SearXNG est introuvable après téléchargement.".to_string(),
        );
    }

    Ok(())
}

fn create_searxng_venv(app: &AppHandle) -> Result<(), String> {
    if let Some(python) = python::find_python_311() {
        emit_runtime_log(app, "Python 3.11 détecté sur le système.");

        let mut create_venv_command = python.command();
        create_venv_command
            .arg("-m")
            .arg("venv")
            .arg(searxng_venv_dir(app)?);

        return run_streaming_command(
            app,
            create_venv_command,
            "searxng-install",
            "Création de l'environnement SearXNG",
        );
    }

    emit_runtime_status(app, "Installation de Python 3.11 pour SearXNG...", 62);
    emit_runtime_log(app, "Python 3.11 absent. Installation via uv.");

    let uv_path = installation::ensure_uv(app)?;

    let mut install_python_command = Command::new(&uv_path);
    hide_command_window(&mut install_python_command);
    install_python_command.args(["python", "install", OPEN_WEBUI_PYTHON_VERSION]);

    run_streaming_command(
        app,
        install_python_command,
        "uv",
        "Installation de Python 3.11",
    )?;

    let mut create_venv_command = Command::new(&uv_path);
    hide_command_window(&mut create_venv_command);
    create_venv_command
        .args(["venv", "--python", OPEN_WEBUI_PYTHON_VERSION])
        .arg(searxng_venv_dir(app)?);

    run_streaming_command(
        app,
        create_venv_command,
        "uv",
        "Création de l'environnement SearXNG",
    )
}

fn install_searxng_dependencies(app: &AppHandle) -> Result<(), String> {
    let uv_path = installation::ensure_uv(app)?;
    let python_path = searxng_python_executable(app)?;
    let source_dir = searxng_source_dir(app)?;

    let mut bootstrap_command = Command::new(&uv_path);
    hide_command_window(&mut bootstrap_command);
    bootstrap_command
        .args(["pip", "install", "--python"])
        .arg(&python_path)
        .args([
            "--upgrade",
            "pip",
            "setuptools",
            "wheel",
            "pyyaml",
            "msgspec",
            "typing-extensions",
            "pybind11",
        ]);

    emit_runtime_status(app, "Installation des dépendances SearXNG...", 66);
    emit_runtime_log(
        app,
        "Préparation des dépendances Python requises par SearXNG.",
    );

    run_streaming_command(
        app,
        bootstrap_command,
        "searxng-install",
        "Préparation des dépendances SearXNG",
    )?;

    let mut install_command = Command::new(uv_path);
    hide_command_window(&mut install_command);
    install_command
        .args(["pip", "install", "--python"])
        .arg(&python_path)
        .args(["--upgrade", "--no-build-isolation", "-e"])
        .arg(&source_dir);

    emit_runtime_status(app, "Installation de SearXNG...", 72);
    emit_runtime_log(
        app,
        "Installation de SearXNG dans l'environnement local avec uv.",
    );

    run_streaming_command(
        app,
        install_command,
        "searxng-install",
        "Installation de SearXNG",
    )
}

pub(crate) fn ensure_searxng_installed(app: &AppHandle) -> Result<(), String> {
    prepare_searxng_directories(app)?;
    write_managed_settings(app)?;

    if searxng_installed(app) {
        return Ok(());
    }

    emit_runtime_log(
        app,
        "Préparation d'un environnement Python local pour SearXNG.",
    );

    download_searxng_source(app)?;

    if !searxng_python_executable(app)?.exists() {
        remove_incomplete_searxng_venv(app)?;
        create_searxng_venv(app)?;
    }

    install_searxng_dependencies(app)?;

    fs::write(searxng_install_marker(app)?, "installed").map_err(|e| e.to_string())?;

    emit_runtime_log(app, "SearXNG est installé.");

    Ok(())
}

fn process_matches_searxng(
    process: &sysinfo::Process,
    runtime_dir: &Path,
    source_dir: &Path,
    settings_path: &Path,
) -> bool {
    let name = process.name().to_ascii_lowercase();
    let exe = process
        .exe()
        .map(|path| path.to_string_lossy().to_ascii_lowercase())
        .unwrap_or_default();
    let command = process.cmd().join(" ").to_ascii_lowercase();
    let settings_path = settings_path.to_string_lossy().to_ascii_lowercase();
    let cwd_is_managed = process.cwd().is_some_and(|cwd| {
        cwd == runtime_dir
            || cwd.starts_with(runtime_dir)
            || cwd == source_dir
            || cwd.starts_with(source_dir)
    });
    let has_assistia_env = process.environ().iter().any(|value| {
        value
            .to_ascii_lowercase()
            .contains(&format!("searxng_settings_path={settings_path}"))
    });
    let command_is_searxng = command.contains("searx.webapp") || command.contains("searxng");

    cwd_is_managed
        || has_assistia_env
        || command_is_searxng
        || name == "searxng"
        || exe.ends_with("/searxng")
        || exe.ends_with("\\searxng.exe")
}

fn stop_remaining_searxng_processes(app: &AppHandle) -> Result<usize, String> {
    let runtime_dir = searxng_runtime_dir(app)?;
    let source_dir = searxng_source_dir(app)?;
    let settings_path = searxng_settings_path(app)?;

    Ok(kill_matching_processes(|process| {
        process_matches_searxng(process, &runtime_dir, &source_dir, &settings_path)
    }))
}

fn wait_for_searxng(app: &AppHandle) -> Result<(), String> {
    let timeout = Duration::from_secs(90);
    let started_at = Instant::now();

    while started_at.elapsed() < timeout {
        if searxng_ready() {
            emit_runtime_log(app, "SearXNG est prêt.");
            emit_runtime_status(app, "SearXNG est prêt.", 95);
            return Ok(());
        }

        let elapsed = started_at.elapsed().as_secs();
        let progress = 82 + ((elapsed.min(timeout.as_secs()) * 12) / timeout.as_secs()) as u8;

        emit_runtime_status(app, "Attente du démarrage de SearXNG...", progress);
        thread::sleep(Duration::from_secs(2));
    }

    Err("SearXNG ne répond pas après 90 secondes.".to_string())
}

pub(crate) fn start_searxng_process(app: &AppHandle) -> Result<(), String> {
    if searxng_ready() {
        emit_runtime_log(app, "SearXNG est déjà en cours d'exécution.");
        emit_runtime_status(app, "SearXNG est prêt.", 95);
        return Ok(());
    }

    ensure_searxng_installed(app)?;

    let mut process = searxng_process().lock().map_err(|e| e.to_string())?;

    if let Some(child) = process.as_mut() {
        if child.try_wait().map_err(|e| e.to_string())?.is_none() {
            return Ok(());
        }
    }

    *process = None;

    let source_dir = searxng_source_dir(app)?;
    let python_path = searxng_python_executable(app)?;
    let settings_path = searxng_settings_path(app)?;

    if !searxng_package_path(app)?.exists() || !python_path.exists() {
        return Err("SearXNG n'est pas installé dans l'environnement Assistia.".to_string());
    }

    let mut command = Command::new(python_path);
    hide_command_window(&mut command);
    command
        .args(["-m", "searx.webapp"])
        .current_dir(source_dir)
        .env("SEARXNG_SETTINGS_PATH", settings_path)
        .env("SEARXNG_BIND_ADDRESS", "127.0.0.1")
        .env("SEARXNG_PORT", "8888")
        .env("SEARXNG_BASE_URL", format!("{DEFAULT_SEARXNG_URL}/"))
        .env("SEARXNG_LIMITER", "false")
        .env("SEARXNG_PUBLIC_INSTANCE", "false")
        .env("SEARXNG_IMAGE_PROXY", "false")
        .env("SEARXNG_METHOD", "GET")
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());

    emit_runtime_status(app, "Démarrage de SearXNG...", 82);
    emit_runtime_log(app, "Démarrage du serveur local SearXNG.");

    let mut child = command.spawn().map_err(|e| e.to_string())?;

    if let Some(stdout) = child.stdout.take() {
        stream_command_output(app.clone(), stdout, "searxng");
    }

    if let Some(stderr) = child.stderr.take() {
        stream_command_output(app.clone(), stderr, "searxng");
    }

    *process = Some(child);
    drop(process);

    wait_for_searxng(app)
}

pub(crate) fn stop_searxng_runtime(app: &AppHandle) -> Result<String, String> {
    emit_runtime_status(app, "Arrêt de SearXNG...", 15);

    let had_tracked_process = {
        let mut process = searxng_process().lock().map_err(|e| e.to_string())?;

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
            "Aucun processus SearXNG lancé par Assistia n'est actif.",
        );
    }

    if !wait_until_tcp_service_stops(SEARXNG_ADDR, Duration::from_secs(5)) {
        let killed_processes = stop_remaining_searxng_processes(app)?;

        if killed_processes > 0 {
            emit_runtime_log(
                app,
                format!("{killed_processes} processus SearXNG restant(s) arrêté(s)."),
            );
        }

        wait_until_tcp_service_stops(SEARXNG_ADDR, Duration::from_secs(5));
    }

    if searxng_ready() {
        emit_runtime_status(app, "SearXNG est lancé hors d'Assistia.", 35);
        return Ok("SearXNG est lancé hors d'Assistia.".to_string());
    }

    emit_runtime_log(app, "SearXNG arrêté.");
    emit_runtime_status(app, "SearXNG arrêté.", 35);

    Ok("SearXNG arrêté.".to_string())
}
