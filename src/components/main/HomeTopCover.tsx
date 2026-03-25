"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";

export default function HomeTopCover() {
  const pathname = usePathname();
  if (pathname !== "/") return null;

  return (
    <section className="w-full">
      <div className="relative h-[92px] w-full overflow-hidden border-b border-border/60 bg-card/40 sm:h-[110px] md:h-[140px] lg:h-[170px]">
        <Image
          src="/cover-desktop.jpg"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover object-center"
        />
        <div aria-hidden className="absolute inset-0 bg-black/20" />
        <div
          aria-hidden
          className="absolute inset-x-0 bottom-0 h-10 bg-linear-to-t from-background/70 to-transparent"
        />
      </div>
    </section>
  );
}

