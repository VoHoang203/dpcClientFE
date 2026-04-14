import httpService from "@/lib/http";
import { unwrapApiEntity, unwrapApiList } from "@/lib/helpers";
import type {
  CreateMeetingPayload,
  MeetingAttachment,
  MeetingAttendanceRecord,
  MeetingDetail,
  MeetingDetailDocument,
  MeetingItem,
  ManualAttendanceEntry,
  MeetingLeaveRequest,
  MeetingStatus,
  MeetingType,
  UpdateMeetingPayload,
} from "@/types/meeting";

export type UploadMeetingDocumentsResult = {
  message: string;
  documents: MeetingDetailDocument[];
};

function normalizeMeetingDetailDocument(raw: unknown): MeetingDetailDocument {
  const r = raw as Record<string, unknown>;
  return {
    id: String(r.id ?? ""),
    meetingId:
      r.meetingId != null
        ? String(r.meetingId)
        : r.meeting_id != null
          ? String(r.meeting_id)
          : undefined,
    fileUrl: String(r.fileUrl ?? r.file_url ?? ""),
    originalName: (r.originalName ??
      r.original_name ??
      r.fileName ??
      r.file_name) as string | undefined,
    fileSize:
      typeof r.fileSize === "number"
        ? r.fileSize
        : typeof r.file_size === "number"
          ? r.file_size
          : undefined,
    createdAt: (r.createdAt ?? r.created_at) as string | undefined,
  };
}

function parseUploadMeetingDocumentsResponse(
  raw: unknown
): UploadMeetingDocumentsResult {
  if (!raw || typeof raw !== "object") {
    throw new Error("Phản hồi không hợp lệ");
  }
  const o = raw as Record<string, unknown>;
  const sc = o.statusCode;
  if (typeof sc === "number" && sc >= 400) {
    throw new Error(
      typeof o.message === "string" ? o.message : "Tải lên thất bại"
    );
  }
  const payload = o.data;
  if (payload && typeof payload === "object") {
    const d = payload as Record<string, unknown>;
    if (d.success === false) {
      throw new Error(
        typeof d.message === "string" ? d.message : "Tải lên thất bại"
      );
    }
    const docsRaw = d.documents;
    const documents = Array.isArray(docsRaw)
      ? docsRaw.map(normalizeMeetingDetailDocument)
      : [];
    const message =
      (typeof d.message === "string" ? d.message : "") ||
      (typeof o.message === "string" ? o.message : "") ||
      "Đã tải lên thành công";
    return { message, documents };
  }
  throw new Error(
    typeof o.message === "string" ? o.message : "Tải lên thất bại"
  );
}

/** Chuẩn hóa thời bắt đầu từ nhiều kiểu/khóa API (tránh chuỗi rỗng → Invalid Date ở FE). */
function pickMeetingStartTime(raw: Record<string, unknown>): string {
  const keys = [
    "startTime",
    "start_time",
    "startAt",
    "start_at",
    "scheduledStart",
    "scheduled_at",
  ] as const;
  for (const key of keys) {
    const v = raw[key];
    const s = coerceToParseableDateString(v);
    if (s) return s;
  }
  return "";
}

function coerceToParseableDateString(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "number" && Number.isFinite(v)) {
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? "" : d.toISOString();
  }
  if (typeof v === "string") {
    const t = v.trim();
    if (!t) return "";
    const d = new Date(t);
    return Number.isNaN(d.getTime()) ? "" : t;
  }
  if (
    typeof v === "object" &&
    v !== null &&
    typeof (v as Date).toISOString === "function"
  ) {
    const d = v as Date;
    const t = d.getTime();
    return Number.isNaN(t) ? "" : d.toISOString();
  }
  return "";
}

export type {
  CreateMeetingPayload,
  MeetingAttachment,
  MeetingAttendanceRecord,
  MeetingDetail,
  MeetingDetailAttendee,
  MeetingDetailDocument,
  ManualAttendanceEntry,
  MeetingItem,
  MeetingLeaveRequest,
  MeetingFormat,
  MeetingStatus,
  MeetingType,
  ParticipantType,
  UpdateMeetingPayload,
} from "@/types/meeting";

