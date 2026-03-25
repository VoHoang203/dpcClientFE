import { beforeEach, describe, expect, it, vi } from "vitest";
import { meetingService } from "@/services/meetingService";
import type { MeetingItem } from "@/types/meeting";

const { mockHttp } = vi.hoisted(() => ({
  mockHttp: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    postFormData: vi.fn(),
  },
}));

vi.mock("@/lib/http", () => ({ default: mockHttp }));

describe("meetingService", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe("listMeetings", () => {
    it("Should GET /meetings with query params and return data", async () => {
      const fakeJson = [{ id: "1" }];
      mockHttp.get.mockResolvedValue({ data: fakeJson });

      const result = await meetingService.listMeetings({ month: 5, year: 2026 });

      expect(mockHttp.get).toHaveBeenCalledWith("/meetings?month=5&year=2026");
      expect(result).toEqual(fakeJson);
    });

    it("Should propagate request failure", async () => {
      mockHttp.get.mockRejectedValue(new Error("network"));
      await expect(meetingService.listMeetings()).rejects.toThrowError("network");
    });

    it("Should unwrap nested success envelope (statusCode + data.data)", async () => {
      const rows = [{ id: "a", title: "T", type: "PERIODIC", startTime: "2026-01-01T00:00:00Z" }];
      mockHttp.get.mockResolvedValue({
        data: {
          statusCode: 200,
          message: "OK",
          data: { message: "OK", data: rows },
        },
      });
      const result = await meetingService.listMeetings();
      expect(result).toEqual(rows);
    });

    it("Should throw when body has business error statusCode", async () => {
      mockHttp.get.mockResolvedValue({
        data: { statusCode: 403, message: "Forbidden" },
      });
      await expect(meetingService.listMeetings()).rejects.toThrowError("Forbidden");
    });
  });

  describe("createMeeting", () => {
    const payload = {
      title: "Weekly sync",
      type: "PERIODIC" as const,
      format: "OFFLINE" as const,
      startTime: "2026-03-07T08:00:00Z",
      endTime: "2026-03-07T09:00:00Z",
      location: "Room 1",
      onlineLink: "https://meet.example.com/abc",
      content: "Agenda",
    };

    it("Should POST /meetings with body and return MeetingItem", async () => {
      const returned: MeetingItem = {
        id: "m-1",
        title: payload.title,
        type: payload.type,
        startTime: payload.startTime,
        endTime: payload.endTime,
        location: payload.location,
        onlineLink: payload.onlineLink,
        content: payload.content,
        status: "SCHEDULED",
      };

      mockHttp.post.mockResolvedValue({ data: returned });

      const res = await meetingService.createMeeting(payload);

      expect(mockHttp.post).toHaveBeenCalledTimes(1);
      const [url, body] = mockHttp.post.mock.calls[0] as [string, Record<string, unknown>];
      expect(url).toBe("/meetings");
      expect(body).toMatchObject({
        title: payload.title,
        type: payload.type,
        format: "OFFLINE",
        startTime: payload.startTime,
        endTime: payload.endTime,
        location: payload.location,
        onlineLink: payload.onlineLink,
        content: payload.content,
      });
      expect(typeof body.partyCellId).toBe("string");

      expect(res).toEqual(returned);
    });

    it("Should propagate POST failure", async () => {
      mockHttp.post.mockRejectedValue(new Error("fail"));
      await expect(meetingService.createMeeting(payload)).rejects.toThrowError("fail");
    });

    it("Should throw when body is business error", async () => {
      mockHttp.post.mockResolvedValue({ data: { statusCode: 400, message: "Invalid time" } });
      await expect(meetingService.createMeeting(payload)).rejects.toThrowError("Invalid time");
    });

    it("Should return body as-is when no nested id (API shape)", async () => {
      const body = { statusCode: 200, message: "ok" };
      mockHttp.post.mockResolvedValue({ data: body });
      const res = await meetingService.createMeeting(payload);
      expect(res).toEqual(body);
    });
  });

  describe("deleteMeeting", () => {
    it("Should DELETE /meetings/:id and return true", async () => {
      mockHttp.delete.mockResolvedValue({ data: {} });

      const result = await meetingService.deleteMeeting("mid-1");

      expect(mockHttp.delete).toHaveBeenCalledWith("/meetings/mid-1");
      expect(result).toBe(true);
    });

    it("Should propagate DELETE failure", async () => {
      mockHttp.delete.mockRejectedValue(new Error("fail"));
      await expect(meetingService.deleteMeeting("mid-2")).rejects.toThrowError("fail");
    });
  });
});
