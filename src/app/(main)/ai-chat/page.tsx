"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/contexts/AuthContext";

import type { ChatThread, Message } from "./types";
import {
  createDefaultThread,
  newAssistantGreeting,
  nowTimeLabel,
} from "./utils";

import { ChatSidebar } from "./components/ChatSidebar";
import { ChatHeader } from "./components/ChatHeader";
import { ChatWelcome } from "./components/ChatWelcome";
import { ChatMessageList } from "./components/ChatMessageList";
import { ChatSuggestions } from "./components/ChatSuggestions";
import { ChatComposer } from "./components/ChatComposer";
import { suggestedQuestions } from "./constant";

type ConversationApiItem = {
  id?: string;
  _id?: string;
  title?: string;
  name?: string;
  createdAt?: string | number;
  updatedAt?: string | number;
  lastMessageAt?: string | number;
};

type MessageApiItem = {
  id?: string;
  _id?: string;
  role?: "user" | "assistant";
  content?: string;
  text?: string;
  message?: string;
  createdAt?: string | number;
  timestamp?: string | number;
  isError?: boolean;
  senderType?: string;
};

type AskChatbotPayload = {
  conversationId?: string;
  userId?: string;
  userMessageId?: string;
  assistantMessageId?: string;
  query?: string;
  normalizedQuery?: string;
  canAnswer?: boolean;
  needClarification?: boolean;
  outOfScope?: boolean;
  blocked?: boolean;
  answer?: string;
  content?: string;
  message?: string;
  sources?: unknown[];
  retrieval?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
};

