import { neon } from "@neondatabase/serverless";
import { NextResponse } from "next/server";

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
export function neonErrorToResponse(error: unknown, fallback: string): NextResponse {
  const raw = error instanceof Error ? error.message : String(error);

  if (raw === "MISSING_DATABASE_URL" || raw.includes("MISSING_DATABASE_URL")) {
    return NextResponse.json(
      {
        message:
          "Thiếu DATABASE_URL. Thêm connection string Neon vào .env hoặc .env.local, rồi khởi động lại `npm run dev`.",
        hint: "Biến phải có trên server Next (không cần NEXT_PUBLIC_).",
      },
      { status: 500 }
    );
  }

  const missingTable =
    /does not exist|relation\s+"[^"]+"\s+does not exist|undefined table/i.test(
      raw
    );

  if (missingTable) {
    return NextResponse.json(
      {
        message: raw,
        hint:
          "Chưa tạo bảng trên Neon. Vào Neon Dashboard → SQL Editor → chọn đúng project/branch trùng với DATABASE_URL → dán và Run toàn bộ scripts/006-create-admission-tables.sql",
      },
      { status: 500 }
    );
  }

  return NextResponse.json({ message: raw || fallback }, { status: 500 });
}
