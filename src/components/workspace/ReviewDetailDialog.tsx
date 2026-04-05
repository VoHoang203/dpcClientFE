import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
 
import { Separator } from "@/components/ui/separator";
import {
  CheckCircle2,
  Circle,
  Clock,
  FileText,
  MapPin,
  Calendar,
  Phone,
  AlertTriangle,
  Send,
  ChevronRight,
  ExternalLink,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { userService } from "@/services/userService";

export interface AdmissionApplication {
  id: string;
  /** Từ GET /api/admissions — gửi lại trong body action bước cuối. */
  submitterUserId?: string | null;
  partyMemberId?: string | null;
  applicantName: string;
  dob: string;
  phone: string;
  address: string;
  submittedAt: string;
  currentStage: number;
  status: "pending" | "reviewing" | "approved" | "rejected";
  priority: "high" | "normal" | "low";
  documents: { name: string; submitted: boolean }[];
  comments: { author: string; content: string; date: string }[];
}

const STAGES = [
  { label: "Sơ duyệt hồ sơ", description: "Chi ủy (CU) kiểm tra hồ sơ QCUT" },
  {
    label: "Xác minh & dấu đỏ",
    description: "Phó Bí thư (PBT) xác minh nội dung & chốt dấu đỏ",
  },
  { label: "Soạn nghị quyết", description: "Chi ủy (CU) soạn nghị quyết kết nạp" },
  { label: "Hoàn thành", description: "Bí thư (BT) phê duyệt — xác nhận đảng viên" },
];

type AttachmentRow = {
  id: string;
  kind: string;
  fileName: string | null;
  fileUrl: string;
  mimeType: string | null;
};

interface ReviewDetailDialogProps {
  application: AdmissionApplication | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Role từ inferNotificationRoleKey — bắt buộc để duyệt đúng bước. */
  actorRole: string | null;
  onActionComplete?: () => void;
}

const DOC_LABELS: Record<string, string> = {
  don: "Đơn xin vào Đảng",
  ly_lich: "Lý lịch tự khai",
  gioi_thieu: "Giấy giới thiệu",
  nghi_quyet_doan: "Nghị quyết chi đoàn",
};

const ReviewDetailDialog = ({
  application,
  open,
  onOpenChange,
  actorRole,
  onActionComplete,
}: ReviewDetailDialogProps) => {
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [dbStep, setDbStep] = useState<number | null>(null);
  const [attachments, setAttachments] = useState<AttachmentRow[]>([]);
  const [partyMemberId, setPartyMemberId] = useState("");
  const [storedPartyMemberId, setStoredPartyMemberId] = useState<string | null>(
    null
  );
  /** UUID gửi kèm body `submitterUserId` (list + GET chi tiết). */
  const [submitterUserIdForAction, setSubmitterUserIdForAction] = useState<
    string | null
  >(null);

  useEffect(() => {
    if (!open || !application?.id) {
      setDbStep(null);
      setAttachments([]);
      setPartyMemberId("");
      setStoredPartyMemberId(null);
      setSubmitterUserIdForAction(null);
      return;
    }
    const fromList = application.submitterUserId?.trim() || null;
    setSubmitterUserIdForAction(fromList);
    let cancelled = false;
    setDetailLoading(true);
    fetch(`/api/admissions/${application.id}`)
      .then((r) => r.json())
      .then(
        (data: {
          admission?: {
            currentStep?: number;
            partyMemberId?: string | null;
            submitterUserId?: string | null;
            fullName?: string | null;
            dateOfBirth?: string | null;
            phone?: string | null;
            permanentAddress?: string | null;
          };
        }) => {
        if (cancelled) return;
        const step = data.admission?.currentStep;
        setDbStep(typeof step === "number" ? step : null);
        const su = data.admission?.submitterUserId;
        const pm = data.admission?.partyMemberId;
        if (typeof su === "string" && su.trim()) {
          setSubmitterUserIdForAction(su.trim());
        }
        const resolved =
          (typeof su === "string" && su.trim()) ||
          (typeof pm === "string" && pm.trim()) ||
          null;
        setStoredPartyMemberId(resolved);
        if (resolved) {
          setPartyMemberId(resolved);
          console.log("[assign-position] partyMemberId:", resolved);
        }
        const atts = (data as { attachments?: AttachmentRow[] }).attachments;
        setAttachments(Array.isArray(atts) ? atts : []);
      })
      .catch(() => {
        if (!cancelled) {
          setAttachments([]);
          setDbStep(null);
          setStoredPartyMemberId(null);
        }
      })
      .finally(() => {
        if (!cancelled) setDetailLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, application?.id]);

  if (!application) return null;

  const isFinalBtStep = dbStep === 7;

  const handleApproveStage = async () => {
    if (!actorRole) {
      toast.error("Không xác định được vai trò (đăng nhập / role demo)");
      return;
    }
    setIsSubmitting(true);
    try {
      if (isFinalBtStep) {
        const targetId =
          partyMemberId.trim() ||
          submitterUserIdForAction?.trim() ||
          storedPartyMemberId?.trim();
        if (!targetId) {
          toast.error("Thiếu UUID đảng viên");
          setIsSubmitting(false);
          return;
        }
        await userService.assignPosition(targetId, {
          positionCode: "PARTY_MEMBER",
          appointedDate: new Date().toISOString(),
          note: comment.trim() || "Phê duyệt đảng viên",
        });
      }
      const token =
        typeof window !== "undefined"
          ? localStorage.getItem("accessToken")
          : null;
      const res = await fetch(`/api/admissions/${application.id}/actions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          action: "approve_step",
          actorRole,
          note: comment.trim() || undefined,
          ...(isFinalBtStep
            ? {
                appointedDate: new Date().toISOString(),
                ...(partyMemberId.trim()
                  ? { partyMemberId: partyMemberId.trim() }
                  : {}),
                ...(submitterUserIdForAction?.trim()
                  ? { submitterUserId: submitterUserIdForAction.trim() }
                  : {}),
              }
            : {}),
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { message?: string };
      if (!res.ok) {
        throw new Error(data.message || "Không duyệt được");
      }
      toast.success(
        isFinalBtStep
          ? "Đã bổ nhiệm PARTY_MEMBER (assign-position)"
          : "Đã duyệt bước — thông báo đã gửi"
      );
      onOpenChange(false);
      onActionComplete?.();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Lỗi duyệt");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    setIsSubmitting(true);
    try {
      const token =
        typeof window !== "undefined"
          ? localStorage.getItem("accessToken")
          : null;
      const res = await fetch(`/api/admissions/${application.id}/actions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          action: "reject",
          note: comment.trim() || "Từ chối hồ sơ",
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { message?: string };
      if (!res.ok) {
        throw new Error(data.message || "Không từ chối được");
      }
      toast.error("Đã từ chối hồ sơ");
      onOpenChange(false);
      onActionComplete?.();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Lỗi");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddComment = () => {
    if (!comment.trim()) return;
    toast.success("Đã thêm nhận xét (demo — chưa lưu DB)");
    setComment("");
  };

  const mergedDocs = application.documents.map((d) => {
    const att = attachments.find(
      (a) => DOC_LABELS[a.kind] === d.name || a.fileName === d.name
    );
    return { ...d, url: att?.fileUrl };
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <FileText className="h-5 w-5 text-primary" />
            Hồ sơ kết nạp Đảng
          </DialogTitle>
        </DialogHeader>

        <div className="flex items-start gap-4 rounded-lg bg-muted/50 p-4">
          <Avatar className="h-14 w-14">
            <AvatarFallback className="bg-primary/10 text-lg font-bold text-primary">
              {application.applicantName.charAt(0)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 space-y-1">
            <h3 className="text-base font-semibold text-foreground">
              {application.applicantName}
            </h3>
            <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" /> {application.dob}
              </span>
              <span className="flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5" /> {application.phone}
              </span>
              <span className="col-span-2 flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5" /> {application.address}
              </span>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            {application.priority === "high" && (
              <Badge className="bg-destructive text-xs text-destructive-foreground">
                Ưu tiên
              </Badge>
            )}
            <Badge variant="secondary" className="text-xs">
              <Clock className="mr-1 h-3 w-3" />
              {application.submittedAt}
            </Badge>
          </div>
        </div>

        {detailLoading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Đang tải bước & tài liệu…
          </div>
        )}
        {dbStep != null && (
          <p className="text-xs text-muted-foreground">
            Bước hệ thống: <span className="font-medium">{dbStep}</span> / 7
            {actorRole ? (
              <>
                {" "}
                — vai trò bạn: <span className="font-medium">{actorRole}</span>
              </>
            ) : null}
          </p>
        )}

        <div>
          <h4 className="mb-3 text-sm font-semibold text-foreground">
            Tiến trình xử lý
          </h4>
          <div className="space-y-0">
            {STAGES.map((stage, idx) => {
              const isCompleted = idx < application.currentStage;
              const isCurrent = idx === application.currentStage;
              const isPending = idx > application.currentStage;

              return (
                <div key={stage.label} className="flex items-start gap-3">
                  <div className="flex flex-col items-center">
                    <div
                      className={cn(
                        "flex h-7 w-7 items-center justify-center rounded-full border-2 transition-colors",
                        isCompleted && "border-green-500 bg-green-500 text-white",
                        isCurrent &&
                          "border-primary bg-primary text-primary-foreground",
                        isPending && "border-border bg-muted text-muted-foreground"
                      )}
                    >
                      {isCompleted ? (
                        <CheckCircle2 className="h-4 w-4" />
                      ) : isCurrent ? (
                        <Clock className="h-4 w-4" />
                      ) : (
                        <Circle className="h-3.5 w-3.5" />
                      )}
                    </div>
                    {idx < STAGES.length - 1 && (
                      <div
                        className={cn(
                          "h-8 w-0.5",
                          isCompleted ? "bg-green-500" : "bg-border"
                        )}
                      />
                    )}
                  </div>
                  <div className={cn("pb-6", idx === STAGES.length - 1 && "pb-0")}>
                    <p
                      className={cn(
                        "text-sm font-medium",
                        isCurrent
                          ? "text-primary"
                          : isCompleted
                            ? "text-foreground"
                            : "text-muted-foreground"
                      )}
                    >
                      {stage.label}
                      {isCurrent && (
                        <ChevronRight className="ml-1 inline h-4 w-4 animate-pulse text-primary" />
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {stage.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <Separator />

        <div>
          <h4 className="mb-3 text-sm font-semibold text-foreground">
            Hồ sơ đã nộp
          </h4>
          <div className="grid grid-cols-2 gap-2">
            {mergedDocs.map((doc) => (
              <div
                key={doc.name}
                className={cn(
                  "flex items-center gap-2 rounded-lg border p-2.5 text-sm",
                  doc.submitted
                    ? "border-green-200 bg-green-50 text-green-800"
                    : "border-destructive/30 bg-destructive/5 text-destructive"
                )}
              >
                {doc.submitted ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                ) : (
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                )}
                <span className="min-w-0 flex-1 truncate">{doc.name}</span>
                {doc.url ? (
                  <a
                    href={doc.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 text-primary hover:underline"
                    title="Xem tài liệu"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                ) : null}
              </div>
            ))}
          </div>
          {attachments.length > 0 && (
            <div className="mt-3 space-y-1 text-xs text-muted-foreground">
              <p className="font-medium text-foreground">File đính kèm (DB)</p>
              <ul className="list-inside list-disc">
                {attachments.map((a) => (
                  <li key={a.id}>
                    <a
                      href={a.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      {DOC_LABELS[a.kind] || a.kind}
                      {a.fileName ? ` — ${a.fileName}` : ""}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {isFinalBtStep && !storedPartyMemberId && (
          <p className="text-xs text-amber-800 dark:text-amber-200">
            Chưa có submitter_user_id / party_member_id — cần cập nhật Neon.
          </p>
        )}

        <Separator />

        <div>
          <h4 className="mb-3 text-sm font-semibold text-foreground">
            Nhận xét ({application.comments.length})
          </h4>
          {application.comments.length > 0 && (
            <div className="mb-4 max-h-40 space-y-3 overflow-y-auto">
              {application.comments.map((c, idx) => (
                <div
                  key={`${c.author}-${idx}`}
                  className="flex items-start gap-2 text-sm"
                >
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="bg-muted text-xs">
                      {c.author.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground">
                        {c.author}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {c.date}
                      </span>
                    </div>
                    <p className="text-muted-foreground">{c.content}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <Textarea
              placeholder="Thêm nhận xét..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="min-h-[60px] text-sm"
            />
            <Button
              size="icon"
              variant="outline"
              onClick={handleAddComment}
              disabled={!comment.trim()}
              className="shrink-0 self-end"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <Separator />

        <div className="flex items-center justify-between">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Đóng
          </Button>
          <div className="flex gap-2">
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={isSubmitting}
            >
              Từ chối
            </Button>
            <Button
              onClick={handleApproveStage}
              disabled={isSubmitting || !actorRole}
            >
              {isSubmitting ? "Đang xử lý..." : "Duyệt bước"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ReviewDetailDialog;
