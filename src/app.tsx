import React, {
  useEffect,
  useRef,
  useState
} from "react";
import {
  Save,
  Settings,
  X
} from "lucide-react";

import ProgressBar
from "./components/ProgressBar";
import LogConsole
from "./components/LogConsole";

import {
  getOpenWebUIExecutablePath,
  getOllamaExecutablePath,
  getOllamaStatus,
  getServicesStatus,
  openDocumentation,
  openPatreon,
  openWebUI,
  openOllamaInstallation,
  openOllamaTerms,
  setOllamaExecutablePath,
  setOpenWebUIExecutablePath,
  startFullInstallation,
  startRuntime,
  startOllamaInstallation,
  stopRuntime,
  type ServiceStatus
} from "./services/tauris";
import ActionButtons from "./components/ActionButtons";
import {
  translations,
  type Language,
  type Translations
} from "./i18n";
import { useRuntimeEvents }
from "./hooks/useRuntimeEvents";
import { useLauncherStore }
from "./store/launcherStore";

const applicationServiceNames = [
  "ollama",
  "open-webui"
];

type ModelPullProgress = {
  progress: number;
  speed: string | null;
  eta: string | null;
};

type RuntimeMessageKey = keyof Translations["runtime"];

function PatreonLogo() {

  return (
    <svg
      aria-hidden="true"
      className="patreon-logo"
      fill="currentColor"
      focusable="false"
      viewBox="0 0 24 24"
    >
      <path d="M0 .48h4.22v23.04H0z" />
      <path d="M15.38.48C9.42.48 6.04 4.37 6.04 9.61c0 5.11 4.16 9.24 9.3 9.24 5.05 0 8.66-4.01 8.66-9.24C24 4.43 20.45.48 15.38.48z" />
    </svg>
  );
}

