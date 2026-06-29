use crate::common::{
    command_output_with_timeout, emit_runtime_log, emit_runtime_status, ensure_curl,
    hide_command_window, kill_matching_processes, kill_process_tree, read_settings,
    run_streaming_command, stream_command_output, tcp_service_ready, wait_until_tcp_service_stops,
    write_settings, ImageGeneratorSettings, LauncherSettings, COMFYUI_ADDR, COMFYUI_URL,
};
use base64::{engine::general_purpose, Engine as _};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::fs;
use std::io::{Read, Write};
use std::path::{Component, Path, PathBuf};
use std::process::{Child, Command, Stdio};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Mutex, OnceLock};
use std::thread;
use std::time::{Duration, Instant};
use tauri::{AppHandle, Manager};

static COMFYUI_PROCESS: OnceLock<Mutex<Option<Child>>> = OnceLock::new();
static COMFYUI_GENERATION_CANCELLED: AtomicBool = AtomicBool::new(false);

fn comfyui_process() -> &'static Mutex<Option<Child>> {
    COMFYUI_PROCESS.get_or_init(|| Mutex::new(None))
}

#[derive(Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct ComfyUIModelDownload {
    url: String,
    destination_directory: String,
    file_name: Option<String>,
}

#[derive(Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct ComfyUIConfiguredModel {
    name: String,
    downloads: Vec<ComfyUIModelDownload>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct ComfyUIModelAvailability {
    name: String,
    is_downloaded: bool,
}

#[derive(Clone, Deserialize, Serialize)]
pub(crate) struct ComfyUIImageReference {
    filename: String,
    #[serde(default)]
    subfolder: String,
    #[serde(rename = "type")]
    image_type: String,
}

#[derive(Serialize)]
pub(crate) struct ComfyUIGeneratedImage {
    filename: String,
    subfolder: String,
    #[serde(rename = "type")]
    image_type: String,
    data_url: String,
}

#[derive(Serialize)]
pub(crate) struct ComfyUIImageGenerationResponse {
    prompt_id: String,
    number: Option<f64>,
    image: ComfyUIGeneratedImage,
}

#[tauri::command]
pub fn get_image_generator_settings(app: AppHandle) -> Result<ImageGeneratorSettings, String> {
    Ok(read_settings(&app).image_generator)
}

#[tauri::command]
pub fn set_image_generator_settings(
    app: AppHandle,
    settings: ImageGeneratorSettings,
) -> Result<(), String> {
    let mut launcher_settings: LauncherSettings = read_settings(&app);
    let use_local_comfyui_url = settings.use_local_comfyui_url;
    let comfyui_url = if use_local_comfyui_url {
        COMFYUI_URL.to_string()
    } else {
        normalize_comfyui_url(&settings.comfyui_url)?
    };

    launcher_settings.image_generator = ImageGeneratorSettings {
        use_local_comfyui_url,
        comfyui_url,
    };

    write_settings(&app, &launcher_settings)
}

pub(crate) fn comfyui_runtime_dir(app: &AppHandle) -> Result<PathBuf, String> {
    app.path()
        .app_data_dir()
        .map(|path| path.join("comfyui"))
        .map_err(|e| e.to_string())
}

pub(crate) fn comfyui_source_dir(app: &AppHandle) -> Result<PathBuf, String> {
    Ok(comfyui_runtime_dir(app)?.join("ComfyUI"))
}

pub(crate) fn comfyui_venv_dir(app: &AppHandle) -> Result<PathBuf, String> {
    Ok(comfyui_runtime_dir(app)?.join("venv"))
}

#[cfg(target_os = "windows")]
fn comfyui_venv_bin_dir(venv_dir: PathBuf) -> PathBuf {
    venv_dir.join("Scripts")
}

#[cfg(not(target_os = "windows"))]
fn comfyui_venv_bin_dir(venv_dir: PathBuf) -> PathBuf {
    venv_dir.join("bin")
}

#[cfg(target_os = "windows")]
pub(crate) fn comfyui_python_executable(app: &AppHandle) -> Result<PathBuf, String> {
    Ok(comfyui_venv_bin_dir(comfyui_venv_dir(app)?).join("python.exe"))
}

#[cfg(not(target_os = "windows"))]
pub(crate) fn comfyui_python_executable(app: &AppHandle) -> Result<PathBuf, String> {
    Ok(comfyui_venv_bin_dir(comfyui_venv_dir(app)?).join("python"))
}

