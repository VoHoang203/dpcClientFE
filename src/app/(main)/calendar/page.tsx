"use client";

import { useCallback, useEffect, useState } from "react";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import CalendarHeader from "@/components/calendar/CalendarHeader";
import MonthView from "@/components/calendar/MonthView";
import WeekView from "@/components/calendar/WeekView";
import DayView from "@/components/calendar/DayView";
import EventDetailPopup from "@/components/calendar/EventDetailPopup";
import { meetingService, type MeetingItem } from "@/services/meetingService";
import { toast } from "sonner";

interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  type: "meeting" | "wedding" | "funeral" | "ceremony" | "celebration";
  description?: string;
  location?: string;
  isOnline?: boolean;
  meetLink?: string;
  note?: string;
}

const mockEvents: CalendarEvent[] = [
  {
    id: "1",
    title: "Họp Chi bộ định kỳ tháng 1",
    date: "2026-01-20",
    startTime: "14:00",
    endTime: "16:00",
    type: "meeting",
    isOnline: true,
    meetLink: "https://meet.google.com/abc-xyz-123",
    description:
      "Họp chi bộ định kỳ tháng 1/2025. Nội dung: Tổng kết công tác tháng 12, triển khai kế hoạch tháng 1.",
  },
  {
    id: "2",
    title: "Sinh hoạt chi bộ",
    date: "2026-01-16",
    startTime: "08:00",
    endTime: "10:00",
    type: "meeting",
    location: "Phòng họp A, Trụ sở Chi bộ",
    description: "Sinh hoạt chi bộ định kỳ.",
  },
  {
    id: "3",
    title: "Họp cấp ủy",
    date: "2026-01-16",
    startTime: "14:00",
    endTime: "16:00",
    type: "meeting",
    isOnline: true,
    meetLink: "https://meet.google.com/def-uvw-456",
  },
  {
    id: "4",
    title: "Họp triển khai công tác kết nạp Đảng viên",
    date: "2026-01-22",
    startTime: "09:00",
    endTime: "11:00",
    type: "ceremony",
    location: "Hội trường A",
    note: "Đề nghị các đồng chí chuẩn bị tài liệu liên quan.",
  },
  {
    id: "5",
    title: "Họp đánh giá cuối năm",
    date: "2026-01-25",
    startTime: "15:30",
    endTime: "17:30",
    type: "meeting",
    location: "Phòng họp lớn",
  },
  {
    id: "6",
    title: "Lễ kết nạp Đảng viên mới",
    date: "2026-01-28",
    startTime: "09:00",
    endTime: "11:00",
    type: "ceremony",
    location: "Hội trường A, 123 Nguyễn Trãi",
    note: "Trang phục lịch sự, đúng giờ.",
  },
  {
    id: "7",
    title: "Đám cưới đ/c Nguyễn Văn B",
    date: "2026-01-30",
    startTime: "11:00",
    endTime: "14:00",
    type: "wedding",
    location: "Trung tâm tiệc cưới ABC, 45 Cầu Giấy",
    note: "Mang theo phong bì chúc mừng. Xe xuất phát 10:00 tại trụ sở.",
  },
  {
    id: "8",
    title: "Lễ chúc mừng đ/c Phạm Văn E",
    date: "2026-02-05",
    startTime: "10:00",
    endTime: "11:30",
    type: "celebration",
    location: "Phòng họp Chi bộ",
    description: "Chúc mừng đ/c Phạm Văn E nhận Huy hiệu 30 năm tuổi Đảng.",
  },
];
const mapMeetingType = (type?: string): CalendarEvent["type"] => {
  switch (type) {
    case "PERIODIC":
      return "meeting";
    case "EVENT":
      return "celebration";
    case "CEREMONY":
      return "ceremony";
    case "CELEBRATION":
      return "celebration";
    case "WEDDING":
      return "wedding";
    case "FUNERAL":
      return "funeral";
    default:
      return "meeting";
  }
};

const extractStartTime = (meeting: MeetingItem) =>
  meeting.startTime ||
  (meeting as MeetingItem & { start_time?: string }).start_time;

const extractEndTime = (meeting: MeetingItem) =>
  meeting.endTime || (meeting as MeetingItem & { end_time?: string }).end_time;

const formatTime = (iso?: string | null) => {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
};

