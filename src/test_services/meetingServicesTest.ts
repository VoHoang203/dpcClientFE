import { getDeployAPI, getNextAPIRootForMeetings } from "@/lib/apiEnv";
import { committeeAuthService } from "@/services/committeeAuthService";
import type {
  CreateMeetingPayload,
  MeetingItem,
  MeetingStatus,
  UpdateMeetingPayload,
} from "@/types/meeting";

/**
 * `USE_MOCK_API = true` → Next Route + Neon (`getNextAPIRootForMeetings()` + `/meetings`).
 * `false` → backend deploy (`getDeployAPI`) + Bearer committee.
 */
const USE_MOCK_API = false;

const getApiBaseUrl = () => {
  if (USE_MOCK_API) {
    return getNextAPIRootForMeetings();
  }
  return getDeployAPI();
};

const getCommitteeTokenOrNull = () => {
  try {
    return committeeAuthService.getCommitteeAccessToken();
  } catch {
    return null;
  }
};

const getAuthHeaders = (): HeadersInit => {
  if (USE_MOCK_API) {
    return {};
  }
  const token = getCommitteeTokenOrNull();
  if (!token) {
    throw new Error("Thiếu token chi ủy");
  }
  return { Authorization: `Bearer ${token}` };
};

export const meetingServicesTest = {
  async listMeetings(params?: { month?: string | number; year?: string | number }) {
    const baseUrl = getApiBaseUrl();
    if (!baseUrl) {
      throw new Error("Thiếu cấu hình API_DEPLOY");
    }
    const query = new URLSearchParams();
    if (params?.month !== undefined) query.set("month", String(params.month));
    if (params?.year !== undefined) query.set("year", String(params.year));

    const response = await fetch(
      `${baseUrl}/meetings${query.toString() ? `?${query}` : ""}`,
      {
        headers: {
          ...getAuthHeaders(),
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

    const response = await fetch(`${baseUrl}/meetings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(),
      },
      body: JSON.stringify({
        partyCellId: payload.partyCellId || "4dc9d414-0e5d-47dc-828a-e0a249b2b888",
        title: payload.title,
        type: payload.type,
        format: payload.format,
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

    const response = await fetch(`${baseUrl}/meetings/${id}`, {
      method: "DELETE",
      headers: {
        ...getAuthHeaders(),
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

    const response = await fetch(`${baseUrl}/meetings/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(),
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

    const response = await fetch(`${baseUrl}/meetings/${id}/status`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(),
      },
      body: JSON.stringify({ status }),
    });

    if (!response.ok) {
      throw new Error("Cập nhật trạng thái thất bại");
    }

    return (await response.json()) as MeetingItem;
  },

  async uploadMeetingDocuments(meetingId: string, files: File[]) {
    const baseUrl = getApiBaseUrl();
    if (!baseUrl) {
      throw new Error("Thiếu cấu hình API_DEPLOY");
    }

    const formData = new FormData();
    for (const file of files) {
      formData.append("files", file);
    }

    const response = await fetch(`${baseUrl}/meetings/${meetingId}/documents`, {
      method: "POST",
      headers: {
        ...getAuthHeaders(),
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error("Tải file thất bại");
    }

    return (await response.json()) as unknown;
  },

  async deleteMeetingDocument(meetingId: string, documentId: string) {
    const baseUrl = getApiBaseUrl();
    if (!baseUrl) {
      throw new Error("Thiếu cấu hình API_DEPLOY");
    }

    const response = await fetch(
      `${baseUrl}/meetings/${meetingId}/documents/${documentId}`,
      {
        method: "DELETE",
        headers: {
          ...getAuthHeaders(),
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

    const response = await fetch(`${baseUrl}/meetings/${id}`, {
      headers: {
        ...getAuthHeaders(),
      },
    });

    if (!response.ok) {
      throw new Error("Không thể tải thông tin cuộc họp");
    }

    return (await response.json()) as MeetingItem;
  },
};