pub(crate) fn comfyui_requirements_path(app: &AppHandle) -> Result<PathBuf, String> {
    Ok(comfyui_source_dir(app)?.join("requirements.txt"))
}

pub(crate) fn comfyui_main_path(app: &AppHandle) -> Result<PathBuf, String> {
    Ok(comfyui_source_dir(app)?.join("main.py"))
}

pub(crate) fn comfyui_install_marker(app: &AppHandle) -> Result<PathBuf, String> {
    Ok(comfyui_runtime_dir(app)?.join(".assistia-comfyui-installed"))
}

pub(crate) fn comfyui_ready() -> bool {
    tcp_service_ready(COMFYUI_ADDR)
}

fn normalize_comfyui_url(url: &str) -> Result<String, String> {
    let url = url.trim().trim_end_matches('/').to_string();

    if url.is_empty() {
        return Err("L'URL ComfyUI est obligatoire.".to_string());
    }

    if !(url.starts_with("http://") || url.starts_with("https://")) {
        return Err("L'URL ComfyUI doit commencer par http:// ou https://.".to_string());
    }

    Ok(url)
}

pub(crate) fn comfyui_installed(app: &AppHandle) -> bool {
    comfyui_main_path(app).is_ok_and(|path| path.exists())
        && comfyui_python_executable(app).is_ok_and(|path| path.exists())
        && comfyui_install_marker(app).is_ok_and(|path| path.exists())
}

pub(crate) fn get_comfyui_status(app: AppHandle) -> crate::common::ServiceStatus {
    if comfyui_ready() {
        return crate::common::ServiceStatus {
            name: "comfyui".to_string(),
            status: format!("UP - {COMFYUI_URL}"),
        };
    }

    crate::common::ServiceStatus {
        name: "comfyui".to_string(),
        status: if comfyui_installed(&app) {
            "installed".to_string()
        } else {
            "not installed".to_string()
        },
    }
}

fn safe_relative_path(value: &str, label: &str) -> Result<PathBuf, String> {
    let value = value.trim();

    if value.is_empty() {
        return Err(format!("{label} est vide."));
    }

    let path = Path::new(value);

    if path.is_absolute() {
        return Err(format!("{label} doit être un chemin relatif."));
    }

    let mut safe_path = PathBuf::new();

    for component in path.components() {
        match component {
            Component::Normal(part) => safe_path.push(part),
            _ => {
                return Err(format!(
                    "{label} ne doit pas contenir de remontée de dossier."
                ));
            }
        }
    }

    Ok(safe_path)
}

fn safe_file_name(value: &str) -> Result<String, String> {
    let file_path = safe_relative_path(value, "Le nom du fichier")?;

    if file_path.components().count() != 1 {
        return Err("Le nom du fichier ne doit pas contenir de dossier.".to_string());
    }

    Ok(file_path.to_string_lossy().to_string())
}

fn file_name_from_url(url: &str) -> Result<String, String> {
    let without_query = url
        .split('?')
        .next()
        .unwrap_or(url)
        .split('#')
        .next()
        .unwrap_or(url);

    let file_name = without_query
        .rsplit('/')
        .find(|segment| !segment.trim().is_empty())
        .ok_or_else(|| "Impossible de déduire le nom du fichier depuis l'URL.".to_string())?;

    safe_file_name(file_name)
}

fn model_file_path(models_dir: &Path, download: &ComfyUIModelDownload) -> Result<PathBuf, String> {
    let url = download_url(&download.url)?;
    let destination_directory =
        safe_relative_path(&download.destination_directory, "Le répertoire modèle")?;
    let file_name = match &download.file_name {
        Some(file_name) => safe_file_name(file_name)?,
        None => file_name_from_url(url)?,
    };

    Ok(models_dir.join(destination_directory).join(file_name))
}

fn download_url(url: &str) -> Result<&str, String> {
    let url = url.trim();

    if url.is_empty() {
        return Err("L'URL du fichier modèle est vide.".to_string());
    }

    if !(url.starts_with("http://") || url.starts_with("https://")) {
        return Err("L'URL du fichier modèle doit commencer par http:// ou https://.".to_string());
    }

    Ok(url)
}

