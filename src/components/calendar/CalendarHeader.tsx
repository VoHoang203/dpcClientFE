"use client";

import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface CalendarHeaderProps {
  currentDate: Date;
  view: "month" | "week" | "day";
  onViewChange: (view: "month" | "week" | "day") => void;
  onPrevious: () => void;
  onNext: () => void;
  onToday: () => void;
}

const formatHeaderDate = (date: Date, view: "month" | "week" | "day") => {
  const months = [
    "Tháng 01",
    "Tháng 02",
    "Tháng 03",
    "Tháng 04",
    "Tháng 05",
    "Tháng 06",
    "Tháng 07",
    "Tháng 08",
    "Tháng 09",
    "Tháng 10",
    "Tháng 11",
    "Tháng 12",
  ];
  const weekdays = [
    "Chủ Nhật",
    "Thứ Hai",
    "Thứ Ba",
    "Thứ Tư",
    "Thứ Năm",
    "Thứ Sáu",
    "Thứ Bảy",
  ];

  if (view === "month") {
    return `${months[date.getMonth()]} ${date.getFullYear()}`;
  } else if (view === "week") {
    const startOfWeek = new Date(date);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
    startOfWeek.setDate(diff);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);

    const formatDate = (d: Date) =>
      `${String(d.getDate()).padStart(2, "0")}/${String(
        d.getMonth() + 1
      ).padStart(2, "0")}`;
    return `${formatDate(startOfWeek)} - ${formatDate(endOfWeek)}/${endOfWeek.getFullYear()}`;
  } else {
    return `${weekdays[date.getDay()]}, ${String(date.getDate()).padStart(
      2,
      "0"
    )} ${months[date.getMonth()]} ${date.getFullYear()}`;
  }
};

const CalendarHeader = ({
  currentDate,
  view,
  onViewChange,
  onPrevious,
  onNext,
  onToday,
}: CalendarHeaderProps) => {
  return (
    <div className="mb-6 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={onToday}>
          Hôm nay
        </Button>
        <Button variant="ghost" size="icon" onClick={onPrevious}>
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <Button variant="ghost" size="icon" onClick={onNext}>
          <ChevronRight className="h-5 w-5" />
        </Button>
        <h2 className="ml-2 text-lg font-semibold">
          {formatHeaderDate(currentDate, view)}
        </h2>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex overflow-hidden rounded-lg border">
          <Button
            variant={view === "month" ? "default" : "ghost"}
            size="sm"
            className="rounded-none"
            onClick={() => onViewChange("month")}
          >
            Tháng
          </Button>
          <Button
            variant={view === "week" ? "default" : "ghost"}
            size="sm"
            className="rounded-none border-x"
            onClick={() => onViewChange("week")}
          >
            Tuần
          </Button>
          <Button
            variant={view === "day" ? "default" : "ghost"}
            size="sm"
            className="rounded-none"
            onClick={() => onViewChange("day")}
          >
            Ngày
          </Button>
        </div>
        <Button asChild className="gap-2">
          <Link href="/schedule-meeting">
            <Plus className="h-4 w-4" />
            Tạo cuộc họp
          </Link>
        </Button>
      </div>
    </div>
  );
};

export default CalendarHeader;
