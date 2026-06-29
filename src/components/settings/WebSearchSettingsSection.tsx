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
import LocalUrlField
from "./LocalUrlField";

const localSearXNGUrl =
  "http://127.0.0.1:8888";

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

  const isDisabled =
    isSavingSettings || isLoadingSettings;

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
            disabled={isDisabled}
            onChange={(event) =>
              onSettingChange("enabled", event.target.checked)
            }
          />
          <span>{labels.webSearchEnabledLabel}</span>
        </label>

        <LocalUrlField
          disabled={isDisabled}
          label={labels.searxngUrlLabel}
          localLabel={labels.localUrlCheckboxLabel}
          localValue={localSearXNGUrl}
          placeholder={labels.searxngUrlPlaceholder}
          useLocalValue={settings.useLocalSearxngUrl}
          value={settings.searxngUrl}
          onChange={(value) =>
            onSettingChange("searxngUrl", value)
          }
          onUseLocalValueChange={(value) =>
            onSettingChange("useLocalSearxngUrl", value)
          }
        />

        <label className="settings-field">
          <span>{labels.webSearchMaxResultsLabel}</span>
          <input
            type="number"
            min={1}
            max={10}
            value={settings.maxResults}
            disabled={isDisabled}
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
            disabled={isDisabled}
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
