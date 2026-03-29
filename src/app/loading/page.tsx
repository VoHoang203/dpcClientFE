import Image from "next/image";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Đang tải — FPTU DPC2",
  robots: { index: false, follow: false },
};

/** Trang xem thử UI loading (logo tròn + vòng quay). Route: `/loading`. */
export default function LoadingPreviewPage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-background px-4">
      <div className="relative flex h-44 w-44 items-center justify-center">
        {/* Vòng ngoài — quay */}
        <div
          className="pointer-events-none absolute inset-0 rounded-full border-4 border-transparent border-t-primary border-r-primary/45 motion-safe:animate-spin motion-reduce:animate-none"
          style={{ animationDuration: "1.15s" }}
          aria-hidden
        />
        {/* Vòng trong mờ — quay ngược, chậm hơn */}
        <div
          className="pointer-events-none absolute inset-[6px] rounded-full border-[3px] border-transparent border-b-primary/35 border-l-primary/20 motion-safe:animate-spin motion-reduce:animate-none"
          style={{ animationDuration: "1.8s", animationDirection: "reverse" }}
          aria-hidden
        />
        <div className="relative z-10 size-29 overflow-hidden rounded-full bg-muted shadow-[0_0_0_4px_hsl(var(--background)),0_8px_24px_-4px_rgba(0,0,0,0.15)] ring-1 ring-border/60">
          <Image
            src="/logo.png"
            alt="Logo"
            width={116}
            height={116}
            className="size-full object-cover"
            priority
          />
        </div>
      </div>
      <p className="mt-8 text-sm text-muted-foreground">Đang tải…</p>
    </div>
  );
}
