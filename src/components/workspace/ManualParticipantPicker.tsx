"use client";

import { Loader2, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { CommitteeMember } from "@/services/committeeService";
import {
  committeeMemberParticipantId,
  memberDisplayName,
} from "@/services/committeeService";

type Props = {
  members: CommitteeMember[];
  loading: boolean;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedIds: string[];
  onAdd: (member: CommitteeMember) => void;
  onRemove: (id: string) => void;
};

export function ManualParticipantPicker({
  members,
  loading,
  searchQuery,
  onSearchChange,
  selectedIds,
  onAdd,
  onRemove,
}: Props) {
  const selectedSet = new Set(selectedIds);

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label htmlFor="participant-search">Tìm theo tên / email / tài khoản</Label>
        <Input
          id="participant-search"
          placeholder="Gõ để lọc danh sách…"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Đang tải danh sách…
        </div>
      ) : (
        <ScrollArea className="h-[220px] rounded-md border border-border bg-muted/20 p-2">
          <ul className="space-y-1">
            {members.map((m) => {
              const taken = selectedSet.has(m.id);
              return (
                <li key={m.id}>
                  <button
                    type="button"
                    disabled={taken}
                    onClick={() => onAdd(m)}
                    className="flex w-full items-center justify-between rounded-md px-2 py-2 text-left text-sm transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <span className="font-medium">{memberDisplayName(m)}</span>
                    <span className="truncate text-xs text-muted-foreground">
                      {m.email}
                    </span>
                  </button>
                </li>
              );
            })}
            {members.length === 0 && (
              <li className="px-2 py-6 text-center text-sm text-muted-foreground">
                Không có người phù hợp. Thử từ khóa khác.
              </li>
            )}
          </ul>
        </ScrollArea>
      )}

      {selectedIds.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Đã chọn</p>
          <div className="flex flex-wrap gap-2">
            {selectedIds.map((id) => {
              const m = members.find(
                (x) => committeeMemberParticipantId(x) === id
              );
              const label = m ? memberDisplayName(m) : id.slice(0, 8);
              return (
                <Badge key={id} variant="secondary" className="gap-1 pr-1">
                  {label}
                  <button
                    type="button"
                    className="rounded-full p-0.5 hover:bg-muted-foreground/20"
                    onClick={() => onRemove(id)}
                    aria-label={`Bỏ ${label}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
