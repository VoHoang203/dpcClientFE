export default function PendingReviewLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="flex min-h-0 flex-1 flex-col">{children}</div>;
}
