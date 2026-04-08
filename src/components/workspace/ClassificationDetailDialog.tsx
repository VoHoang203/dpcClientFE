"use client";

import { useEffect, useState } from "react";
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
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/hooks/use-toast";
import {
  uiClassificationToApiRank,
  type AnnualAssessmentItem,
  type AnnualAssessmentClassification,
  type CriteriaChecklistItem,
  type ApiRank,
  type ReviewAnnualAssessmentPayload,
} from "@/services/annualAssessmentService";

interface Props {
  member: AnnualAssessmentItem | null;
  open: boolean;
  onClose: () => void;
  criteriaTemplate: string[];
  onSave?: (payload: ReviewAnnualAssessmentPayload) => Promise<void>;
}

const classificationOptions: {
  value: Exclude<AnnualAssessmentClassification, "pending">;
  label: string;
  color: string;
}[] = [
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

function apiRankToUiValue(
  r: ApiRank | null
): Exclude<AnnualAssessmentClassification, "pending"> | "" {
  if (!r) return "";
  switch (r) {
    case "EXCELLENT":
      return "excellent";
    case "GOOD":
      return "good";
    case "COMPLETE":
      return "complete";
    case "INCOMPLETE":
      return "incomplete";
    default:
      return "";
  }
}

function selfRankBadge(r: ApiRank | null) {
  const v = apiRankToUiValue(r);
  if (!v) return null;
  const opt = classificationOptions.find((c) => c.value === v);
  return (
    <Badge className={`${opt?.color ?? "bg-muted"} text-white`}>
      {opt?.label ?? r}
    </Badge>
  );
}

function mergeChecklist(
  template: string[],
  existing: CriteriaChecklistItem[] | null
): CriteriaChecklistItem[] {
  const map = new Map<string, CriteriaChecklistItem>();
  existing?.forEach((c) => map.set(c.name, c));
  return template.map((name) => ({
    name,
    isChecked: map.get(name)?.isChecked ?? false,
    note: map.get(name)?.note ?? "",
  }));
}

const ClassificationDetailDialog = ({
  member,
  open,
  onClose,
  criteriaTemplate,
  onSave,
}: Props) => {
  const [selectedClassification, setSelectedClassification] = useState("");
  const [score, setScore] = useState("");
  const [checklist, setChecklist] = useState<CriteriaChecklistItem[]>([]);

  useEffect(() => {
    if (!member || !open) return;
    setChecklist(mergeChecklist(criteriaTemplate, member.criteriaChecklist));
    setScore(member.score != null ? String(member.score) : "");
    const fromFinal = apiRankToUiValue(member.finalRank);
    setSelectedClassification(fromFinal || "");
  }, [member, criteriaTemplate, open]);

  if (!member) return null;

  const displayName = member.fullName || member.memberId;
  const canReview = member.status === "PENDING";
  const isApproved = member.status === "APPROVED";
  const isRejected = member.status === "REJECTED";

  const handleSubmit = async () => {
    if (!selectedClassification) {
      toast({ title: "Vui lòng chọn mức xếp loại cuối cùng" });
      return;
    }
    const n = Number(score);
    if (!Number.isFinite(n) || n < 0 || n > 100) {
      toast({ title: "Điểm không hợp lệ", description: "Nhập điểm từ 0 đến 100" });
      return;
    }
    if (criteriaTemplate.length > 0) {
      const unchecked = checklist.filter((c) => !c.isChecked);
      if (unchecked.length > 0) {
        toast({
          title: "Chưa đủ checklist",
          description: "Vui lòng đánh dấu đủ các chỉ tiêu đã đạt",
        });
        return;
      }
    }
    try {
      if (!onSave) {
        toast({ title: "Thiếu handler lưu đánh giá" });
        return;
      }
      const payload: ReviewAnnualAssessmentPayload = {
        status: "APPROVED",
        finalRank: uiClassificationToApiRank(
          selectedClassification as Exclude<AnnualAssessmentClassification, "pending">
        ),
        score: n,
        criteriaChecklist: checklist,
      };
      await onSave(payload);
      setSelectedClassification("");
      setScore("");
      onClose();
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Không lưu được đánh giá";
      toast({ title: "Lỗi", description: message });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Award className="h-5 w-5 text-primary" />
            Đánh giá xếp loại Đảng viên
          </DialogTitle>
          <DialogDescription>
            Năm {member.year}
            {member.partyCellName ? ` · ${member.partyCellName}` : ""}
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-4 rounded-lg bg-muted/50 p-4">
          <Avatar className="h-14 w-14">
            <AvatarFallback className="bg-primary/10 text-lg text-primary">
              {displayName.charAt(0)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <h3 className="text-lg font-semibold">{displayName}</h3>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <Badge variant="outline">{member.status}</Badge>
              {member.finalRank ? selfRankBadge(member.finalRank) : null}
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <h4 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Chỉ tiêu đánh giá (năm {member.year})
          </h4>
          {criteriaTemplate.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Chưa có bộ tiêu chí cho năm này. Hãy dùng nút &quot;Xếp loại
              mới&quot; để thiết lập.
            </p>
          ) : (
            <ul className="list-inside list-disc rounded-lg border p-3 text-sm">
              {criteriaTemplate.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          )}
        </div>

        <Separator />

        <div className="space-y-3">
          <h4 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Bản tự đánh giá
          </h4>
          <div className="rounded-lg border bg-muted/30 p-4">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              {member.selfRank ? (
                <>
                  {selfRankBadge(member.selfRank)}
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {member.createdAt
                      ? new Date(member.createdAt).toLocaleString("vi-VN")
                      : "-"}
                  </span>
                </>
              ) : (
                <Badge variant="outline">Chưa có tự xếp loại</Badge>
              )}
            </div>
            <p className="text-sm leading-relaxed">
              {member.remarks?.trim()
                ? member.remarks
                : "Chưa có nội dung tự đánh giá."}
            </p>
          </div>
        </div>

        {canReview ? (
          <>
            <Separator />
            <div className="space-y-4">
              <h4 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Đánh giá của Chi ủy
              </h4>
              <div className="space-y-2">
                <Label>Điểm (0–100)</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={score}
                  onChange={(e) => setScore(e.target.value)}
                  placeholder="VD: 85"
                />
              </div>

              {criteriaTemplate.length > 0 && (
                <div className="space-y-3">
                  <Label>Checklist chỉ tiêu</Label>
                  {checklist.map((c, idx) => (
                    <div
                      key={c.name}
                      className="flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-start"
                    >
                      <div className="flex flex-1 items-start gap-3">
                        <Checkbox
                          checked={c.isChecked}
                          onCheckedChange={(v) => {
                            const next = [...checklist];
                            next[idx] = { ...c, isChecked: Boolean(v) };
                            setChecklist(next);
                          }}
                          className="mt-1"
                        />
                        <span className="text-sm font-medium leading-snug">
                          {c.name}
                        </span>
                      </div>
                      <Textarea
                        className="min-h-[60px] flex-1 sm:max-w-[50%]"
                        placeholder="Ghi chú (tuỳ chọn)"
                        value={c.note}
                        onChange={(e) => {
                          const next = [...checklist];
                          next[idx] = { ...c, note: e.target.value };
                          setChecklist(next);
                        }}
                      />
                    </div>
                  ))}
                </div>
              )}

              <RadioGroup
                value={selectedClassification}
                onValueChange={setSelectedClassification}
                className="space-y-2"
              >
                {classificationOptions.map((opt) => (
                  <Label
                    key={opt.value}
                    htmlFor={`eval-${opt.value}`}
                    className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors ${
                      selectedClassification === opt.value
                        ? "border-primary bg-primary/5"
                        : "hover:border-muted-foreground"
                    }`}
                  >
                    <RadioGroupItem value={opt.value} id={`eval-${opt.value}`} />
                    <div className={`h-3 w-3 rounded-full ${opt.color}`} />
                    <span className="text-sm font-medium">{opt.label}</span>
                  </Label>
                ))}
              </RadioGroup>
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
              <h4 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Kết quả đánh giá Chi ủy
              </h4>
              <div className="rounded-lg border p-4">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-medium">
                    Điểm:{" "}
                    <span className="text-lg text-primary">
                      {member.score != null ? member.score : "—"}
                    </span>
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {member.reviewedAt
                      ? new Date(member.reviewedAt).toLocaleString("vi-VN")
                      : "-"}
                  </span>
                </div>
                {member.finalRank ? (
                  <div className="mb-2">{selfRankBadge(member.finalRank)}</div>
                ) : null}
                {isRejected && (
                  <p className="text-sm text-destructive">Trạng thái: từ chối</p>
                )}
                {isApproved && (
                  <p className="text-sm text-muted-foreground">Đã phê duyệt</p>
                )}
              </div>
              {member.criteriaChecklist && member.criteriaChecklist.length > 0 && (
                <div className="mt-3 space-y-2">
                  <Label>Checklist đã chấm</Label>
                  <ul className="space-y-1 text-sm">
                    {member.criteriaChecklist.map((c) => (
                      <li key={c.name}>
                        {c.isChecked ? "✓" : "○"} {c.name}
                        {c.note ? ` — ${c.note}` : ""}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ClassificationDetailDialog;
