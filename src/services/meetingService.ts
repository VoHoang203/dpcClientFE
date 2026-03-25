import httpService from "@/lib/http";
import { unwrapApiEntity, unwrapApiList } from "@/lib/apiEnvelope";
import type {
  CreateMeetingPayload,
  MeetingAttachment,
  MeetingItem,
  MeetingStatus,
  UpdateMeetingPayload,
} from "@/types/meeting";

export type {
  CreateMeetingPayload,
  MeetingAttachment,
  MeetingItem,
  MeetingFormat,
  MeetingStatus,
  MeetingType,
  UpdateMeetingPayload,
} from "@/types/meeting";

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

  async uploadAttachment(meetingId: string, file: File) {
    const formData = new FormData();
    formData.append("file", file);
    const { data } = await httpService.postFormData<MeetingAttachment>(
      `/meetings/${meetingId}/attachments`,
      formData
    );
    return unwrapApiEntity<MeetingAttachment>(data);
  },

  async deleteAttachment(meetingId: string, attachmentId: string) {
    await httpService.delete(`/meetings/${meetingId}/attachments/${attachmentId}`);
    return true;
  },

  async getMeetingById(id: string) {
    const { data } = await httpService.get(`/meetings/${id}`);
    return unwrapApiEntity<MeetingItem>(data);
  },

  async listMeetingAttachments(meetingId: string): Promise<MeetingAttachment[]> {
    const { data } = await httpService.get<unknown>(`/meetings/${meetingId}/attachments`);
    return unwrapApiList<MeetingAttachment>(data);
  },
};
