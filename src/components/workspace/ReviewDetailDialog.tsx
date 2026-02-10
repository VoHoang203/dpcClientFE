import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  CheckCircle2,
  Circle,
  Clock,
  FileText,
  MapPin,
  Calendar,
  Phone,
  AlertTriangle,
  Send,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export interface AdmissionApplication {
  id: string;
  applicantName: string;
  dob: string;
  phone: string;
  address: string;
  submittedAt: string;
  currentStage: number;
  status: "pending" | "reviewing" | "approved" | "rejected";
  priority: "high" | "normal" | "low";
  documents: { name: string; submitted: boolean }[];
  comments: { author: string; content: string; date: string }[];
}

const STAGES = [
  { label: "Sơ duyệt hồ sơ", description: "Chi ủy kiểm tra hồ sơ QCUT" },
  {
    label: "Xác minh & dấu đỏ",
    description: "Phó Bí thư xác minh, chốt dấu đỏ",
  },
  { label: "Soạn nghị quyết", description: "Chi ủy soạn nghị quyết kết nạp" },
  { label: "Hoàn thành", description: "Bí thư phê duyệt nghị quyết" },
];

interface ReviewDetailDialogProps {
  application: AdmissionApplication | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ReviewDetailDialog = ({
  application,
  open,
  onOpenChange,
}: ReviewDetailDialogProps) => {
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!application) return null;

  const handleApproveStage = () => {
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      toast.success("Đã duyệt giai đoạn hiện tại");
      onOpenChange(false);
    }, 800);
  };

  const handleReject = () => {
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      toast.error("Đã từ chối hồ sơ");
      onOpenChange(false);
    }, 800);
  };

  const handleAddComment = () => {
    if (!comment.trim()) return;
    toast.success("Đã thêm nhận xét");
    setComment("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <FileText className="h-5 w-5 text-primary" />
            Hồ sơ kết nạp Đảng
          </DialogTitle>
        </DialogHeader>

        <div className="flex items-start gap-4 p-4 rounded-lg bg-muted/50">
          <Avatar className="h-14 w-14">
            <AvatarFallback className="bg-primary/10 text-primary text-lg font-bold">
              {application.applicantName.charAt(0)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 space-y-1">
            <h3 className="font-semibold text-foreground text-base">
              {application.applicantName}
            </h3>
            <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" /> {application.dob}
              </span>
              <span className="flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5" /> {application.phone}
              </span>
              <span className="flex items-center gap-1.5 col-span-2">
                <MapPin className="h-3.5 w-3.5" /> {application.address}
              </span>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            {application.priority === "high" && (
              <Badge className="text-xs bg-destructive text-destructive-foreground">
                Ưu tiên
              </Badge>
            )}
            <Badge variant="secondary" className="text-xs">
              <Clock className="h-3 w-3 mr-1" />
              {application.submittedAt}
            </Badge>
          </div>
        </div>

        <div>
          <h4 className="font-semibold text-sm text-foreground mb-3">
            Tiến trình xử lý
          </h4>
          <div className="space-y-0">
            {STAGES.map((stage, idx) => {
              const isCompleted = idx < application.currentStage;
              const isCurrent = idx === application.currentStage;
              const isPending = idx > application.currentStage;

              return (
                <div key={stage.label} className="flex items-start gap-3">
                  <div className="flex flex-col items-center">
                    <div
                      className={cn(
                        "h-7 w-7 rounded-full flex items-center justify-center border-2 transition-colors",
                        isCompleted && "bg-green-500 border-green-500 text-white",
                        isCurrent &&
                          "bg-primary border-primary text-primary-foreground",
                        isPending && "bg-muted border-border text-muted-foreground"
                      )}
                    >
                      {isCompleted ? (
                        <CheckCircle2 className="h-4 w-4" />
                      ) : isCurrent ? (
                        <Clock className="h-4 w-4" />
                      ) : (
                        <Circle className="h-3.5 w-3.5" />
                      )}
                    </div>
                    {idx < STAGES.length - 1 && (
                      <div
                        className={cn(
                          "w-0.5 h-8",
                          isCompleted ? "bg-green-500" : "bg-border"
                        )}
                      />
                    )}
                  </div>
                  <div
                    className={cn(
                      "pb-6",
                      idx === STAGES.length - 1 && "pb-0"
                    )}
                  >
                    <p
                      className={cn(
                        "font-medium text-sm",
                        isCurrent
                          ? "text-primary"
                          : isCompleted
                            ? "text-foreground"
                            : "text-muted-foreground"
                      )}
                    >
                      {stage.label}
                      {isCurrent && (
                        <ChevronRight className="inline h-4 w-4 ml-1 text-primary animate-pulse" />
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {stage.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <Separator />

        <div>
          <h4 className="font-semibold text-sm text-foreground mb-3">
            Hồ sơ đã nộp
          </h4>
          <div className="grid grid-cols-2 gap-2">
            {application.documents.map((doc) => (
              <div
                key={doc.name}
                className={cn(
                  "flex items-center gap-2 p-2.5 rounded-lg border text-sm",
                  doc.submitted
                    ? "border-green-200 bg-green-50 text-green-800"
                    : "border-destructive/30 bg-destructive/5 text-destructive"
                )}
              >
                {doc.submitted ? (
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                ) : (
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                )}
                <span className="truncate">{doc.name}</span>
              </div>
            ))}
          </div>
        </div>

        <Separator />

        <div>
          <h4 className="font-semibold text-sm text-foreground mb-3">
            Nhận xét ({application.comments.length})
          </h4>
          {application.comments.length > 0 && (
            <div className="space-y-3 mb-4 max-h-40 overflow-y-auto">
              {application.comments.map((c, idx) => (
                <div key={`${c.author}-${idx}`} className="flex items-start gap-2 text-sm">
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="text-xs bg-muted">
                      {c.author.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground">
                        {c.author}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {c.date}
                      </span>
                    </div>
                    <p className="text-muted-foreground">{c.content}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <Textarea
              placeholder="Thêm nhận xét..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="min-h-[60px] text-sm"
            />
            <Button
              size="icon"
              variant="outline"
              onClick={handleAddComment}
              disabled={!comment.trim()}
              className="shrink-0 self-end"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <Separator />

        <div className="flex items-center justify-between">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Đóng
          </Button>
          <div className="flex gap-2">
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={isSubmitting}
            >
              Từ chối
            </Button>
            <Button
              onClick={handleApproveStage}
              disabled={isSubmitting || application.currentStage >= STAGES.length}
            >
              {isSubmitting ? "Đang xử lý..." : "Duyệt giai đoạn"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ReviewDetailDialog;
