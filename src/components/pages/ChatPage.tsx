import React, {
  useEffect,
  useMemo,
  useState
} from "react";

import {
  Bot,
  Cpu,
  Download,
  Globe2,
  MessageSquarePlus,
  Send,
  Trash2,
  User
} from "lucide-react";

import type { Translations } from "../../i18n";
import {
  searchWeb,
  sendOllamaChatMessage,
  type OllamaChatMessage,
  type WebSearchResponse,
  type WebSearchSettings
} from "../../services/tauris";
import { useChat }
from "../../contexts/ChatContext";
import ChatMarkdown
from "../ChatMarkdown";
import LinkifiedText
from "../LinkifiedText";
import type {
  InstallationFeedback,
  PendingInstallationAction
} from "../../types/launcher";
import type {
  ChatModel
} from "../../utils/chatModels";

type Props = {
  availableModels: ChatModel[];
  isLoadingModels: boolean;
  installationFeedback: InstallationFeedback;
  isOllamaInstalled: boolean;
  isOllamaRunning: boolean;
  labels: Translations["pages"]["chat"];
  pendingInstallationAction: PendingInstallationAction;
  webSearchSettings: WebSearchSettings;
  onInstallRequiredComponents: () => void;
};

function formatWebSearchContext(
  response: WebSearchResponse,
  labels: Translations["pages"]["chat"]
) {

  if (response.results.length === 0) {
    return labels.webSearchNoResults;
  }

  const results =
    response.results
      .map((result, index) => [
        `[${index + 1}] ${result.title}`,
        result.url,
        result.content
      ].filter(Boolean).join("\n"))
      .join("\n\n");

  return `${labels.webSearchContextTitle}\n${results}`;
}

function formatWebSearchSources(
  response: WebSearchResponse,
  labels: Translations["pages"]["chat"]
) {

  if (response.results.length === 0) {
    return "";
  }

  const sources =
    response.results
      .map((result, index) => `${index + 1}. [${result.title}](${result.url})`)
      .join("\n");

  return `\n\n${labels.webSearchSourcesTitle}\n${sources}`;
}

function formatConversationDate(timestamp: number) {
  if (timestamp === 0) {
    return "";
  }

  return new Intl.DateTimeFormat(undefined, {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "2-digit"
  }).format(new Date(timestamp));
}

