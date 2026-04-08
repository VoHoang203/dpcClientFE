"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { AdmissionDocumentType } from "@/lib/partyAdmissionEnums";

function fmtDate(iso: string | null | undefined): string {
  if (!iso || typeof iso !== "string") return "—";
  try {
    return format(new Date(iso), "dd/MM/yyyy HH:mm", { locale: vi });
  } catch {
    return iso;
  }
}

function pickStr(o: unknown, ...keys: string[]): string | null {
  if (!o || typeof o !== "object") return null;
  const obj = o as Record<string, unknown>;
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return null;
}

/** Nhãn hiển thị cho key trong `formData` (đồng bộ enum / field BE). */
const FORM_DATA_FIELD_LABELS: Record<string, string> = {
  email: "Email",
  phone: "Số điện thoại",
  reason: "Lý do vào Đảng",
  fullName: "Họ và tên",
  dateOfBirth: "Ngày sinh",
  partyCellCode: "Mã chi bộ",
  [AdmissionDocumentType.DON_XIN_VAO_DANG]: "Đơn xin vào Đảng",
  [AdmissionDocumentType.LY_LICH_NGUOI_XIN_VAO_DANG]: "Lý lịch người xin vào Đảng",
  [AdmissionDocumentType.GIAY_GIOI_THIEU_DANG_VIEN_1]: "Giấy giới thiệu Đảng viên (1)",
  [AdmissionDocumentType.GIAY_GIOI_THIEU_DANG_VIEN_2]: "Giấy giới thiệu Đảng viên (2)",
  [AdmissionDocumentType.XAC_MINH_DIA_PHUONG]: "Xác minh địa phương",
  [AdmissionDocumentType.HOSO_XIN_VAO_DANG]: "Hồ sơ xin vào Đảng",
  [AdmissionDocumentType.NGHI_QUYET_KET_NAP_DU_THAO]: "Nghị quyết kết nạp dự thảo",
  [AdmissionDocumentType.NGHI_QUYET_GIOI_THIEU_DOAN_VIEN]:
    "Nghị quyết giới thiệu đoàn viên (Chi đoàn)",
};

function normalizeFormDataKey(key: string): string {
  return key.trim().replace(/\s+/g, "_");
}

function humanizeFormKey(key: string): string {
  const n = normalizeFormDataKey(key);
  return n
    .split("_")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

function labelForFormFieldKey(key: string): string {
  const raw = key.trim();
  const norm = normalizeFormDataKey(raw);
  const upper = norm.toUpperCase();
  return (
    FORM_DATA_FIELD_LABELS[raw] ??
    FORM_DATA_FIELD_LABELS[norm] ??
    FORM_DATA_FIELD_LABELS[upper] ??
    humanizeFormKey(raw)
  );
}

function isHttpUrlString(v: unknown): v is string {
  if (typeof v !== "string") return false;
  const t = v.trim();
  return /^https?:\/\//i.test(t);
}

function FormDataFieldRow({
  fieldKey,
  value,
}: {
  fieldKey: string;
  value: unknown;
}) {
  const label = labelForFormFieldKey(fieldKey);

  if (value === null || value === undefined) {
    return (
      <div className="space-y-1">
        <Label className="text-xs font-medium text-foreground">{label}</Label>
        <p className="text-xs text-muted-foreground">—</p>
      </div>
    );
  }

  if (isHttpUrlString(value)) {
    const href = value.trim();
    return (
      <div className="space-y-1">
        <Label className="text-xs font-medium text-foreground">{label}</Label>
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex max-w-full items-center gap-1.5 break-all rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-xs font-medium text-primary underline-offset-4 hover:underline"
        >
          <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden />
          Mở tệp trong tab mới
        </a>
      </div>
    );
  }

  if (typeof value === "string") {
    const multiline = value.length > 160 || /[\r\n]/.test(value);
    if (multiline) {
      return (
        <div className="space-y-1">
          <Label className="text-xs font-medium text-foreground">{label}</Label>
          <Textarea readOnly value={value} rows={Math.min(8, Math.max(3, value.split("\n").length))} className="resize-y text-xs" />
        </div>
      );
    }
    return (
      <div className="space-y-1">
        <Label className="text-xs font-medium text-foreground">{label}</Label>
        <Input readOnly value={value} className="h-9 text-xs" />
      </div>
    );
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return (
      <div className="space-y-1">
        <Label className="text-xs font-medium text-foreground">{label}</Label>
        <Input readOnly value={String(value)} className="h-9 text-xs" />
      </div>
    );
  }

  const json = JSON.stringify(value, null, 2);
  return (
    <div className="space-y-1">
      <Label className="text-xs font-medium text-foreground">{label}</Label>
      <Textarea readOnly value={json} rows={Math.min(12, Math.max(4, json.split("\n").length))} className="resize-y font-mono text-[11px]" />
    </div>
  );
}

function SubmissionFormDataView({ formData }: { formData: Record<string, unknown> }) {
  const entries = Object.entries(formData);
  if (entries.length === 0) return null;
  return (
    <div className="mt-3 space-y-3">
      {entries.map(([k, v]) => (
        <FormDataFieldRow key={k} fieldKey={k} value={v} />
      ))}
    </div>
  );
}

export type AdmissionStepDetailDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Bản ghi bước từ BE (`steps[]` hoặc `currentStep`). */
  step: Record<string, unknown> | null;
  applicationCode?: string | null;
};