export default function AIChat() {
  const { user } = useAuth();

  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string>("");
  const [messages, setMessages] = useState<Message[]>(newAssistantGreeting());
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [error, setError] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const bottomRef = useRef<HTMLDivElement | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement | null>(null);

  const getAccessToken = () =>
    typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;

  const getAuthHeaders = () => {
    const accessToken = getAccessToken();

    return {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    };
  };

  const isUuid = (value: string) => {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    );
  };

  const scrollToBottom = (behavior: ScrollBehavior = "auto") => {
    const root = scrollAreaRef.current;
    if (!root) return;

    const viewport = root.querySelector(
      "[data-radix-scroll-area-viewport]",
    ) as HTMLDivElement | null;

    if (!viewport) return;

    viewport.scrollTo({
      top: viewport.scrollHeight,
      behavior,
    });
  };

  const toMillis = (value?: string | number) => {
    if (!value) return Date.now();
    if (typeof value === "number") return value;
    const ms = new Date(value).getTime();
    return Number.isNaN(ms) ? Date.now() : ms;
  };

  const toClockLabel = (value?: string | number) => {
    if (!value) return nowTimeLabel();

    const date = typeof value === "number" ? new Date(value) : new Date(value);
    if (Number.isNaN(date.getTime())) return nowTimeLabel();

    return date.toLocaleTimeString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const mapConversationToThread = (item: ConversationApiItem): ChatThread => {
    const id = String(item.id || item._id || crypto.randomUUID());
    const updatedAt = toMillis(
      item.updatedAt || item.lastMessageAt || item.createdAt,
    );
    const createdAt = toMillis(item.createdAt || item.updatedAt);

    return {
      id,
      title: item.title || item.name || "Cuộc trò chuyện",
      createdAt,
      updatedAt,
      messages: [],
    };
  };

  const mapMessageToUi = (item: MessageApiItem): Message => {
    let role: "user" | "assistant" = "assistant";

    if (item.role === "user" || item.senderType === "USER") {
      role = "user";
    } else if (item.role === "assistant" || item.senderType === "ASSISTANT") {
      role = "assistant";
    }

    return {
      id: String(item.id || item._id || `${Date.now()}-${Math.random()}`),
      role,
      content: item.content || item.text || item.message || "",
      timestamp: toClockLabel(item.createdAt || item.timestamp),
    };
  };

  const extractApiPayload = <T,>(result: any): T => {
    return (result?.data?.data ?? result?.data ?? result ?? {}) as T;
  };

  const replaceThreadMessages = (
    conversationId: string,
    nextMessages: Message[],
  ) => {
    setThreads((prev) =>
      prev.map((thread) =>
        thread.id === conversationId
          ? {
              ...thread,
              messages: nextMessages,
              updatedAt: Date.now(),
              title:
                thread.title === "Cuộc trò chuyện"
                  ? (
                      nextMessages.find((m) => m.role === "user")?.content ||
                      thread.title
                    ).slice(0, 32)
                  : thread.title,
            }
          : thread,
      ),
    );

    setMessages(nextMessages);
  };

  const fetchConversationMessages = async (conversationId: string) => {
    const response = await fetch(
      `http://localhost:3001/chatbot/messages/${conversationId}`,
      {
        method: "GET",
        headers: getAuthHeaders(),
      },
    );

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
      }

      const errorText = await response.text().catch(() => "");
      throw new Error(errorText || "Không thể tải nội dung cuộc trò chuyện.");
    }

    const result = await response.json();
    const payload = extractApiPayload<{ items?: MessageApiItem[] }>(result);
    const items = Array.isArray(payload?.items) ? payload.items : [];

    return items.map(mapMessageToUi);
  };

  const fetchConversations = async () => {
    const response = await fetch("http://localhost:3001/chatbot/conversations", {
      method: "GET",
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
      }

      const errorText = await response.text().catch(() => "");
      throw new Error(errorText || "Không thể tải danh sách cuộc trò chuyện.");
    }

    const result = await response.json();
    const payload = extractApiPayload<{ items?: ConversationApiItem[] }>(result);
    const items = Array.isArray(payload?.items) ? payload.items : [];

    return items.map(mapConversationToThread);
  };

  const bootstrapData = async () => {
    setIsBootstrapping(true);
    setError("");

    try {
      const nextThreads = await fetchConversations();

      if (nextThreads.length === 0) {
        const defaultThread = createDefaultThread();
        setThreads([defaultThread]);
        setActiveThreadId(defaultThread.id);
        setMessages(defaultThread.messages);
        return;
      }

      const sortedThreads = [...nextThreads].sort(
        (a, b) => b.updatedAt - a.updatedAt,
      );
      setThreads(sortedThreads);

      const firstThread = sortedThreads[0];
      setActiveThreadId(firstThread.id);

      const detailMessages = await fetchConversationMessages(firstThread.id);
      const finalMessages =
        detailMessages.length > 0 ? detailMessages : newAssistantGreeting();

      setThreads((prev) =>
        prev.map((thread) =>
          thread.id === firstThread.id
            ? {
                ...thread,
                messages: finalMessages,
              }
            : thread,
        ),
      );

      setMessages(finalMessages);

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          scrollToBottom("auto");
        });
      });
    } catch (e: unknown) {
      const message =
        e instanceof Error ? e.message : "Không thể khởi tạo dữ liệu chat";
      setError(message);

      const fallbackThread = createDefaultThread();
      setThreads([fallbackThread]);
      setActiveThreadId(fallbackThread.id);
      setMessages(fallbackThread.messages);
    } finally {
      setIsBootstrapping(false);
    }
  };

  useEffect(() => {
    void bootstrapData();
  }, []);

  useEffect(() => {
    requestAnimationFrame(() => {
      scrollToBottom("smooth");
    });
  }, [messages, isLoading]);

  const createNewChat = () => {
    const thread = createDefaultThread();

    setThreads((prev) => [thread, ...prev]);
    setActiveThreadId(thread.id);
    setInput("");
    setError("");
    setMessages(thread.messages);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        scrollToBottom("auto");
      });
    });
  };

  const clearAllHistory = async () => {
    await bootstrapData();
    toast.success("Đã làm mới danh sách lịch sử chat");
  };

  const applyDeleteConversationToState = (id: string) => {
    const remaining = threads.filter((t) => t.id !== id);

    if (remaining.length === 0) {
      const thread = createDefaultThread();
      setThreads([thread]);
      setActiveThreadId(thread.id);
      setMessages(thread.messages);
      return;
    }

    setThreads(remaining);

    if (id === activeThreadId) {
      const nextActive = remaining[0];
      setActiveThreadId(nextActive.id);

      const nextMessages =
        nextActive.messages?.length > 0
          ? nextActive.messages
          : newAssistantGreeting();

      setMessages(nextMessages);

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          scrollToBottom("auto");
        });
      });
    }
  };

  const deleteConversation = async (id: string) => {
    if (!id) return;

    // Nếu là thread local chưa sync backend thì chỉ xoá trên UI
    if (!isUuid(id)) {
      applyDeleteConversationToState(id);
      toast.success("Đã xoá cuộc trò chuyện");
      return;
    }

    const response = await fetch(
      `http://localhost:3001/chatbot/conversations/${id}`,
      {
        method: "DELETE",
        headers: getAuthHeaders(),
      },
    );

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
      }

      const errorText = await response.text().catch(() => "");
      throw new Error(errorText || "Không thể xoá cuộc trò chuyện.");
    }

    applyDeleteConversationToState(id);
    toast.success("Đã xoá cuộc trò chuyện");
  };

  const selectThread = async (id: string) => {
    const thread = threads.find((t) => t.id === id);
    if (!thread) return;

    if (!isUuid(id)) {
      setActiveThreadId(id);
      setInput("");
      setError("");
      setMessages(thread.messages?.length ? thread.messages : newAssistantGreeting());
      return;
    }

    setActiveThreadId(id);
    setInput("");
    setError("");
    setIsLoading(true);

    try {
      const detailMessages = await fetchConversationMessages(id);
      const finalMessages =
        detailMessages.length > 0 ? detailMessages : newAssistantGreeting();

      replaceThreadMessages(id, finalMessages);

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          scrollToBottom("auto");
        });
      });
    } catch (e: unknown) {
      const message =
        e instanceof Error
          ? e.message
          : "Không thể tải tin nhắn của cuộc trò chuyện";
      setError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = async () => {
    if (!input.trim()) return;

    setError("");
    setIsLoading(true);

    const currentInput = input.trim();

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: currentInput,
      timestamp: nowTimeLabel(),
    };

    setInput("");

    const draftMessages = [...messages, userMessage];

    if (activeThreadId) {
      replaceThreadMessages(activeThreadId, draftMessages);
    } else {
      setMessages(draftMessages);
    }

    try {
      const response = await fetch("http://localhost:3001/chatbot/ask", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          query: currentInput,
          ...(activeThreadId && isUuid(activeThreadId)
            ? { conversationId: activeThreadId }
            : {}),
        }),
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
        }

        const errorText = await response.text().catch(() => "");
        throw new Error(errorText || "Không thể kết nối tới hệ thống chat.");
      }

      const result = await response.json();
      const payload = extractApiPayload<AskChatbotPayload>(result);

      const aiContent =
        payload?.answer ??
        payload?.content ??
        payload?.message ??
        "Xin lỗi, tôi chưa thể trả lời lúc này.";

      const conversationId =
        payload?.conversationId ??
        (isUuid(activeThreadId) ? activeThreadId : "");

      const assistantMessage: Message = {
        id: String(payload?.assistantMessageId || `${Date.now()}-assistant`),
        role: "assistant",
        content: aiContent,
        timestamp: nowTimeLabel(),
      };

      const finalMessages = [...draftMessages, assistantMessage];

      if (conversationId) {
        setThreads((prev) => {
          const existed = prev.some((t) => t.id === conversationId);

          if (!existed) {
            const createdThread: ChatThread = {
              id: conversationId,
              title: currentInput.slice(0, 32) || "Cuộc trò chuyện mới",
              createdAt: Date.now(),
              updatedAt: Date.now(),
              messages: finalMessages,
            };

            return [createdThread, ...prev];
          }

          return prev
            .map((thread) =>
              thread.id === conversationId
                ? {
                    ...thread,
                    title:
                      thread.title === "Cuộc trò chuyện mới" ||
                      thread.title === "Cuộc trò chuyện"
                        ? currentInput.slice(0, 32)
                        : thread.title,
                    updatedAt: Date.now(),
                    messages: finalMessages,
                  }
                : thread,
            )
            .sort((a, b) => b.updatedAt - a.updatedAt);
        });

        setActiveThreadId(conversationId);
      }

      setMessages(finalMessages);
    } catch (e: unknown) {
      const message =
        e instanceof Error ? e.message : "Có lỗi xảy ra khi gửi tin nhắn";

      setError(message);

      const errorMessage: Message = {
        id: `${Date.now()}-error`,
        role: "assistant",
        content:
          "Xin lỗi, hiện tại hệ thống đang gặp lỗi khi xử lý câu hỏi của bạn. Vui lòng thử lại sau.",
        timestamp: nowTimeLabel(),
      };

      const finalMessages = [...draftMessages, errorMessage];

      if (activeThreadId) {
        replaceThreadMessages(activeThreadId, finalMessages);
      } else {
        setMessages(finalMessages);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickQuestion = (question: string) => {
    setInput(question);
  };

  const handleDeleteConversation = async (
    e: React.MouseEvent<HTMLButtonElement>,
    id: string,
  ) => {
    e.stopPropagation();

    try {
      await deleteConversation(id);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Không thể xoá cuộc trò chuyện.";
      setError(message);
      toast.error(message);
    }
  };

  const renameConversation = async (id: string, title: string) => {
    const response = await fetch(
      `http://localhost:3001/chatbot/conversations/${id}/title`,
      {
        method: "PATCH",
        headers: getAuthHeaders(),
        body: JSON.stringify({ title }),
      },
    );

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
      }

      const errorText = await response.text().catch(() => "");
      throw new Error(errorText || "Không thể cập nhật tiêu đề cuộc trò chuyện.");
    }

    setThreads((prev) =>
      prev.map((thread) =>
        thread.id === id
          ? {
              ...thread,
              title,
            }
          : thread,
      ),
    );

    toast.success("Đã cập nhật tiêu đề cuộc trò chuyện");
  };

  return (
    <div className="flex min-h-screen w-full bg-[#f7f7fb]">
      <ChatSidebar
        sidebarOpen={sidebarOpen}
        threads={threads}
        activeThreadId={activeThreadId}
        onCreateNewChat={createNewChat}
        onSelectThread={(id) => {
          void selectThread(id);
        }}
        onDeleteConversation={(e, id) => {
          void handleDeleteConversation(e, id);
        }}
        onClearAllHistory={() => {
          void clearAllHistory();
        }}
        onRenameConversation={(id, title) => {
          void renameConversation(id, title);
        }}
      />

      <main className="flex min-h-screen flex-1 flex-col">
        <ChatHeader
          userName={(user as any)?.name}
          onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
        />

        <div className="min-h-0 flex-1 overflow-hidden">
          <ScrollArea ref={scrollAreaRef} className="h-[calc(100vh-80px)]">
            <div className="mx-auto flex w-full max-w-6xl flex-col px-4 py-6 pb-32 sm:px-6 lg:px-8">
              {!isBootstrapping && messages.length <= 1 && <ChatWelcome />}

              <ChatMessageList
                messages={messages}
                isLoading={isLoading || isBootstrapping}
                bottomRef={bottomRef}
              />

              {!isBootstrapping && messages.length <= 2 && (
                <ChatSuggestions
                  questions={suggestedQuestions}
                  onSelect={handleQuickQuestion}
                />
              )}

              <ChatComposer
                input={input}
                isLoading={isLoading || isBootstrapping}
                error={error}
                onChangeInput={setInput}
                onSend={handleSend}
              />
            </div>
          </ScrollArea>
        </div>
      </main>
    </div>
  );
}