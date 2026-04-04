import axios from "axios";

/** Base tải file meeting — không dùng Bearer (theo yêu cầu BE). */
export const MEETING_DOCUMENT_VIEW_BASE =
  "http://160.25.81.143:3000/documents/view/";

export function buildMeetingDocumentViewUrl(fileUrl: string): string {
  const path = fileUrl.replace(/^\//, "");
  return `${MEETING_DOCUMENT_VIEW_BASE}${path}`;
}

/**
 * Tải file (PDF/DOC…) về máy — axios GET blob, không qua httpService.
 */
export async function downloadMeetingDocumentFile(
  fileUrl: string,
  suggestedFileName?: string
): Promise<void> {
  const url = buildMeetingDocumentViewUrl(fileUrl);
  const res = await axios.get(url, { responseType: "blob" });
  const blob = res.data as Blob;
  const fromPath =
    fileUrl.split("/").pop()?.split("?")[0] || "tai-lieu";
  const name = suggestedFileName || fromPath;
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = objectUrl;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(objectUrl);
}
