"use client";

import * as React from "react";

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  isStreaming?: boolean;
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: string;
  updatedAt: string;
}

type AiChatContextType = {
  messages: Message[];
  input: string;
  setInput: React.Dispatch<React.SetStateAction<string>>;
  handleSend: () => Promise<void>;
  isLoading: boolean;
  error: string | null;
  conversations: Conversation[];
  currentConversationId: string | null;
  createNewConversation: () => void;
  switchConversation: (id: string) => void;
  deleteConversation: (id: string) => void;
};

const AiChatContext = React.createContext<AiChatContextType | undefined>(
  undefined,
);

const STORAGE_KEY = "fptu-dpc2-ai-chat-conversations";
const CURRENT_STORAGE_KEY = "fptu-dpc2-ai-chat-current-conversation";

const createTimestamp = () =>
  new Date().toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
  });

const createDisplayDate = () =>
  new Date().toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

const createWelcomeMessage = (): Message => ({
  id: crypto.randomUUID(),
  role: "assistant",
  content:
    "Xin chào! Tôi là trợ lý AI của Chi bộ Khối Giáo dục 2 – Đại học FPT. Tôi có thể giúp bạn tra cứu thông tin về điều lệ Đảng, quy định, quy trình và các câu hỏi thường gặp. Bạn cần hỗ trợ gì?",
  timestamp: createTimestamp(),
  isStreaming: false,
});

const createConversationTitle = (text: string) => {
  const normalized = text.trim();
  if (!normalized) return "Cuộc trò chuyện mới";
  return normalized.length > 40 ? `${normalized.slice(0, 40)}...` : normalized;
};

const createEmptyConversation = (): Conversation => ({
  id: crypto.randomUUID(),
  title: "Cuộc trò chuyện mới",
  messages: [createWelcomeMessage()],
  createdAt: createDisplayDate(),
  updatedAt: createTimestamp(),
});

const sleep = (ms: number) =>
  new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms);
  });

function getNextStep(text: string, currentIndex: number): number {
  if (currentIndex >= text.length) return text.length;

  const currentChar = text[currentIndex];

  if (currentChar === "\n") {
    return currentIndex + 1;
  }

  if (currentChar === " ") {
    let i = currentIndex;
    while (i < text.length && text[i] === " ") i++;
    return i;
  }

  let i = currentIndex;

  while (i < text.length && text[i] !== " " && text[i] !== "\n") {
    i++;
  }

  return i;
}

function getStepDelay(addedText: string): number {
  if (!addedText) return 0;
  if (addedText.includes("\n")) return 20;

  const trimmed = addedText.trim();

  if (!trimmed) return 10;
  if (trimmed.length <= 2) return 18;
  if (trimmed.length <= 8) return 28;

  return 36;
}

