"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  CreditCard,
  CheckCircle2,
  Clock,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import BottomNav from "@/components/BottomNav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  partyFeeService,
  type MyFeeMonthRow,
} from "@/services/partyFeeService";
import PartyFeeDetailDialog from "@/components/profile/PartyFeeDetailDialog";
import { toast } from "sonner";

type DialogFee = {
  id: string;
  month: string;
  amount?: string;
  status: string;
  paidDate?: string;
  dueDate?: string;
};

function parseMonthIndex(label: string): number | null {
  const n = parseInt(label.replace(/\D/g, ""), 10);
  return Number.isFinite(n) && n >= 1 && n <= 12 ? n : null;
}

function formatPaidDetail(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatPaidList(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("vi-VN");
}

export default function PartyFeesHistoryPage() {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const [year, setYear] = useState(currentYear);
  const [fees, setFees] = useState<MyFeeMonthRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFee, setSelectedFee] = useState<DialogFee | null>(null);

  const yearsOptions = useMemo(
    () => [
      currentYear - 3,
      currentYear - 2,
      currentYear - 1,
      currentYear,
      currentYear + 1,
    ],
    [currentYear],
  );

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      try {
        const rows = await partyFeeService.getMyFees(year);
        if (active) setFees(rows);
      } catch {
        if (active) {
          setFees([]);
          toast.error("Không tải được lịch sử đảng phí", {
            description: "Vui lòng thử lại sau.",
          });
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [year]);

  const totalMonths = fees.length > 0 ? fees.length : 12;
  const paidMonths = fees.filter((f) => f.isPaid).length;
  const unpaidMonths = Math.max(0, totalMonths - paidMonths);
  const progressPercent =
    totalMonths > 0 ? Math.round((paidMonths / totalMonths) * 100) : 0;

  const currentMonthRow = useMemo(() => {
    if (year !== currentYear || fees.length === 0) return null;
    return (
      fees.find((f) => parseMonthIndex(f.month) === currentMonth) ?? null
    );
  }, [fees, year, currentYear, currentMonth]);

  const openDetail = (row: MyFeeMonthRow, index: number) => {
    setSelectedFee({
      id: `${year}-${index}`,
      month: `${row.month}/${year}`,
      status: row.isPaid ? "paid" : "pending",
      paidDate: row.paidAt ? formatPaidDetail(row.paidAt) : undefined,
    });
  };

  const statusBadge = (isPaid: boolean) =>
    isPaid ? (
      <Badge className="gap-1 bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
        <CheckCircle2 className="h-3 w-3" />
        Đã đóng
      </Badge>
    ) : (
      <Badge className="gap-1 bg-yellow-100 text-yellow-800 dark:bg-amber-900/20 dark:text-amber-200">
        <Clock className="h-3 w-3" />
        Chưa đóng
      </Badge>
    );

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

        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground">
              <CreditCard className="h-6 w-6 text-primary" />
              Đảng phí
            </h1>
            <p className="mt-1 text-muted-foreground">
              Thông tin đóng đảng phí năm {year}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Năm</span>
            <Select
              value={String(year)}
              onValueChange={(v) => setYear(Number(v))}
            >
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {yearsOptions.map((y) => (
                  <SelectItem key={y} value={String(y)}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Card className="mb-6 bg-party-gradient text-primary-foreground">
          <CardContent className="p-6">
            {loading ? (
              <div className="space-y-4">
                <Skeleton className="h-8 w-48 bg-white/30" />
                <Skeleton className="h-2 w-full bg-white/20" />
                <Skeleton className="h-4 w-64 bg-white/20" />
              </div>
            ) : (
              <>
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm text-primary-foreground/80">
                      Tiến độ năm {year}
                    </p>
                    <p className="text-3xl font-bold">
                      {paidMonths}/{totalMonths} tháng
                    </p>
                    <p className="mt-1 text-sm text-primary-foreground/80">
                      Đã đóng đủ phí {paidMonths} trên {totalMonths} tháng trong
                      năm
                    </p>
                  </div>
                  <div className="rounded-full bg-white/20 p-3">
                    <TrendingUp className="h-6 w-6" />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-primary-foreground/80">
                      Hoàn thành
                    </span>
                    <span>
                      {progressPercent}% ({paidMonths}/{totalMonths})
                    </span>
                  </div>
                  <Progress
                    value={progressPercent}
                    className="h-2 bg-white/20"
                  />
                  <p className="text-xs text-primary-foreground/60">
                    {unpaidMonths > 0
                      ? `Còn ${unpaidMonths} tháng chưa đóng trong năm ${year}.`
                      : `Đã đóng đủ ${totalMonths} tháng trong năm ${year}.`}
                  </p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {currentMonthRow && year === currentYear && !loading && (
          <Card className="mb-6 border-2 border-primary/20">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center justify-between text-base">
                <span>
                  Đảng phí tháng {currentMonth}/{currentYear}
                </span>
                {statusBadge(currentMonthRow.isPaid)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  {currentMonthRow.isPaid && currentMonthRow.paidAt ? (
                    <p className="text-sm text-muted-foreground">
                      Đóng: {formatPaidList(currentMonthRow.paidAt)}
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Bạn chưa đóng phí tháng này.
                    </p>
                  )}
                </div>
                {!currentMonthRow.isPaid && (
                  <Button asChild>
                    <Link href="/workspace/party-fees">Đóng ngay</Link>
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Lịch sử đóng phí</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex flex-col gap-0 p-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between border-b py-4 last:border-0"
                  >
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-28" />
                      <Skeleton className="h-3 w-36" />
                    </div>
                    <Skeleton className="h-6 w-24 rounded-full" />
                  </div>
                ))}
              </div>
            ) : fees.length === 0 ? (
              <p className="p-6 text-center text-sm text-muted-foreground">
                Không có dữ liệu cho năm {year}.
              </p>
            ) : (
              fees.map((item, index) => (
                <div
                  key={`${item.month}-${index}`}
                  className={`flex cursor-pointer items-center justify-between gap-3 p-4 transition-colors hover:bg-muted/50 ${
                    index < fees.length - 1 ? "border-b" : ""
                  }`}
                  onClick={() => openDetail(item, index)}
                >
                  <div className="min-w-0">
                    <p className="font-medium">
                      {item.month}/{year}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {item.isPaid && item.paidAt
                        ? `Đóng: ${formatPaidList(item.paidAt)}`
                        : "Chưa đóng"}
                    </p>
                  </div>
                  <div className="shrink-0">{statusBadge(item.isPaid)}</div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </main>
      <BottomNav />
      <PartyFeeDetailDialog
        open={!!selectedFee}
        onClose={() => setSelectedFee(null)}
        fee={selectedFee}
      />
    </div>
  );
}