const formatDate = (iso?: string | null) => {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(date.getDate()).padStart(2, "0")}`;
};

const ensureEndTime = (start: string, end?: string | null) => {
  if (end) return end;
  const startDate = new Date(start);
  if (Number.isNaN(startDate.getTime())) return "";
  const next = new Date(startDate.getTime());
  next.setHours(next.getHours() + 2);
  return next.toISOString();
};

const ensureArray = (value: unknown): MeetingItem[] => {
  if (Array.isArray(value)) return value as MeetingItem[];
  if (value && typeof value === "object") {
    const record = value as {
      data?: unknown;
      items?: unknown;
      results?: unknown;
    };
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

const buildEvents = (items: unknown): CalendarEvent[] =>
  ensureArray(items)
    .map((meeting) => {
      const startTime = extractStartTime(meeting);
      if (!startTime) return null;
      const endTime = ensureEndTime(startTime, extractEndTime(meeting));
      return {
        id: meeting.id,
        title: meeting.title,
        date: formatDate(startTime),
        startTime: formatTime(startTime),
        endTime: formatTime(endTime),
        type: mapMeetingType(meeting.type),
        description: meeting.content ?? undefined,
        location: meeting.location ?? undefined,
        isOnline: Boolean(meeting.online_link),
        meetLink: meeting.online_link ?? undefined,
      } as CalendarEvent;
    })
    .filter((item): item is CalendarEvent => Boolean(item && item.date));

const buildEventKey = (event: CalendarEvent) =>
  `${event.date}_${event.startTime}_${event.endTime}`;

const CalendarSkeleton = () => (
  <div className="space-y-4">
    <div className="h-10 w-56 rounded-md bg-muted/60 animate-pulse" />
    <div className="grid grid-cols-7 gap-2">
      {Array.from({ length: 21 }).map((_, index) => (
        <div
          key={index}
          className="h-20 rounded-md bg-muted/40 animate-pulse"
        />
      ))}
    </div>
  </div>
);

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<"month" | "week" | "day">("month");
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [popupOpen, setPopupOpen] = useState(false);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadMeetings = useCallback(async () => {
    setIsLoading(true);
    try {
      const month = currentDate.getMonth() + 1;
      const year = currentDate.getFullYear();
      const data = await meetingService.listMeetings({ month, year });
      const apiEvents = buildEvents(data);
      const apiKeys = new Set(apiEvents.map(buildEventKey));
      const merged = [
        ...apiEvents,
        ...mockEvents.filter((event) => !apiKeys.has(buildEventKey(event))),
      ];
      setEvents(merged);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Không thể tải lịch họp";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }, [currentDate]);

  useEffect(() => {
    void loadMeetings();
  }, [loadMeetings]);

  const handlePrevious = () => {
    setCurrentDate((prev) => {
      const newDate = new Date(prev);
      if (view === "month") {
        newDate.setMonth(prev.getMonth() - 1);
      } else if (view === "week") {
        newDate.setDate(prev.getDate() - 7);
      } else {
        newDate.setDate(prev.getDate() - 1);
      }
      return newDate;
    });
  };

  const handleNext = () => {
    setCurrentDate((prev) => {
      const newDate = new Date(prev);
      if (view === "month") {
        newDate.setMonth(prev.getMonth() + 1);
      } else if (view === "week") {
        newDate.setDate(prev.getDate() + 7);
      } else {
        newDate.setDate(prev.getDate() + 1);
      }
      return newDate;
    });
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const handleDateClick = (date: Date) => {
    setCurrentDate(date);
    setView("day");
  };

  const handleEventClick = (eventId: string) => {
    const event = events.find((e) => e.id === eventId);
    if (event) {
      setSelectedEvent(event);
      setPopupOpen(true);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-6">
      <Header />
      <main className="mx-auto max-w-7xl px-4 py-6">
        <CalendarHeader
          currentDate={currentDate}
          view={view}
          onViewChange={setView}
          onPrevious={handlePrevious}
          onNext={handleNext}
          onToday={handleToday}
        />

        {isLoading ? (
          <CalendarSkeleton />
        ) : (
          <>
            {view === "month" && (
              <MonthView
                currentDate={currentDate}
                events={events}
                onDateClick={handleDateClick}
                onEventClick={handleEventClick}
              />
            )}

            {view === "week" && (
              <WeekView
                currentDate={currentDate}
                events={events}
                onDateClick={handleDateClick}
                onEventClick={handleEventClick}
              />
            )}

            {view === "day" && (
              <DayView
                currentDate={currentDate}
                events={events}
                onEventClick={handleEventClick}
              />
            )}
          </>
        )}
      </main>
      <BottomNav />

      <EventDetailPopup
        event={selectedEvent}
        open={popupOpen}
        onClose={() => setPopupOpen(false)}
      />
    </div>
  );
}
