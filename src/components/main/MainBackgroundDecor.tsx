"use client";

import { usePathname } from "next/navigation";

/**
 * Ảnh nền + overlay chỉ cho trang chủ `/`. Các route khác trong `(main)` dùng nền phẳng (`MainContentShell`).
 */
export default function MainBackgroundDecor() {
  const pathname = usePathname();
  if (pathname !== "/") return null;

  return (
    <>
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/page-background.jpg')" }}
      />
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10 bg-linear-to-br from-background/88 via-background/68 to-background/78"
      />
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 bg-black/18" />
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10 shadow-[inset_0_0_120px_rgba(0,0,0,0.22)]"
      />
    </>
  );
}
