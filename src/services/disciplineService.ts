import axios from "axios";
import httpService from "@/lib/http";
import {
  unwrapApiEntity,
  unwrapApiList,
  unwrapPaginatedItems,
} from "@/lib/helpers";
import type { PaginationMeta } from "@/lib/helpers";
import { toastServiceErrorOnce } from "@/lib/serviceErrorToast";

export type DisciplineForm =
  | "KHIEN_TRACH"
  | "CANH_CAO"
  | "CACH_CHUC"
  | "KHAI_TRU"
  | string;

export type DisciplineStatus = "PROCESSING" | "COMPLETED" | "APPEALING" | string;

export type DisciplineItem = {
  id: string;
  memberId: string;
  decisionNumber: string;
  date: string; // YYYY-MM-DD or ISO
  form: DisciplineForm;
  reason: string;
  description: string | null;
  /** Chuẩn hoá từ `decisionFileUrl` (BE) — mở bằng `fileService.openInNewTab`. */
  fileUrl?: string | null;
  status?: DisciplineStatus | null;
  createdAt?: string;
  updatedAt?: string;
};

function pickDisciplineFilePath(r: Record<string, unknown>): string | null {
  const keys = [
    "fileUrl",
    "file_url",
    "decisionFileUrl",
    "decision_file_url",
    "filePath",
    "file_path",
  ] as const;
  for (const k of keys) {
    const v = r[k];
    if (v != null && String(v).trim()) return String(v).trim();
  }
  return null;
}

function normalizeDisciplineItem(raw: unknown): DisciplineItem {
  const r = (raw ?? {}) as Record<string, unknown>;
  return {
    id: String(r.id ?? ""),
    memberId: String(r.memberId ?? r.member_id ?? ""),
    decisionNumber: String(r.decisionNumber ?? r.decision_number ?? ""),
    date: String(r.date ?? ""),
    form: String(r.form ?? ""),
    reason: String(r.reason ?? ""),
    description:
      r.description != null && String(r.description).trim()
        ? String(r.description)
        : null,
    fileUrl: pickDisciplineFilePath(r),
    status:
      r.status != null && String(r.status).trim() ? String(r.status).trim() : null,
    createdAt: typeof r.createdAt === "string" ? r.createdAt : undefined,
    updatedAt: typeof r.updatedAt === "string" ? r.updatedAt : undefined,
  };
}

