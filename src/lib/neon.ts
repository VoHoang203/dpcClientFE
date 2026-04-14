import { neon } from "@neondatabase/serverless";

let sqlSingleton: ReturnType<typeof neon> | null = null;

/** Singleton — tránh gọi neon(undefined) lúc import. */
export function getNeon() {
  if (!sqlSingleton) {
    const url = process.env.DATABASE_URL?.trim();
    if (!url) {
      throw new Error("MISSING_DATABASE_URL");
    }
    sqlSingleton = neon(url);
  }
  return sqlSingleton;
}

/** Trả JSON 500 có hint khi thiếu env hoặc chưa chạy migration SQL. */
export function neonErrorToResponse(error: unknown, fallback: string): Response {
  const raw = error instanceof Error ? error.message : String(error);

  const json = (body: unknown, status = 500) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    });

  if (raw === "MISSING_DATABASE_URL" || raw.includes("MISSING_DATABASE_URL")) {
    return json({
      message:
        "Thiếu DATABASE_URL. Thêm connection string Neon vào .env hoặc .env.local, rồi khởi động lại `npm run dev`.",
      hint: "Biến phải có trên server (không cần NEXT_PUBLIC_).",
    });
  }

  const missingTable =
    /does not exist|relation\s+"[^"]+"\s+does not exist|undefined table/i.test(
      raw
    );

  if (missingTable) {
    return json({
      message: raw,
      hint:
        "Chưa tạo bảng trên Neon. Vào Neon Dashboard → SQL Editor → chọn đúng project/branch trùng với DATABASE_URL → dán và Run toàn bộ scripts/006-create-admission-tables.sql",
    });
  }

  return json({ message: raw || fallback });
}
