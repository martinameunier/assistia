import {
  useCallback,
  useEffect,
  useMemo,
  useState
} from "react";

import {
  getComfyUIModelAvailability,
  type ImageGeneratorModelAvailability
} from "../services/tauris";
import {
  imageGeneratorModels
} from "../utils/imageGeneratorModels";

export function useImageGeneratorModelAvailability() {

  const [modelAvailability, setModelAvailability] =
    useState<ImageGeneratorModelAvailability[]>([]);

  const [isLoadingModelAvailability, setIsLoadingModelAvailability] =
    useState(true);

  const refreshModelAvailability =
    useCallback(async () => {
      setIsLoadingModelAvailability(true);

      try {
        const availability =
          await getComfyUIModelAvailability(imageGeneratorModels);

        setModelAvailability(availability);
      } catch {
        setModelAvailability([]);
      } finally {
        setIsLoadingModelAvailability(false);
      }
    }, []);

  useEffect(() => {
    refreshModelAvailability();
  }, [refreshModelAvailability]);

  const downloadedModels =
    useMemo(
      () => {
        const downloadedModelNames =
          new Set(
            modelAvailability
              .filter((model) => model.isDownloaded)
              .map((model) => model.name)
          );

        return imageGeneratorModels.filter((model) =>
          downloadedModelNames.has(model.name)
        );
      },
      [modelAvailability]
    );

  return {
    downloadedModels,
    isLoadingModelAvailability,
    modelAvailability,
    refreshModelAvailability
  };
}
