import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { NextRequest, NextResponse } from "next/server";

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_EXT = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".webp",
  ".mp3",
  ".wav",
  ".ogg",
  ".m4a",
  ".aac",
  ".mp4",
  ".webm",
]);

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!file || !(file instanceof Blob)) {
      return NextResponse.json({ error: "Thiếu file" }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: "Mỗi file không được vượt quá 5MB" },
        { status: 400 }
      );
    }

    const nameIn = "name" in file && typeof (file as File).name === "string" ? (file as File).name : "upload.bin";
    const ext = path.extname(nameIn).toLowerCase();
    if (!ALLOWED_EXT.has(ext)) {
      return NextResponse.json(
        { error: "Chỉ chấp nhận ảnh, âm thanh hoặc video (jpg, png, webp, mp3, mp4, …)" },
        { status: 400 }
      );
    }

    const buf = Buffer.from(await file.arrayBuffer());
    const dir = path.join(process.cwd(), "public", "uploads", "handbooks");
    await mkdir(dir, { recursive: true });
    const safeName = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}${ext}`;
    const fp = path.join(dir, safeName);
    await writeFile(fp, buf);

    return NextResponse.json({ url: `/uploads/handbooks/${safeName}` });
  } catch (e) {
    console.error("handbook media upload:", e);
    return NextResponse.json({ error: "Tải file thất bại" }, { status: 500 });
  }
}
