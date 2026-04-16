import { useEffect, useMemo, useState } from "react";
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
  Send,
  ChevronRight,
  ExternalLink,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { userService } from "@/services/userService";
import {
  adaptDetailAttachments,
  parsePartyAdmissionRow,
  unwrapPartyAdmissionPayload,
} from "@/lib/partyAdmissionAdapter";
import { AdmissionStepDetailDialog } from "@/components/workspace/AdmissionStepDetailDialog";
import {
  AdmissionDocumentType,
  AdmissionWorkflowStep,
} from "@/lib/partyAdmissionEnums";
import {
  deriveAdmissionNumericStep,
  resolveWorkflowStepCodeForApi,
} from "@/lib/partyAdmissionStepUtils";
import {
  extractPartyAdmissionError,
  partyAdmissionService,
} from "@/services/partyAdmissionService";

export interface AdmissionApplication {
  id: string;
  /** Từ API admission-applications — gửi lại khi duyệt bước cuối (assign-position). */
  submitterUserId?: string | null;
  partyMemberId?: string | null;
  /** Hàng chờ `my-pending` — `outstandingIndividual`. */
  username?: string | null;
  applicantEmail?: string | null;
  currentHandler?: string | null;
  currentStepDisplayName?: string | null;
  overallStatus?: string | null;
  overallStatusLabel?: string | null;
  createdAtIso?: string | null;
  createdAtFormatted?: string | null;
  /** `currentStepCode` từ my-pending — ưu tiên khi resolve bước duyệt. */
  currentWorkflowStepCode?: string | null;
  /** Mã hồ sơ (PADM-…) từ API. */
  applicationCode?: string | null;
  applicantName: string;
  dob: string;
  phone: string;
  address: string;
  submittedAt: string;
  currentStage: number;
  status: "pending" | "reviewing" | "approved" | "rejected";
  priority: "high" | "normal" | "low";
  documents: { name: string; submitted: boolean; url?: string | null }[];
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

function stepTitleFromAdmissionStep(st: Record<string, unknown>): string {
  const n = st.stepName ?? st.title;
  if (typeof n === "string" && n.trim()) return n.trim();
  const c = st.stepCode ?? st.code;
  if (typeof c === "string" && c.trim()) return c.trim();
  return "Bước";
}

const DOC_LABELS: Record<string, string> = {
  don: "Đơn xin vào Đảng",
  ly_lich: "Lý lịch tự khai",
  gioi_thieu: "Giấy giới thiệu",
  nghi_quyet_doan: "Nghị quyết chi đoàn",
  DON_XIN_VAO_DANG: "Đơn xin vào Đảng",
  LY_LICH_NGUOI_XIN_VAO_DANG: "Lý lịch người xin vào Đảng",
  GIAY_GIOI_THIEU_DANG_VIEN_1: "Giấy giới thiệu ĐV (1)",
  GIAY_GIOI_THIEU_DANG_VIEN_2: "Giấy giới thiệu ĐV (2)",
  XAC_MINH_DIA_PHUONG: "Xác minh địa phương",
  NGHI_QUYET_KET_NAP_DU_THAO: "Nghị quyết kết nạp dự thảo",
  NGHI_QUYET_GIOI_THIEU_DOAN_VIEN:
    "Nghị quyết giới thiệu đoàn viên của Chi đoàn",
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
  const [resolutionFile, setResolutionFile] = useState<File | null>(null);
  const [youthUnionResolutionFile, setYouthUnionResolutionFile] = useState<
    File | null
  >(null);
  /** `currentStepCode` từ GET chi tiết — dùng body approve/return. */
  const [workflowStepCode, setWorkflowStepCode] = useState<string | null>(null);
  const [admissionStepsFromApi, setAdmissionStepsFromApi] = useState<
    Record<string, unknown>[]
  >([]);
  const [admissionCodeFromApi, setAdmissionCodeFromApi] = useState<string | null>(
    null
  );
  const [stepDetailOpen, setStepDetailOpen] = useState(false);
  const [stepDetailRecord, setStepDetailRecord] = useState<Record<
    string,
    unknown
  > | null>(null);

  useEffect(() => {
    if (!open) {
      setStepDetailOpen(false);
      setStepDetailRecord(null);
    }
  }, [open]);

  useEffect(() => {
    if (!open || !application?.id) {
      setDbStep(null);
      setAttachments([]);
      setPartyMemberId("");
      setStoredPartyMemberId(null);
      setSubmitterUserIdForAction(null);
      setResolutionFile(null);
      setYouthUnionResolutionFile(null);
      setWorkflowStepCode(null);
      setAdmissionStepsFromApi([]);
      setAdmissionCodeFromApi(null);
      return;
    }
    const fromList = application.submitterUserId?.trim() || null;
    setSubmitterUserIdForAction(fromList);
    let cancelled = false;
    setDetailLoading(true);
    partyAdmissionService
      .getById(application.id)
      .then((raw) => {
        if (cancelled) return;
        const row = parsePartyAdmissionRow(raw);
        setWorkflowStepCode(row?.currentStepCode?.trim() ?? null);
        const step = row
          ? deriveAdmissionNumericStep(row.currentStepCode, row.overallStatus)
          : null;
        setDbStep(typeof step === "number" ? step : null);
        const su = row?.submitterUserId;
        const pm = row?.partyMemberId;
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
        }
        setAttachments(adaptDetailAttachments(raw));
        const unwrapped = unwrapPartyAdmissionPayload(raw);
        const rawSteps = unwrapped.steps;
        setAdmissionStepsFromApi(
          Array.isArray(rawSteps)
            ? (rawSteps as Record<string, unknown>[])
            : []
        );
        const c = unwrapped.code;
        setAdmissionCodeFromApi(
          typeof c === "string" && c.trim() ? c.trim() : null
        );
      })
      .catch(() => {
        if (!cancelled) {
          setAttachments([]);
          setDbStep(null);
          setStoredPartyMemberId(null);
          setWorkflowStepCode(null);
          setAdmissionStepsFromApi([]);
          setAdmissionCodeFromApi(null);
        }
      })
      .finally(() => {
        if (!cancelled) setDetailLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, application?.id]);

  const submittedFileRows = useMemo(() => {
    if (!application) return [];
    const fromDetail = attachments.filter((a) => a.fileUrl?.trim());
    if (fromDetail.length > 0) {
      return fromDetail.map((a) => ({
        key: a.id,
        label: DOC_LABELS[a.kind] || a.kind,
        href: a.fileUrl.trim(),
        fileName: a.fileName,
      }));
    }
    return application.documents
      .filter((d) => d.url?.trim())
      .map((d, i) => ({
        key: `list-${i}-${d.name}`,
        label: d.name,
        href: d.url!.trim(),
        fileName: null as string | null,
      }));
  }, [attachments, application]);

  if (!application) return null;

  const isFinalBtStep = dbStep === 7;

  const handleApproveStage = async () => {
    if (!actorRole) {
      toast.error("Không xác định được vai trò (đăng nhập / role demo)");
      return;
    }
    setIsSubmitting(true);
    try {
      const approveStepCode = resolveWorkflowStepCodeForApi(
        workflowStepCode ?? application.currentWorkflowStepCode,
        dbStep
      );
      if (dbStep === 6 && actorRole === "chi_uy") {
        if (!resolutionFile) {
          toast.error("Vui lòng chọn file Nghị quyết kết nạp dự thảo");
          setIsSubmitting(false);
          return;
        }
        if (!youthUnionResolutionFile) {
          toast.error(
            "Vui lòng chọn file Nghị quyết giới thiệu đoàn viên của Chi đoàn"
          );
          setIsSubmitting(false);
          return;
        }
        const objectName = await partyAdmissionService.uploadFile(resolutionFile);
        const youthUnionResolutionObjectName =
          await partyAdmissionService.uploadFile(youthUnionResolutionFile);
        await partyAdmissionService.submitResolutionDrafting(application.id, {
          formData: {
            [AdmissionDocumentType.NGHI_QUYET_KET_NAP_DU_THAO]: objectName,
            [AdmissionDocumentType.NGHI_QUYET_GIOI_THIEU_DOAN_VIEN]:
              youthUnionResolutionObjectName,
          },
        });
        toast.success("Đã gửi nghị quyết (soạn nghị quyết)");
        setResolutionFile(null);
        onOpenChange(false);
        onActionComplete?.();
        return;
      }

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
        await partyAdmissionService.approve(application.id, {
          stepCode: approveStepCode,
          note: comment.trim() || undefined,
        });
        toast.success("Đã bổ nhiệm PARTY_MEMBER và đồng bộ duyệt bước trên máy chủ");
      } else {
        await partyAdmissionService.approve(application.id, {
          stepCode: approveStepCode,
          note: comment.trim() || undefined,
        });
        toast.success("Đã duyệt bước trên máy chủ");
      }
      onOpenChange(false);
      onActionComplete?.();
    } catch (e: unknown) {
      toast.error(extractPartyAdmissionError(e));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (
      !confirm(
        "Từ chối hồ sơ? Hành động này thường không thể hoàn tác (Api 9 — cảnh báo)."
      )
    ) {
      return;
    }
    setIsSubmitting(true);
    try {
      await partyAdmissionService.reject(application.id, {
        note: comment.trim() || "Từ chối hồ sơ",
      });
      toast.error("Đã từ chối hồ sơ");
      onOpenChange(false);
      onActionComplete?.();
    } catch (e: unknown) {
      toast.error(extractPartyAdmissionError(e));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReturn = async () => {
    if (
      !confirm(
        "Trả lại hồ sơ để QCUT / người nộp bổ sung? (Api 8)"
      )
    ) {
      return;
    }
    setIsSubmitting(true);
    try {
      const stepCode = resolveWorkflowStepCodeForApi(
        workflowStepCode ?? application.currentWorkflowStepCode, dbStep
      );
      console.log(stepCode);
      console.log(dbStep);
      debugger

      // --- CÁCH SỬA MỚI: Dùng trực tiếp dbStep (kiểu số) để tránh lỗi so sánh chuỗi ---
      let returnToStepCode: string = AdmissionWorkflowStep.APPLICATION;

      // Bước 5 (Kiểm tra dấu đỏ), Bước 6 (Soạn NQ), Bước 7 (Bí thư duyệt)
      // Khi trả lại sẽ đẩy về Bước 4 (Xác minh địa phương) để QCUT làm lại
      if (dbStep !== null && dbStep >= 5) {
        returnToStepCode = AdmissionWorkflowStep.LOCAL_VERIFICATION;
      } else if (
        stepCode.trim().toUpperCase() === AdmissionWorkflowStep.RED_SEAL_CHECK.toUpperCase() ||
        stepCode.trim().toUpperCase() === AdmissionWorkflowStep.RESOLUTION_DRAFTING.toUpperCase() ||
        stepCode.trim().toUpperCase() === AdmissionWorkflowStep.SECRETARY_RESOLUTION_REVIEW.toUpperCase()
      ) {
        // Fallback dự phòng nếu dbStep bị null nhưng stepCode vẫn là các bước sau
        returnToStepCode = AdmissionWorkflowStep.LOCAL_VERIFICATION;
      }

      console.log("Payload chuẩn bị gửi:", { stepCode, returnToStepCode, dbStep });

      await partyAdmissionService.returnApplication(application.id, {
        stepCode,
        returnToStepCode,
        reason: comment.trim() || "Trả lại bổ sung",
      });
      toast.success("Đã trả lại hồ sơ");
      onOpenChange(false);
      onActionComplete?.();
    } catch (e: unknown) {
      toast.error(extractPartyAdmissionError(e));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddComment = () => {
    if (!comment.trim()) return;
    toast.success("Đã thêm nhận xét (demo — chưa lưu DB)");
    setComment("");
  };

  return (
    <>
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

          {admissionStepsFromApi.length > 0 ? (
            <>
              <Separator className="my-4" />
              <div>
                <h4 className="mb-2 text-sm font-semibold text-foreground">
                  Chi tiết từng bước
                </h4>
                <p className="mb-2 text-xs text-muted-foreground">
                  Mã hồ sơ:{" "}
                  <span className="font-medium text-foreground">
                    {application.applicationCode ?? admissionCodeFromApi ?? "—"}
                  </span>
                </p>
                <ul className="space-y-2">
                  {admissionStepsFromApi.map((st, i) => (
                    <li
                      key={i}
                      className="flex flex-col gap-1 rounded-md border border-border bg-muted/30 p-2 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <span className="text-sm font-medium">
                        {stepTitleFromAdmissionStep(st)}
                      </span>
                      <Button
                        type="button"
                        variant="link"
                        className="h-auto shrink-0 p-0 text-sm"
                        onClick={() => {
                          setStepDetailRecord(st);
                          setStepDetailOpen(true);
                        }}
                      >
                        Xem chi tiết bước
                      </Button>
                    </li>
                  ))}
                </ul>
              </div>
            </>
          ) : null}

          <Separator />


          {dbStep === 6 && actorRole === "chi_uy" && (
            <div className="space-y-4 rounded-lg border border-dashed p-3 text-sm">
              <div>
                <Label className="text-foreground">
                  Nghị quyết kết nạp dự thảo *
                </Label>
                <Input
                  type="file"
                  className="mt-2 cursor-pointer"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) =>
                    setResolutionFile(e.target.files?.[0] ?? null)
                  }
                />
                {resolutionFile && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Đã chọn: {resolutionFile.name}
                  </p>
                )}
              </div>
              <div>
                <Label className="text-foreground">
                  Nghị quyết giới thiệu đoàn viên của Chi đoàn (Chi ủy) *
                </Label>
                <Input
                  type="file"
                  className="mt-2 cursor-pointer"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) =>
                    setYouthUnionResolutionFile(e.target.files?.[0] ?? null)
                  }
                />
                {youthUnionResolutionFile && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Đã chọn: {youthUnionResolutionFile.name}
                  </p>
                )}
              </div>
            </div>
          )}

          {isFinalBtStep && !storedPartyMemberId && (
            <p className="text-xs text-amber-800 dark:text-amber-200">
              Chưa có submitter_user_id / party_member_id trên hồ sơ — kiểm tra
              phản hồi GET admission-applications.
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
            <div className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                onClick={() => void handleReturn()}
                disabled={isSubmitting}
              >
                Trả lại
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
      <AdmissionStepDetailDialog
        open={stepDetailOpen}
        onOpenChange={setStepDetailOpen}
        step={stepDetailRecord}
        applicationCode={
          application.applicationCode ?? admissionCodeFromApi ?? null
        }
      />
    </>
  );
};

export default ReviewDetailDialog;
