import {
  useCallback,
  useEffect,
  useState
} from "react";

import {
  listOllamaModels,
  type OllamaInstalledModel
} from "../services/tauris";

export function useChatModelAvailability() {

  const [installedModels, setInstalledModels] =
    useState<OllamaInstalledModel[]>([]);

  const [isLoadingModelAvailability, setIsLoadingModelAvailability] =
    useState(true);

  const refreshModelAvailability =
    useCallback(async () => {
      setIsLoadingModelAvailability(true);

      try {
        const models =
          await listOllamaModels();

        setInstalledModels(models);
      } catch {
        setInstalledModels([]);
      } finally {
        setIsLoadingModelAvailability(false);
      }
    }, []);

  useEffect(() => {
    refreshModelAvailability();
  }, [refreshModelAvailability]);

  return {
    installedModels,
    isLoadingModelAvailability,
    refreshModelAvailability
  };
}
