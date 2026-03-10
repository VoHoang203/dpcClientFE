import { committeeAuthService } from "@/services/committeeAuthService";

const getApiBaseUrl = () => {
  const baseUrl =
    process.env.NEXT_PUBLIC_API_DEPLOY || process.env.API_DEPLOY || "";
  return baseUrl.replace(/\/$/, "");
};

// DB enum: meetings_type_enum
export type MeetingType = "PERIODIC" | "EXTRAORDINARY";

// DB enum: meetings_status_enum
export type MeetingStatus = "SCHEDULED" | "HAPPENING" | "FINISHED" | "CANCELLED";

// DB enum: meetings_format_enum
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
  attachments?: MeetingAttachment[];
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

export interface UpdateMeetingPayload {
  title?: string;
  type?: MeetingType;
  startTime?: string;
  endTime?: string;
  location?: string;
  onlineLink?: string;
  content?: string;
  status?: MeetingStatus;
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

  async updateMeeting(id: string, payload: UpdateMeetingPayload) {
    const baseUrl = getApiBaseUrl();
    if (!baseUrl) {
      throw new Error("Thiếu cấu hình API_DEPLOY");
    }
    const token = getCommitteeTokenOrThrow();

    const response = await fetch(`${baseUrl}/meetings/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error("Cập nhật cuộc họp thất bại");
    }

    return (await response.json()) as MeetingItem;
  },

  async updateMeetingStatus(id: string, status: MeetingStatus) {
    const baseUrl = getApiBaseUrl();
    if (!baseUrl) {
      throw new Error("Thiếu cấu hình API_DEPLOY");
    }
    const token = getCommitteeTokenOrThrow();

    const response = await fetch(`${baseUrl}/meetings/${id}/status`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ status }),
    });

    if (!response.ok) {
      throw new Error("Cập nhật trạng thái thất bại");
    }

    return (await response.json()) as MeetingItem;
  },

  async uploadAttachment(meetingId: string, file: File) {
    const baseUrl = getApiBaseUrl();
    if (!baseUrl) {
      throw new Error("Thiếu cấu hình API_DEPLOY");
    }
    const token = getCommitteeTokenOrThrow();

    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch(`${baseUrl}/meetings/${meetingId}/attachments`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error("Tải file thất bại");
    }

    return (await response.json()) as MeetingAttachment;
  },

  async deleteAttachment(meetingId: string, attachmentId: string) {
    const baseUrl = getApiBaseUrl();
    if (!baseUrl) {
      throw new Error("Thiếu cấu hình API_DEPLOY");
    }
    const token = getCommitteeTokenOrThrow();

    const response = await fetch(
      `${baseUrl}/meetings/${meetingId}/attachments/${attachmentId}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error("Xóa file thất bại");
    }

    return true;
  },

  async getMeetingById(id: string) {
    const baseUrl = getApiBaseUrl();
    if (!baseUrl) {
      throw new Error("Thiếu cấu hình API_DEPLOY");
    }
    const token = getCommitteeTokenOrThrow();

    const response = await fetch(`${baseUrl}/meetings/${id}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error("Không thể tải thông tin cuộc họp");
    }

    return (await response.json()) as MeetingItem;
  },
};
