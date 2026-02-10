"use client";

import { useState } from "react";
import {
  ArrowLeft,
  UserCheck,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  QrCode,
} from "lucide-react";
import Link from "next/link";
import BottomNav from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface Attendee {
  id: string;
  name: string;
  role: string;
  status: "present" | "absent" | "pending";
  checkedInAt?: string;
}

const mockAttendees: Attendee[] = [
  {
    id: "1",
    name: "Nguyễn Văn A",
    role: "Bí thư",
    status: "present",
    checkedInAt: "13:55",
  },
  {
    id: "2",
    name: "Trần Thị B",
    role: "Phó Bí thư",
    status: "present",
    checkedInAt: "13:58",
  },
  {
    id: "3",
    name: "Lê Văn C",
    role: "Chi ủy viên",
    status: "present",
    checkedInAt: "14:02",
  },
  { id: "4", name: "Phạm Thị D", role: "Đảng viên", status: "pending" },
  { id: "5", name: "Hoàng Văn E", role: "Đảng viên", status: "pending" },
  { id: "6", name: "Vũ Thị F", role: "Đảng viên", status: "absent" },
  { id: "7", name: "Đặng Văn G", role: "Đảng viên", status: "pending" },
  { id: "8", name: "Bùi Thị H", role: "Đảng viên", status: "pending" },
];

const OfflineAttendancePage = () => {
  const [attendees, setAttendees] = useState(mockAttendees);
  const [searchQuery, setSearchQuery] = useState("");

  const presentCount = attendees.filter((a) => a.status === "present").length;
  const absentCount = attendees.filter((a) => a.status === "absent").length;
  const pendingCount = attendees.filter((a) => a.status === "pending").length;

  const handleCheckIn = (id: string) => {
    setAttendees((prev) =>
      prev.map((a) =>
        a.id === id
          ? {
              ...a,
              status: "present" as const,
              checkedInAt: new Date().toLocaleTimeString("vi-VN", {
                hour: "2-digit",
                minute: "2-digit",
              }),
            }
          : a
      )
    );
  };

  const handleMarkAbsent = (id: string) => {
    setAttendees((prev) =>
      prev.map((a) =>
        a.id === id ? { ...a, status: "absent" as const, checkedInAt: undefined } : a
      )
    );
  };

  const filteredAttendees = attendees.filter((a) =>
    a.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-6">
      <main className="mx-auto max-w-3xl px-4 py-5">
        <Link
          href="/calendar"
          className="mb-4 inline-flex items-center gap-2 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Quay lại</span>
        </Link>

        <div className="mb-6">
          <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground">
            <UserCheck className="h-6 w-6 text-primary" />
            Điểm danh Offline
          </h1>
          <p className="text-muted-foreground">
            Họp Chi bộ tháng 1/2025 - 14:00
          </p>
        </div>

        <Card className="mb-6">
          <CardContent className="flex flex-col items-center p-6">
            <div className="mb-4 rounded-2xl border-2 border-dashed border-primary/30 bg-card p-6">
              <div className="relative flex h-48 w-48 items-center justify-center rounded-xl bg-foreground/5">
                <div className="grid grid-cols-7 gap-1 p-2">
                  {Array.from({ length: 49 }).map((_, i) => {
                    const isCorner =
                      ((i < 3 || (i >= 4 && i < 7)) && Math.floor(i / 7) < 3) ||
                      (i % 7 >= 4 && Math.floor(i / 7) < 3) ||
                      (i % 7 < 3 && Math.floor(i / 7) >= 4);
                    return (
                      <div
                        key={i}
                        className={`h-5 w-5 rounded-sm ${
                          (i * 7 + 3) % 10 > 4 || isCorner
                            ? "bg-foreground"
                            : "bg-transparent"
                        }`}
                      />
                    );
                  })}
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="rounded-lg bg-card p-1.5 shadow-md">
                    <QrCode className="h-6 w-6 text-primary" />
                  </div>
                </div>
              </div>
            </div>
            <p className="text-center font-semibold text-foreground">
              Quét mã QR để điểm danh
            </p>
            <p className="mt-1 text-center text-sm text-muted-foreground">
              Đảng viên quét mã này bằng ứng dụng để xác nhận có mặt
            </p>
          </CardContent>
        </Card>

        <div className="mb-6 grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <CheckCircle2 className="mx-auto mb-1 h-6 w-6 text-green-600" />
              <p className="text-2xl font-bold">{presentCount}</p>
              <p className="text-xs text-muted-foreground">Có mặt</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Clock className="mx-auto mb-1 h-6 w-6 text-yellow-600" />
              <p className="text-2xl font-bold">{pendingCount}</p>
              <p className="text-xs text-muted-foreground">Chờ điểm danh</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <XCircle className="mx-auto mb-1 h-6 w-6 text-red-600" />
              <p className="text-2xl font-bold">{absentCount}</p>
              <p className="text-xs text-muted-foreground">Vắng mặt</p>
            </CardContent>
          </Card>
        </div>

        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Tìm kiếm đảng viên..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Danh sách điểm danh</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {filteredAttendees.map((attendee, index) => (
              <div
                key={attendee.id}
                className={`flex items-center justify-between p-4 ${
                  index < filteredAttendees.length - 1 ? "border-b" : ""
                }`}
              >
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback
                      className={`${
                        attendee.status === "present"
                          ? "bg-green-100 text-green-800"
                          : attendee.status === "absent"
                            ? "bg-red-100 text-red-800"
                            : "bg-muted"
                      }`}
                    >
                      {attendee.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{attendee.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {attendee.role}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {attendee.status === "present" ? (
                    <Badge className="gap-1 bg-green-100 text-green-800">
                      <CheckCircle2 className="h-3 w-3" />
                      {attendee.checkedInAt}
                    </Badge>
                  ) : attendee.status === "absent" ? (
                    <Badge className="gap-1 bg-red-100 text-red-800">
                      <XCircle className="h-3 w-3" />
                      Vắng
                    </Badge>
                  ) : (
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 px-2"
                        onClick={() => handleCheckIn(attendee.id)}
                      >
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 px-2"
                        onClick={() => handleMarkAbsent(attendee.id)}
                      >
                        <XCircle className="h-4 w-4 text-red-600" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="mt-6 flex gap-3">
          <Button variant="outline" className="flex-1">
            Lưu nháp
          </Button>
          <Button className="flex-1">Hoàn thành điểm danh</Button>
        </div>
      </main>
      <BottomNav />
    </div>
  );
};

export default OfflineAttendancePage;
