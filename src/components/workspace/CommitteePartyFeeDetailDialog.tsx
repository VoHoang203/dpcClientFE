"use client";

import { useState, type ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { partyFeeService, isPartyFeePaidStatus, type PartyFeeRecord } from "@/services/partyFeeService";
import { toast } from "@/hooks/use-toast";
import { formatVnDate } from "@/lib/formatVnDate";

function genderLabel(g: string | null): string {
  if (!g) return "—";
  const u = g.toUpperCase();
  if (u === "MALE" || u === "NAM") return "Nam";
  if (u === "FEMALE" || u === "NU" || u === "NỮ") return "Nữ";
  return g;
}

function feeStatusLabel(status: string): { text: string; className: string } {
  const s = status.toUpperCase();
  if (s === "PAID" || s === "COMPLETED" || s === "DONE") {
    return { text: "Đã đóng", className: "bg-emerald-700 text-white" };
  }
  if (s === "PENDING" || s === "UNPAID") {
    return { text: "Chưa đóng", className: "bg-amber-600 text-white" };
  }
  return { text: status || "—", className: "bg-secondary text-secondary-foreground" };
}

type Props = {
  record: PartyFeeRecord | null;
  open: boolean;
  onClose: () => void;
  onRefresh?: () => void;
};

export default function CommitteePartyFeeDetailDialog({
  record,
  open,
  onClose,
  onRefresh,
}: Props) {
  const [confirming, setConfirming] = useState(false);

  if (!record) return null;
  const m = record.member;

  async function handleConfirm() {
    if (!record) return;
    setConfirming(true);
    try {
      const paymentDate = new Date().toISOString();
      await partyFeeService.confirm(record.id, paymentDate);
      toast({
        title: "Thành công",
        description: "Đã xác nhận đóng đảng phí.",
      });
      onRefresh?.();
      onClose();
    } catch (e: any) {
      toast({
        title: "Lỗi",
        description: e?.response?.data?.message || e?.message || "Lỗi khi xác nhận đóng đảng phí.",
        variant: "destructive",
      });
    } finally {
      setConfirming(false);
    }
  }

  const isPaid = isPartyFeePaidStatus(record.status);

  const row = (label: string, value: ReactNode) => (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-3">
      <span className="min-w-32 text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );

  const st = feeStatusLabel(record.status);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Chi tiết đảng phí</DialogTitle>
          <DialogDescription>
            Tháng {record.month}/{record.year}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {row("Họ và tên", m?.fullName?.trim() || "—")}
          {row("Ngày sinh", formatVnDate(m?.dob ?? null))}
          {row("Giới tính", genderLabel(m?.gender ?? null))}
          {row("Điện thoại", m?.phone?.trim() || "—")}
          <Separator />
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-sm text-muted-foreground">Trạng thái đóng phí</span>
            <Badge className={st.className}>{st.text}</Badge>
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-3">
          <Button variant="outline" onClick={onClose} disabled={confirming}>
            Đóng
          </Button>
          {!isPaid && (
            <Button onClick={handleConfirm} disabled={confirming}>
              {confirming ? "Đang xử lý..." : "Xác nhận đã đóng"}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