fn validate_safetensors_file(path: &Path) -> Result<(), String> {
    let file_size = fs::metadata(path).map_err(|e| e.to_string())?.len();

    if file_size < 16 {
        return Err("Le fichier Safetensors est trop petit.".to_string());
    }

    let mut file = fs::File::open(path).map_err(|e| e.to_string())?;
    let mut header_size_bytes = [0u8; 8];
    file.read_exact(&mut header_size_bytes)
        .map_err(|e| e.to_string())?;

    let header_size = u64::from_le_bytes(header_size_bytes);

    if header_size == 0 || file_size < 8 + header_size {
        return Err("Le fichier Safetensors a un en-tête invalide.".to_string());
    }

    let mut header = vec![0u8; header_size as usize];
    file.read_exact(&mut header).map_err(|e| e.to_string())?;
    serde_json::from_slice::<Value>(&header)
        .map(|_| ())
        .map_err(|_| "Le fichier téléchargé n'est pas un Safetensors valide.".to_string())
}

fn validate_model_file(path: &Path) -> Result<(), String> {
    if path
        .extension()
        .is_some_and(|extension| extension.eq_ignore_ascii_case("safetensors"))
    {
        return validate_safetensors_file(path);
    }

    Ok(())
}

fn prompt_id_path(prompt_id: &str) -> Result<String, String> {
    if prompt_id.is_empty()
        || !prompt_id
            .chars()
            .all(|character| character.is_ascii_alphanumeric() || matches!(character, '-' | '_'))
    {
        return Err("Identifiant ComfyUI invalide.".to_string());
    }

    Ok(format!("/history/{prompt_id}"))
}

#[cfg(target_os = "windows")]
fn model_download_command(url: &str, destination: &Path) -> Command {
    let mut command = Command::new("powershell.exe");
    let script =
        "$ProgressPreference = 'SilentlyContinue'; Invoke-WebRequest -Uri $args[0] -OutFile $args[1]";

    command
        .args([
            "-NoProfile",
            "-ExecutionPolicy",
            "Bypass",
            "-Command",
            script,
            url,
        ])
        .arg(destination);

    hide_command_window(&mut command);
    command
}

#[cfg(not(target_os = "windows"))]
fn model_download_command(url: &str, destination: &Path) -> Command {
    let mut command = Command::new("curl");
    command
        .args(["-fL", "--progress-bar", "-o"])
        .arg(destination)
        .arg(url);

    hide_command_window(&mut command);
    command
}

pub(crate) fn get_model_availability(
    app: &AppHandle,
    models: Vec<ComfyUIConfiguredModel>,
) -> Result<Vec<ComfyUIModelAvailability>, String> {
    let models_dir = comfyui_source_dir(app)?.join("models");

    Ok(models
        .into_iter()
        .map(|model| {
            let is_downloaded = !model.downloads.is_empty()
                && model.downloads.iter().all(|download| {
                    model_file_path(&models_dir, download)
                        .is_ok_and(|path| path.exists() && validate_model_file(&path).is_ok())
                });

            ComfyUIModelAvailability {
                name: model.name,
                is_downloaded,
            }
        })
        .collect())
}

pub(crate) fn delete_model_files(
    app: &AppHandle,
    downloads: Vec<ComfyUIModelDownload>,
) -> Result<(), String> {
    if !comfyui_installed(app) {
        return Err("ComfyUI n'est pas installé dans l'environnement Assistia.".to_string());
    }

    if downloads.is_empty() {
        emit_runtime_log(app, "Aucun fichier modèle ComfyUI à supprimer.");
        emit_runtime_status(app, "Fichiers du modèle ComfyUI supprimés.", 100);
        return Ok(());
    }

    let models_dir = comfyui_source_dir(app)?.join("models");
    emit_runtime_status(app, "Suppression des fichiers du modèle ComfyUI...", 20);

    for download in &downloads {
        let destination = model_file_path(&models_dir, download)?;
        let Some(file_name) = destination
            .file_name()
            .map(|file_name| file_name.to_string_lossy().to_string())
        else {
            continue;
        };

        if !destination.exists() {
            emit_runtime_log(app, format!("{file_name} est déjà absent."));
            continue;
        }

        fs::remove_file(&destination).map_err(|e| e.to_string())?;
        emit_runtime_log(app, format!("Suppression de {file_name}."));
    }

    emit_runtime_log(app, "Fichiers du modèle ComfyUI supprimés.");
    emit_runtime_status(app, "Fichiers du modèle ComfyUI supprimés.", 100);

    Ok(())
}

