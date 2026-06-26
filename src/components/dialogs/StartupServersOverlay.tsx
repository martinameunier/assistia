import React from "react";

import { X } from "lucide-react";

import type { Translations }
from "../../i18n";
import ProgressBar
from "../ProgressBar";

type Props = {
  error: string | null;
  labels: Translations["startup"];
  progress: number;
  progressLabels: Translations["progress"];
  status: string;
  onClose: () => void;
};

export default function StartupServersOverlay({
  error,
  labels,
  progress,
  progressLabels,
  status,
  onClose
}: Props) {

  const hasError =
    error !== null;

  return (
    <div className="settings-overlay startup-overlay" role="presentation">
      <section
        className="settings-panel startup-overlay__panel"
        role={hasError ? "alertdialog" : "dialog"}
        aria-modal="true"
        aria-labelledby="startup-overlay-title"
      >
        <div className="settings-panel__header">
          <h2 id="startup-overlay-title">
            {hasError ? labels.errorTitle : labels.title}
          </h2>

          {hasError && (
            <button
              type="button"
              className="settings-icon-button"
              onClick={onClose}
              aria-label={labels.close}
            >
              <X size={20} />
            </button>
          )}
        </div>

        <div className="startup-overlay__body">
          <p>{hasError ? labels.errorIntro : labels.intro}</p>

          <ProgressBar
            eta={null}
            labels={progressLabels}
            progress={progress}
            showDetails={false}
            speed={null}
            status={hasError ? labels.errorStatus : status}
          />

          {hasError && (
            <>
              <p className="settings-feedback settings-feedback--error">
                {error}
              </p>
              <div className="ollama-install-dialog__actions">
                <button
                  type="button"
                  className="settings-save-button"
                  onClick={onClose}
                >
                  {labels.close}
                </button>
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
