import React, {
  useEffect,
  useState
} from "react";

import MissingComponentsDialog
from "./components/dialogs/MissingComponentsDialog";
import ChatHistoryUnlockDialog
from "./components/dialogs/ChatHistoryUnlockDialog";
import LicenseDialog
from "./components/dialogs/LicenseDialog";
import OllamaInstallDialog
from "./components/dialogs/OllamaInstallDialog";
import StartupServersOverlay
from "./components/dialogs/StartupServersOverlay";
import AppShell
from "./components/layout/AppShell";
import ChatPage
from "./components/pages/ChatPage";
import DeveloperAgentPage
from "./components/pages/DeveloperAgentPage";
import ImageGeneratorPage
from "./components/pages/ImageGeneratorPage";
import LogsPage
from "./components/pages/LogsPage";
import SettingsPage
from "./components/pages/SettingsPage";
import { DeveloperAgentChatProvider }
from "./contexts/DeveloperAgentChatContext";
import { ChatProvider }
from "./contexts/ChatContext";
import {
  translations,
  type Language
} from "./i18n";
import { useChatModelActions }
from "./hooks/useChatModelActions";
import { useChatModelAvailability }
from "./hooks/useChatModelAvailability";
import { useDeveloperAgentSettings }
from "./hooks/useDeveloperAgentSettings";
import { useImageGeneratorModelAvailability }
from "./hooks/useImageGeneratorModelAvailability";
import { useImageGeneratorSettings }
from "./hooks/useImageGeneratorSettings";
import { useImageGeneratorModelActions }
from "./hooks/useImageGeneratorModelActions";
import { useRuntimeOperations }
from "./hooks/useRuntimeOperations";
import { useRuntimeEvents }
from "./hooks/useRuntimeEvents";
import { useServiceStatus }
from "./hooks/useServiceStatus";
import { useWebSearchSettings }
from "./hooks/useWebSearchSettings";
import {
  getChatHistorySecurityState,
  getInstallationPromptDisabled,
  openComfyUI,
  openDocumentation,
  openExternalUrl,
  openPatreon,
  openOllamaInstallation,
  openOllamaTerms,
  resetChatHistory as resetStoredChatHistory,
  setChatHistoryPassword as saveChatHistoryPassword,
  setInstallationPromptDisabled,
  unlockChatHistory as unlockStoredChatHistory,
  type ChatHistorySecurityState
} from "./services/tauris";
import { useLauncherStore }
from "./store/launcherStore";
import type {
  AppSection,
  InstallableComponent
}
from "./types/launcher";
import {
  isServiceRunning
} from "./utils/services";
import { translateRuntimeMessage }
from "./utils/runtimeMessages";

type StartupServersState =
  | "idle"
  | "starting"
  | "error";

let hasRequestedStartupServers = false;

