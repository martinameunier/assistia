import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode
} from "react";

import {
  deleteChatConversation,
  getChatConversation,
  listChatConversations,
  saveChatConversation,
  type ChatConversation,
  type ChatConversationSummary,
  type ComfyUIGeneratedImage
} from "../services/tauris";

export type ChatMessage = {
  content: string;
  id: number;
  generatedImage?: ComfyUIGeneratedImage;
  imageAlt?: string;
  imageDataUrl?: string;
  role: "assistant" | "user";
  status?: "pending";
  transient?: boolean;
};

type ChatContextValue = {
  activeConversationId: string;
  conversationError: string | null;
  conversationSummaries: ChatConversationSummary[];
  draftMessage: string;
  isLoadingConversations: boolean;
  isSending: boolean;
  messages: ChatMessage[];
  selectedModel: string;
  appendMessage: (
    role: ChatMessage["role"],
    content: string,
    status?: ChatMessage["status"]
  ) => ChatMessage;
  deleteConversation: (id: string) => Promise<void>;
  ensureInitialAssistantMessage: (content: string) => void;
  selectConversation: (id: string) => Promise<void>;
  setDraftMessage: (message: string) => void;
  setIsSending: (isSending: boolean) => void;
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  setSelectedModel: (model: string) => void;
  startNewConversation: () => void;
};

const ChatContext =
  createContext<ChatContextValue | null>(null);

type Props = {
  children: ReactNode;
  historyUnlockVersion?: number;
};

function createConversationId() {
  const randomPart =
    Math.random().toString(36).slice(2, 10);

  return `conversation-${Date.now()}-${randomPart}`;
}

function storedMessages(messages: ChatMessage[]) {
  return messages
    .filter((message) =>
      message.status === undefined
      && message.transient !== true
      && message.content.trim() !== ""
    )
    .map(({ id, role, content }) => ({
      id,
      role,
      content
    }));
}

function newestMessageId(messages: ChatMessage[]) {
  return messages.reduce(
    (highestId, message) => Math.max(highestId, message.id),
    0
  );
}

