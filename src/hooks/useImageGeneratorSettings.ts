import {
  useEffect,
  useState,
  type FormEvent
} from "react";

import {
  getImageGeneratorSettings,
  setImageGeneratorSettings as saveImageGeneratorSettingsToBackend,
  type ImageGeneratorSettings
} from "../services/tauris";
import type {
  SettingsFeedback
} from "../types/launcher";

const defaultImageGeneratorSettings: ImageGeneratorSettings = {
  comfyuiUrl: "http://127.0.0.1:8188",
  useLocalComfyuiUrl: true
};

const localComfyUIUrl =
  defaultImageGeneratorSettings.comfyuiUrl;

export function useImageGeneratorSettings() {

  const [imageGeneratorSettings, setImageGeneratorSettings] =
    useState<ImageGeneratorSettings>(defaultImageGeneratorSettings);

  const [imageGeneratorSettingsFeedback, setImageGeneratorSettingsFeedback] =
    useState<SettingsFeedback>(null);

  const [isLoadingImageGeneratorSettings, setIsLoadingImageGeneratorSettings] =
    useState(true);

  const [isSavingImageGeneratorSettings, setIsSavingImageGeneratorSettings] =
    useState(false);

  useEffect(() => {

    let isMounted =
      true;

    async function loadSettings() {

      try {
        const loadedSettings =
          await getImageGeneratorSettings();

        if (isMounted) {
          setImageGeneratorSettings({
            ...loadedSettings,
            comfyuiUrl: loadedSettings.useLocalComfyuiUrl
              ? localComfyUIUrl
              : loadedSettings.comfyuiUrl
          });
        }
      } finally {
        if (isMounted) {
          setIsLoadingImageGeneratorSettings(false);
        }
      }
    }

    loadSettings();

    return () => {
      isMounted = false;
    };
  }, []);

  async function saveImageGeneratorSettings(event: FormEvent<HTMLFormElement>) {

    event.preventDefault();
    setIsSavingImageGeneratorSettings(true);
    setImageGeneratorSettingsFeedback(null);

    try {
      await saveImageGeneratorSettingsToBackend(imageGeneratorSettings);
      setImageGeneratorSettingsFeedback("saved");
    } catch {
      setImageGeneratorSettingsFeedback("error");
    } finally {
      setIsSavingImageGeneratorSettings(false);
    }
  }

  function updateImageGeneratorSetting<Key extends keyof ImageGeneratorSettings>(
    key: Key,
    value: ImageGeneratorSettings[Key]
  ) {

    setImageGeneratorSettings((settings) => ({
      ...settings,
      [key]: value
    }));
    setImageGeneratorSettingsFeedback(null);
  }

  return {
    imageGeneratorSettings,
    imageGeneratorSettingsFeedback,
    isLoadingImageGeneratorSettings,
    isSavingImageGeneratorSettings,
    saveImageGeneratorSettings,
    updateImageGeneratorSetting
  };
}
