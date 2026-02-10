export type UserRole =
  | "dang_vien"
  | "qcut"
  | "chi_uy"
  | "pho_bi_thu"
  | "bi_thu"
  | "admin"
  | "PARTY_MEMBER"
  | "OUTSTANDING_INDIVIDUAL"
  | "COMMITTEE"
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
  COMMITTEE: "Chi ủy viên",
  DEPUTY_SECRETARY: "Phó Bí thư",
  SECRETARY: "Bí thư",
  ADMIN: "Admin",
};

export function getRoleLabel(role: UserRole) {
  return roleLabels[role];
}

export const mockCurrentUser = {
  id: "mock-user",
  name: "Nguyễn Văn A",
  role: "dang_vien" as UserRole,
};
