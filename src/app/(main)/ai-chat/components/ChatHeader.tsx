"use client";

import Link from "next/link";
import { ArrowLeft, Bot, PanelLeft } from "lucide-react";

interface ChatHeaderProps {
  userName?: string;
  onToggleSidebar: () => void;
}

export function ChatHeader({
  userName,
  onToggleSidebar,
}: ChatHeaderProps) {
  return (
    <div className="border-b border-[#ececf2] bg-white px-4 py-3 sm:px-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onToggleSidebar}
            className="hidden rounded-xl border border-[#ececf2] p-2 text-[#6b7280] hover:bg-[#f9fafb] lg:flex"
          >
            <PanelLeft className="h-5 w-5" />
          </button>

          <Link
            href="/"
            className="rounded-xl p-2 text-[#6b7280] hover:bg-[#f9fafb] hover:text-[#111827]"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>

          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-red-500 text-white shadow-sm">
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-base font-semibold text-[#111827]">Trợ lý AI</h1>
              <p className="text-xs text-[#6b7280]">Hỗ trợ tra cứu thông tin</p>
            </div>
          </div>
        </div>

        <div className="hidden items-center gap-3 sm:flex">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500 text-sm font-semibold text-white">
            {userName?.[0]?.toUpperCase()}
          </div>
        </div>
      </div>
    </div>
  );
}