/**
 * Gọi backend deploy (axios `httpService`, Bearer AT).
 *
 * **PDF 1 (mapping gợi ý — đối chiếu Swagger / PDF 2):**
 * - Api 1 → `GET {root}/:id/history`
 * - Api 2–3 → `GET {root}/my-pending`, `GET {root}/:id/detail`
 * - QCUT nộp bước → `POST /admission-applications/{stepCode}/submit` + `{ formData }`
 * - Lưu nháp → `POST {root}/save-draft` (mặc định cùng base admission-applications)
 * - Api 6–9 → `approve`, `resolution-drafting/submit`, `return`, `reject` (cùng base)
 * - Api 10 → `GET {root}/my-pending`
 * - Upload → `POST /file/upload` (multipart chỉ `file`) — lấy `data.viewUrl` gán vào `formData` khi submit/save-draft
 *
 * **Env:**
 * - `NEXT_PUBLIC_ADMISSION_APPLICATIONS_ROOT` (mặc định `/admission-applications`) — toàn bộ endpoint dưới đây.
 * - `NEXT_PUBLIC_PARTY_ADMISSION_SAVE_DRAFT_PATH` — override URL lưu nháp (đường dẫn tuyệt đối từ root API).
 *   Mặc định: `{ADMISSION_APPLICATIONS_ROOT}/save-draft`. `NEXT_PUBLIC_PARTY_ADMISSION_LEGACY_DRAFT_PATH=1` → `{root}/draft`.
 * - `NEXT_PUBLIC_FILES_UPLOAD_PATH` (mặc định `/file/upload`).
 */
import axios from "axios";
import httpService from "@/lib/http";
import {
  unwrapApiEntity,
  unwrapMyPendingData,
  type MyPendingPage,
} from "@/lib/helpers";
import {
  adaptToSessionPayload,
  buildNotStartedSessionPayload,
  type PartyAdmissionSessionPayload,
} from "@/lib/partyAdmissionAdapter";
import type { AdmissionWorkflowStep } from "@/lib/partyAdmissionEnums";

/** Base cho mọi API kết nạp trên FE — mặc định `/admission-applications` (không dùng `/party-admissions`). */
export function admissionApplicationsRoot(): string {
  const r = process.env.NEXT_PUBLIC_ADMISSION_APPLICATIONS_ROOT?.trim().replace(
    /\/$/,
    ""
  );
  return r && r.length > 0 ? r : "/admission-applications";
}

function filesUploadPath(): string {
  const p = process.env.NEXT_PUBLIC_FILES_UPLOAD_PATH?.trim().replace(/\/$/, "");
  return p && p.length > 0 ? p : "/file/upload";
}

function saveDraftPostPath(): string {
  const custom = process.env.NEXT_PUBLIC_PARTY_ADMISSION_SAVE_DRAFT_PATH?.trim().replace(
    /\/$/,
    ""
  );
  if (custom) return custom.startsWith("/") ? custom : `/${custom}`;
  const root = admissionApplicationsRoot();
  if (process.env.NEXT_PUBLIC_PARTY_ADMISSION_LEGACY_DRAFT_PATH === "1") {
    return `${root}/draft`;
  }
  return `${root}/save-draft`;
}

/** BE trả 404 + “Không tìm thấy hồ sơ kết nạp…” = QCUT chưa nộp đơn (bước 0). */
export function isAdmissionNotStartedError(e: unknown): boolean {
  if (axios.isAxiosError(e)) {
    if (e.response?.status === 404) return true;
    const d = e.response?.data;
    if (d && typeof d === "object") {
      const sc = (d as { statusCode?: unknown }).statusCode;
      if (sc === 404) return true;
      const m = (d as { message?: unknown }).message;
      if (
        typeof m === "string" &&
        /Không tìm thấy hồ sơ kết nạp|không tìm thấy hồ sơ kết nạp/i.test(
          m
        )
      ) {
        return true;
      }
    }
  }
  if (
    e instanceof Error &&
    /404|Không tìm thấy hồ sơ kết nạp/i.test(e.message)
  ) {
    return true;
  }
  return false;
}

export function extractPartyAdmissionError(e: unknown): string {
  if (axios.isAxiosError(e)) {
    const d = e.response?.data;
    if (d && typeof d === "object") {
      const m = (d as { message?: unknown }).message;
      if (typeof m === "string" && m.trim()) return m.trim();
      const nested = (d as { data?: { message?: unknown } }).data;
      if (nested && typeof nested.message === "string" && nested.message.trim()) {
        return nested.message.trim();
      }
    }
    if (e.response?.status === 404) return "Không tìm thấy hồ sơ";
    return e.message || "Yêu cầu thất bại";
  }
  if (e instanceof Error) return e.message;
  return "Yêu cầu thất bại";
}

