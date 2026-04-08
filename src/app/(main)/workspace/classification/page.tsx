"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Award,
  Search,
  Filter,
  ChevronRight,
} from "lucide-react";
import ClassificationDetailDialog from "@/components/workspace/ClassificationDetailDialog";
import ClassificationCriteriaConfigDialog from "@/components/workspace/ClassificationCriteriaConfigDialog";
import BottomNav from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import {
  annualAssessmentService,
  type AnnualAssessmentItem,
  type AnnualAssessmentClassification,
  type AnnualAssessmentConfig,
  type RankStatsCounts,
  type ReviewAnnualAssessmentPayload,
} from "@/services/annualAssessmentService";
import type { PaginationMeta } from "@/lib/apiEnvelope";

const getClassificationBadge = (
  classification: AnnualAssessmentClassification
) => {
  switch (classification) {
    case "excellent":
      return (
        <Badge className="bg-green-600 text-white">
          Hoàn thành xuất sắc
        </Badge>
      );
    case "good":
      return (
        <Badge className="bg-blue-600 text-white">Hoàn thành tốt</Badge>
      );
    case "complete":
      return <Badge className="bg-yellow-600 text-white">Hoàn thành</Badge>;
    case "incomplete":
      return (
        <Badge className="bg-red-600 text-white">Không hoàn thành</Badge>
      );
    case "pending":
      return <Badge variant="outline">Chưa xếp loại</Badge>;
    default:
      return null;
  }
};

function statusBadge(status: string) {
  const s = status.toUpperCase();
  if (s === "APPROVED")
    return <Badge className="bg-emerald-700 text-white">APPROVED</Badge>;
  if (s === "REJECTED")
    return <Badge className="bg-destructive text-destructive-foreground">REJECTED</Badge>;
  return <Badge variant="secondary">PENDING</Badge>;
}

