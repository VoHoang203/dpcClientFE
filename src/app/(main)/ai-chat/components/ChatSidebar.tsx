"use client";

import { useState } from "react";
import {
  Bot,
  Check,
  Clock3,
  PanelLeft,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ChatThread } from "../types";

interface ChatSidebarProps {
  sidebarOpen: boolean;
  threads: ChatThread[];
  activeThreadId: string;
  onCreateNewChat: () => void;
  onSelectThread: (id: string) => void;
  onDeleteConversation: (
    e: React.MouseEvent<HTMLButtonElement>,
    id: string,
  ) => void;
  onClearAllHistory: () => void;
  onRenameConversation: (id: string, title: string) => void | Promise<void>;
}

export function ChatSidebar({
  sidebarOpen,
  threads,
  activeThreadId,
  onCreateNewChat,
  onSelectThread,
  onDeleteConversation,
  onClearAllHistory,
  onRenameConversation,
}: ChatSidebarProps) {
  const [editingId, setEditingId] = useState<string>("");
  const [editingTitle, setEditingTitle] = useState("");

  const formatDate = (value?: number | string) => {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleString("vi-VN");
  };

  const startEdit = (thread: ChatThread) => {
    setEditingId(thread.id);
    setEditingTitle(thread.title || "");
  };

  const cancelEdit = () => {
    setEditingId("");
    setEditingTitle("");
  };

  const submitEdit = async () => {
    const nextTitle = editingTitle.trim();
    if (!editingId || !nextTitle) return;

    await onRenameConversation(editingId, nextTitle);
    cancelEdit();
  };

  return (
    <aside
      className={`${
        sidebarOpen ? "w-[320px]" : "w-0"
      } shrink-0 overflow-hidden border-r border-[#ececf2] bg-white transition-all duration-300`}
    >
      {sidebarOpen && (
        <div className="flex h-screen flex-col">
          <div className="border-b border-[#f1f1f5] px-5 py-5">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-red-50 text-red-500">
                <Bot className="h-5 w-5" />
              </div>
              <div>
                <p className="text-lg font-semibold text-[#111827]">Trợ lý AI</p>
                <p className="text-sm text-[#6b7280]">Hỗ trợ tra cứu thông tin</p>
              </div>
            </div>

            <Button
              onClick={onCreateNewChat}
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
              {threads.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[#e5e7eb] px-4 py-6 text-center text-sm text-[#9ca3af]">
                  Chưa có cuộc trò chuyện nào
                </div>
              ) : (
                threads.map((thread) => {
                  const isActive = thread.id === activeThreadId;
                  const isEditing = thread.id === editingId;

                  return (
                    <div
                      key={thread.id}
                      className={`group rounded-2xl border p-4 transition ${
                        isActive
                          ? "border-red-200 bg-red-50"
                          : "border-transparent bg-white hover:border-[#f0f1f5] hover:bg-[#fafafa]"
                      }`}
                    >
                      <div className="grid grid-cols-[36px_minmax(0,1fr)_72px] items-start gap-3">
                        <div
                          className={`mt-0.5 flex h-9 w-9 items-center justify-center rounded-xl ${
                            isActive
                              ? "bg-white text-red-500"
                              : "bg-[#f5f5f7] text-[#6b7280]"
                          }`}
                        >
                          <Bot className="h-4 w-4" />
                        </div>

                        <div className="min-w-0 overflow-hidden">
                          {isEditing ? (
                            <div className="flex items-center gap-2">
                              <Input
                                value={editingTitle}
                                onChange={(e) => setEditingTitle(e.target.value)}
                                className="h-8 min-w-0 w-full"
                                autoFocus
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    e.preventDefault();
                                    void submitEdit();
                                  }
                                  if (e.key === "Escape") {
                                    e.preventDefault();
                                    cancelEdit();
                                  }
                                }}
                              />
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => onSelectThread(thread.id)}
                              className="block w-full min-w-0 text-left"
                            >
                              <div
                                className="truncate text-sm font-semibold text-[#111827]"
                                title={thread.title || "Cuộc trò chuyện"}
                              >
                                {thread.title || "Cuộc trò chuyện"}
                              </div>
                              <div
                                className="mt-1 truncate text-xs text-[#9ca3af]"
                                title={formatDate(thread.updatedAt)}
                              >
                                {formatDate(thread.updatedAt)}
                              </div>
                            </button>
                          )}
                        </div>

                        <div className="flex w-[72px] min-w-[72px] items-start justify-end gap-1">
                          {isEditing ? (
                            <>
                              <button
                                type="button"
                                onClick={() => void submitEdit()}
                                className="rounded-lg p-1.5 text-[#9ca3af] transition hover:bg-white hover:text-green-600"
                                title="Lưu"
                              >
                                <Check className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={cancelEdit}
                                className="rounded-lg p-1.5 text-[#9ca3af] transition hover:bg-white hover:text-gray-700"
                                title="Huỷ"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => startEdit(thread)}
                                className="rounded-lg p-1.5 text-[#9ca3af] opacity-70 transition hover:bg-white hover:text-blue-600 hover:opacity-100"
                                title="Sửa tiêu đề"
                              >
                                <Pencil className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => onDeleteConversation(e, thread.id)}
                                className="rounded-lg p-1.5 text-[#9ca3af] opacity-70 transition hover:bg-white hover:text-red-500 hover:opacity-100"
                                title="Xoá cuộc trò chuyện"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </ScrollArea>

          <div className="sticky bottom-0 border-t border-[#f1f1f5] bg-white p-3">
            <Button
              variant="outline"
              onClick={onClearAllHistory}
              className="h-11 w-full rounded-2xl border-red-200 text-red-500 hover:bg-red-50 hover:text-red-600"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Xoá tất cả lịch sử
            </Button>
          </div>
        </div>
      )}
    </aside>
  );
}