function normalizeMeetingDetail(raw: Record<string, unknown>): MeetingDetail {
  const base = raw as unknown as MeetingDetail;
  const startTime =
    pickMeetingStartTime(raw) ||
    String(raw.startTime ?? raw.start_time ?? base.startTime ?? "");
  return {
    ...base,
    id: String(raw.id ?? base.id ?? ""),
    title: String(raw.title ?? base.title ?? ""),
    type: (raw.type as MeetingType) || base.type || "PERIODIC",
    startTime,
    endTime: (raw.endTime ?? raw.end_time ?? base.endTime) as string | null,
    onlineLink: (raw.onlineLink ?? raw.online_link ?? base.onlineLink) as
      | string
      | null,
    isCheckinActive: Boolean(
      raw.isCheckinActive ?? raw.is_checkin_active ?? base.isCheckinActive
    ),
    attendees: Array.isArray(raw.attendees)
      ? (raw.attendees as MeetingDetail["attendees"])
      : base.attendees,
    documents: Array.isArray(raw.documents)
      ? (raw.documents as unknown[]).map(normalizeMeetingDetailDocument)
      : base.documents,
  };
}

async function fetchMeetingDetail(id: string): Promise<MeetingDetail> {
  const { data } = await httpService.get(`/meetings/${id}`);
  const entity = unwrapApiEntity<Record<string, unknown>>(data);
  return normalizeMeetingDetail(entity);
}

const DEFAULT_PARTY_CELL_ID = "4dc9d414-0e5d-47dc-828a-e0a249b2b888";

