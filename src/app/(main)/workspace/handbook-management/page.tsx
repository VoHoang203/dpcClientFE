"use client";

import { useState } from "react";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Eye,
  BookOpen,
  Save,
  Image as ImageIcon,
  Bold,
  Italic,
  List,
  Heading,
  Link2,
  MoreVertical,
  ArrowLeft,
  Globe,
  FileText,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
 
import { useToast } from "@/hooks/use-toast";

interface HandbookEntry {
  id: string;
  title: string;
  category: string;
  content: string;
  excerpt: string;
  status: "draft" | "published";
  coverImage?: string;
  createdAt: string;
  updatedAt: string;
}

const categories = [
  "Điều lệ Đảng",
  "Quy trình",
  "Hướng dẫn",
  "Nghị quyết",
  "Thông báo",
];

const mockHandbooks: HandbookEntry[] = [
  {
    id: "1",
    title: "Quy trình kết nạp Đảng viên mới",
    category: "Quy trình",
    content:
      "# Quy trình kết nạp Đảng viên mới\n\n## Bước 1: Chuẩn bị hồ sơ\nQuần chúng ưu tú cần chuẩn bị đầy đủ các giấy tờ sau:\n- Đơn xin vào Đảng (viết tay)\n- Lý lịch Đảng viên (theo mẫu)\n- Giấy giới thiệu của 2 Đảng viên chính thức\n\n## Bước 2: Chi bộ xem xét\nChi bộ tổ chức họp để xem xét, thảo luận và biểu quyết...\n\n## Bước 3: Đảng ủy cấp trên phê duyệt\nHồ sơ được gửi lên Đảng ủy cấp trên để xét duyệt chính thức.",
    excerpt:
      "Hướng dẫn chi tiết quy trình kết nạp Đảng viên mới từ chuẩn bị hồ sơ đến phê duyệt.",
    status: "published",
    createdAt: "2025-01-10",
    updatedAt: "2025-01-15",
  },
  {
    id: "2",
    title: "Hướng dẫn đóng đảng phí hàng tháng",
    category: "Hướng dẫn",
    content:
      "# Hướng dẫn đóng đảng phí\n\nMức đảng phí được tính bằng 1% thu nhập hàng tháng...",
    excerpt: "Hướng dẫn chi tiết về mức đóng và cách thức đóng đảng phí.",
    status: "published",
    createdAt: "2025-01-12",
    updatedAt: "2025-01-12",
  },
  {
    id: "3",
    title: "Quy trình Lễ Công nhận Đảng viên chính thức",
    category: "Quy trình",
    content:
      "# Quy trình Lễ Công nhận ĐV chính thức\n\nSau 12 tháng dự bị, Đảng viên dự bị cần...",
    excerpt: "Các bước và thủ tục cho lễ công nhận Đảng viên chính thức.",
    status: "draft",
    createdAt: "2025-01-20",
    updatedAt: "2025-01-20",
  },
];