/** Sau upload: ưu tiên `viewUrl` (BE mới), rồi `objectName` / các key khác. */
function pickDocumentValueAfterUpload(data: unknown): string {
  const d = data as Record<string, unknown>;
  const inner = (d?.data as Record<string, unknown>) || d;
  const candidates = [
    inner.viewUrl,
    inner.view_url,
    inner.openUrl,
    inner.open_url,
    inner.objectName,
    inner.object_name,
    inner.fileKey,
    inner.key,
    inner.url,
    inner.fileUrl,
  ];
  for (const c of candidates) {
    if (typeof c === "string" && c.trim()) return c.trim();
  }
  const id = inner.id;
  if (typeof id === "string" && id.trim()) return id.trim();
  return "";
}

export const partyAdmissionService = {
  admissionApplicationsRoot,
  /** @deprecated Dùng `admissionApplicationsRoot` — cùng giá trị. */
  paRoot: admissionApplicationsRoot,

  /** Chỉ gửi `file`; `documentType` → viewUrl map trong body submit/save-draft. */
  async uploadFile(file: File): Promise<string> {
    const fd = new FormData();
    fd.append("file", file);
    const { data } = await httpService.postFormData<unknown>(filesUploadPath(), fd);
    const ref = pickDocumentValueAfterUpload(data);
    if (!ref) {
      throw new Error("Upload thành công nhưng thiếu viewUrl/objectName trong phản hồi");
    }
    return ref;
  },

  /** Api 1 — lịch sử / trạng thái các bước. */
  async getHistory(admissionId: string): Promise<unknown> {
    const { data } = await httpService.get<unknown>(
      `${admissionApplicationsRoot()}/${encodeURIComponent(admissionId)}/history`
    );
    return data;
  },

  /**
   * QCUT — trạng thái hồ sơ hiện tại (Swagger: GET /admission-applications/my-current-status).
   */
  async getMyCurrentStatus(): Promise<unknown> {
    const { data } = await httpService.get<unknown>(
      `${admissionApplicationsRoot()}/my-current-status`
    );
    return data;
  },

  /**
   * QCUT — nộp bước (Swagger: POST `/admission-applications/{stepCode}/submit`).
   * Body: `{ formData: { fullName?, …, DON_XIN_VAO_DANG?, … } }` — giá trị file: `viewUrl` (hoặc fallback) sau `/file/upload`.
   */
  async submitAdmissionStep(
    stepCode: AdmissionWorkflowStep | string,
    body: { formData: Record<string, unknown> }
  ): Promise<unknown> {
    const sc = String(stepCode).trim();
    const { data } = await httpService.post<unknown>(
      `${admissionApplicationsRoot()}/${encodeURIComponent(sc)}/submit`,
      body
    );
    return unwrapApiEntity(data);
  },

  /** @deprecated Dùng `getMyCurrentStatus` — giữ alias để code cũ không gãy. */
  async getMine(): Promise<unknown> {
    return this.getMyCurrentStatus();
  },

  /** Api 2/3 — chi tiết (`GET .../{id}/detail`). */
  async getById(admissionId: string): Promise<unknown> {
    const { data } = await httpService.get<unknown>(
      `${admissionApplicationsRoot()}/${encodeURIComponent(admissionId)}/detail`
    );
    return data;
  },

  /**
   * Danh sách chờ xử lý theo JWT (`GET .../my-pending`).
   * Hỗ trợ query `page`, `limit` khi BE trả `{ items, total, page, limit, totalPages }`.
   */
  async listPending(params?: {
    page?: number;
    limit?: number;
  }): Promise<MyPendingPage> {
    const page = params?.page ?? 1;
    const limit = params?.limit ?? 10;
    const { data } = await httpService.get<unknown>(
      `${admissionApplicationsRoot()}/my-pending`,
      { params: { page, limit } }
    );
    return unwrapMyPendingData(data);
  },

  /** Api 4 — lưu nháp (file đã upload qua `/file/upload`, `formData.documents` chứa viewUrl/objectName). */
  async saveDraft(body: {
    admissionId?: string;
    stepCode: AdmissionWorkflowStep;
    formData: Record<string, unknown>;
  }): Promise<unknown> {
    const { data } = await httpService.post<unknown>(saveDraftPostPath(), body);
    return unwrapApiEntity(data);
  },

  /** Tương thích — ưu tiên `submitAdmissionStep` cho QCUT. */
  async submit(admissionId: string, body?: Record<string, unknown>): Promise<unknown> {
    const { data } = await httpService.post<unknown>(
      `${admissionApplicationsRoot()}/${encodeURIComponent(admissionId)}/submit`,
      body ?? {}
    );
    return unwrapApiEntity(data);
  },

  /** POST tạo mới (nếu BE còn hỗ trợ). */
  async create(payload: Record<string, unknown>): Promise<unknown> {
    const { data } = await httpService.post<unknown>(
      `${admissionApplicationsRoot()}`,
      payload
    );
    return unwrapApiEntity(data);
  },

  /** Api 6 — duyệt bước hiện tại (`{ stepCode, note? }`). */
  async approve(
    admissionId: string,
    body: { stepCode: AdmissionWorkflowStep | string; note?: string }
  ): Promise<unknown> {
    const { data } = await httpService.post<unknown>(
      `${admissionApplicationsRoot()}/${encodeURIComponent(admissionId)}/approve`,
      body
    );
    return data;
  },

  /**
   * Api 7 — Chi ủy soạn & gửi nghị quyết kết nạp.
   * Swagger: `POST /admission-applications/{id}/resolution-drafting/submit`
   * Body: `{ formData: { NGHI_QUYET_KET_NAP_DU_THAO: viewUrl, NGHI_QUYET_GIOI_THIEU_DOAN_VIEN: viewUrl } }`
   */
  async submitResolutionDrafting(
    admissionId: string,
    body: { formData: Record<string, unknown> }
  ): Promise<unknown> {
    const { data } = await httpService.post<unknown>(
      `${admissionApplicationsRoot()}/${encodeURIComponent(admissionId)}/resolution-drafting/submit`,
      body
    );
    return data;
  },

  /** Api 8 — trả lại bổ sung (`{ stepCode, returnToStepCode, reason? }`). */
  async returnApplication(
    admissionId: string,
    body: {
      stepCode: AdmissionWorkflowStep | string;
      returnToStepCode: AdmissionWorkflowStep | string;
      reason?: string;
    }
  ): Promise<unknown> {
    const { data } = await httpService.post<unknown>(
      `${admissionApplicationsRoot()}/${encodeURIComponent(admissionId)}/return`,
      body
    );
    return data;
  },

  /** Api 9 — từ chối. */
  async reject(
    admissionId: string,
    body?: { note?: string; [k: string]: unknown }
  ): Promise<unknown> {
    const { data } = await httpService.post<unknown>(
      `${admissionApplicationsRoot()}/${encodeURIComponent(admissionId)}/reject`,
      body ?? {}
    );
    return data;
  },

  /**
   * @deprecated FE dùng `submitAdmissionStep(LOCAL_VERIFICATION, { formData })` — giữ nếu BE còn endpoint cũ.
   */
  async completeLocalVerification(
    admissionId: string,
    body?: { note?: string; documents?: Record<string, string>; [k: string]: unknown }
  ): Promise<unknown> {
    const { data } = await httpService.post<unknown>(
      `${admissionApplicationsRoot()}/${encodeURIComponent(admissionId)}/local-verification`,
      body ?? {}
    );
    return data;
  },

  /** QCUT — rút / hủy hồ sơ (tùy BE đặt tên). */
  async withdraw(
    admissionId: string,
    body?: { note?: string; [k: string]: unknown }
  ): Promise<unknown> {
    const { data } = await httpService.post<unknown>(
      `${admissionApplicationsRoot()}/${encodeURIComponent(admissionId)}/withdraw`,
      body ?? {}
    );
    return data;
  },

  /**
   * QCUT — my-current-status (có `steps[]`).
   * 404 / “chưa có hồ sơ” → payload 0/7 bước (`not_started`), không ném lỗi.
   */
  async loadMySession(): Promise<PartyAdmissionSessionPayload> {
    try {
      const meRaw = await this.getMyCurrentStatus();
      const session = adaptToSessionPayload(meRaw, null);
      if (!session) {
        return buildNotStartedSessionPayload();
      }
      return session;
    } catch (e) {
      if (isAdmissionNotStartedError(e)) {
        return buildNotStartedSessionPayload();
      }
      throw e;
    }
  },
};
