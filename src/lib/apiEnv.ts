/**
 * - **PUBLIC_BACKEND_DEPLOY** → URL backend (duy nhất). Ví dụ `http://localhost:5000`.
 * - Được map trong `next.config.mjs` (`env`) để có trong bundle client (axios).
 */

export function getDeployAPI(): string {
  return (process.env.PUBLIC_BACKEND_DEPLOY || "").trim().replace(/\/$/, "");
}
