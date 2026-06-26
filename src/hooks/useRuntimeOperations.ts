import {
  useEffect,
  useState
} from "react";

import type { Translations }
from "../i18n";
import {
  startComfyUI,
  startComfyUIInstallation,
  startDeveloperAgentInstallation,
  startFullInstallation,
  startRuntime,
  startOllamaInstallation,
  startSearXNG,
  startSearXNGInstallation,
  stopComfyUI,
  stopRuntime
} from "../services/tauris";
import type {
  InstallableComponent,
  InstallationFeedback,
  ModelPullProgress,
  PendingImageGeneratorAction,
  PendingInstallationAction,
  PendingRuntimeAction
} from "../types/launcher";
import { parseOllamaPullProgress }
from "../utils/ollamaProgress";

type Options = {
  clearLogs: () => void;
  labels: Translations;
  logs: string[];
  refreshServices: () => Promise<void>;
  setProgress: (value: number) => void;
  setStatus: (value: string) => void;
};

export function useRuntimeOperations({
  clearLogs,
  labels,
  logs,
  refreshServices,
  setProgress,
  setStatus
}: Options) {

  const [pendingAction, setPendingAction] =
    useState<PendingRuntimeAction>(null);

  const [pendingImageGeneratorAction, setPendingImageGeneratorAction] =
    useState<PendingImageGeneratorAction>(null);

  const [pendingInstallationAction, setPendingInstallationAction] =
    useState<PendingInstallationAction>(null);

  const [modelPullProgress, setModelPullProgress] =
    useState<ModelPullProgress | null>(null);

  const [comfyUIInstallationFeedback, setComfyUIInstallationFeedback] =
    useState<InstallationFeedback>(null);

  const [ollamaInstallFeedback, setOllamaInstallFeedback] =
    useState<InstallationFeedback>(null);

  const [requiredComponentsInstallationFeedback, setRequiredComponentsInstallationFeedback] =
    useState<InstallationFeedback>(null);

  const [developerAgentInstallationFeedback, setDeveloperAgentInstallationFeedback] =
    useState<InstallationFeedback>(null);

  const [isStartingOllamaInstallation, setIsStartingOllamaInstallation] =
    useState(false);

  const [isInstalling, setIsInstalling] =
    useState(false);

  const [installationFeedback, setInstallationFeedback] =
    useState<InstallationFeedback>(null);

  useEffect(() => {

    setModelPullProgress(
      parseOllamaPullProgress(logs.join("\n"))
    );
  }, [logs]);

  async function start() {

    setPendingAction("start");
    clearLogs();
    setProgress(0);
    setStatus(labels.progress.preparing);

    try {
      await startRuntime();
      await refreshServices();
    } finally {
      setPendingAction(null);
    }
  }

  async function stop() {

    setPendingAction("stop");
    setModelPullProgress(null);
    setProgress(0);
    setStatus(labels.progress.stopping);

    try {
      await stopRuntime();
      await refreshServices();
      clearLogs();
      setProgress(0);
      setStatus(labels.progress.stopping);
    } finally {
      setPendingAction(null);
    }
  }

  async function install() {

    setIsInstalling(true);
    setPendingInstallationAction("all");
    setInstallationFeedback(null);
    clearLogs();
    setProgress(0);
    setStatus(labels.settings.installingAll);

    try {
      await startFullInstallation();
      await refreshServices();
      setInstallationFeedback("started");
      return true;
    } catch {
      setInstallationFeedback("error");
      return false;
    } finally {
      setIsInstalling(false);
      setPendingInstallationAction(null);
    }
  }

  async function installSelectedComponents(
    components: InstallableComponent[]
  ) {
    if (components.length === 0) {
      return true;
    }

    setIsInstalling(true);
    setInstallationFeedback(null);
    setRequiredComponentsInstallationFeedback(null);
    setComfyUIInstallationFeedback(null);
    setDeveloperAgentInstallationFeedback(null);
    clearLogs();
    setProgress(0);
    setStatus(labels.settings.installing);

    try {
      for (const component of components) {
        setPendingInstallationAction(component);

        if (component === "required") {
          setStatus(labels.settings.requiredComponentsInstalling);
          await startOllamaInstallation();
          setRequiredComponentsInstallationFeedback("started");
        }

        if (component === "image-generator") {
          setPendingImageGeneratorAction("install");
          setStatus(labels.pages.imageGenerator.installingAction);
          await startComfyUIInstallation();
          setComfyUIInstallationFeedback("started");
          setPendingImageGeneratorAction(null);
        }

        if (component === "developer-agent") {
          setStatus(labels.settings.developerAgentInstalling);
          await startDeveloperAgentInstallation();
          setDeveloperAgentInstallationFeedback("started");
        }

        if (component === "web-search") {
          setStatus(labels.settings.webSearchInstalling);
          await startSearXNGInstallation();
        }
      }

      await refreshServices();
      setInstallationFeedback("started");
      return true;
    } catch {
      setInstallationFeedback("error");
      return false;
    } finally {
      setIsInstalling(false);
      setPendingInstallationAction(null);
      setPendingImageGeneratorAction(null);
    }
  }

  async function installRequiredComponents() {

    setIsInstalling(true);
    setPendingInstallationAction("required");
    setInstallationFeedback(null);
    setRequiredComponentsInstallationFeedback(null);
    clearLogs();
    setProgress(0);
    setStatus(labels.settings.requiredComponentsInstalling);

    try {
      await startOllamaInstallation();
      await refreshServices();
      setInstallationFeedback("started");
      setRequiredComponentsInstallationFeedback("started");
    } catch {
      setInstallationFeedback("error");
      setRequiredComponentsInstallationFeedback("error");
    } finally {
      setIsInstalling(false);
      setPendingInstallationAction(null);
    }
  }

  async function installDeveloperAgent() {

    setIsInstalling(true);
    setPendingInstallationAction("developer-agent");
    setInstallationFeedback(null);
    setDeveloperAgentInstallationFeedback(null);
    clearLogs();
    setProgress(0);
    setStatus(labels.settings.developerAgentInstalling);

    try {
      await startDeveloperAgentInstallation();
      await refreshServices();
      setInstallationFeedback("started");
      setDeveloperAgentInstallationFeedback("started");
    } catch {
      setInstallationFeedback("error");
      setDeveloperAgentInstallationFeedback("error");
    } finally {
      setIsInstalling(false);
      setPendingInstallationAction(null);
    }
  }

  async function installSearXNG() {

    setIsInstalling(true);
    setPendingInstallationAction("web-search");
    setInstallationFeedback(null);
    clearLogs();
    setProgress(0);
    setStatus(labels.settings.webSearchInstalling);

    try {
      await startSearXNGInstallation();
      await refreshServices();
      setInstallationFeedback("started");
    } catch {
      setInstallationFeedback("error");
    } finally {
      setIsInstalling(false);
      setPendingInstallationAction(null);
    }
  }

  async function installOllamaAndStart() {

    setIsStartingOllamaInstallation(true);
    setOllamaInstallFeedback(null);
    clearLogs();
    setProgress(0);
    setStatus(labels.ollamaInstallDialog.installing);

    try {
      await startOllamaInstallation();
      setOllamaInstallFeedback("started");
      await refreshServices();

      try {
        await start();
      } catch {}
    } catch {
      setOllamaInstallFeedback("error");
    } finally {
      setIsStartingOllamaInstallation(false);
    }
  }

  async function installComfyUI() {

    setIsInstalling(true);
    setPendingInstallationAction("image-generator");
    setPendingImageGeneratorAction("install");
    setComfyUIInstallationFeedback(null);
    setInstallationFeedback(null);
    clearLogs();
    setProgress(0);
    setStatus(labels.pages.imageGenerator.installingAction);

    try {
      await startComfyUIInstallation();
      await refreshServices();
      setComfyUIInstallationFeedback("started");
      setInstallationFeedback("started");
    } catch {
      setComfyUIInstallationFeedback("error");
      setInstallationFeedback("error");
    } finally {
      setIsInstalling(false);
      setPendingInstallationAction(null);
      setPendingImageGeneratorAction(null);
    }
  }

  async function startImageGenerator() {

    setPendingImageGeneratorAction("start");
    clearLogs();
    setProgress(0);
    setStatus(labels.pages.imageGenerator.startingAction);

    try {
      await startComfyUI();
      await refreshServices();
    } finally {
      setPendingImageGeneratorAction(null);
    }
  }

  async function startWebSearch() {

    clearLogs();
    setProgress(0);
    setStatus(labels.runtime.searxngStarting);

    await startSearXNG();
    await refreshServices();
  }

  async function stopImageGenerator() {

    setPendingImageGeneratorAction("stop");
    setProgress(0);
    setStatus(labels.pages.imageGenerator.stoppingAction);

    try {
      await stopComfyUI();
      await refreshServices();
    } finally {
      setPendingImageGeneratorAction(null);
    }
  }

  return {
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
    modelPullProgress,
    ollamaInstallFeedback,
    pendingInstallationAction,
    pendingImageGeneratorAction,
    pendingAction,
    requiredComponentsInstallationFeedback,
    startImageGenerator,
    startWebSearch,
    start,
    stopImageGenerator,
    stop
  };
}
