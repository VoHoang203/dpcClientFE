"use client";

import useSWR from "swr";
import Link from "next/link";
import { useParams } from "next/navigation";
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
} from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

interface Handbook {
  id: number;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  coverImage: string | null;
  categoryId: number | null;
  authorName: string | null;
  authorAvatar: string | null;
  status: string;
  isFeatured: boolean;
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

const fetcher = (url: string) => fetch(url).then((res) => res.json());

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
  const minutes = Math.ceil(words / wordsPerMinute);
  return minutes;
};

export default function HandbookDetailPage() {
  const params = useParams();
  const slug = params.slug as string;

  const { data: handbook, isLoading, error } = useSWR<Handbook>(
    `/api/handbooks/${slug}`,
    fetcher
  );

  const { data: relatedHandbooks = [] } = useSWR<Handbook[]>(
    handbook?.categoryId ? `/api/handbooks?categoryId=${handbook.categoryId}&limit=4` : null,
    fetcher
  );

  const filteredRelated = relatedHandbooks.filter((h) => h.slug !== slug).slice(0, 3);
  if (isLoading) {
    return (
      <div className="min-h-0 flex-1 bg-background">
        <div className="flex items-center justify-center py-32">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
        <BottomNav />
      </div>
    );
  }

  if (error || !handbook) {
    return (
      <div className="min-h-0 flex-1 bg-background">
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
    <div className="min-h-0 flex-1 bg-background pb-20 md:pb-6">
      {/* Hero — cùng ảnh bìa /profile */}
      <div
        className="relative overflow-hidden bg-cover bg-center bg-no-repeat py-10 sm:py-12"
        style={{ backgroundImage: "url('/bg-profile.jpg')" }}
      >
        <div className="absolute inset-0 bg-linear-to-b from-background/88 via-background/82 to-background" />
        <div className="relative z-10 mx-auto w-full max-w-7xl px-4 sm:px-6">
          <Link
            href="/handbook"
            className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Quay lại Sổ tay
          </Link>

          <div className="mb-4 flex flex-wrap items-center gap-3">
            <Badge
              variant="outline"
              className="text-sm"
              style={{
                borderColor: handbook.categoryColor || undefined,
                color: handbook.categoryColor || undefined,
              }}
            >
              {handbook.categoryName || "Chưa phân loại"}
            </Badge>
            {handbook.isFeatured && (
              <Badge className="bg-yellow-500 text-white">Nổi bật</Badge>
            )}
          </div>

          <h1 className="mb-4 text-3xl font-bold leading-tight text-foreground md:text-4xl">
            {handbook.title}
          </h1>

          {handbook.excerpt && (
            <p className="mb-6 text-lg text-muted-foreground">{handbook.excerpt}</p>
          )}

          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            {handbook.authorName && (
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                  <User className="h-4 w-4 text-primary" />
                </div>
                <span className="font-medium text-foreground">{handbook.authorName}</span>
              </div>
            )}
            <Separator orientation="vertical" className="h-4" />
            <span className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              {formatDate(handbook.publishedAt || handbook.createdAt)}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              {readTime} phút đọc
            </span>
            <span className="flex items-center gap-1">
              <Eye className="h-4 w-4" />
              {handbook.viewCount} lượt xem
            </span>
          </div>
        </div>
      </div>

      {/* Nội dung rộng + cột phụ gọn bên phải */}
      <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_11.5rem] xl:grid-cols-[minmax(0,1fr)_13rem] lg:gap-8">
          {/* Main Content */}
          <article className="min-w-0">
            <Card className="shadow-sm">
              <CardContent className="p-5 md:p-8 lg:p-10">
                <div
                  className="prose prose-lg max-w-none dark:prose-invert prose-headings:font-bold prose-headings:text-foreground prose-p:text-foreground/90 prose-a:text-primary prose-strong:text-foreground prose-li:text-foreground/90"
                  dangerouslySetInnerHTML={{ __html: handbook.content }}
                />
              </CardContent>
            </Card>

            {/* Tags */}
            {handbook.tags && handbook.tags.length > 0 && (
              <div className="mt-6 flex flex-wrap items-center gap-2">
                <Tag className="h-4 w-4 text-muted-foreground" />
                {handbook.tags.map((tag, index) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}

            {/* Share Actions */}
            <div className="mt-6 flex items-center justify-between rounded-lg border bg-card p-4">
              <span className="text-sm text-muted-foreground">Chia sẻ bài viết này</span>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="gap-2">
                  <Share2 className="h-4 w-4" />
                  Chia sẻ
                </Button>
                <Button variant="outline" size="sm" className="gap-2">
                  <Bookmark className="h-4 w-4" />
                  Lưu
                </Button>
              </div>
            </div>
          </article>

          {/* Sidebar gọn */}
          <aside className="hidden lg:block">
            <div className="sticky top-20 space-y-3 xl:top-24">
              {filteredRelated.length > 0 && (
                <Card className="text-xs shadow-sm">
                  <CardContent className="p-3">
                    <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Liên quan
                    </h3>
                    <div className="space-y-3">
                      {filteredRelated.map((related) => (
                        <Link
                          key={related.id}
                          href={`/handbook/${related.slug}`}
                          className="group block border-b border-border/60 pb-3 last:border-0 last:pb-0"
                        >
                          <h4 className="line-clamp-3 text-xs font-medium leading-snug text-foreground transition-colors group-hover:text-primary">
                            {related.title}
                          </h4>
                          <p className="mt-1 text-[10px] text-muted-foreground">
                            {formatDate(related.publishedAt)}
                          </p>
                        </Link>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              <Card className="text-xs shadow-sm">
                <CardContent className="p-3">
                  <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Khám phá thêm
                  </h3>
                  <div className="space-y-1">
                    <Link
                      href="/documents"
                      className="flex items-center gap-1 rounded-md px-1.5 py-1.5 text-xs transition-colors hover:bg-muted"
                    >
                      <span className="min-w-0 flex-1 leading-tight">Thư viện tài liệu</span>
                      <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    </Link>
                    <Link
                      href="/handbook"
                      className="flex items-center gap-1 rounded-md px-1.5 py-1.5 text-xs transition-colors hover:bg-muted"
                    >
                      <span className="min-w-0 flex-1 leading-tight">Tất cả bài viết</span>
                      <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
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
