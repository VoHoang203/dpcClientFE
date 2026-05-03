import httpService from "@/lib/http";
import { normalizeAvatarDisplayUrl } from "@/lib/avatarUrl";
import { getDeployAPI } from "@/lib/apiEnv";
import { toastServiceErrorOnce } from "@/lib/serviceErrorToast";

/**
 * URL xem/tải file: `{getDeployAPI()}/documents/view/{filePath}`.
 * `filePath` là đường dẫn sau khi bỏ origin MinIO dev (`http(s)://localhost:9000`), ví dụ `party-documents/avatars/x.png`
 * (có hoặc không có `/` đầu đều được).
 * URL `http(s)://` khác (không phải localhost:9000) giữ nguyên để mở/tải trực tiếp.
 */
export function resolveFileAccessUrl(filePath: string): string | null {
  let p = String(filePath || "").trim();
  if (!p) return null;
  if (p.startsWith("data:")) return null;

  p = normalizeAvatarDisplayUrl(p);

  if (!p) return null;
  if (/^https?:\/\//i.test(p)) return p;

  const base = getDeployAPI().trim().replace(/\/$/, "");
  if (!base) return null;

  const safePath = p.replace(/^\/+/, "");
  return `${base}/documents/view/${safePath}`;
}

function parseFilenameFromContentDisposition(
  header: string | undefined,
): string | null {
  if (!header?.trim()) return null;
  const utf8 = /filename\*=(?:UTF-8'')?([^;\r\n]+)/i.exec(header);
  if (utf8?.[1]) {
    const raw = utf8[1].trim().replace(/^"+|"+$/g, "");
    try {
      return decodeURIComponent(raw);
    } catch {
      return raw;
    }
  }
  const ascii = /filename=(?:"([^"]+)"|([^;\r\n]+))/i.exec(header);
  const raw = ascii?.[1] ?? ascii?.[2];
  const t = raw?.trim();
  return t ? t.replace(/^"+|"+$/g, "") : null;
}

function pickDownloadFilename(
  filePath: string,
  contentDisposition: string | undefined,
  suggested?: string,
): string {
  const fromSuggest = suggested?.trim();
  if (fromSuggest) return fromSuggest;

  const fromHeader = parseFilenameFromContentDisposition(contentDisposition);
  if (fromHeader) return fromHeader;

  const segments = String(filePath).split("/").filter(Boolean);
  const last = segments[segments.length - 1];
  return last && last.length > 0 ? last : "tai-xuong";
}

export const fileService = {
  async uploadFile(file: File) {
    try {
      const formData = new FormData();
      formData.append("file", file);
      
      const response = await httpService.post<any>("/file/upload", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      
      return response.data;
    } catch (error: unknown) {
      toastServiceErrorOnce(error, { fallbackMessage: "Tải file thất bại." });
      throw error;
    }
  },

  /**
   * Mở file trên BE bằng tab mới.
   * - `filePath`: ví dụ `annual-assessments/2026/xxx.docx`
   * - URL: `{PUBLIC_BACKEND_DEPLOY}/documents/view/{filePath}`
   */
  openInNewTab(filePath: string) {
    if (typeof window === "undefined") return;
    const url = resolveFileAccessUrl(filePath);
    if (!url) return;
    window.open(url, "_blank", "noopener,noreferrer");
  },

  /**
   * Tải file về máy (blob qua axios + link download), cùng quy tắc URL với `openInNewTab`.
   * Dùng khi path đã bỏ origin (vd. avatar `/party-documents/...`) — gọi API qua `httpService` (Bearer).
   */
  async getFile(
    filePath: string,
    options?: { suggestedFilename?: string },
  ): Promise<void> {
    if (typeof window === "undefined") return;

    const url = resolveFileAccessUrl(filePath);
    if (!url) {
      toastServiceErrorOnce(new Error("Thiếu đường dẫn hoặc thiếu cấu hình API"), {
        fallbackMessage: "Không tải được file.",
      });
      return;
    }

    try {
      const response = await httpService.get<Blob>(url, {
        responseType: "blob",
      });

      const blob = response.data;
      const cd = response.headers["content-disposition"];
      const disposition =
        typeof cd === "string"
          ? cd
          : Array.isArray(cd)
            ? cd[0]
            : undefined;

      const filename = pickDownloadFilename(
        filePath,
        disposition,
        options?.suggestedFilename,
      );

      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = filename;
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(blobUrl);
    } catch (error: unknown) {
      toastServiceErrorOnce(error, { fallbackMessage: "Tải file thất bại." });
      throw error;
    }
  },
};
