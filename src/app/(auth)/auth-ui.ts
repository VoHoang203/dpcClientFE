import { cn } from "@/lib/utils";

/** Card auth: nổi trên ảnh nền, blur nhẹ, viền sáng. */
export const authCardClassName = cn(
  "border-white/25 bg-card/92 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.45),0_8px_16px_-4px_rgba(0,0,0,0.2)] backdrop-blur-xl ring-1 ring-white/20 dark:border-white/15 dark:bg-card/88 dark:ring-white/10"
);

/** Ô nhập: nền đặc, viền rõ, bóng nhẹ — dễ đọc trên mọi theme. */
export const authInputClassName = cn(
  "border-2 border-border/90 bg-background shadow-[inset_0_1px_2px_rgba(15,23,42,0.06)] ring-1 ring-black/[0.04] transition-shadow",
  "placeholder:text-muted-foreground/90",
  "focus-visible:border-primary/60 focus-visible:ring-[3px] focus-visible:ring-primary/30"
);

export const authHeadingClassName = cn(
  "text-balance text-foreground drop-shadow-[0_1px_2px_rgba(0,0,0,0.25)]"
);

export const authSubheadingClassName = cn(
  "text-muted-foreground drop-shadow-[0_1px_1px_rgba(0,0,0,0.2)]"
);
