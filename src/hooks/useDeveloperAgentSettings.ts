import {
  useEffect,
  useState,
  type FormEvent
} from "react";

import {
  getDeveloperAgentSettings,
  setDeveloperAgentSettings as saveDeveloperAgentSettingsToBackend,
  type DeveloperAgentSettings
} from "../services/tauris";
import type {
  SettingsFeedback
} from "../types/launcher";

const defaultDeveloperAgentSettings: DeveloperAgentSettings = {
  model: "qwen2.5-coder:7b",
  ollamaUrl: "http://127.0.0.1:11434",
  projectPath: "",
  useLocalOllamaUrl: true
};

const localOllamaUrl =
  defaultDeveloperAgentSettings.ollamaUrl;

export function useDeveloperAgentSettings() {

  const [developerAgentSettings, setDeveloperAgentSettings] =
    useState<DeveloperAgentSettings>(defaultDeveloperAgentSettings);

  const [developerAgentSettingsFeedback, setDeveloperAgentSettingsFeedback] =
    useState<SettingsFeedback>(null);

  const [isLoadingDeveloperAgentSettings, setIsLoadingDeveloperAgentSettings] =
    useState(true);

  const [isSavingDeveloperAgentSettings, setIsSavingDeveloperAgentSettings] =
    useState(false);

  useEffect(() => {

    let isMounted =
      true;

    async function loadSettings() {

      try {
        const loadedSettings =
          await getDeveloperAgentSettings();

        if (isMounted) {
          setDeveloperAgentSettings({
            ...loadedSettings,
            ollamaUrl: loadedSettings.useLocalOllamaUrl
              ? localOllamaUrl
              : loadedSettings.ollamaUrl
          });
        }
      } finally {
        if (isMounted) {
          setIsLoadingDeveloperAgentSettings(false);
        }
      }
    }

    loadSettings();

    return () => {
      isMounted = false;
    };
  }, []);

  async function saveDeveloperAgentSettings(event: FormEvent<HTMLFormElement>) {

    event.preventDefault();
    setIsSavingDeveloperAgentSettings(true);
    setDeveloperAgentSettingsFeedback(null);

    try {
      await saveDeveloperAgentSettingsToBackend(developerAgentSettings);
      setDeveloperAgentSettingsFeedback("saved");
    } catch {
      setDeveloperAgentSettingsFeedback("error");
    } finally {
      setIsSavingDeveloperAgentSettings(false);
    }
  }

  function updateDeveloperAgentSetting<Key extends keyof DeveloperAgentSettings>(
    key: Key,
    value: DeveloperAgentSettings[Key]
  ) {

    setDeveloperAgentSettings((settings) => ({
      ...settings,
      [key]: value
    }));
    setDeveloperAgentSettingsFeedback(null);
  }

  return {
    developerAgentSettings,
    developerAgentSettingsFeedback,
    isLoadingDeveloperAgentSettings,
    isSavingDeveloperAgentSettings,
    saveDeveloperAgentSettings,
    updateDeveloperAgentSetting
  };
}
