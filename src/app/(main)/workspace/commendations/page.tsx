"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Award, Eye, Pencil, Plus, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import BottomNav from "@/components/BottomNav";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  committeeService,
  committeeMemberParticipantId,
  memberDisplayName,
  type CommitteeMember,
} from "@/services/committeeService";
import {
  commendationService,
  type CommendationItem,
} from "@/services/commendationService";
import type { PaginationMeta } from "@/lib/helpers";
import { cn } from "@/lib/utils";

type HistoryRow = Record<string, unknown>;

const SELECT_SENTINEL = "__none__";

function ymdOrToday(value: string): string {
  const t = String(value || "").trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t;
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function todayYmd(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function isYmdOnOrAfterToday(ymd: string): boolean {
  const t = String(ymd || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(t)) return false;
  return t >= todayYmd();
}

/** Ghi đè line-clamp/w-fit mặc định của SelectTrigger cho nhãn dài. */
const commendationSelectTriggerClass = cn(
  "h-auto min-h-10 w-full min-w-0 text-left whitespace-normal",
  "[&_[data-slot=select-value]]:line-clamp-none [&_[data-slot=select-value]]:whitespace-normal [&_[data-slot=select-value]]:text-left"
);

const COMMENDATION_TITLE_OPTIONS = [
  "Đảng viên hoàn thành xuất sắc nhiệm vụ",
  "Đảng viên xuất sắc tiêu biểu 5 năm liền",
  "Giấy khen (Của Đảng ủy cơ sở, Đảng ủy cấp trên cơ sở)",
  "Bằng khen (Của Tỉnh ủy, Thành ủy, Đảng ủy Khối Trung ương)",
  "Huy hiệu Đảng (30, 40, 45, 50, 55, 60... năm tuổi Đảng)",
  "Biểu dương mẫu sơ kết/tổng kết chuyên đề (Ví dụ: Học tập và làm theo tư tưởng, đạo đức, phong cách Hồ Chí Minh)",
] as const;

const SIGNING_AUTHORITY_OPTIONS = [
  "Chi bộ (Khen thưởng nội bộ hoặc đề xuất)",
  "Đảng ủy bộ phận",
  "Đảng ủy cơ sở",
  "Đảng ủy Khối Doanh nghiệp",
  "Quận/Huyện/Thị ủy",
  "Tỉnh ủy / Thành ủy Trung ương",
  "Ban Chấp hành Trung ương",
] as const;

const DECISION_NUMBER_OPTIONS = [
  {
    value: "QD/CB — Quyết định của Chi bộ",
    label: "QD/CB — Quyết định của Chi bộ",
  },
  {
    value: "QD/DU — Quyết định của Đảng ủy cơ sở",
    label: "QD/DU — Quyết định của Đảng ủy cơ sở",
  },
  {
    value: "QD/UKQ — Quyết định của Ủy ban Kiểm tra Đảng ủy",
    label: "QD/UKQ — Quyết định của Ủy ban Kiểm tra Đảng ủy",
  },
] as const;

export default function WorkspaceCommendationsPage() {
  const { user, isReady } = useAuth();
  const canAccess = (user?.role ?? "").toUpperCase() === "SECRETARY";

  const [members, setMembers] = useState<CommitteeMember[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);

  const [items, setItems] = useState<CommendationItem[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [loading, setLoading] = useState(true);

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [memberIdFilter, setMemberIdFilter] = useState("");

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [active, setActive] = useState<CommendationItem | null>(null);
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [saving, setSaving] = useState(false);

  // form
  const [formMemberId, setFormMemberId] = useState("");
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(ymdOrToday(""));
  const [decisionNumber, setDecisionNumber] = useState("");
  const [signingAuthority, setSigningAuthority] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const canSubmitCreate = useMemo(() => {
    if (saving) return false;
    if (!formMemberId.trim()) return false;
    if (!title.trim()) return false;
    if (!date.trim() || !isYmdOnOrAfterToday(date)) return false;
    if (!decisionNumber.trim()) return false;
    if (!signingAuthority.trim()) return false;
    if (!description.trim()) return false;
    if (!file) return false;
    return true;
  }, [
    saving,
    formMemberId,
    title,
    date,
    decisionNumber,
    signingAuthority,
    description,
    file,
  ]);

  const canSubmitEdit = useMemo(() => {
    if (saving || !active) return false;
    if (!formMemberId.trim()) return false;
    if (!title.trim()) return false;
    if (!date.trim()) return false;
    if (!decisionNumber.trim()) return false;
    if (!signingAuthority.trim()) return false;
    if (!description.trim()) return false;
    return true;
  }, [
    saving,
    active,
    formMemberId,
    title,
    date,
    decisionNumber,
    signingAuthority,
    description,
  ]);

  const memberOptions = useMemo(() => {
    return members
      .map((m) => {
        const pid = committeeMemberParticipantId(m);
        if (!pid) return null;
        return { id: pid, label: memberDisplayName(m) };
      })
      .filter(Boolean) as Array<{ id: string; label: string }>;
  }, [members]);

  const memberLabelById = useCallback(
    (id: string) => memberOptions.find((x) => x.id === id)?.label ?? id,
    [memberOptions]
  );

  const loadMembers = useCallback(async () => {
    setMembersLoading(true);
    try {
      const list = await committeeService.listMembers({ page: 1, limit: 200 });
      setMembers(list);
    } catch {
      toast.error("Không tải được danh sách đảng viên");
      setMembers([]);
    } finally {
      setMembersLoading(false);
    }
  }, []);

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const { items, meta } = await commendationService.list({
        page,
        limit,
        year,
        memberId: memberIdFilter || undefined,
      });
      setItems(items);
      setMeta(meta);
    } catch (e: unknown) {
      setItems([]);
      setMeta(null);
    } finally {
      setLoading(false);
    }
  }, [page, limit, year, memberIdFilter]);

  useEffect(() => {
    if (!isReady || !canAccess) return;
    void loadMembers();
  }, [isReady, canAccess, loadMembers]);

  useEffect(() => {
    if (!isReady || !canAccess) return;
    void loadList();
  }, [isReady, canAccess, loadList]);

  const resetForm = () => {
    setFormMemberId("");
    setTitle("");
    setDate(todayYmd());
    setDecisionNumber("");
    setSigningAuthority("");
    setDescription("");
    setFile(null);
  };

  const openCreate = () => {
    resetForm();
    setCreateOpen(true);
  };

  const openEdit = (it: CommendationItem) => {
    setActive(it);
    setFormMemberId(it.memberId);
    setTitle(it.title);
    setDate(ymdOrToday(it.date));
    setDecisionNumber(it.decisionNumber);
    setSigningAuthority(it.signingAuthority);
    setDescription(it.description ?? "");
    setFile(null);
    setEditOpen(true);
  };

  const openView = async (it: CommendationItem) => {
    setActive(it);
    setViewOpen(true);
    setHistory([]);
    try {
      const rows = (await commendationService.historyByMember(it.memberId)) as HistoryRow[];
      setHistory(rows);
    } catch {
      setHistory([]);
    }
  };

  const submitCreate = async () => {
    if (!formMemberId) return toast.error("Vui lòng chọn đảng viên");
    if (!title.trim()) return toast.error("Vui lòng chọn danh hiệu / hình thức");
    if (!date.trim()) return toast.error("Thiếu ngày ra quyết định");
    if (!isYmdOnOrAfterToday(date)) return toast.error("Không được chọn ngày quyết định trong quá khứ");
    if (!decisionNumber.trim()) return toast.error("Vui lòng chọn số quyết định");
    if (!signingAuthority.trim()) return toast.error("Vui lòng chọn cấp ký quyết định");
    if (!description.trim()) return toast.error("Vui lòng nhập mô tả chi tiết");
    if (!file) return toast.error("Vui lòng đính kèm file scan quyết định");

    setSaving(true);
    try {
      await commendationService.create({
        memberId: formMemberId,
        title: title.trim(),
        date: date.trim(),
        decisionNumber: decisionNumber.trim(),
        signingAuthority: signingAuthority.trim(),
        description: description.trim(),
        file,
      });
      toast.success("Đã tạo khen thưởng");
      setCreateOpen(false);
      await loadList();
    } catch (e: unknown) {
      const alreadyToasted = Boolean((e as any)?.__toastShown);
      if (!alreadyToasted) {
        toast.error(e instanceof Error ? e.message : "Không tạo được khen thưởng");
      }
    } finally {
      setSaving(false);
    }
  };

  const submitEdit = async () => {
    if (!active) return;
    if (!formMemberId) return toast.error("Vui lòng chọn đảng viên");
    if (!title.trim()) return toast.error("Vui lòng chọn danh hiệu / hình thức");
    if (!date.trim()) return toast.error("Thiếu ngày ra quyết định");
    if (!decisionNumber.trim()) return toast.error("Vui lòng chọn số quyết định");
    if (!signingAuthority.trim()) return toast.error("Vui lòng chọn cấp ký quyết định");
    if (!description.trim()) return toast.error("Vui lòng nhập mô tả chi tiết");

    setSaving(true);
    try {
      await commendationService.update(active.id, {
        memberId: formMemberId,
        title: title.trim(),
        date: date.trim(),
        decisionNumber: decisionNumber.trim(),
        signingAuthority: signingAuthority.trim(),
        description: description.trim(),
        file,
      });
      toast.success("Đã cập nhật khen thưởng");
      setEditOpen(false);
      await loadList();
    } catch (e: unknown) {
      const alreadyToasted = Boolean((e as any)?.__toastShown);
      if (!alreadyToasted) {
        toast.error(e instanceof Error ? e.message : "Không cập nhật được khen thưởng");
      }
    } finally {
      setSaving(false);
    }
  };

  const totalPages = meta?.totalPages && meta.totalPages > 0 ? meta.totalPages : 1;

  if (isReady && !canAccess) {
    return (
      <div className="p-6">
        <Card className="mx-auto max-w-xl">
          <CardHeader>
            <CardTitle>Không có quyền truy cập</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Trang này chỉ dành cho Bí thư (SECRETARY).
          </CardContent>
        </Card>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-0 flex-1 bg-background pb-20 md:pb-6">
      <main className="mx-auto max-w-7xl px-4 py-6">
        <div className="mb-6 flex items-center justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground">
              <Award className="h-6 w-6 text-primary" />
              Khen thưởng Đảng viên
            </h1>
            <p className="text-muted-foreground">Quản lý quyết định khen thưởng</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => void loadList()}
              disabled={loading}
            >
              <RefreshCw className="h-4 w-4" />
              Tải lại
            </Button>
            <Button className="gap-2" onClick={openCreate}>
              <Plus className="h-4 w-4" />
              Thêm khen thưởng
            </Button>
          </div>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Bộ lọc</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-4 md:items-end">
              <div>
                <Label>Năm</Label>
                <Input
                  type="number"
                  value={year}
                  onChange={(e) => {
                    setYear(Number(e.target.value) || new Date().getFullYear());
                    setPage(1);
                  }}
                />
              </div>
              <div>
                <Label>Đảng viên</Label>
                <Select
                  value={memberIdFilter ? memberIdFilter : "__all__"}
                  onValueChange={(v) => {
                    setPage(1);
                    setMemberIdFilter(v === "__all__" ? "" : v);
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={membersLoading ? "Đang tải..." : "Tất cả"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">Tất cả</SelectItem>
                    {memberOptions.map((x) => (
                      <SelectItem key={x.id} value={x.id}>
                        {x.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Số dòng / trang</Label>
                <Input
                  type="number"
                  value={limit}
                  onChange={(e) => {
                    setLimit(Math.max(1, Number(e.target.value) || 10));
                    setPage(1);
                  }}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setPage(1);
                    void loadList();
                  }}
                  disabled={loading}
                >
                  {loading ? "Đang tải..." : "Tải"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Danh sách khen thưởng</CardTitle>
            <div className="text-sm text-muted-foreground">
              Trang {page} / {totalPages}
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Đảng viên</TableHead>
                    <TableHead>Danh hiệu / Hình thức</TableHead>
                    <TableHead>Số QĐ</TableHead>
                    <TableHead>Ngày</TableHead>
                    <TableHead>Cấp ký</TableHead>
                    <TableHead className="text-right">Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="py-10 text-center text-muted-foreground"
                      >
                        Đang tải...
                      </TableCell>
                    </TableRow>
                  ) : items.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="py-10 text-center text-muted-foreground"
                      >
                        Chưa có khen thưởng.
                      </TableCell>
                    </TableRow>
                  ) : (
                    items.map((it) => (
                      <TableRow key={it.id}>
                        <TableCell className="font-medium">
                          {memberLabelById(it.memberId)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{it.title}</Badge>
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {it.decisionNumber}
                        </TableCell>
                        <TableCell>{it.date}</TableCell>
                        <TableCell>{it.signingAuthority}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => void openView(it)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => openEdit(it)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="mt-4 flex items-center justify-between gap-2">
              <Button
                variant="outline"
                disabled={page <= 1 || loading}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Trang trước
              </Button>
              <Button
                variant="outline"
                disabled={page >= totalPages || loading}
                onClick={() => setPage((p) => p + 1)}
              >
                Trang sau
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>

      <BottomNav />

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-h-[90vh] w-[calc(100vw-1.5rem)] max-w-5xl overflow-y-auto sm:max-w-5xl sm:w-full">
          <DialogHeader>
            <DialogTitle>Tạo khen thưởng</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-4">
            <div className="grid min-w-0 gap-2">
              <Label>Đảng viên</Label>
              <Select
                value={formMemberId ? formMemberId : SELECT_SENTINEL}
                onValueChange={(v) => setFormMemberId(v === SELECT_SENTINEL ? "" : v)}
              >
                <SelectTrigger className={commendationSelectTriggerClass}>
                  <SelectValue
                    placeholder={membersLoading ? "Đang tải..." : "Chọn đảng viên"}
                  />
                </SelectTrigger>
                <SelectContent className="max-w-[min(56rem,calc(100vw-2rem))]">
                  <SelectItem value={SELECT_SENTINEL}>Chọn đảng viên</SelectItem>
                  {memberOptions.map((x) => (
                    <SelectItem key={x.id} value={x.id}>
                      {x.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid min-w-0 gap-2">
              <Label>Danh hiệu / Hình thức khen thưởng</Label>
              <Select
                value={title ? title : SELECT_SENTINEL}
                onValueChange={(v) => setTitle(v === SELECT_SENTINEL ? "" : v)}
              >
                <SelectTrigger className={commendationSelectTriggerClass}>
                  <SelectValue placeholder="Chọn danh hiệu / hình thức" />
                </SelectTrigger>
                <SelectContent className="max-w-[min(56rem,calc(100vw-2rem))]">
                  <SelectItem value={SELECT_SENTINEL}>Chọn danh hiệu / hình thức</SelectItem>
                  {COMMENDATION_TITLE_OPTIONS.map((t) => (
                    <SelectItem key={t} value={t} className="whitespace-normal">
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid min-w-0 gap-2">
              <Label>Ngày quyết định</Label>
              <Input
                type="date"
                className="w-full"
                min={todayYmd()}
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Không chọn ngày trước hôm nay.</p>
            </div>
            <div className="grid min-w-0 gap-2">
              <Label>Số quyết định (mã)</Label>
              <Select
                value={decisionNumber ? decisionNumber : SELECT_SENTINEL}
                onValueChange={(v) => setDecisionNumber(v === SELECT_SENTINEL ? "" : v)}
              >
                <SelectTrigger className={commendationSelectTriggerClass}>
                  <SelectValue placeholder="Chọn mã quyết định" />
                </SelectTrigger>
                <SelectContent className="max-w-[min(56rem,calc(100vw-2rem))]">
                  <SelectItem value={SELECT_SENTINEL}>Chọn mã quyết định</SelectItem>
                  {DECISION_NUMBER_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value} className="whitespace-normal">
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid min-w-0 gap-2">
              <Label>Cấp ký quyết định</Label>
              <Select
                value={signingAuthority ? signingAuthority : SELECT_SENTINEL}
                onValueChange={(v) => setSigningAuthority(v === SELECT_SENTINEL ? "" : v)}
              >
                <SelectTrigger className={commendationSelectTriggerClass}>
                  <SelectValue placeholder="Chọn cấp ký" />
                </SelectTrigger>
                <SelectContent className="max-w-[min(56rem,calc(100vw-2rem))]">
                  <SelectItem value={SELECT_SENTINEL}>Chọn cấp ký quyết định</SelectItem>
                  {SIGNING_AUTHORITY_OPTIONS.map((s) => (
                    <SelectItem key={s} value={s} className="whitespace-normal">
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid min-w-0 gap-2">
              <Label>Mô tả chi tiết</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Nội dung chi tiết thành tích…"
                rows={4}
              />
            </div>
            <div className="grid min-w-0 gap-2">
              <Label>File scan quyết định (PDF/PNG/JPG)</Label>
              <Input
                type="file"
                accept=".pdf,.png,.jpg,.jpeg"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={saving}>
              Hủy
            </Button>
            <Button onClick={() => void submitCreate()} disabled={saving || !canSubmitCreate}>
              {saving ? "Đang lưu..." : "Xác nhận"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-h-[90vh] w-[calc(100vw-1.5rem)] max-w-5xl overflow-y-auto sm:max-w-5xl sm:w-full">
          <DialogHeader>
            <DialogTitle>Cập nhật khen thưởng</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-4">
            <div className="grid min-w-0 gap-2">
              <Label>Đảng viên</Label>
              <Select
                value={formMemberId ? formMemberId : SELECT_SENTINEL}
                onValueChange={(v) => setFormMemberId(v === SELECT_SENTINEL ? "" : v)}
              >
                <SelectTrigger className={commendationSelectTriggerClass}>
                  <SelectValue
                    placeholder={membersLoading ? "Đang tải..." : "Chọn đảng viên"}
                  />
                </SelectTrigger>
                <SelectContent className="max-w-[min(56rem,calc(100vw-2rem))]">
                  <SelectItem value={SELECT_SENTINEL}>Chọn đảng viên</SelectItem>
                  {memberOptions.map((x) => (
                    <SelectItem key={x.id} value={x.id}>
                      {x.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid min-w-0 gap-2">
              <Label>Danh hiệu / Hình thức khen thưởng</Label>
              <Select
                value={title ? title : SELECT_SENTINEL}
                onValueChange={(v) => setTitle(v === SELECT_SENTINEL ? "" : v)}
              >
                <SelectTrigger className={commendationSelectTriggerClass}>
                  <SelectValue placeholder="Chọn danh hiệu / hình thức" />
                </SelectTrigger>
                <SelectContent className="max-w-[min(56rem,calc(100vw-2rem))]">
                  <SelectItem value={SELECT_SENTINEL}>Chọn danh hiệu / hình thức</SelectItem>
                  {COMMENDATION_TITLE_OPTIONS.map((t) => (
                    <SelectItem key={t} value={t} className="whitespace-normal">
                      {t}
                    </SelectItem>
                  ))}
                  {title &&
                  !(COMMENDATION_TITLE_OPTIONS as readonly string[]).includes(title) ? (
                    <SelectItem value={title} className="whitespace-normal">
                      {title} (đã lưu)
                    </SelectItem>
                  ) : null}
                </SelectContent>
              </Select>
            </div>
            <div className="grid min-w-0 gap-2">
              <Label>Ngày quyết định</Label>
              <Input
                className="w-full"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Bản ghi cũ có thể có ngày trong quá khứ; có thể chỉnh khi cập nhật.
              </p>
            </div>
            <div className="grid min-w-0 gap-2">
              <Label>Số quyết định (mã)</Label>
              <Select
                value={decisionNumber ? decisionNumber : SELECT_SENTINEL}
                onValueChange={(v) => setDecisionNumber(v === SELECT_SENTINEL ? "" : v)}
              >
                <SelectTrigger className={commendationSelectTriggerClass}>
                  <SelectValue placeholder="Chọn mã quyết định" />
                </SelectTrigger>
                <SelectContent className="max-w-[min(56rem,calc(100vw-2rem))]">
                  <SelectItem value={SELECT_SENTINEL}>Chọn mã quyết định</SelectItem>
                  {DECISION_NUMBER_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value} className="whitespace-normal">
                      {o.label}
                    </SelectItem>
                  ))}
                  {decisionNumber &&
                  !DECISION_NUMBER_OPTIONS.some((o) => o.value === decisionNumber) ? (
                    <SelectItem value={decisionNumber} className="whitespace-normal">
                      {decisionNumber} (đã lưu)
                    </SelectItem>
                  ) : null}
                </SelectContent>
              </Select>
            </div>
            <div className="grid min-w-0 gap-2">
              <Label>Cấp ký quyết định</Label>
              <Select
                value={signingAuthority ? signingAuthority : SELECT_SENTINEL}
                onValueChange={(v) => setSigningAuthority(v === SELECT_SENTINEL ? "" : v)}
              >
                <SelectTrigger className={commendationSelectTriggerClass}>
                  <SelectValue placeholder="Chọn cấp ký" />
                </SelectTrigger>
                <SelectContent className="max-w-[min(56rem,calc(100vw-2rem))]">
                  <SelectItem value={SELECT_SENTINEL}>Chọn cấp ký quyết định</SelectItem>
                  {SIGNING_AUTHORITY_OPTIONS.map((s) => (
                    <SelectItem key={s} value={s} className="whitespace-normal">
                      {s}
                    </SelectItem>
                  ))}
                  {signingAuthority &&
                  !(SIGNING_AUTHORITY_OPTIONS as readonly string[]).includes(
                    signingAuthority
                  ) ? (
                    <SelectItem value={signingAuthority} className="whitespace-normal">
                      {signingAuthority} (đã lưu)
                    </SelectItem>
                  ) : null}
                </SelectContent>
              </Select>
            </div>
            <div className="grid min-w-0 gap-2">
              <Label>Mô tả chi tiết</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Nội dung chi tiết thành tích…"
                rows={4}
              />
            </div>
            <div className="grid min-w-0 gap-2">
              <Label>Đổi file scan (tuỳ chọn)</Label>
              <Input
                type="file"
                accept=".pdf,.png,.jpg,.jpeg"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)} disabled={saving}>
              Hủy
            </Button>
            <Button onClick={() => void submitEdit()} disabled={saving || !canSubmitEdit}>
              {saving ? "Đang lưu..." : "Cập nhật"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Lịch sử khen thưởng</DialogTitle>
          </DialogHeader>
          {!active ? null : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Đảng viên:{" "}
                <span className="font-medium">{memberLabelById(active.memberId)}</span>
              </p>
              {history.length === 0 ? (
                <Card>
                  <CardContent className="p-6 text-center text-muted-foreground">
                    Chưa có lịch sử / không tải được.
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {history.map((row, idx) => (
                    <Card key={String((row as any).id ?? idx)}>
                      <CardContent className="p-4 text-sm">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="font-medium">
                            {String((row as any).title ?? "") || "Khen thưởng"}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {String((row as any).date ?? "")}
                          </div>
                        </div>
                        {(row as any).decisionNumber ? (
                          <div className="mt-2 text-xs text-muted-foreground">
                            Số QĐ: {String((row as any).decisionNumber)}
                          </div>
                        ) : null}
                        {(row as any).description ? (
                          <div className="mt-2">
                            <div className="text-muted-foreground">Mô tả</div>
                            <div>{String((row as any).description ?? "")}</div>
                          </div>
                        ) : null}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewOpen(false)}>
              Đóng
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

