import type { Metadata } from "next";

/** Metadata route `/loading` (preview). Loading thật khi tác vụ nặng: `PendingLoadingOverlay` + `useTransition` / `useTransitionLoading`. */
export const loadingPageMetadata: Metadata = {
  title: "Đang tải — FPTU DPC2",
  robots: { index: false, follow: false },
};
