import { neon } from "@neondatabase/serverless";
import { NextRequest, NextResponse } from "next/server";

const sql = neon(process.env.DATABASE_URL!);

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

    // Check if meeting exists
    const meetingCheck = await sql`
      SELECT id FROM meetings WHERE id = ${id}::uuid
    `;

    if (meetingCheck.length === 0) {
      return NextResponse.json(
        { error: "Không tìm thấy cuộc họp" },
        { status: 404 }
      );
    }

    // In production, you would upload the file to a storage service (e.g., Vercel Blob)
    // For now, we'll just save the metadata
    const fileUrl = `/uploads/${Date.now()}-${file.name}`;

    const result = await sql`
      INSERT INTO meeting_attachments (
        meeting_id,
        file_name,
        file_url,
        file_size,
        file_type
      )
      VALUES (
        ${id}::uuid,
        ${file.name},
        ${fileUrl},
        ${file.size},
        ${file.type}
      )
      RETURNING 
        id,
        meeting_id as "meetingId",
        file_name as "fileName",
        file_url as "fileUrl",
        file_size as "fileSize",
        file_type as "fileType",
        uploaded_at as "uploadedAt",
        uploaded_by as "uploadedBy"
    `;

    return NextResponse.json(result[0], { status: 201 });
  } catch (error) {
    console.error("Error uploading attachment:", error);
    return NextResponse.json(
      { error: "Tải file thất bại" },
      { status: 500 }
    );
  }
}

// GET /api/meetings/[id]/attachments - List attachments
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const attachments = await sql`
      SELECT 
        id,
        meeting_id as "meetingId",
        file_name as "fileName",
        file_url as "fileUrl",
        file_size as "fileSize",
        file_type as "fileType",
        uploaded_at as "uploadedAt",
        uploaded_by as "uploadedBy"
      FROM meeting_attachments
      WHERE meeting_id = ${id}::uuid
      ORDER BY uploaded_at DESC
    `;

    return NextResponse.json(attachments);
  } catch (error) {
    console.error("Error fetching attachments:", error);
    return NextResponse.json(
      { error: "Failed to fetch attachments" },
      { status: 500 }
    );
  }
}
