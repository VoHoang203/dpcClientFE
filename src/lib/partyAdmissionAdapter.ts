import { unwrapApiList } from "@/lib/helpers";
import {
  ADMISSION_STEP_DEFINITIONS,
  reviewBucketFromStep,
} from "@/lib/admissionWorkflow";
import {
  AdmissionDocumentType,
  AdmissionOverallStatus,
  AdmissionWorkflowStep,
  ADMISSION_WORKFLOW_STEP_SEQUENCE,
} from "@/lib/partyAdmissionEnums";

const KNOWN_DOC_TYPE_KEYS = new Set<string>(
  Object.values(AdmissionDocumentType) as string[]
);

const PENDING_STEP_NOTE =
  "Bước này chưa có dữ liệu chi tiết từ máy chủ (chưa mở hoặc chưa tới lượt).";
import {
  admissionStepCodeToNumber,
  deriveAdmissionNumericStep,
  normalizeOverallStatus,
  toUiWorkflowStatus,
} from "@/lib/partyAdmissionStepUtils";
import type { AdmissionApiListItem } from "@/lib/admissionUiMap";

export type PartyAdmissionProgressRow = {
  stepNumber: number;
  title: string;
  description: string;
  isCompleted: boolean;
  completionDate: string | null;
  note: string | null;
  /** Bản ghi bước từ BE (popup chi tiết). */
  rawStep?: Record<string, unknown>;
};

export type PartyAdmissionSessionPayload = {
  admission: {
    id: string;
    /** Ví dụ PA-2026-0001 */
    code?: string | null;
    fullName: string;
    currentStep: number;
    /** Mã bước thực tế từ Backend (ví dụ: APPLICATION, LOCAL_VERIFICATION). */
    rawStepCode: string;
    workflowStatus: string;
    remark: string | null;
    phone?: string | null;
    email?: string | null;
    dateOfBirth?: string | null;
    permanentAddress?: string | null;
    /** Lý do xin vào Đảng (formData.reason bước APPLICATION). */
    reason?: string | null;
    /** viewUrl / objectName đã lưu — merge khi lưu nháp / gửi không cần upload lại. */
    documentKeys?: Partial<Record<string, string>>;
  };
  progress: PartyAdmissionProgressRow[];
  attachments?: Array<{
    id: string;
    kind: string;
    fileName: string | null;
    fileUrl: string;
    mimeType: string | null;
    createdAt: string;
  }>;
};

function pickStr(o: unknown, ...keys: string[]): string | null {
  if (!o || typeof o !== "object") return null;
  const obj = o as Record<string, unknown>;
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "string" && v.trim()) return v.trim();
    if (typeof v === "number" && Number.isFinite(v)) return String(v);
  }
  return null;
}

