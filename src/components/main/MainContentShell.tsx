"use client";

import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import MainExtras from "@/components/main/MainExtras";

export default function MainContentShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isHome = pathname === "/";

  return (
    <div
      className={cn(
        "relative z-0 flex min-h-0 flex-1 flex-col",
        isHome ? "bg-transparent" : "bg-background"
      )}
    >
      {children}
      <MainExtras />
    </div>
  );
}
