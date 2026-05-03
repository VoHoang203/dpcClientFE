"use client";

import { useMemo, useState, useCallback } from "react";
import useSWR from "swr";
import useSWRInfinite from "swr/infinite";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";
import DOMPurify from "dompurify";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import httpService from "@/lib/http";
import {
  unwrapApiList,
  unwrapApiEntity,
  unwrapMyPendingData,
  unwrapPaginatedItems,
  type PaginationMeta,
} from "@/lib/helpers";

/** Bản ghi thông báo — field có thể khác tên tùy BE. */
type NotificationItem = {
  id: string;
  title?: string;
  subject?: string;
  body?: string | null;
  content?: string | null;
  message?: string | null;
  type?: string;
  isRead?: boolean;
  createdAt?: string;
  created_at?: string;
};

type NotificationDetail = NotificationItem & {
  // BE có thể trả thêm field khác, nhưng dropdown chỉ cần vài field phổ biến.
  [k: string]: unknown;
};

const LIST_LIMIT = 20;

type NotificationPageResult = {
  items: NotificationItem[];
  meta: PaginationMeta | null;
};

function parseNotificationItems(raw: unknown): NotificationItem[] {
  const paginated = unwrapPaginatedItems<NotificationItem>(raw);
  if (paginated.items.length) return paginated.items;
  const pending = unwrapMyPendingData(raw);
  if (pending.items.length) return pending.items as NotificationItem[];
  return unwrapApiList<NotificationItem>(raw);
}

/** Lấy tổng bản ghi (phân trang) từ envelope BE. */
function parseTotalCount(raw: unknown): number | undefined {
  if (raw == null || typeof raw !== "object") return undefined;
  const o = raw as Record<string, unknown>;
  const inner =
    o.data !== undefined && typeof o.data === "object"
      ? (o.data as Record<string, unknown>)
      : o;
  if (typeof inner.total === "number") return inner.total;
  if (typeof inner.totalItems === "number") return inner.totalItems;
  const meta = inner.meta;
  if (meta && typeof meta === "object") {
    const m = meta as Record<string, unknown>;
    if (typeof m.totalItems === "number") return m.totalItems;
  }
  return undefined;
}

function displayTitle(n: NotificationItem): string {
  return (n.title ?? n.subject ?? "Thông báo").trim() || "Thông báo";
}

function displayBody(n: NotificationItem): string | null {
  const t = n.body ?? n.content ?? n.message ?? null;
  if (t == null) return null;
  const s = String(t).trim();
  return s.length ? s : null;
}

