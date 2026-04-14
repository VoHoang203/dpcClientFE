import axios from "axios";
import httpService from "@/lib/http";
import { unwrapApiEntity, unwrapPaginatedItems } from "@/lib/helpers";
import type { PaginationMeta } from "@/lib/helpers";

/** Chi bộ mặc định (theo spec BE / Swagger). */
export const DEFAULT_PARTY_CELL_ID =
  "4dc9d414-0e5d-47dc-828a-e0a249b2b888";

export type AnnualAssessmentStatus = "PENDING" | "APPROVED" | "REJECTED";

export type ApiRank =
  | "EXCELLENT"
  | "GOOD"
  | "COMPLETE"
  | "INCOMPLETE";

/** Giá trị UI (radio) — khác enum API. */
export type AnnualAssessmentClassification =
  | "excellent"
  | "good"
  | "complete"
  | "incomplete"
  | "pending";

export type CriteriaChecklistItem = {
  name: string;
  isChecked: boolean;
  note: string;
};

export type AnnualAssessmentItem = {
  id: string;
  memberId: string;
  fullName: string;
  year: number;
  selfRank: ApiRank | null;
  finalRank: ApiRank | null;
  score: number | null;
  remarks: string;
  status: AnnualAssessmentStatus;
  reviewedAt: string | null;
  createdAt: string;
  partyCellName: string;
  assessmentFileUrl: string | null;
  criteriaChecklist: CriteriaChecklistItem[] | null;
  /** Map từ finalRank / status — dùng badge & thống kê. */
  classification: AnnualAssessmentClassification;
};

export type AnnualAssessmentConfig = {
  id: string;
  partyCellId: string;
  year: number;
  criteriaTemplate: string[];
  createdAt: string;
  updatedAt: string;
};

export type RankStatsCounts = {
  excellent: number;
  good: number;
  complete: number;
  incomplete: number;
  pending: number;
};

export type SubmitMyAssessmentPayload = {
  year: number;
  /** Giá trị UI: excellent | good | ... */
  classification: Exclude<AnnualAssessmentClassification, "pending">;
  reason: string;
  /** File bản kiểm điểm (PDF/DOCX/...). Bắt buộc khi submit; update có thể bỏ trống. */
  file: File;
};

export type ReviewAnnualAssessmentPayload = {
  status: "APPROVED" | "REJECTED";
  finalRank: ApiRank;
  score: number;
  criteriaChecklist: CriteriaChecklistItem[];
};

export class AnnualAssessmentApiError extends Error {
  statusCode?: number;
  data?: unknown;
  constructor(message: string, opts?: { statusCode?: number; data?: unknown }) {
    super(message);
    this.name = "AnnualAssessmentApiError";
    this.statusCode = opts?.statusCode;
    this.data = opts?.data;
  }
}

async function notifySonnerError(err: AnnualAssessmentApiError): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    const mod = await import("sonner");
    const description =
      typeof err.statusCode === "number" ? `statusCode: ${err.statusCode}` : undefined;
    mod.toast.error(err.message, description ? { description } : undefined);
  } catch {
    // ignore if sonner isn't available in some contexts
  }
}

function parseApiError(e: unknown, fallback: string): AnnualAssessmentApiError {
  // axios error (HTTP 4xx/5xx) — ưu tiên message từ BE: `{ statusCode, message, data }`
  if (axios.isAxiosError(e)) {
    const d = e.response?.data as unknown;
    const sc =
      typeof e.response?.status === "number" ? e.response.status : undefined;
    if (d && typeof d === "object") {
      const o = d as Record<string, unknown>;
      const msg = o.message;
      const bodyStatusCode =
        typeof o.statusCode === "number" ? o.statusCode : undefined;
      if (typeof msg === "string" && msg.trim()) {
        return new AnnualAssessmentApiError(msg.trim(), {
          statusCode: bodyStatusCode ?? sc,
          data: o.data ?? d,
        });
      }
      const inner = o.data;
      if (inner && typeof inner === "object") {
        const m2 = (inner as Record<string, unknown>).message;
        if (typeof m2 === "string" && m2.trim()) {
          return new AnnualAssessmentApiError(m2.trim(), {
            statusCode: bodyStatusCode ?? sc,
            data: inner,
          });
        }
      }
    }
    return new AnnualAssessmentApiError(e.message || fallback, {
      statusCode: sc,
      data: d,
    });
  }
  if (e instanceof AnnualAssessmentApiError) return e;
  if (e instanceof Error) return new AnnualAssessmentApiError(e.message || fallback);
  return new AnnualAssessmentApiError(fallback);
}

