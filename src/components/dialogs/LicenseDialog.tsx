import React from "react";

import {
  ExternalLink,
  Scale,
  X
} from "lucide-react";

import type { Translations }
from "../../i18n";

type Props = {
  labels: Translations["licenseDialog"];
  onClose: () => void;
  onOpenLink: (url: string) => void;
};

const licenseLinks = {
  apache: "https://www.apache.org/licenses/LICENSE-2.0",
  aider: "https://github.com/Aider-AI/aider/blob/main/LICENSE.txt",
  comfyui: "https://github.com/Comfy-Org/ComfyUI/blob/master/LICENSE",
  ollama: "https://github.com/ollama/ollama/blob/main/LICENSE"
};

export default function LicenseDialog({
  labels,
  onClose,
  onOpenLink
}: Props) {

  function renderLink(label: string, url: string) {
    return (
      <button
        type="button"
        className="secondary-button license-dialog__link"
        onClick={() => onOpenLink(url)}
      >
        <ExternalLink size={16} />
        <span>{label}</span>
      </button>
    );
  }

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
        className="settings-panel license-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="license-dialog-title"
      >
        <div className="settings-panel__header">
          <div>
            <h2 id="license-dialog-title">
              {labels.title}
            </h2>
            <p>{labels.intro}</p>
          </div>

          <button
            type="button"
            className="settings-icon-button"
            onClick={onClose}
            aria-label={labels.close}
          >
            <X size={20} />
          </button>
        </div>

        <div className="license-dialog__body">
          <section className="license-dialog__section">
            <h3>
              <Scale size={18} />
              <span>{labels.assistiaTitle}</span>
            </h3>
            <p>{labels.assistiaText}</p>
            <div className="license-dialog__links">
              {renderLink(labels.apacheLicense, licenseLinks.apache)}
            </div>
          </section>

          <section className="license-dialog__section">
            <h3>{labels.toolsTitle}</h3>
            <p>{labels.toolsText}</p>
            <div className="license-dialog__links">
              {renderLink(labels.ollamaLicense, licenseLinks.ollama)}
              {renderLink(labels.aiderLicense, licenseLinks.aider)}
              {renderLink(labels.comfyuiLicense, licenseLinks.comfyui)}
            </div>
          </section>

          <section className="license-dialog__section">
            <h3>{labels.modelsTitle}</h3>
            <p>{labels.modelsText}</p>
          </section>

          <section className="license-dialog__section license-dialog__section--warning">
            <h3>{labels.liabilityTitle}</h3>
            <p>{labels.liabilityText}</p>
          </section>
        </div>
      </section>
    </div>
  );
}
