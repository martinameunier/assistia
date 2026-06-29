import React, {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState
} from "react";

import {
  Bot,
  Cpu,
  Download,
  Globe2,
  ImagePlus,
  MessageSquarePlus,
  Save,
  Send,
  Square,
  Trash2,
  User
} from "lucide-react";

import type { Translations } from "../../i18n";
import {
  queueComfyUIImageGeneration,
  interruptComfyUIImageGeneration,
  saveComfyUIGeneratedImage,
  searchWeb,
  sendOllamaChatMessage,
  stopOllamaChatMessage,
  type ComfyUIGeneratedImage,
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
import {
  buildWorkflowForPrompt,
  type ImageGeneratorModel
} from "../../utils/imageGeneratorModels";
import { useLauncherStore }
from "../../store/launcherStore";

type Props = {
  availableModels: ChatModel[];
  imageGenerationModel: ImageGeneratorModel | undefined;
  isLoadingModels: boolean;
  isComfyUIRunning: boolean;
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
  imageGenerationModel,
  isLoadingModels,
  isComfyUIRunning,
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

  const [isImageGenerationRequested, setIsImageGenerationRequested] =
    useState(false);

  const [savingImageMessageId, setSavingImageMessageId] =
    useState<number | null>(null);

  const textareaRef =
    useRef<HTMLTextAreaElement | null>(null);

  const activeRequestIdRef =
    useRef<number | null>(null);

  const nextRequestIdRef =
    useRef(0);

  const pendingMessageIdRef =
    useRef<number | null>(null);

  const activeRequestTypeRef =
    useRef<"chat" | "image" | null>(null);

  const addGeneratedImage =
    useLauncherStore((state) => state.addGeneratedImage);

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

  const isImageGenerationActive =
    isImageGenerationRequested;

  const canRequestImageGeneration =
    imageGenerationModel !== undefined
    && isComfyUIRunning
    && !isSending;

  const canGenerateImage =
    isOllamaRunning
    && isComfyUIRunning
    && hasAvailableModels
    && selectedModelDefinition !== undefined
    && imageGenerationModel !== undefined
    && draftMessage.trim() !== ""
    && !isSending;

  const canSubmit =
    isImageGenerationActive
      ? canGenerateImage
      : canSend;

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

  useEffect(() => {
    if (!canRequestImageGeneration && isImageGenerationRequested) {
      setIsImageGenerationRequested(false);
    }
  }, [
    canRequestImageGeneration,
    isImageGenerationRequested
  ]);

  useLayoutEffect(() => {
    const textarea =
      textareaRef.current;

    if (textarea === null) {
      return;
    }

    textarea.style.height = "auto";
    textarea.style.height = `${textarea.scrollHeight}px`;
  }, [draftMessage]);

  function beginChatRequest(
    pendingMessageId: number,
    requestType: "chat" | "image"
  ) {
    nextRequestIdRef.current += 1;
    activeRequestIdRef.current =
      nextRequestIdRef.current;
    pendingMessageIdRef.current =
      pendingMessageId;
    activeRequestTypeRef.current =
      requestType;

    return nextRequestIdRef.current;
  }

  function isActiveChatRequest(requestId: number) {
    return activeRequestIdRef.current === requestId;
  }

  function finishChatRequest(requestId: number) {
    if (!isActiveChatRequest(requestId)) {
      return;
    }

    activeRequestIdRef.current =
      null;
    pendingMessageIdRef.current =
      null;
    activeRequestTypeRef.current =
      null;
    setIsSending(false);
  }

  function stopCurrentRequest() {
    const pendingMessageId =
      pendingMessageIdRef.current;
    const activeRequestType =
      activeRequestTypeRef.current;

    activeRequestIdRef.current =
      null;
    pendingMessageIdRef.current =
      null;
    activeRequestTypeRef.current =
      null;
    setIsSending(false);

    if (pendingMessageId !== null) {
      setMessages((currentMessages) =>
        currentMessages.map((chatMessage) =>
          chatMessage.id === pendingMessageId
            ? {
                ...chatMessage,
                content: labels.requestStoppedMessage,
                status: undefined
              }
            : chatMessage
        )
      );
    }

    const stopRequests = [
      stopOllamaChatMessage()
    ];

    if (activeRequestType === "image") {
      stopRequests.push(interruptComfyUIImageGeneration());
    }

    void Promise.allSettled(stopRequests);
  }

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
    const requestId =
      beginChatRequest(pendingMessage.id, "chat");

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

        if (!isActiveChatRequest(requestId)) {
          return;
        }
      }

      if (!isActiveChatRequest(requestId)) {
        return;
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

      if (!isActiveChatRequest(requestId)) {
        return;
      }

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
      if (!isActiveChatRequest(requestId)) {
        return;
      }

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
      finishChatRequest(requestId);
    }
  }

  async function generateImageFromChat() {

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

    if (!isComfyUIRunning) {
      appendMessage("assistant", labels.imageGeneratorStoppedMessage);
      return;
    }

    if (imageGenerationModel === undefined) {
      appendMessage("assistant", labels.missingImageModelMessage);
      return;
    }

    const userMessage =
      appendMessage("user", message);

    setDraftMessage("");
    setIsWebSearchRequested(false);
    setIsImageGenerationRequested(false);
    setIsSending(true);
    const pendingMessage =
      appendMessage("assistant", labels.imagePromptImprovingMessage, "pending");
    const requestId =
      beginChatRequest(pendingMessage.id, "image");

    try {
      const promptResponse =
        await sendOllamaChatMessage(
          selectedModelDefinition.name,
          [
            {
              role: "system",
              content: labels.imagePromptInstruction
            },
            {
              role: "user",
              content: userMessage.content
            }
          ]
        );

      if (!isActiveChatRequest(requestId)) {
        return;
      }

      const enhancedPrompt =
        cleanEnhancedImagePrompt(promptResponse.message);

      setMessages((currentMessages) =>
        currentMessages.map((chatMessage) =>
          chatMessage.id === pendingMessage.id
            ? {
                ...chatMessage,
                content: labels.imageGeneratingMessage
              }
            : chatMessage
        )
      );

      const workflow =
        buildWorkflowForPrompt(imageGenerationModel, enhancedPrompt);
      const response =
        await queueComfyUIImageGeneration(workflow);

      if (!isActiveChatRequest(requestId)) {
        return;
      }

      const imageId =
        createChatGeneratedImageId();

      addGeneratedImage({
        createdAt: Date.now(),
        id: imageId,
        image: response.image,
        modelName: imageGenerationModel.name,
        prompt: enhancedPrompt,
        promptId: response.prompt_id
      });

      setMessages((currentMessages) =>
        currentMessages.map((chatMessage) =>
          chatMessage.id === pendingMessage.id
            ? {
                ...chatMessage,
                content: [
                  labels.imageGeneratedMessage,
                  "",
                  `${labels.imagePromptUsedLabel} ${enhancedPrompt}`
                ].join("\n"),
                generatedImage: response.image,
                imageAlt: labels.generatedImageAlt,
                imageDataUrl: response.image.data_url,
                status: undefined
              }
            : chatMessage
        )
      );
    } catch (error) {
      if (!isActiveChatRequest(requestId)) {
        return;
      }

      setMessages((currentMessages) =>
        currentMessages.map((chatMessage) =>
          chatMessage.id === pendingMessage.id
            ? {
                ...chatMessage,
                content: `${labels.imageGenerationErrorMessage}\n${String(error)}`,
                status: undefined
              }
            : chatMessage
        )
      );
    } finally {
      finishChatRequest(requestId);
    }
  }

  async function saveGeneratedChatImage(
    image: ComfyUIGeneratedImage,
    messageId: number
  ) {

    setSavingImageMessageId(messageId);

    try {
      await saveComfyUIGeneratedImage(image);
    } catch (error) {
      appendMessage(
        "assistant",
        `${labels.imageSaveErrorMessage}\n${String(error)}`
      );
    } finally {
      setSavingImageMessageId(null);
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
                    {message.imageDataUrl !== undefined && (
                      <>
                        <img
                          className="chat-generated-image"
                          alt={message.imageAlt ?? labels.generatedImageAlt}
                          src={message.imageDataUrl}
                        />
                        {message.generatedImage !== undefined && (
                          <div className="chat-generated-image__actions">
                            <button
                              type="button"
                              className="settings-save-button"
                              disabled={savingImageMessageId !== null}
                              onClick={() => {
                                void saveGeneratedChatImage(
                                  message.generatedImage!,
                                  message.id
                                );
                              }}
                            >
                              {savingImageMessageId === message.id ? (
                                <span className="button-loader" aria-hidden="true" />
                              ) : (
                                <Save size={18} />
                              )}
                              <span>
                                {savingImageMessageId === message.id
                                  ? labels.savingGeneratedImageAction
                                  : labels.saveGeneratedImageAction}
                              </span>
                            </button>
                          </div>
                        )}
                      </>
                    )}
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
              if (isImageGenerationActive) {
                void generateImageFromChat();
              } else {
                void sendMessage();
              }
            }}
          >
            <div className="chat-composer__actions" aria-label={labels.chatActionsLabel}>
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
                  setIsWebSearchRequested((currentValue) => {
                    const nextValue =
                      !currentValue;

                    if (nextValue) {
                      setIsImageGenerationRequested(false);
                    }

                    return nextValue;
                  });
                }}
              >
                <Globe2 size={20} />
              </button>
              <button
                type="button"
                className={
                  isImageGenerationActive
                    ? "chat-composer__image-toggle chat-composer__image-toggle--active"
                    : "chat-composer__image-toggle"
                }
                disabled={!canRequestImageGeneration}
                aria-pressed={isImageGenerationActive}
                aria-label={
                  isImageGenerationActive
                    ? labels.imageGenerationToggleOn
                    : imageGenerationModel === undefined || !isComfyUIRunning
                      ? labels.imageGenerationToggleUnavailable
                      : labels.imageGenerationToggleOff
                }
                title={
                  isImageGenerationActive
                    ? labels.imageGenerationToggleOn
                    : imageGenerationModel === undefined || !isComfyUIRunning
                      ? labels.imageGenerationToggleUnavailable
                      : labels.imageGenerationToggleOff
                }
                onClick={() => {
                  setIsImageGenerationRequested((currentValue) => {
                    const nextValue =
                      !currentValue;

                    if (nextValue) {
                      setIsWebSearchRequested(false);
                    }

                    return nextValue;
                  });
                }}
              >
                <ImagePlus size={20} />
              </button>
            </div>
            <textarea
              ref={textareaRef}
              value={draftMessage}
              disabled={isSending || !isOllamaRunning || !hasAvailableModels}
              onChange={(event) => setDraftMessage(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  if (isImageGenerationActive) {
                    void generateImageFromChat();
                  } else {
                    void sendMessage();
                  }
                }
              }}
              placeholder={labels.messagePlaceholder}
              rows={3}
            />
            <button
              type={isSending ? "button" : "submit"}
              className={
                isSending
                  ? "chat-composer__send-button chat-composer__send-button--stop"
                  : "chat-composer__send-button"
              }
              disabled={!isSending && !canSubmit}
              aria-label={isSending ? labels.stop : labels.send}
              title={isSending ? labels.stop : labels.send}
              onClick={() => {
                if (isSending) {
                  stopCurrentRequest();
                }
              }}
            >
              {isSending ? (
                <Square size={20} />
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

function cleanEnhancedImagePrompt(prompt: string) {

  return prompt
    .replace(/^```[a-z]*\s*/i, "")
    .replace(/```$/i, "")
    .trim()
    .replace(/^["'“”]+|["'“”]+$/g, "");
}

function createChatGeneratedImageId() {

  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
