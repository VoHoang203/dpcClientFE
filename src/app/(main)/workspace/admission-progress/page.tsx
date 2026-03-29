"use client";

import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import {
  FileText,
  CheckCircle2,
  Clock,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ADMISSION_DEMO_SESSION_STORAGE_KEY } from "@/lib/admissionDemoStorage";

interface ProgressRow {
  stepNumber: number;
  title: string;
  description: string;
  isCompleted: boolean;
  completionDate: string | null;
  note: string | null;
}

interface SessionResponse {
  admission: { currentStep: number; fullName: string };
  progress: ProgressRow[];
}

const fetcher = async (url: string): Promise<SessionResponse> => {
  const res = await fetch(url);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      typeof err?.message === "string" ? err.message : "Không tải được tiến độ"
    );
  }
  return res.json();
};

type StepUiStatus = "completed" | "in_progress" | "pending" | "action_required";

interface AdmissionStep {
  id: number;
  title: string;
  description: string;
  status: StepUiStatus;
  date?: string;
  note?: string;
}

function mapRowsToSteps(rows: ProgressRow[]): AdmissionStep[] {
  const firstIncomplete = rows.find((r) => !r.isCompleted)?.stepNumber;
  return rows.map((r) => {
    let status: StepUiStatus;
    if (r.isCompleted) status = "completed";
    else if (r.stepNumber === firstIncomplete) status = "in_progress";
    else status = "pending";
    let dateStr: string | undefined;
    if (r.completionDate) {
      try {
        dateStr = format(new Date(r.completionDate), "dd/MM/yyyy", {
          locale: vi,
        });
      } catch {
        dateStr = undefined;
      }
    }
    return {
      id: r.stepNumber,
      title: r.title,
      description: r.description,
      status,
      date: dateStr,
      note: r.note ?? undefined,
    };
  });
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
  const [sessionKey, setSessionKey] = useState<string | null>(null);

  useEffect(() => {
    setSessionKey(
      typeof window !== "undefined"
        ? localStorage.getItem(ADMISSION_DEMO_SESSION_STORAGE_KEY)
        : null
    );
  }, []);

  const swrKey = sessionKey
    ? `/api/admissions?sessionKey=${encodeURIComponent(sessionKey)}`
    : null;

  const { data, error, isLoading } = useSWR<SessionResponse>(swrKey, fetcher);

  const steps = useMemo(() => {
    if (data?.progress?.length) {
      return mapRowsToSteps(data.progress);
    }
    return mockSteps;
  }, [data]);

  const completedSteps = steps.filter((s) => s.status === "completed").length;
  const progressPercent = (completedSteps / steps.length) * 100;

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
        return (
          <Badge className="bg-yellow-100 text-yellow-800">Đang xử lý</Badge>
        );
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
        {!sessionKey && (
          <p className="mt-2 text-xs text-amber-700">
            Chưa có session demo — đang hiển thị dữ liệu mẫu. Nộp hồ sơ từ &quot;Xin
            làm Đảng viên&quot; hoặc gán localStorage{" "}
            <code className="rounded bg-muted px-1">
              {ADMISSION_DEMO_SESSION_STORAGE_KEY}=demo-session-qcut-001
            </code>
          </p>
        )}
        {sessionKey && isLoading && (
          <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Đang tải tiến độ từ Neon…
          </div>
        )}
        {sessionKey && error && (
          <p className="mt-2 text-xs text-destructive">{error.message}</p>
        )}
        {data?.admission?.fullName && (
          <p className="mt-1 text-sm text-muted-foreground">
            Hồ sơ: <span className="font-medium">{data.admission.fullName}</span>
          </p>
        )}
      </div>

      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Tiến độ tổng thể</p>
              <p className="text-2xl font-bold">
                {completedSteps}/{steps.length} bước
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

      {steps.find((s) => s.status === "action_required") && (
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
          {steps.map((step, index) => (
            <div
              key={step.id}
              className={`flex gap-4 p-4 ${
                index < steps.length - 1 ? "border-b" : ""
              }`}
            >
              <div className="flex flex-col items-center">
                {getStatusIcon(step.status)}
                {index < steps.length - 1 && (
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
                    &quot;{step.note}&quot;
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
