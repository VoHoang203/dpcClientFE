"use client";

import { Sparkles } from "lucide-react";

interface ChatSuggestionsProps {
  questions: string[];
  onSelect: (question: string) => void;
}

export function ChatSuggestions({
  questions,
  onSelect,
}: ChatSuggestionsProps) {
  return (
    <section className="mt-8">
      <p className="mb-3 flex items-center gap-2 text-sm font-medium text-[#6b7280]">
        <Sparkles className="h-4 w-4 text-red-500" />
        Gợi ý câu hỏi
      </p>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {questions.map((question) => (
          <button
            key={question}
            type="button"
            onClick={() => onSelect(question)}
            className="rounded-3xl border border-[#f5dede] bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-red-200 hover:shadow-md"
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
  );
}