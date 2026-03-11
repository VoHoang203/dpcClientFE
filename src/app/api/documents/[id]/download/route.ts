import { neon } from "@neondatabase/serverless";
import { NextRequest, NextResponse } from "next/server";

const sql = neon(process.env.DATABASE_URL!);

// POST /api/documents/[id]/download - Increment download count
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const result = await sql`
      UPDATE documents
      SET download_count = download_count + 1
      WHERE id = ${parseInt(id)}
      RETURNING 
        id,
        file_url as "fileUrl",
        file_name as "fileName",
        download_count as "downloadCount"
    `;

    if (result.length === 0) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(result[0]);
  } catch (error) {
    console.error("Error incrementing download count:", error);
    return NextResponse.json(
      { error: "Failed to process download" },
      { status: 500 }
    );
  }
}
