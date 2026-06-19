export type Language = "fr" | "en";

export type Translations = {
  actions: {
    ariaLabel: string;
    start: string;
    starting: string;
    stop: string;
    stopping: string;
    openInterface: string;
    openDocumentation: string;
    patreon: string;
  };
  alert: {
    ollamaInstall: string;
    ollamaMissing: string;
    ollamaTermsNotice: string;
    runtimeUnavailable: string;
    openWebUINotice: string;
  };
  ollamaInstallDialog: {
    title: string;
    intro: string;
    requirement: string;
    responsibility: string;
    officialTerms: string;
    officialInstall: string;
    confirmation: string;
    cancel: string;
    install: string;
    installing: string;
    started: string;
    error: string;
  };
  language: {
    label: string;
    french: string;
    english: string;
  };
  progress: {
    ariaLabel: string;
    title: string;
    speed: string;
    eta: string;
    calculating: string;
    preparing: string;
    stopping: string;
  };
  logs: {
    ariaLabel: string;
    waiting: string;
  };
  settings: {
    button: string;
    title: string;
    ollamaPathLabel: string;
    ollamaPathPlaceholder: string;
    ollamaPathHelp: string;
    openWebUIPathLabel: string;
    openWebUIPathPlaceholder: string;
    openWebUIPathHelp: string;
    installTitle: string;
    installHelp: string;
    installMissing: string;
    installing: string;
    installStarted: string;
    installError: string;
    save: string;
    saving: string;
    close: string;
    saved: string;
    error: string;
  };
  runtime: {
    modelDownloading: string;
    modelReady: string;
    modelRetrieving: string;
    openWebUIAlreadyRunning: string;
    openWebUIAlreadyInstalled: string;
    openWebUIExternalStop: string;
    openWebUIInstalled: string;
    openWebUIInstallDone: string;
    openWebUIInstallInstalling: string;
    openWebUIInstallLocalPreparing: string;
    openWebUIInstallPreparing: string;
    openWebUIInstallSkipped: string;
    openWebUIInstallingLocal: string;
    openWebUIPythonPreparing: string;
    openWebUIReady: string;
    openWebUIServerStarting: string;
    openWebUIStarted: string;
    openWebUIStarting: string;
    openWebUIStopped: string;
    openWebUIStopping: string;
    openWebUIStartupWaiting: string;
    openWebUITimeout: string;
    ollamaAlreadyRunning: string;
    ollamaAlreadyInstalled: string;
    ollamaAndOpenWebUIStarted: string;
    ollamaExternalStop: string;
    ollamaInstallDone: string;
    ollamaInstallInstalling: string;
    ollamaInstallPreparing: string;
    ollamaInstallSkipped: string;
    ollamaInstallScript: string;
    ollamaMissing: string;
    ollamaPreparing: string;
    ollamaReady: string;
    ollamaReadyForOpenWebUI: string;
    ollamaServerStarting: string;
    ollamaStarted: string;
    ollamaStarting: string;
    ollamaStopped: string;
    ollamaStopping: string;
    ollamaStartupWaiting: string;
    ollamaTimeout: string;
    pythonDetected: string;
    pythonInstalling: string;
    pythonMissingInstallUv: string;
    servicesStopped: string;
    fullInstallAlreadyDone: string;
    fullInstallChecking: string;
    fullInstallDone: string;
    fullInstallPreparing: string;
    fullInstallRunning: string;
    uvInstalling: string;
    uvInstallingForPython: string;
  };
  status: {
    ariaLabel: string;
    title: string;
    running: string;
    stopped: string;
    notFound: string;
    services: {
      ollama: string;
      openWebUI: string;
    };
  };
};