const Classification = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [items, setItems] = useState<AnnualAssessmentItem[]>([]);
  const [listMeta, setListMeta] = useState<PaginationMeta | null>(null);
  const [stats, setStats] = useState<RankStatsCounts | null>(null);
  const [config, setConfig] = useState<AnnualAssessmentConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [selectedMember, setSelectedMember] =
    useState<AnnualAssessmentItem | null>(null);
  const [configDialogOpen, setConfigDialogOpen] = useState(false);

  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [page, setPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(10);
  const [status, setStatus] = useState<string>("");

  const criteriaTemplate = config?.criteriaTemplate ?? [];

  const loadStats = useCallback(async () => {
    setIsLoadingStats(true);
    try {
      const s = await annualAssessmentService.getStatistics(year);
      setStats(s);
    } catch (e: unknown) {
      const message =
        e instanceof Error ? e.message : "Không tải được thống kê";
      toast({ title: "Lỗi thống kê", description: message });
      setStats(null);
    } finally {
      setIsLoadingStats(false);
    }
  }, [year]);

  const loadConfig = useCallback(async () => {
    try {
      const c = await annualAssessmentService.getConfig(year);
      setConfig(c);
    } catch {
      setConfig(null);
    }
  }, [year]);

  const loadList = useCallback(async () => {
    setIsLoading(true);
    try {
      const { items: list, meta } = await annualAssessmentService.list({
        year,
        page,
        limit,
        status: status || undefined,
      });
      setItems(list);
      setListMeta(meta);
    } catch (e: unknown) {
      const message =
        e instanceof Error ? e.message : "Không tải được danh sách xếp loại";
      toast({ title: "Lỗi", description: message });
      setItems([]);
      setListMeta(null);
    } finally {
      setIsLoading(false);
    }
  }, [year, page, limit, status]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  useEffect(() => {
    loadList();
  }, [loadList]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return items;
    return items.filter((m) =>
      (m.fullName || "").toLowerCase().includes(q)
    );
  }, [items, searchQuery]);

  const statsForCard = stats ?? {
    excellent: 0,
    good: 0,
    complete: 0,
    incomplete: 0,
    pending: 0,
  };

  const totalRanked = Math.max(
    1,
    statsForCard.excellent +
      statsForCard.good +
      statsForCard.complete +
      statsForCard.incomplete
  );

  const handleSaveReview = async (payload: ReviewAnnualAssessmentPayload) => {
    if (!selectedMember) return;
    try {
      await annualAssessmentService.review(selectedMember.id, payload);
      toast({ title: "Đã lưu đánh giá" });
      setSelectedMember(null);
      await loadList();
      await loadStats();
    } catch (e: unknown) {
      const message =
        e instanceof Error ? e.message : "Không lưu được đánh giá";
      toast({ title: "Lỗi", description: message });
      throw e instanceof Error ? e : new Error(message);
    }
  };

  const handleSaveCriteria = async (criteriaTemplate: string[]) => {
    await annualAssessmentService.saveConfig({ year, criteriaTemplate });
    toast({ title: "Đã lưu bộ tiêu chí" });
    await loadConfig();
    await loadStats();
  };

  const totalPages = listMeta?.totalPages && listMeta.totalPages > 0
    ? listMeta.totalPages
    : 1;

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-6">
      <main className="mx-auto max-w-5xl px-4 py-5">
        <div className="mb-6 flex items-center justify-between gap-2">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground">
              <Award className="h-6 w-6 text-secondary" />
              Xếp loại Đảng viên
            </h1>
            <p className="text-muted-foreground">Đánh giá năm {year}</p>
          </div>
          <Button
            className="gap-2"
            onClick={() => setConfigDialogOpen(true)}
          >
            Xếp loại mới
          </Button>
        </div>

        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-end">
              <div className="flex-1">
                <label className="text-sm font-medium">Năm</label>
                <Input
                  type="number"
                  value={year}
                  onChange={(e) => {
                    const next = Number(e.target.value);
                    setPage(1);
                    setYear(
                      Number.isFinite(next)
                        ? next
                        : new Date().getFullYear()
                    );
                  }}
                />
              </div>
              <div className="flex-1">
                <label className="text-sm font-medium">Trạng thái</label>
                <Select
                  value={status || "all"}
                  onValueChange={(v) => {
                    setPage(1);
                    setStatus(v === "all" ? "" : v);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Tất cả" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả</SelectItem>
                    <SelectItem value="PENDING">PENDING</SelectItem>
                    <SelectItem value="APPROVED">APPROVED</SelectItem>
                    <SelectItem value="REJECTED">REJECTED</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1">
                <label className="text-sm font-medium">Số dòng / trang</label>
                <Input
                  type="number"
                  value={limit}
                  onChange={(e) => {
                    const next = Number(e.target.value);
                    setPage(1);
                    setLimit(Number.isFinite(next) && next > 0 ? next : 10);
                  }}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  disabled={page <= 1 || isLoading}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Trang trước
                </Button>
                <Button
                  variant="outline"
                  disabled={isLoading || page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Trang sau
                </Button>
              </div>
              <div className="text-sm text-muted-foreground md:pb-2">
                Trang {page} / {totalPages}
                {listMeta ? (
                  <span className="block text-xs">
                    {listMeta.totalItems} bản ghi
                  </span>
                ) : null}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">
              Tổng quan xếp loại năm {year}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingStats ? (
              <p className="text-sm text-muted-foreground">Đang tải thống kê...</p>
            ) : (
              <>
                <div className="space-y-4">
                  <div>
                    <div className="mb-1 flex justify-between text-sm">
                      <span className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded-full bg-green-600" />
                        Hoàn thành xuất sắc
                      </span>
                      <span>
                        {statsForCard.excellent} (
                        {Math.round(
                          (statsForCard.excellent / totalRanked) * 100
                        )}
                        %)
                      </span>
                    </div>
                    <Progress
                      value={(statsForCard.excellent / totalRanked) * 100}
                      className="h-2"
                    />
                  </div>
                  <div>
                    <div className="mb-1 flex justify-between text-sm">
                      <span className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded-full bg-blue-600" />
                        Hoàn thành tốt
                      </span>
                      <span>
                        {statsForCard.good} (
                        {Math.round((statsForCard.good / totalRanked) * 100)}
                        %)
                      </span>
                    </div>
                    <Progress
                      value={(statsForCard.good / totalRanked) * 100}
                      className="h-2"
                    />
                  </div>
                  <div>
                    <div className="mb-1 flex justify-between text-sm">
                      <span className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded-full bg-yellow-600" />
                        Hoàn thành
                      </span>
                      <span>
                        {statsForCard.complete} (
                        {Math.round(
                          (statsForCard.complete / totalRanked) * 100
                        )}
                        %)
                      </span>
                    </div>
                    <Progress
                      value={(statsForCard.complete / totalRanked) * 100}
                      className="h-2"
                    />
                  </div>
                  <div>
                    <div className="mb-1 flex justify-between text-sm">
                      <span className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded-full bg-red-600" />
                        Không hoàn thành
                      </span>
                      <span>
                        {statsForCard.incomplete} (
                        {Math.round(
                          (statsForCard.incomplete / totalRanked) * 100
                        )}
                        %)
                      </span>
                    </div>
                    <Progress
                      value={(statsForCard.incomplete / totalRanked) * 100}
                      className="h-2"
                    />
                  </div>
                </div>
                <p className="mt-4 text-sm text-muted-foreground">
                  Còn {statsForCard.pending} đảng viên chưa xếp loại (PENDING /
                  chưa chốt hạng)
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">
              Chỉ tiêu đánh giá đã thiết lập — năm {year}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {criteriaTemplate.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Chưa có bộ tiêu chí. Bấm &quot;Xếp loại mới&quot; để tạo.
              </p>
            ) : (
              <ul className="list-inside list-disc space-y-1 text-sm">
                {criteriaTemplate.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <div className="mb-6 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Tìm kiếm đảng viên..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button variant="outline" size="icon" type="button">
            <Filter className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-3">
          {isLoading ? (
            <Card>
              <CardContent className="p-6 text-sm text-muted-foreground">
                Đang tải dữ liệu...
              </CardContent>
            </Card>
          ) : filtered.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-sm text-muted-foreground">
                Không có dữ liệu cho bộ lọc hiện tại
              </CardContent>
            </Card>
          ) : (
            filtered.map((member) => (
              <Card
                key={member.id}
                className="cursor-pointer transition-shadow hover:shadow-md"
                onClick={() => setSelectedMember(member)}
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
                        <h3 className="font-semibold">
                          {member.fullName || member.memberId}
                        </h3>
                        {statusBadge(member.status)}
                        {getClassificationBadge(member.classification)}
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                        {member.score != null && (
                          <span>Điểm: {member.score}</span>
                        )}
                        <span>
                          Tự xếp loại:{" "}
                          {member.selfRank ? member.selfRank : "—"}
                        </span>
                        {member.reviewedAt && (
                          <span>
                            Duyệt:{" "}
                            {new Date(member.reviewedAt).toLocaleString(
                              "vi-VN"
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </main>
      <BottomNav />
      <ClassificationCriteriaConfigDialog
        open={configDialogOpen}
        year={year}
        initialCriteria={criteriaTemplate}
        onClose={() => setConfigDialogOpen(false)}
        onSubmit={handleSaveCriteria}
      />
      <ClassificationDetailDialog
        member={selectedMember}
        open={!!selectedMember}
        onClose={() => setSelectedMember(null)}
        criteriaTemplate={criteriaTemplate}
        onSave={handleSaveReview}
      />
    </div>
  );
};

export default Classification;
