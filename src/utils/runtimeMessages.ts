import {
  translations,
  type Translations
} from "../i18n";

type RuntimeMessageKey = keyof Translations["runtime"];

const runtimeMessageKeys: Record<string, RuntimeMessageKey> = {
  "Aucun processus Ollama lancé par Assistia n'est actif.":
    "ollamaExternalStop",
  "Aucun processus Open WebUI lancé par Assistia n'est actif.":
    "openWebUIExternalStop",
  "Aucun processus ComfyUI lancé par Assistia n'est actif.":
    "comfyUIExternalStop",
  "Aucun processus SearXNG lancé par Assistia n'est actif.":
    "searxngExternalStop",
  "Arrêt de ComfyUI...": "comfyUIStopping",
  "Arrêt d'Ollama...": "ollamaStopping",
  "Arrêt d'Open WebUI...": "openWebUIStopping",
  "Arrêt de SearXNG...": "searxngStopping",
  "Aider est déjà installé.": "developerAgentAlreadyInstalled",
  "Aider est déjà installé. Installation ignorée.":
    "developerAgentInstallSkipped",
  "Aider est installé.": "developerAgentAlreadyInstalled",
  "Aucun fichier modèle ComfyUI à télécharger.": "comfyUIModelNoFiles",
  "Aucun fichier modèle ComfyUI à supprimer.": "comfyUIModelNoDeleteFiles",
  "Assistia installe Aider dans un environnement local.":
    "developerAgentInstallLocalPreparing",
  "Assistia installe Open WebUI dans un environnement local.":
    "openWebUIInstallLocalPreparing",
  "Assistia installe ComfyUI dans un environnement local.":
    "comfyUIInstallLocalPreparing",
  "Assistia installe SearXNG dans un environnement Python local.":
    "searxngInstallLocalPreparing",
  "Assistia lance le script officiel d'installation Ollama depuis ollama.com.":
    "ollamaInstallScript",
  "Attente du démarrage de ComfyUI...": "comfyUIStartupWaiting",
  "Attente de l'image générée par ComfyUI...": "comfyUIImageWaiting",
  "Attente du démarrage d'Ollama...": "ollamaStartupWaiting",
  "Attente du démarrage d'Open WebUI...": "openWebUIStartupWaiting",
  "Attente du démarrage de SearXNG...": "searxngStartupWaiting",
  "Téléchargement de l'archive officielle ComfyUI.": "comfyUISourceDownload",
  "Téléchargement de l'archive officielle SearXNG.":
    "searxngSourceDownloading",
  "ComfyUI arrêté.": "comfyUIStopped",
  "ComfyUI démarré.": "comfyUIStarted",
  "ComfyUI est déjà installé.": "comfyUIAlreadyInstalled",
  "ComfyUI est déjà installé. Installation ignorée.":
    "comfyUIInstallSkipped",
  "ComfyUI est déjà en cours d'exécution.": "comfyUIAlreadyRunning",
  "ComfyUI est installé.": "comfyUIInstalled",
  "ComfyUI est lancé hors d'Assistia.": "comfyUIExternalStop",
  "ComfyUI est prêt.": "comfyUIReady",
  "ComfyUI n'est pas installé dans l'environnement Assistia.":
    "comfyUIMainMissing",
  "ComfyUI ne répond pas après 240 secondes.": "comfyUITimeout",
  "Démarrage d'Ollama...": "ollamaStarting",
  "Démarrage d'Open WebUI...": "openWebUIStarting",
  "Démarrage d'Open WebUI connecté à Ollama.": "openWebUIServerStarting",
  "Démarrage de ComfyUI...": "comfyUIStarting",
  "Démarrage du serveur local ComfyUI.": "comfyUIServerStarting",
  "Démarrage du serveur local SearXNG.": "searxngServerStarting",
  "Démarrage du serveur Ollama local.": "ollamaServerStarting",
  "Envoi du workflow à ComfyUI...": "comfyUIWorkflowSending",
  "Fichiers du modèle ComfyUI prêts.": "comfyUIModelFilesReady",
  "Image ComfyUI enregistrée.": "comfyUIImageSaved",
  "Image ComfyUI générée.": "comfyUIImageGenerated",
  "Installation Ollama terminée.": "ollamaInstallDone",
  "Installation Open WebUI terminée.": "openWebUIInstallDone",
  "Installation Aider terminée.": "developerAgentInstallDone",
  "Installation ComfyUI terminée.": "comfyUIInstallDone",
  "Installation SearXNG terminée.": "searxngInstallDone",
  "Installation complète terminée.": "fullInstallDone",
  "Installation d'Ollama puis d'Open WebUI.": "fullInstallRunning",
  "Installation d'Aider...": "developerAgentInstallInstalling",
  "Installation d'Aider dans l'environnement local avec uv.":
    "developerAgentInstallInstalling",
  "Installation des composants manquants.": "fullInstallRunning",
  "Installation de ComfyUI...": "comfyUIInstalling",
  "Installation de SearXNG...": "searxngInstallRunning",
  "Installation des dépendances ComfyUI dans l'environnement local.":
    "comfyUIInstallingDependencies",
  "Installation des dépendances SearXNG...":
    "searxngDependenciesInstalling",
  "Préparation des dépendances Python requises par SearXNG.":
    "searxngDependenciesPreparing",
  "Installation d'Open WebUI...": "openWebUIInstallInstalling",
  "Installation d'Open WebUI dans l'environnement local.":
    "openWebUIInstallingLocal",
  "Installation d'Open WebUI dans l'environnement local avec uv.":
    "openWebUIInstallingLocal",
  "Installation de SearXNG dans l'environnement local avec uv.":
    "searxngInstallingLocal",
  "Installation d'uv...": "uvInstalling",
  "Installation d'uv pour récupérer Python 3.11 si nécessaire.":
    "uvInstallingForPython",
  "Installation de Python 3.11...": "pythonInstalling",
  "Installation de Python 3.11 pour Aider...":
    "developerAgentPythonInstalling",
  "Installation de Python 3.11 pour SearXNG...":
    "searxngPythonInstalling",
  "Installation de Python pour ComfyUI...": "comfyUIPythonInstalling",
  "Extraction de ComfyUI...": "comfyUIExtracting",
  "Extraction de l'archive ComfyUI.": "comfyUIExtractingArchive",
  "Extraction de SearXNG...": "searxngSourceExtracting",
  "Extraction de l'archive SearXNG.": "searxngSourceExtractingArchive",
  "Le fichier main.py de ComfyUI est introuvable après téléchargement.":
    "comfyUIDownloadError",
  "Le dossier extrait de ComfyUI est introuvable après téléchargement.":
    "comfyUIExtractError",
  "Modèle Ollama prêt.": "modelReady",
  "Modèle Ollama supprimé.": "ollamaModelDeleted",
  "Ollama et Open WebUI démarrés.": "ollamaAndOpenWebUIStarted",
  "Ollama et Open WebUI sont déjà installés.": "fullInstallAlreadyDone",
  "Ollama, ComfyUI et Aider sont déjà installés.":
    "ollamaOpenWebUIComfyUIAndAiderAlreadyInstalled",
  "Ollama, Open WebUI et Aider sont déjà installés.":
    "ollamaOpenWebUIComfyUIAndAiderAlreadyInstalled",
  "Ollama, Open WebUI, ComfyUI et Aider sont déjà installés.":
    "ollamaOpenWebUIComfyUIAndAiderAlreadyInstalled",
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
  "Python 3.11 absent. Installation via uv pour Aider.":
    "developerAgentPythonMissingInstallUv",
  "Python 3.11 détecté sur le système.": "pythonDetected",
  "Préparation d'Ollama...": "ollamaPreparing",
  "Préparation d'un environnement Python local pour Aider.":
    "developerAgentPythonPreparing",
  "Préparation d'Open WebUI...": "openWebUIInstallPreparing",
  "Préparation d'un environnement Python local pour Open WebUI.":
    "openWebUIPythonPreparing",
  "Préparation d'un environnement Python local pour SearXNG.":
    "searxngPythonPreparing",
  "Préparation de Python 3.13 pour ComfyUI via uv.":
    "comfyUIPythonPreparing",
  "Préparation de l'installation Aider...": "developerAgentInstallPreparing",
  "Préparation de l'installation ComfyUI...": "comfyUIInstallPreparing",
  "Préparation de l'installation SearXNG...": "searxngInstallPreparing",
  "Préparation de l'installation Open WebUI...": "openWebUIInstallPreparing",
  "Préparation de l'installation complète...": "fullInstallPreparing",
  "Préparation de l'installation Ollama...": "ollamaInstallPreparing",
  "Récupération du modèle Ollama...": "modelRetrieving",
  "Services Assistia arrêtés.": "servicesStopped",
  "Services Ollama démarrés.": "ollamaStarted",
  "SearXNG est déjà installé.": "searxngAlreadyInstalled",
  "SearXNG est déjà installé. Installation ignorée.": "searxngAlreadyInstalled",
  "SearXNG est déjà en cours d'exécution.": "searxngAlreadyRunning",
  "SearXNG est installé.": "searxngInstalled",
  "SearXNG est lancé hors d'Assistia.": "searxngExternalStop",
  "SearXNG est prêt.": "searxngReady",
  "SearXNG ne répond pas après 90 secondes.": "searxngTimeout",
  "SearXNG démarré.": "searxngStarted",
  "SearXNG arrêté.": "searxngStopped",
  "Démarrage de SearXNG...": "searxngStarting",
  "Téléchargement de ComfyUI...": "comfyUIDownload",
  "Téléchargement de SearXNG...": "searxngSourceDownload",
  "Téléchargement des fichiers du modèle ComfyUI...": "comfyUIModelDownload",
  "Suppression des fichiers du modèle ComfyUI...": "comfyUIModelDelete",
  "Fichiers du modèle ComfyUI supprimés.": "comfyUIModelFilesDeleted",
  "Téléchargement du modèle Ollama...": "modelDownloading",
  "Suppression du modèle Ollama...": "ollamaModelDelete",
  "Téléchargement et installation d'Ollama...": "ollamaInstallInstalling",
  "Tous les composants sont déjà installés.": "fullInstallAlreadyDone",
  "Vérification d'Ollama et d'Open WebUI avant installation.":
    "fullInstallChecking",
  "Vérification d'Ollama, de ComfyUI et d'Aider avant installation.":
    "fullInstallChecking",
  "Vérification d'Ollama, de ComfyUI, d'Aider et de SearXNG avant installation.":
    "fullInstallChecking",
  "Vérification d'Ollama, d'Open WebUI et d'Aider avant installation.":
    "fullInstallChecking",
  "Vérification d'Ollama, d'Open WebUI, de ComfyUI et d'Aider avant installation.":
    "fullInstallChecking",
  "Workflow ComfyUI envoyé.": "comfyUIWorkflowQueued",
  "Workflow envoyé à ComfyUI.": "comfyUIWorkflowSent"
};

export function translateRuntimeMessage(
  message: string,
  labels: Translations
): string {
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

  if (message === translations.fr.startup.preparing
    || message === translations.en.startup.preparing) {
    return labels.startup.preparing;
  }

  if (message === translations.fr.startup.ready
    || message === translations.en.startup.ready) {
    return labels.startup.ready;
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