export type DisciplineHistoryRow = {
  id?: string;
  memberId?: string;
  decisionNumber?: string;
  date?: string;
  form?: string;
  reason?: string;
  description?: string | null;
  fileUrl?: string | null;
  status?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

class DisciplineApiError extends Error {
  statusCode?: number;
  data?: unknown;
  constructor(message: string, opts?: { statusCode?: number; data?: unknown }) {
    super(message);
    this.name = "DisciplineApiError";
    this.statusCode = opts?.statusCode;
    this.data = opts?.data;
  }
}

function parseApiError(e: unknown, fallback: string): DisciplineApiError {
  if (axios.isAxiosError(e)) {
    let d = e.response?.data as unknown;
    const sc = typeof e.response?.status === "number" ? e.response.status : undefined;
    if (typeof d === "string") {
      try {
        d = JSON.parse(d) as unknown;
      } catch {
        // ignore
      }
    }
    if (d && typeof d === "object") {
      const o = d as Record<string, unknown>;
      const msg =
        typeof o.message === "string"
          ? o.message
          : typeof (o.error as any)?.message === "string"
            ? ((o.error as any).message as string)
            : typeof (o.data as any)?.message === "string"
              ? ((o.data as any).message as string)
              : undefined;
      const bodyStatusCode = typeof o.statusCode === "number" ? o.statusCode : undefined;
      const finalMessage =
        typeof msg === "string" && msg.trim() ? msg.trim() : fallback;
      return new DisciplineApiError(finalMessage, {
          statusCode: bodyStatusCode ?? sc,
          data: o.data,
        });
    }
    return new DisciplineApiError(e.message || fallback, { statusCode: sc });
  }
  if (e instanceof Error) return new DisciplineApiError(e.message || fallback);
  return new DisciplineApiError(fallback);
}

export const disciplineService = {
  /** GET /disciplines/my-disciplines — `data` thường là mảng bản ghi. */
  async myDisciplines(): Promise<DisciplineItem[]> {
    try {
      const { data } = await httpService.get<unknown>("/disciplines/my-disciplines");
      const list = unwrapApiList<unknown>(data);
      if (list.length) return list.map(normalizeDisciplineItem);
      const entity = unwrapApiEntity<unknown>(data);
      if (Array.isArray(entity)) return entity.map(normalizeDisciplineItem);
      if (entity && typeof entity === "object") {
        const o = entity as Record<string, unknown>;
        const nested = (Array.isArray(o.items)
          ? o.items
          : Array.isArray(o.data)
            ? o.data
            : null) as unknown[] | null;
        if (nested) return nested.map(normalizeDisciplineItem);
      }
      return [];
    } catch (e: unknown) {
      const err = parseApiError(e, "Không tải được danh sách kỷ luật cá nhân");
      toastServiceErrorOnce(e, { fallbackMessage: err.message, overrideStatusCode: err.statusCode ?? null });
      throw err;
    }
  },

  /** GET /disciplines?page&limit&year&memberId */
  async list(params: {
    page: number;
    limit: number;
    year?: number;
    memberId?: string;
  }): Promise<{ items: DisciplineItem[]; meta: PaginationMeta | null }> {
    try {
      const q = new URLSearchParams();
      q.set("page", String(params.page));
      q.set("limit", String(params.limit));
      if (params.year) q.set("year", String(params.year));
      if (params.memberId?.trim()) q.set("memberId", params.memberId.trim());

      const { data } = await httpService.get<unknown>(`/disciplines?${q.toString()}`);
      const { items, meta } = unwrapPaginatedItems<unknown>(data);
      return { items: items.map(normalizeDisciplineItem), meta };
    } catch (e: unknown) {
      const err = parseApiError(e, "Không tải được danh sách kỷ luật");
      toastServiceErrorOnce(e, { fallbackMessage: err.message, overrideStatusCode: err.statusCode ?? null });
      throw err;
    }
  },

  /** POST /disciplines (multipart/form-data) */
  async create(payload: {
    memberId: string;
    decisionNumber: string;
    date: string; // YYYY-MM-DD
    form: string;
    reason: string;
    description?: string;
    file: File;
  }): Promise<DisciplineItem> {
    try {
      const fd = new FormData();
      fd.append("memberId", payload.memberId);
      fd.append("decisionNumber", payload.decisionNumber);
      fd.append("date", payload.date);
      fd.append("form", payload.form);
      fd.append("reason", payload.reason);
      if (payload.description?.trim()) fd.append("description", payload.description.trim());
      fd.append("file", payload.file);
      const { data } = await httpService.postFormData<unknown>("/disciplines", fd);
      const entity = unwrapApiEntity<unknown>(data);
      return normalizeDisciplineItem(entity);
    } catch (e: unknown) {
      const err = parseApiError(e, "Không tạo được kỷ luật");
      toastServiceErrorOnce(e, { fallbackMessage: err.message, overrideStatusCode: err.statusCode ?? null });
      throw err;
    }
  },

  /** PATCH /disciplines/{id} (multipart/form-data) — file optional */
  async update(
    id: string,
    payload: Partial<{
      memberId: string;
      decisionNumber: string;
      date: string;
      form: string;
      reason: string;
      description: string;
      file: File | null;
    }>
  ): Promise<DisciplineItem> {
    try {
      const fd = new FormData();
      if (payload.memberId != null) fd.append("memberId", payload.memberId);
      if (payload.decisionNumber != null)
        fd.append("decisionNumber", payload.decisionNumber);
      if (payload.date != null) fd.append("date", payload.date);
      if (payload.form != null) fd.append("form", payload.form);
      if (payload.reason != null) fd.append("reason", payload.reason);
      if (payload.description != null) fd.append("description", payload.description);
      if (payload.file) fd.append("file", payload.file);

      const { data } = await httpService.patchFormData<unknown>(
        `/disciplines/${encodeURIComponent(id)}`,
        fd
      );
      const entity = unwrapApiEntity<unknown>(data);
      return normalizeDisciplineItem(entity);
    } catch (e: unknown) {
      const err = parseApiError(e, "Không cập nhật được kỷ luật");
      toastServiceErrorOnce(e, { fallbackMessage: err.message, overrideStatusCode: err.statusCode ?? null });
      throw err;
    }
  },

  /** GET /disciplines/member/{memberId} */
  async historyByMember(memberId: string): Promise<DisciplineHistoryRow[]> {
    try {
      const { data } = await httpService.get<unknown>(
        `/disciplines/member/${encodeURIComponent(memberId)}`
      );
      // API có thể trả list phẳng hoặc trong `data.items`
      const { items } = unwrapPaginatedItems<unknown>(data);
      if (items.length) return items as DisciplineHistoryRow[];
      // fallback unwrap entity/list
      const entity = unwrapApiEntity<unknown>(data);
      if (Array.isArray(entity)) return entity as DisciplineHistoryRow[];
      if (entity && typeof entity === "object") {
        const o = entity as Record<string, unknown>;
        if (Array.isArray(o.items)) return o.items as DisciplineHistoryRow[];
        if (Array.isArray(o.data)) return o.data as DisciplineHistoryRow[];
      }
      return [];
    } catch (e: unknown) {
      const err = parseApiError(e, "Không tải được lịch sử kỷ luật");
      toastServiceErrorOnce(e, { fallbackMessage: err.message, overrideStatusCode: err.statusCode ?? null });
      throw err;
    }
  },
};

