import { neon } from "@neondatabase/serverless";
import { NextRequest, NextResponse } from "next/server";

const sql = neon(process.env.DATABASE_URL!);

// GET /api/meetings - List all meetings
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const month = searchParams.get("month");
    const year = searchParams.get("year");

    let meetings;

    if (month && year) {
      // Filter by month and year
      meetings = await sql`
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
        WHERE EXTRACT(MONTH FROM m.start_time) = ${parseInt(month)}
          AND EXTRACT(YEAR FROM m.start_time) = ${parseInt(year)}
        GROUP BY m.id
        ORDER BY m.start_time DESC
      `;
    } else {
      // Get all meetings
      meetings = await sql`
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
        GROUP BY m.id
        ORDER BY m.start_time DESC
      `;
    }

    return NextResponse.json(meetings);
  } catch (error) {
    console.error("Error fetching meetings:", error);
    return NextResponse.json(
      { error: "Failed to fetch meetings" },
      { status: 500 }
    );
  }
}

// POST /api/meetings - Create new meeting
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      title,
      type = "PERIODIC",
      startTime,
      endTime,
      location,
      onlineLink,
      content,
      partyCellId,
    } = body;

    if (!title || !startTime) {
      return NextResponse.json(
        { error: "Title and startTime are required" },
        { status: 400 }
      );
    }

    const format = onlineLink ? "ONLINE" : "OFFLINE";

    const result = await sql`
      INSERT INTO meetings (
        title, 
        type, 
        start_time, 
        end_time, 
        location, 
        online_link, 
        content, 
        format,
        party_cell_id,
        status
      )
      VALUES (
        ${title}, 
        ${type}::meeting_type_enum, 
        ${startTime}, 
        ${endTime || null}, 
        ${location || null}, 
        ${onlineLink || null}, 
        ${content || null}, 
        ${format}::meeting_format_enum,
        ${partyCellId || null},
        'SCHEDULED'
      )
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
        attendance_secret,
        is_checkin_active,
        location,
        format,
        minutes_url
    `;

    return NextResponse.json(result[0], { status: 201 });
  } catch (error) {
    console.error("Error creating meeting:", error);
    return NextResponse.json(
      { error: "Failed to create meeting" },
      { status: 500 }
    );
  }
}
