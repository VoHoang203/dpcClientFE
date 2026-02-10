"use client";

import { cn } from "@/lib/utils";

interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  type: "meeting" | "wedding" | "funeral" | "ceremony" | "celebration";
}

interface DayViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  onEventClick?: (eventId: string) => void;
}

const getEventColor = (type: CalendarEvent["type"]) => {
  switch (type) {
    case "meeting":
      return "bg-primary/90 text-primary-foreground border-l-4 border-primary";
    case "ceremony":
      return "bg-secondary/90 text-secondary-foreground border-l-4 border-secondary";
    case "wedding":
      return "bg-pink-100 text-pink-800 border-l-4 border-pink-500";
    case "funeral":
      return "bg-gray-100 text-gray-800 border-l-4 border-gray-600";
    case "celebration":
      return "bg-amber-100 text-amber-800 border-l-4 border-amber-500";
    default:
      return "bg-muted text-muted-foreground border-l-4 border-muted-foreground";
  }
};

const DayView = ({ currentDate, events, onEventClick }: DayViewProps) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const currentDateNormalized = new Date(currentDate);
  currentDateNormalized.setHours(0, 0, 0, 0);

  const isToday = currentDateNormalized.getTime() === today.getTime();

  const weekdays = [
    "Chủ Nhật",
    "Thứ Hai",
    "Thứ Ba",
    "Thứ Tư",
    "Thứ Năm",
    "Thứ Sáu",
    "Thứ Bảy",
  ];
  const hours = Array.from({ length: 12 }, (_, i) => i + 7);

  const dateStr = currentDate.toISOString().split("T")[0];
  const dayEvents = events.filter((event) => event.date === dateStr);

  const parseTime = (timeStr: string) => {
    const [hours] = timeStr.split(":").map(Number);
    return hours;
  };

  const getEventPosition = (event: CalendarEvent) => {
    const startHour = parseTime(event.startTime);
    const endHour = parseTime(event.endTime);
    const top = (startHour - 7) * 60;
    const height = (endHour - startHour) * 60;
    return { top, height: Math.max(height, 40) };
  };

  return (
    <div className="overflow-hidden rounded-lg border">
      <div className="border-b bg-muted/50 p-4">
        <div
          className={cn(
            "inline-flex items-center gap-3 rounded-full px-4 py-2",
            isToday && "bg-primary text-primary-foreground"
          )}
        >
          <span className="text-2xl font-bold">{currentDate.getDate()}</span>
          <span className="text-sm">{weekdays[currentDate.getDay()]}</span>
        </div>
      </div>

      <div className="max-h-[600px] overflow-y-auto">
        <div className="grid grid-cols-[60px_1fr]">
          <div className="border-r">
            {hours.map((hour) => (
              <div
                key={hour}
                className="h-[60px] border-b pr-2 pt-1 text-right text-xs text-muted-foreground"
              >
                {String(hour).padStart(2, "0")}:00
              </div>
            ))}
          </div>

          <div className={cn("relative", isToday && "bg-primary/5")}>
            {hours.map((hour) => (
              <div
                key={hour}
                className="h-[60px] border-b border-dashed border-muted"
              />
            ))}

            {dayEvents.map((event) => {
              const { top, height } = getEventPosition(event);
              return (
                <button
                  key={event.id}
                  onClick={() => onEventClick?.(event.id)}
                  className={cn(
                    "absolute left-2 right-2 overflow-hidden rounded-lg px-3 py-2 text-left shadow-sm transition-shadow hover:shadow-md",
                    getEventColor(event.type)
                  )}
                  style={{ top: `${top}px`, height: `${height}px` }}
                >
                  <div className="font-semibold">{event.title}</div>
                  <div className="text-sm opacity-80">
                    {event.startTime} - {event.endTime}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DayView;
