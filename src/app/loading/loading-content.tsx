import { BrandLoadingIndicator } from "@/components/loading/BrandLoadingIndicator";

/** Route `/loading` — preview UI; overlay khi tải nặng dùng `PendingLoadingOverlay` + `useTransition`. */
export default function LoadingPreviewContent() {
  return <BrandLoadingIndicator layout="full" label="Đang tải…" />;
}
