"use client";

import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function BackToTopButton({ className }: { className?: string }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setShow(window.scrollY > 500);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!show) return null;

  return (
    <Button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      className={cn(
        "fixed bottom-6 right-6 z-50 size-11 rounded-full border border-red-200 bg-red-50 text-red-600 shadow-lg hover:bg-red-100 hover:text-red-700",
        "focus-visible:ring-red-300/40",
        className
      )}
      aria-label="Lên đầu trang"
    >
      <ArrowUp className="size-5" />
    </Button>
  );
}

