"use client";

import { Download, Calendar, Clock, MapPin, Video, FileText } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

type EventType = "meeting" | "wedding" | "funeral" | "ceremony" | "celebration";

interface CalendarEvent {
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
}

interface EventDetailPopupProps {
  event: CalendarEvent | null;
  open: boolean;
  onClose: () => void;
}

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

const EventDetailPopup = ({ event, open, onClose }: EventDetailPopupProps) => {
  if (!event) return null;

  const { label: typeLabel, color: typeColor } = getEventTypeInfo(event.type);

  const mockFiles = [
    { name: "Nội dung cuộc họp.docx", size: "245 KB", url: "#" },
    { name: "Tài liệu tham khảo.pdf", size: "1.2 MB", url: "#" },
  ];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <Badge className={typeColor}>{typeLabel}</Badge>
              <DialogTitle className="mt-2 text-xl">{event.title}</DialogTitle>
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
            <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3">
              <p className="text-sm font-medium text-yellow-800">Lưu ý</p>
              <p className="text-sm text-yellow-700">{event.note}</p>
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
              <a href={event.meetLink} target="_blank" rel="noopener noreferrer">
                Tham gia họp
              </a>
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EventDetailPopup;