export default function ChatPage({
  availableModels,
  isLoadingModels,
  installationFeedback,
  isOllamaInstalled,
  isOllamaRunning,
  labels,
  pendingInstallationAction,
  webSearchSettings,
  onInstallRequiredComponents
}: Props) {

  const {
    activeConversationId,
    appendMessage,
    conversationError,
    conversationSummaries,
    deleteConversation,
    draftMessage,
    ensureInitialAssistantMessage,
    isLoadingConversations,
    isSending,
    messages,
    selectedModel,
    selectConversation,
    setDraftMessage,
    setIsSending,
    setMessages,
    setSelectedModel,
    startNewConversation
  } = useChat();

  const [isWebSearchRequested, setIsWebSearchRequested] =
    useState(false);

  const hasAvailableModels =
    availableModels.length > 0;

  const selectedModelDefinition =
    useMemo(
      () => availableModels.find((model) => model.name === selectedModel),
      [
        availableModels,
        selectedModel
      ]
    );

  const canSend =
    isOllamaRunning
    && hasAvailableModels
    && selectedModelDefinition !== undefined
    && draftMessage.trim() !== ""
    && !isSending;

  const statusLabel =
    !isOllamaInstalled
      ? labels.statusMissing
      : isOllamaRunning
        ? labels.statusReady
        : labels.statusStopped;

  const isInstallingRequiredComponents =
    pendingInstallationAction === "required";

  const isInstallationBusy =
    pendingInstallationAction !== null;

  const canRequestWebSearch =
    webSearchSettings.enabled && !isSending;

  const isWebSearchActive =
    webSearchSettings.enabled && isWebSearchRequested;

  useEffect(() => {
    if (isLoadingModels) {
      return;
    }

    if (!availableModels.some((model) => model.name === selectedModel)) {
      setSelectedModel(availableModels[0]?.name ?? "");
    }
  }, [
    availableModels,
    isLoadingModels,
    selectedModel,
    setSelectedModel
  ]);

  useEffect(() => {
    ensureInitialAssistantMessage(labels.welcomeMessage);
  }, [
    ensureInitialAssistantMessage,
    labels.welcomeMessage
  ]);

  useEffect(() => {
    if (!webSearchSettings.enabled && isWebSearchRequested) {
      setIsWebSearchRequested(false);
    }
  }, [
    isWebSearchRequested,
    webSearchSettings.enabled
  ]);

  async function sendMessage() {

    const message =
      draftMessage.trim();

    if (message === "" || isSending) {
      return;
    }

    if (!isOllamaRunning) {
      appendMessage("assistant", labels.ollamaStoppedMessage);
      return;
    }

    if (!hasAvailableModels || selectedModelDefinition === undefined) {
      appendMessage("assistant", labels.missingModelMessage);
      return;
    }

    const userMessage =
      appendMessage("user", message);

    const nextMessages =
      [
        ...messages,
        userMessage
      ];

    setDraftMessage("");
    setIsWebSearchRequested(false);
    setIsSending(true);
    const pendingMessage =
      appendMessage("assistant", labels.processingMessage, "pending");

    try {
      const shouldSearchWeb =
        isWebSearchActive;
      let webSearchResponse: WebSearchResponse | null =
        null;

      if (shouldSearchWeb) {
        setMessages((currentMessages) =>
          currentMessages.map((chatMessage) =>
            chatMessage.id === pendingMessage.id
              ? {
                  ...chatMessage,
                  content: labels.searchingWebMessage
                }
              : chatMessage
          )
        );

        webSearchResponse =
          await searchWeb(message);
      }

      setMessages((currentMessages) =>
        currentMessages.map((chatMessage) =>
          chatMessage.id === pendingMessage.id
            ? {
                ...chatMessage,
                content: labels.processingMessage
              }
            : chatMessage
        )
      );

      const modelMessages: OllamaChatMessage[] =
        nextMessages
          .filter((chatMessage) =>
            chatMessage.role !== "assistant"
            || chatMessage.content !== labels.welcomeMessage
          )
          .map(({ role, content }) => ({
            role,
            content
          }));

      modelMessages.unshift({
        role: "system",
        content: labels.responseLanguageInstruction
      });

      if (webSearchResponse !== null) {
        modelMessages.splice(1, 0, {
          role: "system",
          content: [
            labels.webSearchInstruction,
            formatWebSearchContext(webSearchResponse, labels)
          ].join("\n\n")
        });
      }

      const response =
        await sendOllamaChatMessage(
          selectedModelDefinition.name,
          modelMessages
        );

      const responseContent =
        response.message
        + (
          webSearchResponse === null
            ? ""
            : formatWebSearchSources(webSearchResponse, labels)
        );

      setMessages((currentMessages) =>
        currentMessages.map((chatMessage) =>
          chatMessage.id === pendingMessage.id
            ? {
                ...chatMessage,
                content: responseContent,
                status: undefined
              }
            : chatMessage
        )
      );
    } catch (error) {
      setMessages((currentMessages) =>
        currentMessages.map((chatMessage) =>
          chatMessage.id === pendingMessage.id
            ? {
                ...chatMessage,
                content: `${labels.errorMessage}\n${String(error)}`,
                status: undefined
              }
            : chatMessage
        )
      );
    } finally {
      setIsSending(false);
    }
  }

  return (
    <section className="developer-agent-chat chat-page" aria-labelledby="page-title">
      <header className="developer-agent-chat__toolbar">
        <div className="developer-agent-chat__status">
          <span
            className={
              isOllamaRunning
                ? "developer-agent-chat__status-dot developer-agent-chat__status-dot--ready"
                : "developer-agent-chat__status-dot"
            }
            aria-hidden="true"
          />
          <span>{statusLabel}</span>
        </div>

        {!isOllamaInstalled && (
          <button
            type="button"
            className="developer-agent-chat__settings-button"
            disabled={isInstallationBusy}
            onClick={onInstallRequiredComponents}
          >
            {isInstallingRequiredComponents ? (
              <span className="button-loader" aria-hidden="true" />
            ) : (
              <Download size={18} />
            )}
            <span>
              {isInstallingRequiredComponents
                ? labels.installingAction
                : labels.installAction}
            </span>
          </button>
        )}
      </header>

      <div className="developer-agent-config-summary chat-config-summary">
        <span>
          <Cpu size={16} />
          {labels.modelLabel}
        </span>

        <span>
          <Globe2 size={16} />
          {webSearchSettings.enabled
            ? labels.webSearchEnabled
            : labels.webSearchDisabled}
        </span>

        {isLoadingModels ? (
          <span>{labels.modelsLoading}</span>
        ) : hasAvailableModels ? (
          <label className="chat-model-select">
            <span className="sr-only">{labels.modelLabel}</span>
            <select
              value={selectedModel}
              disabled={isSending}
              onChange={(event) => {
                setSelectedModel(event.target.value);
              }}
            >
              {availableModels.map((model) => (
                <option key={model.name} value={model.name}>
                  {model.name}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <span>{labels.noModelAvailable}</span>
        )}

        {installationFeedback !== null && (
          <p
            className={
              installationFeedback === "started"
                ? "settings-feedback settings-feedback--saved page-install-feedback"
                : "settings-feedback settings-feedback--error page-install-feedback"
            }
          >
            {installationFeedback === "started"
              ? labels.installStarted
              : labels.installError}
          </p>
        )}
      </div>

      <div className="chat-workspace">
        <aside className="chat-history" aria-label={labels.conversationsTitle}>
          <div className="chat-history__header">
            <strong>{labels.conversationsTitle}</strong>
            <button
              type="button"
              onClick={startNewConversation}
              disabled={isSending}
              aria-label={labels.newConversation}
              title={labels.newConversation}
            >
              <MessageSquarePlus size={18} />
            </button>
          </div>

          <div className="chat-history__list">
            {isLoadingConversations ? (
              <p>{labels.conversationsLoading}</p>
            ) : conversationSummaries.length === 0 ? (
              <p>{labels.conversationsEmpty}</p>
            ) : (
              conversationSummaries.map((conversation) => {
                const isActive =
                  conversation.id === activeConversationId;

                return (
                  <div
                    key={conversation.id}
                    className={
                      isActive
                        ? "chat-history__item chat-history__item--active"
                        : "chat-history__item"
                    }
                  >
                    <button
                      type="button"
                      className="chat-history__select"
                      disabled={isSending}
                      aria-current={isActive ? "true" : undefined}
                      onClick={() => {
                        void selectConversation(conversation.id);
                      }}
                    >
                      <span>{conversation.title}</span>
                      <small>
                        {formatConversationDate(conversation.updatedAt)}
                      </small>
                    </button>
                    <button
                      type="button"
                      className="chat-history__delete"
                      disabled={isSending}
                      aria-label={labels.deleteConversation}
                      title={labels.deleteConversation}
                      onClick={() => {
                        void deleteConversation(conversation.id);
                      }}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                );
              })
            )}
          </div>

          {conversationError !== null && (
            <p className="chat-history__error">
              {labels.conversationError}
            </p>
          )}
        </aside>

        <div className="chat-thread">
          <div className="developer-agent-messages" aria-live="polite">
            {messages.map((message) => (
              <article
                key={message.id}
                className={
                  message.role === "user"
                    ? "developer-agent-message developer-agent-message--user"
                    : message.status === "pending"
                      ? "developer-agent-message developer-agent-message--assistant developer-agent-message--pending"
                      : "developer-agent-message developer-agent-message--assistant"
                }
              >
                <div className="developer-agent-message__avatar" aria-hidden="true">
                  {message.role === "user"
                    ? <User size={18} />
                    : <Bot size={18} />}
                </div>
                {message.role === "assistant" ? (
                  <div className="developer-agent-message__content">
                    {message.status === "pending" && (
                      <span className="chat-thinking-dot" aria-hidden="true" />
                    )}
                    <ChatMarkdown content={message.content} />
                  </div>
                ) : (
                  <p>
                    <LinkifiedText text={message.content} />
                  </p>
                )}
              </article>
            ))}
          </div>

          <form
            className="developer-agent-composer chat-composer"
            onSubmit={(event) => {
              event.preventDefault();
              sendMessage();
            }}
          >
            <button
              type="button"
              className={
                isWebSearchActive
                  ? "chat-composer__web-toggle chat-composer__web-toggle--active"
                  : "chat-composer__web-toggle"
              }
              disabled={!canRequestWebSearch}
              aria-pressed={isWebSearchActive}
              aria-label={
                isWebSearchActive
                  ? labels.webSearchToggleOn
                  : webSearchSettings.enabled
                    ? labels.webSearchToggleOff
                    : labels.webSearchToggleUnavailable
              }
              title={
                isWebSearchActive
                  ? labels.webSearchToggleOn
                  : webSearchSettings.enabled
                    ? labels.webSearchToggleOff
                    : labels.webSearchToggleUnavailable
              }
              onClick={() => {
                setIsWebSearchRequested((currentValue) => !currentValue);
              }}
            >
              <Globe2 size={20} />
            </button>
            <textarea
              value={draftMessage}
              disabled={isSending || !isOllamaRunning || !hasAvailableModels}
              onChange={(event) => setDraftMessage(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  sendMessage();
                }
              }}
              placeholder={labels.messagePlaceholder}
              rows={3}
            />
            <button
              type="submit"
              className="chat-composer__send-button"
              disabled={!canSend}
              aria-label={labels.send}
            >
              {isSending ? (
                <span className="button-loader" aria-hidden="true" />
              ) : (
                <Send size={20} />
              )}
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}
