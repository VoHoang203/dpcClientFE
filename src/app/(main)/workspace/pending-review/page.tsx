"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import { useAuth } from "@/contexts/AuthContext";
import { inferNotificationRoleKey } from "@/lib/inferNotificationRole";
import {
  Clock,
  FileText,
  Eye,
  Loader2,
  ListTree,
  Mail,
  User,
  UserCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ReviewDetailDialog, {
  type AdmissionApplication,
} from "@/components/workspace/ReviewDetailDialog";
import { AdmissionWorkflowStepsPeekDialog } from "@/components/workspace/AdmissionWorkflowStepsPeekDialog";
import {
  mapAdmissionApiToApplication,
  type AdmissionApiListItem,
} from "@/lib/admissionUiMap";
import { adaptListItem } from "@/lib/partyAdmissionAdapter";
import {
  extractPartyAdmissionError,
  partyAdmissionService,
} from "@/services/partyAdmissionService";

const STAGE_LABELS = ["Sơ duyệt", "Xác minh", "Soạn NQ", "Hoàn thành"];

const PAGE_SIZE = 10;

type PendingListPayload = {
  items: AdmissionApiListItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

async function fetchPendingPage([, page, limit]: [
  string,
  number,
  number,
]): Promise<PendingListPayload> {
  try {
    const res = await partyAdmissionService.listPending({ page, limit });
    const items = res.items
      .map((row) => adaptListItem(row))
      .filter((x): x is AdmissionApiListItem => x != null);
    return {
      items,
      total: res.total,
      page: res.page,
      limit: res.limit,
      totalPages: res.total === 0 ? 0 : Math.max(1, res.totalPages),
    };
  } catch (e: unknown) {
    throw new Error(extractPartyAdmissionError(e));
  }
}

const getStageBadge = (stage: number, stepName?: string | null) => {
  const colors = [
    "bg-yellow-100 text-yellow-800",
    "bg-blue-100 text-blue-800",
    "bg-purple-100 text-purple-800",
    "bg-green-100 text-green-800",
  ];
  const label = stepName?.trim() || STAGE_LABELS[stage] || STAGE_LABELS[0];
  return (
    <Badge className={colors[stage] || colors[0]}>{label}</Badge>
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
  const [page, setPage] = useState(1);
  const [stepsPeekOpen, setStepsPeekOpen] = useState(false);
  const [stepsPeekId, setStepsPeekId] = useState<string | null>(null);
  const [stepsPeekCode, setStepsPeekCode] = useState<string | null>(null);

  const { data, error, isLoading, mutate } = useSWR(
    ["admissions-pending", page, PAGE_SIZE],
    fetchPendingPage,
    { refreshInterval: 8000, keepPreviousData: true }
  );

  const applications = useMemo(() => {
    const items = data?.items ?? [];
    return items.map(mapAdmissionApiToApplication);
  }, [data]);

  const total = data?.total ?? 0;
  const totalPages =
    total === 0 ? 0 : Math.max(1, data?.totalPages ?? 1);

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
            {total}
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
            {error.message}
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
                <p className="mt-1 text-[10px] text-muted-foreground">
                  (trang hiện tại)
                </p>
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
            {/* <TabsTrigger value="stage2">
              Soạn NQ ({stageCounts[2]})
            </TabsTrigger> */}
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
                    <div className="flex items-start gap-4">
                      <Avatar className="h-11 w-11 shrink-0">
                        <AvatarFallback className="bg-primary/10 font-semibold text-primary">
                          {app.applicantName.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-semibold text-foreground">
                            {app.applicantName}
                          </h3>
                          {getStageBadge(app.currentStage, app.currentStepDisplayName)}
                          {app.overallStatusLabel ? (
                            <Badge variant="secondary" className="text-xs">
                              {app.overallStatusLabel}
                            </Badge>
                          ) : null}
                          {getPriorityBadge(app.priority)}
                        </div>
                        <div className="flex flex-col gap-1 text-xs text-muted-foreground sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-4 sm:gap-y-1">
                          {app.username ? (
                            <span className="flex items-center gap-1">
                              <User className="h-3.5 w-3.5 shrink-0" />
                              {app.username}
                            </span>
                          ) : null}
                          {app.applicantEmail ? (
                            <span className="flex min-w-0 items-center gap-1">
                              <Mail className="h-3.5 w-3.5 shrink-0" />
                              <span className="truncate">{app.applicantEmail}</span>
                            </span>
                          ) : null}
                          {app.currentHandler ? (
                            <span className="flex items-start gap-1">
                              <UserCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                              <span>{app.currentHandler}</span>
                            </span>
                          ) : null}
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
                            {app.createdAtFormatted ? (
                              <span className="text-[11px]">
                                · {app.createdAtFormatted}
                              </span>
                            ) : null}
                          </span>
                          {app.comments.length > 0 && (
                            <span>{app.comments.length} nhận xét</span>
                          )}
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-col gap-1 sm:flex-row sm:items-center">
                        <Button
                          size="sm"
                          variant="secondary"
                          className="gap-1 opacity-0 transition-opacity group-hover:opacity-100"
                          onClick={(e) => {
                            e.stopPropagation();
                            setStepsPeekId(app.id);
                            setStepsPeekCode(app.applicationCode ?? null);
                            setStepsPeekOpen(true);
                          }}
                        >
                          <ListTree className="h-4 w-4" />
                          Chi tiết bước
                        </Button>
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
                          Duyệt hồ sơ
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </Tabs>

        {!isLoading && total > 0 ? (
          <div className="mt-6 flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              Trang{" "}
              <span className="font-medium text-foreground">{page}</span> /{" "}
              {totalPages} — {total} hồ sơ
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Trước
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Sau
              </Button>
            </div>
          </div>
        ) : null}

        <ReviewDetailDialog
          application={selectedApp}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          actorRole={actorRole}
          onActionComplete={() => void mutate()}
        />

        <AdmissionWorkflowStepsPeekDialog
          open={stepsPeekOpen}
          onOpenChange={(o) => {
            setStepsPeekOpen(o);
            if (!o) {
              setStepsPeekId(null);
              setStepsPeekCode(null);
            }
          }}
          admissionId={stepsPeekId}
          applicationCodeHint={stepsPeekCode}
        />
      </div>
    </div>
  );
};

export default PendingReviewPage;
