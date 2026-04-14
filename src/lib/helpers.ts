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
    const innerObj = inner as { items?: unknown; data?: unknown };
    if (Array.isArray(innerObj.items)) return innerObj.items as T[];
    const dd = innerObj.data;
    if (Array.isArray(dd)) return dd as T[];
  }
  return [];
}

/** `GET .../my-pending` — `{ data: { items, total, page, limit, totalPages } }`. */
export type MyPendingPage = {
  items: unknown[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

export function unwrapMyPendingData(raw: unknown): MyPendingPage {
  const empty: MyPendingPage = {
    items: [],
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 0,
  };
  if (raw == null || typeof raw !== "object") return empty;
  throwIfBusinessError(raw);
  const r = raw as Record<string, unknown>;
  let inner: Record<string, unknown> = r;
  if (r.data !== undefined && typeof r.data === "object") {
    inner = r.data as Record<string, unknown>;
    throwIfBusinessError(inner);
  }
  const items = Array.isArray(inner.items) ? inner.items : [];
  return {
    items,
    total: Number(inner.total ?? items.length),
    page: Number(inner.page ?? 1),
    limit: Number(inner.limit ?? 10),
    totalPages: Number(inner.totalPages ?? (items.length > 0 ? 1 : 0)),
  };
}

/** Meta phân trang phổ biến từ BE (vd. `data: { items, meta }`). */
export type PaginationMeta = {
  totalItems: number;
  itemCount: number;
  itemsPerPage: number;
  totalPages: number;
  currentPage: number;
};

/** Danh sách + meta (không mất `meta` như `unwrapApiList`). */
export function unwrapPaginatedItems<T>(raw: unknown): {
  items: T[];
  meta: PaginationMeta | null;
} {
  const empty = { items: [] as T[], meta: null as PaginationMeta | null };
  if (raw == null || typeof raw !== "object") return empty;
  throwIfBusinessError(raw);
  const o = raw as Record<string, unknown>;
  const inner = o.data;
  if (inner && typeof inner === "object") {
    throwIfBusinessError(inner);
    const d = inner as Record<string, unknown>;
    const items = Array.isArray(d.items) ? (d.items as T[]) : [];
    const metaRaw = d.meta;
    if (metaRaw && typeof metaRaw === "object") {
      const m = metaRaw as Record<string, unknown>;
      const meta: PaginationMeta = {
        totalItems: Number(m.totalItems ?? 0),
        itemCount: Number(m.itemCount ?? 0),
        itemsPerPage: Number(m.itemsPerPage ?? 0),
        totalPages: Number(m.totalPages ?? 0),
        currentPage: Number(m.currentPage ?? 0),
      };
      return { items, meta };
    }
    return { items, meta: null };
  }
  return { items: unwrapApiList<T>(raw), meta: null };
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

