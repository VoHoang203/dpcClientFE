/** Bỏ origin MinIO dev (`http://localhost:9000`) khi hiển thị ảnh — dùng path tương đối. */
export function normalizeAvatarDisplayUrl(
  raw: string | null | undefined,
): string {
  const s = String(raw ?? "").trim();
  if (!s) return "";
  if (s.startsWith("data:")) return s;
  return s.replace(/^https?:\/\/localhost:9000(?=\/|$)/i, "");
}
