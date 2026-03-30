import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { ADMISSION_ATTACHMENT_KIND_SET } from "@/lib/admissionAttachmentConstants";
import {
  ADMISSION_STEP_DEFINITIONS,
  notificationsAfterStepComplete,
  reviewBucketFromStep,
} from "@/lib/admissionWorkflow";
import { getNeon, neonErrorToResponse } from "@/lib/neon";

function jsonError(message: string, status = 400) {
  return NextResponse.json({ message }, { status });
}

type AttachmentRowDb = {
  admissionId: string;
  id: string;
  kind: string;
  fileName: string | null;
  fileUrl: string;
  mimeType: string | null;
  createdAt: unknown;
};

type AdmissionAttachmentJson = {
  id: string;
  kind: string;
  fileName: string | null;
  fileUrl: string;
  mimeType: string | null;
  createdAt: string;
};

function serializeAttachmentCreatedAt(v: unknown): string {
  if (v instanceof Date) return v.toISOString();
  if (typeof v === "string") return v;
  return String(v ?? "");
}

/** Tất cả attachment của hồ sơ active — gom theo admission_id. */
async function loadAttachmentsGroupedByActiveAdmissions(
  sql: ReturnType<typeof getNeon>
): Promise<Map<string, AdmissionAttachmentJson[]>> {
  const map = new Map<string, AdmissionAttachmentJson[]>();
  try {
    const rows = (await sql`
      SELECT
        at.admission_id AS "admissionId",
        at.id,
        at.kind,
        at.file_name AS "fileName",
        at.file_url AS "fileUrl",
        at.mime_type AS "mimeType",
        at.created_at AS "createdAt"
      FROM admission_attachments at
      INNER JOIN party_admissions a ON a.id = at.admission_id
      WHERE a.workflow_status = 'active'
      ORDER BY at.admission_id ASC, at.created_at ASC
    `) as AttachmentRowDb[];
    for (const r of rows) {
      const { admissionId, id, kind, fileName, fileUrl, mimeType, createdAt } =
        r;
      const item: AdmissionAttachmentJson = {
        id,
        kind,
        fileName,
        fileUrl,
        mimeType,
        createdAt:
          typeof createdAt === "string"
            ? createdAt
            : new Date(createdAt as unknown as Date).toISOString(),
      };
      const list = map.get(admissionId) ?? [];
      list.push(item);
      map.set(admissionId, list);
    }
  } catch {
    /* bảng chưa migrate */
  }
  return map;
}

async function loadAttachmentsForAdmissionId(
  sql: ReturnType<typeof getNeon>,
  admissionId: string
): Promise<AdmissionAttachmentJson[]> {
  try {
    const rows = (await sql`
      SELECT
        id,
        kind,
        file_name AS "fileName",
        file_url AS "fileUrl",
        mime_type AS "mimeType",
        created_at AS "createdAt"
      FROM admission_attachments
      WHERE admission_id = ${admissionId}
      ORDER BY created_at ASC
    `) as Array<{
      id: string;
      kind: string;
      fileName: string | null;
      fileUrl: string;
      mimeType: string | null;
      createdAt: unknown;
    }>;
    return rows.map((r) => ({
      id: r.id,
      kind: r.kind,
      fileName: r.fileName,
      fileUrl: r.fileUrl,
      mimeType: r.mimeType,
      createdAt: serializeAttachmentCreatedAt(r.createdAt),
    }));
  } catch {
    return [];
  }
}

/** GET /api/admissions — danh sách active. ?sessionKey= | ?userId= — một hồ sơ QCUT. */
export async function GET(request: NextRequest) {
  try {
    const sql = getNeon();
    const { searchParams } = new URL(request.url);
    const sessionKey = searchParams.get("sessionKey");
    const userId = searchParams.get("userId")?.trim();
    if (sessionKey || userId) {
      const rows = userId
        ? await sql`
            SELECT
              a.id,
              a.demo_session_key AS "demoSessionKey",
              a.submitter_user_id AS "submitterUserId",
              a.party_member_id AS "partyMemberId",
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
            WHERE a.submitter_user_id = ${userId}
              AND a.workflow_status = 'active'
            ORDER BY a.created_at DESC
            LIMIT 1
          `
        : await sql`
            SELECT
              a.id,
              a.demo_session_key AS "demoSessionKey",
              a.submitter_user_id AS "submitterUserId",
              a.party_member_id AS "partyMemberId",
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
            WHERE a.demo_session_key = ${sessionKey!.trim()}
            LIMIT 1
          `;
      const row = (rows as Record<string, unknown>[])[0];
      if (!row) {
        return jsonError(
          userId
            ? "Không tìm thấy hồ sơ active theo tài khoản"
            : "Không tìm thấy hồ sơ theo session",
          404
        );
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
      const attachments = await loadAttachmentsForAdmissionId(
        sql,
        row.id as string
      );
      return NextResponse.json(
        { admission: row, progress, attachments },
        { status: 200 }
      );
    }

    const rows = await sql`
      SELECT
        a.id,
        a.submitter_user_id AS "submitterUserId",
        a.party_member_id AS "partyMemberId",
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

    const attachmentByAdmission =
      await loadAttachmentsGroupedByActiveAdmissions(sql);

    const list = (rows as Record<string, unknown>[]).map((r) => ({
      ...r,
      reviewBucket: reviewBucketFromStep(
        Number(r.currentStep) as number
      ),
      attachments: attachmentByAdmission.get(String(r.id)) ?? [],
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
    const submitterUserId = body.submitterUserId
      ? String(body.submitterUserId).trim()
      : null;
    const partyMemberId = body.partyMemberId
      ? String(body.partyMemberId).trim()
      : null;
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
        submitter_user_id,
        party_member_id,
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
        ${submitterUserId},
        ${partyMemberId},
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

    const rawAttachments = body.attachments;
    if (Array.isArray(rawAttachments)) {
      for (const raw of rawAttachments) {
        if (!raw || typeof raw !== "object") continue;
        const o = raw as Record<string, unknown>;
        const kind = String(o.kind ?? "").trim();
        const fileUrl = String(o.fileUrl ?? "").trim();
        const fileName =
          o.fileName != null ? String(o.fileName).trim() || null : null;
        const mimeType =
          o.mimeType != null && String(o.mimeType).trim()
            ? String(o.mimeType)
            : null;
        if (
          !ADMISSION_ATTACHMENT_KIND_SET.has(kind) ||
          !fileUrl ||
          fileUrl.length > 2_000_000
        ) {
          continue;
        }
        try {
          await sql`
            INSERT INTO admission_attachments (
              admission_id,
              kind,
              file_name,
              file_url,
              mime_type
            )
            VALUES (${admissionId}, ${kind}, ${fileName}, ${fileUrl}, ${mimeType})
          `;
        } catch {
          /* bảng chưa migrate hoặc lỗi dòng */
        }
      }
    }

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

    const notifs = notificationsAfterStepComplete(
      1,
      admissionId,
      fullName,
      submitterUserId
    );
    for (const n of notifs) {
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
        'qcut',
        ${submitterUserId},
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
