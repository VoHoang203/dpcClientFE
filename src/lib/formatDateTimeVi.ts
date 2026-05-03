/** Chuỗi ISO / timestamp → hiển thị địa phương Việt Nam, ví dụ 25/04/2026, 10:26:11. */

export function formatDateTimeVi(
  iso: string | null | undefined,
  empty = "—"
): string {
  if (iso == null || !String(iso).trim()) return empty;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return empty;
  return d.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}
