import {
  useEffect,
  useState,
  type FormEvent
} from "react";

import {
  getWebSearchSettings,
  setWebSearchSettings as saveWebSearchSettingsToBackend,
  type WebSearchSettings
} from "../services/tauris";
import type {
  SettingsFeedback
} from "../types/launcher";

const defaultWebSearchSettings: WebSearchSettings = {
  enabled: false,
  maxResults: 5,
  searxngUrl: "http://127.0.0.1:8888",
  useLocalSearxngUrl: true
};

const localSearXNGUrl =
  defaultWebSearchSettings.searxngUrl;

export function useWebSearchSettings() {

  const [webSearchSettings, setWebSearchSettings] =
    useState<WebSearchSettings>(defaultWebSearchSettings);

  const [webSearchSettingsFeedback, setWebSearchSettingsFeedback] =
    useState<SettingsFeedback>(null);

  const [isLoadingWebSearchSettings, setIsLoadingWebSearchSettings] =
    useState(true);

  const [isSavingWebSearchSettings, setIsSavingWebSearchSettings] =
    useState(false);

  useEffect(() => {

    let isMounted =
      true;

    async function loadSettings() {

      try {
        const loadedSettings =
          await getWebSearchSettings();

        if (isMounted) {
          setWebSearchSettings({
            ...loadedSettings,
            searxngUrl: loadedSettings.useLocalSearxngUrl
              ? localSearXNGUrl
              : loadedSettings.searxngUrl
          });
        }
      } finally {
        if (isMounted) {
          setIsLoadingWebSearchSettings(false);
        }
      }
    }

    loadSettings();

    return () => {
      isMounted = false;
    };
  }, []);

  async function saveWebSearchSettings(event: FormEvent<HTMLFormElement>) {

    event.preventDefault();
    setIsSavingWebSearchSettings(true);
    setWebSearchSettingsFeedback(null);

    try {
      await saveWebSearchSettingsToBackend(webSearchSettings);
      setWebSearchSettingsFeedback("saved");
    } catch {
      setWebSearchSettingsFeedback("error");
    } finally {
      setIsSavingWebSearchSettings(false);
    }
  }

  function updateWebSearchSetting<Key extends keyof WebSearchSettings>(
    key: Key,
    value: WebSearchSettings[Key]
  ) {

    setWebSearchSettings((settings) => ({
      ...settings,
      [key]: value
    }));
    setWebSearchSettingsFeedback(null);
  }

  return {
    isLoadingWebSearchSettings,
    isSavingWebSearchSettings,
    saveWebSearchSettings,
    updateWebSearchSetting,
    webSearchSettings,
    webSearchSettingsFeedback
  };
}
