import { format, formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";
import type { AdmissionApplication } from "@/components/workspace/ReviewDetailDialog";
import { extractDocumentKeysFromMeta } from "@/lib/partyAdmissionAdapter";

const OVERALL_STATUS_LABELS: Record<string, string> = {
  DRAFT: "Nháp",
  IN_PROGRESS: "Đang xử lý",
  RETURNED: "Trả lại bổ sung",
  REJECTED: "Từ chối",
  APPROVED: "Đã duyệt",
  CANCELLED: "Đã hủy",
};

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
  /** `submitter_user_id` từ BE admission-applications — dùng cho assign-position bước cuối. */
  submitterUserId?: string | null;
  partyMemberId?: string | null;
  attachments?: AdmissionAttachmentListItem[];
  fullName: string;
  phone: string | null;
  email: string | null;
  /** Từ `outstandingIndividual.username` (my-pending). */
  username: string | null;
  /** BE: ví dụ "Chi uỷ kiểm tra lỗi hồ sơ". */
  currentHandler: string | null;
  /** BE: ví dụ "Chi uỷ kiểm tra". */
  currentStepName: string | null;
  /** `currentStepCode` từ my-pending / chi tiết — workflow enum (CHI_UY_REVIEW, …). */
  currentStepCode: string;
  /** Mã hồ sơ (vd. PADM-…). */
  applicationCode: string | null;
  /** Chuỗi enum gốc: IN_PROGRESS, … */
  overallStatusRaw: string;
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

const META_LABELS: Record<string, string> = {
  DON_XIN_VAO_DANG: "Đơn xin vào Đảng",
  LY_LICH_NGUOI_XIN_VAO_DANG: "Lý lịch người xin vào Đảng",
  GIAY_GIOI_THIEU_DANG_VIEN_1: "Giấy giới thiệu ĐV (1)",
  GIAY_GIOI_THIEU_DANG_VIEN_2: "Giấy giới thiệu ĐV (2)",
  don: "Đơn xin vào Đảng",
  ly_lich: "Lý lịch tự khai",
  lyLich: "Lý lịch tự khai",
  gioi_thieu: "Giấy giới thiệu",
  gioiThieu: "Giấy giới thiệu",
  nghi_quyet_doan: "Nghị quyết chi đoàn",
  nghiQuyetDoan: "Nghị quyết chi đoàn",
};

/** Chỉ các tài liệu có URL (viewUrl/objectName) — không tạo ô “thiếu file” giả. */
function documentsWithUrlsFromMeta(meta: unknown): AdmissionApplication["documents"] {
  const urls = extractDocumentKeysFromMeta(
    meta && typeof meta === "object" ? (meta as Record<string, unknown>) : null
  );
  const rows: AdmissionApplication["documents"] = [];
  if (urls && Object.keys(urls).length > 0) {
    for (const [key, url] of Object.entries(urls)) {
      const u = url?.trim();
      if (!u) continue;
      rows.push({
        name: META_LABELS[key] || key,
        submitted: true,
        url: u,
      });
    }
    if (rows.length > 0) return rows;
  }
  if (meta && typeof meta === "object") {
    const m = meta as Record<string, unknown>;
    const legacy: [string[], string][] = [
      [["don", "DON_XIN_VAO_DANG"], "Đơn xin vào Đảng"],
      [
        ["ly_lich", "lyLich", "LY_LICH_NGUOI_XIN_VAO_DANG"],
        "Lý lịch người xin vào Đảng",
      ],
      [
        ["gioi_thieu", "gioiThieu", "GIAY_GIOI_THIEU_DANG_VIEN_1"],
        "Giấy giới thiệu ĐV (1)",
      ],
      [["GIAY_GIOI_THIEU_DANG_VIEN_2"], "Giấy giới thiệu ĐV (2)"],
      [["nghi_quyet_doan", "nghiQuyetDoan"], "Nghị quyết chi đoàn"],
    ];
    for (const [keys, label] of legacy) {
      for (const k of keys) {
        const v = m[k];
        if (typeof v === "string" && v.trim()) {
          rows.push({ name: label, submitted: true, url: v.trim() });
          break;
        }
      }
    }
  }
  return rows;
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

  let createdAtFormatted = "—";
  try {
    createdAtFormatted = format(new Date(row.createdAt), "dd/MM/yyyy HH:mm", {
      locale: vi,
    });
  } catch {
    createdAtFormatted = String(row.createdAt);
  }

  const overallStatusLabel =
    OVERALL_STATUS_LABELS[row.overallStatusRaw] ?? row.overallStatusRaw;

  return {
    id: row.id,
    submitterUserId: row.submitterUserId ?? null,
    partyMemberId: row.partyMemberId ?? null,
    applicantName: row.fullName,
    currentWorkflowStepCode: row.currentStepCode,
    applicationCode: row.applicationCode,
    username: row.username,
    applicantEmail: row.email,
    currentHandler: row.currentHandler,
    currentStepDisplayName: row.currentStepName,
    overallStatus: row.overallStatusRaw,
    overallStatusLabel,
    createdAtIso: row.createdAt,
    createdAtFormatted,
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
    documents: documentsWithUrlsFromMeta(row.documentsMeta),
    comments: [],
  };
}
