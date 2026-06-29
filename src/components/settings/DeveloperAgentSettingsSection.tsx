import React, {
  type FormEvent
} from "react";

import {
  Save
} from "lucide-react";

import type { Translations }
from "../../i18n";
import type {
  DeveloperAgentSettings
} from "../../services/tauris";
import type {
  SettingsFeedback
} from "../../types/launcher";
import LocalUrlField
from "./LocalUrlField";

const localOllamaUrl =
  "http://127.0.0.1:11434";

type Props = {
  developerAgentLabels: Translations["pages"]["developerAgent"]["settingsDialog"];
  feedback: SettingsFeedback;
  isLoadingSettings: boolean;
  isSavingSettings: boolean;
  settings: DeveloperAgentSettings;
  settingsLabels: Translations["settings"];
  onSettingChange: <Key extends keyof DeveloperAgentSettings>(
    key: Key,
    value: DeveloperAgentSettings[Key]
  ) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export default function DeveloperAgentSettingsSection({
  developerAgentLabels,
  feedback,
  isLoadingSettings,
  isSavingSettings,
  settings,
  settingsLabels,
  onSettingChange,
  onSubmit
}: Props) {

  const isDisabled =
    isSavingSettings || isLoadingSettings;

  return (
    <section className="settings-section" aria-labelledby="settings-agent-title">
      <div className="settings-section__header">
        <div>
          <h2 id="settings-agent-title">{settingsLabels.developerAgentTitle}</h2>
        </div>
      </div>

      <form
        className="settings-form settings-form--page"
        onSubmit={onSubmit}
      >
        <LocalUrlField
          disabled={isDisabled}
          label={developerAgentLabels.ollamaUrlLabel}
          localLabel={settingsLabels.localUrlCheckboxLabel}
          localValue={localOllamaUrl}
          placeholder={developerAgentLabels.ollamaUrlPlaceholder}
          useLocalValue={settings.useLocalOllamaUrl}
          value={settings.ollamaUrl}
          onChange={(value) =>
            onSettingChange("ollamaUrl", value)
          }
          onUseLocalValueChange={(value) =>
            onSettingChange("useLocalOllamaUrl", value)
          }
        />

        <label className="settings-field">
          <span>{developerAgentLabels.projectPathLabel}</span>
          <input
            type="text"
            value={settings.projectPath}
            disabled={isDisabled}
            onChange={(event) =>
              onSettingChange("projectPath", event.target.value)
            }
            placeholder={developerAgentLabels.projectPathPlaceholder}
            spellCheck={false}
          />
        </label>

        <label className="settings-field">
          <span>{developerAgentLabels.modelLabel}</span>
          <input
            type="text"
            value={settings.model}
            disabled={isDisabled}
            onChange={(event) =>
              onSettingChange("model", event.target.value)
            }
            placeholder={developerAgentLabels.modelPlaceholder}
            spellCheck={false}
          />
        </label>

        <div className="settings-section__actions">
          <button
            type="submit"
            className="settings-save-button"
            disabled={isDisabled}
          >
            <Save size={18} />
            <span>
              {isSavingSettings
                ? developerAgentLabels.saving
                : developerAgentLabels.save}
            </span>
          </button>
        </div>

        {feedback !== null && (
          <p
            className={
              feedback === "saved"
                ? "settings-feedback settings-feedback--saved"
                : "settings-feedback settings-feedback--error"
            }
          >
            {feedback === "saved"
              ? settingsLabels.developerAgentSaved
              : settingsLabels.developerAgentError}
          </p>
        )}
      </form>
    </section>
  );
}
