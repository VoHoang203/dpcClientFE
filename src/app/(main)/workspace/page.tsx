"use client";

import {
  Users,
  Calendar,
  FileText,
  CheckCircle2,
  Clock,
  TrendingUp,
  UserCheck,
  Award,
  CreditCard,
  Briefcase,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { mockCurrentUser, getRoleLabel } from "@/types/roles";

const WorkspaceDashboard = () => {
  const role = mockCurrentUser.role;
  const roleLabel = getRoleLabel(role);

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="mb-2 flex items-center gap-3">
          <Briefcase className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">
            Khu vực làm việc
          </h1>
        </div>
        <p className="text-muted-foreground">
          Xin chào{" "}
          <span className="font-medium text-foreground">
            {mockCurrentUser.name}
          </span>{" "}
          ({roleLabel})
        </p>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  Cuộc họp tháng này
                </p>
                <p className="text-2xl font-bold">4</p>
              </div>
              <div className="rounded-lg bg-primary/10 p-2">
                <Calendar className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Tỷ lệ điểm danh</p>
                <p className="text-2xl font-bold">92%</p>
              </div>
              <div className="rounded-lg bg-green-100 p-2">
                <UserCheck className="h-5 w-5 text-green-600" />
              </div>
            </div>
            <Progress value={92} className="mt-2 h-1" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Đảng phí</p>
                <p className="text-2xl font-bold">Đã đóng</p>
              </div>
              <div className="rounded-lg bg-blue-100 p-2">
                <CreditCard className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Xếp loại 2024</p>
                <p className="text-lg font-bold">Hoàn thành tốt</p>
              </div>
              <div className="rounded-lg bg-amber-100 p-2">
                <Award className="h-5 w-5 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {(role === "chi_uy" || role === "pho_bi_thu" || role === "bi_thu") && (
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Chờ duyệt</CardTitle>
              <Badge variant="secondary">5</Badge>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-yellow-600" />
                  <div>
                    <p className="text-sm font-medium">
                      Hồ sơ QCUT Nguyễn Văn B
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Chờ nhận xét
                    </p>
                  </div>
                </div>
                <Button size="sm" variant="outline">
                  Xem
                </Button>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-yellow-600" />
                  <div>
                    <p className="text-sm font-medium">Nghị quyết tháng 1/2025</p>
                    <p className="text-xs text-muted-foreground">Chờ BT duyệt</p>
                  </div>
                </div>
                <Button size="sm" variant="outline">
                  Xem
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Hoạt động gần đây</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 text-green-600" />
                <div>
                  <p className="text-sm font-medium">
                    Đã duyệt nghị quyết tháng 12
                  </p>
                  <p className="text-xs text-muted-foreground">2 giờ trước</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <UserCheck className="mt-0.5 h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm font-medium">
                    Điểm danh họp Chi bộ tháng 1
                  </p>
                  <p className="text-xs text-muted-foreground">1 ngày trước</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <FileText className="mt-0.5 h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">
                    Tải lên tài liệu hướng dẫn mới
                  </p>
                  <p className="text-xs text-muted-foreground">2 ngày trước</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {role === "chi_uy" && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Xếp loại Đảng viên 2024</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <div className="mb-1 flex justify-between text-sm">
                      <span>Hoàn thành xuất sắc</span>
                      <span className="font-medium">12 (25%)</span>
                    </div>
                    <Progress value={25} className="h-2" />
                  </div>
                  <div>
                    <div className="mb-1 flex justify-between text-sm">
                      <span>Hoàn thành tốt</span>
                      <span className="font-medium">28 (58%)</span>
                    </div>
                    <Progress value={58} className="h-2" />
                  </div>
                  <div>
                    <div className="mb-1 flex justify-between text-sm">
                      <span>Hoàn thành</span>
                      <span className="font-medium">6 (13%)</span>
                    </div>
                    <Progress value={13} className="h-2" />
                  </div>
                  <div>
                    <div className="mb-1 flex justify-between text-sm">
                      <span>Không hoàn thành</span>
                      <span className="font-medium">2 (4%)</span>
                    </div>
                    <Progress value={4} className="h-2" />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Sự kiện sắp tới</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3 rounded-lg border p-3">
                <div className="flex h-12 w-12 flex-col items-center justify-center rounded-lg bg-primary/10">
                  <span className="text-lg font-bold text-primary">27</span>
                  <span className="text-xs text-muted-foreground">Th1</span>
                </div>
                <div>
                  <p className="text-sm font-medium">Họp Chi bộ định kỳ</p>
                  <p className="text-xs text-muted-foreground">14:00 - Online</p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-lg border p-3">
                <div className="flex h-12 w-12 flex-col items-center justify-center rounded-lg bg-secondary/20">
                  <span className="text-lg font-bold">28</span>
                  <span className="text-xs text-muted-foreground">Th1</span>
                </div>
                <div>
                  <p className="text-sm font-medium">Lễ kết nạp Đảng viên</p>
                  <p className="text-xs text-muted-foreground">
                    09:00 - Hội trường A
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {role === "qcut" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Tiến độ kết nạp Đảng viên</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-500 text-sm font-bold text-white">
                  1
                </div>
                <div className="flex-1">
                  <p className="font-medium">Nộp hồ sơ</p>
                  <p className="text-sm text-muted-foreground">Hoàn thành</p>
                </div>
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              </div>
              <div className="flex items-center gap-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-yellow-500 text-sm font-bold text-white">
                  2
                </div>
                <div className="flex-1">
                  <p className="font-medium">Chi ủy xem xét</p>
                  <p className="text-sm text-muted-foreground">Đang xử lý</p>
                </div>
                <Clock className="h-5 w-5 text-yellow-500" />
              </div>
              <div className="flex items-center gap-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-sm font-bold text-muted-foreground">
                  3
                </div>
                <div className="flex-1">
                  <p className="font-medium text-muted-foreground">
                    Xác minh lý lịch
                  </p>
                  <p className="text-sm text-muted-foreground">Chưa bắt đầu</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-sm font-bold text-muted-foreground">
                  4
                </div>
                <div className="flex-1">
                  <p className="font-medium text-muted-foreground">
                    Nghị quyết kết nạp
                  </p>
                  <p className="text-sm text-muted-foreground">Chưa bắt đầu</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {role === "dang_vien" && (
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Cuộc họp sắp tới</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3 rounded-lg border p-3">
                <div className="flex h-12 w-12 flex-col items-center justify-center rounded-lg bg-primary/10">
                  <span className="text-lg font-bold text-primary">27</span>
                  <span className="text-xs text-muted-foreground">Th1</span>
                </div>
                <div>
                  <p className="text-sm font-medium">Họp Chi bộ định kỳ</p>
                  <p className="text-xs text-muted-foreground">14:00 - Online</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Thông tin cần hoàn thành</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between rounded-lg border border-yellow-200 bg-yellow-50 p-3">
                <div>
                  <p className="text-sm font-medium">Tự đánh giá kiểm điểm</p>
                  <p className="text-xs text-muted-foreground">
                    Hạn: 31/01/2025
                  </p>
                </div>
                <Button size="sm">Thực hiện</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {role === "admin" && (
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Thống kê hệ thống</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tổng người dùng</span>
                <span className="font-bold">156</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Đăng nhập hôm nay</span>
                <span className="font-bold">45</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Log lỗi 24h</span>
                <span className="font-bold text-red-600">3</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Hoạt động gần đây</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start gap-3">
                <Users className="mt-0.5 h-5 w-5 text-green-600" />
                <div>
                  <p className="text-sm font-medium">
                    Tạo tài khoản mới: Trần Văn X
                  </p>
                  <p className="text-xs text-muted-foreground">1 giờ trước</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <TrendingUp className="mt-0.5 h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-sm font-medium">Backup database thành công</p>
                  <p className="text-xs text-muted-foreground">6 giờ trước</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default WorkspaceDashboard;
