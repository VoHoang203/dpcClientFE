/** Loại file đính kèm — khớp cột `admission_attachments.kind`. */
export const ADMISSION_ATTACHMENT_KINDS = [
  "don",
  "ly_lich",
  "gioi_thieu",
  "nghi_quyet_doan",
] as const;

export type AdmissionAttachmentKind = (typeof ADMISSION_ATTACHMENT_KINDS)[number];

export const ADMISSION_ATTACHMENT_KIND_SET = new Set<string>(
  ADMISSION_ATTACHMENT_KINDS
);

export function isAdmissionAttachmentKind(k: string): k is AdmissionAttachmentKind {
  return ADMISSION_ATTACHMENT_KIND_SET.has(k);
}