function stripHtmlToPreview(html: string): string {
  return html
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function displayCreatedAt(n: NotificationItem): string {
  return (n.createdAt ?? n.created_at ?? "").trim();
}

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
  const canFetch = Boolean(user);

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detail, setDetail] = useState<NotificationDetail | null>(null);

  const unreadKey = canFetch
    ? (["notifications", "unread-total", 1, 1] as const)
    : null;

  const getNotificationListKey = useCallback(
    (pageIndex: number, previousPageData: NotificationPageResult | null) => {
      if (!canFetch) return null;
      if (previousPageData) {
        if (previousPageData.items.length === 0) return null;
        const m = previousPageData.meta;
        if (m && m.totalPages > 0 && m.currentPage >= m.totalPages) {
          return null;
        }
        if ((!m || m.totalPages === 0) && previousPageData.items.length < LIST_LIMIT) {
          return null;
        }
      }
      return ["notifications", "list", pageIndex + 1, LIST_LIMIT] as const;
    },
    [canFetch]
  );

  const fetchNotificationPage = useCallback(
    async ([, , page]: readonly [string, string, number, number]): Promise<NotificationPageResult> => {
      const res = await httpService.get<unknown>("/notifications", {
        params: { page, limit: LIST_LIMIT },
      });
      const raw = res.data;
      const { items, meta } = unwrapPaginatedItems<NotificationItem>(raw);
      const finalItems = items.length ? items : parseNotificationItems(raw);
      return { items: finalItems, meta };
    },
    []
  );

  const {
    data: listPages,
    error,
    isLoading,
    isValidating,
    size,
    setSize,
    mutate: mutateList,
  } = useSWRInfinite(getNotificationListKey, fetchNotificationPage, {
    refreshInterval: 30000,
    revalidateOnFocus: true,
    dedupingInterval: 5000,
  });

  const items = useMemo(
    () => listPages?.flatMap((p) => p.items) ?? [],
    [listPages]
  );

  const hasMore = useMemo(() => {
    if (!listPages?.length) return false;
    const last = listPages[listPages.length - 1];
    if (!last.items.length) return false;
    const m = last.meta;
    if (m && m.totalPages > 0) {
      return m.currentPage < m.totalPages;
    }
    return last.items.length >= LIST_LIMIT;
  }, [listPages]);

  const loadingMore =
    isValidating &&
    (listPages?.length ?? 0) > 0 &&
    size > (listPages?.length ?? 0);

  const { data: unreadTotal, mutate: mutateUnread } = useSWR(
    unreadKey,
    async () => {
      const res = await httpService.get<unknown>("/notifications", {
        params: { page: 1, limit: 1, isRead: false },
      });
      const total = parseTotalCount(res.data);
      if (typeof total === "number") return total;
      const onlyUnread = parseNotificationItems(res.data);
      return onlyUnread.filter((n) => n.isRead === false).length;
    },
    { refreshInterval: 30000, revalidateOnFocus: true, dedupingInterval: 5000 }
  );

  const unreadCount = useMemo(() => {
    if (typeof unreadTotal === "number") return unreadTotal;
    return items.filter((n) => n.isRead === false).length;
  }, [unreadTotal, items]);

  const handleOpenNotification = async (id: string) => {
    try {
      setDetailOpen(true);
      setDetailLoading(true);
      setDetail(null);

      // BE: GET /notifications/{id} — “tự động đánh dấu đã đọc”
      const res = await httpService.get<unknown>(
        `/notifications/${encodeURIComponent(id)}`
      );
      const entity = unwrapApiEntity<NotificationDetail>(res.data);
      setDetail(entity ?? null);

      await Promise.all([mutateList(), mutateUnread()]);
    } catch {
      /* ignore */
    } finally {
      setDetailLoading(false);
    }
  };

  return (
    <>
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
            {!canFetch && (
              <p className="p-3 text-xs text-muted-foreground">
                Đăng nhập để xem thông báo.
              </p>
            )}
            {canFetch && isLoading && !items.length && (
              <div className="flex justify-center py-6">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            )}
            {canFetch && error && (
              <p className="p-3 text-xs text-destructive">
                {error instanceof Error ? error.message : "Không tải được thông báo"}
              </p>
            )}
            {canFetch &&
              !error &&
              items.map((notification) => {
                const config = iconForType(notification.type ?? "admission");
                const Icon = config.icon;
                const bodyText = displayBody(notification);
                const bodyPreview = bodyText ? stripHtmlToPreview(bodyText) : null;
                const created = displayCreatedAt(notification);
                const timeLabel = (() => {
                  if (!created) return "";
                  const t = new Date(created);
                  if (Number.isNaN(t.getTime())) return "";
                  return formatDistanceToNow(t, { addSuffix: true, locale: vi });
                })();
                return (
                  <DropdownMenuItem
                    key={notification.id}
                    className="flex cursor-pointer items-start gap-3 p-3 focus:bg-muted"
                    onSelect={(e) => e.preventDefault()}
                    onClick={() => void handleOpenNotification(notification.id)}
                  >
                    <div
                      className={`mt-0.5 shrink-0 rounded-lg p-2 ${config.bg} ${config.color}`}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-medium">
                          {displayTitle(notification)}
                        </p>
                        {notification.isRead === false && (
                          <span className="h-2 w-2 shrink-0 rounded-full bg-primary" />
                        )}
                      </div>
                      {bodyPreview && (
                        <p className="line-clamp-2 text-xs text-muted-foreground">
                          {bodyPreview}
                        </p>
                      )}
                      <p className="mt-1 text-xs text-muted-foreground">
                        {timeLabel}
                      </p>
                    </div>
                  </DropdownMenuItem>
                );
              })}
            {canFetch && !error && !isLoading && items.length === 0 && (
              <p className="p-3 text-xs text-muted-foreground">Chưa có thông báo.</p>
            )}
            {canFetch && hasMore && (
              <div className="border-t border-border p-2">
                <button
                  type="button"
                  className="flex w-full items-center justify-center gap-2 rounded-md py-2 text-sm font-medium text-primary hover:bg-muted/80 disabled:opacity-60"
                  disabled={loadingMore}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    void setSize((s) => s + 1);
                  }}
                >
                  {loadingMore ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Đang tải…
                    </>
                  ) : (
                    "Xem thêm"
                  )}
                </button>
              </div>
            )}
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="cursor-pointer justify-center font-medium text-primary">
            Xem tất cả thông báo
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{detail ? displayTitle(detail) : "Thông báo"}</DialogTitle>
          </DialogHeader>

          {detailLoading && (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}

          {!detailLoading && detail && (
            <div className="space-y-3">
              {displayCreatedAt(detail) ? (
                <p className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(displayCreatedAt(detail)), {
                    addSuffix: true,
                    locale: vi,
                  })}
                </p>
              ) : null}

              {displayBody(detail) ? (
                <div
                  className="prose prose-sm max-w-none dark:prose-invert"
                  dangerouslySetInnerHTML={{
                    __html: DOMPurify.sanitize(displayBody(detail)!, {
                      USE_PROFILES: { html: true },
                    }),
                  }}
                />
              ) : (
                <p className="text-sm text-muted-foreground">Không có nội dung.</p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default NotificationDropdown;
