import Header from "@/components/Header";
import HomeTopCover from "@/components/main/HomeTopCover";
import MainBackgroundDecor from "@/components/main/MainBackgroundDecor";
import MainContentShell from "@/components/main/MainContentShell";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative isolate flex min-h-dvh flex-col">
      <MainBackgroundDecor />
      <HomeTopCover />
      <Header />
      <MainContentShell>{children}</MainContentShell>
    </div>
  );
}
