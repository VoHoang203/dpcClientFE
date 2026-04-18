"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  TrendingUp,
  BarChart3,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import BottomNav from "@/components/BottomNav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { meetingService } from "@/services/meetingService";
import type { MyAttendanceRecord } from "@/types/meeting";

type FilterType = "day" | "week" | "month" | "year";

/** Trạng thái hiển thị (map từ API: PRESENT, ABSENT, PENDING, PENDING_EXCUSE, …). */
type UiStatus =
  | "present"
  | "absent"
  | "upcoming"
  | "pending_excuse"
  | "excused";

const PAGE_SIZE_OPTIONS = [5, 10, 20] as const;

function toYMD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function getDateRangeForFilter(
  filter: FilterType
): { startDate?: string; endDate?: string } {
  const now = new Date();
  switch (filter) {
    case "day":
      return {};
    case "week": {
      const day = now.getDay();
      const diffToMonday = day === 0 ? -6 : 1 - day;
      const start = new Date(now);
      start.setDate(now.getDate() + diffToMonday);
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      return { startDate: toYMD(start), endDate: toYMD(end) };
    }
    case "month": {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      return { startDate: toYMD(start), endDate: toYMD(end) };
    }
    case "year": {
      const y = now.getFullYear();
      return { startDate: `${y}-01-01`, endDate: `${y}-12-31` };
    }
  }
}

function mapApiStatusToUi(status: string): UiStatus {
  switch (status) {
    case "PRESENT":
      return "present";
    case "ABSENT":
      return "absent";
    case "PENDING":
      return "upcoming";
    case "PENDING_EXCUSE":
      return "pending_excuse";
    case "EXCUSED":
      return "excused";
    default:
      return "upcoming";
  }
}

