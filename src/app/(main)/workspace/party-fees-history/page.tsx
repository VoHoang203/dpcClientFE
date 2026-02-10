"use client";

import { useState } from "react";
import {
  ArrowLeft,
  CreditCard,
  CheckCircle2,
  Clock,
  AlertCircle,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import BottomNav from "@/components/BottomNav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import PartyFeeDetailDialog from "@/components/profile/PartyFeeDetailDialog";

const feeHistory = [
  {
    id: "1",
    month: "Tháng 1/2025",
    amount: "50,000",
    status: "pending",
    dueDate: "31/01/2025",
  },
  {
    id: "2",
    month: "Tháng 12/2024",
    amount: "50,000",
    status: "paid",
    paidDate: "15/12/2024",
  },
  {
    id: "3",
    month: "Tháng 11/2024",
    amount: "50,000",
    status: "paid",
    paidDate: "10/11/2024",
  },
  {
    id: "4",
    month: "Tháng 10/2024",
    amount: "50,000",
    status: "paid",
    paidDate: "08/10/2024",
  },
  {
    id: "5",
    month: "Tháng 9/2024",
    amount: "50,000",
    status: "paid",
    paidDate: "12/09/2024",
  },
  {
    id: "6",
    month: "Tháng 8/2024",
    amount: "50,000",
    status: "paid",
    paidDate: "10/08/2024",
  },
];

const getStatusBadge = (status: string) => {
  switch (status) {
    case "paid":
      return (
        <Badge className="gap-1 bg-green-100 text-green-800">
          <CheckCircle2 className="h-3 w-3" />
          Đã đóng
        </Badge>
      );
    case "pending":
      return (
        <Badge className="gap-1 bg-yellow-100 text-yellow-800">
          <Clock className="h-3 w-3" />
          Chờ đóng
        </Badge>
      );
    case "overdue":
      return (
        <Badge className="gap-1 bg-red-100 text-red-800">
          <AlertCircle className="h-3 w-3" />
          Quá hạn
        </Badge>
      );
    default:
      return null;
  }
};

export default function PartyFeesHistoryWorkspacePage() {
  const [selectedFee, setSelectedFee] =
    useState<(typeof feeHistory)[0] | null>(null);
  const totalPaid = 300000;
  const yearlyTarget = 600000;
  const progressPercent = (totalPaid / yearlyTarget) * 100;

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-6">
      <main className="mx-auto max-w-5xl px-4 py-5">
        <Link
          href="/workspace"
          className="mb-4 inline-flex items-center gap-2 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Quay lại</span>
        </Link>

        <div className="mb-6">
          <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground">
            <CreditCard className="h-6 w-6 text-primary" />
            Đảng phí
          </h1>
          <p className="mt-1 text-muted-foreground">
            Thông tin đóng đảng phí năm 2025
          </p>
        </div>

        <Card className="mb-6 bg-party-gradient text-primary-foreground">
          <CardContent className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-sm text-primary-foreground/80">
                  Tổng đã đóng năm 2024
                </p>
                <p className="text-3xl font-bold">
                  {totalPaid.toLocaleString()}đ
                </p>
              </div>
              <div className="rounded-full bg-white/20 p-3">
                <TrendingUp className="h-6 w-6" />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-primary-foreground/80">
                  Tiến độ năm 2024
                </span>
                <span>{Math.round(progressPercent)}%</span>
              </div>
              <Progress value={progressPercent} className="h-2 bg-white/20" />
              <p className="text-xs text-primary-foreground/60">
                Còn {(yearlyTarget - totalPaid).toLocaleString()}đ để hoàn thành
                năm
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-6 border-2 border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between text-base">
              <span>Đảng phí tháng này</span>
              <Badge className="bg-yellow-100 text-yellow-800">Chưa đóng</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-foreground">50,000đ</p>
                <p className="text-sm text-muted-foreground">
                  Hạn: 31/01/2025
                </p>
              </div>
              <Button>Đóng ngay</Button>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Thông tin mức đóng</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Mức đảng phí/tháng</span>
              <span className="font-medium">50,000đ</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tỷ lệ % thu nhập</span>
              <span className="font-medium">1%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Hình thức đóng</span>
              <span className="font-medium">Chuyển khoản / Tiền mặt</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Lịch sử đóng phí</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {feeHistory.map((item, index) => (
              <div
                key={item.id}
                className={`flex cursor-pointer items-center justify-between p-4 transition-colors hover:bg-muted/50 ${
                  index < feeHistory.length - 1 ? "border-b" : ""
                }`}
                onClick={() => setSelectedFee(item)}
              >
                <div>
                  <p className="font-medium">{item.month}</p>
                  <p className="text-sm text-muted-foreground">
                    {item.status === "paid"
                      ? `Đóng: ${item.paidDate}`
                      : `Hạn: ${item.dueDate}`}
                  </p>
                </div>
                <div className="text-right">
                  <p className="mb-1 font-medium">{item.amount}đ</p>
                  {getStatusBadge(item.status)}
                </div>
              </div>
            ))}
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
