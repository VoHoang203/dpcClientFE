import { neon } from "@neondatabase/serverless";
import { NextRequest, NextResponse } from "next/server";

const sql = neon(process.env.DATABASE_URL!);

// DELETE /api/meetings/[id]/attachments/[attachmentId] - Delete attachment
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; attachmentId: string }> }
) {
  try {
    const { id, attachmentId } = await params;

    // Delete attachment and verify it belongs to the meeting
    const result = await sql`
      DELETE FROM meeting_attachments 
      WHERE id = ${attachmentId}::uuid 
        AND meeting_id = ${id}::uuid
      RETURNING id
    `;

    if (result.length === 0) {
      return NextResponse.json(
        { error: "Không tìm thấy file đính kèm" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting attachment:", error);
    return NextResponse.json(
      { error: "Xóa file thất bại" },
      { status: 500 }
    );
  }
}
