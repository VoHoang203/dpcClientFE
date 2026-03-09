import { beforeEach, describe, expect, it, vi } from "vitest";
import { meetingService, type MeetingItem } from "@/services/meetingService";
import { committeeAuthService } from "@/services/committeeAuthService";

vi.mock("@/services/committeeAuthService", () => ({
  committeeAuthService: {
    getCommitteeAccessToken: vi.fn(),
  },
}));

// mock global fetch
const globalAny: any = global;

describe("meetingService", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    globalAny.fetch = vi.fn();
    // default base URL
    process.env.API_DEPLOY = "https://api.example.com";
    process.env.NEXT_PUBLIC_API_DEPLOY = "";
    (committeeAuthService.getCommitteeAccessToken as unknown as vi.Mock).mockReturnValue("comm-token");
  });

  describe("listMeetings", () => {
    it("Should throw when API base URL is missing", async () => {
      process.env.API_DEPLOY = "";
      process.env.NEXT_PUBLIC_API_DEPLOY = "";
      await expect(meetingService.listMeetings()).rejects.toThrowError("Thiếu cấu hình API_DEPLOY");
    });

    it("Should throw when committee token is missing", async () => {
      (committeeAuthService.getCommitteeAccessToken as unknown as vi.Mock).mockReturnValue(null);
      await expect(meetingService.listMeetings()).rejects.toThrowError("Thiếu token chi ủy");
    });

    it("Should call fetch with proper URL and headers; return parsed JSON on success", async () => {
      const fakeJson = [{ id: "1" }];
      (globalAny.fetch as vi.Mock).mockResolvedValue({ ok: true, json: async () => fakeJson });

      const result = await meetingService.listMeetings({ month: 5, year: 2026 });

      expect(globalAny.fetch).toHaveBeenCalledTimes(1);
      const calledUrl = (globalAny.fetch as vi.Mock).mock.calls[0][0] as string;
      const calledInit = (globalAny.fetch as vi.Mock).mock.calls[0][1] as RequestInit;
      expect(calledUrl).toBe("https://api.example.com/meetings?month=5&year=2026");
      expect(calledInit?.headers).toMatchObject({ Authorization: "Bearer comm-token" });
      expect(result).toEqual(fakeJson);
    });

    it("Should throw error when response is not ok", async () => {
      (globalAny.fetch as vi.Mock).mockResolvedValue({ ok: false });
      await expect(meetingService.listMeetings()).rejects.toThrowError("Không thể tải lịch họp");
    });
  });

  describe("createMeeting", () => {
    const payload = {
      title: "Weekly sync",
      type: "PERIODIC" as const,
      startTime: "2026-03-07T08:00:00Z",
      endTime: "2026-03-07T09:00:00Z",
      location: "Room 1",
      onlineLink: "https://meet.example.com/abc",
      content: "Agenda",
    };

    it("Should throw when API base URL is missing", async () => {
      process.env.API_DEPLOY = "";
      process.env.NEXT_PUBLIC_API_DEPLOY = "";
      await expect(meetingService.createMeeting(payload)).rejects.toThrowError("Thiếu cấu hình API_DEPLOY");
    });

    it("Should throw when committee token is missing", async () => {
      (committeeAuthService.getCommitteeAccessToken as unknown as vi.Mock).mockReturnValue(null);
      await expect(meetingService.createMeeting(payload)).rejects.toThrowError("Thiếu token chi ủy");
    });

    it("Should POST with correct body and headers and return MeetingItem on success", async () => {
      const returned: MeetingItem = {
        id: "m-1",
        title: payload.title,
        type: payload.type,
        startTime: payload.startTime,
        endTime: payload.endTime,
        location: payload.location,
        online_link: payload.onlineLink,
        content: payload.content,
        status: "scheduled",
      };

      (globalAny.fetch as vi.Mock).mockResolvedValue({ ok: true, json: async () => returned });

      const res = await meetingService.createMeeting(payload);

      expect(globalAny.fetch).toHaveBeenCalledTimes(1);
      const [url, init] = (globalAny.fetch as vi.Mock).mock.calls[0] as [string, RequestInit];
      expect(url).toBe("https://api.example.com/meetings");
      expect(init.method).toBe("POST");
      expect(init.headers).toMatchObject({ "Content-Type": "application/json", Authorization: "Bearer comm-token" });
      const body = JSON.parse(init.body as string);
      expect(body).toMatchObject({
        title: payload.title,
        type: payload.type,
        startTime: payload.startTime,
        endTime: payload.endTime,
        location: payload.location,
        onlineLink: payload.onlineLink,
        content: payload.content,
      });
      // default partyCellId applied when not provided
      expect(typeof body.partyCellId).toBe("string");

      expect(res).toEqual(returned);
    });

    it("Should throw when response is not ok", async () => {
      (globalAny.fetch as vi.Mock).mockResolvedValue({ ok: false });
      await expect(meetingService.createMeeting(payload)).rejects.toThrowError("Tạo lịch họp thất bại");
    });
  });

  describe("deleteMeeting", () => {
    it("Should throw when API base URL is missing", async () => {
      process.env.API_DEPLOY = "";
      process.env.NEXT_PUBLIC_API_DEPLOY = "";
      await expect(meetingService.deleteMeeting("mid-1")).rejects.toThrowError("Thiếu cấu hình API_DEPLOY");
    });

    it("Should throw when committee token is missing", async () => {
      (committeeAuthService.getCommitteeAccessToken as unknown as vi.Mock).mockReturnValue(null);
      await expect(meetingService.deleteMeeting("mid-1")).rejects.toThrowError("Thiếu token chi ủy");
    });

    it("Should call DELETE with Authorization header and return true on success", async () => {
      (globalAny.fetch as vi.Mock).mockResolvedValue({ ok: true });

      const result = await meetingService.deleteMeeting("mid-1");

      expect(globalAny.fetch).toHaveBeenCalledTimes(1);
      const [url, init] = (globalAny.fetch as vi.Mock).mock.calls[0] as [string, RequestInit];
      expect(url).toBe("https://api.example.com/meetings/mid-1");
      expect(init.method).toBe("DELETE");
      expect(init.headers).toMatchObject({ Authorization: "Bearer comm-token" });
      expect(result).toBe(true);
    });

    it("Should throw when response is not ok", async () => {
      (globalAny.fetch as vi.Mock).mockResolvedValue({ ok: false });
      await expect(meetingService.deleteMeeting("mid-2")).rejects.toThrowError("Xóa cuộc họp thất bại");
    });
  });
});
