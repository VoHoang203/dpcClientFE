import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Props = {
  children: ReactNode;
  className?: string;
};

/**
 * Vào trang / khối nội dung — ease-in-out (dùng trong `template` (main)/(auth), không dùng cho route `/loading` hay overlay).
 */
export function PageEaseIn({ children, className }: Props) {
  return (
    <div className={cn("animate-ease-block", className)}>{children}</div>
  );
}
