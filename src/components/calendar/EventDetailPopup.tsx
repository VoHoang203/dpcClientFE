"use client";

import { useState } from "react";
import {
  Download,
  Calendar,
  Clock,
  MapPin,
  Video,
  FileText,
  Edit2,
  Trash2,
  X,
} from "lucide-react";
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
  type UpdateMeetingPayload,
} from "@/services/meetingService";
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
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
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

  if (!event) return null;

  const { label: typeLabel, color: typeColor } = getEventTypeInfo(event.type);

  const mockFiles = [
    { name: "Nội dung cuộc họp.docx", size: "245 KB", url: "#" },
    { name: "Tài liệu tham khảo.pdf", size: "1.2 MB", url: "#" },
  ];

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
        onlineLink: formData.isOnline ? formData.meetLink.trim() : undefined,
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

  // Edit mode view
  if (isEditing) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
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
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <Badge className={typeColor}>{typeLabel}</Badge>
                <DialogTitle className="mt-2 text-xl">{event.title}</DialogTitle>
              </div>
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
            </div>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex items-center gap-3 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>
                {new Date(event.date).toLocaleDateString("vi-VN", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span>
                {event.startTime} - {event.endTime}
              </span>
            </div>

            {event.isOnline ? (
              <div className="flex items-center gap-3 text-sm">
                <Video className="h-4 w-4 text-muted-foreground" />
                <div>
                  <span>Họp online - Google Meet</span>
                  {event.meetLink && (
                    <a
                      href={event.meetLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 block text-primary hover:underline"
                    >
                      {event.meetLink}
                    </a>
                  )}
                </div>
              </div>
            ) : (
              event.location && (
                <div className="flex items-center gap-3 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>{event.location}</span>
                </div>
              )
            )}

            {event.description && (
              <>
                <Separator />
                <div>
                  <p className="mb-1 text-sm font-medium">Mô tả</p>
                  <p className="text-sm text-muted-foreground">
                    {event.description}
                  </p>
                </div>
              </>
            )}

            {event.note && (
              <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3 dark:border-yellow-800 dark:bg-yellow-900/20">
                <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                  Lưu ý
                </p>
                <p className="text-sm text-yellow-700 dark:text-yellow-300">
                  {event.note}
                </p>
              </div>
            )}

            {event.type === "meeting" && (
              <>
                <Separator />
                <div>
                  <p className="mb-2 flex items-center gap-2 text-sm font-medium">
                    <FileText className="h-4 w-4" />
                    Tài liệu đính kèm
                  </p>
                  <div className="space-y-2">
                    {mockFiles.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between rounded-lg bg-muted/50 p-2"
                      >
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-sm font-medium">{file.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {file.size}
                            </p>
                          </div>
                        </div>
                        <Button size="sm" variant="ghost" className="gap-1">
                          <Download className="h-4 w-4" />
                          Tải
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="mt-4 flex gap-3">
            <Button variant="outline" className="flex-1" onClick={onClose}>
              Đóng
            </Button>
            {event.isOnline && event.meetLink && (
              <Button className="flex-1" asChild>
                <a
                  href={event.meetLink}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Tham gia họp
                </a>
              </Button>
            )}
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
