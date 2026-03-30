import Image from "next/image";

type Props = {
  /** Nhãn dưới logo (mặc định: Đang tải…) */
  label?: string;
  /** full = min-h dùng cho full screen; compact = chỉ khối logo */
  layout?: "full" | "compact";
  className?: string;
};

/** Logo + vòng quay — dùng chung cho `/loading`, overlay `useTransition`, v.v. */
export function BrandLoadingIndicator({
  label = "Đang tải…",
  layout = "full",
  className = "",
}: Props) {
  const shell =
    layout === "full"
      ? "flex min-h-dvh flex-col items-center justify-center bg-background px-4"
      : "flex flex-col items-center justify-center px-4 py-6";

  return (
    <div className={`${shell} ${className}`.trim()}>
      <div className="relative flex h-44 w-44 items-center justify-center">
        <div
          className="pointer-events-none absolute inset-0 rounded-full border-4 border-transparent border-t-primary border-r-primary/45 motion-safe:animate-spin motion-reduce:animate-none"
          style={{ animationDuration: "1.15s" }}
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-[6px] rounded-full border-[3px] border-transparent border-b-primary/35 border-l-primary/20 motion-safe:animate-spin motion-reduce:animate-none"
          style={{ animationDuration: "1.8s", animationDirection: "reverse" }}
          aria-hidden
        />
        <div className="relative z-10 size-29 overflow-hidden rounded-full bg-muted shadow-[0_0_0_4px_hsl(var(--background)),0_8px_24px_-4px_rgba(0,0,0,0.15)] ring-1 ring-border/60">
          <Image
            src="/logo.png"
            alt=""
            width={116}
            height={116}
            className="size-full object-cover"
            priority
          />
        </div>
      </div>
      <p className="mt-8 text-sm text-muted-foreground">{label}</p>
    </div>
  );
}
