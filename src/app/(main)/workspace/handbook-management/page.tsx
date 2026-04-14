"use client";

import { useState } from "react";
import useSWR from "swr";
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
  ChevronLeft,
  ChevronRight,
  Settings,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
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
import { toast } from "sonner";
import { HandbookRichEditor } from "@/components/handbook/HandbookRichEditor";
import { handbookService } from "@/services/handbookService";
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

const getImageUrl = (url?: string | null) => {
  if (!url) return "";
  if (url.startsWith("http") || url.startsWith("data:")) return url;

  if (url.startsWith("/documents/view/") || url.startsWith("/file/view")) {
    return `${getDeployAPI()}${url}`;
  }

  const cleanUrl = url.startsWith("/") ? url.substring(1) : url;
  return `${getDeployAPI()}/documents/view/${cleanUrl}`;
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const ITEMS_PER_PAGE = 6; // Đặt số lượng bài viết mỗi trang là 6

const HandbookManagementPage = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "draft" | "published">("all");
  const [currentPage, setCurrentPage] = useState(1); // State quản lý trang hiện tại

  const [isEditing, setIsEditing] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [editingHandbook, setEditingHandbook] = useState<Handbook | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [newDraftKey, setNewDraftKey] = useState(0);
  const [formFile, setFormFile] = useState<File | null>(null);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<HandbookCategory | null>(null);
  const [catFormData, setCatFormData] = useState({ name: "" });
  const [isSavingCat, setIsSavingCat] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

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



  // Truyền params: page, limit và search vào API qua useSWR (dùng array key để SWR track dependency)
  const { data: handbooks = [], isLoading: handbooksLoading, mutate: mutateHandbooks } = useSWR<Handbook[]>(
    ["admin-handbooks", currentPage, searchQuery],
    () => handbookService.getAdminHandbooks({
      page: currentPage,
      limit: ITEMS_PER_PAGE,
      search: searchQuery || undefined
    }) as Promise<Handbook[]>
  );

  const { data: categories = [], mutate: mutateCategories } = useSWR<HandbookCategory[]>(
    "handbook-categories",
    () => handbookService.getHandbookCategories() as Promise<HandbookCategory[]>
  );

  // Lọc theo status trên client (do params API chưa có field status)
  const filteredHandbooks = handbooks.filter((h) => {
    const matchesStatus = filterStatus === "all" || h.status.toLowerCase() === filterStatus;
    return matchesStatus;
  });

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

  const handleSaveHandbook = async () => {
    // Xử lý khoảng trắng thừa ở tiêu đề
    const titleCheck = formData.title?.trim();

    // Xử lý loại bỏ các thẻ HTML rỗng (vd: <p><br></p>) để kiểm tra nội dung thực sự
    const contentCheck = formData.content?.replace(/<[^>]*>?/gm, '').trim();

    if (!titleCheck) {
      toast.error("Vui lòng nhập tiêu đề bài viết.");
      return;
    }

    if (!contentCheck) {
      toast.error("Vui lòng nhập nội dung bài viết.");
      return;
    }

    setIsSaving(true);
    try {
      // Chuẩn bị dữ liệu JSON để đảm bảo kiểu dữ liệu (boolean, number) được giữ nguyên
      const data: Record<string, any> = {
        title: titleCheck,
        content: formData.content,
        status: formData.status.toUpperCase(),
        isHighlighted: formData.isFeatured,
        isPinned: formData.isPinned,
      };

      if (formData.excerpt) data.shortDescription = formData.excerpt.trim();
      if (formData.categoryId) data.categoryId = formData.categoryId;
      if (formData.authorName) data.authorName = formData.authorName.trim();

      let payload: FormData | Record<string, any> = data;

      // Nếu có file ảnh mới, chuyển sang FormData
      if (formFile) {
        const formDataPayload = new FormData();
        Object.entries(data).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            formDataPayload.append(key, String(value));
          }
        });
        formDataPayload.append("file", formFile);
        payload = formDataPayload;
      }

      if (editingHandbook) {
        await handbookService.updateHandbook(editingHandbook.id, payload);
        toast.success("Đã cập nhật bài viết");
      } else {
        await handbookService.createHandbook(payload);
        toast.success("Đã tạo bài viết mới");
        setCurrentPage(1);
      }

      mutateHandbooks();
      setIsEditing(false);
      resetForm();
    } catch (error) {
      toast.error("Không thể lưu bài viết. Vui lòng thử lại.");
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (e?: React.MouseEvent<HTMLButtonElement>) => {
    if (e) e.preventDefault();
    if (!itemToDelete) return;

    setIsDeleting(true);
    try {
      await handbookService.deleteHandbook(itemToDelete);
      mutateHandbooks();
      toast.success("Đã xóa bài viết thành công");
      setIsEditing(false);
      resetForm();
      setDeleteDialogOpen(false);
    } catch {
      toast.error("Không thể xóa bài viết");
    } finally {
      setIsDeleting(false);
      setItemToDelete(null);
    }
  };

  const togglePublish = async (id: number, currentStatus: string) => {
    const newStatus = currentStatus.toLowerCase() === "published" ? "draft" : "published";
    try {
      await handbookService.updateHandbook(id, { status: newStatus.toUpperCase() });
      mutateHandbooks();
      toast.success(newStatus === "published" ? "Đã xuất bản" : "Đã chuyển về nháp");
    } catch {
      toast.error("Không thể cập nhật trạng thái");
    }
  };

  const togglePinned = async (id: number, currentPinned: boolean) => {
    try {
      await handbookService.updateHandbook(id, { isPinned: !currentPinned });
      mutateHandbooks();
      toast.success(currentPinned ? "Đã bỏ ghim" : "Đã ghim bài viết");
    } catch {
      toast.error("Không thể cập nhật");
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

            {editingHandbook && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => {
                  setItemToDelete(editingHandbook.id);
                  setDeleteDialogOpen(true);
                }}
              >
                <Trash2 className="mr-1 h-4 w-4" />
                Xóa
              </Button>
            )}

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

        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Xác nhận xóa</AlertDialogTitle>
              <AlertDialogDescription>
                Bạn có chắc chắn muốn xóa bài viết này? Hành động này không thể hoàn tác.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>Hủy</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                disabled={isDeleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isDeleting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Xóa
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  // Category management dialog
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
      toast.error("Tên chuyên mục không được trống.");
      return;
    }
    setIsSavingCat(true);
    try {
      if (editingCategory) {
        await handbookService.updateHandbookCategory(editingCategory.id, catFormData);
        toast.success("Cập nhật chuyên mục thành công.");
      } else {
        await handbookService.createHandbookCategory(catFormData);
        toast.success("Tạo chuyên mục thành công.");
      }
      mutateCategories();
      openCategoryDialog();
    } catch {
      toast.error("Lỗi khi lưu chuyên mục.");
    } finally {
      setIsSavingCat(false);
    }
  };

  const handleDeleteCategory = async (id: number) => {
    if (!confirm("Bạn có chắc muốn xóa chuyên mục này?")) return;
    try {
      await handbookService.deleteHandbookCategory(id);
      toast.success("Đã xóa chuyên mục.");
      mutateCategories();
    } catch {
      toast.error("Lỗi khi xóa chuyên mục.");
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground">
            <BookOpen className="h-6 w-6 text-primary" />
            Quản lý Sổ tay
          </h1>
          <p className="text-muted-foreground">Tạo và quản lý nội dung cho Đảng viên</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Tìm kiếm bài viết..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1); // Reset page khi tìm kiếm
            }}
            className="pl-10"
          />
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setCategoryDialogOpen(true)} className="gap-2">
            <Settings className="h-4 w-4" />
            Quản lý Chuyên mục
          </Button>
          <Button onClick={() => openEditor()} className="gap-2">
            <Plus className="h-4 w-4" />
            Viết bài mới
          </Button>
        </div>
      </div>

      {/* Stats Cards (Số liệu hiển thị theo trang hiện tại) */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card
          className={`cursor-pointer transition-shadow hover:shadow-md ${filterStatus === 'all' ? 'ring-2 ring-primary' : ''}`}
          onClick={() => { setFilterStatus("all"); setCurrentPage(1); }}
        >
          <CardContent className="flex items-center gap-4 p-4">
            <div className="rounded-lg bg-primary/10 p-3">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{handbooks.length}</p>
              <p className="text-sm text-muted-foreground">Số bài (trang này)</p>
            </div>
          </CardContent>
        </Card>
        <Card
          className={`cursor-pointer transition-shadow hover:shadow-md ${filterStatus === 'published' ? 'ring-2 ring-green-500' : ''}`}
          onClick={() => { setFilterStatus("published"); setCurrentPage(1); }}
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
          className={`cursor-pointer transition-shadow hover:shadow-md ${filterStatus === 'draft' ? 'ring-2 ring-yellow-500' : ''}`}
          onClick={() => { setFilterStatus("draft"); setCurrentPage(1); }}
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
      </div>

      {/* Handbook Grid */}
      {handbooksLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="flex flex-col gap-6">
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
                            setItemToDelete(handbook.id);
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

          {/* Pagination UI */}
          {(handbooks.length > 0 || currentPage > 1) && (
            <div className="flex items-center justify-between border-t pt-4">
              <p className="text-sm text-muted-foreground">
                Trang {currentPage}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Trước
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => p + 1)}
                  disabled={handbooks.length < ITEMS_PER_PAGE} // Vô hiệu hóa nút "Sau" nếu số lượng bài < limit
                >
                  Sau
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Category Management Dialog */}
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
                {categories.map((cat) => (
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
                <Input value={catFormData.name} onChange={(e) => setCatFormData((prev) => ({ ...prev, name: e.target.value }))} placeholder="Ví dụ: Gương sáng đảng viên" className="mt-1" />
              </div>
              <div className="pt-2 flex gap-2">
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

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận xóa</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc chắn muốn xóa bài viết này? Hành động này không thể hoàn tác.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Xóa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default HandbookManagementPage;