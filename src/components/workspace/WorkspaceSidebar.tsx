"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CreditCard,
  Award,
  Users,
  Clock,
  Calendar,
  UserCheck,
  FileText,
  Activity,
  ClipboardList,
  Briefcase,
  ChevronLeft,
  FolderOpen,
  BookOpen,
  Upload,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { UserRole } from "@/types/roles";
import { Button } from "@/components/ui/button";

interface WorkspaceSidebarProps {
  role: UserRole;
  collapsed?: boolean;
  onToggle?: () => void;
}

interface MenuItem {
  icon: React.ElementType;
  label: string;
  href: string;
  description?: string;
}

const getMenuByRole = (role: UserRole): MenuItem[] => {
  const commonMemberItems: MenuItem[] = [
    {
      icon: ClipboardList,
      label: "Tự đánh giá",
      href: "/workspace/self-assessment",
      description: "Kiểm điểm bản thân",
    },
    {
      icon: CreditCard,
      label: "Đảng phí",
      href: "/workspace/party-fees-history",
      description: "Quản lý đảng phí",
    },
  ];

  switch (role) {
    case "PARTY_MEMBER":
      return [
        ...commonMemberItems,
        {
          icon: FolderOpen,
          label: "Tiến trình kết nạp",
          href: "/workspace/admission-progress",
          description: "Đã hoàn thành",
        },
      ];

    case "OUTSTANDING_INDIVIDUAL":
      return [
        {
          icon: FileText,
          label: "Xin làm Đảng viên",
          href: "/workspace/admission-application",
          description: "Nộp hồ sơ kết nạp",
        },
        {
          icon: FolderOpen,
          label: "Tiến trình kết nạp",
          href: "/workspace/admission-progress",
          description: "Tiến độ kết nạp",
        },
      ];

    case "COMMITTEE":
      return [
        ...commonMemberItems,
        {
          icon: Users,
          label: "Quản lý tài khoản",
          href: "/workspace/account-management",
          description: "ĐV/QCUT",
        },
        {
          icon: Clock,
          label: "Chờ sơ duyệt",
          href: "/workspace/pending-review",
          description: "Hồ sơ chờ duyệt",
        },
        {
          icon: Award,
          label: "Xếp loại ĐV",
          href: "/workspace/classification",
          description: "Đánh giá đảng viên",
        },
        {
          icon: Calendar,
          label: "Sắp lịch họp",
          href: "/workspace/schedule-meeting",
          description: "Lên lịch cuộc họp",
        },
        {
          icon: UserCheck,
          label: "Điểm danh offline",
          href: "/workspace/offline-attendance",
          description: "Điểm danh tại chỗ",
        },
        {
          icon: BookOpen,
          label: "Quản lý Sổ tay",
          href: "/workspace/handbook-management",
          description: "Tạo/sửa sổ tay",
        },
      ];

    case "DEPUTY_SECRETARY":
      return [
        ...commonMemberItems,
        {
          icon: Clock,
          label: "Chờ duyệt",
          href: "/workspace/pending-review",
          description: "Hồ sơ chờ duyệt",
        },
      ];

    case "SECRETARY":
      return [
        ...commonMemberItems,
        {
          icon: Clock,
          label: "Chờ duyệt",
          href: "/workspace/pending-review",
          description: "Nghị quyết chờ duyệt",
        },
      ];

    case "ADMIN":
      return [
        {
          icon: Users,
          label: "Quản lý tài khoản",
          href: "/workspace/account-management",
          description: "Tất cả role",
        },
        {
          icon: Activity,
          label: "Log hệ thống",
          href: "/workspace/system-logs",
          description: "Theo dõi hoạt động",
        },
        {
          icon: Upload,
          label: "Tài liệu AI",
          href: "/workspace/ai-documents",
          description: "Upload tài liệu cho AI",
        },
      ];

    default:
      return commonMemberItems;
  }
};

const WorkspaceSidebar = ({
  role,
  collapsed = false,
  onToggle,
}: WorkspaceSidebarProps) => {
  const pathname = usePathname();
  const menuItems = getMenuByRole(role);

  return (
    <aside
      className={cn(
        "flex flex-col border-r border-border bg-card transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}
    >
      <div className="flex h-16 items-center justify-between border-b border-border px-4">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-primary" />
            <span className="font-semibold text-foreground">Khu vực làm việc</span>
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggle}
          className={cn(collapsed && "mx-auto")}
        >
          <ChevronLeft
            className={cn("h-4 w-4 transition-transform", collapsed && "rotate-180")}
          />
        </Button>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-2">
        {menuItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <item.icon className={cn("h-5 w-5 shrink-0", collapsed && "mx-auto")} />
              {!collapsed && (
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{item.label}</p>
                  {item.description && (
                    <p
                      className={cn(
                        "truncate text-xs",
                        isActive
                          ? "text-primary-foreground/70"
                          : "text-muted-foreground"
                      )}
                    >
                      {item.description}
                    </p>
                  )}
                </div>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border p-2">
        <Link
          href="/"
          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <ChevronLeft className={cn("h-5 w-5 shrink-0", collapsed && "mx-auto")} />
          {!collapsed && <span className="text-sm">Về trang chủ</span>}
        </Link>
      </div>
    </aside>
  );
};

export default WorkspaceSidebar;