export function AiChatProvider({ children }: { children: React.ReactNode }) {
  const [conversations, setConversations] = React.useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = React.useState<
    string | null
  >(null);
  const [input, setInput] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const initializedRef = React.useRef(false);

  React.useEffect(() => {
    if (initializedRef.current) return;

    try {
      const storedConversations = localStorage.getItem(STORAGE_KEY);
      const storedCurrentConversationId =
        localStorage.getItem(CURRENT_STORAGE_KEY);

      if (storedConversations) {
        const parsedConversations = JSON.parse(
          storedConversations,
        ) as Conversation[];

        if (parsedConversations.length > 0) {
          setConversations(parsedConversations);

          const hasStoredCurrentConversation = parsedConversations.some(
            (item) => item.id === storedCurrentConversationId,
          );

          setCurrentConversationId(
            hasStoredCurrentConversation
              ? storedCurrentConversationId
              : parsedConversations[0].id,
          );

          initializedRef.current = true;
          return;
        }
      }

      const initialConversation = createEmptyConversation();
      setConversations([initialConversation]);
      setCurrentConversationId(initialConversation.id);
    } catch {
      const initialConversation = createEmptyConversation();
      setConversations([initialConversation]);
      setCurrentConversationId(initialConversation.id);
    } finally {
      initializedRef.current = true;
    }
  }, []);

  React.useEffect(() => {
    if (!initializedRef.current) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
  }, [conversations]);

  React.useEffect(() => {
    if (!initializedRef.current) return;

    if (currentConversationId) {
      localStorage.setItem(CURRENT_STORAGE_KEY, currentConversationId);
    } else {
      localStorage.removeItem(CURRENT_STORAGE_KEY);
    }
  }, [currentConversationId]);

  const currentConversation = React.useMemo(
    () =>
      conversations.find((conversation) => conversation.id === currentConversationId) ??
      null,
    [conversations, currentConversationId],
  );

  const messages = currentConversation?.messages ?? [];

  const createNewConversation = React.useCallback(() => {
    const newConversation = createEmptyConversation();

    setConversations((prev) => [newConversation, ...prev]);
    setCurrentConversationId(newConversation.id);
    setInput("");
    setError(null);
  }, []);

  const switchConversation = React.useCallback((id: string) => {
    setCurrentConversationId(id);
    setInput("");
    setError(null);
  }, []);

  const deleteConversation = React.useCallback(
    (id: string) => {
      setConversations((prev) => {
        const nextConversations = prev.filter((conversation) => conversation.id !== id);

        if (nextConversations.length === 0) {
          const fallbackConversation = createEmptyConversation();
          setCurrentConversationId(fallbackConversation.id);
          return [fallbackConversation];
        }

        if (currentConversationId === id) {
          setCurrentConversationId(nextConversations[0].id);
        }

        return nextConversations;
      });
    },
    [currentConversationId],
  );

  const updateConversationMessages = React.useCallback(
    (conversationId: string, updater: (messages: Message[]) => Message[]) => {
      setConversations((prev) =>
        prev.map((conversation) => {
          if (conversation.id !== conversationId) return conversation;

          const nextMessages = updater(conversation.messages);

          return {
            ...conversation,
            messages: nextMessages,
            updatedAt: createTimestamp(),
          };
        }),
      );
    },
    [],
  );

  const animateAssistantMessage = React.useCallback(
    async (conversationId: string, messageId: string, fullText: string) => {
      if (!fullText) {
        updateConversationMessages(conversationId, (prev) =>
          prev.map((message) =>
            message.id === messageId
              ? { ...message, content: "", isStreaming: false }
              : message,
          ),
        );
        return;
      }

      let index = 0;

      while (index < fullText.length) {
        const nextIndex = getNextStep(fullText, index);
        const nextContent = fullText.slice(0, nextIndex);
        const addedText = fullText.slice(index, nextIndex);

        updateConversationMessages(conversationId, (prev) =>
          prev.map((message) =>
            message.id === messageId
              ? {
                  ...message,
                  content: nextContent,
                  isStreaming: nextIndex < fullText.length,
                }
              : message,
          ),
        );

        index = nextIndex;
        await sleep(getStepDelay(addedText));
      }

      updateConversationMessages(conversationId, (prev) =>
        prev.map((message) =>
          message.id === messageId
            ? {
                ...message,
                content: fullText,
                isStreaming: false,
              }
            : message,
        ),
      );
    },
    [updateConversationMessages],
  );

  const handleSend = React.useCallback(async () => {
    if (!input.trim() || isLoading || !currentConversationId) return;

    const currentInput = input.trim();
    const now = Date.now();

    const userMessage: Message = {
      id: `${now}-user`,
      role: "user",
      content: currentInput,
      timestamp: createTimestamp(),
      isStreaming: false,
    };

    const assistantMessageId = `${now + 1}-assistant`;

    setInput("");
    setError(null);
    setIsLoading(true);

    setConversations((prev) =>
      prev.map((conversation) => {
        if (conversation.id !== currentConversationId) return conversation;

        const isUntitled =
          conversation.title === "Cuộc trò chuyện mới" ||
          conversation.messages.length <= 1;

        return {
          ...conversation,
          title: isUntitled
            ? createConversationTitle(currentInput)
            : conversation.title,
          messages: [...conversation.messages, userMessage],
          updatedAt: createTimestamp(),
        };
      }),
    );

    try {
      const response = await fetch("https://ba02-222-252-29-85.ngrok-free.app/chatbot/ask", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: currentInput,
        }),
      });

      if (!response.ok) {
        throw new Error("Không thể kết nối tới hệ thống chat.");
      }

      const result = await response.json();

      const aiContent =
        result?.data?.answer ??
        result?.answer ??
        "Xin lỗi, tôi chưa thể trả lời lúc này.";

      const assistantMessage: Message = {
        id: assistantMessageId,
        role: "assistant",
        content: "",
        timestamp: createTimestamp(),
        isStreaming: true,
      };

      updateConversationMessages(currentConversationId, (prev) => [
        ...prev,
        assistantMessage,
      ]);

      await animateAssistantMessage(
        currentConversationId,
        assistantMessageId,
        aiContent,
      );
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Đã xảy ra lỗi không xác định.";

      setError(message);

      const errorMessage: Message = {
        id: `${Date.now()}-error`,
        role: "assistant",
        content:
          "Xin lỗi, hiện tại hệ thống đang gặp lỗi khi xử lý câu hỏi của bạn. Vui lòng thử lại sau.",
        timestamp: createTimestamp(),
        isStreaming: false,
      };

      updateConversationMessages(currentConversationId, (prev) => [
        ...prev,
        errorMessage,
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [
    animateAssistantMessage,
    currentConversationId,
    input,
    isLoading,
    updateConversationMessages,
  ]);

  return (
    <AiChatContext.Provider
      value={{
        messages,
        input,
        setInput,
        handleSend,
        isLoading,
        error,
        conversations,
        currentConversationId,
        createNewConversation,
        switchConversation,
        deleteConversation,
      }}
    >
      {children}
    </AiChatContext.Provider>
  );
}

export function useAiChat() {
  const context = React.useContext(AiChatContext);

  if (!context) {
    throw new Error("useAiChat must be used within AiChatProvider");
  }

  return context;
}