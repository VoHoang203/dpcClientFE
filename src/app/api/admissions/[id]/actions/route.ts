import { NextRequest, NextResponse } from "next/server";
import {
  notificationsAfterStepComplete,
  requiredRoleForApproveStep,
} from "@/lib/admissionWorkflow";
import { assignPartyMemberPositionOnServer } from "@/lib/deployApiServer";
import { getNeon, neonErrorToResponse } from "@/lib/neon";

type NeonSql = ReturnType<typeof getNeon>;

type NotifRow = {
  receiver_role: string;
  receiver_user_id?: string | null;
  title: string;
  body: string;
};

async function insertNotifications(
  sql: NeonSql,
  admissionId: string,
  items: NotifRow[]
) {
  for (const n of items) {
    await sql`
      INSERT INTO admission_notifications (
        receiver_role,
        receiver_user_id,
        title,
        body,
        type,
        admission_id,
        is_read
      )
      VALUES (
        ${n.receiver_role},
        ${n.receiver_user_id ?? null},
        ${n.title},
        ${n.body},
        'admission',
        ${admissionId},
        false
      )
    `;
  }
}

async function advanceAdmissionStep(
  sql: NeonSql,
  admissionId: string,
  fullName: string,
  cs: number,
  note: string | null,
  qcutSubmitterUserId: string | null
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

  const notifs = notificationsAfterStepComplete(
    cs,
    admissionId,
    fullName,
    qcutSubmitterUserId
  );
  await insertNotifications(sql, admissionId, notifs);

  return {
    done,
    nextStep: done ? null : newStep,
    workflowStatus: done ? "completed" : "active",
  };
}

function qcutAuthorized(
  adm: {
    demoSessionKey: string | null;
    submitterUserId: string | null;
  },
  sessionKey: string,
  actorUserId: string
): boolean {
  if (sessionKey && adm.demoSessionKey === sessionKey) return true;
  if (
    actorUserId &&
    adm.submitterUserId &&
    adm.submitterUserId === actorUserId
  ) {
    return true;
  }
  return false;
}

/**
 * POST /api/admissions/[id]/actions
 * approve_step: { action, actorRole, note?, partyMemberId?, submitterUserId?, appointedDate? } — Authorization: Bearer
 * qcut_*: { sessionKey?, actorUserId? }
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
        demo_session_key AS "demoSessionKey",
        submitter_user_id AS "submitterUserId",
        party_member_id AS "partyMemberId"
      FROM party_admissions
      WHERE id = ${id}
      LIMIT 1
    `) as Array<{
      id: string;
      fullName: string;
      currentStep: number;
      workflowStatus: string;
      demoSessionKey: string | null;
      submitterUserId: string | null;
      partyMemberId: string | null;
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

    const qcutUid = String(body.actorUserId ?? "").trim();
    const sessionKey = body.sessionKey ? String(body.sessionKey) : "";

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
      if (!qcutAuthorized(adm, sessionKey, qcutUid)) {
        return NextResponse.json(
          { message: "Không đủ quyền (session / tài khoản QCUT)" },
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
      if (!qcutAuthorized(adm, sessionKey, qcutUid)) {
        return NextResponse.json(
          { message: "Không đủ quyền (session / tài khoản QCUT)" },
          { status: 403 }
        );
      }
      const cs = Number(adm.currentStep);
      if (cs !== 4) {
        return NextResponse.json(
          {
            message:
              "Hiện không có bước cần QCUT xác nhận (chỉ bước xác minh lý lịch)",
          },
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
        note,
        adm.submitterUserId
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

    const actorRole = String(body.actorRole ?? "").trim() as
      | "chi_uy"
      | "pho_bi_thu"
      | "bi_thu"
      | "qcut"
      | "";
    const need = requiredRoleForApproveStep(cs);
    if (!need || actorRole !== need) {
      return NextResponse.json(
        {
          message: `Bước này chỉ role "${need}" mới được duyệt (bạn gửi "${actorRole || "—"}")`,
        },
        { status: 403 }
      );
    }

    if (cs === 7) {
      /**
       * `{id}` assign-position: partyMemberId (body) → submitterUserId (body, từ FE) → Neon submitter_user_id → party_member_id.
       */
      const bodyPm = String(body.partyMemberId ?? "").trim();
      const bodySubmitter = String(body.submitterUserId ?? "").trim();
      const partyMemberId =
        bodyPm ||
        bodySubmitter ||
        String(adm.submitterUserId ?? "").trim() ||
        String(adm.partyMemberId ?? "").trim();
      if (!partyMemberId) {
        return NextResponse.json(
          {
            message:
              "Thiếu UUID cho assign-position — gửi submitterUserId hoặc partyMemberId trong body, hoặc lưu submitter_user_id / party_member_id trên party_admissions",
          },
          { status: 400 }
        );
      }
      const appointedDate =
        typeof body.appointedDate === "string" && body.appointedDate.trim()
          ? body.appointedDate.trim()
          : new Date().toISOString();
      const positionNote = body.note
        ? String(body.note)
        : "Kết nạp Đảng — hoàn tất quy trình";
      const authHeader = request.headers.get("authorization");
      try {
        await assignPartyMemberPositionOnServer(
          partyMemberId,
          {
            positionCode: "PARTY_MEMBER",
            appointedDate,
            note: positionNote,
          },
          authHeader
        );
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "assign-position thất bại";
        return NextResponse.json({ message: msg }, { status: 502 });
      }
    }

    const result = await advanceAdmissionStep(
      sql,
      id,
      adm.fullName,
      cs,
      body.note ? String(body.note) : null,
      adm.submitterUserId
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
