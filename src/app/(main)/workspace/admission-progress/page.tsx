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
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { isPhoBiThuWorkspaceUser } from "@/lib/workspaceSidebarRole";
import type { PartyAdmissionSessionPayload } from "@/lib/partyAdmissionAdapter";
import { partyAdmissionService } from "@/services/partyAdmissionService";
import { AdmissionStepDetailDialog } from "@/components/workspace/AdmissionStepDetailDialog";

interface ProgressRow {
  stepNumber: number;
  title: string;
  description: string;
  isCompleted: boolean;
  completionDate: string | null;
  note: string | null;
  rawStep?: Record<string, unknown>;
}

type StepUiStatus = "completed" | "in_progress" | "pending" | "action_required";

interface AdmissionStep {
  id: number;
  title: string;
  description: string;
  status: StepUiStatus;
  date?: string;
  note?: string;
  rawStep?: Record<string, unknown>;
}

function mapRowsToSteps(
  rows: ProgressRow[],
  workflowStatus: string
): AdmissionStep[] {
  const firstIncomplete = rows.find((r) => !r.isCompleted)?.stepNumber;
  return rows.map((r) => {
    let status: StepUiStatus;
    if (r.isCompleted) status = "completed";
    else if (workflowStatus === "not_started") {
      status = "pending";
    } else if (
      workflowStatus === "returned" &&
      r.stepNumber === firstIncomplete
    ) {
      status = "action_required";
    } else if (r.stepNumber === firstIncomplete) status = "in_progress";
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
      rawStep: r.rawStep,
    };
  });
}

export default function AdmissionProgressPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [stepDialogOpen, setStepDialogOpen] = useState(false);
  const [stepDetail, setStepDetail] = useState<Record<string, unknown> | null>(
    null
  );

  useEffect(() => {
    if (isPhoBiThuWorkspaceUser(user)) {
      router.replace("/workspace/pending-review");
    }
  }, [user, router]);

  const swrKey = useMemo(
    () => (user?.userId ? `admission-applications-progress:${user.userId}` : null),
    [user?.userId]
  );

  const { data, error, isLoading } = useSWR<PartyAdmissionSessionPayload, Error>(
    swrKey,
    () => partyAdmissionService.loadMySession(),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      refreshInterval: 0,
    }
  );

  const steps = useMemo(() => {
    if (data?.progress?.length) {
      return mapRowsToSteps(
        data.progress,
        String(data.admission?.workflowStatus ?? "")
      );
    }
    return [];
  }, [data]);

  const completedSteps = steps.filter((s) => s.status === "completed").length;
  const progressPercent =
    steps.length > 0 ? (completedSteps / steps.length) * 100 : 0;

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

  if (!swrKey) {
    return (
      <div className="p-6">
        <div className="mb-6">
          <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground">
            <FileText className="h-6 w-6 text-primary" />
            Hồ sơ kết nạp Đảng viên
          </h1>
          <p className="text-muted-foreground">
            Theo dõi tiến độ hồ sơ của bạn
          </p>
        </div>
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            <p>
              Đăng nhập và nộp hồ sơ tại mục{" "}
              <span className="font-medium text-foreground">
                Xin làm Đảng viên
              </span>{" "}
              để xem tiến độ theo tài khoản.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground">
          <FileText className="h-6 w-6 text-primary" />
          Hồ sơ kết nạp Đảng viên
        </h1>
        <p className="text-muted-foreground">Theo dõi tiến độ hồ sơ của bạn</p>
        {data?.admission?.workflowStatus === "not_started" && !isLoading && (
          <p className="mt-2 text-sm text-muted-foreground">
            Bạn chưa nộp đơn kết nạp — hiển thị{" "}
            <span className="font-medium text-foreground">0/7</span> bước hoàn
            thành. Hãy vào{" "}
            <Link className="text-primary underline" href="/workspace/admission-application">
              Xin làm Đảng viên
            </Link>{" "}
            để bắt đầu bước 1.
          </p>
        )}
        {swrKey && isLoading && (
          <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Đang tải tiến độ…
          </div>
        )}
        {swrKey && error && (
          <p className="mt-2 text-xs text-destructive">{error.message}</p>
        )}
        {data?.admission?.fullName && (
          <p className="mt-1 text-sm text-muted-foreground">
            Hồ sơ: <span className="font-medium">{data.admission.fullName}</span>
          </p>
        )}
      </div>

      <AdmissionStepDetailDialog
        open={stepDialogOpen}
        onOpenChange={setStepDialogOpen}
        step={stepDetail}
        applicationCode={data?.admission?.code ?? null}
      />

      {data && steps.length > 0 && (
        <>
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
                      {data?.admission?.workflowStatus === "returned"
                        ? "Hồ sơ bị trả lại — bổ sung theo yêu cầu tại mục Xin làm Đảng viên."
                        : "Vui lòng hoàn tất bước xác minh lý lịch (hoặc bổ sung hồ sơ) tại mục Xin làm Đảng viên."}
                    </p>
                    <Button size="sm" variant="destructive" className="mt-3" asChild>
                      <Link href="/workspace/admission-application">
                        Mở Xin làm Đảng viên
                      </Link>
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
                          step.status === "completed"
                            ? "bg-green-500"
                            : "bg-muted"
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
                    <Button
                      type="button"
                      variant="link"
                      className="mt-2 h-auto p-0 text-sm"
                      onClick={() => {
                        setStepDetail(step.rawStep ?? null);
                        setStepDialogOpen(true);
                      }}
                    >
                      Xem chi tiết bước
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </>
      )}

      {data && steps.length === 0 && !isLoading && (
        <p className="text-sm text-muted-foreground">
          Chưa có dữ liệu tiến độ chi tiết cho hồ sơ này.
        </p>
      )}
    </div>
  );
}
