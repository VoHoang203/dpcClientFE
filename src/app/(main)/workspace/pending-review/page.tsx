"use client";

import { useState, useMemo } from "react";
import { Clock, FileText, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ReviewDetailDialog, {
  type AdmissionApplication,
} from "@/components/workspace/ReviewDetailDialog";

const mockApplications: AdmissionApplication[] = [
  {
    id: "1",
    applicantName: "Nguyễn Văn B",
    dob: "15/03/2001",
    phone: "0901234567",
    address: "Q. Thủ Đức, TP.HCM",
    submittedAt: "2 giờ trước",
    currentStage: 0,
    status: "pending",
    priority: "high",
    documents: [
      { name: "Đơn xin vào Đảng", submitted: true },
      { name: "Lý lịch tự khai", submitted: true },
      { name: "Giấy giới thiệu", submitted: true },
      { name: "Nghị quyết chi đoàn", submitted: false },
    ],
    comments: [
      {
        author: "Chi ủy viên",
        content: "Hồ sơ tương đối đầy đủ, cần bổ sung NQ chi đoàn",
        date: "1 giờ trước",
      },
    ],
  },
  {
    id: "2",
    applicantName: "Trần Thị C",
    dob: "22/07/2000",
    phone: "0912345678",
    address: "Q. 9, TP.HCM",
    submittedAt: "1 ngày trước",
    currentStage: 1,
    status: "reviewing",
    priority: "normal",
    documents: [
      { name: "Đơn xin vào Đảng", submitted: true },
      { name: "Lý lịch tự khai", submitted: true },
      { name: "Giấy giới thiệu", submitted: true },
      { name: "Nghị quyết chi đoàn", submitted: true },
    ],
    comments: [
      { author: "Chi ủy viên", content: "Hồ sơ đầy đủ", date: "1 ngày trước" },
      {
        author: "Phó Bí thư",
        content: "Đang xác minh lý lịch",
        date: "5 giờ trước",
      },
    ],
  },
  {
    id: "3",
    applicantName: "Lê Văn D",
    dob: "10/11/2001",
    phone: "0923456789",
    address: "Q. Bình Thạnh, TP.HCM",
    submittedAt: "3 ngày trước",
    currentStage: 2,
    status: "reviewing",
    priority: "normal",
    documents: [
      { name: "Đơn xin vào Đảng", submitted: true },
      { name: "Lý lịch tự khai", submitted: true },
      { name: "Giấy giới thiệu", submitted: true },
      { name: "Nghị quyết chi đoàn", submitted: true },
    ],
    comments: [],
  },
  {
    id: "4",
    applicantName: "Phạm Minh E",
    dob: "05/01/2002",
    phone: "0934567890",
    address: "Q. 7, TP.HCM",
    submittedAt: "5 ngày trước",
    currentStage: 0,
    status: "pending",
    priority: "low",
    documents: [
      { name: "Đơn xin vào Đảng", submitted: true },
      { name: "Lý lịch tự khai", submitted: false },
      { name: "Giấy giới thiệu", submitted: false },
      { name: "Nghị quyết chi đoàn", submitted: false },
    ],
    comments: [],
  },
];

const STAGE_LABELS = ["Sơ duyệt", "Xác minh", "Soạn NQ", "Hoàn thành"];

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
  const [selectedApp, setSelectedApp] =
    useState<AdmissionApplication | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("all");

  const filteredApps = useMemo(() => {
    if (activeTab === "all") return mockApplications;
    const stageMap: Record<string, number> = {
      stage0: 0,
      stage1: 1,
      stage2: 2,
      stage3: 3,
    };
    return mockApplications.filter((a) => a.currentStage === stageMap[activeTab]);
  }, [activeTab]);

  const stageCounts = useMemo(() => {
    const counts = [0, 0, 0, 0];
    mockApplications.forEach((a) => counts[a.currentStage]++);
    return counts;
  }, []);

  const handleView = (app: AdmissionApplication) => {
    setSelectedApp(app);
    setDialogOpen(true);
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Clock className="h-6 w-6 text-primary" />
            Chờ sơ duyệt
          </h1>
          <p className="text-muted-foreground text-sm">
            Hàng chờ kết nạp Đảng cho Quần chúng ưu tú
          </p>
        </div>
        <Badge variant="secondary" className="text-lg px-3 py-1">
          {mockApplications.length}
        </Badge>
      </div>

      <div className="grid grid-cols-4 gap-3 mb-6">
        {STAGE_LABELS.map((label, idx) => (
          <Card
            key={label}
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() =>
              setActiveTab(idx === 0 && activeTab === "stage0" ? "all" : `stage${idx}`)
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
        <TabsList className="mb-4">
          <TabsTrigger value="all">Tất cả ({mockApplications.length})</TabsTrigger>
          <TabsTrigger value="stage0">Sơ duyệt ({stageCounts[0]})</TabsTrigger>
          <TabsTrigger value="stage1">Xác minh ({stageCounts[1]})</TabsTrigger>
          <TabsTrigger value="stage2">Soạn NQ ({stageCounts[2]})</TabsTrigger>
        </TabsList>

        <div className="space-y-3">
          {filteredApps.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                Không có hồ sơ nào trong giai đoạn này
              </CardContent>
            </Card>
          ) : (
            filteredApps.map((app) => (
              <Card
                key={app.id}
                className="hover:shadow-md transition-shadow cursor-pointer group"
                onClick={() => handleView(app)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-11 w-11">
                      <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                        {app.applicantName.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h3 className="font-semibold text-foreground">
                          {app.applicantName}
                        </h3>
                        {getStageBadge(app.currentStage)}
                        {getPriorityBadge(app.priority)}
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
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
                      className="gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
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
      />
    </div>
  );
};

export default PendingReviewPage;
