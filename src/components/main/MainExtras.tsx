"use client";

import { usePathname } from "next/navigation";
import MainFooter from "@/components/main/MainFooter";
import BackToTopButton from "@/components/main/BackToTopButton";

export default function MainExtras() {
  const pathname = usePathname();
  const isWorkspace = pathname.startsWith("/workspace");
  if (isWorkspace) return null;

  return (
    <>
      <MainFooter />
      <BackToTopButton />
    </>
  );
}

