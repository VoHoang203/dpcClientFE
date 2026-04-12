"use client";

import { useState, useEffect } from "react";
import useSWR, { mutate } from "swr";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  FileText,
  Clock,
  Loader2,
  FolderOpen,
  File,
  Download,
  UploadCloud,
  Settings,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { authService } from "@/services/authService";
import { formatRoleOrPositionLabel, UserRole } from "@/types/roles";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { useToast } from "@/hooks/use-toast";
import { documentService } from "@/services/documentService";
import { documentCategoryService } from "@/services/documentCategoryService";

// API upload qua backend thay vì S3 Client trực tiếp gởi R2

interface DocumentCategory {
  id: string | number;
  name: string;
  slug: string;
  description: string;
  color: string;
  icon: string;
  documentCount: string | number;
}

interface Document {
  id: string | number;
  title: string;
  slug: string;
  description: string;
  fileUrl: string;
  fileName: string;
  fileType: string;
  categoryId: string | number | null;
  uploadedBy: string | null;
  status: string;
  isFeatured: boolean;
  downloadCount: number;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  categoryName?: string;
  categoryColor?: string;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

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

const DocumentManagementPage = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | number | null>(null);
  const [documentDialogOpen, setDocumentDialogOpen] = useState(false);
  const [editingDocument, setEditingDocument] = useState<Document | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  const [currentUserRole, setCurrentUserRole] = useState("Chi ủy");

