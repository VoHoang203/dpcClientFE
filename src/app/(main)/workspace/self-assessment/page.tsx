"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ClipboardList, Send, CheckCircle2, Upload, FileText, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import {
  annualAssessmentService,
  type ApiRank,
  type AnnualAssessmentClassification,
} from "@/services/annualAssessmentService";
import { fileService } from "@/services/fileService";

function apiRankToUi(
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

export default function SelfAssessmentPage() {
  const [classification, setClassification] = useState("");
  const [reason, setReason] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [editing, setEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [file, setFile] = useState<File | null>(null);
  const [existingFileUrl, setExistingFileUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const loadYear = async (year: number) => {
    setIsLoading(true);
    try {
      const mine = await annualAssessmentService.getMyAssessmentByYear(year);
      if (!mine) {
        setSubmitted(false);
        setEditing(false);
        setClassification("");
        setReason("");
        setExistingFileUrl(null);
        setFile(null);
        return;
      }
      setSubmitted(true);
      setEditing(false);
      setClassification(apiRankToUi(mine.selfRank));
      setReason(mine.remarks ?? "");
      setExistingFileUrl(mine.assessmentFileUrl ?? null);
      setFile(null);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Không tải được bản tự đánh giá";
      toast({ title: "Lỗi", description: msg });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadYear(selectedYear);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async () => {
    if (!classification || !reason.trim()) {
      toast({
        title: "Thiếu thông tin",
        description: "Vui lòng chọn mức xếp loại và nhập lý do đánh giá",
        action: <Button variant="destructive">OK</Button>,
      });
      return;
    }
    if (reason.trim().length < 50) {
      toast({
        title: "Nội dung quá ngắn",
        description: "Vui lòng nhập tối thiểu 50 ký tự",
      });
      return;
    }
    if (!submitted && !file) {
      toast({
        title: "Thiếu file kiểm điểm",
        description: "Vui lòng đính kèm file bản kiểm điểm cá nhân (PDF/DOCX/...)",
      });
      return;
    }
    setIsSubmitting(true);
    try {
      if (!submitted) {
        await annualAssessmentService.submitMyAssessment({
          year: selectedYear,
          classification: classification as Exclude<
            AnnualAssessmentClassification,
            "pending"
          >,
          reason: reason.trim(),
          file: file!,
        });
        setSubmitted(true);
        setEditing(false);
        await loadYear(selectedYear);
      } else {
        await annualAssessmentService.updateMyAssessment({
          year: selectedYear,
          classification: classification as Exclude<
            AnnualAssessmentClassification,
            "pending"
          >,
          reason: reason.trim(),
          file,
        });
        setEditing(false);
        await loadYear(selectedYear);
      }
      toast({
        title: submitted ? "Đã cập nhật" : "Đã gửi đánh giá",
        description: submitted
          ? "Bản tự đánh giá đã được cập nhật"
          : "Bản tự đánh giá đã được gửi lên Chi ủy để xem xét",
      });
    } catch (e: unknown) {
      const message =
        e instanceof Error ? e.message : "Không gửi được bản tự đánh giá";
      toast({ title: "Lỗi", description: message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const canEdit = submitted;

  const classificationOptions = [
    {
      value: "excellent",
      label: "Hoàn thành xuất sắc nhiệm vụ",
      color: "bg-green-600",
    },
    {
      value: "good",
      label: "Hoàn thành tốt nhiệm vụ",
      color: "bg-blue-600",
    },
    {
      value: "complete",
      label: "Hoàn thành nhiệm vụ",
      color: "bg-yellow-600",
    },
    {
      value: "incomplete",
      label: "Không hoàn thành nhiệm vụ",
      color: "bg-red-600",
    },
  ];

  const selectedLabel = useMemo(
    () => classificationOptions.find((c) => c.value === classification)?.label,
    [classification, classificationOptions]
  );
  const selectedColor = useMemo(
    () => classificationOptions.find((c) => c.value === classification)?.color,
    [classification, classificationOptions]
  );

  if (submitted && !editing) {
    return (
      <div className="p-6">
        <div className="mx-auto max-w-4xl">
          <div className="mb-6">
          <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground">
            <ClipboardList className="h-6 w-6 text-primary" />
            Tự đánh giá kiểm điểm bản thân
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-muted-foreground">
            <span>Năm {selectedYear}</span>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value) || new Date().getFullYear())}
                className="h-9 w-28 rounded-md border border-border bg-background px-3 text-sm text-foreground"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => void loadYear(selectedYear)}
                disabled={isLoading}
              >
                {isLoading ? "Đang tải..." : "Tải"}
              </Button>
            </div>
          </div>
          </div>

          <Card className="mx-auto max-w-2xl">
          <CardContent className="p-8 text-center">
            <CheckCircle2 className="mx-auto mb-4 h-16 w-16 text-green-500" />
            <h2 className="mb-2 text-xl font-bold">Đã gửi bản tự đánh giá</h2>
            <p className="mb-4 text-muted-foreground">
              Bản tự đánh giá của bạn đã được gửi lên Chi ủy để xem xét và phê
              duyệt.
            </p>
            <div className="rounded-lg bg-muted/50 p-4 text-left">
              <p className="mb-1 text-sm text-muted-foreground">
                Mức tự đánh giá:
              </p>
              <Badge
                className={selectedColor}
              >
                {selectedLabel}
              </Badge>
              <p className="mb-1 mt-3 text-sm text-muted-foreground">Lý do:</p>
              <p className="text-sm">{reason}</p>
              {existingFileUrl && (
                <p className="mt-3 text-sm">
                  File:{" "}
                  <a
                    className="text-primary underline underline-offset-4"
                    href="#"
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => {
                      e.preventDefault();
                      fileService.openInNewTab(existingFileUrl);
                    }}
                  >
                    Xem file đã nộp
                  </a>
                </p>
              )}
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              Trạng thái:{" "}
              <span className="font-medium text-yellow-600">
                Chờ Chi ủy duyệt
              </span>
            </p>
            <div className="mt-6 flex justify-center">
              <Button
                variant="outline"
                onClick={() => {
                  setEditing(true);
                  setFile(null);
                }}
              >
                Chỉnh sửa bản tự đánh giá
              </Button>
            </div>
          </CardContent>
        </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground">
          <ClipboardList className="h-6 w-6 text-primary" />
          Tự đánh giá kiểm điểm bản thân
        </h1>
        <div className="mt-2 flex flex-wrap items-center gap-3 text-muted-foreground">
          <span>Năm {selectedYear}</span>
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value) || new Date().getFullYear())}
              className="h-9 w-28 rounded-md border border-border bg-background px-3 text-sm text-foreground"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => void loadYear(selectedYear)}
              disabled={isLoading}
            >
              {isLoading ? "Đang tải..." : "Tải"}
            </Button>
          </div>
        </div>
      </div>

      {isLoading && (
        <div className="mb-6 rounded-lg border border-border bg-muted/20 p-4 text-sm text-muted-foreground">
          Đang tải bản tự đánh giá...
        </div>
      )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Chọn mức xếp loại</CardTitle>
          </CardHeader>
          <CardContent>
            <RadioGroup
              value={classification}
              onValueChange={setClassification}
              className="space-y-3"
            >
              {classificationOptions.map((option) => (
                <Label
                  key={option.value}
                  htmlFor={option.value}
                  className={`flex cursor-pointer items-center gap-3 rounded-lg border-2 p-4 transition-colors ${
                    classification === option.value
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-muted-foreground"
                  }`}
                >
                  <RadioGroupItem value={option.value} id={option.value} />
                  <div className={`h-3 w-3 rounded-full ${option.color}`} />
                  <span className="font-medium">{option.label}</span>
                </Label>
              ))}
            </RadioGroup>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Lý do đánh giá</CardTitle>
          </CardHeader>
          <CardContent className="flex h-full flex-col">
            <Textarea
              placeholder="Nêu lý do tự đánh giá bản thân ở mức trên. Ví dụ: Trong năm 2026, tôi đã hoàn thành tốt các nhiệm vụ được giao, tham gia đầy đủ các cuộc họp chi bộ, đóng đảng phí đúng hạn..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={8}
              className="flex-1"
            />
            <p className="mt-2 text-xs text-muted-foreground">
              Tối thiểu 50 ký tự để đảm bảo nội dung đánh giá đầy đủ.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-lg">File bản kiểm điểm cá nhân</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.doc,.docx"
            className="hidden"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />

          <button
            type="button"
            className="group flex w-full items-center justify-between gap-3 rounded-xl border border-dashed border-border bg-muted/20 p-4 text-left transition-colors hover:bg-muted/40"
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-background shadow-sm">
                {file ? (
                  <FileText className="h-5 w-5 text-primary" />
                ) : (
                  <Upload className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">
                  {file ? file.name : "Bấm để chọn file (PDF/DOC/DOCX)"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {file
                    ? `${Math.max(1, Math.round(file.size / 1024))} KB`
                    : existingFileUrl
                      ? "Đã có file đã nộp — có thể chọn file mới để thay thế."
                    : submitted
                      ? "Nếu không chọn file thì sẽ giữ nguyên file cũ."
                      : "Bắt buộc đính kèm khi gửi mới."}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {file && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9"
                  onClick={(e) => {
                    e.stopPropagation();
                    setFile(null);
                    if (fileInputRef.current) {
                      fileInputRef.current.value = "";
                    }
                  }}
                  aria-label="Xóa file đã chọn"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
              <span className="text-xs text-muted-foreground group-hover:text-foreground">
                Chọn file
              </span>
            </div>
          </button>
        </CardContent>
      </Card>

      <div className="mx-auto mt-6 max-w-md">
        <Button
          onClick={handleSubmit}
          className="w-full gap-2"
          size="lg"
          disabled={isSubmitting}
        >
          <Send className="h-4 w-4" />
          {isSubmitting
            ? "Đang xử lý..."
            : submitted
              ? "Cập nhật tự đánh giá"
              : "Gửi bản tự đánh giá"}
        </Button>
        <p className="mt-3 text-center text-sm text-muted-foreground">
          {submitted
            ? "Bạn có thể cập nhật trước khi Chi ủy phê duyệt."
            : "Sau khi gửi, bản tự đánh giá sẽ được Chi ủy xem xét và đưa ra đánh giá cuối cùng."}
        </p>
        {canEdit && (
          <div className="mt-3 flex justify-center">
            <Button
              variant="ghost"
              onClick={() => setEditing(false)}
              disabled={isSubmitting}
            >
              Hủy chỉnh sửa
            </Button>
          </div>
        )}
      </div>
      </div>
    </div>
  );
}