function formatMeetingDate(iso: string): string {
  try {
    const d = parseISO(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return format(d, "dd/MM/yyyy");
  } catch {
    return iso;
  }
}

function formatMeetingDateTime(iso: string): string {
  try {
    const d = parseISO(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return format(d, "dd/MM/yyyy HH:mm");
  } catch {
    return iso;
  }
}

function formatMeetingFormatLabel(v: string): string {
  const u = String(v || "").toUpperCase();
  if (u === "ONLINE") return "Online";
  if (u === "OFFLINE") return "Offline";
  return u || "—";
}

function getStatusIcon(status: UiStatus) {
  switch (status) {
    case "present":
      return <CheckCircle2 className="h-5 w-5 text-green-600" />;
    case "absent":
      return <XCircle className="h-5 w-5 text-destructive" />;
    default:
      return <Clock className="h-5 w-5 text-amber-600" />;
  }
}

function getStatusLabel(status: UiStatus) {
  switch (status) {
    case "present":
      return "Có mặt";
    case "absent":
      return "Vắng mặt";
    case "pending_excuse":
      return "Chờ duyệt phép";
    case "excused":
      return "Có phép";
    default:
      return "Sắp tới";
  }
}

function isOpenStatus(status: UiStatus): boolean {
  return status === "upcoming" || status === "pending_excuse";
}

export default function AttendanceReportPage() {
  const [filter, setFilter] = useState<FilterType>("day");
  const [records, setRecords] = useState<MyAttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZE_OPTIONS)[number]>(10);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const range = getDateRangeForFilter(filter);
      const data = await meetingService.getMyAttendance(range);
      const sorted = [...data].sort(
        (a, b) =>
          new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
      );
      setRecords(sorted);
      setPage(1);
    } catch (e) {
      setRecords([]);
      setError(e instanceof Error ? e.message : "Không tải được dữ liệu");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    void load();
  }, [load]);

  const stats = useMemo(() => {
    const totalMeetings = records.length;
    let presentCount = 0;
    let absentCount = 0;
    let upcomingCount = 0;
    for (const r of records) {
      const ui = mapApiStatusToUi(r.status);
      if (ui === "present") presentCount += 1;
      else if (ui === "absent") absentCount += 1;
      else if (isOpenStatus(ui)) upcomingCount += 1;
      else if (ui === "excused") upcomingCount += 1;
    }
    const finalized = totalMeetings - upcomingCount;
    const attendanceRate =
      finalized > 0 ? (presentCount / finalized) * 100 : 0;
    return {
      totalMeetings,
      presentCount,
      absentCount,
      upcomingCount,
      attendanceRate,
      finalizedLabel:
        finalized > 0
          ? `${presentCount}/${finalized} cuộc họp đã tham gia`
          : "Chưa có cuộc họp đã chốt điểm danh",
    };
  }, [records]);

  const totalPages = useMemo(() => {
    if (records.length === 0) return 1;
    return Math.max(1, Math.ceil(records.length / pageSize));
  }, [records.length, pageSize]);

  const paginatedRecords = useMemo(() => {
    const safePage = Math.min(Math.max(1, page), totalPages);
    const start = (safePage - 1) * pageSize;
    return records.slice(start, start + pageSize);
  }, [records, page, pageSize, totalPages]);

  useEffect(() => {
    setPage(1);
  }, [pageSize]);

  const currentYear = new Date().getFullYear();
  const periodSubtitle =
    filter === "year"
      ? `năm ${currentYear}`
      : filter === "month"
        ? "tháng này"
        : filter === "week"
          ? "tuần này"
          : "tất cả";

  return (
    <div className="min-h-0 flex-1 bg-background pb-20 md:pb-6">
      <main className="mx-auto max-w-7xl px-4 py-6">
        <Link
          href="/profile"
          className="mb-4 inline-flex items-center gap-2 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Quay lại</span>
        </Link>

        <div className="mb-6">
          <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground">
            <BarChart3 className="h-6 w-6 text-primary" />
            Báo cáo Điểm danh
          </h1>
          <p className="mt-1 text-muted-foreground">
            Thống kê tham gia họp {periodSubtitle}
          </p>
        </div>

        <Tabs
          value={filter}
          onValueChange={(v) => setFilter(v as FilterType)}
          className="mb-6"
        >
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="day">Tất cả</TabsTrigger>
            <TabsTrigger value="week">Tuần</TabsTrigger>
            <TabsTrigger value="month">Tháng</TabsTrigger>
            <TabsTrigger value="year">Năm</TabsTrigger>
          </TabsList>
        </Tabs>

        {error ? (
          <p className="mb-4 text-sm text-destructive">{error}</p>
        ) : null}

        <Card className="mb-6 bg-party-gradient text-primary-foreground">
          <CardContent className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-sm text-primary-foreground/80">
                  Tỷ lệ tham gia
                </p>
                <p className="text-3xl font-bold">
                  {loading ? "—" : `${Math.round(stats.attendanceRate)}%`}
                </p>
              </div>
              <div className="rounded-full bg-white/20 p-3">
                <TrendingUp className="h-6 w-6" />
              </div>
            </div>
            <Progress
              value={loading ? 0 : stats.attendanceRate}
              className="h-2 bg-white/20"
            />
            <p className="mt-2 text-xs text-primary-foreground/60">
              {loading ? "Đang tải…" : stats.finalizedLabel}
            </p>
          </CardContent>
        </Card>

        <div className="mb-6 grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <CheckCircle2 className="mx-auto mb-2 h-6 w-6 text-green-600" />
              <p className="text-2xl font-bold">
                {loading ? "—" : stats.presentCount}
              </p>
              <p className="text-xs text-muted-foreground">Có mặt</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <XCircle className="mx-auto mb-2 h-6 w-6 text-destructive" />
              <p className="text-2xl font-bold">
                {loading ? "—" : stats.absentCount}
              </p>
              <p className="text-xs text-muted-foreground">Vắng mặt</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Clock className="mx-auto mb-2 h-6 w-6 text-muted-foreground" />
              <p className="text-2xl font-bold">
                {loading ? "—" : stats.upcomingCount}
              </p>
              <p className="text-xs text-muted-foreground">Sắp tới</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Calendar className="h-5 w-5 text-primary" />
              Lịch sử điểm danh
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center gap-2 p-8 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Đang tải…</span>
              </div>
            ) : records.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                Không có dữ liệu trong khoảng thời gian này
              </div>
            ) : (
              paginatedRecords.map((item, index) => {
                const ui = mapApiStatusToUi(item.status);
                return (
                  <div
                    key={item.attendanceId}
                    className={`flex items-center justify-between p-4 ${
                      index < paginatedRecords.length - 1 ? "border-b" : ""
                    }`}
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      {getStatusIcon(ui)}
                      <div className="min-w-0">
                        <p className="font-medium">{item.meetingTitle}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatMeetingDateTime(item.startTime)} •{" "}
                          {formatMeetingFormatLabel(item.format)}
                        </p>
                      </div>
                    </div>
                    <Badge
                      variant={
                        ui === "present"
                          ? "default"
                          : ui === "absent"
                            ? "secondary"
                            : "secondary"
                      }
                      className={
                        ui === "present"
                          ? "shrink-0 bg-green-100 text-green-800"
                          : ui === "absent"
                            ? "shrink-0 bg-red-100 text-red-800"
                            : ui === "pending_excuse"
                              ? "shrink-0 bg-amber-100 text-amber-900"
                              : ui === "excused"
                                ? "shrink-0 bg-blue-100 text-blue-900"
                              : "shrink-0 bg-amber-50 text-amber-800"
                      }
                    >
                      {getStatusLabel(ui)}
                    </Badge>
                  </div>
                );
              })
            )}
          </CardContent>
          {!loading && records.length > 0 ? (
            <div className="flex flex-wrap items-center justify-between gap-3 border-t p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>
                  Trang <span className="font-medium text-foreground">{page}</span>/
                  <span className="font-medium text-foreground">{totalPages}</span>
                </span>
                <span className="hidden sm:inline">•</span>
                <span className="hidden sm:inline">{records.length} bản ghi</span>
              </div>
              <div className="flex items-center gap-2">
                <Select
                  value={String(pageSize)}
                  onValueChange={(v) => setPageSize(Number(v) as any)}
                >
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Số dòng" />
                  </SelectTrigger>
                  <SelectContent>
                    {PAGE_SIZE_OPTIONS.map((n) => (
                      <SelectItem key={n} value={String(n)}>
                        {n} / trang
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Trước
                </Button>
                <Button
                  variant="outline"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  Sau
                </Button>
              </div>
            </div>
          ) : null}
        </Card>
      </main>
      <BottomNav />
    </div>
  );
}