pub(crate) fn download_model_files(
    app: &AppHandle,
    downloads: Vec<ComfyUIModelDownload>,
) -> Result<(), String> {
    if !comfyui_installed(app) {
        return Err("ComfyUI n'est pas installé dans l'environnement Assistia.".to_string());
    }

    if downloads.is_empty() {
        emit_runtime_log(app, "Aucun fichier modèle ComfyUI à télécharger.");
        emit_runtime_status(app, "Fichiers du modèle ComfyUI prêts.", 100);
        return Ok(());
    }

    let models_dir = comfyui_source_dir(app)?.join("models");
    emit_runtime_status(app, "Téléchargement des fichiers du modèle ComfyUI...", 12);

    ensure_curl(app)?;

    for (index, download) in downloads.iter().enumerate() {
        let url = download_url(&download.url)?;
        let destination_directory =
            safe_relative_path(&download.destination_directory, "Le répertoire modèle")?;
        let file_name = match &download.file_name {
            Some(file_name) => safe_file_name(file_name)?,
            None => file_name_from_url(url)?,
        };

        let target_dir = models_dir.join(&destination_directory);
        let destination = target_dir.join(&file_name);

        fs::create_dir_all(&target_dir).map_err(|e| e.to_string())?;

        if destination.exists() {
            match validate_model_file(&destination) {
                Ok(()) => {
                    emit_runtime_log(
                        app,
                        format!(
                            "{file_name} est déjà présent dans models/{}.",
                            destination_directory.to_string_lossy()
                        ),
                    );
                    continue;
                }
                Err(error) => {
                    emit_runtime_log(
                        app,
                        format!("{file_name} est invalide ({error}). Nouveau téléchargement."),
                    );
                }
            }
        }

        let partial_destination = target_dir.join(format!("{file_name}.assistia-download"));
        let progress = 20 + (((index + 1) * 70) / downloads.len()) as u8;

        emit_runtime_status(
            app,
            "Téléchargement des fichiers du modèle ComfyUI...",
            progress,
        );
        emit_runtime_log(
            app,
            format!(
                "Téléchargement de {file_name} vers models/{}.",
                destination_directory.to_string_lossy()
            ),
        );

        run_streaming_command(
            app,
            model_download_command(url, &partial_destination),
            "comfyui-models",
            &format!("Téléchargement de {file_name}"),
        )?;

        validate_model_file(&partial_destination)?;
        if destination.exists() {
            fs::remove_file(&destination).map_err(|e| e.to_string())?;
        }
        fs::rename(&partial_destination, &destination).map_err(|e| e.to_string())?;
    }

    emit_runtime_log(app, "Fichiers du modèle ComfyUI prêts.");
    emit_runtime_status(app, "Fichiers du modèle ComfyUI prêts.", 100);

    Ok(())
}

fn decode_chunked_body(body: &[u8]) -> Result<Vec<u8>, String> {
    let mut decoded = Vec::new();
    let mut index = 0;

    loop {
        let Some(line_end) = body[index..]
            .windows(2)
            .position(|window| window == b"\r\n")
            .map(|position| index + position)
        else {
            return Err("Réponse HTTP ComfyUI fragmentée invalide.".to_string());
        };

        let size_line = String::from_utf8_lossy(&body[index..line_end]);
        let size = usize::from_str_radix(size_line.split(';').next().unwrap_or("").trim(), 16)
            .map_err(|e| e.to_string())?;

        index = line_end + 2;

        if size == 0 {
            break;
        }

        if body.len() < index + size + 2 {
            return Err("Réponse HTTP ComfyUI tronquée.".to_string());
        }

        decoded.extend_from_slice(&body[index..index + size]);
        index += size + 2;
    }

    Ok(decoded)
}

fn decode_http_body(headers: &str, body: &[u8]) -> Result<Vec<u8>, String> {
    if headers
        .to_ascii_lowercase()
        .contains("transfer-encoding: chunked")
    {
        return decode_chunked_body(body);
    }

    Ok(body.to_vec())
}

