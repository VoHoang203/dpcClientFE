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

// DELETE /api/meetings/[id]/attachments/[attachmentId] - Delete attachment
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; attachmentId: string }> }
) {
  try {
    const { id, attachmentId } = await params;
    const meetings = getMockMeetings();
    const meetingIndex = meetings.findIndex((m) => m.id === id);

    if (meetingIndex === -1) {
      return NextResponse.json(
        { error: "Không tìm thấy cuộc họp" },
        { status: 404 }
      );
    }

    const meeting = meetings[meetingIndex];
    if (!meeting.attachments) {
      return NextResponse.json(
        { error: "Không tìm thấy file đính kèm" },
        { status: 404 }
      );
    }

    const attachmentIndex = meeting.attachments.findIndex(
      (a) => a.id === attachmentId
    );

    if (attachmentIndex === -1) {
      return NextResponse.json(
        { error: "Không tìm thấy file đính kèm" },
        { status: 404 }
      );
    }

    // Remove attachment
    meeting.attachments.splice(attachmentIndex, 1);

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Xóa file thất bại" },
      { status: 400 }
    );
  }
}