export const meetingService = {
  async listMeetings(params?: { month?: string | number; year?: string | number }) {
    const query = new URLSearchParams();
    if (params?.month !== undefined) query.set("month", String(params.month));
    if (params?.year !== undefined) query.set("year", String(params.year));
    const q = query.toString();
    const { data } = await httpService.get(`/meetings${q ? `?${q}` : ""}`);
    return unwrapApiList<MeetingItem>(data);
  },

  async createMeeting(payload: CreateMeetingPayload) {
    const { data } = await httpService.post("/meetings", {
      partyCellId: payload.partyCellId || DEFAULT_PARTY_CELL_ID,
      title: payload.title,
      type: payload.type,
      format: payload.format,
      startTime: payload.startTime,
      endTime: payload.endTime,
      location: payload.location,
      onlineLink: payload.onlineLink,
      content: payload.content,
      participantType: payload.participantType ?? "ALL",
      participantIds:
        payload.participantType === "MANUAL"
          ? payload.participantIds ?? []
          : undefined,
    });
    return unwrapApiEntity<MeetingItem>(data);
  },

  async deleteMeeting(id: string) {
    await httpService.delete(`/meetings/${id}`);
    return true;
  },

  async updateMeeting(id: string, payload: UpdateMeetingPayload) {
    const { data } = await httpService.patch(`/meetings/${id}`, payload);
    return unwrapApiEntity<MeetingItem>(data);
  },

  async updateMeetingStatus(id: string, status: MeetingStatus) {
    const { data } = await httpService.patch(`/meetings/${id}/status`, { status });
    return unwrapApiEntity<MeetingItem>(data);
  },

  /** Kết thúc cuộc họp & chốt điểm danh — PATCH `/meetings/:id/end`. Trả về message từ BE. */
  async endMeeting(meetingId: string): Promise<string> {
    const { data } = await httpService.patch<unknown>(
      `/meetings/${meetingId}/end`,
      {}
    );
    if (!data || typeof data !== "object") {
      return "Đã kết thúc cuộc họp";
    }
    const o = data as Record<string, unknown>;
    if (typeof o.statusCode === "number" && o.statusCode >= 400) {
      throw new Error(
        typeof o.message === "string" ? o.message : "Không kết thúc được cuộc họp"
      );
    }
    if (typeof o.message === "string" && o.message.trim()) {
      return o.message.trim();
    }
    const inner = o.data;
    if (inner && typeof inner === "object") {
      const m = (inner as { message?: unknown }).message;
      if (typeof m === "string" && m.trim()) return m.trim();
    }
    return "Đã kết thúc cuộc họp";
  },

  /**
   * Tải nhiều biên bản/tài liệu — POST multipart `files` (tối đa 10 file).
   * Response: `{ statusCode, message, data: { success, message, documents } }`.
   */
  async uploadMeetingDocuments(
    meetingId: string,
    files: File[]
  ): Promise<UploadMeetingDocumentsResult> {
    if (files.length === 0) throw new Error("Chưa chọn file");
    if (files.length > 10) throw new Error("Tối đa 10 file mỗi lần tải lên");
    const formData = new FormData();
    for (const file of files) {
      formData.append("files", file);
    }
    const { data } = await httpService.postFormData<unknown>(
      `/meetings/${meetingId}/documents`,
      formData
    );
    return parseUploadMeetingDocumentsResponse(data);
  },

  async deleteMeetingDocument(meetingId: string, documentId: string) {
    await httpService.delete(`/meetings/${meetingId}/documents/${documentId}`);
    return true;
  },

  async getMeetingById(id: string) {
    return fetchMeetingDetail(id);
  },

  async getMeetingDetail(id: string): Promise<MeetingDetail> {
    return fetchMeetingDetail(id);
  },

  /** Danh sách điểm danh chi tiết (online: thời lượng, trạng thái; offline: đồng bộ PIN). */
  async listMeetingAttendanceRecords(
    meetingId: string
  ): Promise<MeetingAttendanceRecord[]> {
    const { data } = await httpService.get<unknown>(
      `/meetings/${meetingId}/attendees`
    );
    return unwrapApiList<MeetingAttendanceRecord>(data);
  },

  /** Điểm danh thủ công — PUT body `{ attendances: [{ memberId, status, reason }] }`. */
  async submitManualAttendance(
    meetingId: string,
    attendances: ManualAttendanceEntry[]
  ) {
    const { data } = await httpService.put(
      `/meetings/${meetingId}/attendance/manual`,
      { attendances }
    );
    return unwrapApiEntity<unknown>(data);
  },

  /** Bật/tắt chế độ điểm danh offline (PIN). */
  async toggleMeetingCheckin(meetingId: string) {
    const { data } = await httpService.patch(`/meetings/${meetingId}/toggle-checkin`, {});
    return unwrapApiEntity<MeetingDetail | MeetingItem>(data);
  },

  /** Mã PIN hiện tại — gọi lại định kỳ (VD 30s) khi điểm danh đang bật. */
  async getMeetingPin(meetingId: string): Promise<string> {
    const { data } = await httpService.get<unknown>(`/meetings/${meetingId}/pin`);
    const raw = unwrapApiEntity<Record<string, unknown>>(data);
    const pin =
      raw.pin ??
      raw.code ??
      raw.pinCode ??
      (typeof raw.value === "string" ? raw.value : null);
    return pin != null ? String(pin) : "";
  },

  async listLeaveRequests(params?: { page?: number; limit?: number }) {
    const q = new URLSearchParams();
    q.set("page", String(params?.page ?? 1));
    q.set("limit", String(params?.limit ?? 10));
    const { data } = await httpService.get<unknown>(
      `/meetings/leave-requests?${q.toString()}`
    );
    return unwrapApiList<MeetingLeaveRequest>(data);
  },

  /** Chi ủy duyệt đơn xin vắng — `status` VD: EXCUSED */
  async reviewLeaveRequest(attendeeId: string, status: string) {
    const { data } = await httpService.patch(
      `/meetings/leave-requests/${attendeeId}/review`,
      { status }
    );
    return unwrapApiEntity<unknown>(data);
  },

  /** Đảng viên nhập PIN điểm danh (offline) — POST `/meetings/:id/check-in`. */
  async checkInMeeting(meetingId: string, pin: string) {
    const trimmed = pin.trim();
    if (!trimmed) throw new Error("Vui lòng nhập mã PIN");
    const { data } = await httpService.post<unknown>(
      `/meetings/${meetingId}/check-in`,
      { pin: trimmed }
    );
    if (data && typeof data === "object") {
      const o = data as Record<string, unknown>;
      if (typeof o.statusCode === "number" && o.statusCode >= 400) {
        throw new Error(
          typeof o.message === "string" ? o.message : "Điểm danh thất bại"
        );
      }
    }
    return unwrapApiEntity<unknown>(data);
  },

  /** Đảng viên nộp đơn xin vắng — multipart `reason` + `file`. */
  async submitMeetingLeaveRequest(
    meetingId: string,
    reason: string,
    file: File
  ) {
    const r = reason.trim();
    if (!r) throw new Error("Vui lòng nhập lý do xin vắng");
    const formData = new FormData();
    formData.append("reason", r);
    formData.append("file", file);
    const { data } = await httpService.postFormData<unknown>(
      `/meetings/${meetingId}/leave-requests`,
      formData
    );
    if (data && typeof data === "object") {
      const o = data as Record<string, unknown>;
      if (typeof o.statusCode === "number" && o.statusCode >= 400) {
        throw new Error(
          typeof o.message === "string" ? o.message : "Gửi đơn thất bại"
        );
      }
    }
    return unwrapApiEntity<unknown>(data);
  },
};
