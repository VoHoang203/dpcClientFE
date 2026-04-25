"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
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

function SelectedSubmissionDetail({
  sub,
}: {
  sub: Record<string, unknown>;
}) {
  const fd = sub.formData;
  const fdObj =
    fd && typeof fd === "object" && !Array.isArray(fd)
      ? (fd as Record<string, unknown>)
      : null;
  return (
    <>
      <div className="mb-2 flex flex-wrap items-center gap-2 border-b border-border/60 pb-2">
        <span className="font-medium text-foreground">Chi tiết lần nộp</span>
        {pickStr(sub, "note") ? (
          <span className="italic text-muted-foreground">
            {pickStr(sub, "note")}
          </span>
        ) : null}
      </div>
      {fdObj ? (
        <SubmissionFormDataView formData={fdObj} />
      ) : fd !== null && fd !== undefined ? (
        <p className="text-muted-foreground">
          Không hiển thị được dạng form (formData không phải object).
        </p>
      ) : null}
    </>
  );
}

/**
 * Gộp `formData.documents` vào các key phẳng (ưu tiên URL trong `documents`);
 * bỏ key `documents` để không render JSON thô trùng với DON_XIN_VAO_DANG, …
 */
function flattenFormDataForDisplay(
  formData: Record<string, unknown>
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...formData };
  const nested = out.documents;
  delete out.documents;
  if (nested && typeof nested === "object" && !Array.isArray(nested)) {
    for (const [k, v] of Object.entries(nested as Record<string, unknown>)) {
      if (typeof v === "string" && v.trim()) {
        out[k] = v.trim();
        continue;
      }
      if (v && typeof v === "object" && !Array.isArray(v)) {
        const url =
          pickStr(
            v as Record<string, unknown>,
            "viewUrl",
            "view_url",
            "url",
            "objectName",
            "object_name"
          ) ?? "";
        if (url.trim()) out[k] = url.trim();
      }
    }
  }
  return out;
}

function SubmissionFormDataView({ formData }: { formData: Record<string, unknown> }) {
  const flat = flattenFormDataForDisplay(formData);
  const entries = Object.entries(flat);

  if (entries.length === 0) return null;
  return (
    <div className="mt-3 space-y-3">
      {entries.map(([k, v]) => (
        <FormDataFieldRow key={k} fieldKey={k} value={v} />
      ))}
    </div>
  );
}

function submissionSortKey(sub: Record<string, unknown>): number {
  const v = sub.version;
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && /^\d+$/.test(v)) return parseInt(v, 10);
  return 0;
}

