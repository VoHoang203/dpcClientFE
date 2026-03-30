"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ArrowLeft,
  UserCheck,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  Loader2,
  FileText,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";
import BottomNav from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  meetingService,
  type MeetingLeaveRequest,
} from "@/services/meetingService";
import { toast } from "sonner";

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

const LEAVE_STATUS_LABEL: Record<string, string> = {
  PENDING_EXCUSE: "Chờ duyệt",
  EXCUSED: "Đã miễn phép",
  ABSENT: "Vắng",
};

const OfflineAttendancePage = () => {
  const [attendees, setAttendees] = useState(mockAttendees);
  const [searchQuery, setSearchQuery] = useState("");

  const [leaveRequests, setLeaveRequests] = useState<MeetingLeaveRequest[]>([]);
  const [leaveLoading, setLeaveLoading] = useState(false);
  const [leavePage, setLeavePage] = useState(1);
  const [reviewingId, setReviewingId] = useState<string | null>(null);

  const loadLeaveRequests = useCallback(async () => {
    setLeaveLoading(true);
    try {
      const list = await meetingService.listLeaveRequests({
        page: leavePage,
        limit: 10,
      });
      setLeaveRequests(list);
    } catch (error) {
      const description =
        error instanceof Error ? error.message : "Không tải được đơn xin nghỉ";
      toast.error("Lỗi tải đơn xin nghỉ", { description });
      setLeaveRequests([]);
    } finally {
      setLeaveLoading(false);
    }
  }, [leavePage]);

  useEffect(() => {
    void loadLeaveRequests();
  }, [loadLeaveRequests]);

  const handleReviewExcused = async (attendeeId: string) => {
    setReviewingId(attendeeId);
    try {
      await meetingService.reviewLeaveRequest(attendeeId, "EXCUSED");
      toast.success("Đã phê duyệt đơn xin vắng");
      void loadLeaveRequests();
    } catch (error) {
      const description =
        error instanceof Error ? error.message : "Phê duyệt thất bại";
      toast.error("Không phê duyệt được", { description });
    } finally {
      setReviewingId(null);
    }
  };

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
          href="/workspace"
          className="mb-4 inline-flex items-center gap-2 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Quay lại Workspace</span>
        </Link>

        <div className="mb-6">
          <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground">
            <UserCheck className="h-6 w-6 text-primary" />
            Điểm danh Offline
          </h1>
          <p className="text-muted-foreground">
            Điểm danh theo từng cuộc họp: vào{" "}
            <Link href="/workspace/schedule-meeting" className="text-primary underline">
              Lịch họp
            </Link>{" "}
            → mở chi tiết → <strong>Kiểm tra điểm danh</strong> (PIN, không đổi URL).
          </p>
        </div>

        <Card className="mb-6">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Đơn xin nghỉ / vắng mặt</CardTitle>
            <p className="text-sm text-muted-foreground">
              Danh sách từ API, phê duyệt miễn phép (EXCUSED).
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            {leaveLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : leaveRequests.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                Không có đơn chờ xử lý.
              </p>
            ) : (
              <ul className="space-y-3">
                {leaveRequests.map((req) => {
                  const canApprove =
                    (req.status || "").toUpperCase() === "PENDING_EXCUSE";
                  return (
                    <li
                      key={req.id}
                      className="rounded-lg border border-border bg-card p-3 text-sm"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="font-medium">
                            {req.member?.fullName || "—"}
                          </p>
                          <p className="text-muted-foreground">
                            {req.meeting?.title}
                            {req.meeting?.startTime &&
                              ` · ${new Date(req.meeting.startTime).toLocaleString("vi-VN")}`}
                          </p>
                          {req.meeting?.location && (
                            <p className="text-xs text-muted-foreground">
                              {req.meeting.location}
                            </p>
                          )}
                          {req.partyCellName && (
                            <p className="text-xs text-muted-foreground">
                              {req.partyCellName}
                            </p>
                          )}
                        </div>
                        <Badge variant="outline">
                          {LEAVE_STATUS_LABEL[req.status] ?? req.status}
                        </Badge>
                      </div>
                      {req.reason && (
                        <p className="mt-2 text-muted-foreground">
                          <span className="font-medium text-foreground">Lý do:</span>{" "}
                          {req.reason}
                        </p>
                      )}
                      {req.proofUrl && (
                        <a
                          href={req.proofUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-2 inline-flex items-center gap-1 text-xs text-primary hover:underline"
                        >
                          <FileText className="h-3 w-3" />
                          Minh chứng
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                      {canApprove && (
                        <Button
                          type="button"
                          size="sm"
                          className="mt-3"
                          disabled={reviewingId === req.id}
                          onClick={() => void handleReviewExcused(req.id)}
                        >
                          {reviewingId === req.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            "Phê duyệt miễn phép (EXCUSED)"
                          )}
                        </Button>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
            <div className="flex justify-center gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={leavePage <= 1 || leaveLoading}
                onClick={() => setLeavePage((p) => Math.max(1, p - 1))}
              >
                Trang trước
              </Button>
              <span className="flex items-center px-2 text-sm text-muted-foreground">
                Trang {leavePage}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={leaveRequests.length < 10 || leaveLoading}
                onClick={() => setLeavePage((p) => p + 1)}
              >
                Trang sau
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardContent className="flex flex-col items-center p-6">
            <div className="mb-4 rounded-2xl border-2 border-dashed border-primary/30 bg-muted/30 p-6 text-center">
              <UserCheck className="mx-auto h-12 w-12 text-primary opacity-80" />
              <p className="mt-3 font-semibold text-foreground">
                Mã PIN thay cho QR
              </p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Mở chi tiết cuộc họp offline trong Lịch họp và bật điểm danh để
                hiển thị mã PIN (làm mới mỗi 30 giây).
              </p>
            </div>
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

        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Demo danh sách (máy khách)
        </p>
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
            <CardTitle className="text-lg">Danh sách điểm danh (demo)</CardTitle>
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
