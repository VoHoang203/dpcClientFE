"use client";

import useSWR from "swr";
import Link from "next/link";
import { useParams } from "next/navigation";
import { handbookService } from "@/services/handbookService";
import {
  ArrowLeft,
  Book,
  Calendar,
  Eye,
  User,
  Share2,
  Bookmark,
  ChevronRight,
  Loader2,
  Clock,
  Tag,
  Facebook,
  Link2,
} from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { HandbookCoverImage } from "@/components/handbook/HandbookCoverImage";
import { HandbookRelatedCarousel } from "@/components/handbook/HandbookRelatedCarousel";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Handbook {
  id: number;
  title: string;
  slug: string;
  excerpt?: string;
  shortDescription?: string;
  content: string;
  coverImage: string | null;
  categoryId: number | null;
  authorName: string | null;
  authorAvatar: string | null;
  status: string;
  isFeatured?: boolean;
  isHighlighted?: boolean;
  isPinned: boolean;
  viewCount: number;
  tags: string[];
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  categoryName?: string;
  categorySlug?: string;
  categoryColor?: string;
  categoryIcon?: string;
}

const formatDate = (dateString: string | null) => {
  if (!dateString) return "";
  return new Date(dateString).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
};

const calculateReadTime = (content: string) => {
  const wordsPerMinute = 200;
  const words = content.replace(/<[^>]*>/g, "").split(/\s+/).length;
  return Math.max(1, Math.ceil(words / wordsPerMinute));
};

function ShareIconButton({
  label,
  children,
  onClick,
  className,
}: {
  label: string;
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      className={cn("size-9 rounded-full border-border/80 shadow-sm", className)}
      aria-label={label}
      onClick={onClick}
    >
      {children}
    </Button>
  );
}

