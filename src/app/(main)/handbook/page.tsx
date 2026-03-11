"use client";

import { useState } from "react";
import useSWR from "swr";
import {
  ArrowLeft,
  Book,
  ChevronRight,
  Search,
  Star,
  Calendar,
  Eye,
  User,
  Pin,
  Loader2,
  Filter,
} from "lucide-react";
import Link from "next/link";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface HandbookCategory {
  id: number;
  name: string;
  slug: string;
  description: string;
  color: string;
  icon: string;
  publishedCount: string;
  totalCount: string;
}

interface Handbook {
  id: number;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  coverImage: string | null;
  categoryId: number | null;
  authorName: string | null;
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

const getRelativeTime = (dateString: string | null) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  const now = new Date();
  const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

  if (diffInDays === 0) return "Hôm nay";
  if (diffInDays === 1) return "Hôm qua";
  if (diffInDays < 7) return `${diffInDays} ngày trước`;
  if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} tuần trước`;
  return formatDate(dateString);
};

export default function HandbookPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);

  const { data: handbooks = [], isLoading } = useSWR<Handbook[]>(
    "/api/handbooks?status=published",
    fetcher
  );
  const { data: categories = [] } = useSWR<HandbookCategory[]>(
    "/api/handbooks/categories",
    fetcher
  );

  const filteredHandbooks = handbooks.filter((h) => {
    const matchesSearch =
      h.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (h.excerpt?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
    const matchesCategory = !selectedCategory || h.categoryId === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const featuredHandbooks = filteredHandbooks.filter((h) => h.isFeatured || h.isPinned);
  const regularHandbooks = filteredHandbooks.filter((h) => !h.isFeatured && !h.isPinned);

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-6">
      <Header />
      <main className="mx-auto max-w-7xl px-4 py-6">
        <Link
          href="/"
          className="mb-4 inline-flex items-center gap-2 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Trang chủ</span>
        </Link>

        {/* Page Header */}
        <div className="mb-8">
          <h1 className="flex items-center gap-3 text-3xl font-bold text-foreground">
            <div className="rounded-xl bg-primary/10 p-2">
              <Book className="h-7 w-7 text-primary" />
            </div>
            Sổ tay Đảng viên
          </h1>
          <p className="mt-2 text-lg text-muted-foreground">
            Tin tức, hướng dẫn và tài liệu học tập cho Đảng viên
          </p>
        </div>

        {/* Search and Filter */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Tìm kiếm bài viết..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button variant="outline" className="gap-2">
            <Filter className="h-4 w-4" />
            Lọc
          </Button>
        </div>

        {/* Categories */}
        <div className="mb-8 flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          <Button
            variant={selectedCategory === null ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedCategory(null)}
            className="shrink-0"
          >
            Tất cả
          </Button>
          {categories.map((cat) => (
            <Button
              key={cat.id}
              variant={selectedCategory === cat.id ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory(cat.id)}
              className="shrink-0 gap-1"
              style={{
                borderColor: selectedCategory === cat.id ? undefined : cat.color,
                color: selectedCategory === cat.id ? undefined : cat.color,
              }}
            >
              {cat.name}
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                {cat.publishedCount}
              </Badge>
            </Button>
          ))}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {/* Featured/Pinned Posts */}
            {featuredHandbooks.length > 0 && (
              <div className="mb-10">
                <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold text-foreground">
                  <Star className="h-5 w-5 text-yellow-500" />
                  Bài viết nổi bật
                </h2>
                <div className="grid gap-6 md:grid-cols-2">
                  {featuredHandbooks.slice(0, 2).map((handbook, index) => (
                    <Link key={handbook.id} href={`/handbook/${handbook.slug}`}>
                      <Card
                        className={`group h-full cursor-pointer overflow-hidden transition-all hover:shadow-lg ${
                          index === 0 ? "md:col-span-2" : ""
                        }`}
                      >
                        <div
                          className={`relative ${
                            index === 0 ? "h-48 md:h-64" : "h-40"
                          } bg-gradient-to-br from-primary/20 via-primary/10 to-secondary/20`}
                        >
                          <div className="absolute inset-0 flex items-center justify-center">
                            <Book className="h-16 w-16 text-primary/20" />
                          </div>
                          {handbook.isPinned && (
                            <div className="absolute left-3 top-3 rounded-full bg-primary p-1.5">
                              <Pin className="h-3 w-3 text-white" />
                            </div>
                          )}
                          {handbook.isFeatured && (
                            <div className="absolute right-3 top-3 rounded-full bg-yellow-500 p-1.5">
                              <Star className="h-3 w-3 fill-white text-white" />
                            </div>
                          )}
                        </div>
                        <CardContent className="p-5">
                          <div className="mb-3 flex items-center gap-2">
                            <Badge
                              variant="outline"
                              style={{
                                borderColor: handbook.categoryColor || undefined,
                                color: handbook.categoryColor || undefined,
                              }}
                            >
                              {handbook.categoryName || "Chưa phân loại"}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {getRelativeTime(handbook.publishedAt)}
                            </span>
                          </div>
                          <h3 className="mb-2 line-clamp-2 text-xl font-bold text-foreground transition-colors group-hover:text-primary">
                            {handbook.title}
                          </h3>
                          <p className="mb-4 line-clamp-2 text-muted-foreground">
                            {handbook.excerpt || "Xem chi tiết bài viết..."}
                          </p>
                          <div className="flex items-center justify-between text-sm text-muted-foreground">
                            <div className="flex items-center gap-4">
                              {handbook.authorName && (
                                <span className="flex items-center gap-1">
                                  <User className="h-3.5 w-3.5" />
                                  {handbook.authorName}
                                </span>
                              )}
                              <span className="flex items-center gap-1">
                                <Eye className="h-3.5 w-3.5" />
                                {handbook.viewCount} lượt xem
                              </span>
                            </div>
                            <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Regular Posts */}
            <div>
              <h2 className="mb-4 text-xl font-semibold text-foreground">
                {selectedCategory
                  ? categories.find((c) => c.id === selectedCategory)?.name || "Bài viết"
                  : "Tất cả bài viết"}
              </h2>
              <div className="space-y-4">
                {regularHandbooks.map((handbook) => (
                  <Link key={handbook.id} href={`/handbook/${handbook.slug}`}>
                    <Card className="group cursor-pointer transition-all hover:shadow-md">
                      <CardContent className="flex gap-4 p-4">
                        <div className="hidden h-24 w-32 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary/10 to-secondary/10 sm:flex">
                          <Book className="h-8 w-8 text-primary/30" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="mb-2 flex flex-wrap items-center gap-2">
                            <Badge
                              variant="outline"
                              className="text-xs"
                              style={{
                                borderColor: handbook.categoryColor || undefined,
                                color: handbook.categoryColor || undefined,
                              }}
                            >
                              {handbook.categoryName || "Chưa phân loại"}
                            </Badge>
                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Calendar className="h-3 w-3" />
                              {getRelativeTime(handbook.publishedAt)}
                            </span>
                          </div>
                          <h3 className="mb-1 line-clamp-1 font-semibold text-foreground transition-colors group-hover:text-primary">
                            {handbook.title}
                          </h3>
                          <p className="mb-2 line-clamp-2 text-sm text-muted-foreground">
                            {handbook.excerpt || "Xem chi tiết bài viết..."}
                          </p>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            {handbook.authorName && (
                              <span className="flex items-center gap-1">
                                <User className="h-3 w-3" />
                                {handbook.authorName}
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <Eye className="h-3 w-3" />
                              {handbook.viewCount}
                            </span>
                          </div>
                        </div>
                        <ChevronRight className="hidden h-5 w-5 shrink-0 self-center text-muted-foreground transition-transform group-hover:translate-x-1 sm:block" />
                      </CardContent>
                    </Card>
                  </Link>
                ))}

                {filteredHandbooks.length === 0 && (
                  <div className="py-20 text-center">
                    <Book className="mx-auto mb-4 h-16 w-16 text-muted-foreground/30" />
                    <p className="text-lg text-muted-foreground">Chưa có bài viết nào</p>
                    <p className="text-sm text-muted-foreground">
                      {searchQuery
                        ? "Thử tìm kiếm với từ khóa khác"
                        : "Các bài viết sẽ xuất hiện ở đây"}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </main>
      <BottomNav />
    </div>
  );
}
