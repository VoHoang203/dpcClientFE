import {
  ADMISSION_WORKFLOW_STEP_SEQUENCE,
  AdmissionOverallStatus,
  AdmissionWorkflowStep,
  type AdmissionWorkflowStep as AdmissionWorkflowStepType,
} from "@/lib/partyAdmissionEnums";

export function admissionStepCodeToNumber(code: string): number {
  const i = ADMISSION_WORKFLOW_STEP_SEQUENCE.indexOf(
    code as AdmissionWorkflowStepType
  );
  return i >= 0 ? i + 1 : 1;
}

/**
 * `currentStepCode` cho approve/return — ưu tiên my-pending (`application.currentWorkflowStepCode`),
 * sau `currentStepCode` từ GET `.../detail`, cuối cùng map từ `dbStep` 1–7.
 */
export function resolveWorkflowStepCodeForApi(
  currentStepCode: string | null | undefined,
  numericStep: number | null | undefined
): string {
  const c = (currentStepCode ?? "").trim();
  if (c) return c;
  const n = numericStep;
  if (typeof n === "number" && n >= 1 && n <= 7) {
    return (
      ADMISSION_WORKFLOW_STEP_SEQUENCE[n - 1] ?? AdmissionWorkflowStep.APPLICATION
    );
  }
  return AdmissionWorkflowStep.APPLICATION;
}

/** Bước UI (1–8): 8 = đã xong toàn bộ 7 bước nghiệp vụ. */
export function deriveAdmissionNumericStep(
  stepCode: string | null | undefined,
  overallStatus: string | null | undefined
): number {
  const s = (overallStatus ?? "").trim().toUpperCase();
  if (s === AdmissionOverallStatus.DRAFT) {
    return 1;
  }
  if (
    s === AdmissionOverallStatus.APPROVED ||
    (stepCode ?? "").trim().toUpperCase() === "COMPLETED"
  ) {
    return 8;
  }
  return admissionStepCodeToNumber((stepCode ?? "APPLICATION").trim());
}

export function normalizeOverallStatus(raw: string | null | undefined): string {
  const u = (raw ?? "").trim().toUpperCase();
  if (!u) return AdmissionOverallStatus.IN_PROGRESS;
  if (u === "ACTIVE") return AdmissionOverallStatus.IN_PROGRESS;
  return u;
}

export function toUiWorkflowStatus(overall: string): string {
  const u = overall.trim().toUpperCase();
  if (u === AdmissionOverallStatus.REJECTED) return "rejected";
  if (u === AdmissionOverallStatus.CANCELLED) return "rejected";
  if (u === AdmissionOverallStatus.APPROVED) return "completed";
  if (u === AdmissionOverallStatus.RETURNED) return "returned";
  if (u === AdmissionOverallStatus.DRAFT) return "draft";
  return "active";
}
