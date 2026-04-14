import httpService from "@/lib/http";
import { getDeployAPI } from "@/lib/apiEnv";
import { toastServiceErrorOnce } from "@/lib/serviceErrorToast";

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
    const p = String(filePath || "").trim();
    if (!p) return;

    // Nếu BE trả full URL thì mở thẳng.
    if (/^https?:\/\//i.test(p)) {
      window.open(p, "_blank", "noopener,noreferrer");
      return;
    }

    const base = getDeployAPI().trim().replace(/\/$/, "");
    const viewBase = `${base}/documents/view`;
    const safePath = p.replace(/^\/+/, "");
    const url = `${viewBase}/${safePath}`;
    window.open(url, "_blank", "noopener,noreferrer");
  },
};
