import { NextRequest, NextResponse } from "next/server";
import { ADMISSION_ATTACHMENT_KIND_SET } from "@/lib/admissionAttachmentConstants";
import { getNeon, neonErrorToResponse } from "@/lib/neon";

function jsonError(message: string, status = 400) {
  return NextResponse.json({ message }, { status });
}

/**
 * POST /api/admissions/[id]/attachments
 * body: { kind, fileName, fileUrl, mimeType? } — URL có thể là link tải / blob tạm (QCUT upload).
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const sql = getNeon();
    const { id } = await context.params;
    const body = (await request.json()) as Record<string, unknown>;
    const kind = String(body.kind ?? "").trim();
    const fileName = String(body.fileName ?? "").trim() || null;
    const fileUrl = String(body.fileUrl ?? "").trim();
    const mimeType = body.mimeType ? String(body.mimeType) : null;

    if (!ADMISSION_ATTACHMENT_KIND_SET.has(kind)) {
      return jsonError("kind không hợp lệ (don | ly_lich | gioi_thieu | nghi_quyet_doan)");
    }
    if (!fileUrl || fileUrl.length > 2_000_000) {
      return jsonError("fileUrl thiếu hoặc quá dài");
    }

    const exists = await sql`
      SELECT 1 FROM party_admissions WHERE id = ${id} LIMIT 1
    `;
    if (!(exists as unknown[]).length) {
      return jsonError("Không tìm thấy hồ sơ", 404);
    }

    const inserted = await sql`
      INSERT INTO admission_attachments (admission_id, kind, file_name, file_url, mime_type)
      VALUES (${id}, ${kind}, ${fileName}, ${fileUrl}, ${mimeType})
      RETURNING id, kind, file_name AS "fileName", file_url AS "fileUrl", mime_type AS "mimeType", created_at AS "createdAt"
    `;
    const row = (inserted as Record<string, unknown>[])[0];
    return NextResponse.json(row, { status: 201 });
  } catch (e: unknown) {
    return neonErrorToResponse(e, "Lỗi Neon");
  }
}
