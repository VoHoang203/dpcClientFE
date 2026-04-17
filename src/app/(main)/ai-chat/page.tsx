"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Bot,
  Clock3,
  Loader2,
  Paperclip,
  PanelLeft,
  Plus,
  Search,
  Send,
  Sparkles,
  Trash2,
  User,
} from "lucide-react";
import { Streamdown } from "streamdown";
import "streamdown/styles.css";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { fileService } from "@/services/fileService";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  attachments?: Array<{ name: string; filePath?: string; url?: string }>;
}

type ChatThread = {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: Message[];
};

const suggestedQuestions = [
  "Tổ chức Đảng có trách nhiệm gì?",
  "Đảng phí là gì?",
  "Đảng viên vi phạm kỉ luật sẽ bị xử lí như nào?",
  "Quyền và nghĩa vụ của Đảng viên là gì?",
];

function nowTimeLabel() {
  return new Date().toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function newAssistantGreeting(): Message[] {
  return [
    {
      id: "greeting",
      role: "assistant",
      content:
        "Xin chào! Tôi là trợ lý AI của Chi bộ Khối Giáo dục 2 – Đại học FPT. Tôi có thể giúp bạn tra cứu thông tin về điều lệ Đảng, quy định, quy trình và các câu hỏi thường gặp. Bạn cần hỗ trợ gì?",
      timestamp: nowTimeLabel(),
    },
  ];
}

function storageKeyFor(userId: string) {
  return `ai_chat_threads_v1:${userId}`;
}

function safeParseJson<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function guessFilePathFromUploadResponse(resp: unknown): string | null {
  if (!resp) return null;
  if (typeof resp === "string" && resp.trim()) return resp.trim();
  if (typeof resp !== "object") return null;

  const o = resp as Record<string, unknown>;
  const direct =
    (typeof o.filePath === "string" && o.filePath) ||
    (typeof o.path === "string" && o.path) ||
    (typeof o.url === "string" && o.url) ||
    "";

  if (direct) return String(direct);

  const nested = o.data;
  if (nested && typeof nested === "object") {
    const n = nested as Record<string, unknown>;
    const value =
      (typeof n.filePath === "string" && n.filePath) ||
      (typeof n.path === "string" && n.path) ||
      (typeof n.url === "string" && n.url) ||
      "";

    if (value) return String(value);
  }

  return null;
}

export default function AIChat() {
  const { user } = useAuth();
  const userKey = user?.userId || "anonymous";

  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string>("");
  const [messages, setMessages] = useState<Message[]>(newAssistantGreeting());
  const [input, setInput] = useState("");
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const bottomRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const activeThread = useMemo(
    () => threads.find((t) => t.id === activeThreadId) ?? null,
    [threads, activeThreadId],
  );

  useEffect(() => {
    const key = storageKeyFor(userKey);
    const saved = safeParseJson<ChatThread[]>(localStorage.getItem(key));

    if (saved && Array.isArray(saved) && saved.length > 0) {
      const sorted = [...saved].sort((a, b) => b.updatedAt - a.updatedAt);
      setThreads(sorted);
      setActiveThreadId(sorted[0].id);
      setMessages(
        sorted[0].messages?.length
          ? sorted[0].messages
          : newAssistantGreeting(),
      );
      return;
    }

    const tid = String(Date.now());
    const initialThread: ChatThread = {
      id: tid,
      title: "Cuộc trò chuyện mới",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      messages: newAssistantGreeting(),
    };

    setThreads([initialThread]);
    setActiveThreadId(tid);
    setMessages(initialThread.messages);
    localStorage.setItem(key, JSON.stringify([initialThread]));
  }, [userKey]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, [messages, uploading, isLoading]);

  const persist = (nextThreads: ChatThread[]) => {
    const sorted = [...nextThreads].sort((a, b) => b.updatedAt - a.updatedAt);
    setThreads(sorted);
    localStorage.setItem(storageKeyFor(userKey), JSON.stringify(sorted));
  };

  const upsertActiveThreadMessages = (nextMessages: Message[]) => {
    setMessages(nextMessages);

    const nextThreads = threads.map((t) =>
      t.id !== activeThreadId
        ? t
        : {
            ...t,
            updatedAt: Date.now(),
            messages: nextMessages,
            title:
              t.title === "Cuộc trò chuyện mới" &&
              nextMessages.find((m) => m.role === "user")
                ? (
                    nextMessages.find((m) => m.role === "user")?.content ||
                    t.title
                  ).slice(0, 32)
                : t.title,
          },
    );

    persist(nextThreads);
  };

  const createNewChat = () => {
    const tid = String(Date.now());
    const thread: ChatThread = {
      id: tid,
      title: "Cuộc trò chuyện mới",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      messages: newAssistantGreeting(),
    };

    const nextThreads = [thread, ...threads];
    persist(nextThreads);
    setActiveThreadId(tid);
    setPendingFiles([]);
    setInput("");
    setError("");
    setMessages(thread.messages);
  };

  const clearAllHistory = () => {
    const thread: ChatThread = {
      id: String(Date.now()),
      title: "Cuộc trò chuyện mới",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      messages: newAssistantGreeting(),
    };

    persist([thread]);
    setActiveThreadId(thread.id);
    setPendingFiles([]);
    setInput("");
    setError("");
    setMessages(thread.messages);
    toast.success("Đã xoá lịch sử chat");
  };

  const deleteConversation = (id: string) => {
    const remaining = threads.filter((t) => t.id !== id);

    if (remaining.length === 0) {
      const tid = String(Date.now());
      const thread: ChatThread = {
        id: tid,
        title: "Cuộc trò chuyện mới",
        createdAt: Date.now(),
        updatedAt: Date.now(),
        messages: newAssistantGreeting(),
      };

      persist([thread]);
      setActiveThreadId(tid);
      setMessages(thread.messages);
      toast.success("Đã xoá cuộc trò chuyện");
      return;
    }

    persist(remaining);

    if (id === activeThreadId) {
      const nextActive = remaining[0];
      setActiveThreadId(nextActive.id);
      setMessages(
        nextActive.messages?.length
          ? nextActive.messages
          : newAssistantGreeting(),
      );
    }

    toast.success("Đã xoá cuộc trò chuyện");
  };

  const selectThread = (id: string) => {
    const thread = threads.find((t) => t.id === id);
    if (!thread) return;

    setActiveThreadId(id);
    setPendingFiles([]);
    setInput("");
    setError("");
    setMessages(
      thread.messages?.length ? thread.messages : newAssistantGreeting(),
    );
  };

  const uploadPendingFiles = async (): Promise<Message["attachments"]> => {
    if (pendingFiles.length === 0) return [];

    setUploading(true);
    try {
      const results: Array<{ name: string; filePath?: string; url?: string }> =
        [];

      for (const file of pendingFiles) {
        const resp = await fileService.uploadFile(file);
        const filePathOrUrl = guessFilePathFromUploadResponse(resp);

        results.push({
          name: file.name,
          filePath:
            filePathOrUrl && !/^https?:\/\//i.test(filePathOrUrl)
              ? filePathOrUrl
              : undefined,
          url:
            filePathOrUrl && /^https?:\/\//i.test(filePathOrUrl)
              ? filePathOrUrl
              : undefined,
        });
      }

      return results;
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Upload file thất bại");
      return [];
    } finally {
      setUploading(false);
      setPendingFiles([]);
    }
  };

  const handleSend = async () => {
    if (!input.trim()) return;
    if (!activeThreadId) return;

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

    const nextMessages = [...messages, userMessage];
    upsertActiveThreadMessages(nextMessages);

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
        const errorText = await response.text().catch(() => "");
        throw new Error(errorText || "Không thể kết nối tới hệ thống chat.");
      }

      const result = await response.json();

      const aiContent =
        result?.data?.answer ??
        result?.answer ??
        result?.data?.content ??
        result?.content ??
        "Xin lỗi, tôi chưa thể trả lời lúc này.";

      const aiResponse: Message = {
        id: `${Date.now()}-assistant`,
        role: "assistant",
        content: aiContent,
        timestamp: nowTimeLabel(),
      };

      upsertActiveThreadMessages([...nextMessages, aiResponse]);
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

      upsertActiveThreadMessages([...nextMessages, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickQuestion = (question: string) => {
    setInput(question);
  };

  const handleDeleteConversation = (
    e: React.MouseEvent<HTMLButtonElement>,
    id: string,
  ) => {
    e.stopPropagation();
    deleteConversation(id);
  };

  return (
    <div className="flex min-h-screen w-full bg-[#f7f7fb]">
      <aside
        className={`${
          sidebarOpen ? "w-[320px]" : "w-0"
        } hidden overflow-hidden border-r border-[#ececf2] bg-white transition-all duration-300 lg:block`}
      >
        {sidebarOpen && (
          <div className="flex h-screen flex-col">
            <div className="border-b border-[#f1f1f5] px-5 py-5">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-red-50 text-red-500">
                  <Bot className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-lg font-semibold text-[#111827]">
                    Trợ lý AI
                  </p>
                  <p className="text-sm text-[#6b7280]">
                    Hỗ trợ tra cứu thông tin
                  </p>
                </div>
              </div>

              <Button
                onClick={createNewChat}
                className="h-11 w-full rounded-2xl bg-red-500 text-white hover:bg-red-600"
              >
                <Plus className="mr-2 h-4 w-4" />
                Cuộc trò chuyện mới
              </Button>
            </div>

            <div className="flex items-center justify-between px-5 pb-3 pt-4">
              <div className="flex items-center gap-2 text-sm font-medium text-[#374151]">
                <Clock3 className="h-4 w-4" />
                Lịch sử trò chuyện
              </div>

              <div className="flex items-center gap-2 text-[#9ca3af]">
                <Search className="h-4 w-4" />
                <PanelLeft className="h-4 w-4" />
              </div>
            </div>

            <ScrollArea className="min-h-0 flex-1 px-3 pb-3">
              <div className="space-y-2">
                {threads.map((thread) => {
                  const isActive = thread.id === activeThreadId;

                  return (
                    <button
                      key={thread.id}
                      type="button"
                      onClick={() => selectThread(thread.id)}
                      className={`group w-full rounded-2xl border p-4 text-left transition ${
                        isActive
                          ? "border-red-200 bg-red-50"
                          : "border-transparent bg-white hover:border-[#f0f1f5] hover:bg-[#fafafa]"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                            isActive
                              ? "bg-white text-red-500"
                              : "bg-[#f5f5f7] text-[#6b7280]"
                          }`}
                        >
                          <Bot className="h-4 w-4" />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-semibold text-[#111827]">
                            {thread.title}
                          </div>
                          <div className="mt-1 text-xs text-[#9ca3af]">
                            {new Date(thread.updatedAt).toLocaleString("vi-VN")}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={(e) =>
                            handleDeleteConversation(e, thread.id)
                          }
                          className="rounded-lg p-1.5 text-[#9ca3af] opacity-60 transition hover:bg-white hover:text-red-500 hover:opacity-100"
                          title="Xoá cuộc trò chuyện"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </button>
                  );
                })}
              </div>
            </ScrollArea>

            <div className="border-t border-[#f1f1f5] p-3">
              <Button
                variant="outline"
                onClick={clearAllHistory}
                className="h-11 w-full rounded-2xl border-red-200 text-red-500 hover:bg-red-50 hover:text-red-600"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Xoá tất cả lịch sử
              </Button>
            </div>
          </div>
        )}
      </aside>

      <main className="flex min-h-screen flex-1 flex-col">
        <div className="border-b border-[#ececf2] bg-white px-4 py-3 sm:px-6">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setSidebarOpen((prev) => !prev)}
                className="hidden rounded-xl border border-[#ececf2] p-2 text-[#6b7280] hover:bg-[#f9fafb] lg:flex"
              >
                <PanelLeft className="h-5 w-5" />
              </button>

              <Link
                href="/"
                className="rounded-xl p-2 text-[#6b7280] hover:bg-[#f9fafb] hover:text-[#111827]"
              >
                <ArrowLeft className="h-5 w-5" />
              </Link>

              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-red-500 text-white shadow-sm">
                  <Bot className="h-5 w-5" />
                </div>
                <div>
                  <h1 className="text-base font-semibold text-[#111827]">
                    Trợ lý AI
                  </h1>
                  <p className="text-xs text-[#6b7280]">
                    Hỗ trợ tra cứu thông tin
                  </p>
                </div>
              </div>
            </div>

            <div className="hidden items-center gap-3 sm:flex">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500 text-sm font-semibold text-white">
                {(user as any)?.name?.[0]?.toUpperCase()}
              </div>
            </div>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-hidden">
          <ScrollArea className="h-[calc(100vh-80px)]">
            <div className="mx-auto flex w-full max-w-6xl flex-col px-4 py-6 sm:px-6 lg:px-8">
              {messages.length <= 1 && (
                <section className="mb-8 rounded-[28px] border border-[#f1f1f5] bg-gradient-to-br from-white to-[#fff7f7] px-6 py-8 shadow-sm">
                  <div className="flex flex-col gap-5 md:flex-row md:items-center">
                    <div className="flex h-20 w-20 items-center justify-center rounded-[24px] bg-red-50 text-red-500 shadow-sm">
                      <Bot className="h-10 w-10" />
                    </div>

                    <div>
                      <p className="mb-2 text-sm font-semibold uppercase tracking-[0.18em] text-red-500">
                        Trợ lý AI
                      </p>
                      <h2 className="text-2xl font-bold leading-tight text-[#111827] md:text-4xl">
                        Xin chào! Tôi là trợ lý AI của Chi bộ Khối Giáo dục 2 –
                        Đại học FPT
                      </h2>
                      <p className="mt-3 max-w-3xl text-sm leading-7 text-[#6b7280] md:text-base">
                        Tôi có thể giúp bạn tra cứu thông tin về điều lệ Đảng,
                        quy định, quy trình và các câu hỏi thường gặp. Bạn cần
                        hỗ trợ gì?
                      </p>
                    </div>
                  </div>
                </section>
              )}

              <div className="space-y-5">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex gap-3 ${
                      message.role === "user" ? "justify-end" : "justify-start"
                    }`}
                  >
                    {message.role === "assistant" && (
                      <Avatar className="mt-1 h-10 w-10 shrink-0 border border-[#ffe2e2] bg-[#fff1f1]">
                        <AvatarFallback className="bg-[#fff1f1] text-red-500">
                          <Bot className="h-5 w-5" />
                        </AvatarFallback>
                      </Avatar>
                    )}

                    <div className="max-w-[85%] sm:max-w-[75%]">
                      <Card
                        className={`overflow-hidden rounded-[24px] border shadow-sm ${
                          message.role === "user"
                            ? "border-red-500 bg-red-500 text-white"
                            : "border-[#f0f1f5] bg-white"
                        }`}
                      >
                        <CardContent className="p-4 sm:p-5">
                          <Streamdown
                            className={`prose prose-sm max-w-none ${
                              message.role === "user"
                                ? "prose-invert text-sm"
                                : "text-sm text-[#111827]"
                            }`}
                            animated={false}
                          >
                            {message.content}
                          </Streamdown>

                          {message.attachments?.length ? (
                            <>
                              <Separator className="my-3 opacity-40" />
                              <div className="flex flex-wrap gap-2">
                                {message.attachments.map(
                                  (attachment, index) => (
                                    <Button
                                      key={`${message.id}-${index}`}
                                      size="sm"
                                      variant={
                                        message.role === "user"
                                          ? "secondary"
                                          : "outline"
                                      }
                                      className="h-8 gap-2 text-xs"
                                      onClick={() => {
                                        if (attachment.url) {
                                          window.open(
                                            attachment.url,
                                            "_blank",
                                            "noopener,noreferrer",
                                          );
                                          return;
                                        }

                                        if (attachment.filePath) {
                                          fileService.openInNewTab(
                                            attachment.filePath,
                                          );
                                        }
                                      }}
                                    >
                                      <Paperclip className="h-3.5 w-3.5" />
                                      <span className="max-w-56 truncate">
                                        {attachment.name}
                                      </span>
                                    </Button>
                                  ),
                                )}
                              </div>
                            </>
                          ) : null}
                        </CardContent>
                      </Card>

                      <span className="mt-2 inline-block px-1 text-xs text-[#9ca3af]">
                        {message.timestamp}
                      </span>
                    </div>

                    {message.role === "user" && (
                      <Avatar className="mt-1 h-10 w-10 shrink-0 border border-[#e5e7eb] bg-white">
                        <AvatarFallback className="bg-[#f9fafb] text-[#6b7280]">
                          <User className="h-5 w-5" />
                        </AvatarFallback>
                      </Avatar>
                    )}
                  </div>
                ))}

                {isLoading && (
                  <div className="flex gap-3">
                    <Avatar className="mt-1 h-10 w-10 shrink-0 border border-[#ffe2e2] bg-[#fff1f1]">
                      <AvatarFallback className="bg-[#fff1f1] text-red-500">
                        <Bot className="h-5 w-5" />
                      </AvatarFallback>
                    </Avatar>

                    <Card className="rounded-[24px] border border-[#f0f1f5] bg-white shadow-sm">
                      <CardContent className="flex items-center gap-2 p-4">
                        <Loader2 className="h-4 w-4 animate-spin text-red-500" />
                        <p className="text-sm text-[#6b7280]">
                          AI đang trả lời...
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                )}

                <div ref={bottomRef} />
              </div>

              {messages.length <= 2 && (
                <section className="mt-8">
                  <p className="mb-3 flex items-center gap-2 text-sm font-medium text-[#6b7280]">
                    <Sparkles className="h-4 w-4 text-red-500" />
                    Gợi ý câu hỏi
                  </p>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    {suggestedQuestions.map((question) => (
                      <button
                        key={question}
                        type="button"
                        onClick={() => handleQuickQuestion(question)}
                        className="rounded-[24px] border border-[#f5dede] bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-red-200 hover:shadow-md"
                      >
                        <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-red-50 text-red-500">
                          <Sparkles className="h-5 w-5" />
                        </div>
                        <p className="text-base font-medium leading-7 text-[#111827]">
                          {question}
                        </p>
                      </button>
                    ))}
                  </div>
                </section>
              )}

              <section className="sticky bottom-0 mt-8 pb-6">
                <div className="rounded-[28px] border border-red-200 bg-white p-3 shadow-[0_12px_40px_rgba(239,68,68,0.08)]">
                  {pendingFiles.length > 0 && (
                    <div className="mb-3 flex flex-wrap items-center gap-2 px-1">
                      {pendingFiles.map((file) => (
                        <div
                          key={`${file.name}-${file.size}`}
                          className="flex items-center gap-2 rounded-md border bg-background px-2 py-1 text-xs"
                        >
                          <Paperclip className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="max-w-56 truncate">{file.name}</span>
                          <span className="text-muted-foreground">
                            ({Math.ceil(file.size / 1024)} KB)
                          </span>
                        </div>
                      ))}

                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 gap-2 text-xs text-destructive hover:text-destructive"
                        onClick={() => setPendingFiles([])}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Bỏ tệp
                      </Button>
                    </div>
                  )}

                  <div className="flex items-end gap-3">
                    <input
                      ref={fileInputRef}
                      type="file"
                      className="hidden"
                      multiple
                      onChange={(e) => {
                        const files = Array.from(e.target.files ?? []);
                        if (files.length > 0) {
                          setPendingFiles((prev) =>
                            [...prev, ...files].slice(0, 5),
                          );
                        }
                        e.currentTarget.value = "";
                      }}
                    />

                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading || isLoading}
                      title="Đính kèm tệp"
                      className="h-14 w-14 rounded-2xl"
                    >
                      <Paperclip className="h-4 w-4" />
                    </Button>

                    <Input
                      placeholder="Nhập câu hỏi của bạn..."
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          void handleSend();
                        }
                      }}
                      className="h-14 flex-1 rounded-2xl border-0 bg-transparent px-4 text-base shadow-none focus-visible:ring-0"
                      disabled={isLoading}
                    />

                    <Button
                      onClick={() => void handleSend()}
                      disabled={
                        isLoading ||
                        uploading ||
                        (!input.trim() && pendingFiles.length === 0)
                      }
                      className="h-14 rounded-2xl bg-red-500 px-6 text-base font-medium hover:bg-red-600"
                    >
                      <Send className="mr-2 h-4 w-4" />
                      Gửi
                    </Button>
                  </div>

                  {error && (
                    <p className="px-3 pt-2 text-sm text-red-500">{error}</p>
                  )}
                </div>
              </section>
            </div>
          </ScrollArea>
        </div>
      </main>
    </div>
  );
}
