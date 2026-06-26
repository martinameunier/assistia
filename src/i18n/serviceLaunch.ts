export const serviceLaunchTranslations = {
  fr: {
    actions: {
      ariaLabel: "Actions de l'application",
      openInterface: "Ouvrir le chat",
      openDocumentation: "Accéder à la documentation",
      patreon: "Patreon"
    },
    navigation: {
      ariaLabel: "Navigation principale",
      collapse: "Réduire le menu",
      expand: "Déployer le menu",
      chat: "Chat",
      imageGenerator: "Générateur d'image",
      developerAgent: "Agent développeur - Bêta",
      settings: "Paramètres",
      documentation: "Documentation",
      license: "Licence",
      logs: "Logs"
    },
    language: {
      label: "Langue",
      french: "Français",
      english: "Anglais"
    },
    alert: {
      ollamaInstall: "Installer les composants manquants",
      ollamaMissing: "Ollama n'est pas installé. Assistia peut lancer l'installation officielle d'Ollama.",
      ollamaTermsNotice: "Ollama reste un logiciel tiers soumis à ses propres conditions d'utilisation.",
      runtimeUnavailable: "Ollama n'est pas encore démarré. Assistia tente de lancer le service local automatiquement.",
      openWebUINotice: "Le chat intégré utilisera les modèles Ollama installés sur votre machine."
    },
    progress: {
      ariaLabel: "Téléchargement et démarrage Assistia",
      title: "Téléchargement du modèle Ollama",
      speed: "Vitesse",
      eta: "Temps estimé",
      calculating: "calcul en cours",
      preparing: "Préparation d'Ollama...",
      stopping: "Arrêt d'Ollama..."
    },
    startup: {
      title: "Démarrage des serveurs locaux",
      intro: "Assistia démarre les services nécessaires au chat, au générateur d'image et à la recherche web.",
      preparing: "Préparation du démarrage des serveurs...",
      ready: "Serveurs locaux prêts.",
      errorTitle: "Démarrage incomplet",
      errorIntro: "Un des serveurs n'a pas pu démarrer automatiquement.",
      errorStatus: "Démarrage interrompu",
      close: "Continuer"
    },
    missingComponentsDialog: {
      title: "Installer les composants locaux",
      intro: "Certains composants locaux ne sont pas encore installés. Assistia peut préparer l'environnement maintenant.",
      notice: "Une connexion Internet est nécessaire. Si curl est absent sur macOS ou Linux, Assistia tente de l'installer automatiquement avant de continuer.",
      selectionHelp: "Choisissez les composants à installer. Tout est sélectionné par défaut.",
      installed: "Déjà installé",
      doNotShowAgain: "Ne plus afficher automatiquement cette fenêtre au démarrage",
      install: "Installer les composants",
      installing: "Installation...",
      later: "Plus tard",
      started: "Composants installés. Les serveurs vont démarrer.",
      error: "Impossible de terminer l'installation."
    },
    licenseDialog: {
      title: "Licences et responsabilités",
      intro: "Assistia est distribué librement et s'appuie sur plusieurs outils tiers.",
      assistiaTitle: "Assistia",
      assistiaText: "Assistia est sous licence Apache 2.0.",
      apacheLicense: "Licence Apache 2.0",
      toolsTitle: "Outils utilisés",
      toolsText: "Les outils utilisés par Assistia disposent de leurs propres licences.",
      ollamaLicense: "Licence Ollama",
      aiderLicense: "Licence Aider",
      comfyuiLicense: "Licence ComfyUI",
      modelsTitle: "Modèles IA",
      modelsText: "Assistia se base sur des modèles IA qui disposent également de leur licence. Merci de vous renseigner sur cette dernière avant leur utilisation.",
      liabilityTitle: "Responsabilité",
      liabilityText: "Assistia étant distribué librement, l'auteur du logiciel ne peut être tenu responsable en cas de mauvaise utilisation des logiciels proposés ou de tout dommage occasionné par leur utilisation.",
      close: "Fermer"
    },
    logs: {
      ariaLabel: "Journal Assistia",
      waiting: "En attente des premières informations..."
    },
    pages: {
      logs: {
        kicker: "Journal",
        title: "Logs",
        subtitle: "Journal d'activité de l'application."
      },
      settings: {
        kicker: "Configuration",
        title: "Paramètres",
        subtitle: "Réglages de l'application et des modules locaux."
      }
    },
    status: {
      ariaLabel: "Statut des services",
      title: "Liste des composants",
      running: "Démarré",
      stopped: "Éteint",
      notFound: "introuvable",
      services: {
        ollama: "Ollama",
        openWebUI: "Open WebUI",
        comfyUI: "Générateur d'image",
        developerAgent: "Agent développeur",
        searxng: "Recherche web"
      }
    },
    runtime: {
      modelDownloading: "Téléchargement du modèle Ollama...",
      modelReady: "Modèle Ollama prêt.",
      modelRetrieving: "Récupération du modèle Ollama...",
      openWebUIAlreadyRunning: "Open WebUI est déjà en cours d'exécution.",
      openWebUIExternalStop: "Open WebUI est lancé hors d'Assistia.",
      openWebUIReady: "Open WebUI est prêt.",
      openWebUIServerStarting: "Démarrage d'Open WebUI connecté à Ollama.",
      openWebUIStarted: "Open WebUI démarré.",
      openWebUIStarting: "Démarrage d'Open WebUI...",
      openWebUIStopped: "Open WebUI arrêté.",
      openWebUIStopping: "Arrêt d'Open WebUI...",
      openWebUIStartupWaiting: "Attente du démarrage d'Open WebUI...",
      openWebUITimeout: "Open WebUI ne répond pas après 180 secondes.",
      ollamaAlreadyRunning: "Ollama est déjà en cours d'exécution.",
      ollamaAndOpenWebUIStarted: "Ollama et Open WebUI démarrés.",
      ollamaExternalStop: "Ollama est lancé hors d'Assistia.",
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
      servicesStopped: "Services Assistia arrêtés."
    }
  },
  en: {
    actions: {
      ariaLabel: "Application actions",
      openInterface: "Open chat",
      openDocumentation: "Open documentation",
      patreon: "Patreon"
    },
    navigation: {
      ariaLabel: "Main navigation",
      collapse: "Collapse menu",
      expand: "Expand menu",
      chat: "Chat",
      imageGenerator: "Image generator",
      developerAgent: "Developer agent - beta",
      settings: "Settings",
      documentation: "Documentation",
      license: "License",
      logs: "Logs"
    },
    language: {
      label: "Language",
      french: "French",
      english: "English"
    },
    alert: {
      ollamaInstall: "Install missing components",
      ollamaMissing: "Ollama is not installed. Assistia can launch the official Ollama installation.",
      ollamaTermsNotice: "Ollama remains third-party software subject to its own terms of use.",
      runtimeUnavailable: "Ollama is not running yet. Assistia tries to start the local service automatically.",
      openWebUINotice: "The built-in chat will use the Ollama models installed on your machine."
    },
    progress: {
      ariaLabel: "Assistia download and startup",
      title: "Downloading Ollama model",
      speed: "Speed",
      eta: "Estimated time",
      calculating: "calculating",
      preparing: "Preparing Ollama...",
      stopping: "Stopping Ollama..."
    },
    startup: {
      title: "Starting local servers",
      intro: "Assistia is starting the services required for chat, image generation, and web search.",
      preparing: "Preparing local server startup...",
      ready: "Local servers ready.",
      errorTitle: "Startup incomplete",
      errorIntro: "One of the servers could not start automatically.",
      errorStatus: "Startup interrupted",
      close: "Continue"
    },
    missingComponentsDialog: {
      title: "Install local components",
      intro: "Some local components are not installed yet. Assistia can prepare the environment now.",
      notice: "An internet connection is required. If curl is missing on macOS or Linux, Assistia tries to install it automatically before continuing.",
      selectionHelp: "Choose the components to install. Everything is selected by default.",
      installed: "Already installed",
      doNotShowAgain: "Do not show this window automatically at startup",
      install: "Install components",
      installing: "Installing...",
      later: "Later",
      started: "Components installed. The servers will start.",
      error: "Unable to complete installation."
    },
    licenseDialog: {
      title: "Licenses and responsibility",
      intro: "Assistia is freely distributed and relies on several third-party tools.",
      assistiaTitle: "Assistia",
      assistiaText: "Assistia is licensed under Apache 2.0.",
      apacheLicense: "Apache 2.0 license",
      toolsTitle: "Used tools",
      toolsText: "The tools used by Assistia have their own licenses.",
      ollamaLicense: "Ollama license",
      aiderLicense: "Aider license",
      comfyuiLicense: "ComfyUI license",
      modelsTitle: "AI models",
      modelsText: "Assistia relies on AI models that also have their own licenses. Please review each model license before using it.",
      liabilityTitle: "Responsibility",
      liabilityText: "Because Assistia is freely distributed, the author of the software cannot be held responsible for misuse of the proposed software or for any damage caused by its use.",
      close: "Close"
    },
    logs: {
      ariaLabel: "Assistia logs",
      waiting: "Waiting for the first messages..."
    },
    pages: {
      logs: {
        kicker: "Journal",
        title: "Logs",
        subtitle: "Application activity log."
      },
      settings: {
        kicker: "Configuration",
        title: "Settings",
        subtitle: "Application and local module settings."
      }
    },
    status: {
      ariaLabel: "Service status",
      title: "Component list",
      running: "Running",
      stopped: "Off",
      notFound: "not found",
      services: {
        ollama: "Ollama",
        openWebUI: "Open WebUI",
        comfyUI: "Image generator",
        developerAgent: "Developer agent",
        searxng: "Web search"
      }
    },
    runtime: {
      modelDownloading: "Downloading Ollama model...",
      modelReady: "Ollama model ready.",
      modelRetrieving: "Retrieving Ollama model...",
      openWebUIAlreadyRunning: "Open WebUI is already running.",
      openWebUIExternalStop: "Open WebUI is running outside Assistia.",
      openWebUIReady: "Open WebUI is ready.",
      openWebUIServerStarting: "Starting Open WebUI connected to Ollama.",
      openWebUIStarted: "Open WebUI started.",
      openWebUIStarting: "Starting Open WebUI...",
      openWebUIStopped: "Open WebUI stopped.",
      openWebUIStopping: "Stopping Open WebUI...",
      openWebUIStartupWaiting: "Waiting for Open WebUI to start...",
      openWebUITimeout: "Open WebUI did not respond after 180 seconds.",
      ollamaAlreadyRunning: "Ollama is already running.",
      ollamaAndOpenWebUIStarted: "Ollama and Open WebUI started.",
      ollamaExternalStop: "Ollama is running outside Assistia.",
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
      servicesStopped: "Assistia services stopped."
    }
  }
} as const;
