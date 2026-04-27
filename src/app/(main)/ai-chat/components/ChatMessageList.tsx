"use client";

import { Loader2, Bot } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import type { Message } from "../types";
import { ChatMessageItem } from "./ChatMessageItem";

interface ChatMessageListProps {
  messages: Message[];
  isLoading: boolean;
  bottomRef: React.RefObject<HTMLDivElement>;
}

export function ChatMessageList({
  messages,
  isLoading,
  bottomRef,
}: ChatMessageListProps) {
  return (
    <div className="space-y-5">
      {messages.map((message) => (
        <ChatMessageItem key={message.id} message={message} />
      ))}

      {isLoading && (
        <div className="flex gap-3">
          <Avatar className="mt-1 h-10 w-10 shrink-0 border border-[#ffe2e2] bg-[#fff1f1]">
            <AvatarFallback className="bg-[#fff1f1] text-red-500">
              <Bot className="h-5 w-5" />
            </AvatarFallback>
          </Avatar>

          <Card className="rounded-3xl border border-[#f0f1f5] bg-white shadow-sm">
            <CardContent className="flex items-center gap-2 p-4">
              <Loader2 className="h-4 w-4 animate-spin text-red-500" />
              <p className="text-sm text-[#6b7280]">AI đang trả lời...</p>
            </CardContent>
          </Card>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}