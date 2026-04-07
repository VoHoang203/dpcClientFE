"use client";

import { useState, useEffect } from "react";
import useSWR, { mutate } from "swr";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Eye,
  BookOpen,
  Save,
  MoreVertical,
  ArrowLeft,
  Globe,
  FileText,
  Clock,
  Pin,
  Star,
  Loader2,
  Upload,
  FolderOpen,
  File,
  Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { HandbookRichEditor } from "@/components/handbook/HandbookRichEditor";
import { documentService } from "@/services/documentService";
import { documentCategoryService } from "@/services/documentCategoryService";
import { handbookService } from "@/services/handbookService";
import { Settings } from "lucide-react";
import { getDeployAPI } from "@/lib/apiEnv";

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
  thumbnailUrl?: string | null;
  categoryId: string | number | null;
  authorName: string | null;
  authorAvatar: string | null;
  status: "draft" | "published" | "archived";
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
  category?: {
    id: string;
    name: string;
    slug: string;
  };
}

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
  categoryId: number | null;
  uploadedBy: string | null;
  status: string;
  isFeatured?: boolean;
  isHighlighted?: boolean;
  downloadCount: number;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  categoryName?: string;
  categoryColor?: string;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const getImageUrl = (url?: string | null) => {
  if (!url) return "";
  if (url.startsWith("http") || url.startsWith("data:")) return url;
  if (url.startsWith("/")) return `${getDeployAPI()}${url}`;
  return `${getDeployAPI()}/${url}`;
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const getFileTypeIcon = (type: string) => {
  switch (type.toLowerCase()) {
    case "pdf":
      return <FileText className="h-8 w-8 text-red-500" />;
    case "docx":
    case "doc":
      return <FileText className="h-8 w-8 text-blue-500" />;
    case "xlsx":
    case "xls":
      return <FileText className="h-8 w-8 text-green-500" />;
    default:
      return <File className="h-8 w-8 text-muted-foreground" />;
  }
};

const HandbookManagementPage = () => {
  const [activeTab, setActiveTab] = useState<"handbooks" | "documents">("handbooks");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "draft" | "published">("all");
  const [isEditing, setIsEditing] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [editingHandbook, setEditingHandbook] = useState<Handbook | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ type: "handbook" | "document"; id: number } | null>(null);
  const [documentDialogOpen, setDocumentDialogOpen] = useState(false);
  const [editingDocument, setEditingDocument] = useState<Document | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [newDraftKey, setNewDraftKey] = useState(0);
  const [formFile, setFormFile] = useState<File | null>(null);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<HandbookCategory | null>(null);
  const [catFormData, setCatFormData] = useState({ name: "" });
  const [isSavingCat, setIsSavingCat] = useState(false);

  const [formData, setFormData] = useState({
    title: "",
    categoryId: "",
    content: "",
    excerpt: "",
    status: "draft" as "draft" | "published",
    isFeatured: false,
    isPinned: false,
    authorName: "",
    tags: [] as string[],
  });

  const [docFormData, setDocFormData] = useState({
    title: "",
    description: "",
    fileUrl: "",
    fileName: "",
    fileType: "",
    categoryId: "",
    uploadedBy: "Chi ủy",
    isFeatured: false,
    tags: [] as string[],
  });

  const { toast } = useToast();

  // Fetch data
  const { data: handbooks = [], isLoading: handbooksLoading } = useSWR<Handbook[]>(
    "admin-handbooks",
    () => handbookService.getAdminHandbooks() as Promise<Handbook[]>
  );
  const { data: categories = [] } = useSWR<HandbookCategory[]>(
    "handbook-categories",
    () => handbookService.getHandbookCategories() as Promise<HandbookCategory[]>
  );
  const { data: documents = [], isLoading: documentsLoading } = useSWR<Document[]>(
    "documents",
    () => documentService.getDocuments() as Promise<Document[]>
  );
  const { data: docCategories = [] } = useSWR<DocumentCategory[]>(
    "document-categories",
    () => documentCategoryService.getCategories() as Promise<DocumentCategory[]>
  );

  const filteredHandbooks = handbooks.filter((h) => {
    const matchesSearch =
      h.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (h.category?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false) ||
      (h.categoryName?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
    const matchesStatus = filterStatus === "all" || h.status.toLowerCase() === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const enrichedDocuments = documents.map((doc) => {
    if (doc.categoryName) return doc;
    const cat = docCategories.find((c) => String(c.id) === String(doc.categoryId));
    return { ...doc, categoryName: cat?.name };
  });

  const filteredDocuments = enrichedDocuments.filter((d) =>
    d.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (d.categoryName?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false)
  );

  const resetForm = () => {
    setFormData({
      title: "",
      categoryId: "",
      content: "",
      excerpt: "",
      status: "draft",
      isFeatured: false,
      isPinned: false,
      authorName: "",
      tags: [],
    });
    setEditingHandbook(null);
    setFormFile(null);
  };

  const resetDocForm = () => {
    setDocFormData({
      title: "",
      description: "",
      fileUrl: "",
      fileName: "",
      fileType: "",
      categoryId: "",
      uploadedBy: "Chi ủy",
      isFeatured: false,
      tags: [],
    });
    setEditingDocument(null);
  };

  const openEditor = (handbook?: Handbook) => {
    if (handbook) {
      setEditingHandbook(handbook);
      setFormData({
        title: handbook.title,
        categoryId: handbook.categoryId?.toString() || "",
        content: handbook.content,
        excerpt: handbook.shortDescription || handbook.excerpt || "",
        status: handbook.status.toLowerCase() === "archived" ? "draft" : handbook.status.toLowerCase() as "draft" | "published",
        isFeatured: handbook.isFeatured || handbook.isHighlighted || false,
        isPinned: handbook.isPinned,
        authorName: handbook.authorName || "",
        tags: handbook.tags || [],
      });
      setFormFile(null);
    } else {
      setNewDraftKey((k) => k + 1);
      resetForm();
    }
    setIsEditing(true);
    setIsPreviewing(false);
  };

  const openDocumentDialog = (document?: Document) => {
    if (document) {
      setEditingDocument(document);
      setDocFormData({
        title: document.title,
        description: document.description || "",
        fileUrl: document.fileUrl,
        fileName: document.fileName,
        fileType: document.fileType,
        categoryId: document.categoryId?.toString() || "",
        uploadedBy: document.uploadedBy || "Chi ủy",
        isFeatured: document.isFeatured || false,
        tags: document.tags || [],
      });
    } else {
      resetDocForm();
    }
    setDocumentDialogOpen(true);
  };

  const handleSaveHandbook = async () => {
    if (!formData.title || !formData.content) {
      toast({ title: "Lỗi", description: "Vui lòng điền tiêu đề và nội dung" });
      return;
    }

    setIsSaving(true);
    try {
      let payload: FormData | Record<string, any>;

      if (formFile) {
        payload = new FormData();
        payload.append("title", formData.title);
        payload.append("shortDescription", formData.excerpt);
        payload.append("content", formData.content);
        if (formData.categoryId) payload.append("categoryId", formData.categoryId);
        if (formData.authorName) payload.append("authorName", formData.authorName);
        payload.append("status", formData.status.toUpperCase());
        payload.append("isHighlighted", String(formData.isFeatured));
        payload.append("isPinned", String(formData.isPinned));
        payload.append("file", formFile);
      } else {
        payload = {
          title: formData.title,
          shortDescription: formData.excerpt,
          content: formData.content,
          categoryId: formData.categoryId || undefined,
          authorName: formData.authorName || undefined,
          status: formData.status.toUpperCase(),
          isHighlighted: formData.isFeatured,
          isPinned: formData.isPinned,
        };
      }

      if (editingHandbook) {
        await handbookService.updateHandbook(editingHandbook.id, payload);
        toast({ title: "Thành công", description: "Đã cập nhật bài viết" });
      } else {
        await handbookService.createHandbook(payload);
        toast({ title: "Thành công", description: "Đã tạo bài viết mới" });
      }

      mutate("admin-handbooks");
      setIsEditing(false);
      resetForm();
    } catch {
      toast({ title: "Lỗi", description: "Không thể lưu bài viết" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveDocument = async () => {
    if (!docFormData.title || !docFormData.fileUrl || !docFormData.fileName) {
      toast({ title: "Lỗi", description: "Vui lòng điền đầy đủ thông tin" });
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        title: docFormData.title,
        description: docFormData.description,
        fileUrl: docFormData.fileUrl,
        fileName: docFormData.fileName,
        fileType: docFormData.fileType || docFormData.fileName.split(".").pop() || "file",
        categoryId: docFormData.categoryId ? parseInt(docFormData.categoryId) : null,
        uploadedBy: docFormData.uploadedBy,
        isFeatured: docFormData.isFeatured,
        tags: docFormData.tags,
      };

      if (editingDocument) {
        await documentService.updateDocument(editingDocument.id, payload);
        toast({ title: "Thành công", description: "Đã cập nhật tài liệu" });
      } else {
        // Form data for document creation (mocked as payload values with dummy file since there's no file input here)
        const formData = new FormData();
        Object.keys(payload).forEach(key => {
          const value = payload[key as keyof typeof payload];
          if (value !== null && value !== undefined) {
            formData.append(key, String(value));
          }
        });
        await documentService.createDocument(formData);
        toast({ title: "Thành công", description: "Đã thêm tài liệu mới" });
      }

      mutate("documents");
      setDocumentDialogOpen(false);
      resetDocForm();
    } catch {
      toast({ title: "Lỗi", description: "Không thể lưu tài liệu" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;

    try {
      if (itemToDelete.type === "handbook") {
        await handbookService.deleteHandbook(itemToDelete.id);
        mutate("admin-handbooks");
      } else {
        await documentService.deleteDocument(itemToDelete.id);
        mutate("documents");
      }

      toast({ title: "Đã xóa", description: `Đã xóa ${itemToDelete.type === "handbook" ? "bài viết" : "tài liệu"}` });
    } catch {
      toast({ title: "Lỗi", description: "Không thể xóa" });
    } finally {
      setDeleteDialogOpen(false);
      setItemToDelete(null);
    }
  };

  const togglePublish = async (id: number, currentStatus: string) => {
    const newStatus = currentStatus.toLowerCase() === "published" ? "draft" : "published";
    try {
      await handbookService.updateHandbook(id, { status: newStatus.toUpperCase() });
      mutate("admin-handbooks");
      toast({
        title: newStatus === "published" ? "Đã xuất bản" : "Đã chuyển nháp",
        description: `Bài viết đã được ${newStatus === "published" ? "xuất bản" : "chuyển về nháp"}`,
      });
    } catch {
      toast({ title: "Lỗi", description: "Không thể cập nhật trạng thái" });
    }
  };

  const togglePinned = async (id: number, currentPinned: boolean) => {
    try {
      await handbookService.updateHandbook(id, { isPinned: !currentPinned });
      mutate("admin-handbooks");
      toast({ title: currentPinned ? "Đã bỏ ghim" : "Đã ghim", description: "Cập nhật thành công" });
    } catch {
      toast({ title: "Lỗi", description: "Không thể cập nhật" });
    }
  };

  // Editor view
  if (isEditing) {
    return (
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between border-b bg-card px-4 py-3">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setIsEditing(false);
                resetForm();
              }}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <span className="font-semibold">
              {editingHandbook ? "Chỉnh sửa bài viết" : "Tạo bài viết mới"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={formData.status === "published" ? "default" : "secondary"}>
              {formData.status === "published" ? "Xuất bản" : "Bản nháp"}
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsPreviewing(!isPreviewing)}
            >
              <Eye className="mr-1 h-4 w-4" />
              {isPreviewing ? "Soạn thảo" : "Xem trước"}
            </Button>
            <Button size="sm" onClick={handleSaveHandbook} disabled={isSaving}>
              {isSaving ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-1 h-4 w-4" />
              )}
              Lưu
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          <div className="mx-auto max-w-4xl p-6">
            {isPreviewing ? (
              <article className="prose prose-lg max-w-none dark:prose-invert">
                <div className="mb-6">
                  <Badge variant="outline" className="mb-3">
                    {categories.find((c) => c.id.toString() === formData.categoryId)?.name || "Chưa chọn danh mục"}
                  </Badge>
                  <h1 className="mb-2 text-3xl font-bold text-foreground">
                    {formData.title || "Chưa có tiêu đề"}
                  </h1>
                  {formData.excerpt && (
                    <p className="text-lg text-muted-foreground">{formData.excerpt}</p>
                  )}
                  <Separator className="my-4" />
                </div>
                <div
                  className="whitespace-pre-wrap leading-relaxed text-foreground"
                  dangerouslySetInnerHTML={{ __html: formData.content || "Chưa có nội dung..." }}
                />
              </article>
            ) : (
              <div className="space-y-6">
                <Input
                  placeholder="Tiêu đề bài viết..."
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="h-auto border-none px-0 py-2 text-2xl font-bold shadow-none focus-visible:ring-0"
                />

                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Ảnh bìa (Thumbnail)</Label>
                  <Input type="file" accept="image/*" onChange={(e) => setFormFile(e.target.files?.[0] || null)} className="h-9 w-1/3" />
                </div>
                <Input
                  placeholder="Mô tả ngắn (hiển thị trong danh sách)..."
                  value={formData.excerpt}
                  onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
                  className="border-none px-0 text-muted-foreground shadow-none focus-visible:ring-0"
                />

                <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                  <div>
                    <Label className="mb-1 block text-xs text-muted-foreground">Danh mục</Label>
                    <Select
                      value={formData.categoryId}
                      onValueChange={(v) => setFormData({ ...formData, categoryId: v })}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Chọn danh mục" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id.toString()}>
                            {cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="mb-1 block text-xs text-muted-foreground">Trạng thái</Label>
                    <Select
                      value={formData.status}
                      onValueChange={(v: "draft" | "published") =>
                        setFormData({ ...formData, status: v })
                      }
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">Bản nháp</SelectItem>
                        <SelectItem value="published">Xuất bản</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="mb-1 block text-xs text-muted-foreground">Tác giả</Label>
                    <Input
                      placeholder="Tên tác giả"
                      value={formData.authorName}
                      onChange={(e) => setFormData({ ...formData, authorName: e.target.value })}
                      className="h-9"
                    />
                  </div>
                  <div className="flex items-end gap-4">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={formData.isFeatured}
                        onCheckedChange={(v) => setFormData({ ...formData, isFeatured: v })}
                      />
                      <Label className="text-xs">Nổi bật</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={formData.isPinned}
                        onCheckedChange={(v) => setFormData({ ...formData, isPinned: v })}
                      />
                      <Label className="text-xs">Ghim</Label>
                    </div>
                  </div>
                </div>

                <HandbookRichEditor
                  key={editingHandbook ? String(editingHandbook.id) : `new-${newDraftKey}`}
                  value={formData.content}
                  onChange={(html) => setFormData((prev) => ({ ...prev, content: html }))}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Main list view

  const openCategoryDialog = (cat?: HandbookCategory) => {
    if (cat) {
      setEditingCategory(cat);
      setCatFormData({ name: cat.name });
    } else {
      setEditingCategory(null);
      setCatFormData({ name: "" });
    }
  };

  const handleSaveCategory = async () => {
    if (!catFormData.name) {
      toast({ title: "Lỗi", description: "Tên chuyên mục không được trống." });
      return;
    }
    setIsSavingCat(true);
    try {
      if (editingCategory) {
        await handbookService.updateHandbookCategory(editingCategory.id, catFormData);
        toast({ title: "Thành công", description: "Cập nhật chuyên mục thành công." });
      } else {
        await handbookService.createHandbookCategory(catFormData);
        toast({ title: "Thành công", description: "Tạo chuyên mục thành công." });
      }
      mutate("handbook-categories");
      openCategoryDialog(); // reset
    } catch {
      toast({ title: "Lỗi", description: "Lỗi khi lưu chuyên mục." });
    } finally {
      setIsSavingCat(false);
    }
  };

  const handleDeleteCategory = async (id: number) => {
    if (!confirm("Bạn có chắc muốn xóa chuyên mục này?")) return;
    try {
      await handbookService.deleteHandbookCategory(id);
      toast({ title: "Thành công", description: "Đã xóa chuyên mục." });
      mutate("handbook-categories");
    } catch {
      toast({ title: "Lỗi", description: "Lỗi khi xóa chuyên mục." });
    }
  };

  const CategoryManagementDialog = (
    <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Quản lý chuyên mục sổ tay</DialogTitle>
          <DialogDescription>
            Thêm, sửa, xóa các chuyên mục để cấu trúc lại nội dung Sổ tay.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-[1fr_300px] gap-6 mt-4">
          <div className="space-y-4 border-r pr-6 max-h-[400px] overflow-auto">
            <h4 className="text-sm font-semibold">Danh sách chuyên mục</h4>
            <div className="space-y-2">
              {categories.map(cat => (
                <div key={cat.id} className="flex flex-col gap-1 p-2 border rounded-md relative group hover:bg-muted/30">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm flex items-center gap-2">
                      {cat.name}
                    </span>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => openCategoryDialog(cat)}>
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => handleDeleteCategory(cat.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
              {categories.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-4">Chưa có chuyên mục nào</p>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="text-sm font-semibold">{editingCategory ? "Sửa chuyên mục" : "Thêm chuyên mục mới"}</h4>
            <div>
              <Label className="text-xs">Tên chuyên mục *</Label>
              <Input value={catFormData.name} onChange={(e) => setCatFormData(prev => ({ ...prev, name: e.target.value }))} placeholder="Ví dụ: Gương sáng đảng viên" className="mt-1" />
            </div>
            <div className="pt-2 flex gap-2">
              <Button size="sm" onClick={handleSaveCategory} disabled={isSavingCat} className="w-full">
                {isSavingCat && <Loader2 className="h-3 w-3 mr-2 animate-spin" />}
                {editingCategory ? "Cập nhật" : "Tạo mới"}
              </Button>
              {editingCategory && (
                <Button size="sm" variant="outline" onClick={() => openCategoryDialog()}>Hủy</Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground">
            <BookOpen className="h-6 w-6 text-primary" />
            Quản lý Sổ tay & Tài liệu
          </h1>
          <p className="text-muted-foreground">Tạo và quản lý nội dung cho Đảng viên</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "handbooks" | "documents")}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <TabsList>
            <TabsTrigger value="handbooks" className="gap-2">
              <BookOpen className="h-4 w-4" />
              Sổ tay ({handbooks.length})
            </TabsTrigger>
            <TabsTrigger value="documents" className="gap-2">
              <FolderOpen className="h-4 w-4" />
              Tài liệu ({documents.length})
            </TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-2">
            {activeTab === "handbooks" && (
              <Button variant="outline" onClick={() => setCategoryDialogOpen(true)} className="gap-2">
                <Settings className="h-4 w-4" />
                Quản lý Chuyên mục
              </Button>
            )}
            <Button
              onClick={() => activeTab === "handbooks" ? openEditor() : openDocumentDialog()}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              {activeTab === "handbooks" ? "Viết bài mới" : "Thêm tài liệu"}
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
          {activeTab === "handbooks" ? (
            <>
              <Card
                className="cursor-pointer transition-shadow hover:shadow-md"
                onClick={() => setFilterStatus("all")}
              >
                <CardContent className="flex items-center gap-4 p-4">
                  <div className="rounded-lg bg-primary/10 p-3">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{handbooks.length}</p>
                    <p className="text-sm text-muted-foreground">Tổng bài viết</p>
                  </div>
                </CardContent>
              </Card>
              <Card
                className="cursor-pointer transition-shadow hover:shadow-md"
                onClick={() => setFilterStatus("published")}
              >
                <CardContent className="flex items-center gap-4 p-4">
                  <div className="rounded-lg bg-green-100 p-3 dark:bg-green-900/30">
                    <Globe className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-green-600">
                      {handbooks.filter((h) => h.status.toLowerCase() === "published").length}
                    </p>
                    <p className="text-sm text-muted-foreground">Đã xuất bản</p>
                  </div>
                </CardContent>
              </Card>
              <Card
                className="cursor-pointer transition-shadow hover:shadow-md"
                onClick={() => setFilterStatus("draft")}
              >
                <CardContent className="flex items-center gap-4 p-4">
                  <div className="rounded-lg bg-yellow-100 p-3 dark:bg-yellow-900/30">
                    <Clock className="h-5 w-5 text-yellow-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-yellow-600">
                      {handbooks.filter((h) => h.status.toLowerCase() === "draft").length}
                    </p>
                    <p className="text-sm text-muted-foreground">Bản nháp</p>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <>
              <Card>
                <CardContent className="flex items-center gap-4 p-4">
                  <div className="rounded-lg bg-primary/10 p-3">
                    <FolderOpen className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{documents.length}</p>
                    <p className="text-sm text-muted-foreground">Tổng tài liệu</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="flex items-center gap-4 p-4">
                  <div className="rounded-lg bg-blue-100 p-3 dark:bg-blue-900/30">
                    <FileText className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-blue-600">
                      {documents.filter((d) => d.fileType === "pdf").length}
                    </p>
                    <p className="text-sm text-muted-foreground">File PDF</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="flex items-center gap-4 p-4">
                  <div className="rounded-lg bg-green-100 p-3 dark:bg-green-900/30">
                    <Download className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-green-600">
                      {documents.reduce((acc, d) => acc + d.downloadCount, 0)}
                    </p>
                    <p className="text-sm text-muted-foreground">Lượt tải</p>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {/* Search */}
        <div className="relative mt-6 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={activeTab === "handbooks" ? "Tìm kiếm bài viết..." : "Tìm kiếm tài liệu..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Handbooks Tab */}
        <TabsContent value="handbooks" className="mt-6">
          {handbooksLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredHandbooks.map((handbook) => (
                <Card
                  key={handbook.id}
                  className="group overflow-hidden transition-shadow hover:shadow-md"
                >
                  <div className="relative flex h-32 items-center justify-center bg-linear-to-br from-primary/10 to-primary/5 overflow-hidden">
                    {(handbook.thumbnailUrl || handbook.coverImage) ? (
                      <img src={getImageUrl(handbook.thumbnailUrl || handbook.coverImage)} alt={handbook.title} className="h-full w-full object-cover" />
                    ) : (
                      <BookOpen className="h-10 w-10 text-primary/30" />
                    )}
                    {handbook.isPinned && (
                      <div className="absolute left-2 top-2">
                        <Pin className="h-4 w-4 text-primary" />
                      </div>
                    )}
                    {handbook.isFeatured && (
                      <div className="absolute right-2 top-2">
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      </div>
                    )}
                  </div>
                  <CardContent className="space-y-3 p-4">
                    <div className="flex items-start justify-between">
                      <Badge
                        variant="outline"
                        className="text-xs"
                        style={{
                          borderColor: handbook.categoryColor || undefined,
                          color: handbook.categoryColor || undefined,
                        }}
                      >
                        {handbook.category?.name || handbook.categoryName || "Chưa phân loại"}
                      </Badge>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 opacity-0 transition-opacity group-hover:opacity-100"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEditor(handbook)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Chỉnh sửa
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => togglePublish(handbook.id, handbook.status)}>
                            <Globe className="mr-2 h-4 w-4" />
                            {handbook.status.toLowerCase() === "published" ? "Chuyển nháp" : "Xuất bản"}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => togglePinned(handbook.id, handbook.isPinned)}>
                            <Pin className="mr-2 h-4 w-4" />
                            {handbook.isPinned ? "Bỏ ghim" : "Ghim bài viết"}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => {
                              setItemToDelete({ type: "handbook", id: handbook.id });
                              setDeleteDialogOpen(true);
                            }}
                            className="text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Xóa
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <h3
                      className="line-clamp-2 cursor-pointer font-semibold transition-colors hover:text-primary"
                      onClick={() => openEditor(handbook)}
                    >
                      {handbook.title}
                    </h3>
                    <p className="line-clamp-2 text-sm text-muted-foreground">
                      {handbook.shortDescription || handbook.excerpt || "Chưa có mô tả"}
                    </p>
                    <div className="flex items-center justify-between pt-2">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Eye className="h-3 w-3" />
                        {handbook.viewCount}
                        <span className="mx-1">|</span>
                        {formatDate(handbook.updatedAt)}
                      </div>
                      <Badge
                        className={
                          handbook.status.toLowerCase() === "published"
                            ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100"
                            : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100"
                        }
                      >
                        {handbook.status.toLowerCase() === "published" ? "Xuất bản" : "Nháp"}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {filteredHandbooks.length === 0 && !handbooksLoading && (
                <div className="col-span-full py-12 text-center text-muted-foreground">
                  <BookOpen className="mx-auto mb-4 h-12 w-12 opacity-50" />
                  <p>Không tìm thấy bài viết nào</p>
                  <Button variant="outline" className="mt-4" onClick={() => openEditor()}>
                    <Plus className="mr-2 h-4 w-4" />
                    Tạo bài viết đầu tiên
                  </Button>
                </div>
              )}
            </div>
          )}
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="documents" className="mt-6">
          {documentsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-3">
              {filteredDocuments.map((doc) => (
                <Card key={doc.id} className="group transition-shadow hover:shadow-md">
                  <CardContent className="flex items-center gap-4 p-4">
                    {getFileTypeIcon(doc.fileType)}
                    <div className="min-w-0 flex-1">
                      <h3 className="mb-1 line-clamp-1 font-medium text-foreground">{doc.title}</h3>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                        <Badge variant="secondary">{doc.categoryName || "Chưa phân loại"}</Badge>
                        <span className="flex items-center gap-1">
                          <Download className="h-3 w-3" />
                          {doc.downloadCount} lượt tải
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDate(doc.createdAt)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button size="icon" variant="ghost" onClick={() => openDocumentDialog(doc)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => {
                          setItemToDelete({ type: "document", id: doc.id });
                          setDeleteDialogOpen(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {filteredDocuments.length === 0 && !documentsLoading && (
                <div className="py-12 text-center text-muted-foreground">
                  <FolderOpen className="mx-auto mb-4 h-12 w-12 opacity-50" />
                  <p>Không tìm thấy tài liệu nào</p>
                  <Button variant="outline" className="mt-4" onClick={() => openDocumentDialog()}>
                    <Plus className="mr-2 h-4 w-4" />
                    Thêm tài liệu đầu tiên
                  </Button>
                </div>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Document Dialog */}
      <Dialog open={documentDialogOpen} onOpenChange={setDocumentDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingDocument ? "Chỉnh sửa tài liệu" : "Thêm tài liệu mới"}</DialogTitle>
            <DialogDescription>Điền thông tin tài liệu bên dưới</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Tên tài liệu *</Label>
              <Input
                value={docFormData.title}
                onChange={(e) => setDocFormData({ ...docFormData, title: e.target.value })}
                placeholder="Điều lệ Đảng 2026"
              />
            </div>
            <div>
              <Label>Mô tả</Label>
              <Textarea
                value={docFormData.description}
                onChange={(e) => setDocFormData({ ...docFormData, description: e.target.value })}
                placeholder="Mô tả ngắn về tài liệu..."
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Danh mục</Label>
                <Select
                  value={docFormData.categoryId}
                  onValueChange={(v) => setDocFormData({ ...docFormData, categoryId: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn danh mục" />
                  </SelectTrigger>
                  <SelectContent>
                    {docCategories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id.toString()}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Người tải lên</Label>
                <Input
                  value={docFormData.uploadedBy}
                  onChange={(e) => setDocFormData({ ...docFormData, uploadedBy: e.target.value })}
                  placeholder="Chi ủy"
                />
              </div>
            </div>
            <div>
              <Label>URL File *</Label>
              <Input
                value={docFormData.fileUrl}
                onChange={(e) => setDocFormData({ ...docFormData, fileUrl: e.target.value })}
                placeholder="/documents/file.pdf"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Tên file *</Label>
                <Input
                  value={docFormData.fileName}
                  onChange={(e) => setDocFormData({ ...docFormData, fileName: e.target.value })}
                  placeholder="file.pdf"
                />
              </div>
              <div>
                <Label>Loại file</Label>
                <Select
                  value={docFormData.fileType}
                  onValueChange={(v) => setDocFormData({ ...docFormData, fileType: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn loại" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pdf">PDF</SelectItem>
                    <SelectItem value="docx">DOCX</SelectItem>
                    <SelectItem value="xlsx">XLSX</SelectItem>
                    <SelectItem value="pptx">PPTX</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={docFormData.isFeatured}
                onCheckedChange={(v) => setDocFormData({ ...docFormData, isFeatured: v })}
              />
              <Label>Đánh dấu nổi bật</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDocumentDialogOpen(false)}>
              Hủy
            </Button>
            <Button onClick={handleSaveDocument} disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingDocument ? "Cập nhật" : "Thêm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {CategoryManagementDialog}
      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận xóa</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc chắn muốn xóa {itemToDelete?.type === "handbook" ? "bài viết" : "tài liệu"} này?
              Hành động này không thể hoàn tác.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Xóa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default HandbookManagementPage;
