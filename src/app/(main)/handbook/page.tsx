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
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";
import BottomNav from "@/components/BottomNav";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { HandbookListRow } from "@/components/handbook/HandbookListRow";
import { cn } from "@/lib/utils";
import { getDeployAPI } from "@/lib/apiEnv"; // THÊM IMPORT NÀY

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
  coverImage?: string | null;
  thumbnailUrl?: string | null; // THÊM TRƯỜNG NÀY ĐỂ BẮT DỮ LIỆU TỪ BACKEND
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

// THÊM HÀM GET IMAGE URL TƯƠNG TỰ BÊN ADMIN
const getImageUrl = (url?: string | null) => {
  if (!url) return "";
  if (url.startsWith("http") || url.startsWith("data:")) return url;

  if (url.startsWith("/documents/view/") || url.startsWith("/file/view")) {
    return `${getDeployAPI()}${url}`;
  }

  const cleanUrl = url.startsWith("/") ? url.substring(1) : url;
  return `${getDeployAPI()}/documents/view/${cleanUrl}`;
};

const ITEMS_PER_PAGE = 4;
const FEATURED_PER_PAGE = 2;

export default function HandbookPage() {
  const [currentPage, setCurrentPage] = useState(1);
  const [featuredPage, setFeaturedPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);

  // Fetch bản tin thường (có phân trang server)
  const { data: handbooks = [], isLoading } = useSWR<Handbook[]>(
    ["handbooks-client", currentPage, searchQuery, selectedCategory],
    () => handbookService.getHandbooks({
      page: currentPage,
      limit: ITEMS_PER_PAGE,
      search: searchQuery || undefined,
      categoryId: selectedCategory || undefined,
    })
  );

  // Fetch TẤT CẢ bản tin ghim (để phân trang client)
  const { data: allPinned = [] } = useSWR<Handbook[]>(
    ["handbooks-pinned", searchQuery, selectedCategory],
    () => handbookService.getHandbooks({
      isPinned: true,
      search: searchQuery || undefined,
      categoryId: selectedCategory || undefined,
      limit: 100 // Lấy tối đa 100 bài ghim để phân trang client
    })
  );
  const { data: categories = [] } = useSWR<HandbookCategory[]>(
    "handbook-categories",
    () => handbookService.getHandbookCategories()
  );

  // Các bài viết ghim (Phân trang Client)
  const totalFeaturedPages = Math.ceil(allPinned.length / FEATURED_PER_PAGE);
  const displayedFeatured = allPinned.slice(
    (featuredPage - 1) * FEATURED_PER_PAGE,
    featuredPage * FEATURED_PER_PAGE
  );

  // Các bài viết thường (Đã được filter/paginated từ API)
  // Loại bỏ các bài đã xuất hiện ở phần ghim để tránh trùng lặp nếu API trả về cả hai
  const regularHandbooks = handbooks.filter(
    (h) => !allPinned.some((p) => p.id === h.id)
  );

  const toRowItem = (h: Handbook) => ({
    id: h.id,
    title: h.title,
    slug: h.slug,
    excerpt: h.excerpt || h.shortDescription || "",
    // CẬP NHẬT CHỖ NÀY ĐỂ TRUYỀN URL ẢNH ĐÚNG VÀO COMPONENT CON
    coverImage: getImageUrl(h.thumbnailUrl || h.coverImage),
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
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
                setFeaturedPage(1);
              }}
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
            onClick={() => {
              setSelectedCategory(null);
              setCurrentPage(1);
              setFeaturedPage(1);
            }}
            className="shrink-0"
          >
            Tất cả
          </Button>
          {categories.map((cat) => (
            <Button
              key={cat.id}
              variant={selectedCategory === cat.id ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setSelectedCategory(cat.id);
                setCurrentPage(1);
                setFeaturedPage(1);
              }}
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
            {allPinned.length > 0 && (
              <>
                <div className="flex items-center justify-between border-b border-border/80 bg-muted/20 px-4 py-3 md:px-6">
                  <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    <Star className="h-4 w-4 text-amber-500" />
                    Bài nổi bật / ghim
                  </h2>

                  {allPinned.length > FEATURED_PER_PAGE && (
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => setFeaturedPage(p => Math.max(1, p - 1))}
                        disabled={featuredPage === 1}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <span className="text-[10px] font-medium text-muted-foreground">
                        {featuredPage}/{totalFeaturedPages}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => setFeaturedPage(p => Math.min(totalFeaturedPages, p + 1))}
                        disabled={featuredPage === totalFeaturedPages}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
                <div className="px-3 md:px-5">
                  {displayedFeatured.map((h) => (
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
                allPinned.length > 0 && "border-t bg-muted/10"
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

              {regularHandbooks.length === 0 && !isLoading && (
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

            {/* Pagination for Regular List */}
            {(handbooks.length > 0 || currentPage > 1) && (
              <div className="flex items-center justify-between border-t bg-muted/5 px-4 py-3 md:px-6">
                <p className="text-xs text-muted-foreground">
                  Trang {currentPage}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 px-3 text-xs"
                    onClick={() => {
                      setCurrentPage((p) => Math.max(1, p - 1));
                      window.scrollTo({ top: 300, behavior: 'smooth' });
                    }}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="mr-1 h-3 w-3" />
                    Trước
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 px-3 text-xs"
                    onClick={() => {
                      setCurrentPage((p) => p + 1);
                      window.scrollTo({ top: 300, behavior: 'smooth' });
                    }}
                    disabled={handbooks.length < ITEMS_PER_PAGE}
                  >
                    Sau
                    <ChevronRight className="ml-1 h-3 w-3" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
      <BottomNav />
    </div>
  );
}