import { inferNotificationRoleKey } from "@/lib/inferNotificationRole";
import type { CurrentUserSnapshot } from "@/services/authService";
import type { UserRole } from "@/types/roles";

/**
 * Menu workspace: ưu tiên vai trò kết nạp (Chi ủy / PBT / BT / QCUT) từ position + roleCode,
 * vì tài khoản PBT vẫn có thể lưu role PARTY_MEMBER.
 */
export function resolveWorkspaceMenuRole(
  snap: CurrentUserSnapshot | null,
  storedFallback: UserRole
): UserRole {
  const k = inferNotificationRoleKey(snap);
  if (k === "pho_bi_thu") return "DEPUTY_SECRETARY";
  if (k === "bi_thu") return "SECRETARY";
  if (k === "chi_uy") return "COMMITTEE_MEMBER";
  if (k === "qcut") return "OUTSTANDING_INDIVIDUAL";
  return storedFallback;
}

export function isPhoBiThuWorkspaceUser(
  snap: CurrentUserSnapshot | null
): boolean {
  return inferNotificationRoleKey(snap) === "pho_bi_thu";
}
