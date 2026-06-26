import React, {
  type FormEvent
} from "react";

import {
  Save
} from "lucide-react";

import type { Translations }
from "../../i18n";
import type {
  WebSearchSettings
} from "../../services/tauris";
import type {
  SettingsFeedback
} from "../../types/launcher";

type Props = {
  feedback: SettingsFeedback;
  isLoadingSettings: boolean;
  isSavingSettings: boolean;
  labels: Translations["settings"];
  settings: WebSearchSettings;
  onSettingChange: <Key extends keyof WebSearchSettings>(
    key: Key,
    value: WebSearchSettings[Key]
  ) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export default function WebSearchSettingsSection({
  feedback,
  isLoadingSettings,
  isSavingSettings,
  labels,
  settings,
  onSettingChange,
  onSubmit
}: Props) {

  return (
    <section className="settings-section" aria-labelledby="settings-web-search-title">
      <div className="settings-section__header">
        <div>
          <h2 id="settings-web-search-title">{labels.webSearchTitle}</h2>
          <p>{labels.webSearchHelp}</p>
        </div>
      </div>

      <form
        className="settings-form settings-form--page"
        onSubmit={onSubmit}
      >
        <label className="settings-checkbox-field">
          <input
            type="checkbox"
            checked={settings.enabled}
            disabled={isSavingSettings || isLoadingSettings}
            onChange={(event) =>
              onSettingChange("enabled", event.target.checked)
            }
          />
          <span>{labels.webSearchEnabledLabel}</span>
        </label>

        <label className="settings-field">
          <span>{labels.searxngUrlLabel}</span>
          <input
            type="url"
            value={settings.searxngUrl}
            disabled={isSavingSettings || isLoadingSettings}
            onChange={(event) =>
              onSettingChange("searxngUrl", event.target.value)
            }
            placeholder={labels.searxngUrlPlaceholder}
            spellCheck={false}
          />
        </label>

        <label className="settings-field">
          <span>{labels.webSearchMaxResultsLabel}</span>
          <input
            type="number"
            min={1}
            max={10}
            value={settings.maxResults}
            disabled={isSavingSettings || isLoadingSettings}
            onChange={(event) =>
              onSettingChange(
                "maxResults",
                Number.parseInt(event.target.value, 10) || 1
              )
            }
          />
        </label>

        <div className="settings-section__actions">
          <button
            type="submit"
            className="settings-save-button"
            disabled={isSavingSettings || isLoadingSettings}
          >
            <Save size={18} />
            <span>
              {isSavingSettings
                ? labels.webSearchSaving
                : labels.webSearchSave}
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
              ? labels.webSearchSaved
              : labels.webSearchError}
          </p>
        )}
      </form>
    </section>
  );
}
