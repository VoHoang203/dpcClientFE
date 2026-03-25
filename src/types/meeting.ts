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
  created_at?: string;
  attendance_secret?: string | null;
  is_checkin_active?: boolean;
  location?: string | null;
  format?: MeetingFormat;
  minutes_url?: string | null;
  attachments?: MeetingAttachment[];
}

export interface CreateMeetingPayload {
  partyCellId?: string;
  title: string;
  type: MeetingType;
  format: MeetingFormat;
  startTime: string;
  endTime?: string;
  location?: string;
  onlineLink?: string;
  content?: string;
}

export interface UpdateMeetingPayload {
  title?: string;
  type?: MeetingType;
  format?: MeetingFormat;
  startTime?: string;
  endTime?: string;
  location?: string;
  onlineLink?: string;
  content?: string;
  status?: MeetingStatus;
}
