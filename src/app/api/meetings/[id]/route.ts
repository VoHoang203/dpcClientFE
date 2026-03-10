import { NextRequest, NextResponse } from "next/server";

// Import shared types and mock data would be better in a shared file,
// but for simplicity we'll re-declare the mock data reference
// In production, this would connect to a real database

type MeetingType =
  | "PERIODIC"
  | "EXTRAORDINARY"
  | "EVENT"
  | "CEREMONY"
  | "CELEBRATION"
  | "WEDDING"
  | "FUNERAL";

type MeetingStatus = "SCHEDULED" | "HAPPENING" | "FINISHED" | "CANCELLED";
type MeetingFormat = "OFFLINE" | "ONLINE";

interface MeetingAttachment {
  id: string;
  meetingId: string;
  fileName: string;
  fileUrl: string;
  fileSize?: number;
  fileType?: string;
  uploadedAt: string;
  uploadedBy?: string;
}

interface MeetingItem {
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

// Mock data storage - this should be shared with the main route in production
// Using global to persist across requests in development
declare global {
  // eslint-disable-next-line no-var
  var mockMeetingsStore: MeetingItem[] | undefined;
}

function getMockMeetings(): MeetingItem[] {
  if (!global.mockMeetingsStore) {
    global.mockMeetingsStore = [
      {
        id: "1",
        party_cell_id: "4dc9d414-0e5d-47dc-828a-e0a249b2b888",
        title: "Họp Chi bộ định kỳ tháng 3",
        type: "PERIODIC",
        startTime: "2026-03-15T14:00:00.000Z",
        endTime: "2026-03-15T16:00:00.000Z",
        content: "Họp chi bộ định kỳ tháng 3/2026.",
        status: "SCHEDULED",
        format: "ONLINE",
        online_link: "https://meet.google.com/abc-xyz-123",
        created_at: "2026-03-01T08:00:00.000Z",
        attachments: [],
      },
      {
        id: "2",
        party_cell_id: "4dc9d414-0e5d-47dc-828a-e0a249b2b888",
        title: "Sinh hoạt chi bộ",
        type: "PERIODIC",
        startTime: "2026-03-16T08:00:00.000Z",
        endTime: "2026-03-16T10:00:00.000Z",
        content: "Sinh hoạt chi bộ định kỳ.",
        status: "SCHEDULED",
        format: "OFFLINE",
        location: "Phòng họp A, Trụ sở Chi bộ",
        created_at: "2026-03-02T09:00:00.000Z",
        attachments: [],
      },
      {
        id: "3",
        party_cell_id: "4dc9d414-0e5d-47dc-828a-e0a249b2b888",
        title: "Họp cấp ủy bất thường",
        type: "EXTRAORDINARY",
        startTime: "2026-03-18T14:00:00.000Z",
        endTime: "2026-03-18T16:00:00.000Z",
        content: "Họp cấp ủy bất thường.",
        status: "SCHEDULED",
        format: "ONLINE",
        online_link: "https://meet.google.com/def-uvw-456",
        created_at: "2026-03-05T10:00:00.000Z",
        attachments: [],
      },
      {
        id: "4",
        party_cell_id: "4dc9d414-0e5d-47dc-828a-e0a249b2b888",
        title: "Lễ kết nạp Đảng viên mới",
        type: "CEREMONY",
        startTime: "2026-03-22T09:00:00.000Z",
        endTime: "2026-03-22T11:00:00.000Z",
        content: "Lễ kết nạp Đảng viên mới.",
        status: "SCHEDULED",
        format: "OFFLINE",
        location: "Hội trường A",
        created_at: "2026-03-06T08:00:00.000Z",
        attachments: [],
      },
      {
        id: "5",
        party_cell_id: "4dc9d414-0e5d-47dc-828a-e0a249b2b888",
        title: "Sự kiện giao lưu văn hóa",
        type: "EVENT",
        startTime: "2026-03-25T15:00:00.000Z",
        endTime: "2026-03-25T18:00:00.000Z",
        content: "Sự kiện giao lưu.",
        status: "SCHEDULED",
        format: "OFFLINE",
        location: "Nhà văn hóa Quận",
        created_at: "2026-03-07T11:00:00.000Z",
        attachments: [],
      },
      {
        id: "6",
        party_cell_id: "4dc9d414-0e5d-47dc-828a-e0a249b2b888",
        title: "Lễ chúc mừng đ/c Nguyễn Văn A",
        type: "CELEBRATION",
        startTime: "2026-03-28T10:00:00.000Z",
        endTime: "2026-03-28T11:30:00.000Z",
        content: "Chúc mừng nhận Huy hiệu 30 năm.",
        status: "SCHEDULED",
        format: "OFFLINE",
        location: "Phòng họp Chi bộ",
        created_at: "2026-03-08T08:00:00.000Z",
        attachments: [],
      },
      {
        id: "7",
        party_cell_id: "4dc9d414-0e5d-47dc-828a-e0a249b2b888",
        title: "Đám cưới đ/c Trần Văn B",
        type: "WEDDING",
        startTime: "2026-03-30T11:00:00.000Z",
        endTime: "2026-03-30T14:00:00.000Z",
        content: "Xe xuất phát 10:00 tại trụ sở.",
        status: "SCHEDULED",
        format: "OFFLINE",
        location: "Trung tâm tiệc cưới ABC",
        created_at: "2026-03-09T09:00:00.000Z",
        attachments: [],
      },
      {
        id: "8",
        party_cell_id: "4dc9d414-0e5d-47dc-828a-e0a249b2b888",
        title: "Họp Chi bộ định kỳ tháng 2",
        type: "PERIODIC",
        startTime: "2026-02-15T14:00:00.000Z",
        endTime: "2026-02-15T16:00:00.000Z",
        content: "Họp chi bộ định kỳ tháng 2/2026.",
        status: "FINISHED",
        format: "OFFLINE",
        location: "Phòng họp A",
        created_at: "2026-02-01T08:00:00.000Z",
        attachments: [],
      },
      {
        id: "9",
        party_cell_id: "4dc9d414-0e5d-47dc-828a-e0a249b2b888",
        title: "Tang lễ thân mẫu đ/c Lê Văn C",
        type: "FUNERAL",
        startTime: "2026-02-20T07:00:00.000Z",
        endTime: "2026-02-20T12:00:00.000Z",
        content: "Kính mời các đồng chí đến viếng.",
        status: "FINISHED",
        format: "OFFLINE",
        location: "Nhà tang lễ Thành phố",
        created_at: "2026-02-18T15:00:00.000Z",
        attachments: [],
      },
    ];
  }
  return global.mockMeetingsStore;
}

// GET /api/meetings/[id] - Get meeting by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const meetings = getMockMeetings();
  const meeting = meetings.find((m) => m.id === id);

