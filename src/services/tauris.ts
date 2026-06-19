import { invoke } from "@tauri-apps/api/core";

export type ServiceStatus = {
  name: string;
  status: string;
};

export async function openWebUI() {

  await invoke("open_webui");
}

export async function openDocumentation() {

  await invoke("open_documentation");
}

export async function openPatreon() {

  await invoke("open_patreon");
}

export async function openOllamaInstallation() {

  await invoke("open_ollama_installation");
}

export async function openOllamaTerms() {

  await invoke("open_ollama_terms");
}

export async function startOllamaInstallation() {

  await invoke("start_ollama_installation");
}

export async function startOpenWebUIInstallation() {

  await invoke("start_open_webui_installation");
}

export async function startFullInstallation() {

  await invoke("start_full_installation");
}

export async function stopRuntime() {

  await invoke("stop_runtime");
}

export async function startRuntime() {

  await invoke("start_runtime");
}

export async function getOllamaStatus() {

  return await invoke<ServiceStatus>("check_ollama_status");
}

export async function getOllamaExecutablePath() {

  return await invoke<string | null>("get_ollama_executable_path");
}

export async function setOllamaExecutablePath(ollamaPath: string) {

  await invoke("set_ollama_executable_path", {
    ollamaPath
  });
}

export async function getOpenWebUIExecutablePath() {

  return await invoke<string | null>("get_open_webui_executable_path");
}

export async function setOpenWebUIExecutablePath(openWebUIPath: string) {

  await invoke("set_open_webui_executable_path", {
    openWebuiPath: openWebUIPath
  });
}

export async function getServicesStatus() {

  return await invoke<ServiceStatus[]>("get_services_status");
}
