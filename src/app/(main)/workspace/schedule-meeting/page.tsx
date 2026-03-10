"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  Video,
  Users,
  Plus,
  Search,
  Filter,
  MoreHorizontal,
  Edit2,
  Trash2,
  XCircle,
  CheckCircle,
  FileText,
  Upload,
  Download,
  X,
  ArrowUpDown,
  Paperclip,
} from "lucide-react";
import Link from "next/link";
import BottomNav from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  meetingService,
  type MeetingItem,
  type MeetingType,
  type MeetingStatus,
  type MeetingAttachment,
  type CreateMeetingPayload,
  type UpdateMeetingPayload,
} from "@/services/meetingService";
import { toast } from "sonner";

type SortField = "startTime" | "title" | "status" | "type";
type SortOrder = "asc" | "desc";

// Extended meeting types (tương thích với DB + thêm các loại sự kiện khác)
const MEETING_TYPE_LABELS: Record<MeetingType, string> = {
  PERIODIC: "Họp định kỳ",
  EXTRAORDINARY: "Họp bất thường",
  EVENT: "Sự kiện",
  CEREMONY: "Nghi lễ",
  CELEBRATION: "Kỷ niệm",
  WEDDING: "Đám cưới",
  FUNERAL: "Tang lễ",
};

// DB enum: meetings_status_enum
const STATUS_LABELS: Record<MeetingStatus, string> = {
  SCHEDULED: "Đã lên lịch",
  HAPPENING: "Đang diễn ra",
  FINISHED: "Hoàn thành",
  CANCELLED: "Đã hủy",
};

const STATUS_COLORS: Record<MeetingStatus, string> = {
  SCHEDULED: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  HAPPENING: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  FINISHED: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  CANCELLED: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

const ensureArray = (value: unknown): MeetingItem[] => {
  if (Array.isArray(value)) return value as MeetingItem[];
  if (value && typeof value === "object") {
    const record = value as { data?: unknown; items?: unknown; results?: unknown };
    if (Array.isArray(record.data)) return record.data as MeetingItem[];
    if (
      record.data &&
      typeof record.data === "object" &&
      Array.isArray((record.data as { data?: unknown }).data)
    ) {
      return (record.data as { data?: MeetingItem[] }).data ?? [];
    }
    if (Array.isArray(record.items)) return record.items as MeetingItem[];
    if (Array.isArray(record.results)) return record.results as MeetingItem[];
  }
  return [];
};

const formatDateTime = (iso: string) => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatDate = (iso: string) => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("vi-VN");
};