const runtimeMessageKeys: Record<string, RuntimeMessageKey> = {
  "Aucun processus Ollama lancé par Assistia n'est actif.":
    "ollamaExternalStop",
  "Aucun processus Open WebUI lancé par Assistia n'est actif.":
    "openWebUIExternalStop",
  "Arrêt d'Ollama...": "ollamaStopping",
  "Arrêt d'Open WebUI...": "openWebUIStopping",
  "Assistia installe Open WebUI dans un environnement local.":
    "openWebUIInstallLocalPreparing",
  "Assistia lance le script officiel d'installation Ollama depuis ollama.com.":
    "ollamaInstallScript",
  "Attente du démarrage d'Ollama...": "ollamaStartupWaiting",
  "Attente du démarrage d'Open WebUI...": "openWebUIStartupWaiting",
  "Démarrage d'Ollama...": "ollamaStarting",
  "Démarrage d'Open WebUI...": "openWebUIStarting",
  "Démarrage d'Open WebUI connecté à Ollama.": "openWebUIServerStarting",
  "Démarrage du serveur Ollama local.": "ollamaServerStarting",
  "Installation Ollama terminée.": "ollamaInstallDone",
  "Installation Open WebUI terminée.": "openWebUIInstallDone",
  "Installation complète terminée.": "fullInstallDone",
  "Installation d'Ollama puis d'Open WebUI.": "fullInstallRunning",
  "Installation des composants manquants.": "fullInstallRunning",
  "Installation d'Open WebUI...": "openWebUIInstallInstalling",
  "Installation d'Open WebUI dans l'environnement local.":
    "openWebUIInstallingLocal",
  "Installation d'Open WebUI dans l'environnement local avec uv.":
    "openWebUIInstallingLocal",
  "Installation d'uv...": "uvInstalling",
  "Installation d'uv pour récupérer Python 3.11 si nécessaire.":
    "uvInstallingForPython",
  "Installation de Python 3.11...": "pythonInstalling",
  "Modèle Ollama prêt.": "modelReady",
  "Ollama et Open WebUI démarrés.": "ollamaAndOpenWebUIStarted",
  "Ollama et Open WebUI sont déjà installés.": "fullInstallAlreadyDone",
  "Ollama arrêté.": "ollamaStopped",
  "Ollama est déjà installé.": "ollamaAlreadyInstalled",
  "Ollama est déjà installé. Installation ignorée.": "ollamaInstallSkipped",
  "Ollama est déjà en cours d'exécution.": "ollamaAlreadyRunning",
  "Ollama est lancé hors d'Assistia.": "ollamaExternalStop",
  "Ollama est prêt.": "ollamaReady",
  "Ollama est prêt pour Open WebUI.": "ollamaReadyForOpenWebUI",
  "Ollama n'est pas installé.": "ollamaMissing",
  "Ollama ne répond pas après 120 secondes.": "ollamaTimeout",
  "Open WebUI arrêté.": "openWebUIStopped",
  "Open WebUI est déjà installé.": "openWebUIAlreadyInstalled",
  "Open WebUI est déjà installé. Installation ignorée.":
    "openWebUIInstallSkipped",
  "Open WebUI est déjà en cours d'exécution.": "openWebUIAlreadyRunning",
  "Open WebUI est installé.": "openWebUIInstalled",
  "Open WebUI est lancé hors d'Assistia.": "openWebUIExternalStop",
  "Open WebUI est prêt.": "openWebUIReady",
  "Open WebUI ne répond pas après 180 secondes.": "openWebUITimeout",
  "Python 3.11 absent. Installation via uv.": "pythonMissingInstallUv",
  "Python 3.11 détecté sur le système.": "pythonDetected",
  "Préparation d'Ollama...": "ollamaPreparing",
  "Préparation d'Open WebUI...": "openWebUIInstallPreparing",
  "Préparation d'un environnement Python local pour Open WebUI.":
    "openWebUIPythonPreparing",
  "Préparation de l'installation Open WebUI...": "openWebUIInstallPreparing",
  "Préparation de l'installation complète...": "fullInstallPreparing",
  "Préparation de l'installation Ollama...": "ollamaInstallPreparing",
  "Récupération du modèle Ollama...": "modelRetrieving",
  "Services Assistia arrêtés.": "servicesStopped",
  "Services Ollama démarrés.": "ollamaStarted",
  "Téléchargement du modèle Ollama...": "modelDownloading",
  "Téléchargement et installation d'Ollama...": "ollamaInstallInstalling",
  "Tous les composants sont déjà installés.": "fullInstallAlreadyDone",
  "Vérification d'Ollama et d'Open WebUI avant installation.":
    "fullInstallChecking"
};

function translateRuntimeMessage(
  message: string,
  labels: Translations
) {
  if (message === "Idle") {
    return labels.progress.title;
  }

  if (message === translations.fr.progress.preparing
    || message === translations.en.progress.preparing) {
    return labels.progress.preparing;
  }

  if (message === translations.fr.progress.stopping
    || message === translations.en.progress.stopping) {
    return labels.progress.stopping;
  }

  const logPrefixMatch =
    message.match(/^(\[[^\]]+\]\s*)(.*)$/);

  if (logPrefixMatch) {
    return `${logPrefixMatch[1]}${translateRuntimeMessage(
      logPrefixMatch[2],
      labels
    )}`;
  }

  for (const [source, key] of Object.entries(runtimeMessageKeys)) {
    if (message === source) {
      return labels.runtime[key];
    }

    if (message.startsWith(`${source} `)) {
      return `${labels.runtime[key]} ${message.slice(source.length + 1)}`;
    }
  }

  return message;
}

function isServiceRunning(service?: ServiceStatus) {

  return service?.status.toUpperCase().startsWith("UP") ?? false;
}

