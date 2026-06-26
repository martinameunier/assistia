import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode
} from "react";

export type DeveloperAgentChatMessage = {
  content: string;
  id: number;
  role: "assistant" | "user";
};

type DeveloperAgentChatContextValue = {
  draftMessage: string;
  isSending: boolean;
  messages: DeveloperAgentChatMessage[];
  addMessage: (
    role: DeveloperAgentChatMessage["role"],
    content: string
  ) => void;
  ensureInitialAssistantMessage: (content: string) => void;
  setDraftMessage: (message: string) => void;
  setIsSending: (isSending: boolean) => void;
};

const DeveloperAgentChatContext =
  createContext<DeveloperAgentChatContextValue | null>(null);

type Props = {
  children: ReactNode;
};

export function DeveloperAgentChatProvider({
  children
}: Props) {

  const [messages, setMessages] =
    useState<DeveloperAgentChatMessage[]>([]);

  const [draftMessage, setDraftMessage] =
    useState("");

  const [isSending, setIsSending] =
    useState(false);

  const nextMessageId =
    useRef(0);

  const addMessage =
    useCallback((
      role: DeveloperAgentChatMessage["role"],
      content: string
    ) => {
      nextMessageId.current += 1;

      setMessages((currentMessages) => [
        ...currentMessages,
        {
          content,
          id: nextMessageId.current,
          role
        }
      ]);
    }, []);

  const ensureInitialAssistantMessage =
    useCallback((content: string) => {
      nextMessageId.current += 1;

      const message = {
        content,
        id: nextMessageId.current,
        role: "assistant" as const
      };

      setMessages((currentMessages) => {
        if (currentMessages.length > 0) {
          return currentMessages;
        }

        return [
          message
        ];
      });
    }, []);

  const value =
    useMemo<DeveloperAgentChatContextValue>(() => ({
      draftMessage,
      isSending,
      messages,
      addMessage,
      ensureInitialAssistantMessage,
      setDraftMessage,
      setIsSending
    }), [
      addMessage,
      draftMessage,
      ensureInitialAssistantMessage,
      isSending,
      messages
    ]);

  return (
    <DeveloperAgentChatContext.Provider value={value}>
      {children}
    </DeveloperAgentChatContext.Provider>
  );
}

export function useDeveloperAgentChat() {

  const context =
    useContext(DeveloperAgentChatContext);

  if (context === null) {
    throw new Error(
      "useDeveloperAgentChat must be used inside DeveloperAgentChatProvider"
    );
  }

  return context;
}
