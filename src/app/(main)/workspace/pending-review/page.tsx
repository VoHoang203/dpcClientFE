"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import { useAuth } from "@/contexts/AuthContext";
import { inferNotificationRoleKey } from "@/lib/inferNotificationRole";
import { Clock, FileText, Eye, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ReviewDetailDialog, {
  type AdmissionApplication,
} from "@/components/workspace/ReviewDetailDialog";
import {
  mapAdmissionApiToApplication,
  type AdmissionApiListItem,
} from "@/lib/admissionUiMap";

const STAGE_LABELS = ["Sơ duyệt", "Xác minh", "Soạn NQ", "Hoàn thành"];

async function fetchAdmissions() {
  const res = await fetch("/api/admissions");
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      typeof err?.message === "string" ? err.message : "Không tải được danh sách"
    );
  }
  return res.json() as Promise<{ items: AdmissionApiListItem[] }>;
}

const getStageBadge = (stage: number) => {
  const colors = [
    "bg-yellow-100 text-yellow-800",
    "bg-blue-100 text-blue-800",
    "bg-purple-100 text-purple-800",
    "bg-green-100 text-green-800",
  ];
  return (
    <Badge className={colors[stage] || colors[0]}>{STAGE_LABELS[stage]}</Badge>
  );
};

const getPriorityBadge = (priority: string) => {
  if (priority === "high") return <Badge variant="outline">Ưu tiên</Badge>;
  if (priority === "low") return <Badge variant="secondary">Thấp</Badge>;
  return null;
};

const PendingReviewPage = () => {
  const { user } = useAuth();
  const actorRole = useMemo(() => inferNotificationRoleKey(user), [user]);
  const [selectedApp, setSelectedApp] =
    useState<AdmissionApplication | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("all");

  const { data, error, isLoading, mutate } = useSWR("admissions-list", fetchAdmissions, {
    refreshInterval: 8000,
  });

  const applications = useMemo(() => {
    const items = data?.items ?? [];
    return items.map(mapAdmissionApiToApplication);
  }, [data]);

  const filteredApps = useMemo(() => {
    if (activeTab === "all") return applications;
    const stageMap: Record<string, number> = {
      stage0: 0,
      stage1: 1,
      stage2: 2,
      stage3: 3,
    };
    const target = stageMap[activeTab];
    if (target === undefined) return applications;
    return applications.filter((a) => a.currentStage === target);
  }, [applications, activeTab]);

  const stageCounts = useMemo(() => {
    const counts = [0, 0, 0, 0];
    applications.forEach((a) => {
      if (a.currentStage >= 0 && a.currentStage <= 3) {
        counts[a.currentStage] += 1;
      }
    });
    return counts;
  }, [applications]);

  const handleView = (app: AdmissionApplication) => {
    setSelectedApp(app);
    setDialogOpen(true);
  };

  return (
    <div className="w-full p-4 sm:p-6 lg:p-8">
      <div className="mx-auto w-full max-w-6xl 2xl:max-w-7xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground">
              <Clock className="h-6 w-6 text-primary" />
              Chờ sơ duyệt
            </h1>
            <p className="text-sm text-muted-foreground">
              Hàng chờ kết nạp Đảng 
            </p>
          </div>
          <Badge variant="secondary" className="px-3 py-1 text-lg">
            {applications.length}
          </Badge>
        </div>

        {isLoading && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            Đang tải hồ sơ…
          </div>
        )}
        {error && (
          <p className="text-sm text-destructive">
            {error.message} — kiểm tra DATABASE_URL và script SQL Neon.
          </p>
        )}

        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {STAGE_LABELS.map((label, idx) => (
            <Card
              key={label}
              className="cursor-pointer transition-shadow hover:shadow-md"
              onClick={() =>
                setActiveTab(
                  idx === 0 && activeTab === "stage0" ? "all" : `stage${idx}`
                )
              }
            >
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-foreground">
                  {stageCounts[idx]}
                </p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4 w-full justify-start overflow-x-auto">
            <TabsTrigger value="all">Tất cả ({applications.length})</TabsTrigger>
            <TabsTrigger value="stage0">
              Sơ duyệt ({stageCounts[0]})
            </TabsTrigger>
            <TabsTrigger value="stage1">
              Xác minh ({stageCounts[1]})
            </TabsTrigger>
            <TabsTrigger value="stage2">
              Soạn NQ ({stageCounts[2]})
            </TabsTrigger>
            <TabsTrigger value="stage3">
              Hoàn thành ({stageCounts[3]})
            </TabsTrigger>
          </TabsList>

          <div className="space-y-3">
            {!isLoading && filteredApps.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                  Không có hồ sơ nào trong giai đoạn này
                </CardContent>
              </Card>
            ) : (
              filteredApps.map((app) => (
                <Card
                  key={app.id}
                  className="group cursor-pointer transition-shadow hover:shadow-md"
                  onClick={() => handleView(app)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <Avatar className="h-11 w-11">
                        <AvatarFallback className="bg-primary/10 font-semibold text-primary">
                          {app.applicantName.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="mb-1 flex flex-wrap items-center gap-2">
                          <h3 className="font-semibold text-foreground">
                            {app.applicantName}
                          </h3>
                          {getStageBadge(app.currentStage)}
                          {getPriorityBadge(app.priority)}
                        </div>
                        <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <FileText className="h-3.5 w-3.5" />
                            {app.documents.filter((d) => d.submitted).length}/
                            {app.documents.length} tài liệu
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            {app.submittedAt}
                          </span>
                          {app.comments.length > 0 && (
                            <span>{app.comments.length} nhận xét</span>
                          )}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1 opacity-0 transition-opacity group-hover:opacity-100"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleView(app);
                        }}
                      >
                        <Eye className="h-4 w-4" />
                        Chi tiết
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </Tabs>

        <ReviewDetailDialog
          application={selectedApp}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          actorRole={actorRole}
          onActionComplete={() => void mutate()}
        />
      </div>
    </div>
  );
};

export default PendingReviewPage;
