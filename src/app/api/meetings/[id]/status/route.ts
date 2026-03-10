import { NextRequest, NextResponse } from "next/server";

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

declare global {
  // eslint-disable-next-line no-var
  var mockMeetingsStore: MeetingItem[] | undefined;
}

function getMockMeetings(): MeetingItem[] {
  if (!global.mockMeetingsStore) {
    // Initialize with empty array - this will be populated by the main route
    global.mockMeetingsStore = [];
  }
  return global.mockMeetingsStore;
}

// PATCH /api/meetings/[id]/status - Update meeting status
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status } = body;

    if (!status || !["SCHEDULED", "HAPPENING", "FINISHED", "CANCELLED"].includes(status)) {
      return NextResponse.json(
        { error: "Trạng thái không hợp lệ" },
        { status: 400 }
      );
    }

    const meetings = getMockMeetings();
    const index = meetings.findIndex((m) => m.id === id);

    if (index === -1) {
      return NextResponse.json(
        { error: "Không tìm thấy cuộc họp" },
        { status: 404 }
      );
    }

    meetings[index] = {
      ...meetings[index],
      status: status as MeetingStatus,
    };

    return NextResponse.json(meetings[index]);
  } catch {
    return NextResponse.json(
      { error: "Cập nhật trạng thái thất bại" },
      { status: 400 }
    );
  }
}
