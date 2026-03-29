import { NextRequest, NextResponse } from "next/server";
import { getNeon, neonErrorToResponse } from "@/lib/neon";

/** GET /api/admissions/[id] — chi tiết + tiến độ (popup pending-review). */
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const sql = getNeon();
    const { id } = await context.params;

    const rows = (await sql`
      SELECT
        a.id,
        a.full_name AS "fullName",
        a.date_of_birth AS "dateOfBirth",
        a.phone,
        a.email,
        a.permanent_address AS "permanentAddress",
        a.reason,
        a.documents_url AS "documentsUrl",
        a.documents_meta AS "documentsMeta",
        a.current_step AS "currentStep",
        a.workflow_status AS "workflowStatus",
        a.priority,
        a.remark,
        a.created_at AS "createdAt",
        pc.name AS "partyCellName"
      FROM party_admissions a
      LEFT JOIN party_cells pc ON pc.id = a.party_cell_id
      WHERE a.id = ${id}
      LIMIT 1
    `) as Record<string, unknown>[];
    const admission = rows[0];
    if (!admission) {
      return NextResponse.json({ message: "Không tìm thấy" }, { status: 404 });
    }

    const progress = await sql`
      SELECT
        step_number AS "stepNumber",
        title,
        description,
        is_completed AS "isCompleted",
        completion_date AS "completionDate",
        note
      FROM admission_progress
      WHERE admission_id = ${id}
      ORDER BY step_number ASC
    `;

    return NextResponse.json({ admission, progress }, { status: 200 });
  } catch (e: unknown) {
    return neonErrorToResponse(e, "Lỗi Neon");
  }
}
