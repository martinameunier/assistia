import React, {
  useMemo,
  useState
} from "react";

import {
  CheckCircle2,
  Download,
  Trash2
} from "lucide-react";

import type { Translations }
from "../../i18n";
import type {
  ChatModelAction,
  ChatModelActionFeedback
} from "../../types/launcher";
import type { ChatModel }
from "../../utils/chatModels";
import {
  OLLAMA_MODEL_SUGGESTIONS
} from "../../utils/ollamaModelSuggestions";
import { parseOllamaPullProgress }
from "../../utils/ollamaProgress";

type Props = {
  chatModelAction: ChatModelAction;
  chatModelActionFeedback: ChatModelActionFeedback;
  chatModels: ChatModel[];
  isChatModelActionBusy: boolean;
  isLoadingChatModels: boolean;
  isOllamaInstalled: boolean;
  labels: Translations["settings"];
  logs: string[];
  onDeleteChatModel: (model: ChatModel) => void;
  onDownloadChatModel: (modelName: string) => void;
};

export default function ChatModelsSection({
  chatModelAction,
  chatModelActionFeedback,
  chatModels,
  isChatModelActionBusy,
  isLoadingChatModels,
  isOllamaInstalled,
  labels,
  logs,
  onDeleteChatModel,
  onDownloadChatModel
}: Props) {

  const [chatModelName, setChatModelName] =
    useState("");

  const parsedChatModelDownloadProgress =
    useMemo(
      () => parseOllamaPullProgress(logs.join("\n")),
      [logs]
    );

  const chatModelDownloadProgress =
    parsedChatModelDownloadProgress === null
      ? 0
      : Math.round(parsedChatModelDownloadProgress.progress);

  const trimmedChatModelName =
    chatModelName.trim();

  const isDownloadingChatModel =
    chatModelAction?.type === "download";

  const suggestedChatModels =
    useMemo(() => {
      const suggestions =
        new Map<string, string>();

      for (const suggestion of OLLAMA_MODEL_SUGGESTIONS) {
        suggestions.set(suggestion.name, suggestion.label);
      }

      for (const model of chatModels) {
        if (!suggestions.has(model.name)) {
          suggestions.set(model.name, labels.chatModelInstalledSuggestion);
        }
      }

      return Array.from(suggestions, ([name, label]) => ({
        label,
        name
      }));
    }, [
      chatModels,
      labels.chatModelInstalledSuggestion
    ]);

  return (
    <section className="settings-section" aria-labelledby="settings-chat-models-title">
      <div className="settings-section__header">
        <div>
          <h2 id="settings-chat-models-title">{labels.chatModelsTitle}</h2>
          <p>{labels.chatModelsHelp}</p>
        </div>
      </div>

      {isLoadingChatModels && (
        <p className="settings-progress" role="status">
          <span className="settings-progress__spinner" aria-hidden="true" />
          <span>{labels.chatModelsLoading}</span>
        </p>
      )}

      {!isOllamaInstalled && (
        <p className="settings-feedback settings-feedback--error">
          {labels.chatModelsOllamaMissing}
        </p>
      )}

      <form
        className="settings-model-download-form"
        onSubmit={(event) => {
          event.preventDefault();
          onDownloadChatModel(trimmedChatModelName);
        }}
      >
        <label className="settings-field">
          <span>{labels.chatModelNameLabel}</span>
          <input
            type="text"
            list="ollama-chat-model-suggestions"
            value={chatModelName}
            disabled={!isOllamaInstalled || isChatModelActionBusy}
            onChange={(event) => {
              setChatModelName(event.target.value);
            }}
            placeholder={labels.chatModelNamePlaceholder}
            spellCheck={false}
            autoComplete="off"
            aria-describedby="chat-model-suggestions-help"
          />
          <datalist id="ollama-chat-model-suggestions">
            {suggestedChatModels.map((model) => (
              <option
                key={model.name}
                value={model.name}
                label={model.label}
              />
            ))}
          </datalist>
          <small
            id="chat-model-suggestions-help"
            className="settings-field__hint"
          >
            {labels.chatModelSuggestionsHelp}
          </small>
        </label>

        {isDownloadingChatModel ? (
          <button
            type="button"
            className="settings-save-button settings-save-button--progress"
            disabled
            style={{
              "--button-progress": `${chatModelDownloadProgress}%`
            } as React.CSSProperties}
          >
            <span className="button-loader" aria-hidden="true" />
            <span>
              {labels.chatModelDownloading} {chatModelDownloadProgress}%
            </span>
          </button>
        ) : (
          <button
            type="submit"
            className="settings-save-button"
            disabled={
              !isOllamaInstalled
              || trimmedChatModelName === ""
              || isLoadingChatModels
              || isChatModelActionBusy
            }
          >
            <Download size={18} />
            <span>{labels.chatModelDownload}</span>
          </button>
        )}
      </form>

      {chatModels.length === 0 ? (
        <p className="settings-empty-state">
          {labels.chatModelsEmpty}
        </p>
      ) : (
        <div className="settings-model-list">
          {chatModels.map((model) => {
            const isDeleting =
              chatModelAction?.type === "delete"
              && chatModelAction.modelName === model.name;

            return (
              <div className="settings-model-row" key={model.name}>
                <div className="settings-model-row__main">
                  <strong>{model.name}</strong>
                  <span className="settings-model-row__status settings-model-row__status--ready">
                    <CheckCircle2 size={16} />
                    {labels.chatModelReady}
                  </span>
                </div>

                <div className="settings-model-row__actions">
                  <button
                    type="button"
                    className="settings-save-button settings-save-button--danger"
                    disabled={
                      !isOllamaInstalled
                      || isLoadingChatModels
                      || isChatModelActionBusy
                    }
                    onClick={() => {
                      onDeleteChatModel(model);
                    }}
                  >
                    <Trash2 size={18} />
                    <span>
                      {isDeleting
                        ? labels.chatModelDeleting
                        : labels.chatModelDelete}
                    </span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {chatModelActionFeedback !== null && (
        <p
          className={
            chatModelActionFeedback === "downloaded"
              || chatModelActionFeedback === "deleted"
              ? "settings-feedback settings-feedback--saved"
              : "settings-feedback settings-feedback--error"
          }
        >
          {chatModelActionFeedback === "downloaded"
            ? labels.chatModelDownloadDone
            : chatModelActionFeedback === "deleted"
              ? labels.chatModelDeleteDone
              : chatModelActionFeedback === "downloadError"
                ? labels.chatModelDownloadError
                : labels.chatModelDeleteError}
        </p>
      )}
    </section>
  );
}
