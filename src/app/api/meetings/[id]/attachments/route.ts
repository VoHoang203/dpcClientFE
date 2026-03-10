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
    global.mockMeetingsStore = [];
  }
  return global.mockMeetingsStore;
}

// POST /api/meetings/[id]/attachments - Upload attachment
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "Không có file được tải lên" },
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

    // Create mock attachment (in production, you'd upload to storage)
    const newAttachment: MeetingAttachment = {
      id: `att-${Date.now()}`,
      meetingId: id,
      fileName: file.name,
      fileUrl: `/uploads/${file.name}`, // Mock URL
      fileSize: file.size,
      fileType: file.type,
      uploadedAt: new Date().toISOString(),
    };

    // Add attachment to meeting
    if (!meetings[index].attachments) {
      meetings[index].attachments = [];
    }
    meetings[index].attachments!.push(newAttachment);

    return NextResponse.json(newAttachment, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Tải file thất bại" },
      { status: 400 }
    );
  }
}

// GET /api/meetings/[id]/attachments - List attachments
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

  return NextResponse.json(meeting.attachments || []);
}
