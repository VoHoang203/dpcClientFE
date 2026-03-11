"use client";

import { Skeleton } from "@/components/ui/skeleton";

export default function WorkspaceContentSkeleton() {
  return (
    <div className="p-6 space-y-6">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-72" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>

      {/* Tabs skeleton */}
      <div className="flex gap-2">
        <Skeleton className="h-10 w-24" />
        <Skeleton className="h-10 w-24" />
      </div>

      {/* Filters skeleton */}
      <div className="flex gap-4 flex-wrap">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-10 w-40" />
        <Skeleton className="h-10 w-40" />
      </div>

      {/* Table skeleton */}
      <div className="border rounded-lg">
        <div className="p-4 border-b">
          <div className="flex gap-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-4 flex-1" />
            ))}
          </div>
        </div>
        {[1, 2, 3, 4, 5].map((row) => (
          <div key={row} className="p-4 border-b last:border-0">
            <div className="flex gap-4 items-center">
              {[1, 2, 3, 4, 5].map((col) => (
                <Skeleton key={col} className="h-4 flex-1" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
