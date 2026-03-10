import { neon } from "@neondatabase/serverless";
import { NextRequest, NextResponse } from "next/server";

const sql = neon(process.env.DATABASE_URL!);

// GET /api/meetings/[id] - Get meeting by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const meetings = await sql`
      SELECT 
        m.id,
        m.party_cell_id,
        m.title,
        m.type,
        m.online_link,
        m.start_time as "startTime",
        m.end_time as "endTime",
        m.content,
        m.status,
        m.created_by,
        m.created_at,
        m.attendance_secret,
        m.is_checkin_active,
        m.location,
        m.format,
        m.minutes_url,
        COALESCE(
          json_agg(
            json_build_object(
              'id', a.id,
              'meetingId', a.meeting_id,
              'fileName', a.file_name,
              'fileUrl', a.file_url,
              'fileSize', a.file_size,
              'fileType', a.file_type,
              'uploadedAt', a.uploaded_at,
              'uploadedBy', a.uploaded_by
            )
          ) FILTER (WHERE a.id IS NOT NULL),
          '[]'
        ) as attachments
      FROM meetings m
      LEFT JOIN meeting_attachments a ON m.id = a.meeting_id
      WHERE m.id = ${id}::uuid
      GROUP BY m.id
    `;

    if (meetings.length === 0) {
      return NextResponse.json(
        { error: "Không tìm thấy cuộc họp" },
        { status: 404 }
      );
    }

    return NextResponse.json(meetings[0]);
  } catch (error) {
    console.error("Error fetching meeting:", error);
    return NextResponse.json(
      { error: "Failed to fetch meeting" },
      { status: 500 }
    );
  }
}

// PATCH /api/meetings/[id] - Update meeting
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const {
      title,
      type,
      startTime,
      endTime,
      content,
      status,
      location,
      onlineLink,
    } = body;

    // Build dynamic update query
    const updates: string[] = [];
    const values: (string | null)[] = [];

    if (title !== undefined) {
      updates.push("title");
      values.push(title);
    }
    if (type !== undefined) {
      updates.push("type");
      values.push(type);
    }
    if (startTime !== undefined) {
      updates.push("start_time");
      values.push(startTime);
    }
    if (endTime !== undefined) {
      updates.push("end_time");
      values.push(endTime);
    }
    if (content !== undefined) {
      updates.push("content");
      values.push(content);
    }
    if (status !== undefined) {
      updates.push("status");
      values.push(status);
    }
    if (location !== undefined) {
      updates.push("location");
      values.push(location);
    }
    if (onlineLink !== undefined) {
      updates.push("online_link");
      values.push(onlineLink);
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { error: "No fields to update" },
        { status: 400 }
      );
    }

    // Use a simpler approach - update each field individually if provided
    const result = await sql`
      UPDATE meetings SET
        title = COALESCE(${title ?? null}, title),
        type = COALESCE(${type ?? null}::meeting_type_enum, type),
        start_time = COALESCE(${startTime ?? null}::timestamp, start_time),
        end_time = COALESCE(${endTime ?? null}::timestamp, end_time),
        content = COALESCE(${content ?? null}, content),
        status = COALESCE(${status ?? null}::meeting_status_enum, status),
        location = COALESCE(${location ?? null}, location),
        online_link = COALESCE(${onlineLink ?? null}, online_link),
        format = CASE 
          WHEN ${onlineLink ?? null} IS NOT NULL THEN 'ONLINE'::meeting_format_enum
          WHEN ${location ?? null} IS NOT NULL THEN 'OFFLINE'::meeting_format_enum
          ELSE format
        END
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
    console.error("Error updating meeting:", error);
    return NextResponse.json(
      { error: "Failed to update meeting" },
      { status: 500 }
    );
  }
}

// DELETE /api/meetings/[id] - Delete meeting
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const result = await sql`
      DELETE FROM meetings 
      WHERE id = ${id}::uuid
      RETURNING id
    `;

    if (result.length === 0) {
      return NextResponse.json(
        { error: "Không tìm thấy cuộc họp" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting meeting:", error);
    return NextResponse.json(
      { error: "Failed to delete meeting" },
      { status: 500 }
    );
  }
}