export default function App() {

  useRuntimeEvents();

  const [language, setLanguage] =
    useState<Language>("fr");

  const [activeSection, setActiveSection] =
    useState<AppSection>("chat");

  const [isSidebarCollapsed, setIsSidebarCollapsed] =
    useState(false);

  const [isOllamaInstallDialogOpen, setIsOllamaInstallDialogOpen] =
    useState(false);

  const [hasConfirmedOllamaTerms, setHasConfirmedOllamaTerms] =
    useState(false);

  const [hasPromptedMissingComponents, setHasPromptedMissingComponents] =
    useState(false);

  const [isInstallationPromptPreferenceLoaded, setIsInstallationPromptPreferenceLoaded] =
    useState(false);

  const [isInstallationPromptDisabled, setIsInstallationPromptDisabled] =
    useState(false);

  const [isMissingComponentsDialogOpen, setIsMissingComponentsDialogOpen] =
    useState(false);

  const [isLicenseDialogOpen, setIsLicenseDialogOpen] =
    useState(false);

  const [chatHistorySecurityState, setChatHistorySecurityState] =
    useState<ChatHistorySecurityState>({
      isEncrypted: false,
      isUnlocked: true
    });

  const [isLoadingChatHistorySecurity, setIsLoadingChatHistorySecurity] =
    useState(true);

  const [chatHistoryUnlockVersion, setChatHistoryUnlockVersion] =
    useState(0);

  const [startupServersState, setStartupServersState] =
    useState<StartupServersState>("idle");

  const [startupServersError, setStartupServersError] =
    useState<string | null>(null);

  const labels =
    translations[language];

  const {
    hasLoadedServices,
    refreshServices,
    services
  } = useServiceStatus();

  const {
    developerAgentSettings,
    developerAgentSettingsFeedback,
    isLoadingDeveloperAgentSettings,
    isSavingDeveloperAgentSettings,
    saveDeveloperAgentSettings,
    updateDeveloperAgentSetting
  } = useDeveloperAgentSettings();

  const {
    isLoadingWebSearchSettings,
    isSavingWebSearchSettings,
    saveWebSearchSettings,
    updateWebSearchSetting,
    webSearchSettings,
    webSearchSettingsFeedback
  } = useWebSearchSettings();

  const {
    imageGeneratorSettings,
    imageGeneratorSettingsFeedback,
    isLoadingImageGeneratorSettings,
    isSavingImageGeneratorSettings,
    saveImageGeneratorSettings,
    updateImageGeneratorSetting
  } = useImageGeneratorSettings();

  const {
    downloadedModels: downloadedImageModels,
    isLoadingModelAvailability: isLoadingImageModelAvailability,
    modelAvailability: imageModelAvailability,
    refreshModelAvailability: refreshImageModelAvailability
  } = useImageGeneratorModelAvailability();

  const {
    installedModels: installedChatModels,
    isLoadingModelAvailability: isLoadingChatModelAvailability,
    refreshModelAvailability: refreshChatModelAvailability
  } = useChatModelAvailability();

  const {
    chatImageModelName,
    progress: runtimeProgress,
    status: runtimeProgressStatus,
    logs,
    clearLogs,
    setChatImageModelName,
    setProgress,
    setStatus
  } = useLauncherStore();

  const {
    deleteImageModel,
    downloadImageModel,
    imageModelAction,
    imageModelActionFeedback,
    isImageModelActionBusy
  } = useImageGeneratorModelActions({
    clearLogs,
    deleteStatus: labels.settings.imageModelDeleting,
    downloadStatus: labels.settings.imageModelDownloading,
    refreshModelAvailability: refreshImageModelAvailability,
    setProgress,
    setStatus
  });

  const {
    chatModelAction,
    chatModelActionFeedback,
    deleteChatModel,
    downloadChatModel,
    isChatModelActionBusy
  } = useChatModelActions({
    clearLogs,
    deleteStatus: labels.settings.chatModelDeleting,
    downloadStatus: labels.settings.chatModelDownloading,
    refreshModelAvailability: refreshChatModelAvailability,
    setProgress,
    setStatus
  });

  const {
    comfyUIInstallationFeedback,
    developerAgentInstallationFeedback,
    installDeveloperAgent,
    installComfyUI,
    installSearXNG,
    installationFeedback,
    install,
    installSelectedComponents,
    installOllamaAndStart,
    installRequiredComponents,
    isInstalling,
    isStartingOllamaInstallation,
    ollamaInstallFeedback,
    pendingInstallationAction,
    pendingImageGeneratorAction,
    requiredComponentsInstallationFeedback,
    startImageGenerator,
    startWebSearch,
    start
  } = useRuntimeOperations({
    clearLogs,
    labels,
    logs,
    refreshServices,
    setProgress,
    setStatus
  });

  const ollamaStatus =
    services.find((item) => item.name === "ollama");

  const comfyUIStatus =
    services.find((item) => item.name === "comfyui");

  const developerAgentStatus =
    services.find((item) => item.name === "developer-agent");

  const searxngStatus =
    services.find((item) => item.name === "searxng");

  const isOllamaRunning =
    isServiceRunning(ollamaStatus);

  const isComfyUIRunning =
    isServiceRunning(comfyUIStatus);

  const isSearXNGRunning =
    isServiceRunning(searxngStatus);

  const isOllamaInstalled =
    ollamaStatus !== undefined && ollamaStatus.status !== "not installed";

  const isComfyUIInstalled =
    comfyUIStatus !== undefined && comfyUIStatus.status !== "not installed";

  const isDeveloperAgentInstalled =
    developerAgentStatus !== undefined
    && developerAgentStatus.status !== "not installed";

  const isSearXNGInstalled =
    searxngStatus !== undefined && searxngStatus.status !== "not installed";

  const isRequiredComponentsInstalled =
    isOllamaInstalled;

  const chatImageModel =
    downloadedImageModels.find((model) => model.name === chatImageModelName);

  const installableComponents = [
    {
      key: "required" as InstallableComponent,
      title: labels.settings.requiredComponentsTitle,
      help: labels.settings.requiredComponentsHelp,
      isInstalled: isRequiredComponentsInstalled
    },
    {
      key: "image-generator" as InstallableComponent,
      title: labels.settings.imageGeneratorComponentTitle,
      help: labels.settings.imageGeneratorComponentHelp,
      isInstalled: isComfyUIInstalled
    },
    {
      key: "developer-agent" as InstallableComponent,
      title: labels.settings.developerAgentComponentTitle,
      help: labels.settings.developerAgentComponentHelp,
      isInstalled: isDeveloperAgentInstalled
    },
    {
      key: "web-search" as InstallableComponent,
      title: labels.settings.webSearchComponentTitle,
      help: labels.settings.webSearchComponentHelp,
      isInstalled: isSearXNGInstalled
    }
  ];

  const hasMissingInstallableComponents =
    hasLoadedServices
    && services.length > 0
    && installableComponents.some((component) => !component.isInstalled);

  const hasNoInstalledComponents =
    hasLoadedServices
    && services.length > 0
    && installableComponents.every((component) => !component.isInstalled);

  const canStartOllamaInstallation =
    hasConfirmedOllamaTerms && !isStartingOllamaInstallation;

  const translatedRuntimeProgressStatus =
    translateRuntimeMessage(runtimeProgressStatus, labels);

  const translatedLogs =
    logs.map((log) => translateRuntimeMessage(log, labels));

  const activePage =
    activeSection === "chat"
      ? labels.pages.chat
      : activeSection === "image-generator"
        ? labels.pages.imageGenerator
        : activeSection === "developer-agent"
          ? labels.pages.developerAgent
        : activeSection === "settings"
          ? labels.pages.settings
          : labels.pages.logs;

  useEffect(() => {
    let isMounted = true;

    async function loadInstallationPromptPreference() {
      try {
        const disabled =
          await getInstallationPromptDisabled();

        if (isMounted) {
          setIsInstallationPromptDisabled(disabled);
        }
      } finally {
        if (isMounted) {
          setIsInstallationPromptPreferenceLoaded(true);
        }
      }
    }

    loadInstallationPromptPreference();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadChatHistorySecurityState() {
      try {
        const state =
          await getChatHistorySecurityState();

        if (isMounted) {
          setChatHistorySecurityState(state);
        }
      } finally {
        if (isMounted) {
          setIsLoadingChatHistorySecurity(false);
        }
      }
    }

    loadChatHistorySecurityState();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    refreshImageModelAvailability();
  }, [
    isComfyUIInstalled,
    refreshImageModelAvailability
  ]);

  useEffect(() => {
    refreshChatModelAvailability();
  }, [
    isOllamaInstalled,
    isOllamaRunning,
    refreshChatModelAvailability
  ]);

  useEffect(() => {
    if (downloadedImageModels.length === 0) {
      if (chatImageModelName !== "") {
        setChatImageModelName("");
      }

      return;
    }

    if (!downloadedImageModels.some((model) => model.name === chatImageModelName)) {
      setChatImageModelName(downloadedImageModels[0].name);
    }
  }, [
    chatImageModelName,
    downloadedImageModels,
    setChatImageModelName
  ]);

  useEffect(() => {
    if (activeSection !== "chat" && activeSection !== "settings") {
      return;
    }

    refreshChatModelAvailability();
  }, [
    activeSection,
    refreshChatModelAvailability
  ]);

  useEffect(() => {
    if (
      !hasLoadedServices
      || !isInstallationPromptPreferenceLoaded
      || isInstallationPromptDisabled
      || hasPromptedMissingComponents
    ) {
      return;
    }

    if (hasMissingInstallableComponents) {
      setIsMissingComponentsDialogOpen(true);
      setHasPromptedMissingComponents(true);
    }
  }, [
    hasLoadedServices,
    hasMissingInstallableComponents,
    hasPromptedMissingComponents,
    isInstallationPromptDisabled,
    isInstallationPromptPreferenceLoaded
  ]);

  useEffect(() => {
    if (
      !hasLoadedServices
      || !isInstallationPromptPreferenceLoaded
      || hasNoInstalledComponents
      || isMissingComponentsDialogOpen
      || (
        !isInstallationPromptDisabled
        && !hasPromptedMissingComponents
        && hasMissingInstallableComponents
      )
      || hasRequestedStartupServers
    ) {
      return;
    }

    const shouldStartOllama =
      isOllamaInstalled && !isOllamaRunning;

    const shouldStartComfyUI =
      isComfyUIInstalled && !isComfyUIRunning;

    const shouldStartSearXNG =
      isSearXNGInstalled && !isSearXNGRunning;

    if (!shouldStartOllama && !shouldStartComfyUI && !shouldStartSearXNG) {
      hasRequestedStartupServers = true;
      return;
    }

    hasRequestedStartupServers = true;

    async function startInstalledServers() {
      setStartupServersState("starting");
      setStartupServersError(null);
      setProgress(0);
      setStatus(labels.startup.preparing);

      try {
        if (shouldStartOllama) {
          await start();
        }

        if (shouldStartComfyUI) {
          await startImageGenerator();
        }

        if (shouldStartSearXNG) {
          await startWebSearch();
        }

        setProgress(100);
        setStatus(labels.startup.ready);
        await refreshServices();
        setStartupServersState("idle");
      } catch (error) {
        setStartupServersError(String(error));
        setStartupServersState("error");
        await refreshServices();
      }
    }

    startInstalledServers();
  }, [
    hasLoadedServices,
    hasMissingInstallableComponents,
    hasNoInstalledComponents,
    hasPromptedMissingComponents,
    isComfyUIInstalled,
    isComfyUIRunning,
    isInstallationPromptDisabled,
    isInstallationPromptPreferenceLoaded,
    isMissingComponentsDialogOpen,
    isOllamaInstalled,
    isOllamaRunning,
    isSearXNGInstalled,
    isSearXNGRunning,
    labels.startup.preparing,
    labels.startup.ready,
    refreshServices,
    setProgress,
    setStatus,
    start,
    startImageGenerator,
    startWebSearch
  ]);

  async function installMissingComponents(components: InstallableComponent[]) {
    const missingComponents =
      components.filter((component) => {
        if (component === "required") {
          return !isRequiredComponentsInstalled;
        }

        if (component === "image-generator") {
          return !isComfyUIInstalled;
        }

        if (component === "developer-agent") {
          return !isDeveloperAgentInstalled;
        }

        return !isSearXNGInstalled;
      });

    if (missingComponents.length === 0) {
      setIsMissingComponentsDialogOpen(false);
      return;
    }

    const didInstall =
      await installSelectedComponents(missingComponents);

    if (didInstall) {
      hasRequestedStartupServers = false;
      setIsMissingComponentsDialogOpen(false);
    }
  }

  async function updateInstallationPromptDisabled(disabled: boolean) {
    const previousValue =
      isInstallationPromptDisabled;

    setIsInstallationPromptDisabled(disabled);

    try {
      await setInstallationPromptDisabled(disabled);
    } catch {
      setIsInstallationPromptDisabled(previousValue);
    }
  }

  async function unlockChatHistory(password: string) {
    const state =
      await unlockStoredChatHistory(password);

    setChatHistorySecurityState(state);
    setChatHistoryUnlockVersion((version) => version + 1);
  }

  async function changeChatHistoryPassword(
    currentPassword: string | null,
    newPassword: string
  ) {
    const state =
      await saveChatHistoryPassword(currentPassword, newPassword);

    setChatHistorySecurityState(state);
    setChatHistoryUnlockVersion((version) => version + 1);
  }

  async function resetChatHistory() {
    const state =
      await resetStoredChatHistory();

    setChatHistorySecurityState(state);
    setChatHistoryUnlockVersion((version) => version + 1);
  }

  function renderActiveSection() {

    if (activeSection === "chat") {
      return (
        <ChatPage
          availableModels={installedChatModels}
          installationFeedback={requiredComponentsInstallationFeedback}
          imageGenerationModel={chatImageModel}
          isLoadingModels={isLoadingChatModelAvailability}
          isComfyUIRunning={isComfyUIRunning}
          isOllamaInstalled={isOllamaInstalled}
          isOllamaRunning={isOllamaRunning}
          labels={labels.pages.chat}
          pendingInstallationAction={pendingInstallationAction}
          webSearchSettings={webSearchSettings}
          onInstallRequiredComponents={installRequiredComponents}
        />
      );
    }

    if (activeSection === "image-generator") {
      return (
        <ImageGeneratorPage
          availableModels={downloadedImageModels}
          installationFeedback={comfyUIInstallationFeedback}
          isComfyUIInstalled={isComfyUIInstalled}
          isComfyUIRunning={isComfyUIRunning}
          labels={labels.pages.imageGenerator}
          logs={translatedLogs}
          pendingAction={pendingImageGeneratorAction}
          progressLabels={labels.progress}
          runtimeProgress={runtimeProgress}
          translatedRuntimeProgressStatus={translatedRuntimeProgressStatus}
          onInstall={installComfyUI}
          onOpen={openComfyUI}
        />
      );
    }

    if (activeSection === "developer-agent") {
      return (
        <DeveloperAgentPage
          installationFeedback={developerAgentInstallationFeedback}
          isDeveloperAgentInstalled={isDeveloperAgentInstalled}
          isLoadingSettings={isLoadingDeveloperAgentSettings}
          isOllamaInstalled={isOllamaInstalled}
          labels={labels.pages.developerAgent}
          pendingInstallationAction={pendingInstallationAction}
          settings={developerAgentSettings}
          onInstallDeveloperAgent={installDeveloperAgent}
          onInstallRequiredComponents={installRequiredComponents}
          onOpenSettings={() => {
            setActiveSection("settings");
          }}
        />
      );
    }

    if (activeSection === "settings") {
      return (
        <SettingsPage
          chatHistorySecurityState={chatHistorySecurityState}
          chatImageModelName={chatImageModelName}
          developerAgentSettings={developerAgentSettings}
          developerAgentSettingsFeedback={developerAgentSettingsFeedback}
          imageGeneratorSettings={imageGeneratorSettings}
          imageGeneratorSettingsFeedback={imageGeneratorSettingsFeedback}
          chatModelAction={chatModelAction}
          chatModelActionFeedback={chatModelActionFeedback}
          chatModels={installedChatModels}
          imageModelAction={imageModelAction}
          imageModelActionFeedback={imageModelActionFeedback}
          imageModelAvailability={imageModelAvailability}
          installationFeedback={installationFeedback}
          isComfyUIInstalled={isComfyUIInstalled}
          isDeveloperAgentInstalled={isDeveloperAgentInstalled}
          isSearXNGInstalled={isSearXNGInstalled}
          isChatModelActionBusy={isChatModelActionBusy}
          isImageModelActionBusy={isImageModelActionBusy}
          isLoadingDeveloperAgentSettings={isLoadingDeveloperAgentSettings}
          isLoadingChatModels={isLoadingChatModelAvailability}
          isLoadingChatHistorySecurity={isLoadingChatHistorySecurity}
          isLoadingImageModels={isLoadingImageModelAvailability}
          isLoadingImageGeneratorSettings={isLoadingImageGeneratorSettings}
          isLoadingWebSearchSettings={isLoadingWebSearchSettings}
          isOllamaInstalled={isOllamaInstalled}
          isRequiredComponentsInstalled={isRequiredComponentsInstalled}
          isSavingDeveloperAgentSettings={isSavingDeveloperAgentSettings}
          isSavingImageGeneratorSettings={isSavingImageGeneratorSettings}
          isSavingWebSearchSettings={isSavingWebSearchSettings}
          labels={labels}
          logs={translatedLogs}
          pendingInstallationAction={pendingInstallationAction}
          webSearchSettings={webSearchSettings}
          webSearchSettingsFeedback={webSearchSettingsFeedback}
          onDeveloperAgentSettingChange={updateDeveloperAgentSetting}
          onChatImageModelChange={setChatImageModelName}
          onImageGeneratorSettingChange={updateImageGeneratorSetting}
          onWebSearchSettingChange={updateWebSearchSetting}
          onChangeChatHistoryPassword={changeChatHistoryPassword}
          onDeleteChatModel={deleteChatModel}
          onDeleteImageModel={deleteImageModel}
          onDownloadChatModel={downloadChatModel}
          onDownloadImageModel={downloadImageModel}
          onInstallAll={install}
          onInstallDeveloperAgent={installDeveloperAgent}
          onInstallImageGenerator={installComfyUI}
          onInstallRequiredComponents={installRequiredComponents}
          onInstallWebSearch={installSearXNG}
          onSaveDeveloperAgentSettings={saveDeveloperAgentSettings}
          onSaveImageGeneratorSettings={saveImageGeneratorSettings}
          onSaveWebSearchSettings={saveWebSearchSettings}
        />
      );
    }

    return (
      <LogsPage
        labels={labels.logs}
        logs={translatedLogs}
      />
    );
  }

  return (
    <ChatProvider historyUnlockVersion={chatHistoryUnlockVersion}>
      <DeveloperAgentChatProvider>
        <AppShell
          activePage={activePage}
          activeSection={activeSection}
          isSidebarCollapsed={isSidebarCollapsed}
          labels={labels}
          language={language}
          onChangeLanguage={setLanguage}
          onChangeSection={setActiveSection}
          onOpenDocumentation={openDocumentation}
          onOpenLicense={() => setIsLicenseDialogOpen(true)}
          onOpenPatreon={openPatreon}
          onToggleSidebar={() => {
            setIsSidebarCollapsed((collapsed) => !collapsed);
          }}
        >
          {renderActiveSection()}
        </AppShell>

        {isOllamaInstallDialogOpen && (
          <OllamaInstallDialog
            canStartInstallation={canStartOllamaInstallation}
            closeLabel={labels.settings.close}
            feedback={ollamaInstallFeedback}
            hasConfirmedTerms={hasConfirmedOllamaTerms}
            isInstalling={isStartingOllamaInstallation}
            labels={labels.ollamaInstallDialog}
            onClose={() => setIsOllamaInstallDialogOpen(false)}
            onConfirmTermsChange={setHasConfirmedOllamaTerms}
            onOpenInstallation={openOllamaInstallation}
            onOpenTerms={openOllamaTerms}
            onStartInstallation={installOllamaAndStart}
          />
        )}

        {isMissingComponentsDialogOpen && (
          <MissingComponentsDialog
            closeLabel={labels.settings.close}
            components={installableComponents}
            feedback={installationFeedback}
            isInstalling={isInstalling}
            isStartupPromptDisabled={isInstallationPromptDisabled}
            labels={labels.missingComponentsDialog}
            onChangeStartupPromptDisabled={updateInstallationPromptDisabled}
            onClose={() => setIsMissingComponentsDialogOpen(false)}
            onInstall={installMissingComponents}
          />
        )}

        {isLicenseDialogOpen && (
          <LicenseDialog
            labels={labels.licenseDialog}
            onClose={() => setIsLicenseDialogOpen(false)}
            onOpenLink={(url) => {
              void openExternalUrl(url);
            }}
          />
        )}

        {!isLoadingChatHistorySecurity
          && chatHistorySecurityState.isEncrypted
          && !chatHistorySecurityState.isUnlocked && (
          <ChatHistoryUnlockDialog
            labels={labels.chatHistoryUnlockDialog}
            onResetHistory={resetChatHistory}
            onUnlock={unlockChatHistory}
          />
        )}

        {startupServersState !== "idle" && (
          <StartupServersOverlay
            error={startupServersError}
            labels={labels.startup}
            progress={runtimeProgress}
            progressLabels={labels.progress}
            status={translatedRuntimeProgressStatus}
            onClose={() => {
              setStartupServersError(null);
              setStartupServersState("idle");
            }}
          />
        )}
      </DeveloperAgentChatProvider>
    </ChatProvider>
  );
}