const formatFileSize = (bytes?: number) => {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const MeetingListSkeleton = () => (
  <div className="space-y-3">
    {Array.from({ length: 5 }).map((_, i) => (
      <div key={i} className="h-16 rounded-lg bg-muted/40 animate-pulse" />
    ))}
  </div>
);

interface MeetingFormData {
  title: string;
  description: string;
  date: string;
  time: string;
  duration: string;
  meetLink: string;
  location: string;
  meetingType: MeetingType;
  isOnline: boolean;
  selectedMembers: string[];
}

const initialFormData: MeetingFormData = {
  title: "",
  description: "",
  date: "",
  time: "",
  duration: "120",
  meetLink: "",
  location: "",
  meetingType: "PERIODIC",
  isOnline: true,
  selectedMembers: ["all"],
};

export default function ScheduleMeetingPage() {
  const [activeTab, setActiveTab] = useState("list");
  const [meetings, setMeetings] = useState<MeetingItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<MeetingStatus | "all">("all");
  const [typeFilter, setTypeFilter] = useState<MeetingType | "all">("all");
  const [sortField, setSortField] = useState<SortField>("startTime");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

  // Form state
  const [formData, setFormData] = useState<MeetingFormData>(initialFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edit dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingMeeting, setEditingMeeting] = useState<MeetingItem | null>(null);
  const [editFormData, setEditFormData] = useState<MeetingFormData>(initialFormData);

  // Attachment dialog state
  const [attachmentDialogOpen, setAttachmentDialogOpen] = useState(false);
  const [selectedMeetingForAttachment, setSelectedMeetingForAttachment] = useState<MeetingItem | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);

  // Delete confirmation
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [meetingToDelete, setMeetingToDelete] = useState<MeetingItem | null>(null);

  // Status change dialog
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [meetingToChangeStatus, setMeetingToChangeStatus] = useState<MeetingItem | null>(null);
  const [newStatus, setNewStatus] = useState<MeetingStatus>("CANCELLED");

  const loadMeetings = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await meetingService.listMeetings();
      setMeetings(ensureArray(data));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Không thể tải danh sách cuộc họp";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadMeetings();
  }, [loadMeetings]);

  const filteredMeetings = useMemo(() => {
    let result = [...meetings];

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (m) =>
          m.title.toLowerCase().includes(query) ||
          m.content?.toLowerCase().includes(query) ||
          m.location?.toLowerCase().includes(query)
      );
    }

    // Status filter
    if (statusFilter !== "all") {
      result = result.filter((m) => m.status === statusFilter);
    }

    // Type filter
    if (typeFilter !== "all") {
      result = result.filter((m) => m.type === typeFilter);
    }

    // Sort
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case "startTime":
          comparison = new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
          break;
        case "title":
          comparison = a.title.localeCompare(b.title, "vi");
          break;
        case "status":
          comparison = (a.status || "").localeCompare(b.status || "");
          break;
        case "type":
          comparison = a.type.localeCompare(b.type);
          break;
      }
      return sortOrder === "asc" ? comparison : -comparison;
    });

    return result;
  }, [meetings, searchQuery, statusFilter, typeFilter, sortField, sortOrder]);

  const startDateTime = useMemo(() => {
    if (!formData.date || !formData.time) return null;
    const start = new Date(`${formData.date}T${formData.time}`);
    if (Number.isNaN(start.getTime())) return null;
    return start;
  }, [formData.date, formData.time]);

  const endDateTime = useMemo(() => {
    if (!startDateTime) return null;
    const durationMinutes = Number(formData.duration);
    if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) return null;
    const end = new Date(startDateTime.getTime());
    end.setMinutes(end.getMinutes() + durationMinutes);
    return end;
  }, [formData.duration, startDateTime]);

  const handleCreateSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!formData.title.trim() || !startDateTime) {
      toast.error("Vui lòng nhập đầy đủ tiêu đề, ngày và giờ");
      return;
    }
    if (formData.isOnline && !formData.meetLink.trim()) {
      toast.error("Vui lòng nhập link Google Meet");
      return;
    }
    if (!formData.isOnline && !formData.location.trim()) {
      toast.error("Vui lòng nhập địa điểm");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: CreateMeetingPayload = {
        title: formData.title.trim(),
        type: formData.meetingType,
        startTime: startDateTime.toISOString(),
        endTime: endDateTime?.toISOString(),
        content: formData.description.trim() || undefined,
        onlineLink: formData.isOnline ? formData.meetLink.trim() : undefined,
        location: !formData.isOnline ? formData.location.trim() : undefined,
      };
      await meetingService.createMeeting(payload);
      toast.success("Đã tạo lịch họp thành công");
      setFormData(initialFormData);
      setActiveTab("list");
      void loadMeetings();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Tạo lịch họp thất bại";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditDialog = (meeting: MeetingItem) => {
    setEditingMeeting(meeting);
    const startDate = new Date(meeting.startTime);
    const endDate = meeting.endTime ? new Date(meeting.endTime) : null;
    const durationMinutes = endDate
      ? Math.round((endDate.getTime() - startDate.getTime()) / 60000)
      : 120;

    setEditFormData({
      title: meeting.title,
      description: meeting.content || "",
      date: startDate.toISOString().split("T")[0],
      time: startDate.toTimeString().slice(0, 5),
      duration: String(durationMinutes),
      meetLink: meeting.online_link || "",
      location: meeting.location || "",
      meetingType: meeting.type,
      isOnline: Boolean(meeting.online_link),
      selectedMembers: ["all"],
    });
    setEditDialogOpen(true);
  };

  const handleUpdateSubmit = async () => {
    if (!editingMeeting) return;

    const startDate = new Date(`${editFormData.date}T${editFormData.time}`);
    if (Number.isNaN(startDate.getTime())) {
      toast.error("Ngày giờ không hợp lệ");
      return;
    }

    const durationMinutes = Number(editFormData.duration);
    const endDate = new Date(startDate.getTime());
    endDate.setMinutes(endDate.getMinutes() + durationMinutes);

    setIsSubmitting(true);
    try {
      const payload: UpdateMeetingPayload = {
        title: editFormData.title.trim(),
        type: editFormData.meetingType,
        startTime: startDate.toISOString(),
        endTime: endDate.toISOString(),
        content: editFormData.description.trim() || undefined,
        onlineLink: editFormData.isOnline ? editFormData.meetLink.trim() : undefined,
        location: !editFormData.isOnline ? editFormData.location.trim() : undefined,
      };
      await meetingService.updateMeeting(editingMeeting.id, payload);
      toast.success("Đã cập nhật cuộc họp");
      setEditDialogOpen(false);
      void loadMeetings();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Cập nhật thất bại";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteMeeting = async () => {
    if (!meetingToDelete) return;
    try {
      await meetingService.deleteMeeting(meetingToDelete.id);
      toast.success("Đã xóa cuộc họp");
      setDeleteDialogOpen(false);
      void loadMeetings();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Xóa thất bại";
      toast.error(message);
    }
  };

  const handleStatusChange = async () => {
    if (!meetingToChangeStatus) return;
    try {
      await meetingService.updateMeetingStatus(meetingToChangeStatus.id, newStatus);
      toast.success(`Đã cập nhật trạng thái thành "${STATUS_LABELS[newStatus]}"`);
      setStatusDialogOpen(false);
      void loadMeetings();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Cập nhật trạng thái thất bại";
      toast.error(message);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !selectedMeetingForAttachment) return;

    setUploadingFile(true);
    try {
      await meetingService.uploadAttachment(selectedMeetingForAttachment.id, file);
      toast.success("Đã tải file lên thành công");
      void loadMeetings();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Tải file thất bại";
      toast.error(message);
    } finally {
      setUploadingFile(false);
    }
  };

  const handleDeleteAttachment = async (attachmentId: string) => {
    if (!selectedMeetingForAttachment) return;
    try {
      await meetingService.deleteAttachment(selectedMeetingForAttachment.id, attachmentId);
      toast.success("Đã xóa file");
      void loadMeetings();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Xóa file thất bại";
      toast.error(message);
    }
  };

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-6">
      <main className="mx-auto max-w-6xl px-4 py-5">
        <Link
          href="/workspace"
          className="mb-4 inline-flex items-center gap-2 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Quay lại Workspace</span>
        </Link>

        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">Quản lý lịch họp</h1>
          <p className="text-muted-foreground">Tạo, sắp xếp và quản lý các cuộc họp của Chi bộ</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList>
            <TabsTrigger value="list">
              <FileText className="mr-2 h-4 w-4" />
              Danh sách
            </TabsTrigger>
            <TabsTrigger value="create">
              <Plus className="mr-2 h-4 w-4" />
              Tạo mới
            </TabsTrigger>
          </TabsList>

          {/* List Tab */}
          <TabsContent value="list" className="space-y-4">
            {/* Filters */}
            <Card>
              <CardContent className="pt-4">
                <div className="flex flex-col gap-4 md:flex-row md:items-center">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Tìm kiếm cuộc họp..."
                      className="pl-10"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Select
                      value={statusFilter}
                      onValueChange={(v) => setStatusFilter(v as MeetingStatus | "all")}
                    >
                      <SelectTrigger className="w-[150px]">
                        <Filter className="mr-2 h-4 w-4" />
                        <SelectValue placeholder="Trạng thái" />
                      </SelectTrigger>
<SelectContent>
                                        <SelectItem value="all">Tất cả trạng thái</SelectItem>
                                        <SelectItem value="SCHEDULED">Đã lên lịch</SelectItem>
                                        <SelectItem value="HAPPENING">Đang diễn ra</SelectItem>
                                        <SelectItem value="FINISHED">Hoàn thành</SelectItem>
                                        <SelectItem value="CANCELLED">Đã hủy</SelectItem>
                                      </SelectContent>
                    </Select>
                    <Select
                      value={typeFilter}
                      onValueChange={(v) => setTypeFilter(v as MeetingType | "all")}
                    >
                      <SelectTrigger className="w-[160px]">
                        <SelectValue placeholder="Loại cuộc họp" />
                      </SelectTrigger>
<SelectContent>
                                        <SelectItem value="all">Tất cả loại</SelectItem>
                                        <SelectItem value="PERIODIC">Họp định kỳ</SelectItem>
                                        <SelectItem value="EXTRAORDINARY">Họp bất thường</SelectItem>
                                        <SelectItem value="EVENT">Sự kiện</SelectItem>
                                        <SelectItem value="CEREMONY">Nghi lễ</SelectItem>
                                        <SelectItem value="CELEBRATION">Kỷ niệm</SelectItem>
                                        <SelectItem value="WEDDING">Đám cưới</SelectItem>
                                        <SelectItem value="FUNERAL">Tang lễ</SelectItem>
                                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Meeting Table */}
            <Card>
              <CardContent className="p-0">
                {isLoading ? (
                  <div className="p-4">
                    <MeetingListSkeleton />
                  </div>
                ) : filteredMeetings.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Calendar className="h-12 w-12 text-muted-foreground/50" />
                    <h3 className="mt-4 text-lg font-medium">Chưa có cuộc họp nào</h3>
                    <p className="text-muted-foreground">
                      Bắt đầu bằng cách tạo cuộc họp mới
                    </p>
                    <Button className="mt-4" onClick={() => setActiveTab("create")}>
                      <Plus className="mr-2 h-4 w-4" />
                      Tạo cuộc họp
                    </Button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead
                            className="cursor-pointer"
                            onClick={() => toggleSort("title")}
                          >
                            <div className="flex items-center gap-1">
                              Tiêu đề
                              <ArrowUpDown className="h-4 w-4" />
                            </div>
                          </TableHead>
                          <TableHead
                            className="cursor-pointer"
                            onClick={() => toggleSort("startTime")}
                          >
                            <div className="flex items-center gap-1">
                              Thời gian
                              <ArrowUpDown className="h-4 w-4" />
                            </div>
                          </TableHead>
                          <TableHead
                            className="cursor-pointer"
                            onClick={() => toggleSort("type")}
                          >
                            <div className="flex items-center gap-1">
                              Loại
                              <ArrowUpDown className="h-4 w-4" />
                            </div>
                          </TableHead>
                          <TableHead
                            className="cursor-pointer"
                            onClick={() => toggleSort("status")}
                          >
                            <div className="flex items-center gap-1">
                              Trạng thái
                              <ArrowUpDown className="h-4 w-4" />
                            </div>
                          </TableHead>
                          <TableHead>Địa điểm</TableHead>
                          <TableHead>File</TableHead>
                          <TableHead className="w-[70px]">Thao tác</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredMeetings.map((meeting) => (
                          <TableRow key={meeting.id}>
                            <TableCell className="font-medium max-w-[200px] truncate">
                              {meeting.title}
                            </TableCell>
                            <TableCell className="text-sm">
                              {formatDateTime(meeting.startTime)}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {MEETING_TYPE_LABELS[meeting.type]}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge
                                className={STATUS_COLORS[meeting.status || "SCHEDULED"]}
                              >
                                {STATUS_LABELS[meeting.status || "SCHEDULED"]}
                              </Badge>
                            </TableCell>
                            <TableCell className="max-w-[150px] truncate">
                              {meeting.online_link ? (
                                <div className="flex items-center gap-1 text-sm text-blue-600">
                                  <Video className="h-3 w-3" />
                                  Online
                                </div>
                              ) : (
                                <span className="text-sm">{meeting.location || "-"}</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedMeetingForAttachment(meeting);
                                  setAttachmentDialogOpen(true);
                                }}
                              >
                                <Paperclip className="h-4 w-4" />
                                <span className="ml-1">
                                  {meeting.attachments?.length || 0}
                                </span>
                              </Button>
                            </TableCell>
                            <TableCell>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => openEditDialog(meeting)}>
                                    <Edit2 className="mr-2 h-4 w-4" />
                                    Chỉnh sửa
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setSelectedMeetingForAttachment(meeting);
                                      setAttachmentDialogOpen(true);
                                    }}
                                  >
                                    <Upload className="mr-2 h-4 w-4" />
                                    Đính kèm file
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setMeetingToChangeStatus(meeting);
                                      setNewStatus("HAPPENING");
                                      setStatusDialogOpen(true);
                                    }}
                                  >
                                    <Clock className="mr-2 h-4 w-4 text-amber-600" />
                                    Đang diễn ra
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setMeetingToChangeStatus(meeting);
                                      setNewStatus("FINISHED");
                                      setStatusDialogOpen(true);
                                    }}
                                  >
                                    <CheckCircle className="mr-2 h-4 w-4 text-green-600" />
                                    Đánh dấu hoàn thành
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setMeetingToChangeStatus(meeting);
                                      setNewStatus("CANCELLED");
                                      setStatusDialogOpen(true);
                                    }}
                                  >
                                    <XCircle className="mr-2 h-4 w-4 text-red-600" />
                                    Hủy cuộc họp
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    className="text-destructive"
                                    onClick={() => {
                                      setMeetingToDelete(meeting);
                                      setDeleteDialogOpen(true);
                                    }}
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Xóa
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Create Tab */}
          <TabsContent value="create">
            <form className="space-y-6" onSubmit={handleCreateSubmit}>
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Loại lịch</CardTitle>
                </CardHeader>
                <CardContent>
                  <RadioGroup
                    value={formData.meetingType}
                    onValueChange={(value) =>
                      setFormData((prev) => ({
                        ...prev,
                        meetingType: value as MeetingType,
                      }))
                    }
                    className="grid grid-cols-2 gap-4 md:grid-cols-3"
                  >
                    {(Object.entries(MEETING_TYPE_LABELS) as [MeetingType, string][]).map(
                      ([value, label]) => (
                        <Label
                          key={value}
                          htmlFor={`type-${value}`}
                          className={`flex cursor-pointer items-center gap-3 rounded-lg border-2 p-4 transition-colors ${
                            formData.meetingType === value
                              ? "border-primary bg-primary/5"
                              : "border-border"
                          }`}
                        >
                          <RadioGroupItem value={value} id={`type-${value}`} />
                          <span className="font-medium">{label}</span>
                        </Label>
                      )
                    )}
                  </RadioGroup>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Thông tin cơ bản</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Tiêu đề *</Label>
                    <Input
                      id="title"
                      placeholder="VD: Họp Chi bộ tháng 1/2025"
                      value={formData.title}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, title: e.target.value }))
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Mô tả</Label>
                    <Textarea
                      id="description"
                      placeholder="Nội dung, mục đích cuộc họp/sự kiện..."
                      rows={3}
                      value={formData.description}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, description: e.target.value }))
                      }
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="date">Ngày *</Label>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          id="date"
                          type="date"
                          className="pl-10"
                          value={formData.date}
                          onChange={(e) =>
                            setFormData((prev) => ({ ...prev, date: e.target.value }))
                          }
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="time">Thời gian *</Label>
                      <div className="relative">
                        <Clock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          id="time"
                          type="time"
                          className="pl-10"
                          value={formData.time}
                          onChange={(e) =>
                            setFormData((prev) => ({ ...prev, time: e.target.value }))
                          }
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="duration">Thời lượng (phút)</Label>
                    <Input
                      id="duration"
                      type="number"
                      placeholder="120"
                      value={formData.duration}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, duration: e.target.value }))
                      }
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between text-lg">
                    <span>Địa điểm</span>
                    <div className="flex items-center gap-2">
                      <Label htmlFor="online-toggle" className="text-sm font-normal">
                        Họp online
                      </Label>
                      <Switch
                        id="online-toggle"
                        checked={formData.isOnline}
                        onCheckedChange={(checked) =>
                          setFormData((prev) => ({ ...prev, isOnline: checked }))
                        }
                      />
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {formData.isOnline ? (
                    <div className="space-y-2">
                      <Label htmlFor="meet-link">Link Google Meet</Label>
                      <div className="relative">
                        <Video className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          id="meet-link"
                          placeholder="https://meet.google.com/xxx-yyyy-zzz"
                          className="pl-10"
                          value={formData.meetLink}
                          onChange={(e) =>
                            setFormData((prev) => ({ ...prev, meetLink: e.target.value }))
                          }
                        />
                      </div>
                      <Button type="button" variant="outline" size="sm" className="mt-2">
                        <Plus className="mr-1 h-4 w-4" />
                        Tạo link Meet mới
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Label htmlFor="location">Địa chỉ</Label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          id="location"
                          placeholder="VD: Hội trường A, 123 Nguyễn Trãi, Hà Nội"
                          className="pl-10"
                          value={formData.location}
                          onChange={(e) =>
                            setFormData((prev) => ({ ...prev, location: e.target.value }))
                          }
                        />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Users className="h-5 w-5" />
                    Người tham dự
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="mb-4 flex flex-wrap gap-2">
                    <Badge
                      variant={
                        formData.selectedMembers.includes("all") ? "default" : "outline"
                      }
                      className="cursor-pointer"
                      onClick={() =>
                        setFormData((prev) => ({ ...prev, selectedMembers: ["all"] }))
                      }
                    >
                      Tất cả Đảng viên
                    </Badge>
                    <Badge
                      variant={
                        formData.selectedMembers.includes("leaders") ? "default" : "outline"
                      }
                      className="cursor-pointer"
                      onClick={() =>
                        setFormData((prev) => ({ ...prev, selectedMembers: ["leaders"] }))
                      }
                    >
                      Ban Chấp hành
                    </Badge>
                    <Badge
                      variant={
                        formData.selectedMembers.includes("custom") ? "default" : "outline"
                      }
                      className="cursor-pointer"
                      onClick={() =>
                        setFormData((prev) => ({ ...prev, selectedMembers: ["custom"] }))
                      }
                    >
                      Tùy chọn
                    </Badge>
                  </div>
                  {formData.selectedMembers.includes("custom") && (
                    <Input placeholder="Tìm kiếm đảng viên..." />
                  )}
                  <p className="mt-2 text-sm text-muted-foreground">
                    48 người sẽ nhận được thông báo
                  </p>
                </CardContent>
              </Card>

              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setActiveTab("list")}
                >
                  Hủy
                </Button>
                <Button type="submit" className="flex-1" disabled={isSubmitting}>
                  {isSubmitting ? "Đang tạo..." : "Tạo lịch"}
                </Button>
              </div>
            </form>
          </TabsContent>
        </Tabs>
      </main>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Chỉnh sửa cuộc họp</DialogTitle>
            <DialogDescription>Cập nhật thông tin cuộc họp</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Tiêu đề *</Label>
              <Input
                value={editFormData.title}
                onChange={(e) =>
                  setEditFormData((prev) => ({ ...prev, title: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Mô tả</Label>
              <Textarea
                rows={3}
                value={editFormData.description}
                onChange={(e) =>
                  setEditFormData((prev) => ({ ...prev, description: e.target.value }))
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Ngày</Label>
                <Input
                  type="date"
                  value={editFormData.date}
                  onChange={(e) =>
                    setEditFormData((prev) => ({ ...prev, date: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Thời gian</Label>
                <Input
                  type="time"
                  value={editFormData.time}
                  onChange={(e) =>
                    setEditFormData((prev) => ({ ...prev, time: e.target.value }))
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Thời lượng (phút)</Label>
              <Input
                type="number"
                value={editFormData.duration}
                onChange={(e) =>
                  setEditFormData((prev) => ({ ...prev, duration: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Loại cuộc họp</Label>
              <Select
                value={editFormData.meetingType}
                onValueChange={(v) =>
                  setEditFormData((prev) => ({ ...prev, meetingType: v as MeetingType }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(MEETING_TYPE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={editFormData.isOnline}
                onCheckedChange={(checked) =>
                  setEditFormData((prev) => ({ ...prev, isOnline: checked }))
                }
              />
              <Label>Họp online</Label>
            </div>
            {editFormData.isOnline ? (
              <div className="space-y-2">
                <Label>Link Google Meet</Label>
                <Input
                  value={editFormData.meetLink}
                  onChange={(e) =>
                    setEditFormData((prev) => ({ ...prev, meetLink: e.target.value }))
                  }
                />
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Địa điểm</Label>
                <Input
                  value={editFormData.location}
                  onChange={(e) =>
                    setEditFormData((prev) => ({ ...prev, location: e.target.value }))
                  }
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Hủy
            </Button>
            <Button onClick={handleUpdateSubmit} disabled={isSubmitting}>
              {isSubmitting ? "Đang lưu..." : "Lưu thay đổi"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Attachment Dialog */}
      <Dialog open={attachmentDialogOpen} onOpenChange={setAttachmentDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>File đính kèm</DialogTitle>
            <DialogDescription>
              Quản lý các file đính kèm cho cuộc họp:{" "}
              {selectedMeetingForAttachment?.title}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Upload area */}
            <div className="border-2 border-dashed rounded-lg p-6 text-center">
              <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
              <p className="mt-2 text-sm text-muted-foreground">
                Kéo thả file vào đây hoặc
              </p>
              <label className="mt-2 inline-block">
                <Input
                  type="file"
                  className="hidden"
                  onChange={handleFileUpload}
                  disabled={uploadingFile}
                />
                <Button variant="outline" size="sm" asChild disabled={uploadingFile}>
                  <span>{uploadingFile ? "Đang tải..." : "Chọn file"}</span>
                </Button>
              </label>
            </div>

            {/* File list */}
            <div className="space-y-2">
              {selectedMeetingForAttachment?.attachments?.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Chưa có file đính kèm nào
                </p>
              )}
              {selectedMeetingForAttachment?.attachments?.map((attachment) => (
                <div
                  key={attachment.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">{attachment.fileName}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(attachment.fileSize)} -{" "}
                        {formatDate(attachment.uploadedAt)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      asChild
                    >
                      <a href={attachment.fileUrl} target="_blank" rel="noopener noreferrer">
                        <Download className="h-4 w-4" />
                      </a>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteAttachment(attachment.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAttachmentDialogOpen(false)}>
              Đóng
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xác nhận xóa</DialogTitle>
            <DialogDescription>
              Bạn có chắc chắn muốn xóa cuộc họp "{meetingToDelete?.title}"? Hành động
              này không thể hoàn tác.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Hủy
            </Button>
            <Button variant="destructive" onClick={handleDeleteMeeting}>
              Xóa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Status Change Dialog */}
      <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Thay đổi trạng thái</DialogTitle>
            <DialogDescription>
              Bạn có chắc chắn muốn thay đổi trạng thái cuộc họp "
              {meetingToChangeStatus?.title}" thành "{STATUS_LABELS[newStatus]}"?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStatusDialogOpen(false)}>
              Hủy
            </Button>
            <Button onClick={handleStatusChange}>Xác nhận</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <BottomNav />
    </div>
  );
}
