"use client";

import { useCallback, useEffect, useState } from "react";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import CalendarHeader from "@/components/calendar/CalendarHeader";
import MonthView from "@/components/calendar/MonthView";
import WeekView from "@/components/calendar/WeekView";
import DayView from "@/components/calendar/DayView";
import EventDetailPopup, {
  type CalendarEvent,
} from "@/components/calendar/EventDetailPopup";
import {
  meetingService,
  type MeetingItem,
  type MeetingType,
} from "@/services/meetingService";
import { toast } from "sonner";

// Maps DB meeting type to calendar event type for display
const mapMeetingType = (type?: string): CalendarEvent["type"] => {
  switch (type) {
    case "PERIODIC":
    case "EXTRAORDINARY":
      return "meeting";
    case "EVENT":
    case "CELEBRATION":
      return "celebration";
    case "CEREMONY":
      return "ceremony";
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
  return date.toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
  });
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
        originalType: meeting.type as MeetingType,
      } as CalendarEvent;
    })
    .filter((item): item is CalendarEvent => Boolean(item && item.date));

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
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(
    null
  );
  const [popupOpen, setPopupOpen] = useState(false);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadMeetings = useCallback(async () => {
    setIsLoading(true);
    try {
      // Load all meetings from Neon DB via API
      const data = await meetingService.listMeetings();
      const apiEvents = buildEvents(data);
      setEvents(apiEvents);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Không thể tải lịch họp";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

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

  const handleEventUpdate = () => {
    // Reload meetings after update
    void loadMeetings();
  };

  const handleEventDelete = () => {
    // Reload meetings after delete
    void loadMeetings();
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
        onUpdate={handleEventUpdate}
        onDelete={handleEventDelete}
      />
    </div>
  );
}