fn request_comfyui_json(method: &str, path: &str, payload: Option<Value>) -> Result<Value, String> {
    let body = payload
        .map(|payload| serde_json::to_string(&payload))
        .transpose()
        .map_err(|e| e.to_string())?;
    let mut stream = std::net::TcpStream::connect(COMFYUI_ADDR).map_err(|e| e.to_string())?;

    stream
        .set_read_timeout(Some(Duration::from_secs(120)))
        .map_err(|e| e.to_string())?;
    stream
        .set_write_timeout(Some(Duration::from_secs(30)))
        .map_err(|e| e.to_string())?;

    let request_head = match &body {
        Some(body) => format!(
            "{method} {path} HTTP/1.1\r\nHost: {COMFYUI_ADDR}\r\nContent-Type: application/json\r\nContent-Length: {}\r\nConnection: close\r\n\r\n",
            body.len()
        ),
        None => format!(
            "{method} {path} HTTP/1.1\r\nHost: {COMFYUI_ADDR}\r\nConnection: close\r\n\r\n"
        ),
    };

    stream
        .write_all(request_head.as_bytes())
        .map_err(|e| e.to_string())?;

    if let Some(body) = body {
        stream
            .write_all(body.as_bytes())
            .map_err(|e| e.to_string())?;
    }

    let mut response = Vec::new();
    stream
        .read_to_end(&mut response)
        .map_err(|e| e.to_string())?;

    let header_end = response
        .windows(4)
        .position(|window| window == b"\r\n\r\n")
        .ok_or_else(|| "Réponse HTTP ComfyUI invalide.".to_string())?;
    let headers = String::from_utf8_lossy(&response[..header_end]);
    let body = decode_http_body(&headers, &response[header_end + 4..])?;
    let status_line = headers.lines().next().unwrap_or("HTTP/1.1 000");

    if !status_line.contains(" 200 ") {
        return Err(format!(
            "ComfyUI a répondu {status_line}: {}",
            String::from_utf8_lossy(&body).trim()
        ));
    }

    serde_json::from_slice(&body).map_err(|e| e.to_string())
}

fn post_comfyui_json(path: &str, payload: Value) -> Result<Value, String> {
    request_comfyui_json("POST", path, Some(payload))
}

fn get_comfyui_json(path: &str) -> Result<Value, String> {
    request_comfyui_json("GET", path, None)
}

fn post_comfyui_interrupt() -> Result<(), String> {
    let body = "{}";
    let request = format!(
        "POST /interrupt HTTP/1.1\r\nHost: {COMFYUI_ADDR}\r\nContent-Type: application/json\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{body}",
        body.len()
    );
    let mut stream = std::net::TcpStream::connect(COMFYUI_ADDR).map_err(|e| e.to_string())?;

    stream
        .set_read_timeout(Some(Duration::from_secs(10)))
        .map_err(|e| e.to_string())?;
    stream
        .set_write_timeout(Some(Duration::from_secs(10)))
        .map_err(|e| e.to_string())?;
    stream
        .write_all(request.as_bytes())
        .map_err(|e| e.to_string())?;

    let mut response = Vec::new();
    stream
        .read_to_end(&mut response)
        .map_err(|e| e.to_string())?;

    let response_start = String::from_utf8_lossy(&response[..response.len().min(64)]);

    if response_start.starts_with("HTTP/1.1 200") || response_start.starts_with("HTTP/1.0 200") {
        return Ok(());
    }

    Err("ComfyUI n'a pas accepté la demande d'interruption.".to_string())
}

fn find_first_generated_image(history: &Value, prompt_id: &str) -> Option<ComfyUIImageReference> {
    let outputs = history.get(prompt_id)?.get("outputs")?.as_object()?;

    for node_output in outputs.values() {
        let Some(images) = node_output
            .get("images")
            .and_then(|images| images.as_array())
        else {
            continue;
        };

        for image in images {
            let filename = image.get("filename")?.as_str()?.to_string();
            let subfolder = image
                .get("subfolder")
                .and_then(|subfolder| subfolder.as_str())
                .unwrap_or("")
                .to_string();
            let image_type = image
                .get("type")
                .and_then(|image_type| image_type.as_str())
                .unwrap_or("output")
                .to_string();

            return Some(ComfyUIImageReference {
                filename,
                subfolder,
                image_type,
            });
        }
    }

    None
}

fn image_mime_type(filename: &str) -> &'static str {
    let extension = Path::new(filename)
        .extension()
        .and_then(|extension| extension.to_str())
        .unwrap_or_default()
        .to_ascii_lowercase();

    match extension.as_str() {
        "jpg" | "jpeg" => "image/jpeg",
        "webp" => "image/webp",
        _ => "image/png",
    }
}