function pickString(o: Record<string, unknown>, keys: string[]): string {
  for (const k of keys) {
    const v = o[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return "";
}

function parseApiRank(v: unknown): ApiRank | null {
  const s = String(v ?? "").toUpperCase();
  if (s === "EXCELLENT" || s === "GOOD" || s === "COMPLETE" || s === "INCOMPLETE") {
    return s as ApiRank;
  }
  return null;
}

function parseStatus(v: unknown): AnnualAssessmentStatus {
  const s = String(v ?? "").toUpperCase();
  if (s === "APPROVED" || s === "REJECTED" || s === "PENDING") return s;
  return "PENDING";
}

function rankToUi(r: ApiRank | null): AnnualAssessmentClassification {
  if (!r) return "pending";
  switch (r) {
    case "EXCELLENT":
      return "excellent";
    case "GOOD":
      return "good";
    case "COMPLETE":
      return "complete";
    case "INCOMPLETE":
      return "incomplete";
    default:
      return "pending";
  }
}

export function uiClassificationToApiRank(
  v: Exclude<AnnualAssessmentClassification, "pending">
): ApiRank {
  switch (v) {
    case "excellent":
      return "EXCELLENT";
    case "good":
      return "GOOD";
    case "complete":
      return "COMPLETE";
    case "incomplete":
      return "INCOMPLETE";
    default:
      return "GOOD";
  }
}

function uiClassificationToSelfRankApi(
  v: Exclude<AnnualAssessmentClassification, "pending">
): ApiRank {
  return uiClassificationToApiRank(v);
}

function parseCriteriaChecklist(raw: unknown): CriteriaChecklistItem[] | null {
  if (!Array.isArray(raw)) return null;
  const out: CriteriaChecklistItem[] = [];
  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    const o = row as Record<string, unknown>;
    const name = pickString(o, ["name"]);
    if (!name) continue;
    out.push({
      name,
      isChecked: Boolean(o.isChecked ?? o.checked),
      note: typeof o.note === "string" ? o.note : "",
    });
  }
  return out.length ? out : null;
}

function normalizeAnnualAssessmentItem(raw: unknown): AnnualAssessmentItem {
  const r = (raw ?? {}) as Record<string, unknown>;
  const id = pickString(r, ["id"]);
  const memberId = pickString(r, ["memberId"]);
  const fullName = pickString(r, ["fullName", "name"]);
  const year = Number(r.year);
  const selfRank = parseApiRank(r.selfRank);
  const finalRank = parseApiRank(r.finalRank);
  const status = parseStatus(r.status);
  const score =
    typeof r.score === "number" && Number.isFinite(r.score)
      ? r.score
      : r.score != null && String(r.score).trim() !== "" && Number.isFinite(Number(r.score))
        ? Number(r.score)
        : null;

  let classification: AnnualAssessmentClassification = rankToUi(finalRank);
  if (!finalRank && status === "PENDING") {
    classification = "pending";
  }

  return {
    id,
    memberId,
    fullName,
    year: Number.isFinite(year) ? year : new Date().getFullYear(),
    selfRank,
    finalRank,
    score,
    remarks: typeof r.remarks === "string" ? r.remarks : "",
    status,
    reviewedAt:
      r.reviewedAt != null && String(r.reviewedAt).trim()
        ? String(r.reviewedAt)
        : null,
    createdAt: typeof r.createdAt === "string" ? r.createdAt : "",
    partyCellName: pickString(r, ["partyCellName"]),
    assessmentFileUrl:
      r.assessmentFileUrl != null && String(r.assessmentFileUrl).trim()
        ? String(r.assessmentFileUrl)
        : null,
    criteriaChecklist: parseCriteriaChecklist(r.criteriaChecklist),
    classification,
  };
}

function parseStatsFromUnknown(raw: unknown): RankStatsCounts | null {
  if (!raw || typeof raw !== "object") return null;
  throwIfBusinessErrorLocal(raw);
  let cur: unknown = raw;
  if ("data" in (cur as object) && (cur as { data?: unknown }).data != null) {
    cur = (cur as { data: unknown }).data;
  }
  if (!cur || typeof cur !== "object") return null;
  const o = cur as Record<string, unknown>;

  const pick = (k: string) => {
    const v = o[k];
    if (typeof v === "number" && Number.isFinite(v)) return Math.max(0, Math.floor(v));
    if (typeof v === "string" && v.trim() && Number.isFinite(Number(v))) {
      return Math.max(0, Math.floor(Number(v)));
    }
    return 0;
  };

  const ex = pick("EXCELLENT") || pick("excellent");
  const gd = pick("GOOD") || pick("good");
  const cp = pick("COMPLETE") || pick("complete");
  const ic = pick("INCOMPLETE") || pick("incomplete");
  const pd = pick("PENDING") || pick("pending");

  if (ex + gd + cp + ic + pd === 0) {
    const by = o.byFinalRank ?? o.byRank ?? o.counts;
    if (by && typeof by === "object") {
      const b = by as Record<string, unknown>;
      return {
        excellent: pickStringFromCounts(b, ["EXCELLENT", "excellent"]),
        good: pickStringFromCounts(b, ["GOOD", "good"]),
        complete: pickStringFromCounts(b, ["COMPLETE", "complete"]),
        incomplete: pickStringFromCounts(b, ["INCOMPLETE", "incomplete"]),
        pending: pickStringFromCounts(b, ["PENDING", "pending"]),
      };
    }
    return null;
  }

  return {
    excellent: ex,
    good: gd,
    complete: cp,
    incomplete: ic,
    pending: pd,
  };
}

function throwIfBusinessErrorLocal(value: unknown): void {
  if (!value || typeof value !== "object") return;
  const sc = (value as { statusCode?: number }).statusCode;
  if (typeof sc === "number" && sc >= 400) {
    const msg = (value as { message?: string }).message;
    throw new Error(typeof msg === "string" && msg.trim() ? msg.trim() : "Yêu cầu thất bại");
  }
}

function pickStringFromCounts(b: Record<string, unknown>, keys: string[]): number {
  for (const k of keys) {
    const v = b[k];
    if (typeof v === "number" && Number.isFinite(v)) return Math.max(0, Math.floor(v));
    if (typeof v === "string" && v.trim() && Number.isFinite(Number(v))) {
      return Math.max(0, Math.floor(Number(v)));
    }
  }
  return 0;
}

async function fetchAnnualAssessmentPage(params: {
  year: number;
  page: number;
  limit: number;
  status?: string;
}): Promise<{ items: AnnualAssessmentItem[]; meta: PaginationMeta | null }> {
  try {
    const q = new URLSearchParams();
    q.set("year", String(params.year));
    q.set("page", String(params.page));
    q.set("limit", String(params.limit));
    if (params.status && params.status.trim()) {
      q.set("status", params.status.trim().toUpperCase());
    }
    const { data } = await httpService.get<unknown>(
      `/annual-assessments?${q.toString()}`
    );
    const { items: rawItems, meta } = unwrapPaginatedItems<unknown>(data);
    const items = rawItems.map(normalizeAnnualAssessmentItem);
    return { items, meta };
  } catch (e) {
    const err = parseApiError(e, "Không tải được danh sách đánh giá");
    await notifySonnerError(err);
    throw err;
  }
}

async function aggregateStatsFromPagedList(year: number): Promise<RankStatsCounts> {
  const limit = 100;
  let page = 1;
  const counts: RankStatsCounts = {
    excellent: 0,
    good: 0,
    complete: 0,
    incomplete: 0,
    pending: 0,
  };
  while (true) {
    const { items, meta } = await fetchAnnualAssessmentPage({
      year,
      page,
      limit,
      status: undefined,
    });
    for (const it of items) {
      counts[it.classification] += 1;
    }
    if (!meta) break;
    const totalPages = meta.totalPages > 0 ? meta.totalPages : 1;
    if (page >= totalPages) break;
    page += 1;
  }
  return counts;
}

export const annualAssessmentService = {
  DEFAULT_PARTY_CELL_ID,

  /**
   * Lấy bản tự đánh giá của bản thân theo năm — `GET /annual-assessments/my-assessments/{year}`.
   * Trả `null` khi chưa có (404).
   */
  async getMyAssessmentByYear(year: number): Promise<AnnualAssessmentItem | null> {
    try {
      const { data } = await httpService.get<unknown>(
        `/annual-assessments/my-assessments/${encodeURIComponent(String(year))}`
      );
      const entity = unwrapApiEntity<unknown>(data);
      return normalizeAnnualAssessmentItem(entity);
    } catch (e) {
      // 404 = chưa nộp, không toast
      if (axios.isAxiosError(e)) {
        const httpStatus = e.response?.status;
        const body = e.response?.data as unknown;
        const bodyStatusCode =
          body && typeof body === "object"
            ? (body as { statusCode?: unknown }).statusCode
            : undefined;
        if (httpStatus === 404 || bodyStatusCode === 404) return null;
      }
      const err = parseApiError(e, "Không tải được bản tự đánh giá");
      await notifySonnerError(err);
      throw err;
    }
  },

  async list(params: {
    year: number;
    page?: number;
    limit?: number;
    status?: string;
  }): Promise<{ items: AnnualAssessmentItem[]; meta: PaginationMeta | null }> {
    return fetchAnnualAssessmentPage({
      year: params.year,
      page: params.page ?? 1,
      limit: params.limit ?? 10,
      status: params.status,
    });
  },

  async getById(id: string) {
    try {
      const { data } = await httpService.get<unknown>(`/annual-assessments/${id}`);
      const entity = unwrapApiEntity<unknown>(data);
      return normalizeAnnualAssessmentItem(entity);
    } catch (e) {
      const err = parseApiError(e, "Không tải được bản đánh giá");
      await notifySonnerError(err);
      throw err;
    }
  },

  /** Bộ tiêu chí theo năm (Chi bộ). */
  async getConfig(
    year: number,
    partyCellId: string = DEFAULT_PARTY_CELL_ID
  ): Promise<AnnualAssessmentConfig | null> {
    try {
      const { data } = await httpService.get<unknown>(
        `/annual-assessments/configs/${partyCellId}/${year}`
      );
      const entity = unwrapApiEntity<unknown>(data);
      const r = entity as Record<string, unknown>;
      const id = pickString(r, ["id"]);
      if (!id) return null;
      const criteria = r.criteriaTemplate;
      const criteriaTemplate = Array.isArray(criteria)
        ? criteria.filter((x): x is string => typeof x === "string")
        : [];
      return {
        id,
        partyCellId: pickString(r, ["partyCellId"]) || partyCellId,
        year: Number(r.year) || year,
        criteriaTemplate,
        createdAt: typeof r.createdAt === "string" ? r.createdAt : "",
        updatedAt: typeof r.updatedAt === "string" ? r.updatedAt : "",
      };
    } catch {
      // getConfig được dùng như optional config; không spam toast ở đây
      return null;
    }
  },

  /** Chi ủy tạo/cập nhật bộ tiêu chí. */
  async saveConfig(payload: {
    partyCellId?: string;
    year: number;
    criteriaTemplate: string[];
  }) {
    try {
      const { data } = await httpService.post<unknown>(
        `/annual-assessments/configs`,
        {
          partyCellId: payload.partyCellId ?? DEFAULT_PARTY_CELL_ID,
          year: payload.year,
          criteriaTemplate: payload.criteriaTemplate.filter((s) => s.trim().length > 0),
        }
      );
      const entity = unwrapApiEntity<unknown>(data);
      const r = entity as Record<string, unknown>;
      const criteria = r.criteriaTemplate;
      return {
        id: pickString(r, ["id"]),
        partyCellId: pickString(r, ["partyCellId"]) || DEFAULT_PARTY_CELL_ID,
        year: Number(r.year) || payload.year,
        criteriaTemplate: Array.isArray(criteria)
          ? criteria.filter((x): x is string => typeof x === "string")
          : [],
        createdAt: typeof r.createdAt === "string" ? r.createdAt : "",
        updatedAt: typeof r.updatedAt === "string" ? r.updatedAt : "",
      } satisfies AnnualAssessmentConfig;
    } catch (e) {
      const err = parseApiError(e, "Không lưu được bộ tiêu chí");
      await notifySonnerError(err);
      throw err;
    }
  },

  /**
   * Thống kê theo năm (Chi bộ). Thử endpoint phổ biến; nếu lỗi thì gom từ danh sách (phân trang).
   */
  async getStatistics(
    year: number,
    partyCellId: string = DEFAULT_PARTY_CELL_ID
  ): Promise<RankStatsCounts> {
    const paths = [
      // Swagger mới: GET /annual-assessments/statistics/{partyCellId}/{year}
      `/annual-assessments/statistics/${encodeURIComponent(
        partyCellId
      )}/${encodeURIComponent(String(year))}`,
      // Backward compatible (nếu BE cũ vẫn giữ query)
      `/annual-assessments/statistics?year=${year}&partyCellId=${partyCellId}`,
      `/annual-assessments/stats?year=${year}&partyCellId=${partyCellId}`,
      `/annual-assessments/statistics?year=${year}`,
    ];
    for (const url of paths) {
      try {
        const { data } = await httpService.get<unknown>(url);
        const parsed = parseStatsFromUnknown(data);
        if (parsed) return parsed;
      } catch {
        /* thử endpoint khác / fallback */
      }
    }
    return aggregateStatsFromPagedList(year);
  },

  /** Đảng viên nộp bản tự đánh giá cuối năm — `POST /annual-assessments/submit` (multipart). */
  async submitMyAssessment(payload: SubmitMyAssessmentPayload) {
    try {
      const selfRank = uiClassificationToSelfRankApi(payload.classification);
      const fd = new FormData();
      fd.append("year", String(payload.year));
      fd.append("selfRank", selfRank);
      fd.append("remarks", payload.reason.trim());
      fd.append("file", payload.file);
      const { data } = await httpService.postFormData<unknown>(
        `/annual-assessments/submit`,
        fd
      );
      const entity = unwrapApiEntity<unknown>(data);
      return normalizeAnnualAssessmentItem(entity);
    } catch (e) {
      const err = parseApiError(e, "Không gửi được bản tự đánh giá");
      await notifySonnerError(err);
      throw err;
    }
  },

  /**
   * Cập nhật bản tự đánh giá của bản thân theo năm — `PATCH /annual-assessments/my-assessments/{year}` (multipart).
   * `file` có thể bỏ trống để giữ nguyên file cũ.
   */
  async updateMyAssessment(params: {
    year: number;
    classification: Exclude<AnnualAssessmentClassification, "pending">;
    reason: string;
    file?: File | null;
  }) {
    try {
      const selfRank = uiClassificationToSelfRankApi(params.classification);
      const fd = new FormData();
      fd.append("year", String(params.year));
      fd.append("selfRank", selfRank);
      fd.append("remarks", params.reason.trim());
      if (params.file) {
        fd.append("file", params.file);
      }
      const { data } = await httpService.patchFormData<unknown>(
        `/annual-assessments/my-assessments/${encodeURIComponent(String(params.year))}`,
        fd
      );
      const entity = unwrapApiEntity<unknown>(data);
      return normalizeAnnualAssessmentItem(entity);
    } catch (e) {
      const err = parseApiError(e, "Không cập nhật được bản tự đánh giá");
      await notifySonnerError(err);
      throw err;
    }
  },

  /** Chi ủy duyệt / chấm điểm / chốt xếp loại. */
  async review(id: string, payload: ReviewAnnualAssessmentPayload) {
    try {
      const { data } = await httpService.patch<unknown>(
        `/annual-assessments/${id}/review`,
        {
          status: payload.status,
          finalRank: payload.finalRank,
          score: payload.score,
          criteriaChecklist: payload.criteriaChecklist.map((c) => ({
            name: c.name,
            isChecked: c.isChecked,
            note: c.note ?? "",
          })),
        }
      );
      const entity = unwrapApiEntity<unknown>(data);
      return normalizeAnnualAssessmentItem(entity);
    } catch (e) {
      const err = parseApiError(e, "Không lưu được đánh giá Chi ủy");
      await notifySonnerError(err);
      throw err;
    }
  },
};
