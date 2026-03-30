"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  Paperclip,
  Eye,
  ExternalLink,
  Loader2,
  ArrowUpDown,
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
import { Separator } from "@/components/ui/separator";
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
  type CreateMeetingPayload,
  type ParticipantType,
  type UpdateMeetingPayload,
  type MeetingDetail,
  type MeetingDetailDocument,
} from "@/services/meetingService";
import {
  committeeMemberParticipantId,
  committeeService,
  memberDisplayName,
  type CommitteeMember,
} from "@/services/committeeService";
import { ManualParticipantPicker } from "@/components/workspace/ManualParticipantPicker";
import { downloadMeetingDocumentFile } from "@/lib/meetingDocumentDownload";
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

function meetingDocumentLabel(
  doc: Pick<MeetingDetailDocument, "originalName" | "fileUrl">
): string {
  const name = doc.originalName?.trim();
  if (name) return name;
  return doc.fileUrl.split("/").pop()?.split("?")[0] || "Tài liệu";
}

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
  participantType: ParticipantType;
  /** Chỉ khi `participantType === "MANUAL"` — `member.id` từ GET /committee/members */
  manualParticipantIds: string[];
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
  participantType: "ALL",
  manualParticipantIds: [],
};

export default function ScheduleMeetingPage() {
  const [activeTab, setActiveTab] = useState("list");
  const [meetings, setMeetings] = useState<MeetingItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  /** Một dropdown: hình thức (offline/online) hoặc loại họp (định kỳ / bất thường). */
  const [categoryFilter, setCategoryFilter] = useState<
    "all" | "offline" | "online" | "periodic" | "extraordinary"
  >("all");
  const [sortField, setSortField] = useState<SortField>("startTime");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

  // Form state
  const [formData, setFormData] = useState<MeetingFormData>(initialFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [committeeMembers, setCommitteeMembers] = useState<CommitteeMember[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [memberSearch, setMemberSearch] = useState("");

  // Edit dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingMeeting, setEditingMeeting] = useState<MeetingItem | null>(null);
  const [editFormData, setEditFormData] = useState<MeetingFormData>(initialFormData);

  // Attachment dialog state
  const [attachmentDialogOpen, setAttachmentDialogOpen] = useState(false);
  const [selectedMeetingForAttachment, setSelectedMeetingForAttachment] = useState<MeetingItem | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [attachmentDocuments, setAttachmentDocuments] = useState<MeetingDetailDocument[]>([]);
  const [loadingAttachmentDocs, setLoadingAttachmentDocs] = useState(false);
  const attachmentFileInputRef = useRef<HTMLInputElement>(null);

  // Delete confirmation
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [meetingToDelete, setMeetingToDelete] = useState<MeetingItem | null>(null);

  // Status change dialog
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [meetingToChangeStatus, setMeetingToChangeStatus] = useState<MeetingItem | null>(null);
  const [newStatus, setNewStatus] = useState<MeetingStatus>("CANCELLED");

  // Detail dialog state
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedMeetingForDetail, setSelectedMeetingForDetail] = useState<MeetingItem | null>(null);
  const [meetingDetail, setMeetingDetail] = useState<MeetingDetail | null>(null);
  const [loadingMeetingDetail, setLoadingMeetingDetail] = useState(false);
  const [downloadingDocId, setDownloadingDocId] = useState<string | null>(null);

  const loadMeetings = useCallback(async (options?: { silent?: boolean }) => {
    if (!options?.silent) setIsLoading(true);
    try {
      const list = await meetingService.listMeetings();
      setMeetings(list);
    } catch (error) {
      const description =
        error instanceof Error ? error.message : "Không thể tải danh sách cuộc họp";
      toast.error("Không tải được danh sách cuộc họp", { description });
      setMeetings([]);
    } finally {
      if (!options?.silent) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadMeetings();
  }, [loadMeetings]);

  const reloadAttachmentDocuments = useCallback(async (meetingId: string) => {
    setLoadingAttachmentDocs(true);
    try {
      const d = await meetingService.getMeetingDetail(meetingId);
      setAttachmentDocuments(d.documents ?? []);
    } catch {
      setAttachmentDocuments([]);
    } finally {
      setLoadingAttachmentDocs(false);
    }
  }, []);

  useEffect(() => {
    if (!attachmentDialogOpen || !selectedMeetingForAttachment?.id) {
      setAttachmentDocuments([]);
      return;
    }
    void reloadAttachmentDocuments(selectedMeetingForAttachment.id);
  }, [
    attachmentDialogOpen,
    selectedMeetingForAttachment?.id,
    reloadAttachmentDocuments,
  ]);

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

    if (categoryFilter === "offline") {
      result = result.filter((m) => m.format === "OFFLINE");
    } else if (categoryFilter === "online") {
      result = result.filter((m) => m.format === "ONLINE");
    } else if (categoryFilter === "periodic") {
      result = result.filter((m) => m.type === "PERIODIC");
    } else if (categoryFilter === "extraordinary") {
      result = result.filter((m) => m.type === "EXTRAORDINARY");
    }

    result.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case "startTime":
          comparison =
            new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
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
  }, [meetings, searchQuery, categoryFilter, sortField, sortOrder]);

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

  const filteredCommitteeMembers = useMemo(() => {
    const q = memberSearch.trim().toLowerCase();
    const list = !q
      ? committeeMembers
      : committeeMembers.filter((m) => {
          const label = memberDisplayName(m).toLowerCase();
          const email = (m.email || "").toLowerCase();
          const un = (m.username || "").toLowerCase();
          return label.includes(q) || email.includes(q) || un.includes(q);
        });
    return list.slice(0, 25);
  }, [committeeMembers, memberSearch]);

  useEffect(() => {
    if (formData.participantType !== "MANUAL") return;
    let cancelled = false;
    setMembersLoading(true);
    committeeService
      .listMembers({ page: 1, limit: 200 })
      .then((items) => {
        if (!cancelled) setCommitteeMembers(items);
      })
      .catch(() => {
        if (!cancelled) {
          toast.error("Không tải được danh sách ủy viên");
          setCommitteeMembers([]);
        }
      })
      .finally(() => {
        if (!cancelled) setMembersLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [formData.participantType]);

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
    if (
      formData.participantType === "MANUAL" &&
      formData.manualParticipantIds.length === 0
    ) {
      toast.error("Vui lòng chọn ít nhất một người tham dự (Tùy chọn)");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: CreateMeetingPayload = {
        title: formData.title.trim(),
        type: formData.meetingType,
        format: formData.isOnline ? "ONLINE" : "OFFLINE",
        startTime: startDateTime.toISOString(),
        endTime: endDateTime?.toISOString(),
        content: formData.description.trim() || undefined,
        onlineLink: formData.isOnline ? formData.meetLink.trim() : null,
        location: !formData.isOnline ? formData.location.trim() : undefined,
        participantType: formData.participantType,
        participantIds:
          formData.participantType === "MANUAL"
            ? formData.manualParticipantIds
            : undefined,
      };
      await meetingService.createMeeting(payload);
      toast.success("Đã tạo lịch họp thành công");
      setFormData(initialFormData);
      setMemberSearch("");
      setActiveTab("list");
      void loadMeetings();
    } catch (error) {
      const description =
        error instanceof Error ? error.message : "Không xác định được lỗi từ server";
      toast.error("Tạo lịch họp thất bại", { description });
      void loadMeetings({ silent: true });
    } finally {
      setIsSubmitting(false);
    }
  };

  const openDetailDialog = async (meeting: MeetingItem) => {
    setSelectedMeetingForDetail(meeting);
    setMeetingDetail(null);
    setDetailDialogOpen(true);
    setLoadingMeetingDetail(true);
    try {
      const detail = await meetingService.getMeetingDetail(meeting.id);
      setMeetingDetail(detail);
    } catch (error) {
      const description =
        error instanceof Error ? error.message : "Không tải được chi tiết";
      toast.error("Không tải được chi tiết cuộc họp", { description });
    } finally {
      setLoadingMeetingDetail(false);
    }
  };

  const handleDownloadDetailDocument = async (
    fileUrl: string,
    documentId: string,
    suggestedName?: string
  ) => {
    setDownloadingDocId(documentId);
    try {
      await downloadMeetingDocumentFile(fileUrl, suggestedName);
    } catch (error) {
      const description =
        error instanceof Error ? error.message : "Tải file thất bại";
      toast.error("Không tải được tài liệu", { description });
    } finally {
      setDownloadingDocId(null);
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
      meetLink: meeting.onlineLink || "",
      location: meeting.location || "",
      meetingType: meeting.type,
      isOnline:
        meeting.format === "ONLINE" ||
        (meeting.format !== "OFFLINE" && Boolean(meeting.onlineLink)),
      participantType: "ALL",
      manualParticipantIds: [],
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
        format: editFormData.isOnline ? "ONLINE" : "OFFLINE",
        startTime: startDate.toISOString(),
        endTime: endDate.toISOString(),
        content: editFormData.description.trim() || undefined,
        onlineLink: editFormData.isOnline ? editFormData.meetLink.trim() : null,
        location: !editFormData.isOnline ? editFormData.location.trim() : undefined,
      };
      await meetingService.updateMeeting(editingMeeting.id, payload);
      toast.success("Đã cập nhật cuộc họp");
      setEditDialogOpen(false);
      void loadMeetings();
    } catch (error) {
      const description =
        error instanceof Error ? error.message : "Không xác định được lỗi từ server";
      toast.error("Cập nhật cuộc họp thất bại", { description });
      void loadMeetings({ silent: true });
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
      const description =
        error instanceof Error ? error.message : "Không xác định được lỗi từ server";
      toast.error("Xóa cuộc họp thất bại", { description });
      void loadMeetings({ silent: true });
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
      const description =
        error instanceof Error ? error.message : "Không xác định được lỗi từ server";
      toast.error("Cập nhật trạng thái thất bại", { description });
      void loadMeetings({ silent: true });
    }
  };

  const uploadMeetingFiles = async (files: File[]) => {
    if (!selectedMeetingForAttachment || files.length === 0) return;
    const max = 10;
    const batch = files.slice(0, max);
    if (files.length > max) {
      toast.warning(`Chỉ tải ${max} file mỗi lần`, {
        description: `${files.length - max} file không được gửi.`,
      });
    }
    setUploadingFile(true);
    try {
      const res = await meetingService.uploadMeetingDocuments(
        selectedMeetingForAttachment.id,
        batch
      );
      toast.success(res.message);
      void loadMeetings();
      void reloadAttachmentDocuments(selectedMeetingForAttachment.id);
      if (meetingDetail?.id === selectedMeetingForAttachment.id) {
        const refreshed = await meetingService.getMeetingDetail(
          selectedMeetingForAttachment.id
        );
        setMeetingDetail(refreshed);
      }
    } catch (error) {
      const description =
        error instanceof Error ? error.message : "Không xác định được lỗi từ server";
      toast.error("Tải file thất bại", { description });
      void loadMeetings({ silent: true });
    } finally {
      setUploadingFile(false);
      if (attachmentFileInputRef.current) attachmentFileInputRef.current.value = "";
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const list = event.target.files;
    if (!list?.length) return;
    void uploadMeetingFiles(Array.from(list));
  };

  const handleAttachmentDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    const list = event.dataTransfer.files;
    if (!list?.length) return;
    void uploadMeetingFiles(Array.from(list));
  };

  const handleDeleteMeetingDocument = async (documentId: string) => {
    if (!selectedMeetingForAttachment) return;
    try {
      await meetingService.deleteMeetingDocument(
        selectedMeetingForAttachment.id,
        documentId
      );
      toast.success("Đã xóa tài liệu");
      void loadMeetings();
      void reloadAttachmentDocuments(selectedMeetingForAttachment.id);
      if (meetingDetail?.id === selectedMeetingForAttachment.id) {
        const refreshed = await meetingService.getMeetingDetail(
          selectedMeetingForAttachment.id
        );
        setMeetingDetail(refreshed);
      }
    } catch (error) {
      const description =
        error instanceof Error ? error.message : "Không xác định được lỗi từ server";
      toast.error("Xóa file thất bại", { description });
      void loadMeetings({ silent: true });
    }
  };

  const detailVm = meetingDetail ?? selectedMeetingForDetail;
  const detailDocuments = meetingDetail?.documents ?? [];

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
                  <Select
                    value={categoryFilter}
                    onValueChange={(v) =>
                      setCategoryFilter(
                        v as "all" | "offline" | "online" | "periodic" | "extraordinary"
                      )
                    }
                  >
                    <SelectTrigger className="w-full min-w-[200px] md:w-[220px]">
                      <Filter className="mr-2 h-4 w-4 shrink-0" />
                      <SelectValue placeholder="Lọc" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tất cả</SelectItem>
                      <SelectItem value="offline">Offline</SelectItem>
                      <SelectItem value="online">Online</SelectItem>
                      <SelectItem value="periodic">Thường xuyên</SelectItem>
                      <SelectItem value="extraordinary">Bất thường</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

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
                          <TableRow
                            key={meeting.id}
                            className="cursor-pointer hover:bg-muted/50"
                            onClick={() => openDetailDialog(meeting)}
                          >
                            <TableCell className="max-w-[200px] truncate font-medium">
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
                              {meeting.onlineLink ? (
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
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedMeetingForAttachment(meeting);
                                  setAttachmentDialogOpen(true);
                                }}
                              >
                                <Paperclip className="h-4 w-4" />
                                <span className="ml-1">
                                  {meeting.documents?.length ??
                                    meeting.attachments?.length ??
                                    0}
                                </span>
                              </Button>
                            </TableCell>
                            <TableCell onClick={(e) => e.stopPropagation()}>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem
                                    onClick={() => openDetailDialog(meeting)}
                                  >
                                    <Eye className="mr-2 h-4 w-4" />
                                    Xem chi tiết
                                  </DropdownMenuItem>
                                  <DropdownMenuItem asChild>
                                    <Link
                                      href={`/workspace/schedule-meeting/${meeting.id}/attendees`}
                                      className="flex cursor-pointer items-center"
                                    >
                                      <Users className="mr-2 h-4 w-4" />
                                      Điểm danh
                                    </Link>
                                  </DropdownMenuItem>
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
                        formData.participantType === "ALL" ? "default" : "outline"
                      }
                      className="cursor-pointer"
                      onClick={() =>
                        setFormData((prev) => ({
                          ...prev,
                          participantType: "ALL",
                          manualParticipantIds: [],
                        }))
                      }
                    >
                      Tất cả Đảng viên
                    </Badge>
                    <Badge
                      variant={
                        formData.participantType === "COMMITTEE"
                          ? "default"
                          : "outline"
                      }
                      className="cursor-pointer"
                      onClick={() =>
                        setFormData((prev) => ({
                          ...prev,
                          participantType: "COMMITTEE",
                          manualParticipantIds: [],
                        }))
                      }
                    >
                      Ban Chấp hành
                    </Badge>
                    <Badge
                      variant={
                        formData.participantType === "MANUAL"
                          ? "default"
                          : "outline"
                      }
                      className="cursor-pointer"
                      onClick={() =>
                        setFormData((prev) => ({
                          ...prev,
                          participantType: "MANUAL",
                        }))
                      }
                    >
                      Tùy chọn
                    </Badge>
                  </div>
                  {formData.participantType === "MANUAL" && (
                    <ManualParticipantPicker
                      members={filteredCommitteeMembers}
                      loading={membersLoading}
                      searchQuery={memberSearch}
                      onSearchChange={setMemberSearch}
                      selectedIds={formData.manualParticipantIds}
                      onAdd={(m) =>
                        setFormData((prev) => {
                          const pid = committeeMemberParticipantId(m);
                          if (!pid) {
                            toast.error("Không có mã đảng viên (member) cho người này");
                            return prev;
                          }
                          if (prev.manualParticipantIds.includes(pid)) return prev;
                          return {
                            ...prev,
                            manualParticipantIds: [
                              ...prev.manualParticipantIds,
                              pid,
                            ],
                          };
                        })
                      }
                      onRemove={(id) =>
                        setFormData((prev) => ({
                          ...prev,
                          manualParticipantIds: prev.manualParticipantIds.filter(
                            (x) => x !== id
                          ),
                        }))
                      }
                    />
                  )}
                  <p className="mt-2 text-sm text-muted-foreground">
                    {formData.participantType === "ALL" &&
                      "Tất cả Đảng viên trong chi bộ sẽ nhận thông báo."}
                    {formData.participantType === "COMMITTEE" &&
                      "Ban Chấp hành sẽ nhận thông báo."}
                    {formData.participantType === "MANUAL" &&
                      (formData.manualParticipantIds.length > 0
                        ? `${formData.manualParticipantIds.length} người đã chọn sẽ nhận thông báo.`
                        : "Chọn người trong danh sách ủy viên (tìm theo tên trên máy khách).")}
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

      {/* Meeting Detail Dialog */}
      <Dialog
        open={detailDialogOpen}
        onOpenChange={(open) => {
          setDetailDialogOpen(open);
          if (!open) {
            setMeetingDetail(null);
            setSelectedMeetingForDetail(null);
          }
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-start justify-between">
              <div>
                <DialogTitle className="text-xl">
                  {detailVm?.title}
                </DialogTitle>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Badge variant="outline">
                    {MEETING_TYPE_LABELS[detailVm?.type || "PERIODIC"]}
                  </Badge>
                  <Badge
                    className={
                      STATUS_COLORS[detailVm?.status || "SCHEDULED"]
                    }
                  >
                    {STATUS_LABELS[detailVm?.status || "SCHEDULED"]}
                  </Badge>
                </div>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4">
            {loadingMeetingDetail && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Đang tải chi tiết cuộc họp…
              </div>
            )}

            {/* Time info */}
            <div className="flex items-center gap-3 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>
                {detailVm?.startTime && formatDateTime(detailVm.startTime)}
                {detailVm?.endTime && (
                  <>
                    {" "}
                    -{" "}
                    {new Date(detailVm.endTime).toLocaleTimeString("vi-VN", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </>
                )}
              </span>
            </div>

            {/* Location/Link */}
            {detailVm?.onlineLink ? (
              <div className="flex items-center gap-3 text-sm">
                <Video className="h-4 w-4 text-muted-foreground" />
                <a
                  href={detailVm.onlineLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-blue-600 hover:underline"
                >
                  Tham gia Google Meet
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            ) : detailVm?.location ? (
              <div className="flex items-center gap-3 text-sm">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span>{detailVm.location}</span>
              </div>
            ) : null}

            {/* Description */}
            {detailVm?.content && (
              <>
                <Separator />
                <div>
                  <p className="mb-2 text-sm font-medium">Nội dung</p>
                  <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                    {detailVm.content}
                  </p>
                </div>
              </>
            )}

            {/* Tài liệu/biên bản — GET meeting detail `documents` */}
            <Separator />
            <div>
              <p className="mb-2 flex items-center gap-2 text-sm font-medium">
                <FileText className="h-4 w-4" />
                Tài liệu đính kèm
              </p>
              {loadingMeetingDetail ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : detailDocuments.length > 0 ? (
                <div className="space-y-2">
                  {detailDocuments.map((doc) => {
                    const label = meetingDocumentLabel(doc);
                    return (
                      <div
                        key={doc.id}
                        className="flex items-center justify-between rounded-lg bg-muted/50 p-2"
                      >
                        <div className="flex min-w-0 flex-1 items-center gap-2">
                          <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">{label}</p>
                            {doc.fileSize != null ? (
                              <p className="text-xs text-muted-foreground">
                                {formatFileSize(doc.fileSize)}
                              </p>
                            ) : null}
                          </div>
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="shrink-0 gap-1"
                          disabled={downloadingDocId === doc.id}
                          onClick={() =>
                            void handleDownloadDetailDocument(
                              doc.fileUrl,
                              doc.id,
                              label
                            )
                          }
                        >
                          {downloadingDocId === doc.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Download className="h-4 w-4" />
                          )}
                          Tải
                        </Button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Không có tài liệu đính kèm
                </p>
              )}
            </div>
          </div>

          <DialogFooter className="flex-col gap-2 sm:flex-row">
            {selectedMeetingForDetail && (
              <Button variant="secondary" asChild>
                <Link
                  href={`/workspace/schedule-meeting/${selectedMeetingForDetail.id}/attendees`}
                  className="gap-2"
                >
                  <Users className="h-4 w-4" />
                  Điểm danh
                </Link>
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => {
                setDetailDialogOpen(false);
                if (selectedMeetingForDetail) {
                  openEditDialog(selectedMeetingForDetail);
                }
              }}
            >
              <Edit2 className="mr-2 h-4 w-4" />
              Chỉnh sửa
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setDetailDialogOpen(false);
                if (selectedMeetingForDetail) {
                  setSelectedMeetingForAttachment(selectedMeetingForDetail);
                  setAttachmentDialogOpen(true);
                }
              }}
            >
              <Upload className="mr-2 h-4 w-4" />
              Đính kèm file
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setDetailDialogOpen(false);
                if (selectedMeetingForDetail) {
                  setMeetingToDelete(selectedMeetingForDetail);
                  setDeleteDialogOpen(true);
                }
              }}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Xóa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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

      {/* Attachment Dialog — POST /meetings/:id/documents (multipart `files`, tối đa 10) */}
      <Dialog
        open={attachmentDialogOpen}
        onOpenChange={(open) => {
          setAttachmentDialogOpen(open);
          if (!open) setAttachmentDocuments([]);
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Tài liệu / biên bản</DialogTitle>
            <DialogDescription>
              Tải lên tối đa 10 file mỗi lần cho cuộc họp:{" "}
              {selectedMeetingForAttachment?.title}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div
              className="rounded-lg border-2 border-dashed p-6 text-center"
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onDrop={handleAttachmentDrop}
            >
              <Upload className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="mt-2 text-sm text-muted-foreground">
                Kéo thả nhiều file vào đây hoặc chọn từ máy
              </p>
              <input
                ref={attachmentFileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={handleFileUpload}
                disabled={uploadingFile}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-2"
                disabled={uploadingFile}
                onClick={() => attachmentFileInputRef.current?.click()}
              >
                {uploadingFile ? "Đang tải..." : "Chọn file (nhiều file)"}
              </Button>
            </div>

            <div className="space-y-2">
              {loadingAttachmentDocs ? (
                <div className="flex justify-center py-6">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : attachmentDocuments.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  Chưa có tài liệu nào
                </p>
              ) : (
                attachmentDocuments.map((doc) => {
                  const label = meetingDocumentLabel(doc);
                  return (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <div className="flex min-w-0 flex-1 items-center gap-3">
                        <FileText className="h-5 w-5 shrink-0 text-muted-foreground" />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{label}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatFileSize(doc.fileSize)}
                            {doc.createdAt
                              ? ` · ${formatDate(doc.createdAt)}`
                              : ""}
                          </p>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            void downloadMeetingDocumentFile(doc.fileUrl, label)
                          }
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => void handleDeleteMeetingDocument(doc.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })
              )}
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
