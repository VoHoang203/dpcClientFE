export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <div
        aria-hidden
        className="fixed inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/auth-bg.jpg')" }}
      />
      {/* Lớp phủ giúp chữ & form tách khỏi ảnh, vẫn thấy được họa tiết nền */}
      <div
        aria-hidden
        className="fixed inset-0 bg-linear-to-br from-background/75 via-background/55 to-background/80"
      />
      <div aria-hidden className="fixed inset-0 bg-black/25" />
      <div
        aria-hidden
        className="fixed inset-0 shadow-[inset_0_0_120px_rgba(0,0,0,0.35)]"
      />
      <div className="relative z-10 flex min-h-screen w-full items-center justify-center p-4 sm:p-6">
        {children}
      </div>
    </div>
  );
}
