import {
  useState
} from "react";

import {
  deleteComfyUIModelFiles,
  downloadComfyUIModelFiles
} from "../services/tauris";
import type {
  ImageGeneratorModelAction,
  ImageGeneratorModelActionFeedback
} from "../types/launcher";
import type {
  ImageGeneratorModel
} from "../utils/imageGeneratorModels";

type Options = {
  clearLogs: () => void;
  deleteStatus: string;
  downloadStatus: string;
  refreshModelAvailability: () => Promise<void>;
  setProgress: (value: number) => void;
  setStatus: (value: string) => void;
};

export function useImageGeneratorModelActions({
  clearLogs,
  deleteStatus,
  downloadStatus,
  refreshModelAvailability,
  setProgress,
  setStatus
}: Options) {

  const [imageModelAction, setImageModelAction] =
    useState<ImageGeneratorModelAction>(null);

  const [imageModelActionFeedback, setImageModelActionFeedback] =
    useState<ImageGeneratorModelActionFeedback>(null);

  const isImageModelActionBusy =
    imageModelAction !== null;

  function startModelAction(status: string) {

    clearLogs();
    setProgress(0);
    setStatus(status);
    setImageModelActionFeedback(null);
  }

  async function downloadImageModel(model: ImageGeneratorModel) {

    if (isImageModelActionBusy) {
      return;
    }

    setImageModelAction({
      modelName: model.name,
      type: "download"
    });
    startModelAction(downloadStatus);

    try {
      await downloadComfyUIModelFiles(model.downloads);
      await refreshModelAvailability();
      setImageModelActionFeedback("downloaded");
    } catch {
      setImageModelActionFeedback("downloadError");
    } finally {
      setImageModelAction(null);
    }
  }

  async function deleteImageModel(model: ImageGeneratorModel) {

    if (isImageModelActionBusy) {
      return;
    }

    setImageModelAction({
      modelName: model.name,
      type: "delete"
    });
    startModelAction(deleteStatus);

    try {
      await deleteComfyUIModelFiles(model.downloads);
      await refreshModelAvailability();
      setImageModelActionFeedback("deleted");
    } catch {
      setImageModelActionFeedback("deleteError");
    } finally {
      setImageModelAction(null);
    }
  }

  return {
    deleteImageModel,
    downloadImageModel,
    imageModelAction,
    imageModelActionFeedback,
    isImageModelActionBusy
  };
}
