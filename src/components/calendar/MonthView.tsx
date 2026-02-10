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

interface MonthViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  onDateClick: (date: Date) => void;
  onEventClick?: (eventId: string) => void;
}

const getEventColor = (type: CalendarEvent["type"]) => {
  switch (type) {
    case "meeting":
      return "bg-primary text-primary-foreground";
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
    const dateStr = date.toISOString().split("T")[0];
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

          const dayEvents = getEventsForDate(date);
          const showEvents = dayEvents.slice(0, 2);
          const moreCount = dayEvents.length - 2;

          return (
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
                      "block w-full truncate rounded px-1.5 py-0.5 text-left text-xs",
                      getEventColor(event.type)
                    )}
                  >
                    <span className="font-medium">{event.startTime}</span>{" "}
                    {event.title}
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
        })}
      </div>
    </div>
  );
};

export default MonthView;
