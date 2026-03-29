import { NextResponse } from "next/server";
import { getNeon, neonErrorToResponse } from "@/lib/neon";

/** GET /api/health/neon — kiểm tra DATABASE_URL + đã chạy script admission chưa. */
export async function GET() {
  try {
    const sql = getNeon();
    const rows = (await sql`
      SELECT
        to_regclass('public.party_cells') IS NOT NULL AS "partyCells",
        to_regclass('public.party_admissions') IS NOT NULL AS "partyAdmissions",
        to_regclass('public.admission_progress') IS NOT NULL AS "admissionProgress",
        to_regclass('public.admission_notifications') IS NOT NULL AS "admissionNotifications"
    `) as Record<string, unknown>[];
    return NextResponse.json({ ok: true, ...rows[0] }, { status: 200 });
  } catch (e: unknown) {
    return neonErrorToResponse(e, "Lỗi kiểm tra Neon");
  }
}
