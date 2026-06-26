import {
  useState
} from "react";

import {
  deleteOllamaModel,
  pullOllamaModel
} from "../services/tauris";
import type {
  ChatModelAction,
  ChatModelActionFeedback
} from "../types/launcher";
import type {
  ChatModel
} from "../utils/chatModels";

type Options = {
  clearLogs: () => void;
  deleteStatus: string;
  downloadStatus: string;
  refreshModelAvailability: () => Promise<void>;
  setProgress: (value: number) => void;
  setStatus: (value: string) => void;
};

export function useChatModelActions({
  clearLogs,
  deleteStatus,
  downloadStatus,
  refreshModelAvailability,
  setProgress,
  setStatus
}: Options) {

  const [chatModelAction, setChatModelAction] =
    useState<ChatModelAction>(null);

  const [chatModelActionFeedback, setChatModelActionFeedback] =
    useState<ChatModelActionFeedback>(null);

  const isChatModelActionBusy =
    chatModelAction !== null;

  function startModelAction(status: string) {

    clearLogs();
    setProgress(0);
    setStatus(status);
    setChatModelActionFeedback(null);
  }

  async function downloadChatModel(modelName: string) {

    const trimmedModelName =
      modelName.trim();

    if (trimmedModelName === "" || isChatModelActionBusy) {
      return;
    }

    setChatModelAction({
      modelName: trimmedModelName,
      type: "download"
    });
    startModelAction(downloadStatus);

    try {
      await pullOllamaModel(trimmedModelName);
      await refreshModelAvailability();
      setChatModelActionFeedback("downloaded");
    } catch {
      setChatModelActionFeedback("downloadError");
    } finally {
      setChatModelAction(null);
    }
  }

  async function deleteChatModel(model: ChatModel) {

    if (isChatModelActionBusy) {
      return;
    }

    setChatModelAction({
      modelName: model.name,
      type: "delete"
    });
    startModelAction(deleteStatus);

    try {
      await deleteOllamaModel(model.name);
      await refreshModelAvailability();
      setChatModelActionFeedback("deleted");
    } catch {
      setChatModelActionFeedback("deleteError");
    } finally {
      setChatModelAction(null);
    }
  }

  return {
    chatModelAction,
    chatModelActionFeedback,
    deleteChatModel,
    downloadChatModel,
    isChatModelActionBusy
  };
}