export function ChatProvider({
  children,
  historyUnlockVersion = 0
}: Props) {

  const [conversationSummaries, setConversationSummaries] =
    useState<ChatConversationSummary[]>([]);

  const [activeConversationId, setActiveConversationId] =
    useState(() => createConversationId());

  const [messages, setMessages] =
    useState<ChatMessage[]>([]);

  const [draftMessage, setDraftMessage] =
    useState("");

  const [selectedModel, setSelectedModel] =
    useState("");

  const [isSending, setIsSending] =
    useState(false);

  const [isLoadingConversations, setIsLoadingConversations] =
    useState(true);

  const [conversationError, setConversationError] =
    useState<string | null>(null);

  const nextMessageId =
    useRef(0);

  const skipNextPersist =
    useRef(false);

  const saveTimeout =
    useRef<number | null>(null);

  const conversationSummariesRef =
    useRef<ChatConversationSummary[]>([]);

  useEffect(() => {
    conversationSummariesRef.current =
      conversationSummaries;
  }, [conversationSummaries]);

  const applyConversation =
    useCallback((conversation: ChatConversation) => {
      skipNextPersist.current = true;
      nextMessageId.current =
        newestMessageId(conversation.messages);

      setActiveConversationId(conversation.id);
      setMessages(conversation.messages);
      setSelectedModel(conversation.selectedModel);
      setDraftMessage("");
      setIsSending(false);
    }, []);

  useEffect(() => {
    let isMounted =
      true;

    async function loadConversations() {
      setIsLoadingConversations(true);
      setConversationError(null);

      try {
        const summaries =
          await listChatConversations();

        if (!isMounted) {
          return;
        }

        setConversationSummaries(summaries);

        if (summaries.length > 0) {
          const conversation =
            await getChatConversation(summaries[0].id);

          if (isMounted) {
            applyConversation(conversation);
          }
        } else {
          skipNextPersist.current = true;
          nextMessageId.current = 0;
          setActiveConversationId(createConversationId());
          setMessages([]);
          setDraftMessage("");
          setIsSending(false);
        }
      } catch (error) {
        if (isMounted) {
          setConversationError(String(error));
        }
      } finally {
        if (isMounted) {
          setIsLoadingConversations(false);
        }
      }
    }

    loadConversations();

    return () => {
      isMounted = false;

      if (saveTimeout.current !== null) {
        window.clearTimeout(saveTimeout.current);
      }
    };
  }, [
    applyConversation,
    historyUnlockVersion
  ]);

  useEffect(() => {
    if (isLoadingConversations) {
      return;
    }

    if (skipNextPersist.current) {
      skipNextPersist.current = false;
      return;
    }

    const messagesToSave =
      storedMessages(messages);

    if (messagesToSave.length === 0) {
      return;
    }

    if (saveTimeout.current !== null) {
      window.clearTimeout(saveTimeout.current);
    }

    saveTimeout.current =
      window.setTimeout(() => {
        const currentSummary =
          conversationSummariesRef.current.find((summary) =>
            summary.id === activeConversationId
          );

        const conversation: ChatConversation = {
          id: activeConversationId,
          title: currentSummary?.title ?? "",
          createdAt: currentSummary?.createdAt ?? Date.now(),
          updatedAt: Date.now(),
          selectedModel,
          messages: messagesToSave
        };

        saveChatConversation(conversation)
          .then((summary) => {
            setConversationSummaries((currentSummaries) => {
              const nextSummaries =
                [
                  summary,
                  ...currentSummaries.filter((item) => item.id !== summary.id)
                ];

              return nextSummaries.sort((left, right) =>
                right.updatedAt - left.updatedAt
              );
            });
            setConversationError(null);
          })
          .catch((error) => {
            setConversationError(String(error));
          });
      }, 400);
  }, [
    activeConversationId,
    isLoadingConversations,
    messages,
    selectedModel
  ]);

  const createMessage =
    useCallback((
      role: ChatMessage["role"],
      content: string,
      status?: ChatMessage["status"],
      transient?: boolean
    ) => {
      nextMessageId.current += 1;

      return {
        content,
        id: nextMessageId.current,
        role,
        status,
        transient
      };
    }, []);

  const appendMessage =
    useCallback((
      role: ChatMessage["role"],
      content: string,
      status?: ChatMessage["status"]
    ) => {
      const message =
        createMessage(role, content, status);

      setMessages((currentMessages) => [
        ...currentMessages,
        message
      ]);

      return message;
    }, [createMessage]);

  const ensureInitialAssistantMessage =
    useCallback((content: string) => {
      setMessages((currentMessages) => {
        if (
          currentMessages.length === 1
          && currentMessages[0].transient === true
          && currentMessages[0].role === "assistant"
        ) {
          return [
            {
              ...currentMessages[0],
              content
            }
          ];
        }

        if (currentMessages.length > 0) {
          return currentMessages;
        }

        return [
          createMessage("assistant", content, undefined, true)
        ];
      });
    }, [createMessage]);

  const startNewConversation =
    useCallback(() => {
      skipNextPersist.current = true;
      nextMessageId.current = 0;
      setActiveConversationId(createConversationId());
      setMessages([]);
      setDraftMessage("");
      setIsSending(false);
    }, []);

  const selectConversation =
    useCallback(async (id: string) => {
      if (id === activeConversationId) {
        return;
      }

      try {
        const conversation =
          await getChatConversation(id);

        applyConversation(conversation);
        setConversationError(null);
      } catch (error) {
        setConversationError(String(error));
      }
    }, [
      activeConversationId,
      applyConversation
    ]);

  const deleteConversation =
    useCallback(async (id: string) => {
      try {
        await deleteChatConversation(id);

        const nextSummaries =
          conversationSummaries.filter((summary) => summary.id !== id);

        setConversationSummaries(nextSummaries);

        if (id !== activeConversationId) {
          return;
        }

        const nextConversation =
          nextSummaries[0];

        if (nextConversation === undefined) {
          startNewConversation();
        } else {
          const conversation =
            await getChatConversation(nextConversation.id);

          applyConversation(conversation);
        }
      } catch (error) {
        setConversationError(String(error));
      }
    }, [
      activeConversationId,
      applyConversation,
      conversationSummaries,
      startNewConversation
    ]);

  const value =
    useMemo<ChatContextValue>(() => ({
      activeConversationId,
      conversationError,
      conversationSummaries,
      draftMessage,
      isLoadingConversations,
      isSending,
      messages,
      selectedModel,
      appendMessage,
      deleteConversation,
      ensureInitialAssistantMessage,
      selectConversation,
      setDraftMessage,
      setIsSending,
      setMessages,
      setSelectedModel,
      startNewConversation
    }), [
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
      selectConversation,
      selectedModel,
      startNewConversation
    ]);

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {

  const context =
    useContext(ChatContext);

  if (context === null) {
    throw new Error("useChat must be used inside ChatProvider");
  }

  return context;
}
