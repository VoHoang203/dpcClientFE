import httpService from "@/lib/http";
import { unwrapApiList } from "@/lib/apiEnvelope";

/** Phần tử GET /committee/members — `id` là user; `member.id` dùng cho participantIds khi tạo meeting. */
export interface CommitteeMember {
  id: string;
  username: string;
  email: string;
  member?: {
    id: string;
    fullName?: string | null;
  } | null;
}

/** Id đảng viên (party member) để gửi `participantIds` — khớp `items[].member.id` từ API. */
export function committeeMemberParticipantId(
  m: CommitteeMember
): string | null {
  const mid = m.member?.id?.trim();
  return mid && mid.length > 0 ? mid : null;
}

export const committeeService = {
  async listMembers(params?: { page?: number; limit?: number }) {
    const q = new URLSearchParams();
    q.set("page", String(params?.page ?? 1));
    q.set("limit", String(params?.limit ?? 100));
    const { data } = await httpService.get<unknown>(`/committee/members?${q.toString()}`);
    return unwrapApiList<CommitteeMember>(data);
  },
};

export function memberDisplayName(m: CommitteeMember): string {
  const name = m.member?.fullName?.trim();
  if (name) return name;
  return m.username || m.email || m.id.slice(0, 8);
}
