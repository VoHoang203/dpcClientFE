import Header from "@/components/Header";
import HomeTopCover from "@/components/main/HomeTopCover";
import MainExtras from "@/components/main/MainExtras";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative isolate flex min-h-dvh flex-col">
      {/* Nền toàn vùng main (không áp vào /workspace — layout workspace dùng bg-background che) */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/page-background.jpg')" }}
      />
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10 bg-linear-to-br from-background/88 via-background/68 to-background/78"
      />
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 bg-black/18" />
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10 shadow-[inset_0_0_120px_rgba(0,0,0,0.22)]"
      />
      <HomeTopCover />
      <Header />
      <div className="relative z-0 flex min-h-0 flex-1 flex-col">
        {children}
        <MainExtras />
      </div>
    </div>
  );
}
