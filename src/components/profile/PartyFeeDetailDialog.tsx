import { CheckCircle2, Clock, AlertCircle, Receipt, Calendar, User, CreditCard, FileText } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";

interface FeeItem {
  id: string;
  month: string;
  amount: string;
  status: string;
  paidDate?: string;
  dueDate?: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  fee: FeeItem | null;
}

const statusConfig: Record<
  string,
  { label: string; icon: React.ElementType; badgeClass: string; color: string }
> = {
  paid: {
    label: "Đã đóng",
    icon: CheckCircle2,
    badgeClass: "bg-green-100 text-green-800",
    color: "text-green-600",
  },
  pending: {
    label: "Chờ đóng",
    icon: Clock,
    badgeClass: "bg-yellow-100 text-yellow-800",
    color: "text-yellow-600",
  },
  overdue: {
    label: "Quá hạn",
    icon: AlertCircle,
    badgeClass: "bg-red-100 text-red-800",
    color: "text-red-600",
  },
};

const PartyFeeDetailDialog = ({ open, onClose, fee }: Props) => {
  if (!fee) return null;

  const config = statusConfig[fee.status] || statusConfig.pending;
  const StatusIcon = config.icon;

  const detail = {
    collector: "Nguyễn Văn Bình",
    method: fee.status === "paid" ? "Chuyển khoản" : "—",
    receiptNo:
      fee.status === "paid" ? `BP-2024-${fee.id.padStart(4, "0")}` : "—",
    note:
      fee.status === "paid"
        ? "Đã xác nhận bởi thủ quỹ chi bộ"
        : fee.status === "overdue"
          ? "Vui lòng đóng sớm để tránh bị nhắc nhở"
          : "Chờ xác nhận thanh toán",
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-primary" />
            Chi tiết đảng phí
          </DialogTitle>
          <DialogDescription>{fee.month}</DialogDescription>
        </DialogHeader>

        <div
          className={`flex items-center gap-3 rounded-lg p-4 ${
            fee.status === "paid"
              ? "bg-green-50"
              : fee.status === "overdue"
                ? "bg-red-50"
                : "bg-yellow-50"
          }`}
        >
          <div
            className={`rounded-full p-2 ${
              fee.status === "paid"
                ? "bg-green-100"
                : fee.status === "overdue"
                  ? "bg-red-100"
                  : "bg-yellow-100"
            }`}
          >
            <StatusIcon className={`h-5 w-5 ${config.color}`} />
          </div>
          <div className="flex-1">
            <Badge className={config.badgeClass}>{config.label}</Badge>
            <p className="mt-1 text-sm text-muted-foreground">
              {fee.status === "paid"
                ? `Đóng ngày ${fee.paidDate}`
                : `Hạn đóng: ${fee.dueDate || "—"}`}
            </p>
          </div>
          <p className="text-xl font-bold text-foreground">{fee.amount}đ</p>
        </div>

        <Separator />

        <div className="space-y-3">
          <DetailRow icon={Calendar} label="Kỳ đóng" value={fee.month} />
          <DetailRow icon={CreditCard} label="Số tiền" value={`${fee.amount}đ`} />
          <DetailRow icon={User} label="Người thu" value={detail.collector} />
          <DetailRow icon={CreditCard} label="Hình thức" value={detail.method} />
          <DetailRow icon={FileText} label="Số biên lai" value={detail.receiptNo} />
        </div>

        <Separator />

        <div className="rounded-lg bg-muted/50 p-3">
          <p className="mb-1 text-xs font-medium text-muted-foreground">
            Ghi chú
          </p>
          <p className="text-sm">{detail.note}</p>
        </div>

        {fee.status !== "paid" && <Button className="w-full">Đóng ngay</Button>}
      </DialogContent>
    </Dialog>
  );
};

const DetailRow = ({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) => (
  <div className="flex items-center justify-between">
    <span className="flex items-center gap-2 text-sm text-muted-foreground">
      <Icon className="h-4 w-4" />
      {label}
    </span>
    <span className="text-sm font-medium">{value}</span>
  </div>
);

export default PartyFeeDetailDialog;
