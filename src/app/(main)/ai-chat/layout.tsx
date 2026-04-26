"use client";


export default function AiChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
      <div className="flex min-h-screen bg-[#f8f8fb] text-[#1f2937]">
        {children}
      </div>
  );
}