import { NextRequest, NextResponse } from "next/server";
import { getNeon, neonErrorToResponse } from "@/lib/neon";

/** GET /api/notifications?role=chi_uy|pho_bi_thu|bi_thu|qcut — poll header. */
export async function GET(request: NextRequest) {
  try {
    const sql = getNeon();
    const role = request.nextUrl.searchParams.get("role")?.trim();
    if (!role) {
      return NextResponse.json({ message: "Thiếu query role" }, { status: 400 });
    }

    const rows = await sql`
      SELECT
        id,
        title,
        body,
        type,
        admission_id AS "admissionId",
        is_read AS "isRead",
        created_at AS "createdAt"
      FROM admission_notifications
      WHERE receiver_role = ${role}
      ORDER BY created_at DESC
      LIMIT 50
    `;

    const counts = (await sql`
      SELECT count(*)::int AS c
      FROM admission_notifications
      WHERE receiver_role = ${role} AND is_read = false
    `) as { c: number }[];
    const unreadCount = counts[0]?.c ?? 0;

    return NextResponse.json({ items: rows, unreadCount }, { status: 200 });
  } catch (e: unknown) {
    return neonErrorToResponse(e, "Lỗi Neon");
  }
}

/** PATCH /api/notifications — body: { "ids": string[] } đánh dấu đã đọc. */
export async function PATCH(request: NextRequest) {
  try {
    const sql = getNeon();
    const body = (await request.json()) as { ids?: string[] };
    const ids = body.ids;
    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ message: "Thiếu ids" }, { status: 400 });
    }

    for (const id of ids) {
      await sql`
        UPDATE admission_notifications
        SET is_read = true
        WHERE id = ${id}
      `;
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e: unknown) {
    return neonErrorToResponse(e, "Lỗi Neon");
  }
}
