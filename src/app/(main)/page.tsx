"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
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
    <div className="relative min-h-0 flex-1 pb-20 md:pb-6">
      <main className="mx-auto max-w-7xl px-4 py-6">
        <HeroBanner />
        <FeatureGrid />
        <QuickActions />
      </main>
      <BottomNav />
    </div>
  );
}
