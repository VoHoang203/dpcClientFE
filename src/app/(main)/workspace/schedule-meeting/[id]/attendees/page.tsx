"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import QRCode from "qrcode";
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
  Eye,
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
import { fileService } from "@/services/fileService";
import {
  formatMeetingDateTime,
  isOfflineMeeting,
  mapAttendanceStatusToRowStatus,
} from "@/lib/meetingAttendanceUi";
import { toast } from "sonner";

// QR code là static theo API — không cần refresh định kỳ.

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

const LEAVE_REQUEST_STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "-", label: "-" },
  { value: "PENDING", label: "PENDING" },
  { value: "PENDING_EXCUSE", label: "PENDING_EXCUSE" },
  { value: "PRESENT", label: "PRESENT" },
  { value: "ABSENT", label: "ABSENT" },
  { value: "EXCUSED", label: "EXCUSED" },
];

const MANUAL_STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "PRESENT", label: "Có mặt (PRESENT)" },
  { value: "ABSENT", label: "Vắng (ABSENT)" },
  { value: "EXCUSED", label: "Miễn phép (EXCUSED)" },
  { value: "PENDING_EXCUSE", label: "Chờ duyệt nghỉ (PENDING_EXCUSE)" },
];

const MANUAL_API_STATUS_SET = new Set(MANUAL_STATUS_OPTIONS.map((o) => o.value));

