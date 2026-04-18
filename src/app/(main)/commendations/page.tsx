"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Award, FileSearch, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import BottomNav from "@/components/BottomNav";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { fileService } from "@/services/fileService";
import {
  commendationService,
  type CommendationItem,
} from "@/services/commendationService";
import { toastServiceErrorOnce } from "@/lib/serviceErrorToast";

export default function CommendationsPublicPage() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<CommendationItem[]>([]);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [totalPages, setTotalPages] = useState(1);

  const title = useMemo(() => "Khen thưởng", []);

  const load = async () => {
    setLoading(true);
    try {
      const { items, meta } = await commendationService.list({ page, limit, year });
      setItems(items);
      setTotalPages(meta?.totalPages && meta.totalPages > 0 ? meta.totalPages : 1);
    } catch (e: unknown) {
      toastServiceErrorOnce(e, { fallbackMessage: "Không tải được danh sách khen thưởng" });
      setItems([]);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit, year]);

  return (
    <div className="min-h-0 flex-1 bg-background pb-20 md:pb-6">
      <main className="mx-auto max-w-6xl px-4 py-6">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground">
              <Award className="h-6 w-6 text-primary" />
              {title}
            </h1>
            <p className="text-muted-foreground">Danh sách khen thưởng toàn Chi bộ</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" className="gap-2" onClick={() => void load()} disabled={loading}>
              <RefreshCw className="h-4 w-4" />
              Tải lại
            </Button>
            <Button asChild>
              <Link href="/workspace/rewards-penalties">Hồ sơ của tôi</Link>
            </Button>
          </div>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Bộ lọc</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-3 md:items-end">
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
                <Button variant="outline" onClick={() => void load()} disabled={loading}>
                  {loading ? "Đang tải..." : "Tải"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Danh sách</CardTitle>
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
                    <TableHead>Danh hiệu</TableHead>
                    <TableHead>Số QĐ</TableHead>
                    <TableHead>Ngày</TableHead>
                    <TableHead>Cấp ký</TableHead>
                    <TableHead className="text-right">File</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                        Đang tải...
                      </TableCell>
                    </TableRow>
                  ) : items.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                        Không có dữ liệu.
                      </TableCell>
                    </TableRow>
                  ) : (
                    items.map((it) => (
                      <TableRow key={it.id}>
                        <TableCell className="font-medium">
                          {it.memberName?.trim() || it.memberId}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{it.title}</Badge>
                        </TableCell>
                        <TableCell className="font-mono text-xs">{it.decisionNumber}</TableCell>
                        <TableCell>{it.date}</TableCell>
                        <TableCell>{it.signingAuthority}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-2"
                            onClick={() =>
                              fileService.openInNewTab(String(it.fileUrl ?? ""))
                            }
                            disabled={!it.fileUrl?.trim()}
                          >
                            <FileSearch className="h-4 w-4" />
                            Xem
                          </Button>
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
    </div>
  );
}