export function AdmissionStepDetailDialog({
  open,
  onOpenChange,
  step,
  applicationCode,
}: AdmissionStepDetailDialogProps) {
  if (!step || Object.keys(step).length === 0) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[90vh] max-w-lg">
          <DialogHeader>
            <DialogTitle>Chi tiết bước</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Không có dữ liệu chi tiết cho bước này.
          </p>
        </DialogContent>
      </Dialog>
    );
  }

  const stepName =
    pickStr(step, "stepName", "title") ?? pickStr(step, "stepCode") ?? "Bước";
  const stepCode = pickStr(step, "stepCode", "code") ?? "—";
  const status = pickStr(step, "status") ?? "—";
  const note = pickStr(step, "note");

  const submissions = Array.isArray(step.submissions)
    ? (step.submissions as Record<string, unknown>[])
    : [];
  const reviews = Array.isArray(step.reviews)
    ? (step.reviews as Record<string, unknown>[])
    : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg">Chi tiết bước: {stepName}</DialogTitle>
          {applicationCode ? (
            <p className="text-xs text-muted-foreground">Mã hồ sơ: {applicationCode}</p>
          ) : null}
        </DialogHeader>

        <div className="space-y-3 text-sm">
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">{stepCode}</Badge>
            <Badge variant="secondary">{status}</Badge>
            {step.isCurrent === true ? (
              <Badge className="bg-primary/15 text-primary">Đang thực hiện</Badge>
            ) : null}
            {step.isCompleted === true ? (
              <Badge className="bg-green-100 text-green-800">Đã hoàn thành</Badge>
            ) : null}
            {step.isLocked === true ? (
              <Badge className="border-destructive/50 bg-destructive/10 text-destructive">
                Đã khóa
              </Badge>
            ) : null}
          </div>

          <div className="grid grid-cols-1 gap-1 text-muted-foreground sm:grid-cols-2">
            <p>
              <span className="font-medium text-foreground">Bắt đầu:</span>{" "}
              {fmtDate(pickStr(step, "startedAt"))}
            </p>
            <p>
              <span className="font-medium text-foreground">Nộp:</span>{" "}
              {fmtDate(pickStr(step, "submittedAt"))}
            </p>
            <p>
              <span className="font-medium text-foreground">Xử lý:</span>{" "}
              {fmtDate(pickStr(step, "processedAt"))}
            </p>
            <p>
              <span className="font-medium text-foreground">Hoàn thành:</span>{" "}
              {fmtDate(pickStr(step, "completedAt"))}
            </p>
            <p className="sm:col-span-2">
              <span className="font-medium text-foreground">Trả lại:</span>{" "}
              {fmtDate(pickStr(step, "returnedAt"))}
            </p>
          </div>

          {note ? (
            <div className="rounded-md border bg-muted/40 p-3">
              <p className="text-xs font-medium text-foreground">Ghi chú bước</p>
              <p className="mt-1 text-muted-foreground">{note}</p>
            </div>
          ) : null}
        </div>

        {submissions.length > 0 && (
          <>
            <Separator className="my-4" />
            <h4 className="mb-2 text-sm font-semibold">Các lần nộp (submissions)</h4>
            <ul className="space-y-3">
              {submissions.map((sub, i) => {
                const fd = sub.formData;
                const fdObj =
                  fd && typeof fd === "object" && !Array.isArray(fd)
                    ? (fd as Record<string, unknown>)
                    : null;
                return (
                  <li
                    key={pickStr(sub, "id") ?? `sub-${i}`}
                    className="rounded-lg border p-3 text-xs"
                  >
                    <div className="flex flex-wrap gap-2">
                      <span className="font-medium">
                        Phiên bản {pickStr(sub, "version") ?? "—"}
                      </span>
                      {sub.isLatest === true ? (
                        <Badge className="h-5 text-[10px]">Mới nhất</Badge>
                      ) : null}
                    </div>
                    <p className="mt-1 text-muted-foreground">
                      Nộp lúc: {fmtDate(pickStr(sub, "submittedAt"))}
                    </p>
                    {pickStr(sub, "note") ? (
                      <p className="mt-1 italic text-muted-foreground">
                        {pickStr(sub, "note")}
                      </p>
                    ) : null}
                    {fdObj ? (
                      <SubmissionFormDataView formData={fdObj} />
                    ) : fd !== null && fd !== undefined ? (
                      <p className="mt-2 text-muted-foreground">
                        Không hiển thị được dạng form (formData không phải object).
                      </p>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </>
        )}

        {reviews.length > 0 && (
          <>
            <Separator className="my-4" />
            <h4 className="mb-2 text-sm font-semibold">Đánh giá / xử lý (reviews)</h4>
            <ul className="space-y-2">
              {reviews.map((rev, i) => (
                <li
                  key={pickStr(rev, "id") ?? `rev-${i}`}
                  className="rounded-lg border border-dashed p-3 text-xs"
                >
                  <p className="font-medium text-foreground">
                    {pickStr(rev, "action") ?? "—"}{" "}
                    <span className="font-normal text-muted-foreground">
                      ({pickStr(rev, "fromStatus")} → {pickStr(rev, "toStatus")})
                    </span>
                  </p>
                  <p className="mt-1 text-muted-foreground">
                    {fmtDate(pickStr(rev, "processedAt"))}
                  </p>
                  {pickStr(rev, "note") ? (
                    <p className="mt-1">{pickStr(rev, "note")}</p>
                  ) : null}
                  {pickStr(rev, "reason") ? (
                    <p className="mt-1 text-destructive">
                      Lý do: {pickStr(rev, "reason")}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