/** BE từ chối toggle khi cuộc họp đã kết thúc — dùng khi probe lúc vào trang. */
const TOGGLE_CHECKIN_MEETING_ENDED_REGEX =
  /không thể bật điểm danh.*đã kết thúc|điểm danh cuộc họp đã kết thúc/i;

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
  const [qrCode, setQrCode] = useState("");
  const [qrCodeLoading, setQrCodeLoading] = useState(false);
  const [qrCodeError, setQrCodeError] = useState<string | null>(null);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>("");

  const [leaveRequests, setLeaveRequests] = useState<MeetingLeaveRequest[]>([]);
  const [leaveLoading, setLeaveLoading] = useState(false);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [leavePage] = useState(1);
  const [leaveLimit] = useState(100);

  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);
  const [activeLeave, setActiveLeave] = useState<MeetingLeaveRequest | null>(null);
  const [leaveStatusDraft, setLeaveStatusDraft] = useState("-");

  const [manualDialogOpen, setManualDialogOpen] = useState(false);
  const [manualRecord, setManualRecord] = useState<MeetingAttendanceRecord | null>(
    null
  );
  const [manualStatus, setManualStatus] = useState("PRESENT");
  const [manualReason, setManualReason] = useState("");
  const [manualSubmitting, setManualSubmitting] = useState(false);

  const [endMeetingDialogOpen, setEndMeetingDialogOpen] = useState(false);
  const [endingMeeting, setEndingMeeting] = useState(false);
  /** BE có thể trả `status` sai ở GET detail; toggle-checkin 200+message báo đã kết thúc → khóa UI. */
  const [meetingEndedByToggleMessage, setMeetingEndedByToggleMessage] =
    useState(false);

  const endedHintStorageKey = meetingId
    ? `meetingAttendeesEndedHint:${meetingId}`
    : "";

  const lastToggleProbeMeetingId = useRef<string | null>(null);
  const toggleProbeLock = useRef(false);

  const offline = isOfflineMeeting(meeting);
  const checkinActive = Boolean(
    meeting?.isCheckinActive ?? meeting?.is_checkin_active
  );

  const meetingAlreadyClosed =
    meeting?.status === "FINISHED" ||
    meeting?.status === "CANCELLED" ||
    meetingEndedByToggleMessage;

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
      const items = await meetingService.listLeaveRequests({
        page: leavePage,
        limit: leaveLimit,
        meetingId,
      });
      setLeaveRequests(items);
    } catch {
      setLeaveRequests([]);
    } finally {
      setLeaveLoading(false);
    }
  }, [meetingId, leaveLimit, leavePage]);

  useEffect(() => {
    void loadMeeting();
  }, [loadMeeting]);

  useEffect(() => {
    lastToggleProbeMeetingId.current = null;
  }, [meetingId]);

  /**
   * Probe bằng PATCH toggle-checkin (theo yêu cầu BE): nếu cuộc họp đã kết thúc, lần gọi đầu lỗi → khóa nút "Kết thúc".
   * Nếu chưa kết thúc, BE bật/tắt điểm danh → gọi lần 2 để hoàn tác, rồi GET lại meeting.
   */
  useEffect(() => {
    if (!meetingId || meeting?.id !== meetingId) return;
    if (meeting.status === "FINISHED" || meeting.status === "CANCELLED") return;
    if (lastToggleProbeMeetingId.current === meetingId) return;
    if (toggleProbeLock.current) return;
    toggleProbeLock.current = true;

    const idSnapshot = meetingId;
    let cancelled = false;

    void (async () => {
      try {
        await meetingService.toggleMeetingCheckin(idSnapshot);
        if (cancelled) return;
        await meetingService.toggleMeetingCheckin(idSnapshot);
        if (cancelled) return;
        void loadMeeting();
      } catch (e) {
        if (cancelled) return;
        const msg = e instanceof Error ? e.message : "";
        if (TOGGLE_CHECKIN_MEETING_ENDED_REGEX.test(msg)) {
          if (endedHintStorageKey) {
            sessionStorage.setItem(endedHintStorageKey, "1");
          }
          setMeetingEndedByToggleMessage(true);
        }
      } finally {
        if (!cancelled) {
          lastToggleProbeMeetingId.current = idSnapshot;
        }
        toggleProbeLock.current = false;
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    meetingId,
    meeting?.id,
    meeting?.status,
    loadMeeting,
    endedHintStorageKey,
  ]);

  useEffect(() => {
    if (!endedHintStorageKey) return;
    const stored =
      typeof window !== "undefined" &&
      sessionStorage.getItem(endedHintStorageKey) === "1";
    setMeetingEndedByToggleMessage(stored);
  }, [endedHintStorageKey]);

  useEffect(() => {
    if (!endedHintStorageKey || !meeting) return;
    if (meeting.status === "FINISHED" || meeting.status === "CANCELLED") {
      sessionStorage.removeItem(endedHintStorageKey);
      setMeetingEndedByToggleMessage(false);
    }
  }, [endedHintStorageKey, meeting]);

  useEffect(() => {
    void loadRecords();
  }, [loadRecords]);

  useEffect(() => {
    if (meeting) void loadLeaveRequests();
  }, [meeting, loadLeaveRequests]);

  const fetchQrCode = useCallback(async () => {
    if (!meetingId || !checkinActive || !offline) return;
    setQrCodeLoading(true);
    setQrCodeError(null);
    try {
      const code = await meetingService.getMeetingQrCode(meetingId);
      setQrCode(code || "—");
    } catch (e) {
      setQrCodeError(e instanceof Error ? e.message : "Không lấy được QR code");
      setQrCode("");
    } finally {
      setQrCodeLoading(false);
    }
  }, [meetingId, checkinActive, offline]);

  useEffect(() => {
    if (!offline || !checkinActive || !meetingId) return;
    void fetchQrCode();
  }, [offline, checkinActive, meetingId, fetchQrCode]);

  useEffect(() => {
    let cancelled = false;
    if (!qrCode || qrCode === "—") {
      setQrCodeDataUrl("");
      return;
    }
    QRCode.toDataURL(qrCode, {
      errorCorrectionLevel: "M",
      margin: 1,
      width: 260,
      color: {
        dark: "#111827",
        light: "#ffffff",
      },
    })
      .then((url: string) => {
        if (!cancelled) setQrCodeDataUrl(url);
      })
      .catch(() => {
        if (!cancelled) setQrCodeDataUrl("");
      });
    return () => {
      cancelled = true;
    };
  }, [qrCode]);

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
      const { message: toggleMsg } =
        await meetingService.toggleMeetingCheckin(meetingId);
      await loadMeeting();
      toast.success(toggleMsg || "Đã cập nhật chế độ điểm danh");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      if (endedHintStorageKey && TOGGLE_CHECKIN_MEETING_ENDED_REGEX.test(msg)) {
        sessionStorage.setItem(endedHintStorageKey, "1");
        setMeetingEndedByToggleMessage(true);
      }
      toast.error(msg || "Không bật/tắt được điểm danh");
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

  const openLeaveDialog = (req: MeetingLeaveRequest) => {
    setActiveLeave(req);
    setLeaveStatusDraft(String(req.status || "-"));
    setLeaveDialogOpen(true);
  };

  const submitLeaveStatus = async () => {
    if (!activeLeave?.id) return;
    const next = String(leaveStatusDraft || "-").toUpperCase();
    const prev = String(activeLeave.status || "-").toUpperCase();
    if (next === "-" || next === prev) return;
    setReviewingId(activeLeave.id);
    try {
      await meetingService.reviewLeaveRequest(activeLeave.id, next);
      toast.success("Đã cập nhật trạng thái đơn xin nghỉ");
      setLeaveDialogOpen(false);
      setActiveLeave(null);
      void loadLeaveRequests();
      void loadRecords();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Cập nhật thất bại");
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
                      {offline ? "Bật điểm danh offline (QR)" : "Bật điểm danh (Online)"}
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {offline
                        ? "Bật để lấy dữ liệu QR phục vụ điểm danh (static)."
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
                    {qrCodeLoading && !qrCode ? (
                      <Loader2 className="mx-auto h-8 w-8 animate-spin" />
                    ) : qrCodeDataUrl ? (
                      <div className="mx-auto w-fit space-y-3">
                        <img
                          src={qrCodeDataUrl}
                          alt="QR điểm danh"
                          className="h-[260px] w-[260px] rounded-lg border bg-white p-2"
                        />
                      </div>
                    ) : (
                      <p className="break-all font-mono text-sm text-muted-foreground">
                        {qrCode || "—"}
                      </p>
                    )}
                    {qrCodeError && (
                      <p className="mt-2 text-xs text-destructive">{qrCodeError}</p>
                    )}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="mt-3 gap-1"
                      onClick={() => void fetchQrCode()}
                      disabled={qrCodeLoading}
                    >
                      <RefreshCw
                        className={`h-3.5 w-3.5 ${qrCodeLoading ? "animate-spin" : ""}`}
                      />
                      Tải lại QR
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
                          className="rounded-lg border border-border p-3 text-sm overflow-hidden"
                        >
                          <div className="grid gap-2 sm:items-center lg:grid-cols-[minmax(140px,0.7fr)_minmax(220px,1.3fr)_minmax(96px,0.4fr)_minmax(120px,0.5fr)_minmax(52px,0.2fr)]">
                            <div className="min-w-0">
                              <div className="truncate font-medium">
                                {req.member?.fullName || "—"}
                              </div>
                            </div>

                            <div className="min-w-0">
                              <div className="text-xs text-muted-foreground sm:hidden">
                                Lý do
                              </div>
                              <div className="truncate text-muted-foreground">
                                {req.reason?.trim() ? req.reason : "—"}
                              </div>
                            </div>

                            <div className="min-w-0">
                              <div className="text-xs text-muted-foreground sm:hidden">
                                Minh chứng
                              </div>
                              {req.proofUrl ? (
                                <button
                                  type="button"
                                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                                  title={req.proofUrl}
                                  onClick={() => fileService.openInNewTab(req.proofUrl!)}
                                >
                                  <FileText className="h-3 w-3" />
                                  <span className="truncate">Minh chứng</span>
                                </button>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </div>

                            <div className="min-w-0">
                              <div className="text-xs text-muted-foreground sm:hidden">
                                Trạng thái
                              </div>
                              <Badge variant="outline" className="w-fit">
                                {LEAVE_STATUS_LABEL[req.status] ?? req.status}
                              </Badge>
                            </div>

                            <div className="flex items-center justify-start sm:justify-end">
                              {canApprove ? (
                                <Button
                                  type="button"
                                  size="icon"
                                  variant="outline"
                                  disabled={reviewingId === req.id}
                                  onClick={() => openLeaveDialog(req)}
                                  title="Duyệt / cập nhật trạng thái"
                                >
                                  {reviewingId === req.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <PenLine className="h-4 w-4" />
                                  )}
                                </Button>
                              ) : (
                                <Button
                                  type="button"
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => openLeaveDialog(req)}
                                  title="Xem đơn"
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </div>
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
                            disabled={!r.member?.id}
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

      <Dialog
        open={leaveDialogOpen}
        onOpenChange={(open) => {
          setLeaveDialogOpen(open);
          if (!open) {
            setActiveLeave(null);
            setLeaveStatusDraft("-");
          }
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Duyệt đơn xin nghỉ</DialogTitle>
            <DialogDescription>
              Chỉ có thể thay đổi trạng thái; các thông tin còn lại chỉ để xem.
            </DialogDescription>
          </DialogHeader>

          {activeLeave ? (
            <div className="space-y-4 py-1">
              <div className="rounded-lg border bg-muted/30 p-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="font-medium">
                    {activeLeave.member?.fullName || "—"}
                  </div>
                  <Badge variant="outline">
                    {LEAVE_STATUS_LABEL[activeLeave.status] ?? activeLeave.status}
                  </Badge>
                </div>
                {activeLeave.meeting?.title ? (
                  <div className="mt-2 text-xs text-muted-foreground">
                    Cuộc họp:{" "}
                    <span className="font-medium text-foreground">
                      {activeLeave.meeting.title}
                    </span>
                  </div>
                ) : null}
              </div>

              <div className="space-y-2">
                <Label>Lý do</Label>
                <Textarea value={activeLeave.reason ?? ""} readOnly rows={3} />
              </div>

              <div className="space-y-2">
                <Label>Minh chứng</Label>
                {activeLeave.proofUrl ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full justify-start gap-2"
                    onClick={() => fileService.openInNewTab(activeLeave.proofUrl!)}
                  >
                    <FileText className="h-4 w-4" />
                    Mở minh chứng
                  </Button>
                ) : (
                  <p className="text-sm text-muted-foreground">Không có</p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Trạng thái đơn xin nghỉ</Label>
                <Select value={leaveStatusDraft} onValueChange={setLeaveStatusDraft}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LEAVE_REQUEST_STATUS_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          ) : null}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setLeaveDialogOpen(false)}
              disabled={Boolean(reviewingId)}
            >
              Đóng
            </Button>
            <Button
              type="button"
              onClick={() => void submitLeaveStatus()}
              disabled={
                !activeLeave ||
                Boolean(reviewingId) ||
                String(leaveStatusDraft || "-").toUpperCase() === "-" ||
                String(leaveStatusDraft || "-").toUpperCase() ===
                  String(activeLeave.status || "-").toUpperCase()
              }
            >
              {reviewingId ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Đang lưu...
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
