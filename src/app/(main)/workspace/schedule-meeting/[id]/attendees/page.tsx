"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  UserCheck,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  Loader2,
  RefreshCw,
  Video,
  MapPin,
  FileText,
  ExternalLink,
  PenLine,
  StopCircle,
} from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  meetingService,
  type MeetingAttendanceRecord,
  type MeetingDetail,
  type MeetingLeaveRequest,
} from "@/services/meetingService";
import {
  formatMeetingDateTime,
  isOfflineMeeting,
  mapAttendanceStatusToRowStatus,
} from "@/lib/meetingAttendanceUi";
import { toast } from "sonner";

const PIN_REFRESH_MS = 30_000;

function formatDurationSeconds(sec: number | null | undefined): string {
  if (sec == null || !Number.isFinite(sec) || sec <= 0) return "—";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  if (m >= 60) {
    const h = Math.floor(m / 60);
    const mm = m % 60;
    return `${h}h ${mm}p`;
  }
  return `${m}p ${s}s`;
}

const LEAVE_STATUS_LABEL: Record<string, string> = {
  PENDING_EXCUSE: "Chờ duyệt",
  EXCUSED: "Đã miễn phép",
  ABSENT: "Vắng",
};

const MANUAL_STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "PRESENT", label: "Có mặt (PRESENT)" },
  { value: "ABSENT", label: "Vắng (ABSENT)" },
  { value: "EXCUSED", label: "Miễn phép (EXCUSED)" },
  { value: "PENDING_EXCUSE", label: "Chờ duyệt nghỉ (PENDING_EXCUSE)" },
];

const MANUAL_API_STATUS_SET = new Set(MANUAL_STATUS_OPTIONS.map((o) => o.value));

function coerceManualApiStatus(raw: string | undefined): string {
  const s = (raw || "PRESENT").toUpperCase();
  return MANUAL_API_STATUS_SET.has(s) ? s : "PRESENT";
}

