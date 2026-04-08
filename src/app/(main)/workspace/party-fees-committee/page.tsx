"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { FileSpreadsheet, Search, Wallet } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
import { toast } from "@/hooks/use-toast";
import CommitteePartyFeeDetailDialog from "@/components/workspace/CommitteePartyFeeDetailDialog";
import {
  partyFeeService,
  isPartyFeePaidStatus,
  type PartyFeeRecord,
} from "@/services/partyFeeService";
import { formatVnDate } from "@/lib/formatVnDate";
import type { PaginationMeta } from "@/lib/apiEnvelope";

function genderLabel(g: string | null): string {
  if (!g) return "—";
  const u = g.toUpperCase();
  if (u === "MALE" || u === "NAM") return "Nam";
  if (u === "FEMALE" || u === "NU" || u === "NỮ") return "Nữ";
  return g;
}

function escapeCsvField(value: string): string {
  const s = value.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  if (/[",\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export default function PartyFeesCommitteePage() {
  const now = new Date();
  const [month, setMonth] = useState<number>(now.getMonth() + 1);
  const [year, setYear] = useState<number>(now.getFullYear());
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [items, setItems] = useState<PartyFeeRecord[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<PartyFeeRecord | null>(null);
  const [usernameSearch, setUsernameSearch] = useState("");

  const filteredItems = useMemo(() => {
    const q = usernameSearch.trim().toLowerCase();
    if (!q) return items;
    return items.filter((row) => {
      const un = (row.member?.username ?? "").toLowerCase();
      return un.includes(q);
    });
  }, [items, usernameSearch]);

  const exportToExcelCsv = useCallback(() => {
    if (filteredItems.length === 0) {
      toast({ title: "Không có dữ liệu để xuất" });
      return;
    }
    const headers = [
      "Họ và tên",
      "Username",
      "Ngày sinh",
      "Giới tính",
      "Điện thoại",
      "Đóng phí",
      "Tháng",
      "Năm",
    ];
    const lines = [
      headers.map(escapeCsvField).join(","),
      ...filteredItems.map((row) => {
        const m = row.member;
        const paid = isPartyFeePaidStatus(row.status);
        const dob =
          m?.dob != null && String(m.dob).trim()
            ? formatVnDate(m.dob)
            : "";
        const gen = m?.gender ? genderLabel(m.gender) : "";
        return [
          m?.fullName?.trim() ?? "",
          m?.username ?? "",
          dob,
          gen === "—" ? "" : gen,
          m?.phone?.trim() ?? "",
          paid ? "Đã đóng" : "Chưa đóng",
          String(row.month),
          String(row.year),
        ]
          .map(escapeCsvField)
          .join(",");
      }),
    ];
    const blob = new Blob(["\uFEFF" + lines.join("\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `dang-phi_T${String(month).padStart(2, "0")}-${year}_trang-${page}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({
      title: "Đã xuất file",
      description: "CSV UTF-8 — mở trực tiếp bằng Excel.",
    });
  }, [filteredItems, month, year, page]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { items: list, meta: m } = await partyFeeService.list({
        month,
        year,
        page,
        limit,
      });
      setItems(list);
      setMeta(m);
    } catch (e: unknown) {
      const message =
        e instanceof Error ? e.message : "Không tải được danh sách đảng phí";
      toast({ title: "Lỗi", description: message });
      setItems([]);
      setMeta(null);
    } finally {
      setLoading(false);
    }
  }, [month, year, page, limit]);

  useEffect(() => {
    load();
  }, [load]);

  const totalPages =
    meta?.totalPages && meta.totalPages > 0 ? meta.totalPages : 1;

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-6">
      <main className="w-full min-w-0 px-4 py-5 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground">
            <Wallet className="h-7 w-7 text-primary" />
            Kiểm soát đảng phí
          </h1>
          <p className="text-muted-foreground">
            Danh sách đóng phí theo chi bộ — tháng / năm
          </p>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base">Bộ lọc</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 md:flex-row md:items-end">
            <div className="flex-1 space-y-2">
              <label className="text-sm font-medium">Tháng</label>
              <Select
                value={String(month)}
                onValueChange={(v) => {
                  setPage(1);
                  setMonth(Number(v));
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Tháng" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                    <SelectItem key={m} value={String(m)}>
                      Tháng {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 space-y-2">
              <label className="text-sm font-medium">Năm</label>
              <Input
                type="number"
                value={year}
                onChange={(e) => {
                  const n = Number(e.target.value);
                  setPage(1);
                  setYear(Number.isFinite(n) ? n : now.getFullYear());
                }}
              />
            </div>
            <div className="flex-1 space-y-2">
              <label className="text-sm font-medium">Số dòng / trang</label>
              <Input
                type="number"
                min={1}
                value={limit}
                onChange={(e) => {
                  const n = Number(e.target.value);
                  setPage(1);
                  setLimit(Number.isFinite(n) && n > 0 ? n : 10);
                }}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Tìm trên trang (username)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative min-w-0 flex-1 sm:max-w-xl">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Tìm theo username..."
                  value={usernameSearch}
                  onChange={(e) => setUsernameSearch(e.target.value)}
                  className="pl-9"
                  aria-label="Tìm theo username"
                />
              </div>
              <Button
                type="button"
                variant="outline"
                className="shrink-0 gap-2"
                onClick={exportToExcelCsv}
                disabled={loading || items.length === 0}
              >
                <FileSpreadsheet className="h-4 w-4" />
                Xuất Excel
              </Button>
            </div>
            {usernameSearch.trim() ? (
              <p className="mt-2 text-xs text-muted-foreground">
                Khớp {filteredItems.length}/{items.length} dòng trên trang này.
              </p>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 space-y-0">
            <CardTitle className="text-base">
              Danh sách (
              {usernameSearch.trim()
                ? `${filteredItems.length}/${items.length} trên trang này`
                : `${meta?.totalItems ?? items.length} bản ghi`}
              )
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={loading || page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Trước
              </Button>
              <span className="text-sm text-muted-foreground">
                Trang {page} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={loading || page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Sau
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Đang tải...
              </p>
            ) : items.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Không có dữ liệu cho tháng {month}/{year}
              </p>
            ) : filteredItems.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Không có dòng nào khớp username &quot;{usernameSearch.trim()}
                &quot; trên trang này.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Họ và tên</TableHead>
                    <TableHead className="hidden sm:table-cell">
                      Ngày sinh
                    </TableHead>
                    <TableHead className="hidden md:table-cell">
                      Giới tính
                    </TableHead>
                    <TableHead>Điện thoại</TableHead>
                    <TableHead className="whitespace-nowrap">Đóng phí</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.map((row) => {
                    const m = row.member;
                    const paid = isPartyFeePaidStatus(row.status);
                    return (
                      <TableRow
                        key={row.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => setSelected(row)}
                      >
                        <TableCell className="font-medium">
                          {m?.fullName?.trim() || "—"}
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          {formatVnDate(m?.dob ?? null)}
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          {genderLabel(m?.gender ?? null)}
                        </TableCell>
                        <TableCell>{m?.phone?.trim() || "—"}</TableCell>
                        <TableCell>
                          {paid ? (
                            <Badge className="border-0 bg-green-600 text-white hover:bg-green-600">
                              Đã đóng
                            </Badge>
                          ) : (
                            <Badge className="border-0 bg-red-600 text-white hover:bg-red-600">
                              Chưa đóng
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>
      <BottomNav />
      <CommitteePartyFeeDetailDialog
        record={selected}
        open={!!selected}
        onClose={() => setSelected(null)}
      />
    </div>
  );
}
