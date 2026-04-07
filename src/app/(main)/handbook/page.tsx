"use client";

import { useState } from "react";
import useSWR from "swr";
import { handbookService } from "@/services/handbookService";
import {
  ArrowLeft,
  Book,
  Search,
  Star,
  Loader2,
  Filter,
} from "lucide-react";
import Link from "next/link";
import BottomNav from "@/components/BottomNav";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { HandbookListRow } from "@/components/handbook/HandbookListRow";
import { cn } from "@/lib/utils";

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
  excerpt?: string;
  shortDescription?: string;
  content: string;
  coverImage: string | null;
  categoryId: number | null;
  authorName: string | null;
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

export default function HandbookPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);

  const { data: handbooks = [], isLoading } = useSWR<Handbook[]>(
    "handbooks-client",
    () => handbookService.getHandbooks()
  );
  const { data: categories = [] } = useSWR<HandbookCategory[]>(
    "handbook-categories",
    () => handbookService.getHandbookCategories()
  );

  const filteredHandbooks = handbooks.filter((h) => {
    const searchTarget = h.excerpt || h.shortDescription || "";
    const matchesSearch =
      h.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      searchTarget.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !selectedCategory || h.categoryId === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const featuredHandbooks = filteredHandbooks.filter((h) => h.isFeatured || h.isHighlighted || h.isPinned);
  const regularHandbooks = filteredHandbooks.filter((h) => !(h.isFeatured || h.isHighlighted) && !h.isPinned);

  const toRowItem = (h: Handbook) => ({
    id: h.id,
    title: h.title,
    slug: h.slug,
    excerpt: h.excerpt || h.shortDescription || "",
    coverImage: h.coverImage,
    categoryName: h.categoryName,
    categoryColor: h.categoryColor,
    authorName: h.authorName,
    publishedAt: h.publishedAt,
    viewCount: h.viewCount,
    isPinned: h.isPinned,
    isFeatured: h.isFeatured || h.isHighlighted || false,
  });

  return (
    <div className="min-h-0 flex-1 pb-20 md:pb-6">
      <main className="mx-auto max-w-4xl px-4 py-6 lg:max-w-5xl">
        <Link
          href="/"
          className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Trang chủ
        </Link>

        <div className="mb-8">
          <h1 className="flex items-center gap-3 text-3xl font-bold tracking-tight text-foreground">
            <div className="rounded-xl bg-primary/10 p-2">
              <Book className="h-7 w-7 text-primary" />
            </div>
            Sổ tay Đảng viên
          </h1>
          <p className="mt-2 text-muted-foreground">
            Tin tức, hướng dẫn và tài liệu học tập — bố cục dạng danh sách bài viết.
          </p>
        </div>

        <div className="mb-6 flex flex-col gap-4 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Tìm kiếm bài viết..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="border-2 pl-10 shadow-sm"
            />
          </div>
          <Button variant="outline" className="shrink-0 gap-2 border-2 shadow-sm">
            <Filter className="h-4 w-4" />
            Lọc
          </Button>
        </div>

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
          <div className="overflow-hidden rounded-xl border border-border/70 bg-card/95 shadow-md ring-1 ring-black/4 backdrop-blur-sm">
            {featuredHandbooks.length > 0 && (
              <>
                <div className="border-b border-border/80 bg-muted/20 px-4 py-3 md:px-6">
                  <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    <Star className="h-4 w-4 text-amber-500" />
                    Bài nổi bật / ghim
                  </h2>
                </div>
                <div className="px-3 md:px-5">
                  {featuredHandbooks.map((h) => (
                    <HandbookListRow
                      key={h.id}
                      handbook={toRowItem(h)}
                      featured
                    />
                  ))}
                </div>
              </>
            )}

            <div
              className={cn(
                "border-b border-border/80 px-4 py-3 md:px-6",
                featuredHandbooks.length > 0 && "border-t bg-muted/10"
              )}
            >
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                {selectedCategory
                  ? categories.find((c) => c.id === selectedCategory)?.name || "Danh sách"
                  : "Danh sách bài viết"}
              </h2>
            </div>
            <div className="px-3 md:px-5">
              {regularHandbooks.map((h) => (
                <HandbookListRow key={h.id} handbook={toRowItem(h)} />
              ))}

              {filteredHandbooks.length === 0 && (
                <div className="py-16 text-center">
                  <Book className="mx-auto mb-4 h-14 w-14 text-muted-foreground/25" />
                  <p className="font-medium text-foreground">Chưa có bài viết nào</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {searchQuery
                      ? "Thử tìm kiếm với từ khóa khác"
                      : "Các bài viết sẽ xuất hiện ở đây"}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
      <BottomNav />
    </div>
  );
}
