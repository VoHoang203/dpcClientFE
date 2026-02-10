"use client";

import { useState } from "react";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import CalendarHeader from "@/components/calendar/CalendarHeader";
import MonthView from "@/components/calendar/MonthView";
import WeekView from "@/components/calendar/WeekView";
import DayView from "@/components/calendar/DayView";
import EventDetailPopup from "@/components/calendar/EventDetailPopup";

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

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date(2026, 0, 26));
  const [view, setView] = useState<"month" | "week" | "day">("month");
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [popupOpen, setPopupOpen] = useState(false);

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
    setCurrentDate(new Date(2026, 0, 26));
  };

  const handleDateClick = (date: Date) => {
    setCurrentDate(date);
    setView("day");
  };

  const handleEventClick = (eventId: string) => {
    const event = mockEvents.find((e) => e.id === eventId);
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

        {view === "month" && (
          <MonthView
            currentDate={currentDate}
            events={mockEvents}
            onDateClick={handleDateClick}
            onEventClick={handleEventClick}
          />
        )}

        {view === "week" && (
          <WeekView
            currentDate={currentDate}
            events={mockEvents}
            onDateClick={handleDateClick}
            onEventClick={handleEventClick}
          />
        )}

        {view === "day" && (
          <DayView
            currentDate={currentDate}
            events={mockEvents}
            onEventClick={handleEventClick}
          />
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
