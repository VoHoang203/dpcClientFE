"use client";

import { useMemo } from "react";
import useSWR from "swr";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";
import {
  Bell,
  UserPlus,
  ClipboardCheck,
  CreditCard,
  Calendar,
  Loader2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { inferNotificationRoleKey } from "@/lib/inferNotificationRole";

type NeonNotification = {
  id: string;
  title: string;
  body: string | null;
  type: string;
  admissionId: string | null;
  isRead: boolean;
  createdAt: string;
};

type NotificationsResponse = {
  items: NeonNotification[];
  unreadCount: number;
};

const fetcher = async (url: string): Promise<NotificationsResponse> => {
  const res = await fetch(url);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      typeof err?.message === "string" ? err.message : "Không tải được thông báo"
    );
  }
  return res.json();
};

const typeConfig = {
  admission: { icon: UserPlus, color: "text-blue-600", bg: "bg-blue-50" },
  assessment: { icon: ClipboardCheck, color: "text-green-600", bg: "bg-green-50" },
  fee: { icon: CreditCard, color: "text-purple-600", bg: "bg-purple-50" },
  meeting: { icon: Calendar, color: "text-primary", bg: "bg-accent" },
};

function iconForType(t: string) {
  if (t in typeConfig) return typeConfig[t as keyof typeof typeConfig];
  return typeConfig.admission;
}

const NotificationDropdown = () => {
  const { user } = useAuth();
  const roleKey = useMemo(() => inferNotificationRoleKey(user), [user]);

  const { data, error, isLoading, mutate } = useSWR<NotificationsResponse>(
    roleKey ? `/api/notifications?role=${encodeURIComponent(roleKey)}` : null,
    fetcher,
    { refreshInterval: 3000, revalidateOnFocus: true, dedupingInterval: 2000 }
  );

  const items = data?.items ?? [];
  const unreadCount = data?.unreadCount ?? 0;

  const markRead = async (id: string) => {
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [id] }),
      });
      await mutate();
    } catch {
      /* ignore */
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={buttonVariants({
          variant: "ghost",
          size: "icon",
          className: "relative",
        })}
        type="button"
      >
        <Bell className="h-5 w-5 text-muted-foreground" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
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
          {!roleKey && (
            <p className="p-3 text-xs text-muted-foreground">
              Đăng nhập tài khoản có chức danh map được (Chi ủy / Phó Bí thư / Bí
              thư / QCUT) để poll thông báo từ Neon mỗi 5 giây.
            </p>
          )}
          {roleKey && isLoading && !data && (
            <div className="flex justify-center py-6">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}
          {roleKey && error && (
            <p className="p-3 text-xs text-destructive">
              {error.message} — kiểm tra DATABASE_URL và đã chạy script SQL trên
              Neon.
            </p>
          )}
          {roleKey &&
            !error &&
            items.map((notification) => {
              const config = iconForType(notification.type);
              const Icon = config.icon;
              const timeLabel = (() => {
                const t = new Date(notification.createdAt);
                if (Number.isNaN(t.getTime())) return "";
                return formatDistanceToNow(t, { addSuffix: true, locale: vi });
              })();
              return (
                <DropdownMenuItem
                  key={notification.id}
                  className="flex cursor-pointer items-start gap-3 p-3 focus:bg-muted"
                  onSelect={(e) => e.preventDefault()}
                  onClick={() => {
                    if (!notification.isRead) void markRead(notification.id);
                  }}
                >
                  <div
                    className={`mt-0.5 shrink-0 rounded-lg p-2 ${config.bg} ${config.color}`}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-medium">
                        {notification.title}
                      </p>
                      {!notification.isRead && (
                        <span className="h-2 w-2 shrink-0 rounded-full bg-primary" />
                      )}
                    </div>
                    {notification.body && (
                      <p className="line-clamp-2 text-xs text-muted-foreground">
                        {notification.body}
                      </p>
                    )}
                    <p className="mt-1 text-xs text-muted-foreground">
                      {timeLabel}
                    </p>
                  </div>
                </DropdownMenuItem>
              );
            })}
          {roleKey && !error && !isLoading && items.length === 0 && (
            <p className="p-3 text-xs text-muted-foreground">
              Chưa có thông báo cho role này.
            </p>
          )}
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