  if (!meeting) {
    return NextResponse.json(
      { error: "Không tìm thấy cuộc họp" },
      { status: 404 }
    );
  }

  return NextResponse.json(meeting);
}

// PATCH /api/meetings/[id] - Update meeting
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const meetings = getMockMeetings();
    const index = meetings.findIndex((m) => m.id === id);

    if (index === -1) {
      return NextResponse.json(
        { error: "Không tìm thấy cuộc họp" },
        { status: 404 }
      );
    }

    // Update meeting fields
    const updatedMeeting: MeetingItem = {
      ...meetings[index],
      ...(body.title && { title: body.title }),
      ...(body.type && { type: body.type }),
      ...(body.startTime && { startTime: body.startTime }),
      ...(body.endTime !== undefined && { endTime: body.endTime }),
      ...(body.content !== undefined && { content: body.content }),
      ...(body.status && { status: body.status }),
      ...(body.location !== undefined && { location: body.location }),
      ...(body.onlineLink !== undefined && { online_link: body.onlineLink }),
      ...(body.format && { format: body.format }),
    };

    meetings[index] = updatedMeeting;

    return NextResponse.json(updatedMeeting);
  } catch {
    return NextResponse.json(
      { error: "Cập nhật cuộc họp thất bại" },
      { status: 400 }
    );
  }
}

// DELETE /api/meetings/[id] - Delete meeting
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const meetings = getMockMeetings();
  const index = meetings.findIndex((m) => m.id === id);

  if (index === -1) {
    return NextResponse.json(
      { error: "Không tìm thấy cuộc họp" },
      { status: 404 }
    );
  }

  meetings.splice(index, 1);

  return NextResponse.json({ success: true });
}
