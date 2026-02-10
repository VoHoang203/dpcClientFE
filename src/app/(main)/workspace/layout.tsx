"use client";

import { useEffect, useState } from "react";
import WorkspaceSidebar from "@/components/workspace/WorkspaceSidebar";
import Header from "@/components/Header";
import { mockCurrentUser, type UserRole } from "@/types/roles";

export default function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [userRole, setUserRole] = useState<UserRole>(mockCurrentUser.role);

  useEffect(() => {
    const storedUser = localStorage.getItem("currentUser");
    if (!storedUser) return;
    try {
      const parsed = JSON.parse(storedUser) as { role?: UserRole };
      if (parsed.role) {
        setUserRole(parsed.role);
      }
    } catch {
      setUserRole(mockCurrentUser.role);
    }
  }, []);

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      <Header />
      <div className="flex min-h-0 w-full flex-1">
        <WorkspaceSidebar
          role={userRole}
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
