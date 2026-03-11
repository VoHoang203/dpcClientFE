import { neon } from "@neondatabase/serverless";
import { NextRequest, NextResponse } from "next/server";

const sql = neon(process.env.DATABASE_URL!);

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

    const result = await sql`
      UPDATE meetings 
      SET status = ${status}::meeting_status_enum
      WHERE id = ${id}::uuid
      RETURNING 
        id,
        party_cell_id,
        title,
        type,
        online_link,
        start_time as "startTime",
        end_time as "endTime",
        content,
        status,
        created_by,
        created_at,
        location,
        format
    `;

    if (result.length === 0) {
      return NextResponse.json(
        { error: "Không tìm thấy cuộc họp" },
        { status: 404 }
      );
    }

    return NextResponse.json(result[0]);
  } catch (error) {
    console.error("Error updating meeting status:", error);
    return NextResponse.json(
      { error: "Cập nhật trạng thái thất bại" },
      { status: 500 }
    );
  }
}
