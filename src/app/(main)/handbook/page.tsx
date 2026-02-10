"use client";

import { ArrowLeft, Book, ChevronRight, FileText, Star } from "lucide-react";
import Link from "next/link";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const handbookSections = [
  {
    id: "1",
    title: "Điều lệ Đảng",
    description: "Quy định cơ bản về tổ chức và hoạt động của Đảng",
    articles: 12,
    isNew: false,
  },
  {
    id: "2",
    title: "Quyền và nghĩa vụ Đảng viên",
    description: "Các quyền lợi và trách nhiệm của đảng viên",
    articles: 8,
    isNew: false,
  },
  {
    id: "3",
    title: "Quy định về sinh hoạt Đảng",
    description: "Hướng dẫn tham gia sinh hoạt chi bộ",
    articles: 6,
    isNew: true,
  },
  {
    id: "4",
    title: "Đánh giá, xếp loại Đảng viên",
    description: "Tiêu chí và quy trình đánh giá hàng năm",
    articles: 5,
    isNew: false,
  },
  {
    id: "5",
    title: "Kỷ luật Đảng",
    description: "Các hình thức kỷ luật và quy trình xử lý",
    articles: 7,
    isNew: false,
  },
  {
    id: "6",
    title: "Đảng phí",
    description: "Quy định về mức đóng và sử dụng đảng phí",
    articles: 4,
    isNew: true,
  },
];

export default function HandbookPage() {
  return (
    <div className="min-h-screen bg-background pb-20 md:pb-6">
      <Header />
      <main className="mx-auto max-w-7xl px-4 py-6">
        <Link
          href="/profile"
          className="mb-4 inline-flex items-center gap-2 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Quay lại</span>
        </Link>

        <div className="mb-6">
          <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground">
            <Book className="h-6 w-6 text-primary" />
            Sổ tay Đảng viên
          </h1>
          <p className="mt-1 text-muted-foreground">
            Tra cứu quy định, điều lệ và hướng dẫn
          </p>
        </div>

        <Card className="mb-6 bg-party-gradient text-primary-foreground">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="rounded-lg bg-white/20 p-3">
                <Star className="h-6 w-6" />
              </div>
              <div>
                <h3 className="mb-1 text-lg font-bold">Điều lệ Đảng 2024</h3>
                <p className="mb-3 text-sm text-primary-foreground/80">
                  Phiên bản mới nhất được cập nhật theo Đại hội XIII
                </p>
                <Badge
                  variant="secondary"
                  className="border-0 bg-white/20 text-white"
                >
                  Cập nhật mới
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-3">
          {handbookSections.map((section) => (
            <Card
              key={section.id}
              className="cursor-pointer transition-shadow hover:shadow-md"
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className="shrink-0 rounded-lg bg-primary/10 p-2">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex items-center gap-2">
                      <h3 className="font-medium text-foreground">
                        {section.title}
                      </h3>
                      {section.isNew && (
                        <Badge className="bg-secondary text-xs text-secondary-foreground">
                          Mới
                        </Badge>
                      )}
                    </div>
                    <p className="line-clamp-1 text-sm text-muted-foreground">
                      {section.description}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {section.articles} điều khoản
                    </p>
                  </div>
                  <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
