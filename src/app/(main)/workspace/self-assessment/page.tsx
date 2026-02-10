"use client";

import { useState } from "react";
import { ClipboardList, Send, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";

export default function SelfAssessmentPage() {
  const [classification, setClassification] = useState("");
  const [reason, setReason] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    if (!classification || !reason.trim()) {
      toast({
        title: "Thiếu thông tin",
        description: "Vui lòng chọn mức xếp loại và nhập lý do đánh giá",
        action: <Button variant="destructive">OK</Button>,
      });
      return;
    }
    setSubmitted(true);
    toast({
      title: "Đã gửi đánh giá",
      description: "Bản tự đánh giá đã được gửi lên cấp trên để xem xét",
    });
  };

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

  if (submitted) {
    return (
      <div className="p-6">
        <div className="mb-6">
          <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground">
            <ClipboardList className="h-6 w-6 text-primary" />
            Tự đánh giá kiểm điểm bản thân
          </h1>
          <p className="text-muted-foreground">Năm 2024</p>
        </div>

        <Card className="max-w-2xl">
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
                className={
                  classificationOptions.find((c) => c.value === classification)
                    ?.color
                }
              >
                {
                  classificationOptions.find((c) => c.value === classification)
                    ?.label
                }
              </Badge>
              <p className="mb-1 mt-3 text-sm text-muted-foreground">Lý do:</p>
              <p className="text-sm">{reason}</p>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              Trạng thái:{" "}
              <span className="font-medium text-yellow-600">
                Chờ Chi ủy duyệt
              </span>
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground">
          <ClipboardList className="h-6 w-6 text-primary" />
          Tự đánh giá kiểm điểm bản thân
        </h1>
        <p className="text-muted-foreground">Năm 2024</p>
      </div>

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
              placeholder="Nêu lý do tự đánh giá bản thân ở mức trên. Ví dụ: Trong năm 2024, tôi đã hoàn thành tốt các nhiệm vụ được giao, tham gia đầy đủ các cuộc họp chi bộ, đóng đảng phí đúng hạn..."
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

      <div className="mx-auto mt-6 max-w-md">
        <Button onClick={handleSubmit} className="w-full gap-2" size="lg">
          <Send className="h-4 w-4" />
          Gửi bản tự đánh giá
        </Button>
        <p className="mt-3 text-center text-sm text-muted-foreground">
          Sau khi gửi, bản tự đánh giá sẽ được Chi ủy xem xét và đưa ra đánh giá
          cuối cùng.
        </p>
      </div>
    </div>
  );
}
