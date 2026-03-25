export type UserRole =
  | "dang_vien"
  | "qcut"
  | "chi_uy"
  | "pho_bi_thu"
  | "bi_thu"
  | "admin"
  | "PARTY_MEMBER"
  | "OUTSTANDING_INDIVIDUAL"
  | "COMMITTEE_MEMBER"
  | "DEPUTY_SECRETARY"
  | "SECRETARY"
  | "ADMIN";

export const roleLabels: Record<UserRole, string> = {
  dang_vien: "Đảng viên",
  qcut: "QCUT",
  chi_uy: "Chi ủy",
  pho_bi_thu: "Phó Bí thư",
  bi_thu: "Bí thư",
  admin: "Admin",
  PARTY_MEMBER: "Đảng viên",
  OUTSTANDING_INDIVIDUAL: "Quần chúng ưu tú",
  COMMITTEE_MEMBER: "Chi ủy viên",
  DEPUTY_SECRETARY: "Phó Bí thư",
  SECRETARY: "Bí thư",
  ADMIN: "Admin",
};

export function getRoleLabel(role: UserRole) {
  return roleLabels[role];
}

/** Hiển thị chức danh: map enum API → nhãn; nếu API trả sẵn tiếng Việt thì giữ nguyên. */
export function formatRoleOrPositionLabel(value: string) {
  const v = value.trim();
  if (!v) return roleLabels.dang_vien;
  if (v in roleLabels) return roleLabels[v as UserRole];
  return v;
}

export const mockCurrentUser = {
  id: "mock-user",
  name: "Nguyễn Văn A",
  role: "dang_vien" as UserRole,
};
