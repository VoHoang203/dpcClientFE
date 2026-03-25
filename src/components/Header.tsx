"use client";

import { useMemo } from "react";
import { ChevronDown, User, LogOut, Briefcase } from "lucide-react";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { buttonVariants } from "@/components/ui/button";
import NotificationDropdown from "@/components/NotificationDropdown";
import { useAuth } from "@/contexts/AuthContext";
import { formatRoleOrPositionLabel } from "@/types/roles";

function initialsFromName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "—";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  const first = parts[0][0] ?? "";
  const last = parts[parts.length - 1][0] ?? "";
  return (first + last).toUpperCase();
}

const Header = () => {
  const { user, isReady: ready, logout } = useAuth();

  const displayName = user?.fullName?.trim() || user?.username || "Tài khoản";
  const subtitle = useMemo(() => {
    if (!user) return "";
    if (user.position.trim()) return formatRoleOrPositionLabel(user.position);
    return formatRoleOrPositionLabel(user.role);
  }, [user]);

  const initials = useMemo(
    () => initialsFromName(displayName === "Tài khoản" ? "" : displayName),
    [displayName]
  );

  return (
    <header className="sticky top-0 z-50 w-full shrink-0 border-b border-border bg-card/95 shadow-sm backdrop-blur-md">
      <div className="container flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <Link href="/" className="text-lg font-bold text-primary">
            FPTU DPC2
          </Link>
        </div>

        <div className="flex items-center gap-2">
          <NotificationDropdown />

          <DropdownMenu>
            <DropdownMenuTrigger
              className={buttonVariants({
                variant: "ghost",
                className: "flex items-center gap-2 p-1.5",
              })}
              type="button"
            >
              <Avatar className="h-8 w-8 ring-2 ring-primary/20">
                <AvatarImage src="" alt="" />
                <AvatarFallback className="bg-primary text-sm font-medium text-primary-foreground">
                  {!ready ? "…" : initials}
                </AvatarFallback>
              </Avatar>
              <ChevronDown className="hidden h-4 w-4 text-muted-foreground sm:block" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="border-b border-border px-3 py-2">
                <p className="font-medium text-foreground">
                  {!ready ? "Đang tải…" : displayName}
                </p>
                <p className="text-sm text-muted-foreground">
                  {ready && subtitle ? subtitle : ready ? "—" : ""}
                </p>
              </div>
              <DropdownMenuItem className="cursor-pointer gap-2" asChild>
                <Link href="/profile">
                  <User className="h-4 w-4" />
                  Thông tin cá nhân
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer gap-2" asChild>
                <Link href="/workspace">
                  <Briefcase className="h-4 w-4" />
                  Khu vực làm việc
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="cursor-pointer gap-2 text-destructive focus:text-destructive"
                onSelect={(e) => {
                  e.preventDefault();
                  void logout();
                }}
              >
                <LogOut className="h-4 w-4" />
                Đăng xuất
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};

export default Header;
