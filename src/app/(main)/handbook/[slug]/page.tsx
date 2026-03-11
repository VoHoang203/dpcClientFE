"use client";

import { use } from "react";
import useSWR from "swr";
import Link from "next/link";
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
import Header from "@/components/Header";
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

export default function HandbookDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);

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
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center py-32">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
        <BottomNav />
      </div>
    );
  }

  if (error || !handbook) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
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
    <div className="min-h-screen bg-background pb-20 md:pb-6">
      <Header />

      {/* Hero Section */}
      <div className="relative bg-gradient-to-br from-primary/10 via-primary/5 to-secondary/10 py-12">
        <div className="mx-auto max-w-4xl px-4">
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

      {/* Content */}
      <main className="mx-auto max-w-4xl px-4 py-8">
        <div className="grid gap-8 lg:grid-cols-[1fr_280px]">
          {/* Main Content */}
          <article className="min-w-0">
            <Card>
              <CardContent className="p-6 md:p-8">
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

          {/* Sidebar */}
          <aside className="hidden lg:block">
            <div className="sticky top-24 space-y-6">
              {/* Related Posts */}
              {filteredRelated.length > 0 && (
                <Card>
                  <CardContent className="p-4">
                    <h3 className="mb-4 font-semibold text-foreground">Bài viết liên quan</h3>
                    <div className="space-y-4">
                      {filteredRelated.map((related) => (
                        <Link
                          key={related.id}
                          href={`/handbook/${related.slug}`}
                          className="group block"
                        >
                          <h4 className="line-clamp-2 text-sm font-medium text-foreground transition-colors group-hover:text-primary">
                            {related.title}
                          </h4>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {formatDate(related.publishedAt)}
                          </p>
                        </Link>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Quick Links */}
              <Card>
                <CardContent className="p-4">
                  <h3 className="mb-4 font-semibold text-foreground">Khám phá thêm</h3>
                  <div className="space-y-2">
                    <Link
                      href="/documents"
                      className="flex items-center justify-between rounded-lg p-2 text-sm transition-colors hover:bg-muted"
                    >
                      <span>Thư viện tài liệu</span>
                      <ChevronRight className="h-4 w-4" />
                    </Link>
                    <Link
                      href="/handbook"
                      className="flex items-center justify-between rounded-lg p-2 text-sm transition-colors hover:bg-muted"
                    >
                      <span>Tất cả bài viết</span>
                      <ChevronRight className="h-4 w-4" />
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
