/**
 * - **NEXT_PUBLIC_API_DEPLOY** → Next.js (`/api/...`). Trống = same-origin `/api/...`.
 * - **API_DEPLOY** → chỉ dùng được **trên server** Next (API routes, SSR). Không có trong bundle browser.
 * - **NEXT_PUBLIC_BACKEND_DEPLOY** (hoặc **NEXT_PUBLIC_API_BASE_URL**) → URL backend cho axios **trên trình duyệt**.
 *   Deploy production: phải set biến NEXT_PUBLIC_* trên hosting và **build lại**; chỉ set API_DEPLOY sẽ khiến client gọi sai URL.
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
