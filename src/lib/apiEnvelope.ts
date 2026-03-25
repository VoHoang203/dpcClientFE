/**
 * Chuẩn phổ biến: HTTP 200 nhưng body có `statusCode` lỗi.
 */
function throwIfBusinessError(value: unknown): void {
  if (!value || typeof value !== "object") return;
  const sc = (value as { statusCode?: number }).statusCode;
  if (typeof sc === "number" && sc >= 400) {
    const msg = (value as { message?: string }).message;
    throw new Error(typeof msg === "string" && msg.trim() ? msg.trim() : "Yêu cầu thất bại");
  }
}

/** Danh sách: array phẳng hoặc `{ data }` / `{ data: { data: [] } }`. */
export function unwrapApiList<T>(raw: unknown): T[] {
  if (raw == null) return [];
  if (Array.isArray(raw)) return raw as T[];
  if (typeof raw !== "object") return [];
  throwIfBusinessError(raw);
  const o = raw as Record<string, unknown>;
  if (Array.isArray(o.data)) return o.data as T[];
  if (Array.isArray(o.items)) return o.items as T[];
  if (Array.isArray(o.results)) return o.results as T[];
  const inner = o.data;
  if (inner && typeof inner === "object") {
    throwIfBusinessError(inner);
    const dd = (inner as { data?: unknown }).data;
    if (Array.isArray(dd)) return dd as T[];
  }
  return [];
}

/**
 * Một bản ghi: lần lượt bóc `data` cho đến khi gặp object có `id` (string không rỗng),
 * hoặc hết tầng — trả về nhận dạng từ API (không ép validate thêm).
 */
export function unwrapApiEntity<T>(raw: unknown): T {
  let cur: unknown = raw;
  for (let i = 0; i < 6; i++) {
    if (cur == null) return cur as T;
    if (typeof cur !== "object") return cur as T;
    throwIfBusinessError(cur);
    const id = (cur as { id?: unknown }).id;
    if (typeof id === "string" && id.length > 0) return cur as T;
    const next = (cur as { data?: unknown }).data;
    if (next === undefined) break;
    cur = next;
  }
  return cur as T;
}
