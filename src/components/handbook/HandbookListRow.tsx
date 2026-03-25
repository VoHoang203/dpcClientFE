"use client";

import Link from "next/link";
import { Pin, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { HandbookCoverImage } from "@/components/handbook/HandbookCoverImage";
import { cn } from "@/lib/utils";

export type HandbookListRowItem = {
  id: number;
  title: string;
  slug: string;
  excerpt: string;
  coverImage: string | null;
  categoryName?: string;
  categoryColor?: string;
  authorName: string | null;
  publishedAt: string | null;
  viewCount: number;
  isPinned?: boolean;
  isFeatured?: boolean;
};

type Props = {
  handbook: HandbookListRowItem;
  /** Dòng đầu / nổi bật: ảnh lớn hơn một chút */
  featured?: boolean;
  className?: string;
};

export function HandbookListRow({ handbook, featured, className }: Props) {
  const excerpt =
    handbook.excerpt?.trim() || "Xem nội dung chi tiết trong sổ tay Đảng viên.";

  return (
    <Link
      href={`/handbook/${handbook.slug}`}
      className={cn(
        "group flex flex-col gap-4 border-b border-border/80 py-5 transition-colors last:border-b-0 hover:bg-muted/30 sm:flex-row sm:items-stretch sm:gap-5 sm:py-6",
        featured && "rounded-xl border-b-0 bg-card/80 px-3 py-5 ring-1 ring-border/60 sm:px-4",
        className
      )}
    >
      <div
        className={cn(
          "relative shrink-0 overflow-hidden rounded-xl bg-muted shadow-sm ring-1 ring-black/4",
          featured
            ? "aspect-video w-full sm:aspect-[16/10] sm:w-[min(38%,320px)]"
            : "aspect-video w-full sm:aspect-video sm:w-[min(30%,280px)]"
        )}
      >
        <HandbookCoverImage
          src={handbook.coverImage}
          alt=""
          className="absolute inset-0 size-full"
        />
        {(handbook.isPinned || handbook.isFeatured) && (
          <div className="absolute left-2 top-2 flex gap-1.5">
            {handbook.isPinned && (
              <span className="rounded-md bg-primary p-1.5 text-primary-foreground shadow-sm">
                <Pin className="size-3.5" aria-hidden />
              </span>
            )}
            {handbook.isFeatured && (
              <span className="rounded-md bg-amber-500 p-1.5 text-white shadow-sm">
                <Star className="size-3.5 fill-current" aria-hidden />
              </span>
            )}
          </div>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col justify-center gap-2">
        <div className="flex flex-wrap items-center gap-2">
          {handbook.categoryName && (
            <Badge
              variant="outline"
              className="text-xs font-normal"
              style={{
                borderColor: handbook.categoryColor || undefined,
                color: handbook.categoryColor || undefined,
              }}
            >
              {handbook.categoryName}
            </Badge>
          )}
        </div>
        <h2
          className={cn(
            "font-bold leading-snug tracking-tight text-foreground transition-colors group-hover:text-primary",
            featured ? "text-xl sm:text-2xl" : "text-lg sm:text-xl"
          )}
        >
          {handbook.title}
        </h2>
        <p className="line-clamp-3 text-sm leading-relaxed text-muted-foreground sm:text-[15px]">
          {excerpt}
        </p>
        <p className="pt-1 text-xs text-muted-foreground/90">
          {handbook.authorName ? `${handbook.authorName}` : "Ban Tuyên giáo"}
          {handbook.publishedAt && (
            <>
              {" · "}
              {new Date(handbook.publishedAt).toLocaleDateString("vi-VN", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
              })}
            </>
          )}
          {typeof handbook.viewCount === "number" && (
            <span className="text-muted-foreground/70">
              {" · "}
              {handbook.viewCount.toLocaleString("vi-VN")} lượt xem
            </span>
          )}
        </p>
      </div>
    </Link>
  );
}
