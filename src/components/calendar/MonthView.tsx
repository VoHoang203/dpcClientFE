"use client";

import { Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { MEETING_TYPE_LABELS_VI } from "@/lib/meetingTypeUi";
import type { MeetingType } from "@/types/meeting";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";

interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  type: "meeting" | "wedding" | "funeral" | "ceremony" | "celebration";
  format?: "OFFLINE" | "ONLINE";
  isOnline?: boolean;
  /** Từ API — họp định kỳ hiển thị ngôi sao vàng trên thanh lịch. */
  originalType?: MeetingType;
}

interface MonthViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  onDateClick: (date: Date) => void;
  onEventClick?: (eventId: string) => void;
}

const getEventColor = (event: CalendarEvent) => {
  if (event.format === "ONLINE" || event.isOnline) {
    return "bg-sky-500 text-white";
  }
  if (event.format === "OFFLINE") {
    return "bg-red-500 text-white";
  }
  switch (event.type) {
    case "meeting":
      return "bg-red-500 text-white";
    case "ceremony":
      return "bg-secondary text-secondary-foreground";
    case "wedding":
      return "bg-pink-500 text-white";
    case "funeral":
      return "bg-gray-600 text-white";
    case "celebration":
      return "bg-amber-500 text-white";
    default:
      return "bg-muted text-muted-foreground";
  }
};

const getEventDotColor = (event: CalendarEvent) => {
  if (event.format === "ONLINE" || event.isOnline) return "bg-sky-500";
  if (event.format === "OFFLINE") return "bg-red-500";
  return event.type === "meeting" ? "bg-red-500" : "bg-muted-foreground";
};

const toLocalDateKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;

const formatHoverDate = (date: Date) =>
  date.toLocaleDateString("vi-VN", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

const MonthView = ({
  currentDate,
  events,
  onDateClick,
  onEventClick,
}: MonthViewProps) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);

  let startDay = firstDayOfMonth.getDay();
  startDay = startDay === 0 ? 6 : startDay - 1;

  const calendarDays: (Date | null)[] = [];

  for (let i = startDay - 1; i >= 0; i--) {
    const prevDate = new Date(year, month, -i);
    calendarDays.push(prevDate);
  }

  for (let i = 1; i <= lastDayOfMonth.getDate(); i++) {
    calendarDays.push(new Date(year, month, i));
  }

  const remainingDays = 42 - calendarDays.length;
  for (let i = 1; i <= remainingDays; i++) {
    calendarDays.push(new Date(year, month + 1, i));
  }

  const weekdays = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

  const getEventsForDate = (date: Date) => {
    const dateStr = toLocalDateKey(date);
    return events.filter((event) => event.date === dateStr);
  };

  const isToday = (date: Date) => {
    return date.getTime() === today.getTime();
  };

  const isCurrentMonth = (date: Date) => {
    return date.getMonth() === month;
  };

  const isSunday = (date: Date) => {
    return date.getDay() === 0;
  };

  return (
    <div className="overflow-hidden rounded-lg border">
      <div className="grid grid-cols-7 border-b bg-muted/50">
        {weekdays.map((day, index) => (
          <div
            key={day}
            className={cn(
              "border-r py-3 text-center text-sm font-medium last:border-r-0",
              index === 6 && "text-destructive"
            )}
          >
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {calendarDays.map((date, index) => {
          if (!date) return <div key={index} className="border-b border-r" />;

          const dayEvents = getEventsForDate(date).sort((a, b) =>
            `${a.startTime}-${a.title}`.localeCompare(`${b.startTime}-${b.title}`, "vi")
          );
          const showEvents = dayEvents.slice(0, 2);
          const moreCount = dayEvents.length - 2;
          const dayCell = (
            <div
              key={index}
              className={cn(
                "min-h-[100px] cursor-pointer border-b border-r p-1 transition-colors last:border-r-0 hover:bg-muted/30 md:min-h-[120px]",
                !isCurrentMonth(date) && "bg-muted/20",
                isToday(date) && "bg-primary/5"
              )}
              onClick={() => onDateClick(date)}
            >
              <div className="flex justify-start p-1">
                <span
                  className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-full text-sm",
                    isToday(date) && "bg-primary font-bold text-primary-foreground",
                    !isToday(date) &&
                      !isCurrentMonth(date) &&
                      "text-muted-foreground",
                    !isToday(date) &&
                      isSunday(date) &&
                      isCurrentMonth(date) &&
                      "text-destructive"
                  )}
                >
                  {date.getDate()}
                </span>
              </div>

              <div className="mt-1 space-y-0.5">
                {showEvents.map((event) => (
                  <button
                    key={event.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      onEventClick?.(event.id);
                    }}
                    className={cn(
                      "flex w-full max-w-full items-center gap-0.5 truncate rounded px-1.5 py-0.5 text-left text-xs",
                      getEventColor(event)
                    )}
                  >
                    {event.originalType === "PERIODIC" ? (
                      <Star
                        className="h-3 w-3 shrink-0 fill-amber-400 text-amber-500 drop-shadow-sm"
                        aria-hidden
                      />
                    ) : null}
                    <span className="min-w-0 truncate">
                      <span className="font-medium">{event.startTime}</span>{" "}
                      {event.title}
                    </span>
                  </button>
                ))}
                {moreCount > 0 && (
                  <div className="px-1.5 text-xs text-muted-foreground">
                    +{moreCount} khác
                  </div>
                )}
              </div>
            </div>
          );

          if (dayEvents.length === 0) return dayCell;

          return (
            <HoverCard key={index} openDelay={120} closeDelay={80}>
              <HoverCardTrigger asChild>{dayCell}</HoverCardTrigger>
              <HoverCardContent align="start" className="w-80 p-3">
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-semibold capitalize">
                      {formatHoverDate(date)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {dayEvents.length} cuộc họp
                    </p>
                  </div>
                  <div className="max-h-72 space-y-2 overflow-y-auto">
                    {dayEvents.map((event) => (
                      <button
                        key={event.id}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEventClick?.(event.id);
                        }}
                        className="flex w-full items-start gap-2 rounded-md border p-2 text-left transition-colors hover:bg-muted"
                      >
                        <span
                          className={cn(
                            "mt-1 h-2.5 w-2.5 shrink-0 rounded-full",
                            getEventDotColor(event)
                          )}
                        />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{event.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {event.startTime} - {event.endTime || "--:--"}
                          </p>
                          {event.originalType ? (
                            <p className="text-xs font-medium text-foreground/90">
                              {MEETING_TYPE_LABELS_VI[event.originalType]}
                            </p>
                          ) : null}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </HoverCardContent>
            </HoverCard>
          );
        })}
      </div>
    </div>
  );
};

export default MonthView;
