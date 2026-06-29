use crate::common::{
    command_output_with_timeout, ensure_curl, hide_command_window, read_settings, write_settings,
    LauncherSettings, WebSearchSettings, DEFAULT_SEARXNG_URL,
};
use serde::Serialize;
use serde_json::Value;
use std::process::Command;
use std::time::Duration;
use tauri::AppHandle;

const SEARCH_TIMEOUT: Duration = Duration::from_secs(25);
const MAX_QUERY_CHARS: usize = 500;
const MAX_RESULT_COUNT: usize = 10;

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct WebSearchResult {
    title: String,
    url: String,
    content: String,
    engine: String,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct WebSearchResponse {
    query: String,
    results: Vec<WebSearchResult>,
}

#[tauri::command]
pub fn get_web_search_settings(app: AppHandle) -> Result<WebSearchSettings, String> {
    Ok(read_settings(&app).web_search)
}

#[tauri::command]
pub fn set_web_search_settings(app: AppHandle, settings: WebSearchSettings) -> Result<(), String> {
    let mut launcher_settings: LauncherSettings = read_settings(&app);
    let use_local_searxng_url = settings.use_local_searxng_url;
    let searxng_url = if use_local_searxng_url {
        DEFAULT_SEARXNG_URL.to_string()
    } else {
        normalize_searxng_url(&settings.searxng_url)?
    };

    launcher_settings.web_search = WebSearchSettings {
        enabled: settings.enabled,
        use_local_searxng_url,
        searxng_url,
        max_results: normalize_max_results(settings.max_results),
    };

    write_settings(&app, &launcher_settings)
}

#[tauri::command]
pub async fn search_web(app: AppHandle, query: String) -> Result<WebSearchResponse, String> {
    tauri::async_runtime::spawn_blocking(move || run_web_search(&app, query))
        .await
        .map_err(|e| e.to_string())?
}

fn run_web_search(app: &AppHandle, query: String) -> Result<WebSearchResponse, String> {
    let settings = read_settings(app).web_search;

    if !settings.enabled {
        return Err("La recherche web n'est pas activée.".to_string());
    }

    let query = normalize_query(&query)?;
    let searxng_url = normalize_searxng_url(&settings.searxng_url)?;
    let search_url = build_search_url(&searxng_url, &query);

    ensure_curl(app)?;

    let output = command_output_with_timeout(
        search_command(&search_url),
        SEARCH_TIMEOUT,
        "Recherche SearXNG",
    )?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();

        return Err(if stderr.is_empty() {
            "SearXNG n'a pas répondu correctement.".to_string()
        } else {
            stderr
        });
    }

    let body = String::from_utf8_lossy(&output.stdout);
    let payload: Value = serde_json::from_str(&body).map_err(|e| e.to_string())?;
    let results = parse_results(&payload, normalize_max_results(settings.max_results));

    Ok(WebSearchResponse { query, results })
}

fn normalize_query(query: &str) -> Result<String, String> {
    let query = query.trim();

    if query.is_empty() {
        return Err("La requête de recherche est vide.".to_string());
    }

    Ok(query.chars().take(MAX_QUERY_CHARS).collect())
}

fn normalize_searxng_url(url: &str) -> Result<String, String> {
    let url = url.trim().trim_end_matches('/').to_string();

    if url.is_empty() {
        return Err("L'URL SearXNG est obligatoire.".to_string());
    }

    if !(url.starts_with("http://") || url.starts_with("https://")) {
        return Err("L'URL SearXNG doit commencer par http:// ou https://.".to_string());
    }

    Ok(url)
}

fn normalize_max_results(max_results: usize) -> usize {
    max_results.clamp(1, MAX_RESULT_COUNT)
}

fn build_search_url(searxng_url: &str, query: &str) -> String {
    let endpoint = if searxng_url.ends_with("/search") {
        searxng_url.to_string()
    } else {
        format!("{searxng_url}/search")
    };
    let separator = if endpoint.contains('?') { '&' } else { '?' };

    format!(
        "{endpoint}{separator}q={}&format=json",
        percent_encode(query)
    )
}

fn percent_encode(value: &str) -> String {
    let mut encoded = String::new();

    for byte in value.bytes() {
        if byte.is_ascii_alphanumeric() || matches!(byte, b'-' | b'.' | b'_' | b'~') {
            encoded.push(byte as char);
        } else {
            encoded.push_str(&format!("%{byte:02X}"));
        }
    }

    encoded
}

#[cfg(target_os = "windows")]
fn search_command(search_url: &str) -> Command {
    let mut command = Command::new("powershell.exe");
    let script =
        "$ProgressPreference = 'SilentlyContinue'; (Invoke-WebRequest -UseBasicParsing -Uri $args[0]).Content";

    command.args([
        "-NoProfile",
        "-ExecutionPolicy",
        "Bypass",
        "-Command",
        script,
        search_url,
    ]);
    hide_command_window(&mut command);
    command
}

#[cfg(not(target_os = "windows"))]
fn search_command(search_url: &str) -> Command {
    let mut command = Command::new("curl");
    command.args(["-fsSL", "--max-time", "20", search_url]);
    hide_command_window(&mut command);
    command
}

fn string_field(value: &Value, key: &str) -> String {
    value
        .get(key)
        .and_then(Value::as_str)
        .unwrap_or_default()
        .trim()
        .to_string()
}

fn engine_field(value: &Value) -> String {
    let engine = string_field(value, "engine");

    if !engine.is_empty() {
        return engine;
    }

    value
        .get("engines")
        .and_then(Value::as_array)
        .and_then(|engines| engines.iter().find_map(Value::as_str))
        .unwrap_or_default()
        .trim()
        .to_string()
}

fn parse_results(payload: &Value, max_results: usize) -> Vec<WebSearchResult> {
    let Some(results) = payload.get("results").and_then(Value::as_array) else {
        return Vec::new();
    };

    results
        .iter()
        .filter_map(|result| {
            let title = string_field(result, "title");
            let url = string_field(result, "url");

            if title.is_empty() || url.is_empty() {
                return None;
            }

            Some(WebSearchResult {
                title,
                url,
                content: string_field(result, "content"),
                engine: engine_field(result),
            })
        })
        .take(max_results)
        .collect()
}
