"use client";

import { useState, useEffect } from "react";
import {
  Download,
  Calendar,
  Clock,
  MapPin,
  Video,
  FileText,
  Edit2,
  Trash2,
  Loader2,
  KeyRound,
  QrCode,
  UserMinus,
} from "lucide-react";
import { BrowserMultiFormatReader, type IScannerControls } from "@zxing/browser";
import {
  Dialog,
  DialogContent,
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
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  meetingService,
  type MeetingType,
  type MeetingDetailDocument,
  type UpdateMeetingPayload,
} from "@/services/meetingService";
import { downloadMeetingDocumentFile } from "@/lib/meetingDocumentDownload";
import { toastServiceErrorOnce } from "@/lib/serviceErrorToast";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

type EventType = "meeting" | "wedding" | "funeral" | "ceremony" | "celebration";

export interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  type: EventType;
  description?: string;
  location?: string;
  isOnline?: boolean;
  meetLink?: string;
  files?: { name: string; size: string; url: string }[];
  note?: string;
  // Store original meeting type for editing
  originalType?: MeetingType;
  /** Từ API — ưu tiên để hiển thị điểm danh offline */
  format?: "OFFLINE" | "ONLINE";
}

interface EventDetailPopupProps {
  event: CalendarEvent | null;
  open: boolean;
  onClose: () => void;
  onUpdate?: () => void;
  onDelete?: () => void;
}

const MEETING_TYPE_LABELS: Record<MeetingType, string> = {
  PERIODIC: "Họp định kỳ",
  EXTRAORDINARY: "Họp bất thường",
  EVENT: "Sự kiện",
  CEREMONY: "Nghi lễ",
  CELEBRATION: "Kỷ niệm",
  WEDDING: "Đám cưới",
  FUNERAL: "Tang lễ",
};

const getEventTypeInfo = (type: EventType) => {
  switch (type) {
    case "meeting":
      return { label: "Cuộc họp", color: "bg-primary text-primary-foreground" };
    case "ceremony":
      return {
        label: "Lễ kết nạp",
        color: "bg-secondary text-secondary-foreground",
      };
    case "wedding":
      return { label: "Đám cưới", color: "bg-pink-500 text-white" };
    case "funeral":
      return { label: "Tang lễ", color: "bg-gray-700 text-white" };
    case "celebration":
      return { label: "Chúc mừng", color: "bg-amber-500 text-white" };
    default:
      return { label: "Sự kiện", color: "bg-muted text-muted-foreground" };
  }
};

const mapEventTypeToMeetingType = (type: EventType): MeetingType => {
  switch (type) {
    case "meeting":
      return "PERIODIC";
    case "ceremony":
      return "CEREMONY";
    case "wedding":
      return "WEDDING";
    case "funeral":
      return "FUNERAL";
    case "celebration":
      return "CELEBRATION";
    default:
      return "EVENT";
  }
};

interface EditFormData {
  title: string;
  description: string;
  date: string;
  startTime: string;
  endTime: string;
  meetLink: string;
  location: string;
  meetingType: MeetingType;
  isOnline: boolean;
}

