"use client";

import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";

function FooterCol({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("min-w-0", className)}>
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <div className="mt-3 space-y-2 text-sm text-muted-foreground">{children}</div>
    </div>
  );
}

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="block w-fit transition-colors hover:text-foreground">
      {children}
    </Link>
  );
}

export default function MainFooter() {
  return (
    <footer className="hidden w-full md:block">
      {/* pt-14 thay cho margin: phần cách nội dung nằm trong vùng có nền — tránh lộ page-background */}
      <div className="border-t border-border/60 bg-card/80 pt-14 backdrop-blur-sm">
        <div className="mx-auto grid max-w-7xl gap-8 px-6 py-10 lg:grid-cols-[1.2fr_2fr]">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-2xl font-bold tracking-tight text-foreground">
              <Image
                src="/logo.png"
                alt="FPTU DPC2"
                width={32}
                height={32}
                className="h-8 w-8 rounded-md object-contain"
              />
              <span>FPTU DPC2</span>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              © {new Date().getFullYear()} — DPC2. Nội dung và tài liệu phục vụ học tập.
            </p>
            <p className="mt-3 text-sm text-muted-foreground">
              Hotline: <span className="font-medium text-foreground">024 7300 7300</span>
            </p>
            <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
              <span>Một sản phẩm của</span>
              <Image
                src="/Logo_FPT_Education.png"
                alt="FPT"
                width={88}
                height={50}
                className=" w-auto object-contain"
              />
            </div>
          </div>

          <div className="grid gap-7 sm:grid-cols-3">
            <FooterCol title="Kinh doanh">
              <FooterLink href="#">Chuyển đổi số</FooterLink>
              <FooterLink href="#">Made by FPT</FooterLink>
            </FooterCol>
            <FooterCol title="Công nghệ">
              <FooterLink href="#">Góc nhìn</FooterLink>
              <FooterLink href="#">Đời sống</FooterLink>
              <FooterLink href="#">Podcast</FooterLink>
            </FooterCol>
            <FooterCol title="Người FPT">
              <FooterLink href="#">Văn hóa</FooterLink>
              <FooterLink href="#">WikiFPT</FooterLink>
              <FooterLink href="#">CSR</FooterLink>
            </FooterCol>
          </div>
        </div>
      </div>
    </footer>
  );
}

