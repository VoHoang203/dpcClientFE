"use client";

import { useRef } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HandbookCoverImage } from "@/components/handbook/HandbookCoverImage";
import { cn } from "@/lib/utils";

export type RelatedItem = {
  id: number;
  title: string;
  slug: string;
  coverImage: string | null;
  publishedAt: string | null;
};

type Props = {
  title: string;
  items: RelatedItem[];
  className?: string;
};

export function HandbookRelatedCarousel({ title, items, className }: Props) {
  const scrollerRef = useRef<HTMLDivElement>(null);

  if (items.length === 0) return null;

  const scrollBy = (dir: -1 | 1) => {
    const el = scrollerRef.current;
    if (!el) return;
    const w = el.clientWidth * 0.85;
    el.scrollBy({ left: dir * w, behavior: "smooth" });
  };

  return (
    <section className={cn("mt-10 border-t border-border pt-8", className)}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-foreground">{title}</h2>
        <div className="flex gap-1">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-8 shrink-0 rounded-full"
            onClick={() => scrollBy(-1)}
            aria-label="Trước"
          >
            <ChevronLeft className="size-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-8 shrink-0 rounded-full"
            onClick={() => scrollBy(1)}
            aria-label="Sau"
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>
      <div
        ref={scrollerRef}
        className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {items.map((item) => (
          <Link
            key={item.id}
            href={`/handbook/${item.slug}`}
            className="group w-[min(240px,78vw)] shrink-0"
          >
            <div className="relative aspect-video overflow-hidden rounded-lg bg-muted ring-1 ring-border/60">
              <HandbookCoverImage
                src={item.coverImage}
                alt=""
                className="absolute inset-0 size-full"
              />
            </div>
            <h3 className="mt-2 line-clamp-2 text-sm font-semibold leading-snug text-foreground transition-colors group-hover:text-primary">
              {item.title}
            </h3>
            {item.publishedAt && (
              <p className="mt-1 text-xs text-muted-foreground">
                {new Date(item.publishedAt).toLocaleDateString("vi-VN")}
              </p>
            )}
          </Link>
        ))}
      </div>
    </section>
  );
}
