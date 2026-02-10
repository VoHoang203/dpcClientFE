"use client";

import {
  FileText,
  CheckCircle2,
  Clock,
  AlertCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

interface AdmissionStep {
  id: number;
  title: string;
  description: string;
  status: "completed" | "in_progress" | "pending" | "action_required";
  date?: string;
  note?: string;
}

const mockSteps: AdmissionStep[] = [
  {
    id: 1,
    title: "Nộp hồ sơ",
    description: "QCUT nộp hồ sơ xin kết nạp",
    status: "completed",
    date: "15/01/2025",
    note: "Hồ sơ đầy đủ",
  },
  {
    id: 2,
    title: "Chi ủy kiểm tra",
    description: "Đ/c Hồng (CU) kiểm tra lỗi hồ sơ",
    status: "completed",
    date: "18/01/2025",
    note: "Đã kiểm tra, không có lỗi",
  },
  {
    id: 3,
    title: "PBT duyệt nội dung",
    description: "Đ/c Ngân (PBT) duyệt nội dung hồ sơ",
    status: "in_progress",
    note: "Đang chờ duyệt",
  },
  {
    id: 4,
    title: "Xác minh lý lịch",
    description: "QCUT đi xác minh lý lịch tại địa phương",
    status: "pending",
  },
  {
    id: 5,
    title: "Kiểm tra dấu đỏ",
    description: "Đ/c Ngân (PBT) kiểm tra dấu đỏ và chốt",
    status: "pending",
  },
  {
    id: 6,
    title: "Soạn nghị quyết",
    description: "Đ/c Hồng (CU) soạn Nghị quyết kết nạp",
    status: "pending",
  },
  {
    id: 7,
    title: "Duyệt nghị quyết",
    description: "Đ/c Thủy (BT) duyệt Nghị quyết",
    status: "pending",
  },
];

export default function AdmissionProgressPage() {
  const completedSteps = mockSteps.filter(
    (s) => s.status === "completed"
  ).length;
  const progressPercent = (completedSteps / mockSteps.length) * 100;

  const getStatusIcon = (status: AdmissionStep["status"]) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="h-6 w-6 text-green-500" />;
      case "in_progress":
        return <Clock className="h-6 w-6 text-yellow-500" />;
      case "action_required":
        return <AlertCircle className="h-6 w-6 text-red-500" />;
      default:
        return (
          <div className="h-6 w-6 rounded-full border-2 border-muted-foreground" />
        );
    }
  };

  const getStatusBadge = (status: AdmissionStep["status"]) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-green-100 text-green-800">Hoàn thành</Badge>;
      case "in_progress":
        return <Badge className="bg-yellow-100 text-yellow-800">Đang xử lý</Badge>;
      case "action_required":
        return <Badge className="bg-red-100 text-red-800">Cần hành động</Badge>;
      default:
        return <Badge variant="secondary">Chờ</Badge>;
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground">
          <FileText className="h-6 w-6 text-primary" />
          Hồ sơ kết nạp Đảng viên
        </h1>
        <p className="text-muted-foreground">Theo dõi tiến độ hồ sơ của bạn</p>
      </div>

      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Tiến độ tổng thể</p>
              <p className="text-2xl font-bold">
                {completedSteps}/{mockSteps.length} bước
              </p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-primary">
                {Math.round(progressPercent)}%
              </p>
            </div>
          </div>
          <Progress value={progressPercent} className="h-2" />
        </CardContent>
      </Card>

      {mockSteps.find((s) => s.status === "action_required") && (
        <Card className="mb-6 border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5 text-red-600" />
              <div className="flex-1">
                <p className="font-medium text-red-800">
                  Cần hành động của bạn
                </p>
                <p className="mt-1 text-sm text-red-700">
                  Vui lòng hoàn thành bước xác minh lý lịch và nộp lại hồ sơ.
                </p>
                <Button size="sm" variant="destructive" className="mt-3">
                  Xem chi tiết
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Chi tiết tiến độ</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {mockSteps.map((step, index) => (
            <div
              key={step.id}
              className={`flex gap-4 p-4 ${
                index < mockSteps.length - 1 ? "border-b" : ""
              }`}
            >
              <div className="flex flex-col items-center">
                {getStatusIcon(step.status)}
                {index < mockSteps.length - 1 && (
                  <div
                    className={`mt-2 w-0.5 flex-1 ${
                      step.status === "completed" ? "bg-green-500" : "bg-muted"
                    }`}
                  />
                )}
              </div>
              <div className="flex-1 pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{step.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {step.description}
                    </p>
                  </div>
                  {getStatusBadge(step.status)}
                </div>
                {step.date && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Ngày: {step.date}
                  </p>
                )}
                {step.note && (
                  <p className="mt-1 text-sm italic text-muted-foreground">
                    "{step.note}"
                  </p>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
