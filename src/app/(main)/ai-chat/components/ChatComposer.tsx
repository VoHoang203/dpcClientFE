"use client";

import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface ChatComposerProps {
  input: string;
  isLoading: boolean;
  error: string;
  onChangeInput: (value: string) => void;
  onSend: () => void | Promise<void>;
}

export function ChatComposer({
  input,
  isLoading,
  error,
  onChangeInput,
  onSend,
}: ChatComposerProps) {
  return (
    <section className="sticky bottom-0 mt-8 pb-6">
      <div className="rounded-[28px] border border-red-200 bg-white p-3 shadow-[0_12px_40px_rgba(239,68,68,0.08)]">
        <div className="flex items-end gap-3">
          <Input
            placeholder="Nhập câu hỏi của bạn..."
            value={input}
            onChange={(e) => onChangeInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void onSend();
              }
            }}
            className="h-14 flex-1 rounded-2xl border-0 bg-transparent px-4 text-base shadow-none focus-visible:ring-0"
            disabled={isLoading}
          />

          <Button
            onClick={() => void onSend()}
            disabled={isLoading || !input.trim()}
            className="h-14 rounded-2xl bg-red-500 px-6 text-base font-medium hover:bg-red-600"
          >
            <Send className="mr-2 h-4 w-4" />
            Gửi
          </Button>
        </div>

        {error && <p className="px-3 pt-2 text-sm text-red-500">{error}</p>}
      </div>
    </section>
  );
}