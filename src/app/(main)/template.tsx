import { PageEaseIn } from "@/components/loading/PageEaseIn";

/**
 * Remount mỗi lần đổi route trong (main) — PageEaseIn cho mọi trang nhánh này.
 */
export default function MainTemplate({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <PageEaseIn className="flex min-h-0 flex-1 flex-col">{children}</PageEaseIn>
  );
}
