/**
 * Gọi backend deploy từ Route Handler (server). Dùng `PUBLIC_BACKEND_DEPLOY`.
 */
export function getServerDeployBaseUrl(): string {
  return (process.env.PUBLIC_BACKEND_DEPLOY || "").trim().replace(/\/$/, "");
}

export async function assignPartyMemberPositionOnServer(
  partyMemberId: string,
  payload: { positionCode: string; appointedDate: string; note: string },
  authorizationHeader: string | null
): Promise<unknown> {
  const base = getServerDeployBaseUrl();
  if (!base) {
    throw new Error(
      "Thiếu PUBLIC_BACKEND_DEPLOY trên server để gọi assign-position"
    );
  }
  const url = `${base}/party-members/${encodeURIComponent(partyMemberId)}/assign-position`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(authorizationHeader?.trim()
        ? { Authorization: authorizationHeader.trim() }
        : {}),
    },
    body: JSON.stringify(payload),
  });
  const text = await res.text();
  if (!res.ok) {
    let msg = text || `HTTP ${res.status}`;
    try {
      const j = JSON.parse(text) as { message?: string };
      if (typeof j.message === "string") msg = j.message;
    } catch {
      /* keep text */
    }
    throw new Error(msg);
  }
  if (!text) return {};
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}
