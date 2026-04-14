"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, Calendar, Edit, Eye, Plus, Loader2 } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  disciplineService,
  type DisciplineItem,
  type DisciplineStatus,
} from "@/services/disciplineService";
import {
  committeeService,
  committeeMemberParticipantId,
  memberDisplayName,
  type CommitteeMember,
} from "@/services/committeeService";
import { ManualParticipantPicker } from "@/components/workspace/ManualParticipantPicker";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

function statusLabel(s: string): { label: string; variant?: "outline" | "secondary"; cls?: string } {
  const u = String(s || "").toUpperCase();
  if (u === "PROCESSING") return { label: "Đang xử lý", variant: "outline", cls: "border-yellow-500 text-yellow-600" };
  if (u === "COMPLETED") return { label: "Đã hoàn thành", variant: "outline", cls: "border-green-500 text-green-600" };
  if (u === "APPEALING") return { label: "Khiếu nại", variant: "outline", cls: "border-blue-500 text-blue-600" };
  if (!u) return { label: "—", variant: "secondary" };
  return { label: u, variant: "secondary" };
}

function formLabel(form: string): { label: string; cls: string } {
  const u = String(form || "").toUpperCase();
  if (u === "KHIEN_TRACH") return { label: "Khiển trách", cls: "bg-yellow-100 text-yellow-800" };
  if (u === "CANH_CAO") return { label: "Cảnh cáo", cls: "bg-orange-100 text-orange-800" };
  if (u === "CACH_CHUC") return { label: "Cách chức", cls: "bg-red-100 text-red-800" };
  if (u === "KHAI_TRU") return { label: "Khai trừ", cls: "bg-red-600 text-white" };
  return { label: u || "—", cls: "bg-muted text-foreground" };
}

