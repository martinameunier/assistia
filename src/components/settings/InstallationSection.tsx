import React from "react";

import {
  CheckCircle2,
  Download,
  XCircle
} from "lucide-react";

import type { Translations }
from "../../i18n";
import type {
  InstallationFeedback,
  PendingInstallationAction
} from "../../types/launcher";

type Props = {
  installationFeedback: InstallationFeedback;
  isComfyUIInstalled: boolean;
  isDeveloperAgentInstalled: boolean;
  isRequiredComponentsInstalled: boolean;
  isSearXNGInstalled: boolean;
  labels: Translations["settings"];
  pendingInstallationAction: PendingInstallationAction;
  onInstallAll: () => void;
  onInstallDeveloperAgent: () => void;
  onInstallImageGenerator: () => void;
  onInstallRequiredComponents: () => void;
  onInstallWebSearch: () => void;
};

export default function InstallationSection({
  installationFeedback,
  isComfyUIInstalled,
  isDeveloperAgentInstalled,
  isRequiredComponentsInstalled,
  isSearXNGInstalled,
  labels,
  pendingInstallationAction,
  onInstallAll,
  onInstallDeveloperAgent,
  onInstallImageGenerator,
  onInstallRequiredComponents,
  onInstallWebSearch
}: Props) {

  const installationItems = [
    {
      key: "required",
      title: labels.requiredComponentsTitle,
      help: labels.requiredComponentsHelp,
      isInstalled: isRequiredComponentsInstalled,
      onInstall: onInstallRequiredComponents
    },
    {
      key: "image-generator",
      title: labels.imageGeneratorComponentTitle,
      help: labels.imageGeneratorComponentHelp,
      isInstalled: isComfyUIInstalled,
      onInstall: onInstallImageGenerator
    },
    {
      key: "developer-agent",
      title: labels.developerAgentComponentTitle,
      help: labels.developerAgentComponentHelp,
      isInstalled: isDeveloperAgentInstalled,
      onInstall: onInstallDeveloperAgent
    },
    {
      key: "web-search",
      title: labels.webSearchComponentTitle,
      help: labels.webSearchComponentHelp,
      isInstalled: isSearXNGInstalled,
      onInstall: onInstallWebSearch
    }
  ] as const;

  const isInstallationBusy =
    pendingInstallationAction !== null;

  const hasMissingInstallationComponent =
    installationItems.some((item) => !item.isInstalled);

  return (
    <section className="settings-section" aria-labelledby="settings-install-title">
      <div className="settings-section__header">
        <div>
          <h2 id="settings-install-title">{labels.installTitle}</h2>
          <p>{labels.installHelp}</p>
        </div>

        <button
          type="button"
          className="settings-save-button"
          disabled={isInstallationBusy || !hasMissingInstallationComponent}
          onClick={onInstallAll}
        >
          {pendingInstallationAction === "all" ? (
            <span className="button-loader" aria-hidden="true" />
          ) : (
            <Download size={18} />
          )}
          <span>
            {pendingInstallationAction === "all"
              ? labels.installingAll
              : hasMissingInstallationComponent
                ? labels.installAll
                : labels.allComponentsInstalled}
          </span>
        </button>
      </div>

      <div className="settings-install-list">
        {installationItems.map((item) => {
          const isInstallingItem =
            pendingInstallationAction === item.key;

          return (
            <div className="settings-install-row" key={item.key}>
              <div className="settings-install-row__main">
                <div>
                  <strong>{item.title}</strong>
                  <p>{item.help}</p>
                </div>

                <span
                  className={
                    item.isInstalled
                      ? "settings-model-row__status settings-model-row__status--ready"
                      : "settings-model-row__status"
                  }
                >
                  {item.isInstalled ? (
                    <CheckCircle2 size={16} />
                  ) : (
                    <XCircle size={16} />
                  )}
                  {item.isInstalled
                    ? labels.componentInstalled
                    : labels.componentMissing}
                </span>
              </div>

              {!item.isInstalled && (
                <button
                  type="button"
                  className="settings-save-button"
                  disabled={isInstallationBusy}
                  onClick={item.onInstall}
                >
                  {isInstallingItem ? (
                    <span className="button-loader" aria-hidden="true" />
                  ) : (
                    <Download size={18} />
                  )}
                  <span>
                    {isInstallingItem
                      ? labels.installingComponent
                      : labels.installComponent}
                  </span>
                </button>
              )}
            </div>
          );
        })}
      </div>

      {installationFeedback !== null && (
        <p
          className={
            installationFeedback === "started"
              ? "settings-feedback settings-feedback--saved"
              : "settings-feedback settings-feedback--error"
          }
        >
          {installationFeedback === "started"
            ? labels.installStarted
            : labels.installError}
        </p>
      )}
    </section>
  );
}
