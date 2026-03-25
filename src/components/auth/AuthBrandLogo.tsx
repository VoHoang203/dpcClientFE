"use client";

import Image from "next/image";

export function AuthBrandLogo() {
  return (
    <div className="mb-4 flex justify-center">
      <div className="inline-flex items-center justify-center rounded-2xl bg-white/95 p-2 shadow-lg ring-2 ring-white/30">
        <Image
          src="/logo.png"
          alt="FPTU DPC2"
          width={200}
          height={64}
          className="h-14 w-auto max-h-16 max-w-[220px] object-contain"
          priority
        />
      </div>
    </div>
  );
}
