/**
 * Tách `/loading` khỏi nền / layout của các nhóm route khác — chỉ nền theme.
 */
export default function LoadingRouteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative isolate min-h-dvh w-full bg-background text-foreground">
      {children}
    </div>
  );
}