export default function HandbookDetailPage() {
  const params = useParams();
  const slug = params.slug as string;

  const { data: handbook, isLoading, error } = useSWR<Handbook>(
    `handbook-${slug}`,
    () => handbookService.getHandbookBySlug(slug)
  );

  const { data: relatedHandbooks = [] } = useSWR<Handbook[]>(
    handbook ? `handbook-related-${slug}` : null,
    () => handbookService.getRelatedHandbooks(slug)
  );

  const filteredRelated = relatedHandbooks.filter((h) => h.slug !== slug);
  const sidebarRelated = filteredRelated.slice(0, 5);
  const carouselItems = filteredRelated.slice(0, 12).map((h) => ({
    id: h.id,
    title: h.title,
    slug: h.slug,
    coverImage: h.coverImage,
    publishedAt: h.publishedAt,
  }));

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success("Đã sao chép liên kết");
    } catch {
      toast.error("Không sao chép được liên kết");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-0 flex-1">
        <div className="flex items-center justify-center py-32">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
        <BottomNav />
      </div>
    );
  }

  if (error || !handbook) {
    return (
      <div className="min-h-0 flex-1">
        <main className="mx-auto max-w-4xl px-4 py-12 text-center">
          <Book className="mx-auto mb-4 h-16 w-16 text-muted-foreground/30" />
          <h1 className="mb-2 text-2xl font-bold text-foreground">Không tìm thấy bài viết</h1>
          <p className="mb-6 text-muted-foreground">
            Bài viết bạn tìm kiếm không tồn tại hoặc đã bị xóa.
          </p>
          <Button asChild>
            <Link href="/handbook">Quay lại danh sách</Link>
          </Button>
        </main>
        <BottomNav />
      </div>
    );
  }

  const readTime = calculateReadTime(handbook.content);

  return (
    <div className="min-h-0 flex-1 pb-20 md:pb-6">
      <main className="relative mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:py-10">
        {/* Cột chia sẻ dọc — desktop, kiểu trang tin */}
        <div className="pointer-events-none fixed left-4 top-[32%] z-40 hidden -translate-y-1/2 flex-col gap-2 xl:pointer-events-auto xl:flex">
          <ShareIconButton
            label="Chia sẻ Facebook"
            className="bg-card/95 backdrop-blur-sm"
            onClick={() => {
              const u = window.location.href;
              window.open(
                `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(u)}`,
                "_blank",
                "noopener,noreferrer"
              );
            }}
          >
            <Facebook className="size-4 text-[#1877F2]" />
          </ShareIconButton>
          <ShareIconButton
            label="Sao chép liên kết"
            className="bg-card/95 backdrop-blur-sm"
            onClick={copyLink}
          >
            <Link2 className="size-4" />
          </ShareIconButton>
        </div>

        <div className="mx-auto grid max-w-3xl gap-8 lg:max-w-none lg:grid-cols-[minmax(0,1fr)_260px] lg:gap-10 xl:max-w-6xl">
          <article className="min-w-0">
            <Link
              href="/handbook"
              className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              Quay lại Sổ tay
            </Link>

            <div className="rounded-xl border border-border/70 bg-card/95 p-6 shadow-md ring-1 ring-black/4 backdrop-blur-sm sm:p-8 md:p-10">
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <Badge
                  variant="outline"
                  className="font-normal"
                  style={{
                    borderColor: handbook.categoryColor || undefined,
                    color: handbook.categoryColor || undefined,
                  }}
                >
                  {handbook.categoryName || "Chưa phân loại"}
                </Badge>
                {(handbook.isFeatured || handbook.isHighlighted) && (
                  <Badge className="bg-amber-500 text-white hover:bg-amber-500">Nổi bật</Badge>
                )}
              </div>

              <h1 className="text-balance text-3xl font-bold leading-tight tracking-tight text-foreground md:text-4xl">
                {handbook.title}
              </h1>

              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 shrink-0" />
                  {formatDate(handbook.publishedAt || handbook.createdAt)}
                </span>
                {handbook.authorName ? (
                  <span className="inline-flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5 shrink-0" />
                    {handbook.authorName}
                  </span>
                ) : null}
                <span className="inline-flex items-center gap-1.5">
                  <Eye className="h-3.5 w-3.5 shrink-0" />
                  {handbook.viewCount.toLocaleString("vi-VN")} lượt xem
                </span>
              </div>

              {(handbook.excerpt || handbook.shortDescription) ? (
                <p className="mt-6 border-l-4 border-primary bg-muted/30 py-3 pl-4 pr-2 text-base font-semibold leading-relaxed text-foreground/95">
                  {handbook.excerpt || handbook.shortDescription}
                </p>
              ) : null}

              {handbook.coverImage && (
                <div className="relative mt-8 aspect-video overflow-hidden rounded-lg border border-border/60 bg-muted shadow-sm">
                  <HandbookCoverImage
                    src={handbook.coverImage}
                    alt=""
                    className="absolute inset-0 size-full"
                    priority
                  />
                </div>
              )}

              <div
                className={cn(
                  "prose prose-lg mt-8 max-w-none dark:prose-invert",
                  "prose-headings:font-bold prose-headings:text-foreground",
                  "prose-p:text-foreground/90 prose-p:leading-relaxed",
                  "prose-a:text-primary prose-strong:text-foreground",
                  "prose-li:text-foreground/90"
                )}
                dangerouslySetInnerHTML={{ __html: handbook.content }}
              />
            </div>

            {handbook.tags && handbook.tags.length > 0 && (
              <div className="mt-6 flex flex-wrap items-center gap-2">
                <Tag className="h-4 w-4 shrink-0 text-muted-foreground" />
                {handbook.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="rounded-full border border-border bg-background px-3 py-1 text-xs text-foreground shadow-sm"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}

            <div className="mt-6 flex flex-col gap-3 rounded-xl border border-border/70 bg-card/90 p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
              <span className="text-sm text-muted-foreground">Chia sẻ bài viết</span>
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="outline" size="sm" className="gap-2" onClick={copyLink}>
                  <Share2 className="h-4 w-4" />
                  Sao chép link
                </Button>
                <Button variant="outline" size="sm" className="gap-2">
                  <Bookmark className="h-4 w-4" />
                  Lưu
                </Button>
              </div>
            </div>

            <HandbookRelatedCarousel title="Bài cùng chuyên mục" items={carouselItems} />
          </article>

          <aside className="hidden lg:block">
            <div className="sticky top-24 space-y-4">
              {sidebarRelated.length > 0 && (
                <Card className="border-border/70 shadow-md">
                  <CardContent className="p-0">
                    <div className="border-b border-border/80 px-4 py-3">
                      <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                        Đọc thêm
                      </h3>
                    </div>
                    <nav className="divide-y divide-border/70 px-2 py-1">
                      {sidebarRelated.map((related) => (
                        <Link
                          key={related.id}
                          href={`/handbook/${related.slug}`}
                          className="group block px-2 py-3 transition-colors hover:bg-muted/50"
                        >
                          <p className="line-clamp-3 text-sm font-medium leading-snug text-foreground group-hover:text-primary">
                            {related.title}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {formatDate(related.publishedAt)}
                          </p>
                        </Link>
                      ))}
                    </nav>
                  </CardContent>
                </Card>
              )}

              <Card className="border-border/70 shadow-sm">
                <CardContent className="p-4">
                  <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                    Liên kết nhanh
                  </h3>
                  <div className="space-y-1">
                    <Link
                      href="/documents"
                      className="flex items-center gap-2 rounded-md px-2 py-2 text-sm transition-colors hover:bg-muted"
                    >
                      <span className="flex-1">Thư viện tài liệu</span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </Link>
                    <Separator />
                    <Link
                      href="/handbook"
                      className="flex items-center gap-2 rounded-md px-2 py-2 text-sm transition-colors hover:bg-muted"
                    >
                      <span className="flex-1">Tất cả bài viết</span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </div>
          </aside>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
