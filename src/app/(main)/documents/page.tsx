"use client";

import { useState } from "react";
import {
  Search,
  Filter,
  FileText,
  FolderOpen,
  Download,
  Eye,
  Clock,
  Plus,
} from "lucide-react";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Document {
  id: string;
  name: string;
  category: string;
  type: string;
  size: string;
  uploadedAt: string;
  uploadedBy: string;
}

const mockDocuments: Document[] = [
  {
    id: "1",
    name: "Điều lệ Đảng Cộng sản Việt Nam 2024.pdf",
    category: "Điều lệ",
    type: "pdf",
    size: "2.4 MB",
    uploadedAt: "15/01/2025",
    uploadedBy: "Admin",
  },
  {
    id: "2",
    name: "Quy định về đánh giá, xếp loại đảng viên.docx",
    category: "Quy định",
    type: "docx",
    size: "856 KB",
    uploadedAt: "10/01/2025",
    uploadedBy: "Bí thư",
  },
  {
    id: "3",
    name: "Hướng dẫn đóng Đảng phí 2025.pdf",
    category: "Hướng dẫn",
    type: "pdf",
    size: "425 KB",
    uploadedAt: "05/01/2025",
    uploadedBy: "Chi ủy",
  },
  {
    id: "4",
    name: "Mẫu báo cáo công tác Đảng viên.xlsx",
    category: "Biểu mẫu",
    type: "xlsx",
    size: "128 KB",
    uploadedAt: "01/01/2025",
    uploadedBy: "Admin",
  },
  {
    id: "5",
    name: "Nghị quyết Đại hội Chi bộ 2024.pdf",
    category: "Nghị quyết",
    type: "pdf",
    size: "1.2 MB",
    uploadedAt: "20/12/2024",
    uploadedBy: "Bí thư",
  },
];

const categories = [
  { id: "all", label: "Tất cả", count: 25 },
  { id: "dieu-le", label: "Điều lệ", count: 5 },
  { id: "quy-dinh", label: "Quy định", count: 8 },
  { id: "huong-dan", label: "Hướng dẫn", count: 6 },
  { id: "bieu-mau", label: "Biểu mẫu", count: 4 },
  { id: "nghi-quyet", label: "Nghị quyết", count: 2 },
];

const getFileIcon = (_type: string) => {
  return <FileText className="h-8 w-8 text-primary" />;
};

export default function DocumentsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-6">
      <Header />
      <main className="mx-auto max-w-7xl px-4 py-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Thư viện Tài liệu
            </h1>
            <p className="text-muted-foreground">Tra cứu văn bản, quy định</p>
          </div>
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Tải lên</span>
          </Button>
        </div>

        <div className="mb-6 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Tìm kiếm tài liệu..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button variant="outline" size="icon">
            <Filter className="h-4 w-4" />
          </Button>
        </div>

        <div className="mb-6 flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {categories.map((cat) => (
            <Button
              key={cat.id}
              variant={selectedCategory === cat.id ? "default" : "outline"}
              size="sm"
              className="shrink-0 gap-1"
              onClick={() => setSelectedCategory(cat.id)}
            >
              {cat.label}
              <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                {cat.count}
              </Badge>
            </Button>
          ))}
        </div>

        <Tabs defaultValue="list">
          <TabsList className="mb-6 grid w-full grid-cols-2">
            <TabsTrigger value="list" className="gap-2">
              <FileText className="h-4 w-4" />
              Danh sách
            </TabsTrigger>
            <TabsTrigger value="folder" className="gap-2">
              <FolderOpen className="h-4 w-4" />
              Thư mục
            </TabsTrigger>
          </TabsList>

          <TabsContent value="list" className="space-y-3">
            {mockDocuments.map((doc) => (
              <Card key={doc.id} className="transition-shadow hover:shadow-md">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    {getFileIcon(doc.type)}
                    <div className="min-w-0 flex-1">
                      <h3 className="mb-1 line-clamp-1 font-medium text-foreground">
                        {doc.name}
                      </h3>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                        <Badge variant="secondary">{doc.category}</Badge>
                        <span>{doc.size}</span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {doc.uploadedAt}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button size="icon" variant="ghost">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost">
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="folder">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              {categories.slice(1).map((cat) => (
                <Card
                  key={cat.id}
                  className="cursor-pointer transition-shadow hover:shadow-md"
                >
                  <CardContent className="p-6 text-center">
                    <FolderOpen className="mx-auto mb-3 h-12 w-12 text-secondary" />
                    <h3 className="font-medium">{cat.label}</h3>
                    <p className="text-sm text-muted-foreground">
                      {cat.count} tài liệu
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </main>
      <BottomNav />
    </div>
  );
}
