"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Bot,
  FileText,
  Paperclip,
  Plus,
  Send,
  Sparkles,
  Trash2,
  User,
} from "lucide-react";
import { Streamdown } from "streamdown";
import "streamdown/styles.css";

import { useAiChat } from "@/contexts/ai-chat-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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

const suggestedQuestions = [
  "Tổ chức Đảng có trách nhiệm gì?",
  "Đảng phí là gì?",
  "Đảng viên vi phạm kỉ luật sẽ bị xử lí như nào?",
  "Quyền và nghĩa vụ của Đảng viên?",
];

type ChatThread = {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: Message[];
};

function nowTimeLabel() {
  return new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
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
    const v =
      (typeof n.filePath === "string" && n.filePath) ||
      (typeof n.path === "string" && n.path) ||
      (typeof n.url === "string" && n.url) ||
      "";
    if (v) return String(v);
  }
  return null;
}

const AIChat = () => {
  const { user } = useAuth();
  const userKey = user?.userId || "anonymous";

  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string>("");
  const [messages, setMessages] = useState<Message[]>(newAssistantGreeting());
  const [input, setInput] = useState("");
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);

  const bottomRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const activeThread = useMemo(
    () => threads.find((t) => t.id === activeThreadId) ?? null,
    [threads, activeThreadId]
  );

  useEffect(() => {
    const key = storageKeyFor(userKey);
    const saved = safeParseJson<ChatThread[]>(localStorage.getItem(key));
    if (saved && Array.isArray(saved) && saved.length) {
      const sorted = [...saved].sort((a, b) => b.updatedAt - a.updatedAt);
      setThreads(sorted);
      setActiveThreadId(sorted[0].id);
      setMessages(sorted[0].messages?.length ? sorted[0].messages : newAssistantGreeting());
      return;
    }

    const tid = String(Date.now());
    const t: ChatThread = {
      id: tid,
      title: "Cuộc trò chuyện mới",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      messages: newAssistantGreeting(),
    };
    setThreads([t]);
    setActiveThreadId(tid);
    setMessages(t.messages);
    localStorage.setItem(key, JSON.stringify([t]));
  }, [userKey]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, uploading]);

  const persist = (nextThreads: ChatThread[]) => {
    setThreads(nextThreads);
    localStorage.setItem(storageKeyFor(userKey), JSON.stringify(nextThreads));
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
              t.title === "Cuộc trò chuyện mới" && nextMessages.find((m) => m.role === "user")
                ? (nextMessages.find((m) => m.role === "user")?.content || t.title).slice(0, 32)
                : t.title,
          }
    );
    persist(nextThreads);
  };

  const createNewChat = () => {
    const tid = String(Date.now());
    const t: ChatThread = {
      id: tid,
      title: "Cuộc trò chuyện mới",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      messages: newAssistantGreeting(),
    };
    const next = [t, ...threads];
    persist(next);
    setActiveThreadId(tid);
    setPendingFiles([]);
    setInput("");
    setMessages(t.messages);
  };

  const clearAllHistory = () => {
    const t: ChatThread = {
      id: String(Date.now()),
      title: "Cuộc trò chuyện mới",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      messages: newAssistantGreeting(),
    };
    persist([t]);
    setActiveThreadId(t.id);
    setPendingFiles([]);
    setInput("");
    setMessages(t.messages);
    toast.success("Đã xoá lịch sử chat");
  };

  const selectThread = (id: string) => {
    const t = threads.find((x) => x.id === id);
    if (!t) return;
    setActiveThreadId(id);
    setPendingFiles([]);
    setInput("");
    setMessages(t.messages?.length ? t.messages : newAssistantGreeting());
  };

  const uploadPendingFiles = async (): Promise<Message["attachments"]> => {
    if (pendingFiles.length === 0) return [];
    setUploading(true);
    try {
      const results: Array<{ name: string; filePath?: string; url?: string }> = [];
      for (const f of pendingFiles) {
        const resp = await fileService.uploadFile(f);
        const filePathOrUrl = guessFilePathFromUploadResponse(resp);
        results.push({
          name: f.name,
          filePath:
            filePathOrUrl && !/^https?:\/\//i.test(filePathOrUrl) ? filePathOrUrl : undefined,
          url: filePathOrUrl && /^https?:\/\//i.test(filePathOrUrl) ? filePathOrUrl : undefined,
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

  const handleSend = () => {
    if (!input.trim() && pendingFiles.length === 0) return;

    const currentInput = input;
    const userMessageBase: Message = {
      id: Date.now().toString(),
      role: "user",
      content: currentInput.trim(),
      timestamp: nowTimeLabel(),
    };

    setInput("");

    void (async () => {
      const attachments = await uploadPendingFiles();
      const userMessage: Message = {
        ...userMessageBase,
        attachments: attachments?.length ? attachments : undefined,
      };

      const next = [...messages, userMessage];
      upsertActiveThreadMessages(next);

      setTimeout(() => {
        const attachHint =
          attachments?.length
            ? `\n\nMình đã nhận ${attachments.length} tệp đính kèm. Bạn muốn mình đọc/ tóm tắt/ trích xuất nội dung gì từ các tệp này?`
            : "";
        const aiResponse: Message = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: `Cảm ơn bạn đã hỏi về "${currentInput}". Đây là câu trả lời mẫu từ AI.${attachHint}`,
          timestamp: nowTimeLabel(),
        };
        upsertActiveThreadMessages([...next, aiResponse]);
      }, 800);
    })();
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
        className={`${sidebarOpen ? "w-[320px]" : "w-0"} hidden border-r border-[#ececf2] bg-white transition-all duration-300 lg:block`}
      >
        {sidebarOpen && (
          <div className="flex h-full flex-col">
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

          <div className="flex items-center gap-3">
            <div className="rounded-full bg-primary p-2">
              <Bot className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-semibold">Trợ lý AI</h1>
              <p className="text-xs text-muted-foreground">
                Hỗ trợ tra cứu thông tin
              </p>
            </div>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <FileText className="h-4 w-4" />
                  Lịch sử
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-72">
                <DropdownMenuLabel>
                  {activeThread ? activeThread.title : "Cuộc trò chuyện"}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={createNewChat} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Tạo chat mới
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <div className="max-h-64 overflow-y-auto p-1">
                  {threads.length === 0 ? (
                    <div className="px-2 py-3 text-sm text-muted-foreground">
                      Chưa có lịch sử.
                    </div>
                  ) : (
                    threads.map((t) => (
                      <DropdownMenuItem
                        key={t.id}
                        onClick={() => selectThread(t.id)}
                        className={t.id === activeThreadId ? "bg-accent" : ""}
                      >
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium">{t.title}</div>
                          <div className="truncate text-xs text-muted-foreground">
                            {new Date(t.updatedAt).toLocaleString("vi-VN")}
                          </div>
                        </div>
                      </DropdownMenuItem>
                    ))
                  )}
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={clearAllHistory}
                  className="gap-2 text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                  Xoá tất cả
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <div className="mx-auto w-full max-w-3xl space-y-4 px-4 py-4 sm:px-6 lg:max-w-4xl">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-3 ${message.role === "user" ? "flex-row-reverse" : ""
                }`}
            >
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarFallback
                  className={
                    message.role === "assistant"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  }
                >
                  {message.role === "assistant" ? (
                    <Bot className="h-4 w-4" />
                  ) : (
                    <User className="h-4 w-4" />
                  )}
                </AvatarFallback>
              </Avatar>

              <div
                className={`min-w-0 max-w-[min(100%,28rem)] sm:max-w-[80%] ${message.role === "user" ? "text-right" : ""
                  }`}
              >
                <Card
                  className={
                    message.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : ""
                  }
                >
                  <CardContent className="p-3">
                    <p className="text-sm">{message.content}</p>
                    {message.attachments?.length ? (
                      <>
                        <Separator className="my-2 opacity-40" />
                        <div className="flex flex-wrap gap-2">
                          {message.attachments.map((a, idx) => (
                            <Button
                              key={`${message.id}-${idx}`}
                              size="sm"
                              variant={message.role === "user" ? "secondary" : "outline"}
                              className="h-7 gap-2 text-xs"
                              onClick={() => {
                                if (a.url)
                                  window.open(a.url, "_blank", "noopener,noreferrer");
                                else if (a.filePath) fileService.openInNewTab(a.filePath);
                              }}
                            >
                              <Paperclip className="h-3.5 w-3.5" />
                              <span className="max-w-56 truncate">{a.name}</span>
                            </Button>
                          ))}
                        </div>
                      </>
                    ) : null}
                  </CardContent>
                </Card>

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
          ))}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      {messages.length <= 2 && (
        <div className="border-t bg-muted/50 px-4 py-3 sm:px-6">
          <div className="mx-auto w-full max-w-3xl lg:max-w-4xl">
            <p className="mb-2 flex items-center gap-1 text-xs text-muted-foreground">
              <Sparkles className="h-3 w-3" />
              Câu hỏi gợi ý
            </p>

            <div className="flex flex-wrap gap-2">
              {suggestedQuestions.map((question, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  onClick={() => handleQuickQuestion(question)}
                >
                  {question}
                </Button>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="border-t bg-card px-4 py-3 sm:px-6 mb-16 md:mb-0">
        <div className="mx-auto w-full max-w-3xl lg:max-w-4xl">
          {pendingFiles.length ? (
            <div className="mb-2 flex flex-wrap items-center gap-2">
              {pendingFiles.map((f) => (
                <div
                  key={`${f.name}-${f.size}`}
                  className="flex items-center gap-2 rounded-md border bg-background px-2 py-1 text-xs"
                >
                  <Paperclip className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="max-w-56 truncate">{f.name}</span>
                  <span className="text-muted-foreground">
                    ({Math.ceil(f.size / 1024)} KB)
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
          ) : null}

          <div className="flex w-full gap-2">
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              multiple
              onChange={(e) => {
                const files = Array.from(e.target.files ?? []);
                if (files.length) setPendingFiles((prev) => [...prev, ...files].slice(0, 5));
                e.currentTarget.value = "";
              }}
            />
            <Button
              variant="outline"
              size="icon"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              title="Đính kèm tệp"
            >
              <Paperclip className="h-4 w-4" />
            </Button>
            <Input
              placeholder="Nhập câu hỏi của bạn..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              className="flex-1"
            />
            <Button onClick={handleSend} size="icon" disabled={uploading}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {error && (
          <div className="mx-auto mt-2 w-full max-w-3xl lg:max-w-4xl">
            <p className="text-sm text-red-500">{error}</p>
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
                ND
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

                    <div
                      className={`max-w-[85%] sm:max-w-[75%] ${
                        message.role === "user" ? "order-1" : ""
                      }`}
                    >
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
                  <div className="flex items-end gap-3">
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
                      disabled={isLoading || !input.trim()}
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