import { committeeAuthService } from "@/services/committeeAuthService";

const getApiBaseUrl = () => {
  const baseUrl =
    process.env.NEXT_PUBLIC_API_DEPLOY || process.env.API_DEPLOY || "";
  return baseUrl.replace(/\/$/, "");
};

export type MeetingType =
  | "PERIODIC"
  | "EVENT"
  | "CEREMONY"
  | "CELEBRATION"
  | "WEDDING"
  | "FUNERAL";

export type MeetingStatus = "draft" | "scheduled" | "cancelled";

export type MeetingFormat = "online" | "offline" | "hybrid";

export interface MeetingItem {
  id: string;
  party_cell_id?: string;
  title: string;
  type: MeetingType;
  online_link?: string | null;
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
}

export interface CreateMeetingPayload {
  partyCellId?: string;
  title: string;
  type: MeetingType;
  startTime: string;
  endTime?: string;
  location?: string;
  onlineLink?: string;
  content?: string;
}

const getCommitteeTokenOrThrow = () => {
  const token = committeeAuthService.getCommitteeAccessToken();
  if (!token) {
    throw new Error("Thiếu token chi ủy");
  }
  return token;
};

export const meetingService = {
  async listMeetings(params?: { month?: string | number; year?: string | number }) {
    const baseUrl = getApiBaseUrl();
    if (!baseUrl) {
      throw new Error("Thiếu cấu hình API_DEPLOY");
    }
    const token = getCommitteeTokenOrThrow();
    const query = new URLSearchParams();
    if (params?.month !== undefined) query.set("month", String(params.month));
    if (params?.year !== undefined) query.set("year", String(params.year));

    const response = await fetch(
      `${baseUrl}/meetings${query.toString() ? `?${query}` : ""}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error("Không thể tải lịch họp");
    }

    return (await response.json()) as unknown;
  },

  async createMeeting(payload: CreateMeetingPayload) {
    const baseUrl = getApiBaseUrl();
    if (!baseUrl) {
      throw new Error("Thiếu cấu hình API_DEPLOY");
    }
    const token = getCommitteeTokenOrThrow();

    const response = await fetch(`${baseUrl}/meetings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        partyCellId: payload.partyCellId || "4dc9d414-0e5d-47dc-828a-e0a249b2b888",
        title: payload.title,
        type: payload.type,
        startTime: payload.startTime,
        endTime: payload.endTime,
        location: payload.location,
        onlineLink: payload.onlineLink,
        content: payload.content,
      }),
    });

    if (!response.ok) {
      throw new Error("Tạo lịch họp thất bại");
    }

    return (await response.json()) as MeetingItem;
  },

  async deleteMeeting(id: string) {
    const baseUrl = getApiBaseUrl();
    if (!baseUrl) {
      throw new Error("Thiếu cấu hình API_DEPLOY");
    }
    const token = getCommitteeTokenOrThrow();

    const response = await fetch(`${baseUrl}/meetings/${id}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error("Xóa cuộc họp thất bại");
    }

    return true;
  },
};
