export type MeetingType =
  | "PERIODIC"
  | "EXTRAORDINARY"
  | "EVENT"
  | "CEREMONY"
  | "CELEBRATION"
  | "WEDDING"
  | "FUNERAL";

export type MeetingStatus = "SCHEDULED" | "HAPPENING" | "FINISHED" | "CANCELLED";

export type MeetingFormat = "OFFLINE" | "ONLINE";

/** Khớp DB `participant_type`: ALL | COMMITTEE | MANUAL */
export type ParticipantType = "ALL" | "COMMITTEE" | "MANUAL";

export interface MeetingAttachment {
  id: string;
  meetingId: string;
  fileName: string;
  fileUrl: string;
  fileSize?: number;
  fileType?: string;
  uploadedAt: string;
  uploadedBy?: string;
}

export interface MeetingItem {
  id: string;
  party_cell_id?: string;
  title: string;
  type: MeetingType;
  onlineLink?: string | null;
  startTime: string;
  endTime?: string | null;
  content?: string | null;
  status?: MeetingStatus;
  created_by?: string | null;
  /** BE có thể trả camelCase (`createdAt`) hoặc snake_case (`created_at`). */
  createdAt?: string;
  created_at?: string;
  attendance_secret?: string | null;
  is_checkin_active?: boolean;
  location?: string | null;
  format?: MeetingFormat;
  minutes_url?: string | null;
  attachments?: MeetingAttachment[];
  /** Danh sách tài liệu (nếu BE trả trong list meetings). */
  documents?: MeetingDetailDocument[];
}

export interface CreateMeetingPayload {
  partyCellId?: string;
  title: string;
  type: MeetingType;
  format: MeetingFormat;
  startTime: string;
  endTime?: string;
  location?: string;
  /** Offline: gửi `null` để đồng bộ với API/DB. */
  onlineLink?: string | null;
  content?: string;
  participantType?: ParticipantType;
  /** Bắt buộc khi `participantType === "MANUAL"` — id đảng viên (`member.id` từ GET /committee/members). */
  participantIds?: string[];
}

export interface UpdateMeetingPayload {
  title?: string;
  type?: MeetingType;
  format?: MeetingFormat;
  startTime?: string;
  endTime?: string;
  location?: string;
  onlineLink?: string | null;
  content?: string;
  status?: MeetingStatus;
}

export type MeetingAttendanceStatus = string;

export interface MeetingDetailAttendee {
  id: string;
  status: MeetingAttendanceStatus;
  reason?: string | null;
  proofUrl?: string | null;
  member: {
    id: string;
    fullName?: string | null;
    partyCardId?: string | null;
    user?: { email?: string; username?: string } | null;
  };
}

/** Tài liệu/biên bản — GET meeting detail & POST /meetings/:id/documents. */
export interface MeetingDetailDocument {
  id: string;
  meetingId?: string;
  fileUrl: string;
  /** Tên gốc khi upload (BE trả `originalName`). */
  originalName?: string;
  fileSize?: number;
  createdAt?: string;
}

/** Chi tiết cuộc họp từ BE (điểm danh + `documents` từ MeetingItem). */
export interface MeetingDetail extends MeetingItem {
  isCheckinActive?: boolean;
  attendees?: MeetingDetailAttendee[];
}

/**
 * Bản ghi điểm danh — GET /meetings/:id/attendees
 * (online: onlineDuration, checkInTime; offline: PIN / thủ công).
 */
/** PUT /meetings/:id/attendance/manual — điểm danh thủ công. */
export interface ManualAttendanceEntry {
  memberId: string;
  status: string;
  reason: string;
}

export interface MeetingAttendanceRecord {
  id: string;
  meetingId?: string;
  status?: string;
  method?: string | null;
  checkInTime?: string | null;
  checkOutTime?: string | null;
  reason?: string | null;
  proofUrl?: string | null;
  onlineDuration?: number | null;
  member?: {
    id: string;
    fullName?: string | null;
    user?: {
      email?: string | null;
      username?: string | null;
      isActive?: boolean;
    } | null;
  };
}

/** GET `/meetings/my-attendance` — lịch điểm danh của bản thân (lọc theo khoảng ngày). */
export interface MyAttendanceRecord {
  attendanceId: string;
  meetingId: string;
  meetingTitle: string;
  startTime: string;
  format: MeetingFormat;
  location: string;
  status: string;
  checkInTime: string | null;
  method: string | null;
}

/** Đơn xin nghỉ — GET /meetings/leave-requests */
export interface MeetingLeaveRequest {
  id: string;
  status: string;
  reason?: string | null;
  proofUrl?: string | null;
  member?: { id: string; fullName?: string | null };
  meeting?: {
    id: string;
    title?: string;
    startTime?: string;
    location?: string | null;
  };
  partyCellName?: string;
}
