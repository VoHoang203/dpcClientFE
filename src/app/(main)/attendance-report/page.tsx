"use client";

import { useState } from "react";
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  TrendingUp,
  BarChart3,
} from "lucide-react";
import Link from "next/link";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

const attendanceHistory = [
  {
    id: "1",
    title: "Họp Chi bộ tháng 1",
    date: "27/01/2025",
    status: "pending",
    week: 4,
    month: 1,
    year: 2025,
  },
  {
    id: "2",
    title: "Họp tổng kết năm 2024",
    date: "20/12/2024",
    status: "present",
    week: 51,
    month: 12,
    year: 2024,
  },
  {
    id: "3",
    title: "Họp Chi bộ tháng 12",
    date: "15/12/2024",
    status: "present",
    week: 50,
    month: 12,
    year: 2024,
  },
  {
    id: "4",
    title: "Họp Chi bộ tháng 11",
    date: "18/11/2024",
    status: "present",
    week: 47,
    month: 11,
    year: 2024,
  },
  {
    id: "5",
    title: "Họp Chi bộ tháng 10",
    date: "16/10/2024",
    status: "absent",
    week: 42,
    month: 10,
    year: 2024,
  },
  {
    id: "6",
    title: "Họp Chi bộ tháng 9",
    date: "14/09/2024",
    status: "present",
    week: 37,
    month: 9,
    year: 2024,
  },
  {
    id: "7",
    title: "Họp Chi bộ tháng 8",
    date: "17/08/2024",
    status: "present",
    week: 33,
    month: 8,
    year: 2024,
  },
  {
    id: "8",
    title: "Họp Chi bộ tháng 7",
    date: "13/07/2024",
    status: "present",
    week: 28,
    month: 7,
    year: 2024,
  },
];

type FilterType = "day" | "week" | "month" | "year";

const getStatusIcon = (status: string) => {
  switch (status) {
    case "present":
      return <CheckCircle2 className="h-5 w-5 text-green-600" />;
    case "absent":
      return <XCircle className="h-5 w-5 text-destructive" />;
    default:
      return <Clock className="h-5 w-5 text-muted-foreground" />;
  }
};

const getStatusLabel = (status: string) => {
  switch (status) {
    case "present":
      return "Có mặt";
    case "absent":
      return "Vắng mặt";
    default:
      return "Sắp tới";
  }
};

export default function AttendanceReportPage() {
  const [filter, setFilter] = useState<FilterType>("day");

  const getFilteredData = () => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    const currentWeek = Math.ceil(
      (now.getDate() + new Date(now.getFullYear(), now.getMonth(), 1).getDay()) /
        7
    );

    switch (filter) {
      case "week":
        return attendanceHistory.filter(
          (item) => item.year === currentYear && item.week === currentWeek
        );
      case "month":
        return attendanceHistory.filter(
          (item) => item.year === currentYear && item.month === currentMonth
        );
      case "year":
        return attendanceHistory.filter((item) => item.year === currentYear);
      default:
        return attendanceHistory;
    }
  };

  const filteredHistory = getFilteredData();
  const totalMeetings = filteredHistory.length;
  const presentCount = filteredHistory.filter(
    (item) => item.status === "present"
  ).length;
  const absentCount = filteredHistory.filter(
    (item) => item.status === "absent"
  ).length;
  const upcomingCount = filteredHistory.filter(
    (item) => item.status === "pending"
  ).length;
  const attendanceRate =
    totalMeetings - upcomingCount > 0
      ? (presentCount / (totalMeetings - upcomingCount)) * 100
      : 0;

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-6">
      <Header />
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
            Thống kê tham gia họp{" "}
            {filter === "year"
              ? "năm 2025"
              : filter === "month"
              ? "tháng này"
              : filter === "week"
              ? "tuần này"
              : "tất cả"}
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

        <Card className="mb-6 bg-party-gradient text-primary-foreground">
          <CardContent className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-sm text-primary-foreground/80">
                  Tỷ lệ tham gia
                </p>
                <p className="text-3xl font-bold">
                  {Math.round(attendanceRate)}%
                </p>
              </div>
              <div className="rounded-full bg-white/20 p-3">
                <TrendingUp className="h-6 w-6" />
              </div>
            </div>
            <Progress value={attendanceRate} className="h-2 bg-white/20" />
            <p className="mt-2 text-xs text-primary-foreground/60">
              {presentCount}/{totalMeetings - upcomingCount} cuộc họp đã tham gia
            </p>
          </CardContent>
        </Card>

        <div className="mb-6 grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <CheckCircle2 className="mx-auto mb-2 h-6 w-6 text-green-600" />
              <p className="text-2xl font-bold">{presentCount}</p>
              <p className="text-xs text-muted-foreground">Có mặt</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <XCircle className="mx-auto mb-2 h-6 w-6 text-destructive" />
              <p className="text-2xl font-bold">{absentCount}</p>
              <p className="text-xs text-muted-foreground">Vắng mặt</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Clock className="mx-auto mb-2 h-6 w-6 text-muted-foreground" />
              <p className="text-2xl font-bold">{upcomingCount}</p>
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
            {filteredHistory.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                Không có dữ liệu trong khoảng thời gian này
              </div>
            ) : (
              filteredHistory.map((item, index) => (
                <div
                  key={item.id}
                  className={`flex items-center justify-between p-4 ${
                    index < filteredHistory.length - 1 ? "border-b" : ""
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {getStatusIcon(item.status)}
                    <div>
                      <p className="font-medium">{item.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {item.date}
                      </p>
                    </div>
                  </div>
                  <Badge
                    variant={item.status === "present" ? "default" : "secondary"}
                    className={
                      item.status === "present"
                        ? "bg-green-100 text-green-800"
                        : item.status === "absent"
                        ? "bg-red-100 text-red-800"
                        : ""
                    }
                  >
                    {getStatusLabel(item.status)}
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </main>
      <BottomNav />
    </div>
  );
}
