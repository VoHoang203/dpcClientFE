"use client";

import { AlertTriangle, Calendar, Edit, Eye, Plus } from "lucide-react";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface DisciplineCase {
  id: string;
  memberName: string;
  violationType: string;
  punishment: "warning" | "severe_warning" | "demotion" | "expulsion";
  date: string;
  status: "processing" | "completed" | "appealing";
  description: string;
}

const mockCases: DisciplineCase[] = [
  {
    id: "1",
    memberName: "Nguyễn Văn X",
    violationType: "Vi phạm quy định sinh hoạt Đảng",
    punishment: "warning",
    date: "15/01/2025",
    status: "processing",
    description: "Vắng họp Chi bộ 3 lần liên tiếp không có lý do",
  },
  {
    id: "2",
    memberName: "Trần Thị Y",
    violationType: "Vi phạm đạo đức Đảng viên",
    punishment: "severe_warning",
    date: "10/12/2024",
    status: "completed",
    description: "Có hành vi thiếu trung thực trong công tác",
  },
  {
    id: "3",
    memberName: "Lê Văn Z",
    violationType: "Vi phạm Điều lệ Đảng",
    punishment: "demotion",
    date: "05/11/2024",
    status: "appealing",
    description: "Vi phạm nguyên tắc tập trung dân chủ",
  },
];

const getPunishmentBadge = (punishment: DisciplineCase["punishment"]) => {
  switch (punishment) {
    case "warning":
      return <Badge className="bg-yellow-100 text-yellow-800">Khiển trách</Badge>;
    case "severe_warning":
      return <Badge className="bg-orange-100 text-orange-800">Cảnh cáo</Badge>;
    case "demotion":
      return <Badge className="bg-red-100 text-red-800">Cách chức</Badge>;
    case "expulsion":
      return <Badge className="bg-red-600 text-white">Khai trừ</Badge>;
    default:
      return null;
  }
};

const getStatusBadge = (status: DisciplineCase["status"]) => {
  switch (status) {
    case "processing":
      return (
        <Badge variant="outline" className="border-yellow-500 text-yellow-600">
          Đang xử lý
        </Badge>
      );
    case "completed":
      return (
        <Badge variant="outline" className="border-green-500 text-green-600">
          Đã hoàn thành
        </Badge>
      );
    case "appealing":
      return (
        <Badge variant="outline" className="border-blue-500 text-blue-600">
          Khiếu nại
        </Badge>
      );
    default:
      return null;
  }
};

const Discipline = () => {
  return (
    <div className="min-h-screen bg-background pb-20 md:pb-6">
      <Header />
      <main className="mx-auto max-w-7xl px-4 py-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground">
              <AlertTriangle className="h-6 w-6 text-destructive" />
              Quản lý Kỷ luật
            </h1>
            <p className="text-muted-foreground">Theo dõi và xử lý vi phạm</p>
          </div>
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Thêm mới</span>
          </Button>
        </div>

        <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold">5</p>
              <p className="text-xs text-muted-foreground">Tổng vụ việc</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-yellow-600">2</p>
              <p className="text-xs text-muted-foreground">Đang xử lý</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-green-600">2</p>
              <p className="text-xs text-muted-foreground">Đã hoàn thành</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-blue-600">1</p>
              <p className="text-xs text-muted-foreground">Khiếu nại</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="all">
          <TabsList className="mb-4">
            <TabsTrigger value="all">Tất cả</TabsTrigger>
            <TabsTrigger value="processing">Đang xử lý</TabsTrigger>
            <TabsTrigger value="completed">Đã hoàn thành</TabsTrigger>
            <TabsTrigger value="appealing">Khiếu nại</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-4">
            {mockCases.map((item) => (
              <Card key={item.id} className="transition-shadow hover:shadow-md">
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <Avatar className="h-12 w-12">
                      <AvatarFallback className="bg-destructive/10 text-destructive">
                        {item.memberName.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold">{item.memberName}</h3>
                        {getPunishmentBadge(item.punishment)}
                        {getStatusBadge(item.status)}
                      </div>
                      <p className="mb-1 text-sm text-foreground">
                        {item.violationType}
                      </p>
                      <p className="line-clamp-1 text-sm text-muted-foreground">
                        {item.description}
                      </p>
                      <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {item.date}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="outline">
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="processing">
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                Vụ việc đang xử lý
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="completed">
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                Vụ việc đã hoàn thành
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="appealing">
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                Vụ việc đang khiếu nại
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
      <BottomNav />
    </div>
  );
};

export default Discipline;
