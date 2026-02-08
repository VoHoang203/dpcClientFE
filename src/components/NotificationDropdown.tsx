"use client";

import { Bell, UserPlus, ClipboardCheck, CreditCard, Calendar } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface Notification {
  id: string;
  type: "admission" | "assessment" | "fee" | "meeting";
  title: string;
  description: string;
  time: string;
  read: boolean;
}

const mockNotifications: Notification[] = [
  {
    id: "1",
    type: "meeting",
    title: "Họp Chi bộ tháng 2",
    description: "Cuộc họp sẽ diễn ra vào 14:00 ngày 15/02/2026",
    time: "2 giờ trước",
    read: false,
  },
  {
    id: "2",
    type: "admission",
    title: "Kết nạp trực tuyến",
    description: "Hồ sơ kết nạp của Trần Văn B đã được gửi",
    time: "5 giờ trước",
    read: false,
  },
  {
    id: "3",
    type: "assessment",
    title: "Xác nhận tự đánh giá",
    description: "Chi ủy đã xác nhận kết quả tự đánh giá Q4/2025",
    time: "1 ngày trước",
    read: false,
  },
  {
    id: "4",
    type: "fee",
    title: "Nhắc nộp đảng phí",
    description: "Đảng phí tháng 2/2026 chưa được nộp",
    time: "2 ngày trước",
    read: true,
  },
];

const typeConfig = {
  admission: { icon: UserPlus, color: "text-blue-600", bg: "bg-blue-50" },
  assessment: { icon: ClipboardCheck, color: "text-green-600", bg: "bg-green-50" },
  fee: { icon: CreditCard, color: "text-purple-600", bg: "bg-purple-50" },
  meeting: { icon: Calendar, color: "text-primary", bg: "bg-accent" },
};

const NotificationDropdown = () => {
  const unreadCount = mockNotifications.filter((n) => !n.read).length;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5 text-muted-foreground" />
          {unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
              {unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Thông báo</span>
          {unreadCount > 0 && (
            <Badge variant="secondary" className="text-xs">
              {unreadCount} mới
            </Badge>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <div className="max-h-80 overflow-y-auto">
          {mockNotifications.map((notification) => {
            const config = typeConfig[notification.type];
            const Icon = config.icon;
            return (
              <DropdownMenuItem
                key={notification.id}
                className="flex cursor-pointer items-start gap-3 p-3 focus:bg-muted"
              >
                <div
                  className={`shrink-0 rounded-lg p-2 ${config.bg} ${config.color} mt-0.5`}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-medium">
                      {notification.title}
                    </p>
                    {!notification.read && (
                      <span className="h-2 w-2 shrink-0 rounded-full bg-primary" />
                    )}
                  </div>
                  <p className="line-clamp-2 text-xs text-muted-foreground">
                    {notification.description}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {notification.time}
                  </p>
                </div>
              </DropdownMenuItem>
            );
          })}
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="cursor-pointer justify-center font-medium text-primary">
          Xem tất cả thông báo
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default NotificationDropdown;
