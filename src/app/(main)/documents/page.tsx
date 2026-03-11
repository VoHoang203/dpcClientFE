"use client";

import { useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import {
  Search,
  FileText,
  FolderOpen,
  Download,
  Eye,
  Clock,
  ArrowLeft,
  File,
  Star,
  Loader2,
  Filter,
  X,
} from "lucide-react";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

interface DocumentCategory {
  id: number;
  name: string;
  slug: string;
  description: string;
  color: string;
  icon: string;
  documentCount: string;
}

interface Document {
  id: number;
  title: string;
  slug: string;
  description: string;
  fileUrl: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  categoryId: number | null;
  uploadedBy: string | null;
  status: string;
  isFeatured: boolean;
  downloadCount: number;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  categoryName?: string;
  categorySlug?: string;
  categoryColor?: string;
  categoryIcon?: string;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const formatFileSize = (bytes: number) => {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
};

const getFileIcon = (type: string) => {
  switch (type.toLowerCase()) {
    case "pdf":
      return <FileText className="h-8 w-8 text-red-500" />;
    case "docx":
    case "doc":
      return <FileText className="h-8 w-8 text-blue-500" />;
    case "xlsx":
    case "xls":
      return <FileText className="h-8 w-8 text-green-600" />;
    case "pptx":
    case "ppt":
      return <FileText className="h-8 w-8 text-orange-500" />;
    default:
      return <File className="h-8 w-8 text-muted-foreground" />;
  }
};

const getFileTypeBadgeColor = (type: string) => {
  switch (type.toLowerCase()) {
    case "pdf":
      return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
    case "docx":
    case "doc":
      return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
    case "xlsx":
    case "xls":
      return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
    case "pptx":
    case "ppt":
      return "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400";
    default:
      return "bg-muted text-muted-foreground";
  }
};

export default function DocumentsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);

  const { toast } = useToast();

  const { data: documents = [], isLoading } = useSWR<Document[]>("/api/documents", fetcher);
  const { data: categories = [] } = useSWR<DocumentCategory[]>(
    "/api/documents/categories",
    fetcher
  );

  const filteredDocuments = documents.filter((d) => {
    const matchesSearch =
      d.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (d.description?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
    const matchesCategory = !selectedCategory || d.categoryId === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const featuredDocuments = filteredDocuments.filter((d) => d.isFeatured);

  const handleDownload = async (doc: Document) => {
    try {
      // Increment download count
      await fetch(`/api/documents/${doc.id}/download`, { method: "POST" });

      // Trigger download
      const link = document.createElement("a");
      link.href = doc.fileUrl;
      link.download = doc.fileName;
      link.target = "_blank";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: "Đang tải xuống",
        description: `Đang tải ${doc.fileName}...`,
      });
    } catch {
      toast({
        title: "Lỗi",
        description: "Không thể tải xuống tài liệu",
        variant: "destructive",
      });
    }
  };

  const openDocumentDetail = (doc: Document) => {
    setSelectedDocument(doc);
    setDetailDialogOpen(true);
  };

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-6">
      <Header />
      <main className="mx-auto max-w-7xl px-4 py-6">
        <Link
          href="/"
          className="mb-4 inline-flex items-center gap-2 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Trang chủ
        </Link>

        {/* Page Header */}
        <div className="mb-8">
          <h1 className="flex items-center gap-3 text-3xl font-bold text-foreground">
            <div className="rounded-xl bg-primary/10 p-2">
              <FolderOpen className="h-7 w-7 text-primary" />
            </div>
            Thư viện Tài liệu
          </h1>
          <p className="mt-2 text-lg text-muted-foreground">
            Tra cứu và tải xuống văn bản, quy định, biểu mẫu
          </p>
        </div>

        {/* Search and Filter */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Tìm kiếm tài liệu..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2"
                onClick={() => setSearchQuery("")}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          <Button variant="outline" className="gap-2">
            <Filter className="h-4 w-4" />
            Bộ lọc
          </Button>
        </div>

        {/* Categories Pills */}
        <div className="mb-6 flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          <Button
            variant={selectedCategory === null ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedCategory(null)}
            className="shrink-0 gap-1"
          >
            Tất cả
            <Badge variant="secondary" className="ml-1 h-5 px-1.5">
              {documents.length}
            </Badge>
          </Button>
          {categories.map((cat) => (
            <Button
              key={cat.id}
              variant={selectedCategory === cat.id ? "default" : "outline"}
              size="sm"
              className="shrink-0 gap-1"
              onClick={() => setSelectedCategory(cat.id)}
            >
              {cat.name}
              <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                {cat.documentCount}
              </Badge>
            </Button>
          ))}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <Tabs defaultValue="list">
            <TabsList className="mb-6 grid w-full max-w-md grid-cols-2">
              <TabsTrigger value="list" className="gap-2">
                <FileText className="h-4 w-4" />
                Danh sách
              </TabsTrigger>
              <TabsTrigger value="folder" className="gap-2">
                <FolderOpen className="h-4 w-4" />
                Thư mục
              </TabsTrigger>
            </TabsList>

            {/* List View */}
            <TabsContent value="list" className="space-y-4">
              {/* Featured Documents */}
              {featuredDocuments.length > 0 && !selectedCategory && (
                <div className="mb-8">
                  <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
                    <Star className="h-5 w-5 text-yellow-500" />
                    Tài liệu quan trọng
                  </h2>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {featuredDocuments.slice(0, 3).map((doc) => (
                      <Card
                        key={doc.id}
                        className="group cursor-pointer transition-all hover:shadow-md"
                        onClick={() => openDocumentDetail(doc)}
                      >
                        <CardContent className="p-4">
                          <div className="mb-3 flex items-start gap-3">
                            {getFileIcon(doc.fileType)}
                            <div className="min-w-0 flex-1">
                              <Badge className={`text-xs ${getFileTypeBadgeColor(doc.fileType)}`}>
                                {doc.fileType.toUpperCase()}
                              </Badge>
                            </div>
                            <Star className="h-4 w-4 shrink-0 fill-yellow-400 text-yellow-400" />
                          </div>
                          <h3 className="mb-1 line-clamp-2 font-medium text-foreground group-hover:text-primary">
                            {doc.title}
                          </h3>
                          <p className="mb-2 line-clamp-1 text-sm text-muted-foreground">
                            {doc.description || "Không có mô tả"}
                          </p>
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>{formatFileSize(doc.fileSize)}</span>
                            <span className="flex items-center gap-1">
                              <Download className="h-3 w-3" />
                              {doc.downloadCount}
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* All Documents */}
              <div className="space-y-3">
                {filteredDocuments
                  .filter((d) => !d.isFeatured || selectedCategory)
                  .map((doc) => (
                    <Card
                      key={doc.id}
                      className="group cursor-pointer transition-all hover:shadow-md"
                      onClick={() => openDocumentDetail(doc)}
                    >
                      <CardContent className="flex items-center gap-4 p-4">
                        {getFileIcon(doc.fileType)}
                        <div className="min-w-0 flex-1">
                          <div className="mb-1 flex items-center gap-2">
                            <h3 className="line-clamp-1 font-medium text-foreground group-hover:text-primary">
                              {doc.title}
                            </h3>
                            {doc.isFeatured && (
                              <Star className="h-3 w-3 shrink-0 fill-yellow-400 text-yellow-400" />
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                            <Badge variant="secondary" className="text-xs">
                              {doc.categoryName || "Chưa phân loại"}
                            </Badge>
                            <Badge className={`text-xs ${getFileTypeBadgeColor(doc.fileType)}`}>
                              {doc.fileType.toUpperCase()}
                            </Badge>
                            <span>{formatFileSize(doc.fileSize)}</span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatDate(doc.createdAt)}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              openDocumentDetail(doc);
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDownload(doc);
                            }}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}

                {filteredDocuments.length === 0 && (
                  <div className="py-20 text-center">
                    <FolderOpen className="mx-auto mb-4 h-16 w-16 text-muted-foreground/30" />
                    <p className="text-lg text-muted-foreground">Không tìm thấy tài liệu</p>
                    <p className="text-sm text-muted-foreground">
                      {searchQuery ? "Thử tìm kiếm với từ khóa khác" : "Chưa có tài liệu nào"}
                    </p>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Folder View */}
            <TabsContent value="folder">
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                {categories.map((cat) => (
                  <Card
                    key={cat.id}
                    className="cursor-pointer transition-all hover:shadow-md"
                    onClick={() => setSelectedCategory(cat.id)}
                  >
                    <CardContent className="p-6 text-center">
                      <div
                        className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-xl"
                        style={{ backgroundColor: `${cat.color}20` }}
                      >
                        <FolderOpen className="h-8 w-8" style={{ color: cat.color }} />
                      </div>
                      <h3 className="mb-1 font-medium text-foreground">{cat.name}</h3>
                      <p className="text-sm text-muted-foreground">{cat.documentCount} tài liệu</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        )}
      </main>

      {/* Document Detail Dialog */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-lg">
          {selectedDocument && (
            <>
              <DialogHeader>
                <div className="flex items-start gap-4">
                  {getFileIcon(selectedDocument.fileType)}
                  <div className="min-w-0 flex-1">
                    <DialogTitle className="text-lg">{selectedDocument.title}</DialogTitle>
                    <DialogDescription className="mt-1">
                      {selectedDocument.description || "Không có mô tả"}
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Danh mục:</span>
                    <p className="font-medium">{selectedDocument.categoryName || "Chưa phân loại"}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Loại file:</span>
                    <p className="font-medium">{selectedDocument.fileType.toUpperCase()}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Kích thước:</span>
                    <p className="font-medium">{formatFileSize(selectedDocument.fileSize)}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Lượt tải:</span>
                    <p className="font-medium">{selectedDocument.downloadCount}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Ngày tải lên:</span>
                    <p className="font-medium">{formatDate(selectedDocument.createdAt)}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Người tải:</span>
                    <p className="font-medium">{selectedDocument.uploadedBy || "Admin"}</p>
                  </div>
                </div>

                {selectedDocument.tags && selectedDocument.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {selectedDocument.tags.map((tag, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}

                <div className="flex gap-2">
                  <Button className="flex-1 gap-2" onClick={() => handleDownload(selectedDocument)}>
                    <Download className="h-4 w-4" />
                    Tải xuống
                  </Button>
                  <Button variant="outline" onClick={() => setDetailDialogOpen(false)}>
                    Đóng
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <BottomNav />
    </div>
  );
}
