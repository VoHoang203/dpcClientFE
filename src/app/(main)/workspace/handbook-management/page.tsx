"use client";

import { useState } from "react";
import { Plus, Search, Edit, Trash2, BookOpen, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

interface HandbookEntry {
  id: string;
  title: string;
  category: string;
  content: string;
  status: "draft" | "published";
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
    content: "Nội dung chi tiết về quy trình kết nạp...",
    status: "published",
    createdAt: "2025-01-10",
    updatedAt: "2025-01-15",
  },
  {
    id: "2",
    title: "Hướng dẫn đóng đảng phí",
    category: "Hướng dẫn",
    content: "Hướng dẫn chi tiết về việc đóng đảng phí...",
    status: "published",
    createdAt: "2025-01-12",
    updatedAt: "2025-01-12",
  },
  {
    id: "3",
    title: "Quy trình Lễ Công nhận ĐV chính thức",
    category: "Quy trình",
    content: "Nội dung về lễ công nhận...",
    status: "draft",
    createdAt: "2025-01-20",
    updatedAt: "2025-01-20",
  },
];

export default function HandbookManagementPage() {
  const [handbooks, setHandbooks] = useState<HandbookEntry[]>(mockHandbooks);
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingHandbook, setEditingHandbook] =
    useState<HandbookEntry | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    category: "",
    content: "",
    status: "draft" as "draft" | "published",
  });
  const { toast } = useToast();

  const filteredHandbooks = handbooks.filter(
    (h) =>
      h.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      h.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const resetForm = () => {
    setFormData({ title: "", category: "", content: "", status: "draft" });
    setEditingHandbook(null);
  };

  const openEditDialog = (handbook: HandbookEntry) => {
    setEditingHandbook(handbook);
    setFormData({
      title: handbook.title,
      category: handbook.category,
      content: handbook.content,
      status: handbook.status,
    });
    setIsDialogOpen(true);
  };

  const openCreateDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const handleSave = () => {
    if (!formData.title || !formData.category || !formData.content) {
      toast({
        title: "Lỗi",
        description: "Vui lòng điền đầy đủ thông tin",
        action: <Button variant="destructive">OK</Button>,
      });
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
      toast({
        title: "Đã cập nhật",
        description: "Bài viết đã được cập nhật thành công",
      });
    } else {
      const newHandbook: HandbookEntry = {
        id: Date.now().toString(),
        ...formData,
        createdAt: now,
        updatedAt: now,
      };
      setHandbooks([newHandbook, ...handbooks]);
      toast({
        title: "Đã tạo",
        description: "Bài viết mới đã được tạo thành công",
      });
    }

    setIsDialogOpen(false);
    resetForm();
  };

  const handleDelete = (id: string) => {
    setHandbooks(handbooks.filter((h) => h.id !== id));
    toast({
      title: "Đã xóa",
      description: "Bài viết đã được xóa",
    });
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

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Quản lý Sổ tay</h1>
        <p className="text-muted-foreground">
          Tạo và quản lý nội dung sổ tay Đảng viên
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Tổng bài viết
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{handbooks.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Đã xuất bản
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {handbooks.filter((h) => h.status === "published").length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Bản nháp
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {handbooks.filter((h) => h.status === "draft").length}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col justify-between gap-4 sm:flex-row">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Tìm kiếm bài viết..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreateDialog}>
              <Plus className="mr-2 h-4 w-4" />
              Tạo bài viết mới
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingHandbook ? "Chỉnh sửa bài viết" : "Tạo bài viết mới"}
              </DialogTitle>
              <DialogDescription>
                {editingHandbook
                  ? "Cập nhật nội dung bài viết trong sổ tay"
                  : "Thêm bài viết mới vào sổ tay Đảng viên"}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="title">Tiêu đề</Label>
                <Input
                  id="title"
                  placeholder="Nhập tiêu đề bài viết..."
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Danh mục</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) =>
                      setFormData({ ...formData, category: value })
                    }
                  >
                    <SelectTrigger>
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
                <div className="space-y-2">
                  <Label>Trạng thái</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value: "draft" | "published") =>
                      setFormData({ ...formData, status: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Bản nháp</SelectItem>
                      <SelectItem value="published">Xuất bản</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="content">Nội dung</Label>
                <Textarea
                  id="content"
                  placeholder="Nhập nội dung bài viết..."
                  value={formData.content}
                  onChange={(e) =>
                    setFormData({ ...formData, content: e.target.value })
                  }
                  className="min-h-[200px]"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Hủy
              </Button>
              <Button onClick={handleSave}>
                <Save className="mr-2 h-4 w-4" />
                {editingHandbook ? "Cập nhật" : "Tạo bài viết"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tiêu đề</TableHead>
                <TableHead className="hidden sm:table-cell">Danh mục</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead className="hidden md:table-cell">Cập nhật</TableHead>
                <TableHead className="w-[120px]">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredHandbooks.map((handbook) => (
                <TableRow key={handbook.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <BookOpen className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{handbook.title}</span>
                    </div>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <Badge variant="outline">{handbook.category}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={
                        handbook.status === "published"
                          ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100"
                          : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100"
                      }
                      onClick={() => togglePublish(handbook.id)}
                      style={{ cursor: "pointer" }}
                    >
                      {handbook.status === "published"
                        ? "Đã xuất bản"
                        : "Bản nháp"}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {handbook.updatedAt}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(handbook)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(handbook.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filteredHandbooks.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="py-8 text-center text-muted-foreground"
                  >
                    Không tìm thấy bài viết nào
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
