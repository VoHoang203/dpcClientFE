import { NextRequest, NextResponse } from "next/server";

// Extended meeting types for demo (DB chỉ có PERIODIC, EXTRAORDINARY nhưng thêm EVENT để demo)
export type MeetingType =
  | "PERIODIC"
  | "EXTRAORDINARY"
  | "EVENT"
  | "CEREMONY"
  | "CELEBRATION"
  | "WEDDING"
  | "FUNERAL";

export type MeetingStatus = "SCHEDULED" | "HAPPENING" | "FINISHED" | "CANCELLED";
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

// Mock data storage (in-memory for demo)
let mockMeetings: MeetingItem[] = [
  {
    id: "1",
    party_cell_id: "4dc9d414-0e5d-47dc-828a-e0a249b2b888",
    title: "Họp Chi bộ định kỳ tháng 3",
    type: "PERIODIC",
    startTime: "2026-03-15T14:00:00.000Z",
    endTime: "2026-03-15T16:00:00.000Z",
    content: "Họp chi bộ định kỳ tháng 3/2026. Nội dung: Tổng kết công tác tháng 2, triển khai kế hoạch tháng 3.",
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
    content: "Họp cấp ủy bất thường để giải quyết vấn đề phát sinh.",
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
    content: "Lễ kết nạp Đảng viên mới. Trang phục lịch sự, đúng giờ.",
    status: "SCHEDULED",
    format: "OFFLINE",
    location: "Hội trường A, 123 Nguyễn Trãi",
    created_at: "2026-03-06T08:00:00.000Z",
    attachments: [
      {
        id: "att-1",
        meetingId: "4",
        fileName: "danh_sach_ket_nap.pdf",
        fileUrl: "/uploads/danh_sach_ket_nap.pdf",
        fileSize: 125000,
        fileType: "application/pdf",
        uploadedAt: "2026-03-06T09:00:00.000Z",
      },
    ],
  },
  {
    id: "5",
    party_cell_id: "4dc9d414-0e5d-47dc-828a-e0a249b2b888",
    title: "Sự kiện giao lưu văn hóa",
    type: "EVENT",
    startTime: "2026-03-25T15:00:00.000Z",
    endTime: "2026-03-25T18:00:00.000Z",
    content: "Sự kiện giao lưu văn hóa giữa các chi bộ trong khu vực.",
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
    content: "Chúc mừng đ/c Nguyễn Văn A nhận Huy hiệu 30 năm tuổi Đảng.",
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
    content: "Mang theo phong bì chúc mừng. Xe xuất phát 10:00 tại trụ sở.",
    status: "SCHEDULED",
    format: "OFFLINE",
    location: "Trung tâm tiệc cưới ABC, 45 Cầu Giấy",
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
    attachments: [
      {
        id: "att-2",
        meetingId: "8",
        fileName: "bien_ban_hop_t2.docx",
        fileUrl: "/uploads/bien_ban_hop_t2.docx",
        fileSize: 85000,
        fileType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        uploadedAt: "2026-02-16T09:00:00.000Z",
      },
    ],
  },
  {
    id: "9",
    party_cell_id: "4dc9d414-0e5d-47dc-828a-e0a249b2b888",
    title: "Tang lễ thân mẫu đ/c Lê Văn C",
    type: "FUNERAL",
    startTime: "2026-02-20T07:00:00.000Z",
    endTime: "2026-02-20T12:00:00.000Z",
    content: "Kính mời các đồng chí đến viếng và chia buồn cùng gia đình.",
    status: "FINISHED",
    format: "OFFLINE",
    location: "Nhà tang lễ Thành phố",
    created_at: "2026-02-18T15:00:00.000Z",
    attachments: [],
  },
];

// GET /api/meetings - List all meetings
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const month = searchParams.get("month");
  const year = searchParams.get("year");

  let filteredMeetings = [...mockMeetings];

  // Filter by month and year if provided
  if (month && year) {
    filteredMeetings = filteredMeetings.filter((meeting) => {
      const meetingDate = new Date(meeting.startTime);
      return (
        meetingDate.getMonth() + 1 === parseInt(month) &&
        meetingDate.getFullYear() === parseInt(year)
      );
    });
  }

  // Sort by startTime descending (newest first)
  filteredMeetings.sort(
    (a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
  );

  return NextResponse.json(filteredMeetings);
}

// POST /api/meetings - Create new meeting
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const newMeeting: MeetingItem = {
      id: `${Date.now()}`,
      party_cell_id: body.partyCellId || "4dc9d414-0e5d-47dc-828a-e0a249b2b888",
      title: body.title,
      type: body.type,
      startTime: body.startTime,
      endTime: body.endTime || null,
      content: body.content || null,
      status: "SCHEDULED",
      format: body.onlineLink ? "ONLINE" : "OFFLINE",
      online_link: body.onlineLink || null,
      location: body.location || null,
      created_at: new Date().toISOString(),
      attachments: [],
    };

    mockMeetings.unshift(newMeeting);

    return NextResponse.json(newMeeting, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Tạo cuộc họp thất bại" },
      { status: 400 }
    );
  }
}
