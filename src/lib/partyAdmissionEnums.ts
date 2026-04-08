/**
 * Đồng bộ mô tả PDF 1 (enum DB) — chỉnh nếu BE đổi literal.
 */

export const AdmissionDocumentType = {
  DON_XIN_VAO_DANG: "DON_XIN_VAO_DANG",
  /** Hồ sơ xin vào Đảng (bước 1) — khớp BE / Swagger. */
  HOSO_XIN_VAO_DANG: "HOSO_XIN_VAO_DANG",
  LY_LICH_NGUOI_XIN_VAO_DANG: "LY_LICH_NGUOI_XIN_VAO_DANG",
  GIAY_GIOI_THIEU_DANG_VIEN_1: "GIAY_GIOI_THIEU_DANG_VIEN_1",
  GIAY_GIOI_THIEU_DANG_VIEN_2: "GIAY_GIOI_THIEU_DANG_VIEN_2",
  XAC_MINH_DIA_PHUONG: "XAC_MINH_DIA_PHUONG",
  NGHI_QUYET_KET_NAP_DU_THAO: "NGHI_QUYET_KET_NAP_DU_THAO",
  /** Nghị quyết giới thiệu đoàn viên (Chi đoàn) — Chi ủy bước soạn NQ. */
  NGHI_QUYET_GIOI_THIEU_DOAN_VIEN: "NGHI_QUYET_GIOI_THIEU_DOAN_VIEN",
} as const;

export type AdmissionDocumentType =
  (typeof AdmissionDocumentType)[keyof typeof AdmissionDocumentType];

export const AdmissionWorkflowStep = {
  APPLICATION: "APPLICATION",
  CHI_UY_REVIEW: "CHI_UY_REVIEW",
  PBT_CONTENT_REVIEW: "PBT_CONTENT_REVIEW",
  LOCAL_VERIFICATION: "LOCAL_VERIFICATION",
  RED_SEAL_CHECK: "RED_SEAL_CHECK",
  RESOLUTION_DRAFTING: "RESOLUTION_DRAFTING",
  SECRETARY_RESOLUTION_REVIEW: "SECRETARY_RESOLUTION_REVIEW",
  COMPLETED: "COMPLETED",
} as const;

export type AdmissionWorkflowStep =
  (typeof AdmissionWorkflowStep)[keyof typeof AdmissionWorkflowStep];

export const AdmissionOverallStatus = {
  DRAFT: "DRAFT",
  IN_PROGRESS: "IN_PROGRESS",
  RETURNED: "RETURNED",
  REJECTED: "REJECTED",
  APPROVED: "APPROVED",
  CANCELLED: "CANCELLED",
} as const;

export type AdmissionOverallStatus =
  (typeof AdmissionOverallStatus)[keyof typeof AdmissionOverallStatus];

/** Thứ tự bước 1–7 trong UI (trước COMPLETED). */
export const ADMISSION_WORKFLOW_STEP_SEQUENCE: AdmissionWorkflowStep[] = [
  AdmissionWorkflowStep.APPLICATION,
  AdmissionWorkflowStep.CHI_UY_REVIEW,
  AdmissionWorkflowStep.PBT_CONTENT_REVIEW,
  AdmissionWorkflowStep.LOCAL_VERIFICATION,
  AdmissionWorkflowStep.RED_SEAL_CHECK,
  AdmissionWorkflowStep.RESOLUTION_DRAFTING,
  AdmissionWorkflowStep.SECRETARY_RESOLUTION_REVIEW,
];
