"use client";

import { Bot } from "lucide-react";

export function ChatWelcome() {
  return (
    <section className="mb-8 rounded-[28px] border border-[#f1f1f5] bg-linear-to-br from-white to-[#fff7f7] px-6 py-8 shadow-sm">
      <div className="flex flex-col gap-5 md:flex-row md:items-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-red-50 text-red-500 shadow-sm">
          <Bot className="h-10 w-10" />
        </div>

        <div>
          <p className="mb-2 text-sm font-semibold uppercase tracking-[0.18em] text-red-500">
            Trợ lý AI
          </p>
          <h2 className="text-2xl font-bold leading-tight text-[#111827] md:text-4xl">
            Xin chào! Tôi là trợ lý AI của Chi bộ Khối Giáo dục 2 – Đại học FPT
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-[#6b7280] md:text-base">
            Tôi có thể giúp bạn tra cứu thông tin về điều lệ Đảng, quy định,
            quy trình và các câu hỏi thường gặp. Bạn cần hỗ trợ gì?
          </p>
        </div>
      </div>
    </section>
  );
}