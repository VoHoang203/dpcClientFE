export default function ClassificationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="flex min-h-0 flex-1 flex-col">{children}</div>;
}