export default function MeetingAttendeesPage() {
  const params = useParams();
  const meetingId = typeof params.id === "string" ? params.id : "";

  const [meeting, setMeeting] = useState<MeetingDetail | null>(null);
  const [loadingMeeting, setLoadingMeeting] = useState(true);
  const [records, setRecords] = useState<MeetingAttendanceRecord[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const [togglingCheckin, setTogglingCheckin] = useState(false);
  const [pin, setPin] = useState("");
  const [pinLoading, setPinLoading] = useState(false);
  const [pinError, setPinError] = useState<string | null>(null);

  const [leaveRequests, setLeaveRequests] = useState<MeetingLeaveRequest[]>([]);
  const [leaveLoading, setLeaveLoading] = useState(false);
  const [reviewingId, setReviewingId] = useState<string | null>(null);

  const [manualDialogOpen, setManualDialogOpen] = useState(false);
  const [manualRecord, setManualRecord] = useState<MeetingAttendanceRecord | null>(
    null
  );
  const [manualStatus, setManualStatus] = useState("PRESENT");
  const [manualReason, setManualReason] = useState("");
  const [manualSubmitting, setManualSubmitting] = useState(false);

  const [endMeetingDialogOpen, setEndMeetingDialogOpen] = useState(false);
  const [endingMeeting, setEndingMeeting] = useState(false);

  const offline = isOfflineMeeting(meeting);
  const checkinActive = Boolean(
    meeting?.isCheckinActive ?? meeting?.is_checkin_active
  );

  const meetingAlreadyClosed =
    meeting?.status === "FINISHED" || meeting?.status === "CANCELLED";

  const loadMeeting = useCallback(async () => {
    if (!meetingId) return;
    setLoadingMeeting(true);
    try {
      const d = await meetingService.getMeetingDetail(meetingId);
      setMeeting(d);
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Không tải được thông tin cuộc họp"
      );
      setMeeting(null);
    } finally {
      setLoadingMeeting(false);
    }
  }, [meetingId]);

  const loadRecords = useCallback(async () => {
    if (!meetingId) return;
    setLoadingRecords(true);
    try {
      const list = await meetingService.listMeetingAttendanceRecords(meetingId);
      setRecords(list);
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Không tải được danh sách điểm danh"
      );
      setRecords([]);
    } finally {
      setLoadingRecords(false);
    }
  }, [meetingId]);

  const loadLeaveRequests = useCallback(async () => {
    if (!meetingId) return;
    setLeaveLoading(true);
    try {
      const all = await meetingService.listLeaveRequests({
        page: 1,
        limit: 100,
      });
      setLeaveRequests(all.filter((r) => r.meeting?.id === meetingId));
    } catch {
      setLeaveRequests([]);
    } finally {
      setLeaveLoading(false);
    }
  }, [meetingId]);

  useEffect(() => {
    void loadMeeting();
  }, [loadMeeting]);

  useEffect(() => {
    void loadRecords();
  }, [loadRecords]);

  useEffect(() => {
    if (meeting) void loadLeaveRequests();
  }, [meeting, loadLeaveRequests]);

  const fetchPin = useCallback(async () => {
    if (!meetingId || !checkinActive || !offline) return;
    setPinLoading(true);
    setPinError(null);
    try {
      const code = await meetingService.getMeetingPin(meetingId);
      setPin(code || "—");
    } catch (e) {
      setPinError(e instanceof Error ? e.message : "Không lấy được mã PIN");
      setPin("");
    } finally {
      setPinLoading(false);
    }
  }, [meetingId, checkinActive, offline]);

  useEffect(() => {
    if (!offline || !checkinActive || !meetingId) return;
    void fetchPin();
    const t = setInterval(() => void fetchPin(), PIN_REFRESH_MS);
    return () => clearInterval(t);
  }, [offline, checkinActive, meetingId, fetchPin]);

  const handleConfirmEndMeeting = async () => {
    if (!meetingId) return;
    setEndingMeeting(true);
    try {
      const msg = await meetingService.endMeeting(meetingId);
      toast.success(msg);
      setEndMeetingDialogOpen(false);
      void loadMeeting();
      void loadRecords();
      void loadLeaveRequests();
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Kết thúc cuộc họp thất bại"
      );
    } finally {
      setEndingMeeting(false);
    }
  };

  const handleToggleCheckin = async () => {
    if (!meetingId) return;
    setTogglingCheckin(true);
    try {
      await meetingService.toggleMeetingCheckin(meetingId);
      await loadMeeting();
      toast.success("Đã cập nhật chế độ điểm danh");
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Không bật/tắt được điểm danh"
      );
    } finally {
      setTogglingCheckin(false);
    }
  };

  const openManualDialog = (r: MeetingAttendanceRecord) => {
    setManualRecord(r);
    setManualStatus(coerceManualApiStatus(r.status));
    setManualReason((r.reason || "").trim());
    setManualDialogOpen(true);
  };

  const submitManualAttendance = async () => {
    if (!meetingId || !manualRecord?.member?.id) {
      toast.error("Thiếu mã thành viên hoặc cuộc họp");
      return;
    }
    setManualSubmitting(true);
    try {
      await meetingService.submitManualAttendance(meetingId, [
        {
          memberId: manualRecord.member.id,
          status: manualStatus,
          reason: manualReason.trim(),
        },
      ]);
      toast.success("Đã cập nhật điểm danh thủ công");
      setManualDialogOpen(false);
      setManualRecord(null);
      void loadRecords();
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Cập nhật điểm danh thất bại"
      );
    } finally {
      setManualSubmitting(false);
    }
  };

  const handleReviewExcused = async (attendeeRowId: string) => {
    setReviewingId(attendeeRowId);
    try {
      await meetingService.reviewLeaveRequest(attendeeRowId, "EXCUSED");
      toast.success("Đã phê duyệt đơn xin vắng");
      void loadLeaveRequests();
      void loadRecords();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Phê duyệt thất bại");
    } finally {
      setReviewingId(null);
    }
  };

  const filteredRecords = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return records;
    return records.filter((r) => {
      const name = (r.member?.fullName || r.member?.user?.username || "").toLowerCase();
      const email = (r.member?.user?.email || "").toLowerCase();
      return name.includes(q) || email.includes(q);
    });
  }, [records, searchQuery]);

  const presentCount = records.filter(
    (r) => mapAttendanceStatusToRowStatus(r.status) === "present"
  ).length;
  const absentCount = records.filter(
    (r) => mapAttendanceStatusToRowStatus(r.status) === "absent"
  ).length;
  const pendingCount = records.filter((r) => {
    const u = mapAttendanceStatusToRowStatus(r.status);
    return u === "pending" || u === "pending_excuse";
  }).length;

  if (!meetingId) {
    return (
      <div className="p-6 text-center text-sm text-muted-foreground">
        Thiếu mã cuộc họp
      </div>
    );
  }

  const handleJoinMeet = () => {
    if (meeting && meeting.onlineLink) {
      window.postMessage(
        {
          type: "SET_ACTIVE_MEETING",
          meetingId: meeting.id,
        },
        "*"
      );
      window.open(meeting.onlineLink, "_blank", "noopener,noreferrer");
    } else {
      alert("Chưa có link Google Meet!");
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-6">
      <main className="mx-auto max-w-3xl px-4 py-5">
        <Link
          href="/workspace/schedule-meeting"
          className="mb-4 inline-flex items-center gap-2 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Quay lại lịch họp
        </Link>

        {loadingMeeting && !meeting ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
          </div>
        ) : meeting ? (
          <>
            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <h1 className="flex flex-wrap items-center gap-2 text-2xl font-bold">
                  <UserCheck className="h-7 w-7 shrink-0 text-primary" />
                  Điểm danh
                </h1>
                <p className="mt-1 text-muted-foreground">{meeting.title}</p>
                <div className="mt-2 flex flex-wrap gap-2 text-sm text-muted-foreground">
                  <span>{formatMeetingDateTime(meeting.startTime)}</span>
                  <Badge variant="outline">
                    {offline ? "Offline" : "Online"}
                  </Badge>
                  {meeting.status === "FINISHED" ? (
                    <Badge className="bg-green-100 text-green-800">Đã kết thúc</Badge>
                  ) : meeting.status === "CANCELLED" ? (
                    <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300">
                      Đã hủy
                    </Badge>
                  ) : null}
                </div>
                {meeting.onlineLink ? (
                  <Button
                    type="button"
                    variant="link"
                    onClick={handleJoinMeet}
                    className="mt-2 flex items-center gap-1 text-blue-600 hover:underline h-auto p-0 text-sm"
                  >
                    <Video className="h-4 w-4" />
                    Tham gia Google Meet
                    <ExternalLink className="h-3 w-3" />
                  </Button>
                ) : meeting.location ? (
                  <p className="mt-2 flex items-center gap-1 text-sm">
                    <MapPin className="h-4 w-4" />
                    {meeting.location}
                  </p>
                ) : null}
              </div>
              <Button
                type="button"
                variant="destructive"
                className="shrink-0 gap-2 self-start"
                disabled={meetingAlreadyClosed || endingMeeting}
                onClick={() => setEndMeetingDialogOpen(true)}
              >
                <StopCircle className="h-4 w-4" />
                Kết thúc cuộc họp
              </Button>
            </div>

            <Card className="mb-6">
              <CardContent className="space-y-4 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <Label htmlFor="attendance-toggle">
                      {offline ? "Bật điểm danh offline (PIN)" : "Bật điểm danh (Online)"}
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {offline
                        ? `Làm mới mỗi ${PIN_REFRESH_MS / 1000}s.`
                        : "Bật điểm danh để ghi nhận sự tham gia của thành viên vào cuộc họp."}
                    </p>
                  </div>
                  <Switch
                    id="attendance-toggle"
                    checked={checkinActive}
                    disabled={togglingCheckin || meetingAlreadyClosed}
                    onCheckedChange={() => void handleToggleCheckin()}
                  />
                </div>
                {offline && checkinActive && (
                  <div className="rounded-xl border border-dashed border-primary/40 bg-muted/30 p-6 text-center">
                    {pinLoading && !pin ? (
                      <Loader2 className="mx-auto h-8 w-8 animate-spin" />
                    ) : (
                      <p className="font-mono text-4xl font-bold tracking-[0.2em]">
                        {pin || "—"}
                      </p>
                    )}
                    {pinError && (
                      <p className="mt-2 text-xs text-destructive">{pinError}</p>
                    )}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="mt-3 gap-1"
                      onClick={() => void fetchPin()}
                      disabled={pinLoading}
                    >
                      <RefreshCw
                        className={`h-3.5 w-3.5 ${pinLoading ? "animate-spin" : ""}`}
                      />
                      Làm mới mã
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="mb-6">
              <CardHeader className="flex flex-row items-start justify-between gap-3 pb-2">
                <div className="min-w-0 space-y-1">
                  <CardTitle className="text-lg">
                    Đơn xin nghỉ (cuộc họp này)
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">
                    Danh sách lọc theo cuộc họp hiện tại; phê duyệt gửi trạng thái
                    EXCUSED.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="shrink-0 gap-1"
                  onClick={() => void loadLeaveRequests()}
                  disabled={leaveLoading}
                >
                  <RefreshCw
                    className={`h-4 w-4 ${leaveLoading ? "animate-spin" : ""}`}
                  />
                  Tải lại
                </Button>
              </CardHeader>
              <CardContent>
                {leaveLoading ? (
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                ) : leaveRequests.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Không có đơn liên quan cuộc họp này.
                  </p>
                ) : (
                  <ul className="space-y-3">
                    {leaveRequests.map((req) => {
                      const canApprove =
                        (req.status || "").toUpperCase() === "PENDING_EXCUSE";
                      return (
                        <li
                          key={req.id}
                          className="rounded-lg border border-border p-3 text-sm"
                        >
                          <div className="flex flex-wrap justify-between gap-2">
                            <span className="font-medium">
                              {req.member?.fullName || "—"}
                            </span>
                            <Badge variant="outline">
                              {LEAVE_STATUS_LABEL[req.status] ?? req.status}
                            </Badge>
                          </div>
                          {req.reason && (
                            <p className="mt-2 text-muted-foreground">{req.reason}</p>
                          )}
                          {req.proofUrl && (
                            <a
                              href={req.proofUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="mt-1 inline-flex items-center gap-1 text-xs text-primary"
                            >
                              <FileText className="h-3 w-3" />
                              Minh chứng
                            </a>
                          )}
                          {canApprove && (
                            <Button
                              type="button"
                              size="sm"
                              className="mt-2"
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
              </CardContent>
            </Card>

            <div className="mb-6 grid grid-cols-3 gap-2">
              <Card>
                <CardContent className="p-3 text-center">
                  <CheckCircle2 className="mx-auto mb-1 h-5 w-5 text-green-600" />
                  <p className="text-xl font-bold">{presentCount}</p>
                  <p className="text-[10px] text-muted-foreground">Có mặt</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3 text-center">
                  <Clock className="mx-auto mb-1 h-5 w-5 text-yellow-600" />
                  <p className="text-xl font-bold">{pendingCount}</p>
                  <p className="text-[10px] text-muted-foreground">Chờ</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3 text-center">
                  <XCircle className="mx-auto mb-1 h-5 w-5 text-red-600" />
                  <p className="text-xl font-bold">{absentCount}</p>
                  <p className="text-[10px] text-muted-foreground">Vắng</p>
                </CardContent>
              </Card>
            </div>

            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Tìm theo tên hoặc email..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between py-3">
                <CardTitle className="text-lg">Danh sách điểm danh</CardTitle>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1"
                  onClick={() => void loadRecords()}
                  disabled={loadingRecords}
                >
                  <RefreshCw
                    className={`h-4 w-4 ${loadingRecords ? "animate-spin" : ""}`}
                  />
                  Tải lại
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                {loadingRecords && records.length === 0 ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : filteredRecords.length === 0 ? (
                  <p className="p-6 text-center text-sm text-muted-foreground">
                    Không có bản ghi
                  </p>
                ) : (
                  filteredRecords.map((r, index) => {
                    const name =
                      r.member?.fullName?.trim() ||
                      r.member?.user?.username ||
                      "—";
                    const email = r.member?.user?.email || "";
                    const ui = mapAttendanceStatusToRowStatus(r.status);
                    return (
                      <div
                        key={r.id}
                        className={`flex flex-col gap-2 border-b p-4 last:border-0 sm:flex-row sm:items-center sm:justify-between ${index === 0 ? "" : ""
                          }`}
                      >
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9">
                            <AvatarFallback>{name.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{name}</p>
                            <p className="text-xs text-muted-foreground">
                              {email}
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="gap-1"
                            disabled={!r.member?.id || meetingAlreadyClosed}
                            onClick={() => openManualDialog(r)}
                          >
                            <PenLine className="h-3.5 w-3.5" />
                            Điểm danh tay
                          </Button>
                          <span className="text-xs text-muted-foreground">
                            Thời lượng online:{" "}
                            <strong>
                              {formatDurationSeconds(r.onlineDuration ?? undefined)}
                            </strong>
                          </span>
                          {r.checkInTime && (
                            <Badge variant="secondary" className="text-xs">
                              Vào:{" "}
                              {new Date(r.checkInTime).toLocaleTimeString("vi-VN", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </Badge>
                          )}
                          {ui === "present" && (
                            <Badge className="bg-green-100 text-green-800">
                              Có mặt
                            </Badge>
                          )}
                          {ui === "absent" && (
                            <Badge className="bg-red-100 text-red-800">Vắng</Badge>
                          )}
                          {ui === "excused" && (
                            <Badge className="bg-amber-100 text-amber-900">
                              Miễn phép
                            </Badge>
                          )}
                          {ui === "pending_excuse" && (
                            <Badge variant="outline">Chờ duyệt nghỉ</Badge>
                          )}
                          {ui === "pending" && (
                            <Badge variant="secondary">Chờ điểm danh</Badge>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>
          </>
        ) : (
          <p className="text-center text-muted-foreground">Không tìm thấy cuộc họp</p>
        )}
      </main>

      <AlertDialog open={endMeetingDialogOpen} onOpenChange={setEndMeetingDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Kết thúc cuộc họp?</AlertDialogTitle>
            <AlertDialogDescription>
              Hệ thống sẽ chốt số điểm danh tự động. Bạn không thể hoàn tác thao tác
              này từ màn hình này.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={endingMeeting}>Hủy</AlertDialogCancel>
            <Button
              type="button"
              variant="destructive"
              disabled={endingMeeting}
              onClick={() => void handleConfirmEndMeeting()}
            >
              {endingMeeting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Đang xử lý...
                </>
              ) : (
                "Xác nhận kết thúc"
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog
        open={manualDialogOpen}
        onOpenChange={(open) => {
          setManualDialogOpen(open);
          if (!open) setManualRecord(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Điểm danh thủ công</DialogTitle>
            <DialogDescription>
              Chọn trạng thái và ghi chú, sau đó xác nhận để lưu điểm danh cho thành
              viên này.
            </DialogDescription>
          </DialogHeader>
          {manualRecord && (
            <div className="space-y-4 py-2">
              <div className="rounded-lg border bg-muted/30 px-3 py-2 text-sm">
                <p className="font-medium">
                  {manualRecord.member?.fullName?.trim() ||
                    manualRecord.member?.user?.username ||
                    "—"}
                </p>
                {manualRecord.member?.user?.email ? (
                  <p className="text-xs text-muted-foreground">
                    {manualRecord.member.user.email}
                  </p>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="manual-status">Trạng thái</Label>
                <Select value={manualStatus} onValueChange={setManualStatus}>
                  <SelectTrigger id="manual-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MANUAL_STATUS_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="manual-reason">Lý do / ghi chú</Label>
                <Textarea
                  id="manual-reason"
                  placeholder="Ví dụ: Đi công tác đột xuất"
                  value={manualReason}
                  onChange={(e) => setManualReason(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          )}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setManualDialogOpen(false)}
              disabled={manualSubmitting}
            >
              Hủy
            </Button>
            <Button
              type="button"
              onClick={() => void submitManualAttendance()}
              disabled={manualSubmitting || !manualRecord?.member?.id}
            >
              {manualSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Đang gửi...
                </>
              ) : (
                "Xác nhận"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <BottomNav />
    </div>
  );
}
