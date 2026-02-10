export default function CalendarLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <section className="min-h-screen p-6">{children}</section>;
}
