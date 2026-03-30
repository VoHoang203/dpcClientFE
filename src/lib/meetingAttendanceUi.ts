import type {
  MeetingDetailAttendee,
  MeetingItem,
} from "@/types/meeting";

export type AttendeeRowStatus =
  | "present"
  | "absent"
  | "pending"
  | "excused"
  | "pending_excuse";

/** Cuộc họp offline mới cần điểm danh PIN (online tự động). */
export function isOfflineMeeting(
  m: Pick<MeetingItem, "format" | "onlineLink" | "location"> | null
): boolean {
  if (!m) return false;
  if (m.format === "OFFLINE") return true;
  if (m.format === "ONLINE") return false;
  return !m.onlineLink && Boolean((m.location || "").trim());
}

export function mapAttendanceStatusToRowStatus(
  status: string | undefined
): AttendeeRowStatus {
  const s = (status || "").toUpperCase();
  if (s === "EXCUSED") return "excused";
  if (s === "PENDING_EXCUSE" || s === "PENDING_EXCUSED") {
    return "pending_excuse";
  }
  if (["PRESENT", "CHECKED_IN", "ATTENDED", "CONFIRMED"].includes(s)) {
    return "present";
  }
  if (["ABSENT", "REJECTED", "DENIED"].includes(s)) {
    return "absent";
  }
  return "pending";
}

/** Hiển thị ngày giờ cuộc họp; không bao giờ trả về chuỗi "Invalid Date". */
export function formatMeetingDateTime(
  iso: string | null | undefined
): string {
  if (iso == null || String(iso).trim() === "") return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function uniqueMeetingDetailAttendees(
  list: MeetingDetailAttendee[] | undefined
): MeetingDetailAttendee[] {
  if (!list?.length) return [];
  const seen = new Set<string>();
  const out: MeetingDetailAttendee[] = [];
  for (const a of list) {
    const mid = a.member?.id;
    if (!mid || seen.has(mid)) continue;
    seen.add(mid);
    out.push(a);
  }
  return out;
}
