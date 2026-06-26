import { invoke } from "@tauri-apps/api/core";

export type ServiceStatus = {
  name: string;
  status: string;
};

export type DeveloperAgentSettings = {
  model: string;
  ollamaUrl: string;
  projectPath: string;
};

export type DeveloperAgentResponse = {
  message: string;
  stdout: string;
  stderr: string;
  gitStatus: string;
  gitDiff: string;
};

export type WebSearchSettings = {
  enabled: boolean;
  searxngUrl: string;
  maxResults: number;
};

export type WebSearchResult = {
  title: string;
  url: string;
  content: string;
  engine: string;
};

export type WebSearchResponse = {
  query: string;
  results: WebSearchResult[];
};

export type ImageModelDownload = {
  url: string;
  destinationDirectory: string;
  fileName?: string;
};

export type ImageGeneratorModelLicense = {
  name: string;
  url: string;
  summary: string;
  usage: string;
  restrictions: string[];
};

export type ImageGeneratorModelConfiguration = {
  name: string;
  description: string;
  license: ImageGeneratorModelLicense;
  downloads: ImageModelDownload[];
};

export type ImageGeneratorModelAvailability = {
  name: string;
  isDownloaded: boolean;
};

export type OllamaInstalledModel = {
  name: string;
};

export type OllamaChatMessage = {
  role: "assistant" | "system" | "user";
  content: string;
};

export type OllamaChatResponse = {
  message: string;
};

export type StoredChatMessage = {
  content: string;
  id: number;
  role: "assistant" | "user";
};

export type ChatConversation = {
  createdAt: number;
  id: string;
  messages: StoredChatMessage[];
  selectedModel: string;
  title: string;
  updatedAt: number;
};

export type ChatConversationSummary = {
  createdAt: number;
  id: string;
  messageCount: number;
  title: string;
  updatedAt: number;
};

export type ChatHistorySecurityState = {
  isEncrypted: boolean;
  isUnlocked: boolean;
};

export type ComfyUIGeneratedImage = {
  filename: string;
  subfolder: string;
  type: string;
  data_url: string;
};

export type ComfyUIImageGenerationResponse = {
  prompt_id: string;
  number?: number;
  image: ComfyUIGeneratedImage;
};

export async function openWebUI() {

  await invoke("open_webui");
}

export async function openComfyUI() {

  await invoke("open_comfyui");
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

export async function openExternalUrl(url: string) {

  await invoke("open_external_url", {
    url
  });
}

export async function getInstallationPromptDisabled() {

  return await invoke<boolean>("get_installation_prompt_disabled");
}

export async function setInstallationPromptDisabled(disabled: boolean) {

  await invoke("set_installation_prompt_disabled", {
    disabled
  });
}

export async function getChatHistorySecurityState() {

  return await invoke<ChatHistorySecurityState>(
    "get_chat_history_security_state"
  );
}

export async function unlockChatHistory(password: string) {

  return await invoke<ChatHistorySecurityState>("unlock_chat_history", {
    password
  });
}

export async function setChatHistoryPassword(
  currentPassword: string | null,
  newPassword: string
) {

  return await invoke<ChatHistorySecurityState>("set_chat_history_password", {
    currentPassword,
    newPassword
  });
}

export async function resetChatHistory() {

  return await invoke<ChatHistorySecurityState>("reset_chat_history");
}

export async function listChatConversations() {

  return await invoke<ChatConversationSummary[]>("list_chat_conversations");
}

export async function getChatConversation(id: string) {

  return await invoke<ChatConversation>("get_chat_conversation", {
    id
  });
}

export async function saveChatConversation(conversation: ChatConversation) {

  return await invoke<ChatConversationSummary>("save_chat_conversation", {
    conversation
  });
}

export async function deleteChatConversation(id: string) {

  await invoke("delete_chat_conversation", {
    id
  });
}

export async function startOllamaInstallation() {

  await invoke("start_ollama_installation");
}

export async function startOpenWebUIInstallation() {

  await invoke("start_open_webui_installation");
}

export async function startComfyUIInstallation() {

  await invoke("start_comfyui_installation");
}

export async function startDeveloperAgentInstallation() {

  await invoke("start_developer_agent_installation");
}

export async function startSearXNGInstallation() {

  await invoke("start_searxng_installation");
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

export async function startComfyUI() {

  await invoke("start_comfyui");
}

export async function startSearXNG() {

  await invoke("start_searxng");
}

export async function stopComfyUI() {

  await invoke("stop_comfyui");
}

export async function downloadComfyUIModelFiles(
  downloads: ImageModelDownload[]
) {

  await invoke("download_comfyui_model_files", {
    downloads
  });
}

export async function deleteComfyUIModelFiles(
  downloads: ImageModelDownload[]
) {

  await invoke("delete_comfyui_model_files", {
    downloads
  });
}

export async function getComfyUIModelAvailability(
  models: ImageGeneratorModelConfiguration[]
) {

  return await invoke<ImageGeneratorModelAvailability[]>(
    "get_comfyui_model_availability",
    {
      models
    }
  );
}

export async function listOllamaModels() {

  return await invoke<OllamaInstalledModel[]>("list_ollama_models");
}

export async function pullOllamaModel(model: string) {

  await invoke("pull_ollama_model", {
    model
  });
}

export async function deleteOllamaModel(model: string) {

  await invoke("delete_ollama_model", {
    model
  });
}

export async function sendOllamaChatMessage(
  model: string,
  messages: OllamaChatMessage[]
) {

  return await invoke<OllamaChatResponse>("send_ollama_chat_message", {
    model,
    messages
  });
}

export async function queueComfyUIImageGeneration(workflow: unknown) {

  return await invoke<ComfyUIImageGenerationResponse>(
    "queue_comfyui_image_generation",
    {
      workflow
    }
  );
}

export async function saveComfyUIGeneratedImage(
  image: ComfyUIGeneratedImage
) {

  return await invoke<boolean>("save_comfyui_generated_image", {
    image
  });
}

export async function getOllamaStatus() {

  return await invoke<ServiceStatus>("check_ollama_status");
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

export async function getDeveloperAgentSettings() {

  return await invoke<DeveloperAgentSettings>("get_developer_agent_settings");
}

export async function setDeveloperAgentSettings(settings: DeveloperAgentSettings) {

  await invoke("set_developer_agent_settings", {
    settings
  });
}

export async function sendDeveloperAgentMessage(
  message: string,
  settings: DeveloperAgentSettings
) {

  return await invoke<DeveloperAgentResponse>("send_developer_agent_message", {
    message,
    settings
  });
}

export async function getWebSearchSettings() {

  return await invoke<WebSearchSettings>("get_web_search_settings");
}

export async function setWebSearchSettings(settings: WebSearchSettings) {

  await invoke("set_web_search_settings", {
    settings
  });
}

export async function searchWeb(query: string) {

  return await invoke<WebSearchResponse>("search_web", {
    query
  });
}
