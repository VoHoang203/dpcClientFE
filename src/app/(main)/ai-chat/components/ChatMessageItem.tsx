"use client";

import { Bot, Paperclip, User } from "lucide-react";
import { Streamdown } from "streamdown";
import "streamdown/styles.css";

import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { fileService } from "@/services/fileService";
import type { Message } from "../types";

interface ChatMessageItemProps {
  message: Message;
}

export function ChatMessageItem({ message }: ChatMessageItemProps) {
  return (
    <div
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
          className={`overflow-hidden rounded-3xl border shadow-sm ${
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
                  {message.attachments.map((attachment, index) => (
                    <Button
                      key={`${message.id}-${index}`}
                      size="sm"
                      variant={message.role === "user" ? "secondary" : "outline"}
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
                          fileService.openInNewTab(attachment.filePath);
                        }
                      }}
                    >
                      <Paperclip className="h-3.5 w-3.5" />
                      <span className="max-w-56 truncate">{attachment.name}</span>
                    </Button>
                  ))}
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
  );
}