function parseYmd(d: string): string {
  const t = String(d || "").trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t;
  const dd = new Date(t);
  if (Number.isNaN(dd.getTime())) return "";
  const y = dd.getFullYear();
  const m = String(dd.getMonth() + 1).padStart(2, "0");
  const day = String(dd.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function WorkspaceDisciplinePage() {
  const { user, isReady } = useAuth();
  const canAccess = (user?.role ?? "").toUpperCase() === "SECRETARY";

  const [tab, setTab] = useState<"all" | "processing" | "completed" | "appealing">("all");
  const [items, setItems] = useState<DisciplineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [memberIdFilter, setMemberIdFilter] = useState("");

  const [members, setMembers] = useState<CommitteeMember[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [memberSearch, setMemberSearch] = useState("");

  const filteredMembers = useMemo(() => {
    const q = memberSearch.trim().toLowerCase();
    const list = !q
      ? members
      : members.filter((m) => {
          const label = memberDisplayName(m).toLowerCase();
          const email = (m.email || "").toLowerCase();
          const un = (m.username || "").toLowerCase();
          return label.includes(q) || email.includes(q) || un.includes(q);
        });
    return list.slice(0, 25);
  }, [members, memberSearch]);

  // dialogs
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [active, setActive] = useState<DisciplineItem | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);

  const [formMemberId, setFormMemberId] = useState("");
  const [decisionNumber, setDecisionNumber] = useState("");
  const [date, setDate] = useState("");
  const [form, setForm] = useState("KHIEN_TRACH");
  const [reason, setReason] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const resetForm = () => {
    setFormMemberId("");
    setDecisionNumber("");
    setDate("");
    setForm("KHIEN_TRACH");
    setReason("");
    setDescription("");
    setFile(null);
    setMemberSearch("");
  };

  const loadMembers = useCallback(async () => {
    setMembersLoading(true);
    try {
      const list = await committeeService.listMembers({ page: 1, limit: 200 });
      setMembers(list);
    } catch (e) {
      toast.error("Không tải được danh sách đảng viên");
      setMembers([]);
    } finally {
      setMembersLoading(false);
    }
  }, []);

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const { items: list } = await disciplineService.list({
        page,
        limit,
        year,
        memberId: memberIdFilter.trim() || undefined,
      });
      setItems(list);
    } catch (e: unknown) {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [page, limit, year, memberIdFilter]);

  useEffect(() => {
    if (!isReady) return;
    if (!canAccess) return;
    void loadMembers();
  }, [isReady, canAccess, loadMembers]);

  useEffect(() => {
    if (!isReady) return;
    if (!canAccess) return;
    void loadList();
  }, [isReady, canAccess, loadList]);

  const filteredByTab = useMemo(() => {
    if (tab === "all") return items;
    const want: DisciplineStatus =
      tab === "processing" ? "PROCESSING" : tab === "completed" ? "COMPLETED" : "APPEALING";
    return items.filter((x) => String(x.status || "").toUpperCase() === want);
  }, [items, tab]);

  const stats = useMemo(() => {
    const total = items.length;
    const processing = items.filter((x) => String(x.status || "").toUpperCase() === "PROCESSING").length;
    const completed = items.filter((x) => String(x.status || "").toUpperCase() === "COMPLETED").length;
    const appealing = items.filter((x) => String(x.status || "").toUpperCase() === "APPEALING").length;
    return { total, processing, completed, appealing };
  }, [items]);

  const openCreate = () => {
    resetForm();
    setCreateOpen(true);
  };

  const openEdit = (it: DisciplineItem) => {
    setActive(it);
    setFormMemberId(it.memberId);
    setDecisionNumber(it.decisionNumber);
    setDate(parseYmd(it.date));
    setForm(it.form || "KHIEN_TRACH");
    setReason(it.reason || "");
    setDescription(it.description || "");
    setFile(null);
    setMemberSearch("");
    setEditOpen(true);
  };

  const openView = async (it: DisciplineItem) => {
    setActive(it);
    setViewOpen(true);
    setHistory([]);
    try {
      const rows = await disciplineService.historyByMember(it.memberId);
      setHistory(rows);
    } catch {
      setHistory([]);
    }
  };

  const submitCreate = async () => {
    if (!formMemberId.trim()) return toast.error("Vui lòng chọn đảng viên");
    if (!decisionNumber.trim()) return toast.error("Thiếu số quyết định");
    if (!date.trim()) return toast.error("Thiếu ngày ra quyết định");
    if (!form.trim()) return toast.error("Thiếu hình thức kỷ luật");
    if (!reason.trim()) return toast.error("Thiếu lý do kỷ luật");
    if (!file) return toast.error("Vui lòng đính kèm file scan quyết định");
    setSaving(true);
    try {
      await disciplineService.create({
        memberId: formMemberId.trim(),
        decisionNumber: decisionNumber.trim(),
        date: date.trim(),
        form: form.trim(),
        reason: reason.trim(),
        description: description.trim() || undefined,
        file,
      });
      toast.success("Đã tạo kỷ luật");
      setCreateOpen(false);
      await loadList();
    } catch (e: unknown) {
      const alreadyToasted = Boolean((e as any)?.__toastShown);
      if (!alreadyToasted) {
        const msg = e instanceof Error ? e.message : "Không tạo được kỷ luật";
        toast.error(msg);
      }
    } finally {
      setSaving(false);
    }
  };

  const submitEdit = async () => {
    if (!active) return;
    if (!decisionNumber.trim()) return toast.error("Thiếu số quyết định");
    if (!date.trim()) return toast.error("Thiếu ngày ra quyết định");
    if (!form.trim()) return toast.error("Thiếu hình thức kỷ luật");
    if (!reason.trim()) return toast.error("Thiếu lý do kỷ luật");
    setSaving(true);
    try {
      await disciplineService.update(active.id, {
        memberId: formMemberId.trim(),
        decisionNumber: decisionNumber.trim(),
        date: date.trim(),
        form: form.trim(),
        reason: reason.trim(),
        description: description.trim(),
        file,
      });
      toast.success("Đã cập nhật kỷ luật");
      setEditOpen(false);
      await loadList();
    } catch (e: unknown) {
      const alreadyToasted = Boolean((e as any)?.__toastShown);
      if (!alreadyToasted) {
        const msg = e instanceof Error ? e.message : "Không cập nhật được kỷ luật";
        toast.error(msg);
      }
    } finally {
      setSaving(false);
    }
  };

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
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground">
              <AlertTriangle className="h-6 w-6 text-destructive" />
              Quản lý Kỷ luật
            </h1>
            <p className="text-muted-foreground">Theo dõi và xử lý vi phạm</p>
          </div>
          <Button className="gap-2" onClick={openCreate}>
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Thêm mới</span>
          </Button>
        </div>

        <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-xs text-muted-foreground">Tổng vụ việc</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-yellow-600">{stats.processing}</p>
              <p className="text-xs text-muted-foreground">Đang xử lý</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
              <p className="text-xs text-muted-foreground">Đã hoàn thành</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-blue-600">{stats.appealing}</p>
              <p className="text-xs text-muted-foreground">Khiếu nại</p>
            </CardContent>
          </Card>
        </div>

        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="grid gap-3 md:grid-cols-4 md:items-end">
              <div>
                <Label>Năm</Label>
                <Input type="number" value={year} onChange={(e) => setYear(Number(e.target.value) || new Date().getFullYear())} />
              </div>
              <div>
                <Label>Đảng viên (lọc)</Label>
                <Select
                  value={memberIdFilter ? memberIdFilter : "__all__"}
                  onValueChange={(v) => {
                    setPage(1);
                    setMemberIdFilter(v === "__all__" ? "" : v);
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue
                      placeholder={membersLoading ? "Đang tải..." : "Tất cả"}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">Tất cả</SelectItem>
                    {members
                      .map((m) => {
                        const pid = committeeMemberParticipantId(m);
                        if (!pid) return null;
                        return { id: pid, label: memberDisplayName(m) };
                      })
                      .filter(Boolean)
                      .slice(0, 200)
                      .map((x) => (
                        <SelectItem key={(x as any).id} value={(x as any).id}>
                          {(x as any).label}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Số dòng / trang</Label>
                <Input type="number" value={limit} onChange={(e) => setLimit(Math.max(1, Number(e.target.value) || 10))} />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => { setPage(1); void loadList(); }} disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Tải"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
          <TabsList className="mb-4">
            <TabsTrigger value="all">Tất cả</TabsTrigger>
            <TabsTrigger value="processing">Đang xử lý</TabsTrigger>
            <TabsTrigger value="completed">Đã hoàn thành</TabsTrigger>
            <TabsTrigger value="appealing">Khiếu nại</TabsTrigger>
          </TabsList>

          <TabsContent value={tab} className="space-y-4">
            {loading ? (
              <Card>
                <CardContent className="flex items-center justify-center gap-2 p-8 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Đang tải...
                </CardContent>
              </Card>
            ) : filteredByTab.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                  Không có vụ việc kỷ luật.
                </CardContent>
              </Card>
            ) : (
              filteredByTab.map((it) => {
                const st = statusLabel(String(it.status ?? ""));
                const pf = formLabel(it.form);
                const memberName =
                  members.find((m) => committeeMemberParticipantId(m) === it.memberId)
                    ? memberDisplayName(
                        members.find((m) => committeeMemberParticipantId(m) === it.memberId)!
                      )
                    : it.memberId.slice(0, 8);
                return (
                  <Card key={it.id} className="transition-shadow hover:shadow-md">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        <Avatar className="h-12 w-12">
                          <AvatarFallback className="bg-destructive/10 text-destructive">
                            {memberName.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <div className="mb-1 flex flex-wrap items-center gap-2">
                            <h3 className="font-semibold">{memberName}</h3>
                            <Badge className={pf.cls}>{pf.label}</Badge>
                            <Badge variant={st.variant} className={st.cls}>
                              {st.label}
                            </Badge>
                          </div>
                          <p className="mb-1 text-sm text-foreground">
                            Số QĐ: {it.decisionNumber}
                          </p>
                          <p className="line-clamp-1 text-sm text-muted-foreground">
                            {it.reason}
                          </p>
                          <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {it.date}
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => void openView(it)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => openEdit(it)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </TabsContent>
        </Tabs>
      </main>
      <BottomNav />

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Tạo kỷ luật mới</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-2 md:col-span-2">
              <Label>Chọn đảng viên bị kỷ luật</Label>
              <ManualParticipantPicker
                members={filteredMembers}
                loading={membersLoading}
                searchQuery={memberSearch}
                onSearchChange={setMemberSearch}
                selectedIds={formMemberId ? [formMemberId] : []}
                onAdd={(m) => {
                  const pid = committeeMemberParticipantId(m);
                  if (!pid) {
                    toast.error("Thiếu mã đảng viên (member.id) cho người này");
                    return;
                  }
                  setFormMemberId(pid);
                }}
                onRemove={() => setFormMemberId("")}
              />
            </div>
            <div className="grid gap-2">
              <Label>Số quyết định</Label>
              <Input value={decisionNumber} onChange={(e) => setDecisionNumber(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>Ngày ra quyết định (YYYY-MM-DD)</Label>
              <Input value={date} onChange={(e) => setDate(e.target.value)} placeholder="2026-04-14" />
            </div>
            <div className="grid gap-2">
              <Label>Hình thức kỷ luật</Label>
              <Input value={form} onChange={(e) => setForm(e.target.value)} placeholder="KHIEN_TRACH / CANH_CAO / CACH_CHUC / KHAI_TRU" />
            </div>
            <div className="grid gap-2">
              <Label>Lý do kỷ luật</Label>
              <Input value={reason} onChange={(e) => setReason(e.target.value)} />
            </div>
            <div className="grid gap-2 md:col-span-2">
              <Label>Mô tả chi tiết (tuỳ chọn)</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <div className="grid gap-2 md:col-span-2">
              <Label>File scan quyết định (PDF/PNG/JPG)</Label>
              <Input type="file" accept=".pdf,.png,.jpg,.jpeg" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={saving}>
              Hủy
            </Button>
            <Button onClick={() => void submitCreate()} disabled={saving}>
              {saving ? "Đang lưu..." : "Tạo mới"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Cập nhật kỷ luật</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-2 md:col-span-2">
              <Label>Đảng viên bị kỷ luật</Label>
              <ManualParticipantPicker
                members={filteredMembers}
                loading={membersLoading}
                searchQuery={memberSearch}
                onSearchChange={setMemberSearch}
                selectedIds={formMemberId ? [formMemberId] : []}
                onAdd={(m) => {
                  const pid = committeeMemberParticipantId(m);
                  if (!pid) {
                    toast.error("Thiếu mã đảng viên (member.id) cho người này");
                    return;
                  }
                  setFormMemberId(pid);
                }}
                onRemove={() => setFormMemberId("")}
              />
            </div>
            <div className="grid gap-2">
              <Label>Số quyết định</Label>
              <Input value={decisionNumber} onChange={(e) => setDecisionNumber(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>Ngày ra quyết định (YYYY-MM-DD)</Label>
              <Input value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>Hình thức kỷ luật</Label>
              <Input value={form} onChange={(e) => setForm(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>Lý do kỷ luật</Label>
              <Input value={reason} onChange={(e) => setReason(e.target.value)} />
            </div>
            <div className="grid gap-2 md:col-span-2">
              <Label>Mô tả chi tiết (tuỳ chọn)</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <div className="grid gap-2 md:col-span-2">
              <Label>Đổi file scan (tuỳ chọn)</Label>
              <Input type="file" accept=".pdf,.png,.jpg,.jpeg" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)} disabled={saving}>
              Hủy
            </Button>
            <Button onClick={() => void submitEdit()} disabled={saving}>
              {saving ? "Đang lưu..." : "Cập nhật"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View dialog */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Lịch sử kỷ luật</DialogTitle>
          </DialogHeader>
          {!active ? null : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                memberId: <span className="font-mono text-xs">{active.memberId}</span>
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
                    <Card key={row.id ?? idx}>
                      <CardContent className="p-4 text-sm">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="font-medium">
                            {String((row as any).decisionNumber ?? (row as any).decision_number ?? active.decisionNumber)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {String((row as any).date ?? "")}
                          </div>
                        </div>
                        <div className="mt-2">
                          <div className="text-muted-foreground">Lý do</div>
                          <div>{String((row as any).reason ?? "")}</div>
                        </div>
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

