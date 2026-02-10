"use client";

import { useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Header from "@/components/Header";
import HeroBanner from "@/components/HeroBanner";
import FeatureGrid from "@/components/FeatureGrid";
import QuickActions from "@/components/QuickActions";
import BottomNav from "@/components/BottomNav";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (!token) {
      toast.error("Vui lòng đăng nhập để tiếp tục");
      router.replace("/login");
    }
  }, [router]);

  return (
    <div className="relative min-h-screen pb-20 md:pb-6">
      <div className="fixed inset-0 -z-10">
        <Image
          src="/page-background.jpg"
          alt=""
          fill
          sizes="100vw"
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-background/8 backdrop-blur-sm" />
      </div>

      <Header />
      <main className="mx-auto max-w-7xl px-4 py-6">
        <HeroBanner />
        <FeatureGrid />
        <QuickActions />
      </main>
      <BottomNav />
    </div>
  );
}