fn comfyui_image_path(app: &AppHandle, image: &ComfyUIImageReference) -> Result<PathBuf, String> {
    let source_dir = comfyui_source_dir(app)?;
    let base_dir = match image.image_type.as_str() {
        "temp" => source_dir.join("temp"),
        "input" => source_dir.join("input"),
        _ => source_dir.join("output"),
    };
    let filename = safe_file_name(&image.filename)?;
    let subfolder = if image.subfolder.trim().is_empty() {
        PathBuf::new()
    } else {
        safe_relative_path(&image.subfolder, "Le sous-dossier de l'image")?
    };
    let image_path = base_dir.join(subfolder).join(filename);

    if !image_path.exists() {
        return Err("L'image générée est introuvable dans ComfyUI.".to_string());
    }

    Ok(image_path)
}

fn read_generated_image(
    app: &AppHandle,
    image: ComfyUIImageReference,
) -> Result<ComfyUIGeneratedImage, String> {
    let image_path = comfyui_image_path(app, &image)?;
    let image_bytes = fs::read(image_path).map_err(|e| e.to_string())?;
    let data_url = format!(
        "data:{};base64,{}",
        image_mime_type(&image.filename),
        general_purpose::STANDARD.encode(image_bytes)
    );

    Ok(ComfyUIGeneratedImage {
        filename: image.filename,
        subfolder: image.subfolder,
        image_type: image.image_type,
        data_url,
    })
}

fn wait_for_generated_image(
    app: &AppHandle,
    prompt_id: &str,
) -> Result<ComfyUIGeneratedImage, String> {
    let timeout = Duration::from_secs(600);
    let started_at = Instant::now();
    let history_path = prompt_id_path(prompt_id)?;

    while started_at.elapsed() < timeout {
        if COMFYUI_GENERATION_CANCELLED.load(Ordering::Relaxed) {
            return Err("Génération ComfyUI interrompue.".to_string());
        }

        let elapsed = started_at.elapsed().as_secs();
        let progress = 94 + ((elapsed.min(timeout.as_secs()) * 5) / timeout.as_secs()) as u8;

        emit_runtime_status(app, "Attente de l'image générée par ComfyUI...", progress);

        let history = get_comfyui_json(&history_path)?;

        if history
            .get(prompt_id)
            .and_then(|prompt| prompt.get("status"))
            .and_then(|status| status.get("status_str"))
            .and_then(|status| status.as_str())
            == Some("error")
        {
            return Err("ComfyUI a échoué pendant la génération de l'image.".to_string());
        }

        if let Some(image) = find_first_generated_image(&history, prompt_id) {
            return read_generated_image(app, image);
        }

        thread::sleep(Duration::from_secs(2));
    }

    Err("ComfyUI n'a pas retourné d'image après 600 secondes.".to_string())
}

pub(crate) fn queue_image_generation(
    app: &AppHandle,
    workflow: Value,
) -> Result<ComfyUIImageGenerationResponse, String> {
    if !comfyui_ready() {
        return Err("ComfyUI n'est pas démarré.".to_string());
    }

    COMFYUI_GENERATION_CANCELLED.store(false, Ordering::Relaxed);
    emit_runtime_status(app, "Envoi du workflow à ComfyUI...", 92);

    let response = post_comfyui_json("/prompt", json!({ "prompt": workflow }))?;
    let prompt_id = response
        .get("prompt_id")
        .and_then(|prompt_id| prompt_id.as_str())
        .ok_or_else(|| "ComfyUI n'a pas retourné d'identifiant de génération.".to_string())?
        .to_string();
    let number = response.get("number").and_then(|number| number.as_f64());

    emit_runtime_log(app, "Workflow envoyé à ComfyUI.");
    emit_runtime_status(app, "Workflow ComfyUI envoyé.", 94);

    let image = wait_for_generated_image(app, &prompt_id)?;

    emit_runtime_log(app, "Image ComfyUI générée.");
    emit_runtime_status(app, "Image ComfyUI générée.", 100);

    Ok(ComfyUIImageGenerationResponse {
        prompt_id,
        number,
        image,
    })
}

pub(crate) fn interrupt_image_generation(app: &AppHandle) -> Result<bool, String> {
    COMFYUI_GENERATION_CANCELLED.store(true, Ordering::Relaxed);

    if !comfyui_ready() {
        return Ok(false);
    }

    emit_runtime_log(app, "Interruption de la génération ComfyUI.");
    post_comfyui_interrupt()?;

    Ok(true)
}

