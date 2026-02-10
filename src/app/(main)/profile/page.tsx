"use client";

import { useEffect, useState } from "react";
import {
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Award,
  CreditCard,
  Edit,
  Camera,
  ChevronRight,
  Shield,
  Bell,
  Send,
} from "lucide-react";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import Link from "next/link";
import TransferDialog from "@/components/profile/TransferDialog";
import PartyFeeNotificationDialog from "@/components/profile/PartyFeeNotificationDialog";
import { authService, type ProfileData } from "@/services/authService";
import { useRouter } from "next/navigation";

export default function ProfilePage() {
  const router = useRouter();
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [feeNotifOpen, setFeeNotifOpen] = useState(false);

  const [user, setUser] = useState<ProfileData | null>(null);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const profile = await authService.profile();
        setUser(profile);
      } catch {
        router.replace("/login");
      }
    };

    loadProfile();
  }, [router]);

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
      </div>
    );
  }

  type MenuItem =
    | {
        icon: typeof Bell;
        label: string;
        description: string;
        href: string;
      }
    | {
        icon: typeof Bell;
        label: string;
        description: string;
        onClick: () => void;
      };

  const menuItems: MenuItem[] = [
    {
      icon: Bell,
      label: "Bật thông báo đảng phí",
      description: "Nhận nhắc nhở đóng phí hàng tháng",
      onClick: () => setFeeNotifOpen(true),
    },
    {
      icon: CreditCard,
      label: "Đảng phí",
      description: "Thông báo, lịch sử đóng phí",
      href: "/party-fees",
    },
    {
      icon: Award,
      label: "Xếp loại Đảng viên",
      description: "Kết quả đánh giá hàng năm",
      href: "/classification",
    },
    {
      icon: Calendar,
      label: "Lịch sử điểm danh",
      description: "Thống kê tham gia họp",
      href: "/attendance-report",
    },
  ];

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-6">
      <Header />
      <main className="mx-auto max-w-7xl px-4 py-6">
        <Card className="mb-6 overflow-hidden">
          <div className="h-24 bg-party-gradient" />
          <CardContent className="pb-6 pt-0">
            <div className="-mt-12 flex flex-col items-center gap-4 sm:flex-row sm:items-end">
              <div className="relative">
                <Avatar className="h-24 w-24 border-4 border-card">
                  <AvatarImage src="" />
                  <AvatarFallback className="bg-primary text-2xl text-primary-foreground">
                    {user.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <button className="absolute bottom-0 right-0 rounded-full bg-primary p-1.5 text-primary-foreground">
                  <Camera className="h-4 w-4" />
                </button>
              </div>
              <div className="flex-1 text-center sm:text-left">
                <h1 className="text-xl font-bold text-foreground">{user.name}</h1>
                <p className="text-muted-foreground">{user.position}</p>
                <div className="mt-2 flex flex-wrap justify-center gap-2 sm:justify-start">
                  <Badge className="bg-primary text-primary-foreground">
                    {user.memberId}
                  </Badge>
                  <Badge className="bg-green-100 text-green-800" variant="secondary">
                    {user.classification}
                  </Badge>
                </div>
              </div>
              <Button variant="outline" className="gap-2">
                <Edit className="h-4 w-4" />
                Chỉnh sửa
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <User className="h-5 w-5 text-primary" />
              Thông tin cá nhân
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium">{user.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Số điện thoại</p>
                  <p className="font-medium">{user.phone}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <MapPin className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Địa chỉ</p>
                  <p className="font-medium">{user.address}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Ngày sinh</p>
                  <p className="font-medium">{user.dob}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Shield className="h-5 w-5 text-primary" />
              Thông tin Đảng viên
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <p className="text-sm text-muted-foreground">Đối tượng</p>
                <p className="font-medium">{user.objectType}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Mã số Đảng viên</p>
                <p className="font-medium">{user.memberId}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Ngày vào Đảng</p>
                <p className="font-medium">{user.joinDate}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Ngày chính thức</p>
                <p className="font-medium">{user.officialDate}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Số lý lịch</p>
                <p className="font-medium">{user.profileNumber}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Trình độ học vấn</p>
                <p className="font-medium">{user.education}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Dân tộc</p>
                <p className="font-medium">{user.ethnicity}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Tôn giáo</p>
                <p className="font-medium">{user.religion}</p>
              </div>
              <div className="md:col-span-2">
                <p className="text-sm text-muted-foreground">Chi bộ</p>
                <p className="font-medium">{user.branch}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Tiện ích</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {menuItems.map((item, index) => (
              <div key={item.label}>
                {"href" in item ? (
                  <Link
                    href={item.href}
                    className="flex items-center justify-between p-4 transition-colors hover:bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="rounded-lg bg-primary/10 p-2">
                        <item.icon className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{item.label}</p>
                        <p className="text-sm text-muted-foreground">
                          {item.description}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </Link>
                ) : (
                  <button
                    type="button"
                    onClick={item.onClick}
                    className="flex w-full items-center justify-between p-4 text-left transition-colors hover:bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="rounded-lg bg-primary/10 p-2">
                        <item.icon className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{item.label}</p>
                        <p className="text-sm text-muted-foreground">
                          {item.description}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </button>
                )}
                {index < menuItems.length - 1 && <Separator />}
              </div>
            ))}

            <Separator />
            <button
              onClick={() => setTransferDialogOpen(true)}
              className="flex w-full items-center justify-between p-4 text-left transition-colors hover:bg-muted/50"
            >
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-primary/10 p-2">
                  <Send className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">Viết hồ sơ chuyển Đảng</p>
                  <p className="text-sm text-muted-foreground">
                    Xin chuyển sinh hoạt đảng
                  </p>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </button>
          </CardContent>
        </Card>

        <TransferDialog
          open={transferDialogOpen}
          onClose={() => setTransferDialogOpen(false)}
        />
        <PartyFeeNotificationDialog
          open={feeNotifOpen}
          onClose={() => setFeeNotifOpen(false)}
        />
      </main>
      <BottomNav />
    </div>
  );
}