  // Trạng thái lưu form và trạng thái upload file lên R2
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Quản lý chuyên mục
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<DocumentCategory | null>(null);
  const [catFormData, setCatFormData] = useState({ name: "" });
  const [isSavingCat, setIsSavingCat] = useState(false);

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
    fileObj: null as File | null,
  });

  useEffect(() => {
    const snap = authService.getCurrentUserSnapshot();
    let roleToUse: UserRole | "Chi ủy" = "Chi ủy";
    if (snap?.role) {
      roleToUse = snap.role as UserRole;
    } else {
      const storedUser = localStorage.getItem("currentUser");
      if (storedUser) {
        try {
          const parsed = JSON.parse(storedUser);
          if (parsed.role) roleToUse = parsed.role as UserRole;
        } catch { }
      }
    }

    const roleDisplayName = roleToUse !== "Chi ủy" ? formatRoleOrPositionLabel(roleToUse as string) : "Chi ủy";
    setCurrentUserRole(roleDisplayName);
    setDocFormData(prev => ({ ...prev, uploadedBy: roleDisplayName }));
  }, []);

  const { toast } = useToast();

  const { data: documents = [], isLoading: documentsLoading } = useSWR<Document[]>(
    "documents",
    () => documentService.getDocuments() as Promise<Document[]>
  );
  const { data: docCategories = [] } = useSWR<DocumentCategory[]>(
    "document-categories",
    () => documentCategoryService.getCategories() as Promise<DocumentCategory[]>
  );

  const enrichedDocuments = documents.map((doc) => {
    if (doc.categoryName) return doc;
    const cat = docCategories.find((c) => String(c.id) === String(doc.categoryId));
    return { ...doc, categoryName: cat?.name };
  });

  const filteredDocuments = enrichedDocuments.filter((d) =>
    d.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (d.categoryName?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false)
  );

  // When search changes, reset to page 1
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const totalPages = Math.ceil(filteredDocuments.length / itemsPerPage) || 1;
  const paginatedDocuments = filteredDocuments.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const resetDocForm = () => {
    setDocFormData({
      title: "",
      description: "",
      fileUrl: "",
      fileName: "",
      fileType: "",
      categoryId: "",
      uploadedBy: currentUserRole,
      isFeatured: false,
      tags: [],
      fileObj: null,
    });
    setEditingDocument(null);
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
        uploadedBy: currentUserRole,
        isFeatured: document.isFeatured,
        tags: document.tags || [],
        fileObj: null,
      });
    } else {
      resetDocForm();
    }
    setDocumentDialogOpen(true);
  };

  // Hàm xử lý chọn file
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setDocFormData((prev) => ({
      ...prev,
      fileObj: file,
      fileName: file.name,
      fileType: file.name.split(".").pop()?.toLowerCase() || "file",
      title: prev.title === "" ? file.name.replace(/\.[^/.]+$/, "") : prev.title,
    }));
  };

  const handleSaveDocument = async () => {
    if (!docFormData.title || (!docFormData.fileUrl && !docFormData.fileObj)) {
      toast({ title: "Lỗi", description: "Vui lòng đính kèm file và nhập tiêu đề", variant: "destructive" });
      return;
    }

    setIsSaving(true);
    try {
      if (editingDocument) {
        // Upload update
        if (docFormData.fileObj) {
          const formData = new FormData();
          formData.append("title", docFormData.title);
          if (docFormData.description) formData.append("description", docFormData.description);
          if (docFormData.categoryId) formData.append("categoryId", String(docFormData.categoryId));
          // Use 'false' string or empty string; but JSON fallback usually prevents this issue for standard updates
          formData.append("isFeatured", String(docFormData.isFeatured));
          if (docFormData.uploadedBy) formData.append("uploadedBy", docFormData.uploadedBy);
          formData.append("file", docFormData.fileObj);

          await documentService.updateDocument(editingDocument.id, formData);
        } else {
          // Send JSON if no file is uploaded to guarantee correct boolean parsing for isFeatured
          const payload = {
            title: docFormData.title,
            description: docFormData.description || undefined,
            categoryId: docFormData.categoryId || undefined,
            isFeatured: docFormData.isFeatured,
            uploadedBy: docFormData.uploadedBy || undefined,
          };

          await documentService.updateDocument(editingDocument.id, payload);
        }
        toast({ title: "Thành công", description: "Đã cập nhật tài liệu" });
      } else {
        const formData = new FormData();
        formData.append("title", docFormData.title);
        if (docFormData.description) formData.append("description", docFormData.description);
        if (docFormData.categoryId) formData.append("categoryId", docFormData.categoryId);
        formData.append("isFeatured", String(docFormData.isFeatured));
        if (docFormData.uploadedBy) formData.append("uploadedBy", docFormData.uploadedBy);
        if (docFormData.fileObj) formData.append("file", docFormData.fileObj);

        await documentService.createDocument(formData);
        toast({ title: "Thành công", description: "Đã thêm tài liệu mới" });
      }

      mutate("documents");
      setDocumentDialogOpen(false);
      resetDocForm();
    } catch {
      toast({ title: "Lỗi", description: "Không thể lưu dữ liệu", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;
    try {
      await documentService.deleteDocument(itemToDelete);
      mutate("documents");
      toast({ title: "Đã xóa", description: "Đã xóa tài liệu" });
    } catch {
      toast({ title: "Lỗi", description: "Không thể xóa", variant: "destructive" });
    } finally {
      setDeleteDialogOpen(false);
      setItemToDelete(null);
    }
  };

  const openCategoryDialog = (cat?: DocumentCategory) => {
    if (cat) {
      setEditingCategory(cat);
      setCatFormData({ name: cat.name });
    } else {
      setEditingCategory(null);
      setCatFormData({ name: "" });
    }
  };

  const handleSaveCategory = async () => {
    if (!catFormData.name.trim()) {
      toast({ title: "Lỗi", description: "Tên chuyên mục không được trống." });
      return;
    }
    setIsSavingCat(true);
    try {
      if (editingCategory) {
        await documentCategoryService.updateCategory(editingCategory.id, { name: catFormData.name });
        toast({ title: "Thành công", description: "Cập nhật chuyên mục thành công." });
      } else {
        await documentCategoryService.createCategory({ name: catFormData.name });
        toast({ title: "Thành công", description: "Tạo chuyên mục thành công." });
      }
      mutate("document-categories");
      openCategoryDialog();
    } catch {
      toast({ title: "Lỗi", description: "Lỗi khi lưu chuyên mục." });
    } finally {
      setIsSavingCat(false);
    }
  };

  const handleDeleteCategory = async (id: string | number) => {
    if (!confirm("Bạn có chắc muốn xóa chuyên mục này?")) return;
    try {
      await documentCategoryService.deleteCategory(id);
      toast({ title: "Thành công", description: "Đã xóa chuyên mục." });
      mutate("document-categories");
    } catch {
      toast({ title: "Lỗi", description: "Lỗi khi xóa chuyên mục." });
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* ... Phần Header và Card thống kê giữ nguyên ... */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground">
            <FolderOpen className="h-6 w-6 text-primary" />
            Quản lý Tài liệu
          </h1>
          <p className="text-muted-foreground">Thêm mới và quản lý tài liệu hệ thống</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Tìm kiếm tài liệu..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button variant="outline" onClick={() => setCategoryDialogOpen(true)} className="gap-2 shrink-0">
          <Settings className="h-4 w-4" />
          Quản lý Chuyên mục
        </Button>
        <Button onClick={() => openDocumentDialog()} className="gap-2 shrink-0">
          <Plus className="h-4 w-4" />
          Thêm tài liệu
        </Button>
      </div>

      <div className="mt-6">
        {documentsLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div>
            <div className="space-y-3">
              {paginatedDocuments.map((doc) => (
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
                      <Button size="icon" variant="ghost" onClick={() => { setItemToDelete(doc.id); setDeleteDialogOpen(true); }}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Pagination */}
            <div className="mt-6 flex flex-col items-center gap-3 border-t border-border pt-5">
              <div className="flex items-center gap-1">
                {/* Nút Trước */}
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className={`flex h-9 items-center gap-1 rounded-md border px-3 text-sm font-medium transition-colors
                    ${currentPage === 1
                      ? "cursor-not-allowed border-border bg-muted text-muted-foreground opacity-50"
                      : "border-red-200 bg-white text-red-600 hover:bg-red-50 hover:border-red-400"
                    }`}
                >
                  ‹ Trước
                </button>

                {/* Các nút số trang */}
                {(() => {
                  const pages: (number | "...")[] = [];
                  if (totalPages <= 7) {
                    for (let i = 1; i <= totalPages; i++) pages.push(i);
                  } else {
                    pages.push(1);
                    if (currentPage > 3) pages.push("...");
                    const start = Math.max(2, currentPage - 1);
                    const end = Math.min(totalPages - 1, currentPage + 1);
                    for (let i = start; i <= end; i++) pages.push(i);
                    if (currentPage < totalPages - 2) pages.push("...");
                    pages.push(totalPages);
                  }
                  return pages.map((p, idx) =>
                    p === "..." ? (
                      <span key={`ellipsis-${idx}`} className="flex h-9 w-9 items-center justify-center text-sm text-muted-foreground">
                        …
                      </span>
                    ) : (
                      <button
                        key={p}
                        onClick={() => setCurrentPage(p as number)}
                        className={`flex h-9 w-9 items-center justify-center rounded-md border text-sm font-semibold transition-all
                          ${currentPage === p
                            ? "border-red-600 bg-red-600 text-white shadow-sm shadow-red-200"
                            : "border-border bg-white text-foreground hover:border-red-400 hover:bg-red-50 hover:text-red-600"
                          }`}
                      >
                        {p}
                      </button>
                    )
                  );
                })()}

                {/* Nút Sau */}
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className={`flex h-9 items-center gap-1 rounded-md border px-3 text-sm font-medium transition-colors
                    ${currentPage === totalPages
                      ? "cursor-not-allowed border-border bg-muted text-muted-foreground opacity-50"
                      : "border-red-200 bg-white text-red-600 hover:bg-red-50 hover:border-red-400"
                    }`}
                >
                  Sau ›
                </button>
              </div>

              {/* Tổng số trang */}
              <p className="text-xs text-muted-foreground">
                Trang <span className="font-semibold text-red-600">{currentPage}</span> / {totalPages}
                &nbsp;·&nbsp; {filteredDocuments.length} tài liệu
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Cập nhật Dialog Thêm/Sửa */}
      <Dialog open={documentDialogOpen} onOpenChange={setDocumentDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingDocument ? "Chỉnh sửa tài liệu" : "Thêm tài liệu mới"}</DialogTitle>
            <DialogDescription>Tải file lên và điền thông tin bên dưới</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">

            {/* Khu vực Upload File */}
            <div className="flex flex-col gap-3 rounded-lg border border-dashed p-6 text-center">
              {isUploading ? (
                <div className="flex flex-col items-center justify-center space-y-2 text-muted-foreground">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-sm">Đang tải file...</p>
                </div>
              ) : (docFormData.fileUrl || docFormData.fileObj) ? (
                <div className="flex flex-col items-center justify-center space-y-2">
                  <FileText className="h-8 w-8 text-primary" />
                  <p className="text-sm font-medium text-foreground">{docFormData.fileName}</p>
                  <Button variant="outline" size="sm" className="mt-2" asChild>
                    <Label className="cursor-pointer">
                      Chọn file khác
                      <Input type="file" className="hidden" onChange={handleFileUpload} />
                    </Label>
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center space-y-2">
                  <UploadCloud className="h-8 w-8 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Click để chọn file từ máy tính</p>
                  <Button variant="secondary" size="sm" className="mt-2" asChild>
                    <Label className="cursor-pointer">
                      Chọn File
                      <Input type="file" className="hidden" onChange={handleFileUpload} />
                    </Label>
                  </Button>
                </div>
              )}
            </div>

            <div>
              <Label>Tên tài liệu hiển thị *</Label>
              <Input
                value={docFormData.title}
                onChange={(e) => setDocFormData({ ...docFormData, title: e.target.value })}
                placeholder="Ví dụ: Điều lệ Đảng 2024"
              />
            </div>
            <div>
              <Label>Mô tả ngắn</Label>
              <Textarea
                value={docFormData.description}
                onChange={(e) => setDocFormData({ ...docFormData, description: e.target.value })}
                placeholder="Nhập mô tả..."
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
                  disabled
                  className="bg-muted text-muted-foreground"
                />
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
            {/* Chỉ cho phép lưu khi không đang upload và đã có file */}
            <Button onClick={handleSaveDocument} disabled={isSaving || (!docFormData.fileUrl && !docFormData.fileObj)}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingDocument ? "Cập nhật" : "Lưu vào hệ thống"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Category Management Dialog */}
      <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Quản lý chuyên mục tài liệu</DialogTitle>
            <DialogDescription>
              Thêm, sửa, xóa các chuyên mục để phân loại tài liệu.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-[1fr_300px] gap-6 mt-4">
            {/* Danh sách */}
            <div className="space-y-4 border-r pr-6 max-h-[400px] overflow-auto">
              <h4 className="text-sm font-semibold">Danh sách chuyên mục</h4>
              <div className="space-y-2">
                {docCategories.map((cat) => (
                  <div key={cat.id} className="flex items-center justify-between p-2 border rounded-md group hover:bg-muted/30">
                    <span className="text-sm font-medium">{cat.name}</span>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => openCategoryDialog(cat)}>
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => handleDeleteCategory(cat.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
                {docCategories.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-4">Chưa có chuyên mục nào</p>
                )}
              </div>
            </div>

            {/* Form thêm/sửa */}
            <div className="space-y-4">
              <h4 className="text-sm font-semibold">{editingCategory ? "Sửa chuyên mục" : "Thêm chuyên mục mới"}</h4>
              <div>
                <Label className="text-xs">Tên chuyên mục *</Label>
                <Input
                  value={catFormData.name}
                  onChange={(e) => setCatFormData({ name: e.target.value })}
                  placeholder="Ví dụ: Tài liệu đại hội"
                  className="mt-1"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <Button size="sm" onClick={handleSaveCategory} disabled={isSavingCat} className="w-50">
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

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        {/* ... Dialog Xóa giữ nguyên ... */}
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận xóa</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc chắn muốn xóa tài liệu này? Hành động này không thể hoàn tác.
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

export default DocumentManagementPage;