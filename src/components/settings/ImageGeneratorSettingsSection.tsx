import React, {
  type FormEvent
} from "react";

import {
  Save
} from "lucide-react";

import type { Translations }
from "../../i18n";
import type {
  ImageGeneratorSettings
} from "../../services/tauris";
import type {
  SettingsFeedback
} from "../../types/launcher";
import LocalUrlField
from "./LocalUrlField";

const localComfyUIUrl =
  "http://127.0.0.1:8188";

type Props = {
  feedback: SettingsFeedback;
  isLoadingSettings: boolean;
  isSavingSettings: boolean;
  labels: Translations["settings"];
  settings: ImageGeneratorSettings;
  onSettingChange: <Key extends keyof ImageGeneratorSettings>(
    key: Key,
    value: ImageGeneratorSettings[Key]
  ) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export default function ImageGeneratorSettingsSection({
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
    <section className="settings-section" aria-labelledby="settings-image-generator-title">
      <div className="settings-section__header">
        <div>
          <h2 id="settings-image-generator-title">{labels.imageGeneratorSettingsTitle}</h2>
          <p>{labels.imageGeneratorSettingsHelp}</p>
        </div>
      </div>

      <form
        className="settings-form settings-form--page"
        onSubmit={onSubmit}
      >
        <LocalUrlField
          disabled={isDisabled}
          label={labels.comfyuiUrlLabel}
          localLabel={labels.localUrlCheckboxLabel}
          localValue={localComfyUIUrl}
          placeholder={labels.comfyuiUrlPlaceholder}
          useLocalValue={settings.useLocalComfyuiUrl}
          value={settings.comfyuiUrl}
          onChange={(value) =>
            onSettingChange("comfyuiUrl", value)
          }
          onUseLocalValueChange={(value) =>
            onSettingChange("useLocalComfyuiUrl", value)
          }
        />

        <div className="settings-section__actions">
          <button
            type="submit"
            className="settings-save-button"
            disabled={isDisabled}
          >
            <Save size={18} />
            <span>
              {isSavingSettings
                ? labels.imageGeneratorSettingsSaving
                : labels.imageGeneratorSettingsSave}
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
              ? labels.imageGeneratorSettingsSaved
              : labels.imageGeneratorSettingsError}
          </p>
        )}
      </form>
    </section>
  );
}