const EventDetailPopup = ({
  event,
  open,
  onClose,
  onUpdate,
  onDelete,
}: EventDetailPopupProps) => {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [meetingDocuments, setMeetingDocuments] = useState<MeetingDetailDocument[]>(
    []
  );
  const [loadingDocuments, setLoadingDocuments] = useState(false);
  const [formData, setFormData] = useState<EditFormData>({
    title: "",
    description: "",
    date: "",
    startTime: "",
    endTime: "",
    meetLink: "",
    location: "",
    meetingType: "PERIODIC",
    isOnline: false,
  });

  const [checkInSubmitting, setCheckInSubmitting] = useState(false);
  const [qrScannerOpen, setQrScannerOpen] = useState(false);
  const [qrScanError, setQrScanError] = useState<string | null>(null);
  const [scannedQrId, setScannedQrId] = useState("");
  const [scanning, setScanning] = useState(false);
  const [leaveReason, setLeaveReason] = useState("");
  const [leaveFile, setLeaveFile] = useState<File | null>(null);
  const [leaveSubmitting, setLeaveSubmitting] = useState(false);

  const isOfflineMeeting =
    event?.format === "OFFLINE" ||
    (!event?.isOnline && event?.format !== "ONLINE");

  const role = String(user?.role ?? "").toUpperCase();
  const isPartyMember = role === "PARTY_MEMBER" || role === "MEMBER";
  const canManageMeeting = !isPartyMember && role !== "OUTSTANDING_INDIVIDUAL";

  useEffect(() => {
    if (!open || !event?.id) {
      setMeetingDocuments([]);
      return;
    }
    let cancelled = false;
    setLoadingDocuments(true);
    meetingService
      .getMeetingDetail(event.id)
      .then((detail) => {
        if (!cancelled) setMeetingDocuments(detail.documents ?? []);
      })
      .catch((err) => {
        if (!cancelled) {
          setMeetingDocuments([]);
          const description =
            err instanceof Error ? err.message : "Không tải được tài liệu";
          toast.error("Không tải được danh sách tài liệu", { description });
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingDocuments(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, event?.id]);

  useEffect(() => {
    if (!open) return;
    setScannedQrId("");
    setQrScanError(null);
    setLeaveReason("");
    setLeaveFile(null);
  }, [open, event?.id]);

  // QR scanner hook MUST run before any early-return to avoid hook order mismatch
  useEffect(() => {
    if (!qrScannerOpen) return;
    if (!event?.id) return;

    let cancelled = false;
    setQrScanError(null);
    setScanning(true);

    const meetingId = event.id;
    const reader = new BrowserMultiFormatReader();
    let controls: IScannerControls | undefined;
    reader
      .decodeFromVideoDevice(undefined, "qr-video", async (result, err) => {
        if (cancelled) return;
        if (result) {
          const text = result.getText();
          setScannedQrId(text);
          setQrScannerOpen(false);
          setScanning(false);
          setCheckInSubmitting(true);
          try {
            await meetingService.checkInMeeting(meetingId, text);
            toast.success("Điểm danh thành công");
            setScannedQrId("");
            onUpdate?.();
          } catch (error) {
            toast.error(
              error instanceof Error ? error.message : "Điểm danh thất bại",
            );
          } finally {
            setCheckInSubmitting(false);
          }
          return;
        }
        if (err) {
          const name = (err as { name?: unknown }).name;
          // ZXing bắn NotFoundException liên tục khi chưa thấy QR — ignore.
          if (name === "NotFoundException") return;
          setQrScanError("Không thể đọc QR. Vui lòng thử lại.");
        }
      })
      .then((c) => {
        controls = c;
      })
      .catch(() => {
        if (!cancelled) {
          setQrScanError("Không thể mở camera. Hãy cấp quyền camera.");
          setScanning(false);
        }
      });

    return () => {
      cancelled = true;
      setScanning(false);
      try {
        controls?.stop();
      } catch {
        // ignore
      }
      try {
        BrowserMultiFormatReader.releaseAllStreams();
      } catch {
        // ignore
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qrScannerOpen, event?.id]);

  if (!event) return null;

  const { label: typeLabel, color: typeColor } = getEventTypeInfo(event.type);
  const meetingModeLabel = isOfflineMeeting ? "Offline" : "Online";
  const meetingModeColor = isOfflineMeeting
    ? "bg-red-500 text-white"
    : "bg-sky-500 text-white";

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "N/A";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleStartEdit = () => {
    setFormData({
      title: event.title,
      description: event.description || "",
      date: event.date,
      startTime: event.startTime,
      endTime: event.endTime,
      meetLink: event.meetLink || "",
      location: event.location || "",
      meetingType: event.originalType || mapEventTypeToMeetingType(event.type),
      isOnline: event.isOnline || false,
    });
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
  };

  const handleSaveEdit = async () => {
    if (!formData.title.trim()) {
      toast.error("Vui lòng nhập tiêu đề");
      return;
    }

    setIsSubmitting(true);
    try {
      const startDateTime = new Date(`${formData.date}T${formData.startTime}`);
      const endDateTime = new Date(`${formData.date}T${formData.endTime}`);

      const payload: UpdateMeetingPayload = {
        title: formData.title.trim(),
        type: formData.meetingType,
        startTime: startDateTime.toISOString(),
        endTime: endDateTime.toISOString(),
        content: formData.description.trim() || undefined,
        onlineLink: formData.isOnline ? formData.meetLink.trim() : null,
        location: !formData.isOnline ? formData.location.trim() : undefined,
      };

      await meetingService.updateMeeting(event.id, payload);
      toast.success("Đã cập nhật cuộc họp");
      setIsEditing(false);
      onUpdate?.();
      onClose();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Cập nhật thất bại";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setIsSubmitting(true);
    try {
      await meetingService.deleteMeeting(event.id);
      toast.success("Đã xóa cuộc họp");
      setDeleteDialogOpen(false);
      onDelete?.();
      onClose();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Xóa thất bại";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClickMeet = () => {
    window.postMessage(
      {
        type: "SET_ACTIVE_MEETING",
        meetingId: event.id,
      },
      "*",
    );
    window.open(event.meetLink, "_blank", "noopener,noreferrer");
  };

  const handleOfflineCheckIn = async () => {
    if (!scannedQrId.trim()) {
      toast.error("Vui lòng quét mã QR");
      return;
    }
    setCheckInSubmitting(true);
    try {
      await meetingService.checkInMeeting(event.id, scannedQrId);
      toast.success("Điểm danh thành công");
      setScannedQrId("");
      onUpdate?.();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Điểm danh thất bại"
      );
    } finally {
      setCheckInSubmitting(false);
    }
  };

  const handleSubmitLeaveRequest = async () => {
    if (!leaveReason.trim()) {
      toast.error("Vui lòng nhập lý do xin vắng");
      return;
    }
    if (!leaveFile) {
      toast.error("Vui lòng đính kèm file hoặc ảnh minh chứng");
      return;
    }
    setLeaveSubmitting(true);
    try {
      await meetingService.submitMeetingLeaveRequest(
        event.id,
        leaveReason,
        leaveFile
      );
      toast.success("Đã gửi đơn xin vắng mặt");
      setLeaveReason("");
      setLeaveFile(null);
      onUpdate?.();
    } catch (error) {
      toastServiceErrorOnce(error, { fallbackMessage: "Gửi đơn thất bại" });
    } finally {
      setLeaveSubmitting(false);
    }
  };

  const leaveRequestSection = (
    <div className="space-y-2 border-t border-border pt-4">
      <p className="flex items-center gap-2 text-sm font-medium">
        <UserMinus className="h-4 w-4" />
        Xin vắng mặt
      </p>
      <p className="text-sm leading-6 text-muted-foreground">
        Bắt buộc: lý do và file minh chứng (PDF, JPG, PNG...).
      </p>
      <div className="space-y-2">
        <Label htmlFor="leave-reason">Lý do</Label>
        <Textarea
          id="leave-reason"
          rows={3}
          placeholder="Nêu lý do xin vắng mặt"
          value={leaveReason}
          onChange={(e) => setLeaveReason(e.target.value)}
          disabled={leaveSubmitting}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="leave-file">Minh chứng</Label>
        <Input
          id="leave-file"
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,.webp,image/*,application/pdf"
          disabled={leaveSubmitting}
          onChange={(e) => {
            const f = e.target.files?.[0];
            setLeaveFile(f ?? null);
          }}
        />
      </div>
      <Button
        type="button"
        variant="secondary"
        className="w-full sm:w-auto"
        onClick={() => void handleSubmitLeaveRequest()}
        disabled={leaveSubmitting}
      >
        {leaveSubmitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Đang gửi
          </>
        ) : (
          "Gửi đơn xin vắng"
        )}
      </Button>
    </div>
  );

  // Edit mode view
  if (isEditing) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="w-[95vw]! sm:max-w-[1200px]! max-w-[1200px]! max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Chỉnh sửa cuộc họp</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-title">Tiêu đề</Label>
              <Input
                id="edit-title"
                value={formData.title}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, title: e.target.value }))
                }
                placeholder="Nhập tiêu đề cuộc họp"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-type">Loại cuộc họp</Label>
              <Select
                value={formData.meetingType}
                onValueChange={(v) =>
                  setFormData((prev) => ({
                    ...prev,
                    meetingType: v as MeetingType,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(MEETING_TYPE_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-date">Ngày</Label>
                <Input
                  id="edit-date"
                  type="date"
                  value={formData.date}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, date: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-start-time">Giờ bắt đầu</Label>
                <Input
                  id="edit-start-time"
                  type="time"
                  value={formData.startTime}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      startTime: e.target.value,
                    }))
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-end-time">Giờ kết thúc</Label>
              <Input
                id="edit-end-time"
                type="time"
                value={formData.endTime}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, endTime: e.target.value }))
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="edit-online">Họp online</Label>
              <Switch
                id="edit-online"
                checked={formData.isOnline}
                onCheckedChange={(checked) =>
                  setFormData((prev) => ({ ...prev, isOnline: checked }))
                }
              />
            </div>

            {formData.isOnline ? (
              <div className="space-y-2">
                <Label htmlFor="edit-meet-link">Link Google Meet</Label>
                <Input
                  id="edit-meet-link"
                  type="url"
                  value={formData.meetLink}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      meetLink: e.target.value,
                    }))
                  }
                  placeholder="https://meet.google.com/..."
                />
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="edit-location">Địa điểm</Label>
                <Input
                  id="edit-location"
                  value={formData.location}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      location: e.target.value,
                    }))
                  }
                  placeholder="Nhập địa điểm"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="edit-description">Mô tả / Nội dung</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                placeholder="Nhập mô tả cuộc họp"
                rows={3}
              />
            </div>
          </div>

          <div className="mt-4 flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={handleCancelEdit}
              disabled={isSubmitting}
            >
              Hủy
            </Button>
            <Button
              className="flex-1"
              onClick={handleSaveEdit}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Đang lưu..." : "Lưu thay đổi"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // View mode
  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="w-[95vw]! sm:max-w-[1200px]! max-w-[1200px]! max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Badge className={meetingModeColor}>{meetingModeLabel}</Badge>
                  <Badge variant="outline">{typeLabel}</Badge>
                </div>
                <DialogTitle className="mt-2 text-xl">
                  {event.title}
                </DialogTitle>
              </div>
              {canManageMeeting ? (
                <div className="flex gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={handleStartEdit}
                    title="Chỉnh sửa"
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => setDeleteDialogOpen(true)}
                    title="Xóa"
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ) : null}
            </div>
          </DialogHeader>

          <div className="grid gap-8 lg:grid-cols-[minmax(320px,0.9fr)_minmax(520px,1.1fr)]">
            <div className="min-w-0 space-y-4">
              <div className="flex items-start gap-3 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="leading-7">
                  {new Date(event.date).toLocaleDateString("vi-VN", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </span>
              </div>
              <div className="flex items-start gap-3 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="leading-7">
                  {event.startTime} - {event.endTime}
                </span>
              </div>

              {event.isOnline ? (
                  <div className="flex items-start gap-3 text-sm">
                  <Video className="mt-0.5 h-4 w-4 text-muted-foreground" />
                  <div className="min-w-0">
                      <span className="leading-7">Họp online - Google Meet</span>
                    {event.meetLink && (
                      <a
                        href={event.meetLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1 block truncate text-primary hover:underline"
                        title={event.meetLink}
                      >
                        {event.meetLink}
                      </a>
                    )}
                  </div>
                </div>
              ) : (
                event.location && (
                  <div className="flex items-start gap-3 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span className="wrap-break-word leading-7">{event.location}</span>
                  </div>
                )
              )}

              {event.description ? (
                <>
                  <Separator />
                  <div>
                    <p className="mb-1 text-sm font-medium">Mô tả</p>
                  <p className="text-sm leading-7 text-muted-foreground">
                    {event.description}
                  </p>
                  </div>
                </>
              ) : null}

              {event.note ? (
                <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3 dark:border-yellow-800 dark:bg-yellow-900/20">
                  <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                    Lưu ý
                  </p>
                  <p className="text-sm leading-7 text-yellow-700 dark:text-yellow-300">
                    {event.note}
                  </p>
                </div>
              ) : null}

              <Separator />
              <div>
                <p className="mb-2 flex items-center gap-2 text-sm font-medium">
                  <FileText className="h-4 w-4" />
                  Tài liệu đính kèm
                </p>
                {loadingDocuments ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : meetingDocuments.length > 0 ? (
                  <div className="space-y-2">
                    {meetingDocuments.map((doc) => {
                      const label =
                        doc.originalName?.trim() ||
                        doc.fileUrl.split("/").pop()?.split("?")[0] ||
                        "Tài liệu";
                      return (
                        <div
                          key={doc.id}
                          className="flex items-center justify-between rounded-lg bg-muted/50 p-2"
                        >
                          <div className="flex min-w-0 flex-1 items-center gap-2">
                            <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium">{label}</p>
                              <p className="text-xs text-muted-foreground">
                                {formatFileSize(doc.fileSize)}
                              </p>
                            </div>
                          </div>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="shrink-0 gap-1"
                            onClick={() => void downloadMeetingDocumentFile(doc.fileUrl, label)}
                          >
                            <Download className="h-4 w-4" />
                            Tải
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Không có tài liệu đính kèm</p>
                )}
              </div>
            </div>

            <div className="min-w-0 space-y-4">
              {isOfflineMeeting ? (
                <div className="w-full space-y-4 rounded-lg border bg-muted/30 p-5">
                  <div className="space-y-2">
                    <p className="flex items-center gap-2 text-sm font-medium">
                      <KeyRound className="h-4 w-4" />
                      Điểm danh (offline)
                    </p>
                    <p className="text-sm leading-6 text-muted-foreground">
                      Quét mã QR do chi ủy cung cấp để điểm danh.
                    </p>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                      <Button
                        type="button"
                        className="gap-2"
                        onClick={() => setQrScannerOpen(true)}
                        disabled={checkInSubmitting}
                      >
                        <QrCode className="h-4 w-4" />
                        Quét QR
                      </Button>
                      {scannedQrId ? (
                        <p className="text-xs text-muted-foreground">
                          Đã quét: <span className="font-mono">{scannedQrId}</span>
                        </p>
                      ) : null}
                    </div>
                  </div>
                  {leaveRequestSection}
                </div>
              ) : (
                <div className="w-full space-y-4 rounded-lg border bg-muted/30 p-5">
                  <div className="rounded-lg border bg-background/80 p-4 text-base leading-7 text-muted-foreground">
                    Mẹo: Nhấn “Tham gia họp” để mở Google Meet (nếu là họp online).
                  </div>
                  {leaveRequestSection}
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 flex gap-3">
            <Button variant="outline" className="flex-1" onClick={onClose}>
              Đóng
            </Button>
            {event.isOnline && event.meetLink && (
              <Button className="flex-1" onClick={handleClickMeet}>
                Tham gia họp
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* QR Scanner Dialog */}
      <Dialog open={qrScannerOpen} onOpenChange={setQrScannerOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Quét mã QR</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="overflow-hidden rounded-lg border bg-black">
              <video
                id="qr-video"
                className="h-[320px] w-full object-cover"
                muted
                playsInline
              />
            </div>
            {qrScanError ? (
              <p className="text-sm text-destructive">{qrScanError}</p>
            ) : (
              <p className="text-sm text-muted-foreground">
                {scanning ? "Đang quét…" : "Đưa mã QR vào khung hình để quét."}
              </p>
            )}
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setQrScannerOpen(false)}
              >
                Đóng
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận xóa cuộc họp</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc chắn muốn xóa cuộc họp &quot;{event.title}&quot;? Hành
              động này không thể hoàn tác.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isSubmitting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isSubmitting ? "Đang xóa..." : "Xóa"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default EventDetailPopup;
