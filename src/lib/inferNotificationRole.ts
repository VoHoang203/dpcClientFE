import type { CurrentUserSnapshot } from "@/services/authService";

const DEMO_ROLES = ["chi_uy", "pho_bi_thu", "bi_thu", "qcut"] as const;

/**
 * Map user đăng nhập (BE) → khóa role dùng cho `admission_notifications.receiver_role`.
 * - Ưu tiên `localStorage.demo_notification_role` (demo / gỡ lỗi).
 * - `user.role` lấy từ GET /users/me `roleCode` (và snapshot); kèm heuristics theo `position` nếu cần.
 */
export function inferNotificationRoleKey(
  user: CurrentUserSnapshot | null | undefined
): (typeof DEMO_ROLES)[number] | null {
  if (typeof window !== "undefined") {
    const o = localStorage.getItem("demo_notification_role")?.trim();
    if (o && (DEMO_ROLES as readonly string[]).includes(o)) {
      return o as (typeof DEMO_ROLES)[number];
    }
  }

  if (!user) return null;

  const pos = (user.position || "").trim();
  const role = (user.role || "").trim();
  const P = pos.toUpperCase();
  const R = role.toUpperCase();
  const hay = `${P} ${R}`;

  if ((DEMO_ROLES as readonly string[]).includes(role)) {
    return role as (typeof DEMO_ROLES)[number];
  }

  if (pos.includes("Phó") && pos.includes("Bí thư")) {
    return "pho_bi_thu";
  }

  if (
    hay.includes("DEPUTY_SECRETARY") ||
    hay.includes("PHO_BI_THU") ||
    (hay.includes("DEPUTY") && hay.includes("SECRETARY"))
  ) {
    return "pho_bi_thu";
  }

  if (
    (hay.includes("SECRETARY") &&
      !hay.includes("DEPUTY") &&
      !hay.includes("DEPUTY_SECRETARY")) ||
    (pos.includes("Bí thư") && !pos.includes("Phó"))
  ) {
    return "bi_thu";
  }

  if (
    hay.includes("COMMITTEE_MEMBER") ||
    hay.includes("CHI_UY") ||
    pos.includes("Chi ủy")
  ) {
    return "chi_uy";
  }

  if (
    hay.includes("OUTSTANDING_INDIVIDUAL") ||
    hay.includes("OUTSTANDING") ||
    R === "QCUT" ||
    pos.includes("Quần chúng")
  ) {
    return "qcut";
  }

  return null;
}