export const translations: Record<Language, Translations> = {
  fr: {
    actions: {
      ariaLabel: "Actions de l'application",
      start: "Démarrer",
      starting: "Démarrage...",
      stop: "Arrêter",
      stopping: "Arrêt en cours...",
      openInterface: "Ouvrir le chat",
      openDocumentation: "Accéder à la documentation",
      patreon: "Patreon"
    },
    alert: {
      ollamaInstall: "Installer les composants manquants",
      ollamaMissing:
        "Ollama n'est pas installé. Assistia peut lancer l'installation officielle d'Ollama.",
      ollamaTermsNotice:
        "Ollama reste un logiciel tiers soumis à ses propres conditions d'utilisation.",
      runtimeUnavailable:
        "Ollama ou Open WebUI n'est pas encore lancé. Cliquez sur Démarrer pour lancer les deux services.",
      openWebUINotice:
        "Open WebUI sera préparé dans les données locales d'Assistia si nécessaire, puis connecté à Ollama sur votre machine."
    },
    ollamaInstallDialog: {
      title: "Installer Ollama",
      intro:
        "Assistia va lancer le script d'installation officiel Ollama adapté à votre système.",
      requirement:
        "Selon la page officielle Ollama, macOS nécessite macOS 14 Sonoma ou plus récent, et Windows nécessite Windows 10 ou plus récent.",
      responsibility:
        "Vous devez lire et respecter les conditions Ollama applicables. Assistia n'accepte pas ces conditions à votre place.",
      officialTerms: "Lire les conditions Ollama",
      officialInstall: "Page officielle d'installation",
      confirmation:
        "J'ai lu la notice ci-dessus et je souhaite lancer l'installation officielle d'Ollama.",
      cancel: "Annuler",
      install: "Télécharger et installer Ollama",
      installing: "Installation d'Ollama...",
      started:
        "Ollama est installé. Assistia va maintenant le démarrer localement.",
      error: "Impossible de lancer l'installation Ollama."
    },
    language: {
      label: "Langue",
      french: "Français",
      english: "Anglais"
    },
    progress: {
      ariaLabel: "Téléchargement et démarrage Assistia",
      title: "Téléchargement du modèle Ollama",
      speed: "Vitesse",
      eta: "Temps estimé",
      calculating: "calcul en cours",
      preparing: "Préparation d'Ollama et Open WebUI...",
      stopping: "Arrêt d'Ollama et Open WebUI..."
    },
    logs: {
      ariaLabel: "Journal Assistia",
      waiting: "En attente des premières informations..."
    },
    settings: {
      button: "Paramétrage",
      title: "Paramétrage des exécutables",
      ollamaPathLabel: "Chemin vers Ollama",
      ollamaPathPlaceholder:
        "Ex. /usr/local/bin/ollama ou C:\\Users\\vous\\AppData\\Local\\Programs\\Ollama\\ollama.exe",
      ollamaPathHelp:
        "Laissez vide pour utiliser la détection automatique. Vous pouvez saisir le chemin complet vers l'exécutable Ollama ou le dossier qui le contient.",
      openWebUIPathLabel: "Chemin vers Open WebUI",
      openWebUIPathPlaceholder:
        "Ex. ~/.local/bin/open-webui ou C:\\Users\\vous\\AppData\\Roaming\\Python\\Scripts\\open-webui.exe",
      openWebUIPathHelp:
        "Laissez vide pour utiliser l'installation locale gérée par Assistia ou la détection automatique. Vous pouvez saisir le chemin complet vers open-webui ou le dossier qui le contient.",
      installTitle: "Installation",
      installHelp:
        "Assistia vérifie Ollama et Open WebUI, puis installe uniquement les composants manquants. Pour Open WebUI, Python 3.11 est préparé via uv si nécessaire.",
      installMissing: "Installer les composants manquants",
      installing: "Installation des composants manquants...",
      installStarted: "Installation terminée.",
      installError: "Impossible de terminer l'installation.",
      save: "Enregistrer",
      saving: "Enregistrement...",
      close: "Fermer",
      saved: "Chemin Ollama enregistré.",
      error: "Impossible d'enregistrer le chemin Ollama."
    },
    runtime: {
      modelDownloading: "Téléchargement du modèle Ollama...",
      modelReady: "Modèle Ollama prêt.",
      modelRetrieving: "Récupération du modèle Ollama...",
      openWebUIAlreadyRunning: "Open WebUI est déjà en cours d'exécution.",
      openWebUIAlreadyInstalled: "Open WebUI est déjà installé.",
      openWebUIExternalStop: "Open WebUI est lancé hors d'Assistia.",
      openWebUIInstalled: "Open WebUI est installé.",
      openWebUIInstallDone: "Installation Open WebUI terminée.",
      openWebUIInstallInstalling: "Installation d'Open WebUI...",
      openWebUIInstallLocalPreparing:
        "Assistia installe Open WebUI dans un environnement local.",
      openWebUIInstallPreparing: "Préparation d'Open WebUI...",
      openWebUIInstallSkipped:
        "Open WebUI est déjà installé. Installation ignorée.",
      openWebUIInstallingLocal:
        "Installation d'Open WebUI dans l'environnement local avec uv.",
      openWebUIPythonPreparing:
        "Préparation d'un environnement Python local pour Open WebUI.",
      openWebUIReady: "Open WebUI est prêt.",
      openWebUIServerStarting: "Démarrage d'Open WebUI connecté à Ollama.",
      openWebUIStarted: "Open WebUI démarré.",
      openWebUIStarting: "Démarrage d'Open WebUI...",
      openWebUIStopped: "Open WebUI arrêté.",
      openWebUIStopping: "Arrêt d'Open WebUI...",
      openWebUIStartupWaiting: "Attente du démarrage d'Open WebUI...",
      openWebUITimeout: "Open WebUI ne répond pas après 180 secondes.",
      ollamaAlreadyRunning: "Ollama est déjà en cours d'exécution.",
      ollamaAlreadyInstalled: "Ollama est déjà installé.",
      ollamaAndOpenWebUIStarted: "Ollama et Open WebUI démarrés.",
      ollamaExternalStop: "Ollama est lancé hors d'Assistia.",
      ollamaInstallDone: "Installation Ollama terminée.",
      ollamaInstallInstalling: "Téléchargement et installation d'Ollama...",
      ollamaInstallPreparing: "Préparation de l'installation Ollama...",
      ollamaInstallSkipped: "Ollama est déjà installé. Installation ignorée.",
      ollamaInstallScript:
        "Assistia lance le script officiel d'installation Ollama depuis ollama.com.",
      ollamaMissing: "Ollama n'est pas installé.",
      ollamaPreparing: "Préparation d'Ollama...",
      ollamaReady: "Ollama est prêt.",
      ollamaReadyForOpenWebUI: "Ollama est prêt pour Open WebUI.",
      ollamaServerStarting: "Démarrage du serveur Ollama local.",
      ollamaStarted: "Services Ollama démarrés.",
      ollamaStarting: "Démarrage d'Ollama...",
      ollamaStopped: "Ollama arrêté.",
      ollamaStopping: "Arrêt d'Ollama...",
      ollamaStartupWaiting: "Attente du démarrage d'Ollama...",
      ollamaTimeout: "Ollama ne répond pas après 120 secondes.",
      pythonDetected: "Python 3.11 détecté sur le système.",
      pythonInstalling: "Installation de Python 3.11...",
      pythonMissingInstallUv: "Python 3.11 absent. Installation via uv.",
      servicesStopped: "Services Assistia arrêtés.",
      fullInstallAlreadyDone: "Tous les composants sont déjà installés.",
      fullInstallChecking:
        "Vérification d'Ollama et d'Open WebUI avant installation.",
      fullInstallDone: "Installation complète terminée.",
      fullInstallPreparing: "Préparation de l'installation complète...",
      fullInstallRunning: "Installation des composants manquants.",
      uvInstalling: "Installation d'uv...",
      uvInstallingForPython:
        "Installation d'uv pour récupérer Python 3.11 si nécessaire."
    },
    status: {
      ariaLabel: "Statut des services",
      title: "Liste des composants",
      running: "Démarré",
      stopped: "Éteint",
      notFound: "introuvable",
      services: {
        ollama: "Ollama",
        openWebUI: "Open WebUI"
      }
    }
  },
  en: {
    actions: {
      ariaLabel: "Application actions",
      start: "Start",
      starting: "Starting...",
      stop: "Stop",
      stopping: "Stopping...",
      openInterface: "Open chat",
      openDocumentation: "Open documentation",
      patreon: "Patreon"
    },
    alert: {
      ollamaInstall: "Install missing components",
      ollamaMissing:
        "Ollama is not installed. Assistia can launch the official Ollama installation.",
      ollamaTermsNotice:
        "Ollama remains third-party software subject to its own terms of use.",
      runtimeUnavailable:
        "Ollama or Open WebUI is not running yet. Click Start to launch both services.",
      openWebUINotice:
        "Open WebUI will be prepared in Assistia's local data if needed, then connected to Ollama on your machine."
    },
    ollamaInstallDialog: {
      title: "Install Ollama",
      intro:
        "Assistia will run the official Ollama installation script for your system.",
      requirement:
        "According to Ollama's official download page, macOS requires macOS 14 Sonoma or later, and Windows requires Windows 10 or later.",
      responsibility:
        "You must read and comply with the applicable Ollama terms. Assistia does not accept those terms on your behalf.",
      officialTerms: "Read Ollama terms",
      officialInstall: "Official installation page",
      confirmation:
        "I have read the notice above and want to launch the official Ollama installation.",
      cancel: "Cancel",
      install: "Download and install Ollama",
      installing: "Installing Ollama...",
      started:
        "Ollama is installed. Assistia will now start it locally.",
      error: "Unable to start Ollama installation."
    },
    language: {
      label: "Language",
      french: "French",
      english: "English"
    },
    progress: {
      ariaLabel: "Assistia download and startup",
      title: "Downloading Ollama model",
      speed: "Speed",
      eta: "Estimated time",
      calculating: "calculating",
      preparing: "Preparing Ollama and Open WebUI...",
      stopping: "Stopping Ollama and Open WebUI..."
    },
    logs: {
      ariaLabel: "Assistia logs",
      waiting: "Waiting for the first messages..."
    },
    settings: {
      button: "Settings",
      title: "Executable settings",
      ollamaPathLabel: "Ollama path",
      ollamaPathPlaceholder:
        "E.g. /usr/local/bin/ollama or C:\\Users\\you\\AppData\\Local\\Programs\\Ollama\\ollama.exe",
      ollamaPathHelp:
        "Leave empty to use automatic detection. You can enter the full path to the Ollama executable or the folder that contains it.",
      openWebUIPathLabel: "Open WebUI path",
      openWebUIPathPlaceholder:
        "E.g. ~/.local/bin/open-webui or C:\\Users\\you\\AppData\\Roaming\\Python\\Scripts\\open-webui.exe",
      openWebUIPathHelp:
        "Leave empty to use Assistia's managed local installation or automatic detection. You can enter the full path to open-webui or the folder that contains it.",
      installTitle: "Installation",
      installHelp:
        "Assistia checks Ollama and Open WebUI, then installs only the missing components. For Open WebUI, Python 3.11 is prepared through uv if needed.",
      installMissing: "Install missing components",
      installing: "Installing missing components...",
      installStarted: "Installation complete.",
      installError: "Unable to complete installation.",
      save: "Save",
      saving: "Saving...",
      close: "Close",
      saved: "Ollama path saved.",
      error: "Unable to save Ollama path."
    },
    runtime: {
      modelDownloading: "Downloading Ollama model...",
      modelReady: "Ollama model ready.",
      modelRetrieving: "Retrieving Ollama model...",
      openWebUIAlreadyRunning: "Open WebUI is already running.",
      openWebUIAlreadyInstalled: "Open WebUI is already installed.",
      openWebUIExternalStop: "Open WebUI is running outside Assistia.",
      openWebUIInstalled: "Open WebUI is installed.",
      openWebUIInstallDone: "Open WebUI installation complete.",
      openWebUIInstallInstalling: "Installing Open WebUI...",
      openWebUIInstallLocalPreparing:
        "Assistia is installing Open WebUI in a local environment.",
      openWebUIInstallPreparing: "Preparing Open WebUI...",
      openWebUIInstallSkipped:
        "Open WebUI is already installed. Installation skipped.",
      openWebUIInstallingLocal:
        "Installing Open WebUI in the local environment with uv.",
      openWebUIPythonPreparing:
        "Preparing a local Python environment for Open WebUI.",
      openWebUIReady: "Open WebUI is ready.",
      openWebUIServerStarting: "Starting Open WebUI connected to Ollama.",
      openWebUIStarted: "Open WebUI started.",
      openWebUIStarting: "Starting Open WebUI...",
      openWebUIStopped: "Open WebUI stopped.",
      openWebUIStopping: "Stopping Open WebUI...",
      openWebUIStartupWaiting: "Waiting for Open WebUI to start...",
      openWebUITimeout: "Open WebUI did not respond after 180 seconds.",
      ollamaAlreadyRunning: "Ollama is already running.",
      ollamaAlreadyInstalled: "Ollama is already installed.",
      ollamaAndOpenWebUIStarted: "Ollama and Open WebUI started.",
      ollamaExternalStop: "Ollama is running outside Assistia.",
      ollamaInstallDone: "Ollama installation complete.",
      ollamaInstallInstalling: "Downloading and installing Ollama...",
      ollamaInstallPreparing: "Preparing Ollama installation...",
      ollamaInstallSkipped: "Ollama is already installed. Installation skipped.",
      ollamaInstallScript:
        "Assistia is running the official Ollama installation script from ollama.com.",
      ollamaMissing: "Ollama is not installed.",
      ollamaPreparing: "Preparing Ollama...",
      ollamaReady: "Ollama is ready.",
      ollamaReadyForOpenWebUI: "Ollama is ready for Open WebUI.",
      ollamaServerStarting: "Starting the local Ollama server.",
      ollamaStarted: "Ollama services started.",
      ollamaStarting: "Starting Ollama...",
      ollamaStopped: "Ollama stopped.",
      ollamaStopping: "Stopping Ollama...",
      ollamaStartupWaiting: "Waiting for Ollama to start...",
      ollamaTimeout: "Ollama did not respond after 120 seconds.",
      pythonDetected: "Python 3.11 detected on the system.",
      pythonInstalling: "Installing Python 3.11...",
      pythonMissingInstallUv: "Python 3.11 is missing. Installing through uv.",
      servicesStopped: "Assistia services stopped.",
      fullInstallAlreadyDone: "All components are already installed.",
      fullInstallChecking:
        "Checking Ollama and Open WebUI before installation.",
      fullInstallDone: "Full installation complete.",
      fullInstallPreparing: "Preparing full installation...",
      fullInstallRunning: "Installing missing components.",
      uvInstalling: "Installing uv...",
      uvInstallingForPython:
        "Installing uv to fetch Python 3.11 if necessary."
    },
    status: {
      ariaLabel: "Service status",
      title: "Component list",
      running: "Running",
      stopped: "Off",
      notFound: "not found",
      services: {
        ollama: "Ollama",
        openWebUI: "Open WebUI"
      }
    }
  }
};
