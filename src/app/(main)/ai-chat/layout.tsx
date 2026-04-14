"use client";

import { AiChatProvider } from "@/contexts/ai-chat-context";


export default function AiChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AiChatProvider>
      <div className="flex min-h-0 flex-1 flex-col">{children}</div>
    </AiChatProvider>
  );
}