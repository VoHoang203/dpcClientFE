"use client";

import { useEffect, useState } from "react";
import {
  CreditCard,
  CheckCircle2,
  AlertCircle,
  CalendarDays,
} from "lucide-react";
import Link from "next/link";
import BottomNav from "@/components/BottomNav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import {
  partyFeeService,
  type MyFeeMonthRow,
} from "@/services/partyFeeService";

export default function PartyFeesHistoryWorkspacePage() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState<number>(currentYear);
  const [fees, setFees] = useState<MyFeeMonthRow[]>([]);
  const [loading, setLoading] = useState(true);

  const yearsOptions = [
    currentYear - 2,
    currentYear - 1,
    currentYear,
    currentYear + 1,
  ];

  useEffect(() => {
    let active = true;
    const fetchFees = async () => {
      setLoading(true);
      try {
        const list = await partyFeeService.getMyFees(year);
        if (active) setFees(list);
      } catch (err) {
        console.error("Failed to fetch my fees:", err);
      } finally {
        if (active) setLoading(false);
      }
    };
    fetchFees();
    return () => {
      active = false;
    };
  }, [year]);

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-6">
      <main className="w-full min-w-0 px-4 py-5 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground">
            <CreditCard className="h-7 w-7 text-primary" />
            Lịch sử đảng phí
          </h1>
          <p className="text-muted-foreground mt-1">
            Thông tin và lịch sử đóng đảng phí của bạn
          </p>
        </div>

        {(() => {
          const currentMonthNum = new Date().getMonth() + 1;
          const currentMonthFee =
            year === currentYear
              ? fees.find(
                  (f) =>
                    parseInt(f.month.replace(/\D/g, ""), 10) === currentMonthNum
                )
              : null;

          if (year !== currentYear || loading || !currentMonthFee) return null;

          const isPaid = currentMonthFee.isPaid;

          return (
            <Card className="mb-6 border shadow-sm bg-card">
              <CardContent className="flex flex-col items-center justify-center p-6 text-center md:py-8">
                {isPaid ? (
                  <div className="mb-4 rounded-full bg-green-50 p-3 dark:bg-green-500/10 text-green-600 dark:text-green-500">
                    <CheckCircle2 className="h-10 w-10" />
                  </div>
                ) : (
                  <div className="mb-4 rounded-full bg-red-50 p-3 dark:bg-red-500/10 text-red-600 dark:text-red-500">
                    <AlertCircle className="h-10 w-10" />
                  </div>
                )}

                <h2 className="mb-2 text-xl font-bold md:text-2xl text-foreground">
                  Tháng {currentMonthNum}/{currentYear}
                </h2>

                {isPaid ? (
                  <div className="space-y-1">
                    <p className="text-base font-medium text-muted-foreground">
                      Bạn đã hoàn thành việc đóng đảng phí.
                    </p>
                    {currentMonthFee.paidAt && (
                      <p className="text-sm text-muted-foreground">
                        Ngày đóng:{" "}
                        {new Date(currentMonthFee.paidAt).toLocaleDateString(
                          "vi-VN"
                        )}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-1">
                    <p className="text-base font-medium text-red-600 dark:text-red-500">
                      Bạn chưa đóng đảng phí tháng {currentMonthNum}.
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Vui lòng hoàn thành phí trong tháng này.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })()}

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="text-base font-bold">
              Tình trạng đóng phí năm {year}
            </CardTitle>
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground hidden sm:inline">Năm:</span>
              <Select
                value={year.toString()}
                onValueChange={(val) => setYear(Number(val))}
              >
                <SelectTrigger className="h-8 w-[100px] text-xs">
                  <SelectValue placeholder="Năm" />
                </SelectTrigger>
                <SelectContent>
                  {yearsOptions.map((y) => (
                    <SelectItem key={y} value={y.toString()} className="text-xs">
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex flex-col p-4 gap-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-3 w-40" />
                    </div>
                    <Skeleton className="h-6 w-20 rounded-full" />
                  </div>
                ))}
              </div>
            ) : fees.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Không có dữ liệu đóng phí cho năm {year}
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tháng</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead className="hidden sm:table-cell">Ngày đóng</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fees
                    .filter((item) => {
                      const currentMonth = new Date().getMonth() + 1;
                      if (year < currentYear) return true;
                      if (year > currentYear) return false;
                      const m = parseInt(item.month.replace(/\D/g, ""), 10);
                      return !isNaN(m) ? m <= currentMonth : true;
                    })
                    .map((item, index) => {
                      const isPaid = item.isPaid;
                      return (
                        <TableRow
                          key={index}
                          className="hover:bg-muted/50 transition-colors"
                        >
                          <TableCell className="font-medium whitespace-nowrap">
                            {item.month}
                          </TableCell>
                          <TableCell>
                            {isPaid ? (
                              <Badge className="border-0 bg-green-600 text-white hover:bg-green-600 px-2 py-0.5">
                                Đã đóng
                              </Badge>
                            ) : (
                              <Badge className="border-0 bg-red-600 text-white hover:bg-red-600 px-2 py-0.5">
                                Chưa đóng
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="hidden sm:table-cell">
                            {isPaid && item.paidAt
                              ? new Date(item.paidAt).toLocaleDateString("vi-VN")
                              : "—"}
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
    </div>
  );
}
