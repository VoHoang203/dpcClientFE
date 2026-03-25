import Header from "@/components/Header";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen min-h-dvh flex-col bg-background">
      <Header />
      <div className="flex min-h-0 flex-1 flex-col">{children}</div>
    </div>
  );
}
