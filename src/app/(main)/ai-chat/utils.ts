import type { ChatThread, Message } from "./types";

export function nowTimeLabel() {
  return new Date().toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function newAssistantGreeting(): Message[] {
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

export function storageKeyFor(userId: string) {
  return `ai_chat_threads_v1:${userId}`;
}

export function safeParseJson<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function guessFilePathFromUploadResponse(resp: unknown): string | null {
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

export function createDefaultThread(): ChatThread {
  const now = Date.now();
  return {
    id: String(now),
    title: "Cuộc trò chuyện mới",
    createdAt: now,
    updatedAt: now,
    messages: newAssistantGreeting(),
  };
}