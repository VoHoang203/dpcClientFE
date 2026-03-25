"use client";

import Image from "next/image";
import { Book } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  src: string | null;
  alt: string;
  className?: string;
  imgClassName?: string;
  priority?: boolean;
};

export function HandbookCoverImage({
  src,
  alt,
  className,
  imgClassName,
  priority,
}: Props) {
  if (!src) {
    return (
      <div
        className={cn(
          "flex size-full items-center justify-center bg-muted/80",
          className
        )}
      >
        <Book className="size-1/4 min-h-8 min-w-8 text-muted-foreground/35" />
      </div>
    );
  }

  const local = src.startsWith("/") || src.startsWith("data:");

  if (local) {
    return (
      <div className={cn("relative size-full overflow-hidden", className)}>
        <Image
          src={src}
          alt={alt}
          fill
          sizes="(max-width: 640px) 100vw, 320px"
          className={cn("object-cover transition-transform duration-300 group-hover:scale-[1.02]", imgClassName)}
          priority={priority}
        />
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className={cn("size-full object-cover transition-transform duration-300 group-hover:scale-[1.02]", imgClassName)}
    />
  );
}
