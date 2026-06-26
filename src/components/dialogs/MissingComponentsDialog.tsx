import React, {
  useState
} from "react";

import {
  CheckCircle2,
  Download,
  X
} from "lucide-react";

import type { Translations }
from "../../i18n";
import type {
  InstallableComponent,
  InstallationFeedback
} from "../../types/launcher";

export type MissingComponentsDialogItem = {
  help: string;
  isInstalled: boolean;
  key: InstallableComponent;
  title: string;
};

type Props = {
  closeLabel: string;
  components: MissingComponentsDialogItem[];
  feedback: InstallationFeedback;
  isInstalling: boolean;
  isStartupPromptDisabled: boolean;
  labels: Translations["missingComponentsDialog"];
  onChangeStartupPromptDisabled: (disabled: boolean) => void;
  onClose: () => void;
  onInstall: (components: InstallableComponent[]) => void;
};

export default function MissingComponentsDialog({
  closeLabel,
  components,
  feedback,
  isInstalling,
  isStartupPromptDisabled,
  labels,
  onChangeStartupPromptDisabled,
  onClose,
  onInstall
}: Props) {

  const [selectedComponents, setSelectedComponents] =
    useState<InstallableComponent[]>(
      () => components.map((component) => component.key)
    );

  const hasSelectedMissingComponent =
    components.some((component) =>
      !component.isInstalled && selectedComponents.includes(component.key)
    );

  function toggleComponent(componentKey: InstallableComponent) {
    setSelectedComponents((currentComponents) =>
      currentComponents.includes(componentKey)
        ? currentComponents.filter((key) => key !== componentKey)
        : [
            ...currentComponents,
            componentKey
          ]
    );
  }

  return (
    <div
      className="settings-overlay"
      role="presentation"
      onMouseDown={(event) => {
        if (!isInstalling && event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <section
        className="settings-panel missing-components-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="missing-components-title"
      >
        <div className="settings-panel__header">
          <h2 id="missing-components-title">
            {labels.title}
          </h2>
          <button
            type="button"
            className="settings-icon-button"
            onClick={onClose}
            disabled={isInstalling}
            aria-label={closeLabel}
          >
            <X size={20} />
          </button>
        </div>

        <div className="missing-components-dialog__body">
          <p>{labels.intro}</p>
          <p className="ollama-install-dialog__notice">
            {labels.notice}
          </p>
          <p>{labels.selectionHelp}</p>

          <div className="missing-components-dialog__list">
            {components.map((component) => {
              const isChecked =
                component.isInstalled
                || selectedComponents.includes(component.key);

              return (
                <label
                  key={component.key}
                  className="missing-components-dialog__item"
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    disabled={isInstalling || component.isInstalled}
                    onChange={() => toggleComponent(component.key)}
                  />
                  <span className="missing-components-dialog__item-text">
                    <strong>{component.title}</strong>
                    <span>{component.help}</span>
                  </span>
                  {component.isInstalled && (
                    <span className="missing-components-dialog__installed">
                      <CheckCircle2 size={16} />
                      {labels.installed}
                    </span>
                  )}
                </label>
              );
            })}
          </div>

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

          <label className="missing-components-dialog__startup-check">
            <input
              type="checkbox"
              checked={isStartupPromptDisabled}
              disabled={isInstalling}
              onChange={(event) => {
                onChangeStartupPromptDisabled(event.target.checked);
              }}
            />
            <span>{labels.doNotShowAgain}</span>
          </label>

          <div className="ollama-install-dialog__actions">
            <button
              type="button"
              className="secondary-button"
              onClick={onClose}
              disabled={isInstalling}
            >
              {labels.later}
            </button>
            <button
              type="button"
              className="settings-save-button"
              onClick={() => onInstall(selectedComponents)}
              disabled={isInstalling || !hasSelectedMissingComponent}
            >
              {isInstalling ? (
                <>
                  <span className="button-loader" aria-hidden="true" />
                  <span>{labels.installing}</span>
                </>
              ) : (
                <>
                  <Download size={18} />
                  <span>{labels.install}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
