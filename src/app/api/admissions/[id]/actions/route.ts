import { NextRequest, NextResponse } from "next/server";
import { notificationsAfterStepComplete } from "@/lib/admissionWorkflow";
import { getNeon, neonErrorToResponse } from "@/lib/neon";

type NeonSql = ReturnType<typeof getNeon>;

async function advanceAdmissionStep(
  sql: NeonSql,
  admissionId: string,
  fullName: string,
  cs: number,
  note: string | null
) {
  await sql`
    UPDATE admission_progress
    SET is_completed = true,
        completion_date = now(),
        note = COALESCE(${note}, note)
    WHERE admission_id = ${admissionId} AND step_number = ${cs}
  `;

  const newStep = cs + 1;
  const done = cs >= 7;

  await sql`
    UPDATE party_admissions
    SET current_step = ${done ? 8 : newStep},
        workflow_status = ${done ? "completed" : "active"},
        updated_at = now()
    WHERE id = ${admissionId}
  `;

  const notifs = notificationsAfterStepComplete(cs, admissionId, fullName);
  for (const n of notifs) {
    await sql`
      INSERT INTO admission_notifications (
        receiver_role,
        title,
        body,
        type,
        admission_id,
        is_read
      )
      VALUES (
        ${n.receiver_role},
        ${n.title},
        ${n.body},
        'admission',
        ${admissionId},
        false
      )
    `;
  }

  return {
    done,
    nextStep: done ? null : newStep,
    workflowStatus: done ? "completed" : "active",
  };
}

/**
 * POST /api/admissions/[id]/actions
 * body:
 *   { action: "approve_step" | "reject", note? } — reviewer
 *   { action: "qcut_confirm" | "qcut_decline", sessionKey, note? } — QCUT (khớp demo_session_key)
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const sql = getNeon();
    const { id } = await context.params;
    const body = (await request.json()) as Record<string, unknown>;
    const action = String(body.action ?? "");

    const admRows = (await sql`
      SELECT
        id,
        full_name AS "fullName",
        current_step AS "currentStep",
        workflow_status AS "workflowStatus",
        demo_session_key AS "demoSessionKey"
      FROM party_admissions
      WHERE id = ${id}
      LIMIT 1
    `) as Array<{
      id: string;
      fullName: string;
      currentStep: number;
      workflowStatus: string;
      demoSessionKey: string | null;
    }>;
    const adm = admRows[0];
    if (!adm) {
      return NextResponse.json({ message: "Không tìm thấy hồ sơ" }, { status: 404 });
    }
    if (adm.workflowStatus !== "active") {
      return NextResponse.json(
        { message: "Hồ sơ không còn active" },
        { status: 400 }
      );
    }

    if (action === "reject") {
      const note = body.note ? String(body.note) : null;
      await sql`
        UPDATE party_admissions
        SET workflow_status = 'rejected',
            remark = ${note},
            updated_at = now()
        WHERE id = ${id}
      `;
      return NextResponse.json({ ok: true, workflowStatus: "rejected" });
    }

    if (action === "qcut_decline") {
      const sessionKey = body.sessionKey ? String(body.sessionKey) : "";
      if (!sessionKey || adm.demoSessionKey !== sessionKey) {
        return NextResponse.json(
          { message: "Phiên không hợp lệ (sessionKey)" },
          { status: 403 }
        );
      }
      const note = body.note ? String(body.note) : "QCUT từ bỏ / rút hồ sơ";
      await sql`
        UPDATE party_admissions
        SET workflow_status = 'rejected',
            remark = ${note},
            updated_at = now()
        WHERE id = ${id}
      `;
      return NextResponse.json({ ok: true, workflowStatus: "rejected" });
    }

    if (action === "qcut_confirm") {
      const sessionKey = body.sessionKey ? String(body.sessionKey) : "";
      if (!sessionKey || adm.demoSessionKey !== sessionKey) {
        return NextResponse.json(
          { message: "Phiên không hợp lệ (sessionKey)" },
          { status: 403 }
        );
      }
      const cs = Number(adm.currentStep);
      if (cs !== 4) {
        return NextResponse.json(
          { message: "Hiện không có bước cần QCUT xác nhận (chỉ bước xác minh lý lịch)" },
          { status: 400 }
        );
      }
      const note = body.note ? String(body.note) : null;
      const metaPatch = body.documentsMeta;
      if (metaPatch !== undefined && metaPatch !== null) {
        const metaStr =
          typeof metaPatch === "string"
            ? metaPatch
            : JSON.stringify(metaPatch);
        await sql`
          UPDATE party_admissions
          SET documents_meta = COALESCE(documents_meta, '{}'::jsonb) || ${metaStr}::jsonb,
              updated_at = now()
          WHERE id = ${id}
        `;
      }
      const result = await advanceAdmissionStep(
        sql,
        id,
        adm.fullName,
        cs,
        note
      );
      return NextResponse.json({
        ok: true,
        completedStep: cs,
        nextStep: result.nextStep,
        workflowStatus: result.workflowStatus,
      });
    }

    if (action !== "approve_step") {
      return NextResponse.json({ message: "action không hợp lệ" }, { status: 400 });
    }

    const cs = Number(adm.currentStep);
    if (cs < 1 || cs > 7) {
      return NextResponse.json(
        { message: "Không có bước để duyệt" },
        { status: 400 }
      );
    }

    const result = await advanceAdmissionStep(
      sql,
      id,
      adm.fullName,
      cs,
      body.note ? String(body.note) : null
    );

    return NextResponse.json({
      ok: true,
      completedStep: cs,
      nextStep: result.nextStep,
      workflowStatus: result.workflowStatus,
    });
  } catch (e: unknown) {
    return neonErrorToResponse(e, "Lỗi Neon");
  }
}
