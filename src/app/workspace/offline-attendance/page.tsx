"use client";

export default function OfflineAttendancePage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Client - Điểm danh offline</h1>
      <p className="text-sm text-zinc-500">
        Route: /workspace/offline-attendance
      </p>
      <div className="flex items-center justify-center">
        <div className="flex h-40 w-40 items-center justify-center rounded-md border border-dashed border-zinc-400 text-xs text-zinc-500">
          QR CODE PLACEHOLDER
        </div>
      </div>
    </div>
  );
}
