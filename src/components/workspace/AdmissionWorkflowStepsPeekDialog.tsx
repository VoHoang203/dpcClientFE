"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { unwrapPartyAdmissionPayload } from "@/lib/partyAdmissionAdapter";
import {
  extractPartyAdmissionError,
  partyAdmissionService,
} from "@/services/partyAdmissionService";
import { AdmissionStepDetailDialog } from "@/components/workspace/AdmissionStepDetailDialog";

function stepTitleFromRecord(st: Record<string, unknown>): string {
  const n = st.stepName ?? st.title;
  if (typeof n === "string" && n.trim()) return n.trim();
  const c = st.stepCode ?? st.code;
  if (typeof c === "string" && c.trim()) return c.trim();
  return "Bước";
}

export type AdmissionWorkflowStepsPeekDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  admissionId: string | null;
  /** Từ danh sách — hiển thị khi chưa tải xong GET chi tiết. */
  applicationCodeHint?: string | null;
};

/**
 * Popup danh sách bước + “Xem chi tiết bước” giống luồng `/workspace/admission-progress`.
 */
export function AdmissionWorkflowStepsPeekDialog({
  open,
  onOpenChange,
  admissionId,
  applicationCodeHint,
}: AdmissionWorkflowStepsPeekDialogProps) {
  const [loading, setLoading] = useState(false);
  const [steps, setSteps] = useState<Record<string, unknown>[]>([]);
  const [code, setCode] = useState<string | null>(null);
  const [stepDetailOpen, setStepDetailOpen] = useState(false);
  const [stepDetailRecord, setStepDetailRecord] = useState<Record<
    string,
    unknown
  > | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !admissionId) {
      setSteps([]);
      setCode(null);
      setLoadError(null);
      setStepDetailOpen(false);
      setStepDetailRecord(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    partyAdmissionService
      .getById(admissionId)
      .then((raw) => {
        if (cancelled) return;
        const u = unwrapPartyAdmissionPayload(raw);
        const s = u.steps;
        setSteps(Array.isArray(s) ? (s as Record<string, unknown>[]) : []);
        const c = u.code;
        setCode(typeof c === "string" && c.trim() ? c.trim() : null);
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setSteps([]);
          setCode(null);
          setLoadError(extractPartyAdmissionError(e));
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, admissionId]);

  const displayCode = code ?? applicationCodeHint ?? null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Chi tiết tiến độ bước</DialogTitle>
            {displayCode ? (
              <p className="text-xs text-muted-foreground">
                Mã hồ sơ: {displayCode}
              </p>
            ) : null}
          </DialogHeader>
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              Đang tải…
            </div>
          ) : null}
          {loadError ? (
            <p className="text-sm text-destructive">{loadError}</p>
          ) : null}
          {!loading && !loadError && steps.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Chưa có dữ liệu bước từ máy chủ.
            </p>
          ) : null}
          {!loading && !loadError && steps.length > 0 ? (
            <ul className="space-y-3">
              {steps.map((st, i) => (
                <li
                  key={i}
                  className="rounded-lg border border-border bg-muted/30 p-3"
                >
                  <p className="text-sm font-medium text-foreground">
                    {stepTitleFromRecord(st)}
                  </p>
                  <Button
                    type="button"
                    variant="link"
                    className="mt-1 h-auto p-0 text-sm"
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
          ) : null}
        </DialogContent>
      </Dialog>
      <AdmissionStepDetailDialog
        open={stepDetailOpen}
        onOpenChange={setStepDetailOpen}
        step={stepDetailRecord}
        applicationCode={displayCode}
      />
    </>
  );
}