function parseOllamaPullProgress(logs: string) {

  const matches =
    [...logs.matchAll(/pulling\s+[a-z0-9_-]+:\s*(\d{1,3})%([^\r\n]*)/gi)];

  const lastMatch =
    matches.at(-1);

  if (!lastMatch?.[1]) {
    return null;
  }

  const trailingLogs =
    logs.slice(lastMatch.index ?? 0);

  if (/success/i.test(trailingLogs)) {
    return null;
  }

  const progress =
    Number(lastMatch[1]);

  const details =
    lastMatch[2] ?? "";

  const speedMatch =
    details.match(/(\d+(?:\.\d+)?\s+(?:[KMGT]i?B|B)\/s)/i);

  const etaMatch =
    details.match(/\b(?=\d)(?:(?:\d+h)?(?:\d+m)?(?:\d+s))\b/i);

  return {
    progress: Math.min(Math.max(progress, 0), 100),
    speed: speedMatch?.[1] ?? null,
    eta: etaMatch?.[0] ?? null
  };
}

export default function App() {

  useRuntimeEvents();

  const hasAttemptedAutoStart =
    useRef(false);

  const [language, setLanguage] =
    useState<Language>("fr");

  const [services, setServices] =
    useState<ServiceStatus[]>([]);

  const [pendingAction, setPendingAction] =
    useState<"start" | "stop" | null>(null);

  const [modelPullProgress, setModelPullProgress] =
    useState<ModelPullProgress | null>(null);

  const [isSettingsOpen, setIsSettingsOpen] =
    useState(false);

  const [isOllamaInstallDialogOpen, setIsOllamaInstallDialogOpen] =
    useState(false);

  const [hasConfirmedOllamaTerms, setHasConfirmedOllamaTerms] =
    useState(false);

  const [ollamaInstallFeedback, setOllamaInstallFeedback] =
    useState<"started" | "error" | null>(null);

  const [isStartingOllamaInstallation, setIsStartingOllamaInstallation] =
    useState(false);

  const [isInstalling, setIsInstalling] =
    useState(false);

  const [installationFeedback, setInstallationFeedback] =
    useState<"started" | "error" | null>(null);

  const [ollamaPath, setOllamaPath] =
    useState("");

  const [openWebUIPath, setOpenWebUIPath] =
    useState("");

  const [settingsFeedback, setSettingsFeedback] =
    useState<"saved" | "error" | null>(null);

  const [isSavingSettings, setIsSavingSettings] =
    useState(false);

  const labels =
    translations[language];

  const {
    progress: runtimeProgress,
    status: runtimeProgressStatus,
    logs,
    clearLogs,
    setProgress,
    setStatus
  } = useLauncherStore();

  const ollamaStatus =
    services.find((item) => item.name === "ollama");

  const openWebUIStatus =
    services.find((item) => item.name === "open-webui");

  const isOpenWebUIRunning =
    isServiceRunning(openWebUIStatus);

  const isOllamaInstalled =
    ollamaStatus !== undefined && ollamaStatus.status !== "not installed";

  const isOpenWebUIInstalled =
    openWebUIStatus !== undefined && openWebUIStatus.status !== "not installed";

  const canStartOllamaInstallation =
    hasConfirmedOllamaTerms && !isStartingOllamaInstallation;

  const isApplicationRunning =
    applicationServiceNames.every((serviceName) => {
      const service =
        services.find((item) => item.name === serviceName);

      return isServiceRunning(service);
    });

  const displayedApplicationRunning =
    pendingAction === "start"
      ? true
      : pendingAction === "stop"
        ? false
        : isApplicationRunning;

  const translatedRuntimeProgressStatus =
    translateRuntimeMessage(runtimeProgressStatus, labels);

  const translatedLogs =
    logs.map((log) => translateRuntimeMessage(log, labels));

  useEffect(() => {

    let isMounted = true;

    async function loadSettings() {

      try {
        const [
          ollamaPath,
          openWebUIPath
        ] =
          await Promise.all([
            getOllamaExecutablePath(),
            getOpenWebUIExecutablePath()
          ]);

        if (isMounted) {
          setOllamaPath(ollamaPath ?? "");
          setOpenWebUIPath(openWebUIPath ?? "");
        }
      } catch {
        if (isMounted) {
          setOllamaPath("");
          setOpenWebUIPath("");
        }
      }
    }

    loadSettings();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {

    let isMounted = true;

    async function refreshServices() {

      try {
        const nextServices =
          await getServicesStatus();

        if (isMounted) {
          setServices(nextServices);
        }
      } catch {
        try {
          const ollamaStatus =
            await getOllamaStatus();

          if (isMounted) {
            setServices([ollamaStatus]);
          }
        } catch {
          if (isMounted) {
            setServices([
              {
                name: "ollama",
                status: "not installed"
              }
            ]);
          }
        }
      }
    }

    refreshServices();

    const interval =
      window.setInterval(refreshServices, 5000);

    return () => {
      isMounted = false;
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {

    setModelPullProgress(
      parseOllamaPullProgress(logs.join("\n"))
    );
  }, [logs]);

  useEffect(() => {

    if (hasAttemptedAutoStart.current
      || pendingAction !== null
      || !isOllamaInstalled
      || !isOpenWebUIInstalled
      || isApplicationRunning) {
      return;
    }

    hasAttemptedAutoStart.current = true;
    handleStart();
  }, [
    isOllamaInstalled,
    isOpenWebUIInstalled,
    isApplicationRunning,
    pendingAction
  ]);

  async function refreshServices() {

    try {
      const nextServices =
        await getServicesStatus();

      setServices(nextServices);
    } catch {
      try {
        const ollamaStatus =
          await getOllamaStatus();

        setServices([ollamaStatus]);
      } catch {
        setServices([
          {
            name: "ollama",
            status: "not installed"
          }
        ]);
      }
    }
  }

  async function handleStart() {

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

  async function handleStop() {

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

  async function handleSaveSettings(event: React.FormEvent<HTMLFormElement>) {

    event.preventDefault();
    setIsSavingSettings(true);
    setSettingsFeedback(null);

    try {
      await Promise.all([
        setOllamaExecutablePath(ollamaPath),
        setOpenWebUIExecutablePath(openWebUIPath)
      ]);
      await refreshServices();
      setSettingsFeedback("saved");
    } catch {
      setSettingsFeedback("error");
    } finally {
      setIsSavingSettings(false);
    }
  }

  async function handleStartOllamaInstallation() {

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
        await handleStart();
      } catch {}
    } catch {
      setOllamaInstallFeedback("error");
    } finally {
      setIsStartingOllamaInstallation(false);
    }
  }

  async function handleInstall(options: { closeSettings?: boolean } = {}) {

    setIsInstalling(true);
    setInstallationFeedback(null);
    clearLogs();
    setProgress(0);
    setStatus(labels.settings.installing);

    if (options.closeSettings) {
      setIsSettingsOpen(false);
    }

    try {
      await startFullInstallation();
      await refreshServices();
      setInstallationFeedback("started");
    } catch {
      setInstallationFeedback("error");
    } finally {
      setIsInstalling(false);
    }
  }

  return (

      <>
      <div className="app-toolbar">
        <label className="language-select">
          <span>{labels.language.label}</span>
          <select
            value={language}
            onChange={(event) =>
              setLanguage(event.target.value as Language)
            }
          >
            <option value="fr">{labels.language.french}</option>
            <option value="en">{labels.language.english}</option>
          </select>
        </label>
      </div>

      <ActionButtons
      canOpenInterface={isOpenWebUIRunning}
      canStart={isOllamaInstalled}
      isApplicationRunning={displayedApplicationRunning}
      labels={labels.actions}
      pendingAction={pendingAction}
      onStart={handleStart}
      onOpen={openWebUI}
      onStop={handleStop}
      openDocumentation={openDocumentation} />

      {!isApplicationRunning && (
        <div className="app-alert app-alert--error" role="alert">
          <div>
            <strong>
              {isOllamaInstalled
                ? labels.alert.runtimeUnavailable
                : labels.alert.ollamaMissing}
            </strong>
            <p>
              {isOllamaInstalled
                ? labels.alert.openWebUINotice
                : labels.alert.ollamaTermsNotice}
            </p>
          </div>

          {(isStartingOllamaInstallation || isInstalling) && (
            <span
              className="app-alert__loader"
              role="status"
              aria-label={
                isInstalling
                  ? labels.settings.installing
                  : labels.ollamaInstallDialog.installing
              }
            >
              <span aria-hidden="true" />
            </span>
          )}

          {!isOllamaInstalled && !isStartingOllamaInstallation && !isInstalling && (
            <button
              type="button"
              className="app-alert__button"
              onClick={() => handleInstall()}
            >
              {labels.settings.installMissing}
            </button>
          )}
        </div>
      )}

      {modelPullProgress !== null && (
        <ProgressBar
          labels={labels.progress}
          progress={modelPullProgress.progress}
          speed={modelPullProgress.speed}
          eta={modelPullProgress.eta}
        />
      )}

      {((pendingAction === "start" || pendingAction === "stop" || isStartingOllamaInstallation || isInstalling) || logs.length > 0) && (
        <section className="runtime-activity" aria-label={labels.logs.ariaLabel}>
          <ProgressBar
            labels={labels.progress}
            progress={runtimeProgress}
            speed={null}
            eta={null}
            status={translatedRuntimeProgressStatus}
            showDetails={false}
          />
          <LogConsole
            logs={logs.length > 0
              ? translatedLogs
              : [labels.logs.waiting]}
          />
        </section>
      )}
      
      <button
        type="button"
        className="patreon-fab"
        onClick={openPatreon}
      >
        <PatreonLogo />
        <span>{labels.actions.patreon}</span>
      </button>

      <button
        type="button"
        className="settings-fab"
        onClick={() => {
          setSettingsFeedback(null);
          setIsSettingsOpen(true);
        }}
      >
        <Settings size={20} />
        <span>{labels.settings.button}</span>
      </button>

      {isSettingsOpen && (
        <div
          className="settings-overlay"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setIsSettingsOpen(false);
            }
          }}
        >
          <section
            className="settings-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="settings-title"
          >
            <div className="settings-panel__header">
              <h2 id="settings-title">{labels.settings.title}</h2>
              <button
                type="button"
                className="settings-icon-button"
                onClick={() => setIsSettingsOpen(false)}
                aria-label={labels.settings.close}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveSettings} className="settings-form">
              <label className="settings-field">
                <span>{labels.settings.ollamaPathLabel}</span>
                <input
                  type="text"
                  value={ollamaPath}
                  disabled={isSavingSettings}
                  onChange={(event) => {
                    setOllamaPath(event.target.value);
                    setSettingsFeedback(null);
                  }}
                  placeholder={labels.settings.ollamaPathPlaceholder}
                  spellCheck={false}
                />
              </label>

              <p className="settings-help">
                {labels.settings.ollamaPathHelp}
              </p>

              <label className="settings-field">
                <span>{labels.settings.openWebUIPathLabel}</span>
                <input
                  type="text"
                  value={openWebUIPath}
                  disabled={isSavingSettings}
                  onChange={(event) => {
                    setOpenWebUIPath(event.target.value);
                    setSettingsFeedback(null);
                  }}
                  placeholder={labels.settings.openWebUIPathPlaceholder}
                  spellCheck={false}
                />
              </label>

              <p className="settings-help">
                {labels.settings.openWebUIPathHelp}
              </p>

              <section className="settings-install-section">
                <div>
                  <h3>{labels.settings.installTitle}</h3>
                  <p>{labels.settings.installHelp}</p>
                </div>

                <div className="settings-install-actions">
                  <button
                    type="button"
                    className="settings-save-button"
                    disabled={isSavingSettings || isInstalling}
                    onClick={() => handleInstall({ closeSettings: true })}
                  >
                    {isInstalling
                      ? labels.settings.installing
                      : labels.settings.installMissing}
                  </button>
                </div>
              </section>

              {isSavingSettings && (
                <p className="settings-progress" role="status">
                  <span className="settings-progress__spinner" aria-hidden="true" />
                  <span>{labels.settings.saving}</span>
                </p>
              )}

              {settingsFeedback !== null && (
                <p
                  className={
                    settingsFeedback === "saved"
                      ? "settings-feedback settings-feedback--saved"
                      : "settings-feedback settings-feedback--error"
                  }
                >
                  {settingsFeedback === "saved"
                    ? labels.settings.saved
                    : labels.settings.error}
                </p>
              )}

              {installationFeedback !== null && (
                <p
                  className={
                    installationFeedback === "started"
                      ? "settings-feedback settings-feedback--saved"
                      : "settings-feedback settings-feedback--error"
                  }
                >
                  {installationFeedback === "started"
                    ? labels.settings.installStarted
                    : labels.settings.installError}
                </p>
              )}

              <button
                type="submit"
                className="settings-save-button"
                disabled={isSavingSettings}
              >
                <Save size={18} />
                <span>
                  {isSavingSettings
                    ? labels.settings.saving
                    : labels.settings.save}
                </span>
              </button>
            </form>
          </section>
        </div>
      )}

      {isOllamaInstallDialogOpen && (
        <div
          className="settings-overlay"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setIsOllamaInstallDialogOpen(false);
            }
          }}
        >
          <section
            className="settings-panel ollama-install-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="ollama-install-title"
          >
            <div className="settings-panel__header">
              <h2 id="ollama-install-title">
                {labels.ollamaInstallDialog.title}
              </h2>
              <button
                type="button"
                className="settings-icon-button"
                onClick={() => setIsOllamaInstallDialogOpen(false)}
                aria-label={labels.settings.close}
              >
                <X size={20} />
              </button>
            </div>

            <div className="ollama-install-dialog__body">
              <p>{labels.ollamaInstallDialog.intro}</p>
              <p>{labels.ollamaInstallDialog.requirement}</p>
              <p className="ollama-install-dialog__notice">
                {labels.ollamaInstallDialog.responsibility}
              </p>

              <div className="ollama-install-dialog__links">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={openOllamaTerms}
                >
                  {labels.ollamaInstallDialog.officialTerms}
                </button>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={openOllamaInstallation}
                >
                  {labels.ollamaInstallDialog.officialInstall}
                </button>
              </div>

              <label className="ollama-install-dialog__check">
                <input
                  type="checkbox"
                  checked={hasConfirmedOllamaTerms}
                  disabled={isStartingOllamaInstallation}
                  onChange={(event) =>
                    setHasConfirmedOllamaTerms(event.target.checked)
                  }
                />
                <span>{labels.ollamaInstallDialog.confirmation}</span>
              </label>

              {ollamaInstallFeedback !== null && (
                <p
                  className={
                    ollamaInstallFeedback === "started"
                      ? "settings-feedback settings-feedback--saved"
                      : "settings-feedback settings-feedback--error"
                  }
                >
                  {ollamaInstallFeedback === "started"
                    ? labels.ollamaInstallDialog.started
                    : labels.ollamaInstallDialog.error}
                </p>
              )}

              <div className="ollama-install-dialog__actions">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setIsOllamaInstallDialogOpen(false)}
                  disabled={isStartingOllamaInstallation}
                >
                  {labels.ollamaInstallDialog.cancel}
                </button>
                <button
                  type="button"
                  className="settings-save-button"
                  onClick={handleStartOllamaInstallation}
                  disabled={!canStartOllamaInstallation}
                >
                  {isStartingOllamaInstallation ? (
                    <>
                      <span className="button-loader" aria-hidden="true" />
                      <span className="sr-only">
                        {labels.ollamaInstallDialog.installing}
                      </span>
                    </>
                  ) : (
                    labels.ollamaInstallDialog.install
                  )}
                </button>
              </div>
            </div>
          </section>
        </div>
      )}
      </>
  );
}
