"use client";

import { useState } from "react";
import {
  Award,
  Search,
  Filter,
  ChevronRight,
} from "lucide-react";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";

interface MemberClassification {
  id: string;
  name: string;
  classification: "excellent" | "good" | "complete" | "incomplete" | "pending";
  year: number;
  score: number;
  reviewedBy: string;
  reviewedAt: string;
}

const mockClassifications: MemberClassification[] = [
  {
    id: "1",
    name: "Nguyễn Văn A",
    classification: "excellent",
    year: 2024,
    score: 95,
    reviewedBy: "Chi ủy",
    reviewedAt: "20/12/2024",
  },
  {
    id: "2",
    name: "Trần Thị B",
    classification: "good",
    year: 2024,
    score: 85,
    reviewedBy: "Chi ủy",
    reviewedAt: "20/12/2024",
  },
  {
    id: "3",
    name: "Lê Văn C",
    classification: "good",
    year: 2024,
    score: 82,
    reviewedBy: "Chi ủy",
    reviewedAt: "20/12/2024",
  },
  {
    id: "4",
    name: "Phạm Thị D",
    classification: "complete",
    year: 2024,
    score: 70,
    reviewedBy: "Chi ủy",
    reviewedAt: "20/12/2024",
  },
  {
    id: "5",
    name: "Hoàng Văn E",
    classification: "pending",
    year: 2024,
    score: 0,
    reviewedBy: "",
    reviewedAt: "",
  },
  {
    id: "6",
    name: "Vũ Thị F",
    classification: "incomplete",
    year: 2024,
    score: 45,
    reviewedBy: "Chi ủy",
    reviewedAt: "20/12/2024",
  },
];

const getClassificationBadge = (
  classification: MemberClassification["classification"]
) => {
  switch (classification) {
    case "excellent":
      return <Badge className="bg-green-600 text-white">Hoàn thành xuất sắc</Badge>;
    case "good":
      return <Badge className="bg-blue-600 text-white">Hoàn thành tốt</Badge>;
    case "complete":
      return <Badge className="bg-yellow-600 text-white">Hoàn thành</Badge>;
    case "incomplete":
      return <Badge className="bg-red-600 text-white">Không hoàn thành</Badge>;
    case "pending":
      return <Badge variant="outline">Chưa xếp loại</Badge>;
    default:
      return null;
  }
};

export default function ClassificationPage() {
  const [searchQuery, setSearchQuery] = useState("");

  const stats = {
    excellent: mockClassifications.filter((m) => m.classification === "excellent").length,
    good: mockClassifications.filter((m) => m.classification === "good").length,
    complete: mockClassifications.filter((m) => m.classification === "complete").length,
    incomplete: mockClassifications.filter((m) => m.classification === "incomplete").length,
    pending: mockClassifications.filter((m) => m.classification === "pending").length,
  };

  const total = mockClassifications.length - stats.pending;

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-6">
      <Header />
      <main className="mx-auto max-w-7xl px-4 py-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground">
              <Award className="h-6 w-6 text-secondary" />
              Xếp loại Đảng viên
            </h1>
            <p className="text-muted-foreground">Đánh giá năm 2024</p>
          </div>
          <Button className="gap-2">Xếp loại mới</Button>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Tổng quan xếp loại năm 2024</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="mb-1 flex justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-green-600" />
                    Hoàn thành xuất sắc
                  </span>
                  <span>
                    {stats.excellent} ({Math.round((stats.excellent / total) * 100)}%)
                  </span>
                </div>
                <Progress value={(stats.excellent / total) * 100} className="h-2" />
              </div>
              <div>
                <div className="mb-1 flex justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-blue-600" />
                    Hoàn thành tốt
                  </span>
                  <span>
                    {stats.good} ({Math.round((stats.good / total) * 100)}%)
                  </span>
                </div>
                <Progress value={(stats.good / total) * 100} className="h-2" />
              </div>
              <div>
                <div className="mb-1 flex justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-yellow-600" />
                    Hoàn thành
                  </span>
                  <span>
                    {stats.complete} ({Math.round((stats.complete / total) * 100)}%)
                  </span>
                </div>
                <Progress value={(stats.complete / total) * 100} className="h-2" />
              </div>
              <div>
                <div className="mb-1 flex justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-red-600" />
                    Không hoàn thành
                  </span>
                  <span>
                    {stats.incomplete} ({Math.round((stats.incomplete / total) * 100)}%)
                  </span>
                </div>
                <Progress value={(stats.incomplete / total) * 100} className="h-2" />
              </div>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              Còn {stats.pending} đảng viên chưa xếp loại
            </p>
          </CardContent>
        </Card>

        <div className="mb-6 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Tìm kiếm đảng viên..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button variant="outline" size="icon">
            <Filter className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-3">
          {mockClassifications.map((member) => (
            <Card
              key={member.id}
              className="cursor-pointer transition-shadow hover:shadow-md"
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <Avatar className="h-12 w-12">
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {member.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex items-center gap-2">
                      <h3 className="font-semibold">{member.name}</h3>
                      {getClassificationBadge(member.classification)}
                    </div>
                    {member.classification !== "pending" ? (
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>Điểm: {member.score}/100</span>
                        <span>Đánh giá: {member.reviewedAt}</span>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Chờ đánh giá
                      </p>
                    )}
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
