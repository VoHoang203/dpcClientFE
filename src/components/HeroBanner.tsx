import Image from "next/image";
import { ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const HeroBanner = () => {
  return (
    <section className="relative mx-4 mt-4 overflow-hidden rounded-2xl shadow-card">
      <div className="absolute inset-0">
        <Image
          src="/hero-banner.jpg"
          alt="Đảng Cộng sản Việt Nam"
          fill
          sizes="100vw"
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-linear-to-r from-primary/80 via-primary/60 to-transparent" />
      </div>

      <div className="relative z-10 px-6 py-8 text-primary-foreground md:py-12">
        <div className="max-w-md">
          <p className="mb-1 text-sm font-medium opacity-90">HỆ THỐNG QUẢN LÝ</p>
          <h1 className="mb-2 text-2xl font-bold leading-tight md:text-3xl">
            ĐẢNG VIÊN ĐIỆN TỬ
          </h1>
          <p className="mb-4 text-sm opacity-90 md:text-base">
            Quản lý thông tin, lịch họp và hoạt động đảng một cách hiệu quả
          </p>
          <Button
            variant="secondary"
            className="gap-1 font-medium shadow-lg transition-shadow hover:shadow-xl"
          >
            Xem chi tiết
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-1.5">
          <span className="h-2 w-6 rounded-full bg-primary-foreground" />
          <span className="h-2 w-2 rounded-full bg-primary-foreground/50" />
          <span className="h-2 w-2 rounded-full bg-primary-foreground/50" />
        </div>
      </div>
    </section>
  );
};

export default HeroBanner;
