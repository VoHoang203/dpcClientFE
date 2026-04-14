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
import Link from "next/link";
import BottomNav from "@/components/BottomNav";
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
  "Quy trình chuyển đảng chính thức?",
  "Mức đóng đảng phí hiện tại?",
  "Tiêu chí xếp loại đảng viên?",
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

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-background pb-20 md:pb-6">
      <div className="border-b bg-card px-4 py-3 sm:px-6">
        <div className="mx-auto flex w-full max-w-3xl items-center gap-3 lg:max-w-4xl">
          <Link href="/" className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-5 w-5" />
          </Link>
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
              className={`flex gap-3 ${
                message.role === "user" ? "flex-row-reverse" : ""
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
                className={`min-w-0 max-w-[min(100%,28rem)] sm:max-w-[80%] ${
                  message.role === "user" ? "text-right" : ""
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
                <span className="mt-1 inline-block text-xs text-muted-foreground">
                  {message.timestamp}
                </span>
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
      </div>

      <BottomNav />
    </div>
  );
};

export default AIChat;
