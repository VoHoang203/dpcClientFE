"use client";

import {
  ArrowLeft,
  Book,
  Download,
  Clock,
  User,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

interface HandbookDetail {
  id: string;
  title: string;
  description: string;
  content: string;
  lastUpdated: string;
  author: string;
  downloadUrl?: string;
}

const mockHandbook: HandbookDetail = {
  id: "ceremony-process",
  title: "Quy trình tổ chức Lễ Công nhận đảng viên chính thức",
  description:
    "Hướng dẫn chi tiết quy trình tổ chức Lễ Công nhận đảng viên chính thức kết hợp sinh hoạt Chi bộ định kỳ",
  lastUpdated: "20/01/2025",
  author: "Chi ủy Chi bộ",
  content: `
## HƯỚNG DẪN TỔ CHỨC LỄ CÔNG NHẬN ĐẢNG VIÊN CHÍNH THỨC KẾT HỢP SINH HOẠT CHI BỘ ĐỊNH KỲ

### BƯỚC 1: Nhận Quyết định
Chi ủy Nhận Quyết định Công nhận đảng viên chính thức từ Đảng ủy Bộ phận Khối Giáo dục FPT HN/ Hoặc Đảng ủy FPT

### BƯỚC 2: Lập kế hoạch tổ chức
Chi ủy tiến hành lập kế hoạch tổ chức: Lên dự trù kinh phí, phân công CV, thời gian/ địa điểm/ thành phần tham dự…

**Dự trù kinh phí:**
- Thiết kế backdrop chiếu màn hình chính của chương trình
- Hoa tươi hoặc quà tặng đảng viên
- Teabreak
- Thợ chụp ảnh

**Lưu ý:**
- Các lệnh thanh toán cần ghi rõ, VD: CB Khoi GD 3 tt tien hoa
- Các khoản thanh toán: Cần lấy hóa đơn VAT để lưu trữ
- Với từng sự kiện: Chi ủy lưu trữ đủ: Ảnh chụp lệnh chuyển khoản và hóa đơn VAT bản mềm

### BƯỚC 3: Chuẩn bị
Chi ủy tiến hành chuẩn bị:
- Email mời toàn bộ đảng viên trong Chi bộ và đại diện Đảng ủy Bộ phận Khối Giáo dục FPT HN/ Đảng ủy FPT tham gia
- Chuẩn bị các hạng mục theo dự trù kinh phí
- Chuẩn bị kịch bản MC cho chương trình

### BƯỚC 4: Tổ chức buổi lễ
Chi ủy tiến hành tổ chức buổi lễ. Buổi lễ gồm trình tự:

1. **Chào cờ** (hát Quốc ca, Quốc tế ca)
2. **Tuyên bố lý do, giới thiệu đại biểu**
3. **Bí thư Chi bộ đọc quyết định công nhận đảng viên chính thức**
   - Quyết định bản cứng nhận từ Đảng ủy Bộ phận Khối Giáo dục FPT HN/ Hoặc Đảng ủy FPT
4. **Bí thư Chi bộ trao quyết định công nhận đảng viên chính thức cho đảng viên**
5. **Đại diện Đảng ủy cấp trên phát biểu ý kiến** (nếu có)
6. **Họp chi bộ định kỳ:**
   - Bí thư/ Chi ủy chia sẻ các vấn đề nổi bật (Thông tin từ đảng bộ các cấp trên)
   - Đ/v chia sẻ/ báo cáo các vấn đề được phân công
   - Hỏi đáp/ giao lưu…
7. **Bế mạc**
8. **Chào cờ** (hát Quốc ca, Quốc tế ca)
9. **Chụp ảnh lưu niệm + teabreak**
  `,
};

export default function HandbookDetailPage() {
  const { id } = useParams<{ id: string }>();

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-6">
      <Header />
      <main className="mx-auto max-w-4xl px-4 py-6">
        <Link
          href="/handbook"
          className="mb-4 inline-flex items-center gap-2 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Quay lại Sổ tay</span>
        </Link>

        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="rounded-lg bg-primary/10 p-3">
                <Book className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <h1 className="mb-2 text-xl font-bold text-foreground">
                  {mockHandbook.title}
                </h1>
                <p className="mb-4 text-muted-foreground">
                  {mockHandbook.description}
                </p>
                <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    Cập nhật: {mockHandbook.lastUpdated}
                  </span>
                  <span className="flex items-center gap-1">
                    <User className="h-4 w-4" />
                    {mockHandbook.author}
                  </span>
                </div>
              </div>
            </div>
            <Separator className="my-4" />
            <div className="flex gap-3">
              <Button className="gap-2">
                <Download className="h-4 w-4" />
                Tải về PDF
              </Button>
              <Button variant="outline">Chia sẻ</Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="prose prose-sm max-w-none p-6">
            <div className="whitespace-pre-wrap text-foreground">
              {mockHandbook.content.split("\n").map((line, index) => {
                if (line.startsWith("## ")) {
                  return (
                    <h2
                      key={index}
                      className="mb-4 mt-6 text-xl font-bold text-foreground"
                    >
                      {line.replace("## ", "")}
                    </h2>
                  );
                }
                if (line.startsWith("### ")) {
                  return (
                    <h3
                      key={index}
                      className="mb-2 mt-4 text-lg font-semibold text-foreground"
                    >
                      {line.replace("### ", "")}
                    </h3>
                  );
                }
                if (line.startsWith("**") && line.endsWith("**")) {
                  return (
                    <p key={index} className="mb-1 mt-3 font-semibold">
                      {line.replace(/\*\*/g, "")}
                    </p>
                  );
                }
                if (line.startsWith("- ")) {
                  return (
                    <li key={index} className="ml-4 text-muted-foreground">
                      {line.replace("- ", "")}
                    </li>
                  );
                }
                if (line.match(/^\d+\. \*\*/)) {
                  const text = line
                    .replace(/^\d+\. \*\*/, "")
                    .replace(/\*\*$/, "");
                  const num = line.match(/^\d+/)?.[0];
                  return (
                    <p key={index} className="mt-2 font-semibold">
                      <span className="text-primary">{num}.</span> {text}
                    </p>
                  );
                }
                if (line.trim()) {
                  return (
                    <p key={index} className="text-muted-foreground">
                      {line}
                    </p>
                  );
                }
                return null;
              })}
            </div>
          </CardContent>
        </Card>
      </main>
      <BottomNav />
    </div>
  );
}
