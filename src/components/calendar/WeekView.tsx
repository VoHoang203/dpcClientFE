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

interface WeekViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  onDateClick: (date: Date) => void;
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

const WeekView = ({
  currentDate,
  events,
  onDateClick,
  onEventClick,
}: WeekViewProps) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const startOfWeek = new Date(currentDate);
  const day = startOfWeek.getDay();
  const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
  startOfWeek.setDate(diff);
  startOfWeek.setHours(0, 0, 0, 0);

  const weekDays: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(startOfWeek);
    date.setDate(startOfWeek.getDate() + i);
    weekDays.push(date);
  }

  const weekdayNames = [
    "Thứ 2",
    "Thứ 3",
    "Thứ 4",
    "Thứ 5",
    "Thứ 6",
    "Thứ 7",
    "CN",
  ];
  const hours = Array.from({ length: 12 }, (_, i) => i + 7);

  const isToday = (date: Date) => {
    return date.getTime() === today.getTime();
  };

  const getEventsForDate = (date: Date) => {
    const dateStr = date.toISOString().split("T")[0];
    return events.filter((event) => event.date === dateStr);
  };

  const parseTime = (timeStr: string) => {
    const [hours] = timeStr.split(":").map(Number);
    return hours;
  };

  const getEventPosition = (event: CalendarEvent) => {
    const startHour = parseTime(event.startTime);
    const endHour = parseTime(event.endTime);
    const top = (startHour - 7) * 60;
    const height = (endHour - startHour) * 60;
    return { top, height: Math.max(height, 30) };
  };

  return (
    <div className="overflow-hidden rounded-lg border">
      <div className="grid grid-cols-8 border-b bg-muted/50">
        <div className="border-r py-3" />
        {weekDays.map((date, index) => (
          <div
            key={index}
            className={cn(
              "cursor-pointer border-r py-2 text-center last:border-r-0 hover:bg-muted/50",
              isToday(date) && "bg-primary/10"
            )}
            onClick={() => onDateClick(date)}
          >
            <div className={cn("text-sm", index === 6 && "text-destructive")}>
              {weekdayNames[index]}
            </div>
            <div
              className={cn(
                "mx-auto mt-1 flex h-9 w-9 items-center justify-center rounded-full text-lg font-semibold",
                isToday(date) && "bg-primary text-primary-foreground"
              )}
            >
              {date.getDate()}
            </div>
          </div>
        ))}
      </div>

      <div className="max-h-[600px] overflow-y-auto">
        <div className="grid grid-cols-8">
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

          {weekDays.map((date, dayIndex) => {
            const dayEvents = getEventsForDate(date);

            return (
              <div
                key={dayIndex}
                className={cn(
                  "relative border-r last:border-r-0",
                  isToday(date) && "bg-primary/5"
                )}
              >
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
                        "absolute left-0.5 right-0.5 overflow-hidden rounded px-1 py-0.5 text-left text-xs",
                        getEventColor(event.type)
                      )}
                      style={{ top: `${top}px`, height: `${height}px` }}
                    >
                      <div className="truncate font-medium">{event.title}</div>
                      <div className="opacity-80">
                        {event.startTime} - {event.endTime}
                      </div>
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default WeekView;