/** Giá trị từng `documentType` (viewUrl / objectName / …) từ `documents` / `documentsMeta` của BE. */
export function extractDocumentKeysFromMeta(
  meta: Record<string, unknown> | null
): Partial<Record<string, string>> | undefined {
  if (!meta) return undefined;
  const out: Partial<Record<string, string>> = {};
  for (const [k, v] of Object.entries(meta)) {
    if (typeof v === "string" && v.trim()) {
      out[k] = v.trim();
      continue;
    }
    if (v && typeof v === "object") {
      const o = v as Record<string, unknown>;
      const s =
        pickStr(
          o,
          "viewUrl",
          "view_url",
          "openUrl",
          "open_url",
          "objectName",
          "object_name",
          "fileKey",
          "key",
          "url",
          "path"
        ) ?? null;
      if (s) out[k] = s;
    }
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

/** Bóc envelope BE `{ statusCode, data }` hoặc `{ data: { admission } }`. */
export function unwrapPartyAdmissionPayload(raw: unknown): Record<string, unknown> {
  let cur: unknown = raw;
  for (let i = 0; i < 6; i++) {
    if (!cur || typeof cur !== "object") break;
    const o = cur as Record<string, unknown>;
    if (typeof o.id === "string" && o.id.length > 0) {
      return o;
    }
    if (typeof o.applicationId === "string" && o.applicationId.length > 0) {
      return o;
    }
    if (o.admission && typeof o.admission === "object") {
      cur = o.admission;
      continue;
    }
    if (o.data !== undefined) {
      cur = o.data;
      continue;
    }
    break;
  }
  return (cur && typeof cur === "object" ? cur : {}) as Record<string, unknown>;
}

function extractFullNameFromPayload(row: Record<string, unknown>): string {
  const direct = pickStr(row, "fullName", "full_name", "applicantName", "name");
  if (direct) return direct;

  const oi = row.outstandingIndividual;
  if (oi && typeof oi === "object") {
    const o = oi as Record<string, unknown>;
    const fromOi = pickStr(o, "fullName", "full_name", "name");
    if (fromOi) return fromOi;
    const u = pickStr(o, "username", "userName");
    if (u) return u;
  }

  const fromSubmissions = (container: Record<string, unknown>): string | null => {
    const subs = container.submissions;
    if (!Array.isArray(subs) || subs.length === 0) return null;
    const list = subs as Record<string, unknown>[];
    const latest =
      list.find((s) => s.isLatest === true) ?? list[list.length - 1];
    const fd = latest?.formData;
    if (fd && typeof fd === "object") {
      return pickStr(fd as Record<string, unknown>, "fullName", "full_name", "name");
    }
    return null;
  };

  const cs = row.currentStep;
  if (cs && typeof cs === "object") {
    const n = fromSubmissions(cs as Record<string, unknown>);
    if (n) return n;
  }
  const steps = row.steps;
  if (Array.isArray(steps)) {
    for (const st of steps) {
      if (st && typeof st === "object") {
        const n = fromSubmissions(st as Record<string, unknown>);
        if (n) return n;
      }
    }
  }
  return "—";
}

/** `formData` mới nhất của bước APPLICATION (GET my-current-status / detail). */
export function pickLatestApplicationFormDataFromPayload(
  row: Record<string, unknown>
): Record<string, unknown> | null {
  const appCode = String(AdmissionWorkflowStep.APPLICATION).toUpperCase();
  const stepCodeOf = (step: Record<string, unknown>) =>
    String(pickStr(step, "stepCode", "code") ?? "").toUpperCase();

  const pickFdFromStep = (
    step: Record<string, unknown> | null
  ): Record<string, unknown> | null => {
    if (!step) return null;
    if (stepCodeOf(step) !== appCode) return null;
    const subs = step.submissions;
    if (!Array.isArray(subs) || subs.length === 0) return null;
    const list = subs as Record<string, unknown>[];
    const latest =
      list.find((s) => s.isLatest === true) ?? list[list.length - 1];
    const fd = latest?.formData;
    return fd && typeof fd === "object" ? (fd as Record<string, unknown>) : null;
  };

  const cs = row.currentStep;
  if (cs && typeof cs === "object") {
    const fd = pickFdFromStep(cs as Record<string, unknown>);
    if (fd) return fd;
  }
  const steps = row.steps;
  if (!Array.isArray(steps)) return null;
  for (const st of steps) {
    if (st && typeof st === "object") {
      const fd = pickFdFromStep(st as Record<string, unknown>);
      if (fd) return fd;
    }
  }
  return null;
}

function documentKeysFromFlatFormData(
  fd: Record<string, unknown>
): Partial<Record<string, string>> | undefined {
  const out: Partial<Record<string, string>> = {};
  for (const [k, v] of Object.entries(fd)) {
    if (!KNOWN_DOC_TYPE_KEYS.has(k)) continue;
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
  return Object.keys(out).length > 0 ? out : undefined;
}

function pickReturnRemarkFromSteps(row: Record<string, unknown>): string | null {
  const steps = row.steps;
  if (!Array.isArray(steps)) return null;
  const returned: Record<string, unknown>[] = [];
  for (const st of steps) {
    if (!st || typeof st !== "object") continue;
    const o = st as Record<string, unknown>;
    if (String(o.status ?? "").toUpperCase() === "RETURNED") returned.push(o);
  }
  for (let i = returned.length - 1; i >= 0; i--) {
    const o = returned[i];
    const reviews = o.reviews;
    if (Array.isArray(reviews) && reviews.length > 0) {
      for (let j = reviews.length - 1; j >= 0; j--) {
        const rev = reviews[j];
        if (!rev || typeof rev !== "object") continue;
        const reason = pickStr(rev as Record<string, unknown>, "reason", "note");
        if (reason) return reason;
      }
    }
    const note = pickStr(o, "note");
    if (note) return note;
  }
  return null;
}

function pickRemarkFromPayload(
  row: Record<string, unknown>,
  overallNormalized: string
): string | null {
  if (overallNormalized === AdmissionOverallStatus.RETURNED) {
    const fromReturn = pickReturnRemarkFromSteps(row);
    if (fromReturn) return fromReturn;
  }
  const r = pickStr(row, "remark", "returnReason", "rejectReason", "comment");
  if (r) return r;
  const cs = row.currentStep;
  if (cs && typeof cs === "object") {
    return pickStr(cs as Record<string, unknown>, "note");
  }
  return null;
}

/** Map `steps[]` từ GET /admission-applications/my-current-status → 7 dòng UI. */
export function adaptApiStepsToProgress(
  stepsRaw: unknown
): PartyAdmissionProgressRow[] {
  const list = Array.isArray(stepsRaw)
    ? (stepsRaw as Record<string, unknown>[])
    : [];
  const byOrder = new Map<number, Record<string, unknown>>();
  for (const s of list) {
    const ordRaw = s.stepOrder;
    const ord =
      typeof ordRaw === "number"
        ? ordRaw
        : typeof ordRaw === "string" && /^\d+$/.test(ordRaw)
          ? parseInt(ordRaw, 10)
          : NaN;
    if (Number.isFinite(ord) && ord >= 1 && ord <= 7) {
      byOrder.set(ord, s);
    }
  }

  return ADMISSION_STEP_DEFINITIONS.map((def) => {
    const api = byOrder.get(def.step);
    if (!api) {
      const code =
        ADMISSION_WORKFLOW_STEP_SEQUENCE[def.step - 1] ?? "APPLICATION";
      return {
        stepNumber: def.step,
        title: def.title,
        description: def.description,
        isCompleted: false,
        completionDate: null,
        note: null,
        rawStep: {
          stepName: def.title,
          stepCode: code,
          note: PENDING_STEP_NOTE,
          status: "NOT_STARTED",
        },
      };
    }
    const st = String(api.status ?? "").toUpperCase();
    const isCompleted = Boolean(api.isCompleted) || st === "COMPLETED";
    const title = pickStr(api, "stepName", "title") ?? def.title;
    return {
      stepNumber: def.step,
      title,
      description: def.description,
      isCompleted,
      completionDate: pickStr(api, "completedAt", "processedAt"),
      note: pickStr(api, "note"),
      rawStep: api,
    };
  });
}

function pickStepCode(row: Record<string, unknown>): string {
  const c =
    row.currentWorkflowStep ??
    row.currentStepCode ??
    row.workflowStep ??
    row.stepCode;
  if (typeof c === "string" && c.trim()) return c.trim();
  const cs = row.currentStep;
  if (cs && typeof cs === "object") {
    const inner = pickStr(cs as Record<string, unknown>, "stepCode", "code");
    if (inner) return inner;
  }
  const n = row.currentStep;
  if (typeof n === "number" && n >= 1 && n <= 7) {
    return ADMISSION_WORKFLOW_STEP_SEQUENCE[n - 1] ?? "APPLICATION";
  }
  if (typeof n === "string" && /^\d+$/.test(n)) {
    const num = parseInt(n, 10);
    if (num >= 1 && num <= 7) {
      return ADMISSION_WORKFLOW_STEP_SEQUENCE[num - 1] ?? "APPLICATION";
    }
  }
  return "APPLICATION";
}

export function parsePartyAdmissionRow(
  raw: unknown
): {
  id: string;
  fullName: string;
  currentStepCode: string;
  overallStatus: string;
  currentStepName: string | null;
  currentHandler: string | null;
  username: string | null;
  remark: string | null;
  phone: string | null;
  email: string | null;
  dateOfBirth: string | null;
  permanentAddress: string | null;
  createdAt: string;
  submitterUserId: string | null;
  partyMemberId: string | null;
  documentsMeta: Record<string, unknown> | null;
  priority: string;
  /** Mã hồ sơ (vd. PADM-…). */
  code: string | null;
} | null {
  const row = unwrapPartyAdmissionPayload(raw);
  const id =
    pickStr(row, "applicationId", "id", "admissionId", "partyAdmissionId") ??
    (typeof row.id === "string" ? row.id : null);
  if (!id) return null;

  const fullName = extractFullNameFromPayload(row);
  const currentStepCode = pickStepCode(row);
  const overallStatus = normalizeOverallStatus(
    pickStr(row, "overallStatus", "admissionStatus") ??
      pickStr(row, "workflowStatus", "status") ??
      AdmissionOverallStatus.IN_PROGRESS
  );
  const currentStepName = pickStr(row, "currentStepName", "stepName");
  const currentHandler = pickStr(row, "currentHandler", "handler", "assignedTo");
  const oi = row.outstandingIndividual;
  const username =
    oi && typeof oi === "object"
      ? pickStr(oi as Record<string, unknown>, "username", "userName")
      : null;
  const emailFromOi =
    oi && typeof oi === "object"
      ? pickStr(oi as Record<string, unknown>, "email")
      : null;
  const remark = pickRemarkFromPayload(row, overallStatus);

  const appForm = pickLatestApplicationFormDataFromPayload(row);
  const phone =
    pickStr(row, "phone", "phoneNumber") ??
    (appForm ? pickStr(appForm, "phone", "phoneNumber") : null);
  const email =
    (appForm ? pickStr(appForm, "email") : null) ??
    emailFromOi ??
    pickStr(row, "email");
  const dateOfBirth =
    pickStr(row, "dateOfBirth", "date_of_birth", "dob") ??
    (appForm ? pickStr(appForm, "dateOfBirth", "date_of_birth", "dob") : null);
  const permanentAddress =
    pickStr(row, "permanentAddress", "permanent_address", "address") ??
    (appForm
      ? pickStr(appForm, "permanentAddress", "permanent_address", "address")
      : null);

  return {
    id,
    fullName,
    currentStepCode,
    overallStatus,
    currentStepName,
    currentHandler,
    username,
    remark,
    phone,
    email,
    dateOfBirth,
    permanentAddress,
    createdAt:
      pickStr(row, "createdAt", "created_at", "submittedAt") ??
      new Date().toISOString(),
    submitterUserId: pickStr(
      row,
      "outstandingIndividualId",
      "submitterUserId",
      "submitter_user_id",
      "userId"
    ),
    partyMemberId: pickStr(row, "partyMemberId", "party_member_id", "memberId"),
    documentsMeta:
      row.documentsMeta && typeof row.documentsMeta === "object"
        ? (row.documentsMeta as Record<string, unknown>)
        : row.documents && typeof row.documents === "object"
          ? (row.documents as Record<string, unknown>)
          : null,
    priority: pickStr(row, "priority") ?? "normal",
    code: pickStr(row, "code", "applicationCode"),
  };
}

export function buildSyntheticProgress(
  currentNumericStep: number
): PartyAdmissionProgressRow[] {
  return ADMISSION_STEP_DEFINITIONS.map((def) => ({
    stepNumber: def.step,
    title: def.title,
    description: def.description,
    isCompleted:
      currentNumericStep >= 8 ? true : def.step < currentNumericStep,
    completionDate: null,
    note: null,
  }));
}

export function adaptHistoryToProgress(historyRaw: unknown): PartyAdmissionProgressRow[] {
  const list = unwrapApiList<Record<string, unknown>>(historyRaw);
  if (list.length === 0) return [];

  return list.map((o, idx) => {
    const code =
      pickStr(o, "stepCode", "workflowStep", "step", "code", "stage") ?? "";
    let stepNum = code ? admissionStepCodeToNumber(code) : idx + 1;
    if (stepNum < 1 || stepNum > 7) stepNum = idx + 1;
    const def = ADMISSION_STEP_DEFINITIONS[stepNum - 1];
    return {
      stepNumber: stepNum,
      title: pickStr(o, "title", "stepName") ?? def?.title ?? `Bước ${stepNum}`,
      description:
        pickStr(o, "description") ?? def?.description ?? "",
      isCompleted: Boolean(o.isCompleted ?? o.completed ?? o.done),
      completionDate:
        pickStr(o, "completedAt", "completionDate", "at", "updatedAt"),
      note: pickStr(o, "note", "comment", "remark"),
    };
  });
}

function mergeProgressRows(
  history: PartyAdmissionProgressRow[],
  synthetic: PartyAdmissionProgressRow[]
): PartyAdmissionProgressRow[] {
  const map = new Map<number, PartyAdmissionProgressRow>();
  synthetic.forEach((r) => map.set(r.stepNumber, { ...r }));
  history.forEach((h) => {
    const base = map.get(h.stepNumber);
    map.set(h.stepNumber, {
      stepNumber: h.stepNumber,
      title: h.title || base?.title || "",
      description: h.description || base?.description || "",
      isCompleted: h.isCompleted || base?.isCompleted || false,
      completionDate: h.completionDate ?? base?.completionDate ?? null,
      note: h.note ?? base?.note ?? null,
      rawStep: h.rawStep ?? base?.rawStep,
    });
  });
  return ADMISSION_STEP_DEFINITIONS.map((d) => map.get(d.step)!);
}

const NOT_STARTED_NOTE =
  "Chưa bắt đầu quy trình. Nộp đơn và giấy tờ tại mục Xin làm Đảng viên.";

/** 404 my-current-status — 0/7 bước hoàn thành, không coi là lỗi. */
export function buildNotStartedSessionPayload(): PartyAdmissionSessionPayload {
  const progress: PartyAdmissionProgressRow[] = ADMISSION_STEP_DEFINITIONS.map(
    (def) => {
      const code =
        ADMISSION_WORKFLOW_STEP_SEQUENCE[def.step - 1] ?? "APPLICATION";
      return {
        stepNumber: def.step,
        title: def.title,
        description: def.description,
        isCompleted: false,
        completionDate: null,
        note: null,
        rawStep: {
          stepName: def.title,
          stepCode: code,
          note: NOT_STARTED_NOTE,
          status: "NOT_STARTED",
        },
      };
    }
  );

  return {
    admission: {
      id: "",
      code: null,
      fullName: "—",
      currentStep: 1,
      rawStepCode: "APPLICATION",
      workflowStatus: "not_started",
      remark: null,
    },
    progress,
  };
}

export function adaptToSessionPayload(
  meRaw: unknown,
  historyRaw: unknown | null
): PartyAdmissionSessionPayload | null {
  const row = parsePartyAdmissionRow(meRaw);
  if (!row) return null;

  const unwrapped = unwrapPartyAdmissionPayload(meRaw);
  const numericStep = deriveAdmissionNumericStep(
    row.currentStepCode,
    row.overallStatus
  );
  const synthetic = buildSyntheticProgress(numericStep);
  let progress = synthetic;

  if (Array.isArray(unwrapped.steps) && unwrapped.steps.length > 0) {
    progress = adaptApiStepsToProgress(unwrapped.steps);
  } else if (historyRaw != null) {
    const fromHist = adaptHistoryToProgress(historyRaw);
    if (fromHist.length > 0) {
      progress = mergeProgressRows(fromHist, synthetic);
    }
  }

  const appForm = pickLatestApplicationFormDataFromPayload(unwrapped);
  const keysFromForm = appForm ? documentKeysFromFlatFormData(appForm) : undefined;
  const keysFromMeta = extractDocumentKeysFromMeta(row.documentsMeta);
  const documentKeysMerged = {
    ...(keysFromMeta ?? {}),
    ...(keysFromForm ?? {}),
  };
  const documentKeys =
    Object.keys(documentKeysMerged).length > 0 ? documentKeysMerged : undefined;
  const reasonFromForm = appForm ? pickStr(appForm, "reason", "motivation") : null;

  return {
    admission: {
      id: row.id,
      code: pickStr(unwrapped, "code"),
      fullName: row.fullName,
      currentStep: numericStep,
      rawStepCode: row.currentStepCode ?? "APPLICATION",
      workflowStatus: toUiWorkflowStatus(row.overallStatus),
      remark: row.remark,
      phone: row.phone,
      email: row.email,
      dateOfBirth: row.dateOfBirth,
      permanentAddress: row.permanentAddress,
      reason: reasonFromForm,
      documentKeys,
    },
    progress,
  };
}

function attachmentRowFromValue(
  kind: string,
  val: unknown,
  index: number
): {
  id: string;
  kind: string;
  fileName: string | null;
  fileUrl: string;
  mimeType: string | null;
} | null {
  if (typeof val === "string") {
    const u = val.trim();
    if (!u) return null;
    return {
      id: `${kind}-${index}`,
      kind,
      fileName: null,
      fileUrl: u,
      mimeType: null,
    };
  }
  if (val && typeof val === "object") {
    const o = val as Record<string, unknown>;
    const fileUrl =
      pickStr(
        o,
        "viewUrl",
        "view_url",
        "openUrl",
        "open_url",
        "fileUrl",
        "url",
        "objectName",
        "object_name",
        "path"
      ) ?? "";
    if (!fileUrl.trim()) return null;
    return {
      id: pickStr(o, "id", "documentId") ?? `${kind}-${index}`,
      kind: pickStr(o, "documentType", "type", "kind", "code") || kind,
      fileName: pickStr(o, "fileName", "file_name", "name"),
      fileUrl: fileUrl.trim(),
      mimeType: pickStr(o, "mimeType", "mime_type"),
    };
  }
  return null;
}

function attachmentsFromFlatFormData(fd: Record<string, unknown>): Array<{
  id: string;
  kind: string;
  fileName: string | null;
  fileUrl: string;
  mimeType: string | null;
}> {
  const out: Array<{
    id: string;
    kind: string;
    fileName: string | null;
    fileUrl: string;
    mimeType: string | null;
  }> = [];
  let i = 0;
  for (const [k, v] of Object.entries(fd)) {
    if (!KNOWN_DOC_TYPE_KEYS.has(k)) continue;
    const row = attachmentRowFromValue(k, v, i++);
    if (row) out.push(row);
  }
  return out;
}

export function adaptDetailAttachments(raw: unknown): Array<{
  id: string;
  kind: string;
  fileName: string | null;
  fileUrl: string;
  mimeType: string | null;
}> {
  const payload = unwrapPartyAdmissionPayload(raw);
  const fd =
    payload.formData && typeof payload.formData === "object"
      ? (payload.formData as Record<string, unknown>)
      : null;

  let docs: unknown = payload.documents ?? payload.attachments;
  if (
    fd?.documents &&
    typeof fd.documents === "object" &&
    !Array.isArray(fd.documents)
  ) {
    docs = fd.documents;
  }

  if (Array.isArray(docs)) {
    return docs
      .map((item, i) => {
        if (!item || typeof item !== "object") return null;
        const o = item as Record<string, unknown>;
        const kind =
          pickStr(o, "documentType", "type", "kind", "code") || `file-${i}`;
        return attachmentRowFromValue(kind, item, i);
      })
      .filter((x): x is NonNullable<typeof x> => x != null && Boolean(x.fileUrl));
  }

  if (docs && typeof docs === "object" && !Array.isArray(docs)) {
    const out: Array<{
      id: string;
      kind: string;
      fileName: string | null;
      fileUrl: string;
      mimeType: string | null;
    }> = [];
    let i = 0;
    for (const [kind, val] of Object.entries(docs as Record<string, unknown>)) {
      const row = attachmentRowFromValue(kind, val, i++);
      if (row) out.push(row);
    }
    if (out.length > 0) return out;
  }

  if (fd) {
    const fromFlat = attachmentsFromFlatFormData(fd);
    if (fromFlat.length > 0) return fromFlat;
  }

  return [];
}

export function adaptListItem(raw: unknown): AdmissionApiListItem | null {
  const row = parsePartyAdmissionRow(raw);
  if (!row) return null;

  const numericStep = deriveAdmissionNumericStep(
    row.currentStepCode,
    row.overallStatus
  );
  const wf =
    row.overallStatus === AdmissionOverallStatus.REJECTED ||
    row.overallStatus === AdmissionOverallStatus.CANCELLED
      ? "rejected"
      : row.overallStatus === AdmissionOverallStatus.APPROVED
        ? "completed"
        : "active";

  return {
    id: row.id,
    submitterUserId: row.submitterUserId,
    partyMemberId: row.partyMemberId,
    fullName: row.fullName,
    phone: row.phone,
    email: row.email,
    username: row.username,
    currentHandler: row.currentHandler,
    currentStepName: row.currentStepName,
    currentStepCode: row.currentStepCode,
    applicationCode: row.code,
    overallStatusRaw: row.overallStatus,
    dateOfBirth: row.dateOfBirth,
    permanentAddress: row.permanentAddress,
    createdAt: row.createdAt,
    currentStep: numericStep,
    workflowStatus: wf,
    priority: row.priority,
    documentsMeta: row.documentsMeta,
    reviewBucket: reviewBucketFromStep(numericStep),
  };
}
