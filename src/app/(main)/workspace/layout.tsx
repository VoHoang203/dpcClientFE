"use client";

import { useEffect, useState, Suspense, useLayoutEffect } from "react";
import WorkspaceSidebar from "@/components/workspace/WorkspaceSidebar";
import WorkspaceContentSkeleton from "@/components/workspace/WorkspaceContentSkeleton";
import Header from "@/components/Header";
import { mockCurrentUser, type UserRole } from "@/types/roles";
import { Skeleton } from "@/components/ui/skeleton";

// Sidebar skeleton component
function SidebarSkeleton() {
  return (
    <aside className="flex h-full w-64 flex-col border-r border-border bg-card">
      <div className="flex items-center justify-between border-b border-border p-4">
        <div className="flex items-center gap-2">
          <Skeleton className="h-6 w-6" />
          <Skeleton className="h-5 w-28" />
        </div>
        <Skeleton className="h-6 w-6" />
      </div>
      <nav className="flex-1 space-y-1 p-2">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 rounded-lg px-3 py-2.5">
            <Skeleton className="h-5 w-5 shrink-0" />
            <div className="flex-1 space-y-1">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-32" />
            </div>
          </div>
        ))}
      </nav>
      <div className="border-t border-border p-2">
        <div className="flex items-center gap-3 px-3 py-2.5">
          <Skeleton className="h-5 w-5" />
          <Skeleton className="h-4 w-20" />
        </div>
      </div>
    </aside>
  );
}

export default function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [mounted, setMounted] = useState(false);

  // Use useLayoutEffect to load role synchronously before paint
  useLayoutEffect(() => {
    const storedUser = localStorage.getItem("currentUser");
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser) as { role?: UserRole };
        if (parsed.role) {
          setUserRole(parsed.role);
        } else {
          setUserRole(mockCurrentUser.role);
        }
      } catch {
        setUserRole(mockCurrentUser.role);
      }
    } else {
      setUserRole(mockCurrentUser.role);
    }
    setMounted(true);
  }, []);

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      <Header />
      <div className="flex min-h-0 w-full flex-1">
        {userRole ? (
          <WorkspaceSidebar
            role={userRole}
            collapsed={sidebarCollapsed}
            onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
          />
        ) : (
          <SidebarSkeleton />
        )}
        <main className="flex-1 overflow-y-auto">
          {mounted ? (
            <Suspense fallback={<WorkspaceContentSkeleton />}>
              {children}
            </Suspense>
          ) : (
            <WorkspaceContentSkeleton />
          )}
        </main>
      </div>
    </div>
  );
}
