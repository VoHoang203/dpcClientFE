"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { BrandLoadingIndicator } from "@/components/loading/BrandLoadingIndicator";
import { cn } from "@/lib/utils";

type Props = {
  /** Bật khi `useTransition` → `isPending` (tác vụ nặng trong `startTransition`). */
  open: boolean;
  label?: string;
  className?: string;
};

/**
 * Lớp phủ toàn màn — nền `bg-background` đặc (không lộ ảnh nền trang main).
 * Dùng với `useTransition` + `open={isLoading}` (hoặc isPending).
 */
export function PendingLoadingOverlay({
  open,
  label = "Đang xử lý…",
  className,
}: Props) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    if (open) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
    return undefined;
  }, [open, mounted]);

  if (!mounted) return null;

  return createPortal(
    <div
      role="status"
      aria-live="polite"
      aria-busy={open}
      aria-hidden={!open}
      className={cn(
        "fixed inset-0 z-200 flex items-center justify-center transition-[opacity,visibility] duration-300 ease-in-out motion-reduce:transition-none",
        open
          ? "visible bg-background opacity-100"
          : "invisible pointer-events-none opacity-0"
      )}
    >
      {open ? (
        <BrandLoadingIndicator label={label} layout="compact" className="bg-transparent" />
      ) : null}
    </div>,
    document.body
  );
}
