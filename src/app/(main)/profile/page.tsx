"use client";

import { useEffect, useRef, useState } from "react";
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
import BottomNav from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import TransferDialog from "@/components/profile/TransferDialog";
import PartyFeeNotificationDialog from "@/components/profile/PartyFeeNotificationDialog";
import { useAuth } from "@/contexts/AuthContext";
import type { ProfileData } from "@/services/authService";
import { roleLabels, type UserRole } from "@/types/roles";
import { useRouter } from "next/navigation";
import { formatRoleOrPositionLabel } from "@/types/roles";

/** Hiển thị khi API/DB trả null hoặc chuỗi rỗng. */
function displayOrMissing(value: string | null | undefined): string {
  if (value == null) return "chưa có";
  const t = String(value).trim();
  return t === "" ? "chưa có" : t;
}

function profileRoleLabel(role: string) {
  if (role in roleLabels) {
    return roleLabels[role as UserRole];
  }
  return role;
}

export default function ProfilePage() {
  const { fetchProfile, updateProfile } = useAuth();
  const router = useRouter();
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [feeNotifOpen, setFeeNotifOpen] = useState(false);

  const [user, setUser] = useState<ProfileData | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<ProfileData>>({});
  const avatarInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const profile = await fetchProfile();
        setUser(profile);
      } catch {
        router.replace("/login");
      }
    };

    loadProfile();
  }, [router, fetchProfile]);

  const startEditing = () => {
    if (!user) return;
    setFormData({
      avatarUrl: user.avatarUrl ?? "",
      email: user.email,
      phone: user.phone,
      address: user.address,
      dob: user.dob,
    });
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setFormData({});
    setIsEditing(false);
  };

  const handleSave = async () => {
    try {
      const updated = await updateProfile(formData);
      setUser(updated);
      setIsEditing(false);
    } catch {
      // toast từ AuthProvider (updateProfile)
    }
  };

  const handleAvatarClick = () => {
    if (!isEditing) {
      startEditing();
    }
    avatarInputRef.current?.click();
  };

  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      setFormData((prev) => ({ ...prev, avatarUrl: result }));
    };
    reader.readAsDataURL(file);
  };

  if (!user) {
    return (
      <div className="min-h-0 flex-1 bg-background" />
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
    <div className="min-h-0 flex-1 bg-background pb-20 md:pb-6">
      <main className="mx-auto max-w-7xl px-4 py-6">
        <Card className="mb-6 overflow-hidden">
          {/* Ảnh bìa kiểu Facebook: rộng full card, cao theo tỉ lệ gần 820×312 */}
          <div
            className="relative w-full min-h-[100px] aspect-820/312 max-h-[min(420px,52vh)] bg-cover bg-center bg-no-repeat sm:min-h-[150px]"
            style={{ backgroundImage: "url('/bg-profile.jpg')" }}
            role="presentation"
          />
          <CardContent className="pb-6 pt-0">
            <div className="-mt-14 flex flex-col items-center gap-4 sm:-mt-16 sm:flex-row sm:items-end">
              <div className="relative">
                <Avatar className="h-28 w-28 border-4 border-card sm:h-32 sm:w-32">
                  <AvatarImage src={user.avatarUrl || ""} />
                  <AvatarFallback className="bg-primary text-2xl text-primary-foreground">
                    {(user.name || "?").trim().charAt(0) || "?"}
                  </AvatarFallback>
                </Avatar>
                <button
                  type="button"
                  onClick={handleAvatarClick}
                  className="absolute bottom-0 right-0 rounded-full bg-primary p-1.5 text-primary-foreground"
                >
                  <Camera className="h-4 w-4" />
                </button>
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarChange}
                />
              </div>
              {isEditing && (
                <div className="w-full sm:max-w-xs">
                  <Input
                    placeholder="Link ảnh đại diện"
                    value={formData.avatarUrl ?? user.avatarUrl ?? ""}
                    onChange={(event) =>
                      setFormData((prev) => ({
                        ...prev,
                        avatarUrl: event.target.value,
                      }))
                    }
                  />
                </div>
              )}
              <div className="flex-1 text-center sm:text-left">
                <h1 className="text-xl font-bold text-foreground">{displayOrMissing(user.name)}</h1>
                <p className="text-muted-foreground">
                  {user.position?.trim()
                    ? formatRoleOrPositionLabel(user.position)
                    : "chưa có"}
                </p>
                <div className="mt-2 flex flex-wrap justify-center gap-2 sm:justify-start">
                  <Badge className="bg-primary text-primary-foreground">
                    {displayOrMissing(user.memberId)}
                  </Badge>
                  <Badge className="bg-violet-100 text-violet-900" variant="secondary">
                    {profileRoleLabel(user.role)}
                  </Badge>
                  <Badge className="bg-green-100 text-green-800" variant="secondary">
                    {displayOrMissing(user.classification)}
                  </Badge>
                </div>
              </div>
              {isEditing ? (
                <div className="flex gap-2">
                  <Button variant="outline" onClick={cancelEditing}>
                    Hủy
                  </Button>
                  <Button onClick={handleSave}>Lưu</Button>
                </div>
              ) : (
                <Button variant="outline" className="gap-2" onClick={startEditing}>
                  <Edit className="h-4 w-4" />
                  Chỉnh sửa
                </Button>
              )}
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
                  {isEditing ? (
                    <Input
                      value={formData.email ?? user.email ?? ""}
                      onChange={(event) =>
                        setFormData((prev) => ({
                          ...prev,
                          email: event.target.value,
                        }))
                      }
                    />
                  ) : (
                    <p className="font-medium">{displayOrMissing(user.email)}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Số điện thoại</p>
                  {isEditing ? (
                    <Input
                      value={formData.phone ?? user.phone ?? ""}
                      onChange={(event) =>
                        setFormData((prev) => ({
                          ...prev,
                          phone: event.target.value,
                        }))
                      }
                    />
                  ) : (
                    <p className="font-medium">{displayOrMissing(user.phone)}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <MapPin className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Địa chỉ</p>
                  {isEditing ? (
                    <Input
                      value={formData.address ?? user.address ?? ""}
                      onChange={(event) =>
                        setFormData((prev) => ({
                          ...prev,
                          address: event.target.value,
                        }))
                      }
                    />
                  ) : (
                    <p className="font-medium">{displayOrMissing(user.address)}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Ngày sinh</p>
                  {isEditing ? (
                    <Input
                      value={formData.dob ?? user.dob ?? ""}
                      onChange={(event) =>
                        setFormData((prev) => ({
                          ...prev,
                          dob: event.target.value,
                        }))
                      }
                    />
                  ) : (
                    <p className="font-medium">{displayOrMissing(user.dob)}</p>
                  )}
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
                <p className="text-sm text-muted-foreground">Vai trò</p>
                <p className="font-medium">
                  {displayOrMissing(profileRoleLabel(user.role))}
                </p>
                <p className="text-xs text-muted-foreground">
                  Mã: {displayOrMissing(user.role)}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Chức danh</p>
                <p className="font-medium">
                  {user.position?.trim()
                    ? formatRoleOrPositionLabel(user.position)
                    : "chưa có"}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Đối tượng</p>
                <p className="font-medium">{displayOrMissing(user.objectType)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Mã số Đảng viên</p>
                <p className="font-medium">{displayOrMissing(user.memberId)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Ngày vào Đảng</p>
                <p className="font-medium">{displayOrMissing(user.joinDate)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Ngày chính thức</p>
                <p className="font-medium">{displayOrMissing(user.officialDate)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Số lý lịch</p>
                <p className="font-medium">{displayOrMissing(user.profileNumber)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Trình độ học vấn</p>
                <p className="font-medium">{displayOrMissing(user.education)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Dân tộc</p>
                <p className="font-medium">{displayOrMissing(user.ethnicity)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Tôn giáo</p>
                <p className="font-medium">{displayOrMissing(user.religion)}</p>
              </div>
              <div className="md:col-span-2">
                <p className="text-sm text-muted-foreground">Chi bộ</p>
                <p className="font-medium">{displayOrMissing(user.branch)}</p>
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
