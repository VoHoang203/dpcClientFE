"use client";

import * as React from "react";

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  isStreaming?: boolean;
}

type AiChatContextType = {
  messages: Message[];
  input: string;
  setInput: React.Dispatch<React.SetStateAction<string>>;
  handleSend: () => Promise<void>;
  isLoading: boolean;
  error: string | null;
};

const AiChatContext = React.createContext<AiChatContextType | undefined>(
  undefined,
);

const createTimestamp = () =>
  new Date().toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
  });

const initialMessages: Message[] = [
  {
    id: "1",
    role: "assistant",
    content:
      "Xin chào! Tôi là trợ lý AI của Chi bộ Khối Giáo dục 2 – Đại học FPT. Tôi có thể giúp bạn tra cứu thông tin về điều lệ Đảng, quy định, quy trình và các câu hỏi thường gặp. Bạn cần hỗ trợ gì?",
    timestamp: createTimestamp(),
    isStreaming: false,
  },
];

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
  const [messages, setMessages] = React.useState<Message[]>(initialMessages);
  const [input, setInput] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const animateAssistantMessage = React.useCallback(
    async (messageId: string, fullText: string) => {
      if (!fullText) {
        setMessages((prev) =>
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

        setMessages((prev) =>
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

      setMessages((prev) =>
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
    [],
  );

  const handleSend = React.useCallback(async () => {
    if (!input.trim() || isLoading) return;

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

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setError(null);
    setIsLoading(true);

    try {
      const response = await fetch("http://localhost:3001/chatbot/ask", {
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

      setMessages((prev) => [...prev, assistantMessage]);

      await animateAssistantMessage(assistantMessageId, aiContent);
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

      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [animateAssistantMessage, input, isLoading]);

  return (
    <AiChatContext.Provider
      value={{
        messages,
        input,
        setInput,
        handleSend,
        isLoading,
        error,
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