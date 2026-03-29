import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import {
  ADMISSION_STEP_DEFINITIONS,
  notificationsAfterStepComplete,
  reviewBucketFromStep,
} from "@/lib/admissionWorkflow";
import { getNeon, neonErrorToResponse } from "@/lib/neon";

function jsonError(message: string, status = 400) {
  return NextResponse.json({ message }, { status });
}

/** GET /api/admissions — danh sách (demo). ?sessionKey= — một hồ sơ QCUT. */
export async function GET(request: NextRequest) {
  try {
    const sql = getNeon();
    const { searchParams } = new URL(request.url);
    const sessionKey = searchParams.get("sessionKey");
    if (sessionKey) {
      const rows = await sql`
        SELECT
          a.id,
          a.demo_session_key AS "demoSessionKey",
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
          a.updated_at AS "updatedAt",
          pc.name AS "partyCellName"
        FROM party_admissions a
        LEFT JOIN party_cells pc ON pc.id = a.party_cell_id
        WHERE a.demo_session_key = ${sessionKey.trim()}
        LIMIT 1
      `;
      const row = (rows as Record<string, unknown>[])[0];
      if (!row) {
        return jsonError("Không tìm thấy hồ sơ theo session", 404);
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
        WHERE admission_id = ${row.id as string}
        ORDER BY step_number ASC
      `;
      return NextResponse.json(
        { admission: row, progress },
        { status: 200 }
      );
    }

    const rows = await sql`
      SELECT
        a.id,
        a.full_name AS "fullName",
        a.phone,
        a.email,
        a.date_of_birth AS "dateOfBirth",
        a.permanent_address AS "permanentAddress",
        a.current_step AS "currentStep",
        a.workflow_status AS "workflowStatus",
        a.priority,
        a.documents_meta AS "documentsMeta",
        a.created_at AS "createdAt",
        pc.name AS "partyCellName"
      FROM party_admissions a
      LEFT JOIN party_cells pc ON pc.id = a.party_cell_id
      WHERE a.workflow_status = 'active'
      ORDER BY a.created_at DESC
    `;

    const list = (rows as Record<string, unknown>[]).map((r) => ({
      ...r,
      reviewBucket: reviewBucketFromStep(
        Number(r.currentStep) as number
      ),
    }));

    return NextResponse.json({ items: list }, { status: 200 });
  } catch (e: unknown) {
    return neonErrorToResponse(e, "Lỗi Neon");
  }
}

/** POST /api/admissions — QCUT nộp hồ sơ (tạo demo_session_key + thông báo Chi ủy). */
export async function POST(request: NextRequest) {
  try {
    const sql = getNeon();
    const body = (await request.json()) as Record<string, unknown>;
    const fullName = String(body.fullName ?? "").trim();
    if (!fullName) return jsonError("Thiếu họ tên");

    const partyCellCode = String(body.partyCellCode ?? "FPTU-DPC2").trim();
    const demoSessionKey = `demo-${randomUUID()}`;

    const cells = await sql`
      SELECT id FROM party_cells WHERE code = ${partyCellCode} LIMIT 1
    `;
    const cell = (cells as { id: string }[])[0];
    if (!cell) {
      return jsonError(`Không tìm thấy chi bộ mã ${partyCellCode}`, 400);
    }

    const dateOfBirth = body.dateOfBirth
      ? String(body.dateOfBirth)
      : null;
    const phone = body.phone ? String(body.phone) : null;
    const email = body.email ? String(body.email) : null;
    const permanentAddress = body.permanentAddress
      ? String(body.permanentAddress)
      : null;
    const reason = body.reason ? String(body.reason) : null;
    const documentsUrl = body.documentsUrl
      ? String(body.documentsUrl)
      : null;
    const documentsMetaRaw = body.documentsMeta;
    const documentsMetaStr: string | null =
      documentsMetaRaw == null
        ? null
        : typeof documentsMetaRaw === "string"
          ? documentsMetaRaw
          : JSON.stringify(documentsMetaRaw);

    const inserted = await sql`
      INSERT INTO party_admissions (
        party_cell_id,
        demo_session_key,
        full_name,
        date_of_birth,
        phone,
        email,
        permanent_address,
        reason,
        documents_url,
        documents_meta,
        current_step,
        workflow_status,
        priority
      )
      VALUES (
        ${cell.id},
        ${demoSessionKey},
        ${fullName},
        ${dateOfBirth},
        ${phone},
        ${email},
        ${permanentAddress},
        ${reason},
        ${documentsUrl},
        ${documentsMetaStr === null ? null : documentsMetaStr},
        2,
        'active',
        'normal'
      )
      RETURNING id
    `;
    const row = (inserted as { id: string }[])[0];
    if (!row) return jsonError("Không tạo được hồ sơ", 500);

    const admissionId = row.id;

    for (const def of ADMISSION_STEP_DEFINITIONS) {
      const done = def.step === 1;
      await sql`
        INSERT INTO admission_progress (
          admission_id,
          step_number,
          title,
          description,
          is_completed,
          completion_date,
          note
        )
        VALUES (
          ${admissionId},
          ${def.step},
          ${def.title},
          ${def.description},
          ${done},
          ${done ? new Date().toISOString() : null},
          ${done ? "Đã nộp hồ sơ" : null}
        )
      `;
    }

    const notifs = notificationsAfterStepComplete(1, admissionId, fullName);
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
        'qcut',
        'Đã gửi hồ sơ thành công',
        ${`Hồ sơ "${fullName}" đã chuyển tới Chi ủy. Theo dõi tại Tiến trình kết nạp.`},
        'admission',
        ${admissionId},
        false
      )
    `;

    return NextResponse.json(
      {
        id: admissionId,
        demoSessionKey,
        message: "Đã nộp hồ sơ — Chi ủy và bạn (QCUT) đều có thông báo trên Neon.",
      },
      { status: 201 }
    );
  } catch (e: unknown) {
    return neonErrorToResponse(e, "Lỗi Neon");
  }
}
