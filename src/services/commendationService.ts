import axios from "axios";
import httpService from "@/lib/http";
import { unwrapApiEntity, unwrapPaginatedItems } from "@/lib/helpers";
import type { PaginationMeta } from "@/lib/helpers";
import { toastServiceErrorOnce } from "@/lib/serviceErrorToast";

export type CommendationItem = {
  id: string;
  memberId: string;
  memberName?: string;
  title: string;
  date: string; // YYYY-MM-DD or ISO
  decisionNumber: string;
  signingAuthority: string;
  description: string | null;
  fileUrl?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

function normalizeCommendationItem(raw: unknown): CommendationItem {
  const r = (raw ?? {}) as Record<string, unknown>;
  return {
    id: String(r.id ?? ""),
    memberId: String(r.memberId ?? r.member_id ?? ""),
    memberName:
      typeof r.memberName === "string" && r.memberName.trim()
        ? r.memberName.trim()
        : typeof r.fullName === "string" && r.fullName.trim()
          ? r.fullName.trim()
          : typeof r.memberFullName === "string" && r.memberFullName.trim()
            ? r.memberFullName.trim()
            : undefined,
    title: String(r.title ?? ""),
    date: String(r.date ?? ""),
    decisionNumber: String(r.decisionNumber ?? r.decision_number ?? ""),
    signingAuthority: String(r.signingAuthority ?? r.signing_authority ?? ""),
    description:
      r.description != null && String(r.description).trim()
        ? String(r.description)
        : null,
    fileUrl:
      r.fileUrl != null
        ? String(r.fileUrl)
        : r.file_url != null
          ? String(r.file_url)
          : r.filePath != null
            ? String(r.filePath)
            : r.file_path != null
              ? String(r.file_path)
              : null,
    createdAt: typeof r.createdAt === "string" ? r.createdAt : undefined,
    updatedAt: typeof r.updatedAt === "string" ? r.updatedAt : undefined,
  };
}

export type CommendationHistoryRow = Record<string, unknown>;

class CommendationApiError extends Error {
  statusCode?: number;
  data?: unknown;
  constructor(message: string, opts?: { statusCode?: number; data?: unknown }) {
    super(message);
    this.name = "CommendationApiError";
    this.statusCode = opts?.statusCode;
    this.data = opts?.data;
  }
}

function parseApiError(e: unknown, fallback: string): CommendationApiError {
  if (axios.isAxiosError(e)) {
    let d = e.response?.data as unknown;
    const sc = typeof e.response?.status === "number" ? e.response.status : undefined;
    // Sometimes BE / proxy returns JSON as string.
    if (typeof d === "string") {
      try {
        d = JSON.parse(d) as unknown;
      } catch {
        // ignore parse error
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
      return new CommendationApiError(finalMessage, {
          statusCode: bodyStatusCode ?? sc,
          data: o.data,
        });
    }
    return new CommendationApiError(e.message || fallback, { statusCode: sc });
  }
  if (e instanceof Error) return new CommendationApiError(e.message || fallback);
  return new CommendationApiError(fallback);
}

export const commendationService = {
  /** GET /commendations/my-commendations */
  async myCommendations(): Promise<CommendationItem[]> {
    try {
      const { data } = await httpService.get<unknown>("/commendations/my-commendations");
      const { items } = unwrapPaginatedItems<unknown>(data);
      if (items.length) return items.map(normalizeCommendationItem);
      const entity = unwrapApiEntity<unknown>(data);
      if (Array.isArray(entity)) return entity.map(normalizeCommendationItem);
      if (entity && typeof entity === "object") {
        const o = entity as Record<string, unknown>;
        const list = (Array.isArray(o.items)
          ? o.items
          : Array.isArray(o.data)
            ? o.data
            : null) as unknown[] | null;
        if (list) return list.map(normalizeCommendationItem);
      }
      return [];
    } catch (e: unknown) {
      const err = parseApiError(e, "Không tải được danh sách khen thưởng cá nhân");
      toastServiceErrorOnce(e, { fallbackMessage: err.message, overrideStatusCode: err.statusCode ?? null });
      throw err;
    }
  },

  /** GET /commendations?page&limit&year&memberId */
  async list(params: {
    page: number;
    limit: number;
    year?: number;
    memberId?: string;
  }): Promise<{ items: CommendationItem[]; meta: PaginationMeta | null }> {
    try {
      const q = new URLSearchParams();
      q.set("page", String(params.page));
      q.set("limit", String(params.limit));
      if (params.year) q.set("year", String(params.year));
      if (params.memberId?.trim()) q.set("memberId", params.memberId.trim());

      const { data } = await httpService.get<unknown>(`/commendations?${q.toString()}`);
      const { items, meta } = unwrapPaginatedItems<unknown>(data);
      return { items: items.map(normalizeCommendationItem), meta };
    } catch (e: unknown) {
      const err = parseApiError(e, "Không tải được danh sách khen thưởng");
      toastServiceErrorOnce(e, { fallbackMessage: err.message, overrideStatusCode: err.statusCode ?? null });
      throw err;
    }
  },

  /** POST /commendations (multipart/form-data) */
  async create(payload: {
    memberId: string;
    title: string;
    date: string; // YYYY-MM-DD
    decisionNumber: string;
    signingAuthority: string;
    description?: string;
    file: File;
  }): Promise<CommendationItem> {
    try {
      const fd = new FormData();
      fd.append("memberId", payload.memberId);
      fd.append("title", payload.title);
      fd.append("date", payload.date);
      fd.append("decisionNumber", payload.decisionNumber);
      fd.append("signingAuthority", payload.signingAuthority);
      if (payload.description?.trim()) fd.append("description", payload.description.trim());
      fd.append("file", payload.file);
      const { data } = await httpService.postFormData<unknown>("/commendations", fd);
      const entity = unwrapApiEntity<unknown>(data);
      return normalizeCommendationItem(entity);
    } catch (e: unknown) {
      const err = parseApiError(e, "Không tạo được khen thưởng");
      toastServiceErrorOnce(e, { fallbackMessage: err.message, overrideStatusCode: err.statusCode ?? null });
      throw err;
    }
  },

  /** PATCH /commendations/{id} (multipart/form-data) — file optional */
  async update(
    id: string,
    payload: Partial<{
      memberId: string;
      title: string;
      date: string;
      decisionNumber: string;
      signingAuthority: string;
      description: string;
      file: File | null;
    }>
  ): Promise<CommendationItem> {
    try {
      const fd = new FormData();
      if (payload.memberId != null) fd.append("memberId", payload.memberId);
      if (payload.title != null) fd.append("title", payload.title);
      if (payload.date != null) fd.append("date", payload.date);
      if (payload.decisionNumber != null)
        fd.append("decisionNumber", payload.decisionNumber);
      if (payload.signingAuthority != null)
        fd.append("signingAuthority", payload.signingAuthority);
      if (payload.description != null) fd.append("description", payload.description);
      if (payload.file) fd.append("file", payload.file);

      const { data } = await httpService.patchFormData<unknown>(
        `/commendations/${encodeURIComponent(id)}`,
        fd
      );
      const entity = unwrapApiEntity<unknown>(data);
      return normalizeCommendationItem(entity);
    } catch (e: unknown) {
      const err = parseApiError(e, "Không cập nhật được khen thưởng");
      toastServiceErrorOnce(e, { fallbackMessage: err.message, overrideStatusCode: err.statusCode ?? null });
      throw err;
    }
  },

  /** GET /commendations/member/{memberId} */
  async historyByMember(memberId: string): Promise<CommendationHistoryRow[]> {
    try {
      const { data } = await httpService.get<unknown>(
        `/commendations/member/${encodeURIComponent(memberId)}`
      );
      const { items } = unwrapPaginatedItems<unknown>(data);
      if (items.length) return items as CommendationHistoryRow[];
      const entity = unwrapApiEntity<unknown>(data);
      if (Array.isArray(entity)) return entity as CommendationHistoryRow[];
      if (entity && typeof entity === "object") {
        const o = entity as Record<string, unknown>;
        if (Array.isArray(o.items)) return o.items as CommendationHistoryRow[];
        if (Array.isArray(o.data)) return o.data as CommendationHistoryRow[];
      }
      return [];
    } catch (e: unknown) {
      const err = parseApiError(e, "Không tải được lịch sử khen thưởng");
      toastServiceErrorOnce(e, { fallbackMessage: err.message, overrideStatusCode: err.statusCode ?? null });
      throw err;
    }
  },
};

