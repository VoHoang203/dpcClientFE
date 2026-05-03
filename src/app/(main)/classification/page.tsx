"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Award,
  Search,
  ChevronRight,
  FileSearch,
  RefreshCw,
  Loader2,
} from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  annualAssessmentService,
  type AnnualAssessmentItem,
  type RankStatsCounts,
} from "@/services/annualAssessmentService";
import { fileService } from "@/services/fileService";
import { formatDateTimeVi } from "@/lib/formatDateTimeVi";
import type { PaginationMeta } from "@/lib/helpers";

const getClassificationBadge = (
  classification: AnnualAssessmentItem["classification"]
) => {
  switch (classification) {
    case "excellent":
      return <Badge className="bg-green-600 text-white">Hoàn thành xuất sắc</Badge>;
    case "good":
      return <Badge className="bg-blue-600 text-white">Hoàn thành tốt</Badge>;
    case "complete":
      return <Badge className="bg-yellow-600 text-white">Hoàn thành</Badge>;
    case "incomplete":
      return <Badge className="bg-red-600 text-white">Không hoàn thành</Badge>;
    case "pending":
      return <Badge variant="outline">Chưa xếp loại</Badge>;
    default:
      return null;
  }
};

const PAGE_SIZE = 10;

export default function ClassificationPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingStats, setLoadingStats] = useState(true);
  const [items, setItems] = useState<AnnualAssessmentItem[]>([]);
  const [listMeta, setListMeta] = useState<PaginationMeta | null>(null);
  const [statsOverview, setStatsOverview] = useState<RankStatsCounts | null>(null);
  const [selected, setSelected] = useState<AnnualAssessmentItem | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const loadStats = async () => {
    setLoadingStats(true);
    try {
      const s = await annualAssessmentService.getStatistics(year);
      setStatsOverview(s);
    } catch {
      setStatsOverview(null);
    } finally {
      setLoadingStats(false);
    }
  };

  const loadList = async () => {
    setLoading(true);
    try {
      const { items: list, meta } = await annualAssessmentService.list({
        year,
        page,
        limit: PAGE_SIZE,
        status: "APPROVED",
      });
      setItems(list);
      setListMeta(meta);
    } finally {
      setLoading(false);
    }
  };

  const reloadAll = async () => {
    await Promise.all([loadStats(), loadList()]);
  };

  useEffect(() => {
    void loadStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year]);

  useEffect(() => {
    void loadList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, page]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return items;
    return items.filter((x) => (x.fullName || "").toLowerCase().includes(q));
  }, [items, searchQuery]);

  const stats = statsOverview ?? {
    excellent: 0,
    good: 0,
    complete: 0,
    incomplete: 0,
    pending: 0,
  };

  const total = Math.max(
    1,
    stats.excellent + stats.good + stats.complete + stats.incomplete
  );

  const totalPages =
    listMeta?.totalPages && listMeta.totalPages > 0 ? listMeta.totalPages : 1;

  const listRange = useMemo(() => {
    const totalItems = listMeta?.totalItems ?? 0;
    if (items.length === 0) {
      return { rangeStart: 0, rangeEnd: 0, totalItems };
    }
    const start = (page - 1) * PAGE_SIZE + 1;
    const end = (page - 1) * PAGE_SIZE + items.length;
    return { rangeStart: start, rangeEnd: end, totalItems };
  }, [items.length, listMeta?.totalItems, page]);

  const canGoNext = page < totalPages;
  const canGoPrev = page > 1;

  return (
    <div className="min-h-0 flex-1 bg-background pb-20 md:pb-6">
      <main className="mx-auto max-w-7xl px-4 py-6">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground">
              <Award className="h-6 w-6 text-secondary" />
              Xếp loại Đảng viên
            </h1>
            <p className="text-muted-foreground">Danh sách kết quả xếp loại (năm {year})</p>
          </div>
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => void reloadAll()}
            disabled={loading || loadingStats}
          >
            <RefreshCw className="h-4 w-4" />
            Tải lại
          </Button>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Tổng quan xếp loại</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingStats ? (
              <p className="text-sm text-muted-foreground">Đang tải thống kê...</p>
            ) : (
            <div className="space-y-4">
              <div>
                <div className="mb-1 flex justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-green-600" />
                    Hoàn thành xuất sắc
                  </span>
                  <span>
                    {stats.excellent} ({Math.round((stats.excellent / total) * 100)}%)
                  </span>
                </div>
                <Progress value={(stats.excellent / total) * 100} className="h-2" />
              </div>
              <div>
                <div className="mb-1 flex justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-blue-600" />
                    Hoàn thành tốt
                  </span>
                  <span>
                    {stats.good} ({Math.round((stats.good / total) * 100)}%)
                  </span>
                </div>
                <Progress value={(stats.good / total) * 100} className="h-2" />
              </div>
              <div>
                <div className="mb-1 flex justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-yellow-600" />
                    Hoàn thành
                  </span>
                  <span>
                    {stats.complete} ({Math.round((stats.complete / total) * 100)}%)
                  </span>
                </div>
                <Progress value={(stats.complete / total) * 100} className="h-2" />
              </div>
              <div>
                <div className="mb-1 flex justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-red-600" />
                    Không hoàn thành
                  </span>
                  <span>
                    {stats.incomplete} ({Math.round((stats.incomplete / total) * 100)}%)
                  </span>
                </div>
                <Progress value={(stats.incomplete / total) * 100} className="h-2" />
              </div>
            </div>
            )}
            <p className="mt-4 text-sm text-muted-foreground">
              {loadingStats
                ? "Đang tải dữ liệu..."
                : `Tổng ${listMeta?.totalItems ?? stats.excellent + stats.good + stats.complete + stats.incomplete} kết quả đã duyệt (theo thống kê năm ${year})`}
            </p>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="grid gap-3 md:grid-cols-3 md:items-end">
              <div>
                <Label>Năm</Label>
                <Input
                  type="number"
                  value={year}
                  onChange={(e) => {
                    setPage(1);
                    setYear(Number(e.target.value) || new Date().getFullYear());
                  }}
                />
              </div>
              <div className="md:col-span-2">
                <Label>Tìm kiếm</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Tìm kiếm đảng viên..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-3">
          {loading ? (
            <Card>
              <CardContent className="p-6 text-center text-muted-foreground">Đang tải...</CardContent>
            </Card>
          ) : filtered.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center text-muted-foreground">
                Không có dữ liệu.
              </CardContent>
            </Card>
          ) : (
            filtered.map((member) => (
              <Card
                key={member.id}
                className="cursor-pointer transition-shadow hover:shadow-md"
                onClick={() => {
                  setSelected(member);
                  setDetailOpen(true);
                }}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-12 w-12">
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {(member.fullName || "?").charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold">{member.fullName}</h3>
                        {getClassificationBadge(member.classification)}
                      </div>
                      <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                        <span>Điểm: {member.score ?? 0}/100</span>
                        <span>
                          Ngày duyệt:{" "}
                          {member.reviewedAt
                            ? formatDateTimeVi(member.reviewedAt, "-")
                            : "-"}
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {(items.length > 0 || (listMeta?.totalItems ?? 0) > 0) && (
          <div className="mt-6 flex flex-col items-center gap-4 border-t border-border pt-6">
            <p className="text-center text-sm text-muted-foreground">
              Đang hiển thị{" "}
              <span className="font-medium text-foreground">
                {listRange.rangeStart}–{listRange.rangeEnd}
              </span>{" "}
              trong tổng số{" "}
              <span className="font-medium text-foreground">
                {listRange.totalItems}
              </span>{" "}
              kết quả (đã duyệt)
            </p>
            {searchQuery.trim() ? (
              <p className="text-xs text-muted-foreground">
                Lọc theo tên trên trang này: {filtered.length} dòng
              </p>
            ) : null}
            <div className="flex flex-wrap items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={!canGoPrev || loading}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Trang trước
              </Button>
              <span className="min-w-28 text-center text-sm text-muted-foreground">
                Trang {page} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={!canGoNext || loading}
                onClick={() => setPage((p) => p + 1)}
              >
                Trang sau
              </Button>
            </div>
            {loading ? (
              <p className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Đang tải…
              </p>
            ) : null}
          </div>
        )}

        <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
          <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Chi tiết xếp loại</DialogTitle>
            </DialogHeader>
            {!selected ? null : (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="text-lg font-semibold">{selected.fullName}</div>
                    <div className="text-sm text-muted-foreground">Năm: {selected.year}</div>
                  </div>
                  <div>{getClassificationBadge(selected.classification)}</div>
                </div>

                <Card>
                  <CardContent className="grid gap-3 p-4 md:grid-cols-2">
                    <div className="text-sm">
                      <div className="text-muted-foreground">Điểm</div>
                      <div className="font-medium">{selected.score ?? 0}/100</div>
                    </div>
                    <div className="text-sm">
                      <div className="text-muted-foreground">Trạng thái</div>
                      <div className="font-medium">{selected.status}</div>
                    </div>
                    <div className="text-sm md:col-span-2">
                      <div className="text-muted-foreground">Nhận xét</div>
                      <div className="whitespace-pre-wrap">{selected.remarks || "-"}</div>
                    </div>
                  </CardContent>
                </Card>

                <div className="flex flex-wrap items-center justify-end gap-2">
                  <Button
                    variant="outline"
                    className="gap-2"
                    onClick={() => fileService.openInNewTab(selected.assessmentFileUrl || "")}
                    disabled={!selected.assessmentFileUrl}
                  >
                    <FileSearch className="h-4 w-4" />
                    Xem file
                  </Button>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setDetailOpen(false)}>
                Đóng
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
      <BottomNav />
    </div>
  );
}
