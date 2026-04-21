import httpService from "@/lib/http";
import { unwrapPaginatedItems } from "@/lib/helpers";
import type { PaginationMeta } from "@/lib/helpers";

/** Mặc định theo Swagger / môi trường demo (cùng chi bộ các API workspace khác). */
const DEFAULT_PARTY_CELL_ID = "4dc9d414-0e5d-47dc-828a-e0a249b2b888";

export type PartyFeeMemberSummary = {
  id: string;
  fullName: string;
  /** Từ `member.user.username` — dùng tìm kiếm FE. */
  username: string | null;
  dob: string | null;
  gender: string | null;
  phone: string | null;
};

export type PartyFeeRecord = {
  id: string;
  memberId: string;
  member: PartyFeeMemberSummary | null;
  month: number;
  year: number;
  amount: number | null;
  status: string;
  paymentDate: string | null;
};

/** Một dòng trong GET `/party-fees/my-fees?year=`. */
export type MyFeeMonthRow = {
  month: string;
  isPaid: boolean;
  amount: number;
  paidAt: string | null;
};

function pickMember(raw: unknown): PartyFeeMemberSummary | null {
  if (!raw || typeof raw !== "object") return null;
  const m = raw as Record<string, unknown>;
  const id = m.id != null ? String(m.id) : "";
  if (!id) return null;
  let username: string | null = null;
  const user = m.user;
  if (user && typeof user === "object") {
    const u = user as Record<string, unknown>;
    if (u.username != null && String(u.username).trim()) {
      username = String(u.username).trim();
    }
  }
  return {
    id,
    fullName: m.fullName != null ? String(m.fullName) : "",
    username,
    dob: m.dob != null ? String(m.dob) : null,
    gender: m.gender != null ? String(m.gender) : null,
    phone: m.phone != null ? String(m.phone) : null,
  };
}

/** Đã đóng phí (theo enum thường gặp từ BE). */
export function isPartyFeePaidStatus(status: string): boolean {
  const s = status.toUpperCase();
  return s === "PAID" || s === "COMPLETED" || s === "DONE";
}

function normalizePartyFeeRecord(raw: unknown): PartyFeeRecord {
  const r = (raw ?? {}) as Record<string, unknown>;
  const amount =
    typeof r.amount === "number" && Number.isFinite(r.amount)
      ? r.amount
      : r.amount != null &&
        String(r.amount).trim() !== "" &&
        Number.isFinite(Number(r.amount))
        ? Number(r.amount)
        : null;
  return {
    id: r.id != null ? String(r.id) : "",
    memberId: r.memberId != null ? String(r.memberId) : "",
    member: pickMember(r.member),
    month: Number(r.month) || 0,
    year: Number(r.year) || 0,
    amount,
    status: r.status != null ? String(r.status) : "",
    paymentDate:
      r.paymentDate != null && String(r.paymentDate).trim()
        ? String(r.paymentDate)
        : null,
  };
}

export const partyFeeService = {
  async list(params: {
    partyCellId?: string;
    month: number;
    year: number;
    page?: number;
    limit?: number;
  }): Promise<{ items: PartyFeeRecord[]; meta: PaginationMeta | null }> {
    const q = new URLSearchParams();
    q.set("partyCellId", params.partyCellId ?? DEFAULT_PARTY_CELL_ID);
    q.set("month", String(params.month));
    q.set("year", String(params.year));
    q.set("page", String(params.page ?? 1));
    q.set("limit", String(params.limit ?? 10));
    const { data } = await httpService.get<unknown>(`/party-fees?${q.toString()}`);
    const { items: rawItems, meta } = unwrapPaginatedItems<unknown>(data);
    return {
      items: rawItems.map(normalizePartyFeeRecord),
      meta,
    };
  },
  async confirm(id: string): Promise<void> {
    await httpService.patch(`/party-fees/${id}/confirm`, {});
  },

  /** GET `/party-fees/my-fees?year=` — danh sách 12 tháng trong năm. */
  async getMyFees(year: number): Promise<MyFeeMonthRow[]> {
    const { data } = await httpService.get<unknown>(
      `/party-fees/my-fees?year=${year}`,
    );
    const body = data as Record<string, unknown> | MyFeeMonthRow[];
    const rows: unknown[] = Array.isArray(body)
      ? body
      : body && Array.isArray(body.data)
        ? (body.data as unknown[])
        : [];
    return rows.map((r) => {
      const o = (r ?? {}) as Record<string, unknown>;
      return {
        month: String(o.month ?? ""),
        isPaid: Boolean(o.isPaid),
        amount:
          typeof o.amount === "number" && Number.isFinite(o.amount)
            ? o.amount
            : Number(o.amount) || 0,
        paidAt:
          o.paidAt != null && String(o.paidAt).trim()
            ? String(o.paidAt)
            : null,
      };
    });
  },
};