const HandbookManagementPage = () => {
  const [handbooks, setHandbooks] = useState<HandbookEntry[]>(mockHandbooks);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<
    "all" | "draft" | "published"
  >("all");
  const [isEditing, setIsEditing] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [editingHandbook, setEditingHandbook] =
    useState<HandbookEntry | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    category: "",
    content: "",
    excerpt: "",
    status: "draft" as "draft" | "published",
  });
  const { toast } = useToast();

  const filteredHandbooks = handbooks.filter((h) => {
    const matchesSearch =
      h.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      h.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === "all" || h.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const resetForm = () => {
    setFormData({
      title: "",
      category: "",
      content: "",
      excerpt: "",
      status: "draft",
    });
    setEditingHandbook(null);
  };

  const openEditor = (handbook?: HandbookEntry) => {
    if (handbook) {
      setEditingHandbook(handbook);
      setFormData({
        title: handbook.title,
        category: handbook.category,
        content: handbook.content,
        excerpt: handbook.excerpt,
        status: handbook.status,
      });
    } else {
      resetForm();
    }
    setIsEditing(true);
    setIsPreviewing(false);
  };

  const handleSave = () => {
    if (!formData.title || !formData.category || !formData.content) {
      toast({ title: "Lỗi", description: "Vui lòng điền đầy đủ thông tin" });
      return;
    }
    const now = new Date().toISOString().split("T")[0];
    if (editingHandbook) {
      setHandbooks(
        handbooks.map((h) =>
          h.id === editingHandbook.id
            ? { ...h, ...formData, updatedAt: now }
            : h
        )
      );
      toast({ title: "Đã cập nhật", description: "Bài viết đã được lưu" });
    } else {
      setHandbooks([
        {
          id: Date.now().toString(),
          ...formData,
          coverImage: undefined,
          createdAt: now,
          updatedAt: now,
        },
        ...handbooks,
      ]);
      toast({ title: "Đã tạo", description: "Bài viết mới đã được tạo" });
    }
    setIsEditing(false);
    resetForm();
  };

  const handleDelete = (id: string) => {
    setHandbooks(handbooks.filter((h) => h.id !== id));
    toast({ title: "Đã xóa", description: "Bài viết đã được xóa" });
  };

  const togglePublish = (id: string) => {
    setHandbooks(
      handbooks.map((h) =>
        h.id === id
          ? {
              ...h,
              status: h.status === "draft" ? "published" : "draft",
              updatedAt: new Date().toISOString().split("T")[0],
            }
          : h
      )
    );
  };

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
              {editingHandbook ? "Chỉnh sửa" : "Bài viết mới"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Badge
              variant={formData.status === "published" ? "default" : "secondary"}
            >
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
            <Button size="sm" onClick={handleSave}>
              <Save className="mr-1 h-4 w-4" />
              Lưu
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          <div className="mx-auto max-w-4xl p-6">
            {isPreviewing ? (
              <article className="prose prose-lg max-w-none">
                <div className="mb-6">
                  <Badge variant="outline" className="mb-3">
                    {formData.category || "Chưa chọn"}
                  </Badge>
                  <h1 className="mb-2 text-3xl font-bold">
                    {formData.title || "Chưa có tiêu đề"}
                  </h1>
                  {formData.excerpt && (
                    <p className="text-lg text-muted-foreground">
                      {formData.excerpt}
                    </p>
                  )}
                  <Separator className="my-4" />
                </div>
                <div className="whitespace-pre-wrap text-foreground leading-relaxed">
                  {formData.content || "Chưa có nội dung..."}
                </div>
              </article>
            ) : (
              <div className="space-y-6">
                <Input
                  placeholder="Tiêu đề bài viết..."
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  className="h-auto border-none px-0 py-2 text-2xl font-bold shadow-none focus-visible:ring-0"
                />

                <Input
                  placeholder="Mô tả ngắn (hiển thị trong danh sách)..."
                  value={formData.excerpt}
                  onChange={(e) =>
                    setFormData({ ...formData, excerpt: e.target.value })
                  }
                  className="border-none px-0 text-muted-foreground shadow-none focus-visible:ring-0"
                />

                <div className="flex gap-4">
                  <div className="flex-1">
                    <Label className="mb-1 block text-xs text-muted-foreground">
                      Danh mục
                    </Label>
                    <Select
                      value={formData.category}
                      onValueChange={(v) =>
                        setFormData({ ...formData, category: v })
                      }
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Chọn danh mục" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((cat) => (
                          <SelectItem key={cat} value={cat}>
                            {cat}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex-1">
                    <Label className="mb-1 block text-xs text-muted-foreground">
                      Trạng thái
                    </Label>
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
                </div>

                <Separator />

                <div className="flex items-center gap-1 rounded-lg border bg-muted/30 p-2">
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Heading className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Bold className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Italic className="h-4 w-4" />
                  </Button>
                  <Separator orientation="vertical" className="mx-1 h-6" />
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <List className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Link2 className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <ImageIcon className="h-4 w-4" />
                  </Button>
                </div>

                <Textarea
                  placeholder="Bắt đầu viết nội dung bài viết...\n\nSử dụng Markdown để định dạng:\n# Tiêu đề\n## Tiêu đề phụ\n- Danh sách\n**In đậm** *In nghiêng*"
                  value={formData.content}
                  onChange={(e) =>
                    setFormData({ ...formData, content: e.target.value })
                  }
                  className="min-h-[400px] resize-none border-none px-0 text-base leading-relaxed shadow-none focus-visible:ring-0"
                />
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground">
            <BookOpen className="h-6 w-6 text-primary" />
            Quản lý Sổ tay
          </h1>
          <p className="text-muted-foreground">
            Tạo và quản lý nội dung sổ tay Đảng viên
          </p>
        </div>
        <Button onClick={() => openEditor()} className="gap-2">
          <Plus className="h-4 w-4" />
          Viết bài mới
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
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
                {handbooks.filter((h) => h.status === "published").length}
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
                {handbooks.filter((h) => h.status === "draft").length}
              </p>
              <p className="text-sm text-muted-foreground">Bản nháp</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Tìm kiếm bài viết..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredHandbooks.map((handbook) => (
          <Card
            key={handbook.id}
            className="group overflow-hidden transition-shadow hover:shadow-md"
          >
            <div className="flex h-32 items-center justify-center bg-linear-to-br from-primary/10 to-primary/5">
              <BookOpen className="h-10 w-10 text-primary/30" />
            </div>
            <CardContent className="space-y-3 p-4">
              <div className="flex items-start justify-between">
                <Badge variant="outline" className="text-xs">
                  {handbook.category}
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
                    <DropdownMenuItem onClick={() => togglePublish(handbook.id)}>
                      <Globe className="mr-2 h-4 w-4" />
                      {handbook.status === "published"
                        ? "Chuyển nháp"
                        : "Xuất bản"}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleDelete(handbook.id)}
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
                {handbook.excerpt}
              </p>
              <div className="flex items-center justify-between pt-2">
                <span className="text-xs text-muted-foreground">
                  {handbook.updatedAt}
                </span>
                <Badge
                  className={
                    handbook.status === "published"
                      ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100"
                      : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100"
                  }
                >
                  {handbook.status === "published" ? "Xuất bản" : "Nháp"}
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}

        {filteredHandbooks.length === 0 && (
          <div className="col-span-full py-12 text-center text-muted-foreground">
            Không tìm thấy bài viết nào
          </div>
        )}
      </div>
    </div>
  );
};

export default HandbookManagementPage;
