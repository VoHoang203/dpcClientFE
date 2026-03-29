/**
 * - **NEXT_PUBLIC_API_DEPLOY** → Next.js (`/api/...`). Trống = same-origin `/api/...`.
 * - **API_DEPLOY** + **NEXT_PUBLIC_BACKEND_DEPLOY** → backend deploy (server / browser).
 */

export function getNextAPI(): string {
  return (process.env.NEXT_PUBLIC_API_DEPLOY || "").trim().replace(/\/$/, "");
}

/** `"/api"` hoặc `"http://host/api"` — Neon test ghép `/meetings`. */
export function getNextAPIRootForMeetings(): string {
  const next = getNextAPI();
  if (!next) return "/api";
  return `${next}/api`;
}

export function getDeployAPI(): string {
  if (typeof window !== "undefined") {
    return (
      process.env.NEXT_PUBLIC_BACKEND_DEPLOY ||
      process.env.NEXT_PUBLIC_API_BASE_URL ||
      process.env.API_DEPLOY ||
      ""
    )
      .trim()
      .replace(/\/$/, "");
  }
  return (
    process.env.API_DEPLOY ||
    process.env.NEXT_PUBLIC_BACKEND_DEPLOY ||
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    ""
  )
    .trim()
    .replace(/\/$/, "");
}