#[cfg(target_os = "macos")]
fn save_file_dialog(default_file_name: &str) -> Result<Option<PathBuf>, String> {
    let mut command = Command::new("osascript");

    command
        .arg("-e")
        .arg("on run argv")
        .arg("-e")
        .arg("set defaultFileName to item 1 of argv")
        .arg("-e")
        .arg("set destinationFile to choose file name with prompt \"Enregistrer l'image\" default name defaultFileName")
        .arg("-e")
        .arg("POSIX path of destinationFile")
        .arg("-e")
        .arg("end run")
        .arg(default_file_name);

    let output =
        command_output_with_timeout(command, Duration::from_secs(300), "Sélection du fichier")?;

    if output.status.success() {
        let path = String::from_utf8_lossy(&output.stdout).trim().to_string();

        return Ok((!path.is_empty()).then(|| PathBuf::from(path)));
    }

    let stderr = String::from_utf8_lossy(&output.stderr);

    if stderr.contains("User canceled") || stderr.contains("-128") {
        return Ok(None);
    }

    Err(stderr.trim().to_string())
}

#[cfg(target_os = "windows")]
fn save_file_dialog(default_file_name: &str) -> Result<Option<PathBuf>, String> {
    let mut command = Command::new("powershell.exe");
    let script = r#"
Add-Type -AssemblyName System.Windows.Forms
$dialog = New-Object System.Windows.Forms.SaveFileDialog
$dialog.FileName = $args[0]
$dialog.Filter = 'PNG image (*.png)|*.png|JPEG image (*.jpg;*.jpeg)|*.jpg;*.jpeg|WebP image (*.webp)|*.webp|All files (*.*)|*.*'
if ($dialog.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) {
  [Console]::OutputEncoding = [System.Text.Encoding]::UTF8
  Write-Output $dialog.FileName
}
"#;

    command.args([
        "-NoProfile",
        "-ExecutionPolicy",
        "Bypass",
        "-Command",
        script,
        default_file_name,
    ]);
    hide_command_window(&mut command);

    let output =
        command_output_with_timeout(command, Duration::from_secs(300), "Sélection du fichier")?;

    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).trim().to_string());
    }

    let path = String::from_utf8_lossy(&output.stdout).trim().to_string();

    Ok((!path.is_empty()).then(|| PathBuf::from(path)))
}

#[cfg(target_os = "linux")]
fn save_file_dialog(default_file_name: &str) -> Result<Option<PathBuf>, String> {
    let candidates = [
        (
            "zenity",
            vec![
                "--file-selection",
                "--save",
                "--confirm-overwrite",
                "--filename",
                default_file_name,
            ],
        ),
        ("kdialog", vec!["--getsavefilename", default_file_name]),
    ];

    for (program, args) in candidates {
        let mut command = Command::new(program);
        command.args(args);

        let Ok(output) =
            command_output_with_timeout(command, Duration::from_secs(300), "Sélection du fichier")
        else {
            continue;
        };

        if output.status.success() {
            let path = String::from_utf8_lossy(&output.stdout).trim().to_string();

            return Ok((!path.is_empty()).then(|| PathBuf::from(path)));
        }

        if output.status.code() == Some(1) {
            return Ok(None);
        }
    }

    Err("Aucun gestionnaire de fichier compatible n'est disponible.".to_string())
}

pub(crate) fn save_generated_image(
    app: &AppHandle,
    image: ComfyUIImageReference,
) -> Result<bool, String> {
    let image_path = comfyui_image_path(app, &image)?;
    let default_file_name = safe_file_name(&image.filename)?;
    let Some(destination) = save_file_dialog(&default_file_name)? else {
        return Ok(false);
    };

    fs::copy(image_path, destination).map_err(|e| e.to_string())?;

    emit_runtime_log(app, "Image ComfyUI enregistrée.");
    emit_runtime_status(app, "Image ComfyUI enregistrée.", 100);

    Ok(true)
}

fn process_matches_comfyui(
    process: &sysinfo::Process,
    runtime_dir: &Path,
    source_dir: &Path,
) -> bool {
    let name = process.name().to_ascii_lowercase();
    let exe = process
        .exe()
        .map(|path| path.to_string_lossy().to_ascii_lowercase())
        .unwrap_or_default();
    let command = process.cmd().join(" ").to_ascii_lowercase();
    let cwd_is_managed = process.cwd().is_some_and(|cwd| {
        cwd == runtime_dir
            || cwd.starts_with(runtime_dir)
            || cwd == source_dir
            || cwd.starts_with(source_dir)
    });
    let command_is_comfyui =
        command.contains("comfyui") || (command.contains("main.py") && command.contains("8188"));

    cwd_is_managed
        || command_is_comfyui
        || name == "comfyui"
        || exe.ends_with("/comfyui")
        || exe.ends_with("\\comfyui.exe")
}

