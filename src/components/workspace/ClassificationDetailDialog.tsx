import { useState } from "react";
import {
  Award,
  CheckCircle2,
  Clock,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { toast } from "@/hooks/use-toast";

interface MemberClassification {
  id: string;
  name: string;
  classification: "excellent" | "good" | "complete" | "incomplete" | "pending";
  year: number;
  score: number;
  reviewedBy: string;
  reviewedAt: string;
}

interface Props {
  member: MemberClassification | null;
  open: boolean;
  onClose: () => void;
  onSave?: (id: string, classification: string, comment: string) => void;
}

const classificationOptions = [
  {
    value: "excellent",
    label: "Hoàn thành xuất sắc nhiệm vụ",
    color: "bg-green-600",
  },
  { value: "good", label: "Hoàn thành tốt nhiệm vụ", color: "bg-blue-600" },
  { value: "complete", label: "Hoàn thành nhiệm vụ", color: "bg-yellow-600" },
  {
    value: "incomplete",
    label: "Không hoàn thành nhiệm vụ",
    color: "bg-red-600",
  },
];

const mockSelfAssessment = {
  classification: "good",
  reason:
    "Trong năm 2024, tôi đã hoàn thành tốt các nhiệm vụ được giao, tham gia đầy đủ 12/12 cuộc họp chi bộ, đóng đảng phí đúng hạn, tích cực tham gia các hoạt động phong trào của đơn vị.",
  submittedAt: "15/12/2024",
};

const mockActivities = [
  { label: "Họp chi bộ", value: "12/12 buổi", percent: 100 },
  { label: "Đóng đảng phí", value: "12/12 tháng", percent: 100 },
  { label: "Hoạt động phong trào", value: "8/10 hoạt động", percent: 80 },
  { label: "Học tập nghị quyết", value: "4/5 lần", percent: 80 },
];

const ClassificationDetailDialog = ({
  member,
  open,
  onClose,
  onSave,
}: Props) => {
  const [selectedClassification, setSelectedClassification] = useState("");
  const [comment, setComment] = useState("");

  if (!member) return null;

  const isPending = member.classification === "pending";

  const handleSubmit = () => {
    if (!selectedClassification) {
      toast({ title: "Vui lòng chọn mức xếp loại" });
      return;
    }
    onSave?.(member.id, selectedClassification, comment);
    toast({
      title: "Đã lưu đánh giá",
      description: `Đã xếp loại ${member.name}`,
    });
    setSelectedClassification("");
    setComment("");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Award className="h-5 w-5 text-primary" />
            Đánh giá xếp loại Đảng viên
          </DialogTitle>
          <DialogDescription>Năm {member.year}</DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/50">
          <Avatar className="h-14 w-14">
            <AvatarFallback className="bg-primary/10 text-primary text-lg">
              {member.name.charAt(0)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <h3 className="font-semibold text-lg">{member.name}</h3>
            <p className="text-sm text-muted-foreground">
              Đảng viên chính thức • Chi bộ Khối Giáo dục 2
            </p>
          </div>
          {!isPending && (
            <Badge
              className={`${classificationOptions.find(
                (c) => c.value === member.classification
              )?.color} text-white`}
            >
              {
                classificationOptions.find(
                  (c) => c.value === member.classification
                )?.label
              }
            </Badge>
          )}
        </div>

        <div className="space-y-3">
          <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
            Tổng hợp hoạt động
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {mockActivities.map((act) => (
              <div key={act.label} className="p-3 rounded-lg border">
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium">{act.label}</span>
                  <span className="text-muted-foreground">{act.value}</span>
                </div>
                <Progress value={act.percent} className="h-1.5" />
              </div>
            ))}
          </div>
        </div>

        <Separator />

        <div className="space-y-3">
          <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
            Bản tự đánh giá
          </h4>
          <div className="p-4 rounded-lg border bg-muted/30">
            <div className="flex items-center gap-2 mb-2">
              <Badge
                className={`${classificationOptions.find(
                  (c) => c.value === mockSelfAssessment.classification
                )?.color} text-white`}
              >
                {
                  classificationOptions.find(
                    (c) => c.value === mockSelfAssessment.classification
                  )?.label
                }
              </Badge>
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {mockSelfAssessment.submittedAt}
              </span>
            </div>
            <p className="text-sm leading-relaxed">{mockSelfAssessment.reason}</p>
          </div>
        </div>

        {isPending ? (
          <>
            <Separator />
            <div className="space-y-4">
              <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                Đánh giá của Chi ủy
              </h4>
              <RadioGroup
                value={selectedClassification}
                onValueChange={setSelectedClassification}
                className="space-y-2"
              >
                {classificationOptions.map((opt) => (
                  <Label
                    key={opt.value}
                    htmlFor={`eval-${opt.value}`}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedClassification === opt.value
                        ? "border-primary bg-primary/5"
                        : "hover:border-muted-foreground"
                    }`}
                  >
                    <RadioGroupItem value={opt.value} id={`eval-${opt.value}`} />
                    <div className={`w-3 h-3 rounded-full ${opt.color}`} />
                    <span className="font-medium text-sm">{opt.label}</span>
                  </Label>
                ))}
              </RadioGroup>

              <div className="space-y-2">
                <Label>Nhận xét của Chi ủy</Label>
                <Textarea
                  placeholder="Nhập nhận xét đánh giá..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={3}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={onClose}>
                Hủy
              </Button>
              <Button onClick={handleSubmit} className="gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Xác nhận xếp loại
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <Separator />
            <div className="space-y-2">
              <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                Kết quả đánh giá Chi ủy
              </h4>
              <div className="p-4 rounded-lg border">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">
                    Điểm số:{" "}
                    <span className="text-primary text-lg">
                      {member.score}/100
                    </span>
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {member.reviewedAt}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Đánh giá bởi: {member.reviewedBy}
                </p>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ClassificationDetailDialog;
