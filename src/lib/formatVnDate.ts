/** Định dạng hiển thị ngày kiểu dd/mm/yyyy (ưu tiên parse yyyy-mm-dd để tránh lệch timezone). */
export function formatVnDate(value: string | null | undefined): string {
  if (value == null || String(value).trim() === "") return "—";
  const t = String(value).trim();
  const ymd = t.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (ymd) {
    return `${ymd[3]}/${ymd[2]}/${ymd[1]}`;
  }
  const d = new Date(t);
  if (!Number.isNaN(d.getTime())) {
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const y = d.getFullYear();
    return `${dd}/${mm}/${y}`;
  }
  return t;
}
