"use client";

import { AiChatProvider } from "@/contexts/ai-chat-context";

export default function AiChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AiChatProvider>
      <div className="flex min-h-screen bg-[#f8f8fb] text-[#1f2937]">
        {children}
      </div>
    </AiChatProvider>
  );
}