import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";
import type { AdmissionApplication } from "@/components/workspace/ReviewDetailDialog";

export type AdmissionAttachmentListItem = {
  id: string;
  kind: string;
  fileName: string | null;
  fileUrl: string;
  mimeType: string | null;
  createdAt: string;
};

export type AdmissionApiListItem = {
  id: string;
  /** Neon `party_admissions.submitter_user_id` — dùng làm `{id}` assign-position (nếu không ghi đè). */
  submitterUserId?: string | null;
  partyMemberId?: string | null;
  attachments?: AdmissionAttachmentListItem[];
  fullName: string;
  phone: string | null;
  email: string | null;
  dateOfBirth: string | null;
  permanentAddress: string | null;
  createdAt: string;
  currentStep: number;
  workflowStatus: string;
  priority: string;
  documentsMeta: Record<string, unknown> | null;
  reviewBucket: string;
};

export function reviewBucketToStage(bucket: string): number {
  switch (bucket) {
    case "preliminary":
      return 0;
    case "verification":
      return 1;
    case "resolution":
      return 2;
    case "done":
      return 3;
    default:
      return 0;
  }
}

const DOC_NAMES = [
  "Đơn xin vào Đảng",
  "Lý lịch tự khai",
  "Giấy giới thiệu",
  "Nghị quyết chi đoàn",
] as const;

function docsFromMeta(meta: unknown) {
  if (!meta || typeof meta !== "object") {
    return DOC_NAMES.map((name) => ({ name, submitted: false }));
  }
  const m = meta as Record<string, unknown>;
  return [
    { name: DOC_NAMES[0], submitted: Boolean(m.don) },
    { name: DOC_NAMES[1], submitted: Boolean(m.ly_lich ?? m.lyLich) },
    { name: DOC_NAMES[2], submitted: Boolean(m.gioi_thieu ?? m.gioiThieu) },
    {
      name: DOC_NAMES[3],
      submitted: Boolean(m.nghi_quyet_doan ?? m.nghiQuyetDoan),
    },
  ];
}

export function mapAdmissionApiToApplication(
  row: AdmissionApiListItem
): AdmissionApplication {
  const stage = reviewBucketToStage(row.reviewBucket);
  const pri =
    row.priority === "priority"
      ? "high"
      : row.priority === "low"
        ? "low"
        : "normal";

  let dob = "—";
  if (row.dateOfBirth) {
    try {
      const d = new Date(row.dateOfBirth);
      if (!Number.isNaN(d.getTime())) {
        dob = d.toLocaleDateString("vi-VN");
      }
    } catch {
      dob = row.dateOfBirth;
    }
  }

  let submittedAt = "—";
  try {
    submittedAt = formatDistanceToNow(new Date(row.createdAt), {
      addSuffix: true,
      locale: vi,
    });
  } catch {
    submittedAt = String(row.createdAt);
  }

  return {
    id: row.id,
    submitterUserId: row.submitterUserId ?? null,
    partyMemberId: row.partyMemberId ?? null,
    applicantName: row.fullName,
    dob,
    phone: row.phone || "—",
    address: row.permanentAddress || "—",
    submittedAt,
    currentStage: stage,
    status:
      row.workflowStatus === "active"
        ? "reviewing"
        : row.workflowStatus === "rejected"
          ? "rejected"
          : "approved",
    priority: pri,
    documents: docsFromMeta(row.documentsMeta),
    comments: [],
  };
}