fn stop_remaining_comfyui_processes(app: &AppHandle) -> Result<usize, String> {
    let runtime_dir = comfyui_runtime_dir(app)?;
    let source_dir = comfyui_source_dir(app)?;

    Ok(kill_matching_processes(|process| {
        process_matches_comfyui(process, &runtime_dir, &source_dir)
    }))
}

fn wait_for_comfyui(app: &AppHandle) -> Result<(), String> {
    let timeout = Duration::from_secs(240);
    let started_at = Instant::now();

    while started_at.elapsed() < timeout {
        if comfyui_ready() {
            emit_runtime_log(app, "ComfyUI est prêt.");
            emit_runtime_status(app, "ComfyUI est prêt.", 95);
            return Ok(());
        }

        let elapsed = started_at.elapsed().as_secs();
        let progress = 82 + ((elapsed.min(timeout.as_secs()) * 12) / timeout.as_secs()) as u8;

        emit_runtime_status(app, "Attente du démarrage de ComfyUI...", progress);
        thread::sleep(Duration::from_secs(2));
    }

    Err("ComfyUI ne répond pas après 240 secondes.".to_string())
}

pub(crate) fn start_comfyui_process(app: &AppHandle) -> Result<(), String> {
    if comfyui_ready() {
        emit_runtime_log(app, "ComfyUI est déjà en cours d'exécution.");
        emit_runtime_status(app, "ComfyUI est prêt.", 95);
        return Ok(());
    }

    let mut process = comfyui_process().lock().map_err(|e| e.to_string())?;

    if let Some(child) = process.as_mut() {
        if child.try_wait().map_err(|e| e.to_string())?.is_none() {
            return Ok(());
        }
    }

    *process = None;

    let source_dir = comfyui_source_dir(app)?;
    let python_path = comfyui_python_executable(app)?;
    let main_path = comfyui_main_path(app)?;

    if !main_path.exists() || !python_path.exists() {
        return Err("ComfyUI n'est pas installé dans l'environnement Assistia.".to_string());
    }

    fs::create_dir_all(&source_dir).map_err(|e| e.to_string())?;

    let mut command = Command::new(python_path);
    hide_command_window(&mut command);
    command
        .arg("main.py")
        .args([
            "--listen",
            "127.0.0.1",
            "--port",
            "8188",
            "--disable-api-nodes",
        ])
        .current_dir(source_dir)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());

    emit_runtime_status(app, "Démarrage de ComfyUI...", 82);
    emit_runtime_log(app, "Démarrage du serveur local ComfyUI.");

    let mut child = command.spawn().map_err(|e| e.to_string())?;

    if let Some(stdout) = child.stdout.take() {
        stream_command_output(app.clone(), stdout, "comfyui");
    }

    if let Some(stderr) = child.stderr.take() {
        stream_command_output(app.clone(), stderr, "comfyui");
    }

    *process = Some(child);
    drop(process);

    wait_for_comfyui(app)
}

pub(crate) fn stop_comfyui_runtime(app: &AppHandle) -> Result<String, String> {
    emit_runtime_status(app, "Arrêt de ComfyUI...", 15);

    let had_tracked_process = {
        let mut process = comfyui_process().lock().map_err(|e| e.to_string())?;

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
            "Aucun processus ComfyUI lancé par Assistia n'est actif.",
        );
    }

    if !wait_until_tcp_service_stops(COMFYUI_ADDR, Duration::from_secs(5)) {
        let killed_processes = stop_remaining_comfyui_processes(app)?;

        if killed_processes > 0 {
            emit_runtime_log(
                app,
                format!("{killed_processes} processus ComfyUI restant(s) arrêté(s)."),
            );
        }

        wait_until_tcp_service_stops(COMFYUI_ADDR, Duration::from_secs(5));
    }

    if comfyui_ready() {
        emit_runtime_status(app, "ComfyUI est lancé hors d'Assistia.", 35);
        return Ok("ComfyUI est lancé hors d'Assistia.".to_string());
    }

    emit_runtime_log(app, "ComfyUI arrêté.");
    emit_runtime_status(app, "ComfyUI arrêté.", 35);

    Ok("ComfyUI arrêté.".to_string())
}
