import React from "react";

import { X } from "lucide-react";

import type { Translations } from "../../i18n";
import type { InstallationFeedback } from "../../types/launcher";

type Props = {
  canStartInstallation: boolean;
  closeLabel: string;
  feedback: InstallationFeedback;
  hasConfirmedTerms: boolean;
  isInstalling: boolean;
  labels: Translations["ollamaInstallDialog"];
  onClose: () => void;
  onConfirmTermsChange: (checked: boolean) => void;
  onOpenInstallation: () => void;
  onOpenTerms: () => void;
  onStartInstallation: () => void;
};

export default function OllamaInstallDialog({
  canStartInstallation,
  closeLabel,
  feedback,
  hasConfirmedTerms,
  isInstalling,
  labels,
  onClose,
  onConfirmTermsChange,
  onOpenInstallation,
  onOpenTerms,
  onStartInstallation
}: Props) {

  return (
    <div
      className="settings-overlay"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
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
            {labels.title}
          </h2>
          <button
            type="button"
            className="settings-icon-button"
            onClick={onClose}
            aria-label={closeLabel}
          >
            <X size={20} />
          </button>
        </div>

        <div className="ollama-install-dialog__body">
          <p>{labels.intro}</p>
          <p>{labels.requirement}</p>
          <p className="ollama-install-dialog__notice">
            {labels.responsibility}
          </p>

          <div className="ollama-install-dialog__links">
            <button
              type="button"
              className="secondary-button"
              onClick={onOpenTerms}
            >
              {labels.officialTerms}
            </button>
            <button
              type="button"
              className="secondary-button"
              onClick={onOpenInstallation}
            >
              {labels.officialInstall}
            </button>
          </div>

          <label className="ollama-install-dialog__check">
            <input
              type="checkbox"
              checked={hasConfirmedTerms}
              disabled={isInstalling}
              onChange={(event) =>
                onConfirmTermsChange(event.target.checked)
              }
            />
            <span>{labels.confirmation}</span>
          </label>

          {feedback !== null && (
            <p
              className={
                feedback === "started"
                  ? "settings-feedback settings-feedback--saved"
                  : "settings-feedback settings-feedback--error"
              }
            >
              {feedback === "started"
                ? labels.started
                : labels.error}
            </p>
          )}

          <div className="ollama-install-dialog__actions">
            <button
              type="button"
              className="secondary-button"
              onClick={onClose}
              disabled={isInstalling}
            >
              {labels.cancel}
            </button>
            <button
              type="button"
              className="settings-save-button"
              onClick={onStartInstallation}
              disabled={!canStartInstallation}
            >
              {isInstalling ? (
                <>
                  <span className="button-loader" aria-hidden="true" />
                  <span className="sr-only">
                    {labels.installing}
                  </span>
                </>
              ) : (
                labels.install
              )}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