function submissionTimeLabel(sub: Record<string, unknown>): string {
  return (
    fmtDate(pickStr(sub, "submittedAt")) ||
    fmtDate(pickStr(sub, "createdAt")) ||
    "—"
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
  const stepRecord =
    step && typeof step === "object" && Object.keys(step).length > 0
      ? step
      : null;

  const submissionsRaw = stepRecord?.submissions;
  const sortedSubmissions = useMemo(() => {
    if (!Array.isArray(submissionsRaw)) return [];
    const list = [...(submissionsRaw as Record<string, unknown>[])];
    list.sort((a, b) => submissionSortKey(a) - submissionSortKey(b));
    return list;
  }, [submissionsRaw]);

  const [selectedSubmissionId, setSelectedSubmissionId] = useState<string | null>(
    null
  );

  useEffect(() => {
    if (!open) {
      setSelectedSubmissionId(null);
      return;
    }
    if (sortedSubmissions.length === 0) return;
    const latest =
      sortedSubmissions.find((s) => s.isLatest === true) ??
      sortedSubmissions[sortedSubmissions.length - 1];
    const id = pickStr(latest, "id");
    setSelectedSubmissionId(id);
  }, [open, sortedSubmissions]);

  const selectedSubmission = useMemo(() => {
    if (sortedSubmissions.length === 0) return null;
    const byId = sortedSubmissions.find(
      (s) => pickStr(s, "id") === selectedSubmissionId
    );
    return byId ?? sortedSubmissions[sortedSubmissions.length - 1];
  }, [sortedSubmissions, selectedSubmissionId]);

  if (!stepRecord) {
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
    pickStr(stepRecord, "stepName", "title") ??
    pickStr(stepRecord, "stepCode") ??
    "Bước";
  const stepCode = pickStr(stepRecord, "stepCode", "code") ?? "—";
  const status = pickStr(stepRecord, "status") ?? "—";
  const note = pickStr(stepRecord, "note");


  const reviews = Array.isArray(stepRecord.reviews)
    ? (stepRecord.reviews as Record<string, unknown>[])
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
            {stepRecord.isCurrent === true ? (
              <Badge className="bg-primary/15 text-primary">Đang thực hiện</Badge>
            ) : null}
            {stepRecord.isCompleted === true ? (
              <Badge className="bg-green-100 text-green-800">Đã hoàn thành</Badge>
            ) : null}
            {stepRecord.isLocked === true ? (
              <Badge className="border-destructive/50 bg-destructive/10 text-destructive">
                Đã khóa
              </Badge>
            ) : null}
          </div>

          <div className="grid grid-cols-1 gap-1 text-muted-foreground sm:grid-cols-2">
            <p>
              <span className="font-medium text-foreground">Bắt đầu:</span>{" "}
              {fmtDate(pickStr(stepRecord, "startedAt"))}
            </p>
            <p>
              <span className="font-medium text-foreground">Nộp:</span>{" "}
              {fmtDate(pickStr(stepRecord, "submittedAt"))}
            </p>
            <p>
              <span className="font-medium text-foreground">Xử lý:</span>{" "}
              {fmtDate(pickStr(stepRecord, "processedAt"))}
            </p>
            <p>
              <span className="font-medium text-foreground">Hoàn thành:</span>{" "}
              {fmtDate(pickStr(stepRecord, "completedAt"))}
            </p>
            <p className="sm:col-span-2">
              <span className="font-medium text-foreground">Trả lại:</span>{" "}
              {fmtDate(pickStr(stepRecord, "returnedAt"))}
            </p>
          </div>

          {note ? (
            <div className="rounded-md border bg-muted/40 p-3">
              <p className="text-xs font-medium text-foreground">Ghi chú bước</p>
              <p className="mt-1 text-muted-foreground">{note}</p>
            </div>
          ) : null}
        </div>

        {sortedSubmissions.length > 0 && (
          <>
            <Separator className="my-4" />

            <h4 className="mb-2 text-sm font-semibold">Các lần nộp</h4>
            <p className="mb-3 text-xs text-muted-foreground">
              {sortedSubmissions.length > 1
                ? "Chọn một lần nộp để xem đầy đủ nội dung form và tệp đính kèm."
                : "Nội dung gửi kèm bước này."}
            </p>

            {sortedSubmissions.length > 1 ? (
              <div className="grid gap-4 sm:grid-cols-[minmax(0,11rem)_1fr]">
                <ul className="flex flex-col gap-1.5" role="tablist" aria-label="Danh sách lần nộp">
                  {sortedSubmissions.map((sub, idx) => {
                    const id = pickStr(sub, "id") ?? `sub-${idx}`;
                    const versionLabel = pickStr(sub, "version") ?? String(idx + 1);
                    const selected = id === selectedSubmissionId;
                    return (
                      <li key={id}>
                        <Button
                          type="button"
                          variant={selected ? "secondary" : "outline"}
                          size="sm"
                          className={cn(
                            "h-auto w-full flex-col items-stretch gap-0.5 py-2 text-left font-normal",
                            selected && "ring-2 ring-primary/40"
                          )}
                          onClick={() => setSelectedSubmissionId(id)}
                          aria-current={selected ? "true" : undefined}
                        >
                          <span className="text-xs font-semibold text-foreground">
                            Lần {idx + 1}
                            <span className="ml-1 font-normal text-muted-foreground">
                              (PB {versionLabel})
                            </span>
                          </span>
                          <span className="text-[11px] text-muted-foreground">
                            {submissionTimeLabel(sub)}
                          </span>
                          {sub.isLatest === true ? (
                            <Badge className="mt-1 h-5 w-fit text-[10px]">Mới nhất</Badge>
                          ) : null}
                        </Button>
                      </li>
                    );
                  })}
                </ul>
                <div className="min-w-0 rounded-lg border bg-muted/20 p-3 text-xs">
                  {selectedSubmission ? (
                    <SelectedSubmissionDetail sub={selectedSubmission} />
                  ) : null}
                </div>
              </div>
            ) : (
              <ul className="space-y-3">
                {sortedSubmissions.map((sub, i) => {
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
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-foreground">Lần 1</span>
                        {pickStr(sub, "version") ? (
                          <span className="text-muted-foreground">
                            Phiên bản {pickStr(sub, "version")}
                          </span>
                        ) : null}
                        {sub.isLatest === true ? (
                          <Badge className="h-5 text-[10px]">Mới nhất</Badge>
                        ) : null}
                      </div>
                      <p className="mt-1 text-muted-foreground">
                        Thời điểm: {submissionTimeLabel(sub)}

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
                          Không hiển thị được dạng form (formData không phải
                          object).
                        </p>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            )}
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
