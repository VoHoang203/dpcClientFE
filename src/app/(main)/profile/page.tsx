"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Edit,
  Camera,
  ChevronRight,
  Shield,
  KeyRound,
  Send,
  Loader2,
  Sparkles,
  GraduationCap,
  BookOpen,
  Flag,
  Building2,
  Users,
  UserRound,
  Globe,
  Landmark,
  CheckCircle,
} from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Link from "next/link";
import { toast } from "sonner";
import TransferDialog from "@/components/profile/TransferDialog";
import { ChangePasswordDialog } from "@/components/profile/ChangePasswordDialog";
import { ChangeEmailDialog } from "@/components/profile/ChangeEmailDialog";
import { userService } from "@/services/userService";
import {
  VietnamAddressFields,
  type VietnamAddressValue,
} from "@/components/profile/VietnamAddressFields";
import { useAuth } from "@/contexts/AuthContext";
import type { ProfileData } from "@/services/authService";
import { roleLabels, type UserRole } from "@/types/roles";
import { useRouter } from "next/navigation";
import { formatVnDate } from "@/lib/formatVnDate";
import httpService from "@/lib/http";
import { resolveFileAccessUrl } from "@/services/fileService";
import {
  academicLevelOptions,
  politicalTheoryLevelOptions,
  targetGroupOptions,
} from "@/lib/profileFormOptions";
import { cn } from "@/lib/utils";

const profileCardClass =
  "overflow-hidden rounded-xl border border-border/80 bg-card shadow-sm";
const sectionHeaderClass =
  "border-b border-border/60 bg-muted/40 px-5 py-4 sm:px-6";
const sectionBodyClass = "px-5 py-5 sm:px-6";
const fieldTileClass =
  "space-y-2 rounded-lg border border-border/60 bg-muted/25 p-4 shadow-sm";
const fieldTileWideClass =
  "space-y-2 rounded-lg border border-border/60 bg-muted/25 p-4 shadow-sm md:col-span-2";

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

function displayGender(code: string | null | undefined): string {
  if (code == null || String(code).trim() === "") return "chưa có";
  const u = String(code).trim().toUpperCase();
  if (u === "MALE") return "Nam";
  if (u === "FEMALE") return "Nữ";
  if (u === "OTHER") return "Khác";
  return String(code).trim();
}

function displayIsoDate(value: string | null | undefined): string {
  if (value == null || String(value).trim() === "") return "chưa có";
  return formatVnDate(value);
}

function toDateInput(iso: string | undefined): string {
  if (!iso?.trim()) return "";
  const t = iso.trim();
  const m = t.match(/^(\d{4}-\d{2}-\d{2})/);
  if (m) return m[1];
  const d = new Date(t);
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const da = String(d.getDate()).padStart(2, "0");
  return `${y}-${mo}-${da}`;
}

const emptyAddr: VietnamAddressValue = {
  streetAddress: "",
  provinceCode: "",
  districtCode: "",
  wardCode: "",
};

export default function ProfilePage() {
  const { fetchProfile, updateProfile } = useAuth();
  const router = useRouter();
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);

  const [user, setUser] = useState<ProfileData | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<ProfileData>>({});
  const [addr, setAddr] = useState<VietnamAddressValue>(emptyAddr);
  const [addrPreview, setAddrPreview] = useState("");
  const [hometownAddr, setHometownAddr] = useState<VietnamAddressValue>(emptyAddr);
  const [hometownPreview, setHometownPreview] = useState("");
  const [saving, setSaving] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const [avatarResolvedSrc, setAvatarResolvedSrc] = useState<string | null>(null);
  const avatarBlobRevokeRef = useRef<string | null>(null);

  /** Path đã chuẩn hoá (vd. sau strip MinIO) — dùng fetch có Bearer, không dùng `<img src="/...">` trần. */
  const avatarRawPath = useMemo(() => {
    if (!user) return "";
    const fromForm = formData.avatarUrl;
    if (fromForm !== undefined) return String(fromForm ?? "").trim();
    return String(user.avatarUrl ?? "").trim();
  }, [user, formData.avatarUrl]);

  useEffect(() => {
    const ac = new AbortController();

    if (avatarBlobRevokeRef.current) {
      URL.revokeObjectURL(avatarBlobRevokeRef.current);
      avatarBlobRevokeRef.current = null;
    }

    const raw = avatarRawPath;
    if (!raw) {
      setAvatarResolvedSrc(null);
      return () => {
        ac.abort();
      };
    }

    if (raw.startsWith("data:")) {
      setAvatarResolvedSrc(raw);
      return () => {
        ac.abort();
      };
    }

    const reqUrl = resolveFileAccessUrl(raw);
    if (!reqUrl) {
      setAvatarResolvedSrc(null);
      return () => {
        ac.abort();
      };
    }

    void (async () => {
      try {
        const res = await httpService.get<Blob>(reqUrl, {
          responseType: "blob",
          signal: ac.signal,
        });
        if (ac.signal.aborted) return;
        if (res.status >= 400) {
          setAvatarResolvedSrc(null);
          return;
        }
        const blob = res.data;
        const ct = blob.type || "";
        if (ct && !ct.startsWith("image/") && ct !== "application/octet-stream") {
          setAvatarResolvedSrc(null);
          return;
        }
        const u = URL.createObjectURL(blob);
        avatarBlobRevokeRef.current = u;
        setAvatarResolvedSrc(u);
      } catch {
        if (!ac.signal.aborted) setAvatarResolvedSrc(null);
      }
    })();

    return () => {
      ac.abort();
      if (avatarBlobRevokeRef.current) {
        URL.revokeObjectURL(avatarBlobRevokeRef.current);
        avatarBlobRevokeRef.current = null;
      }
      setAvatarResolvedSrc(null);
    };
  }, [avatarRawPath]);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const profile = await fetchProfile();
        setUser(profile);
      } catch {
        router.replace("/login");
      }
    };

    void loadProfile();
  }, [router, fetchProfile]);

  const startEditing = () => {
    if (!user) return;
    const g = String(user.gender ?? "").trim().toUpperCase();
    const genderNorm =
      g === "MALE" || g === "FEMALE" || g === "OTHER" ? g : "MALE";
    setFormData({
      ...user,
      gender: genderNorm,
      dob: toDateInput(user.dob),
    });
    setAddr({
      ...emptyAddr,
      streetAddress: user.address?.trim() || "",
    });
    setAddrPreview("");
    setHometownAddr({
      ...emptyAddr,
      streetAddress: user.hometown?.trim() || "",
    });
    setHometownPreview("");
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setFormData({});
    setAddr(emptyAddr);
    setAddrPreview("");
    setHometownAddr(emptyAddr);
    setHometownPreview("");
    setIsEditing(false);
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const permanentLine =
        addrPreview.trim() ||
        addr.streetAddress.trim() ||
        (formData.address ?? user.address).trim();
      const hometownLine =
        hometownPreview.trim() ||
        hometownAddr.streetAddress.trim() ||
        (formData.hometown ?? user.hometown).trim();
      const merged: Partial<ProfileData> = {
        ...user,
        ...formData,
        address: permanentLine,
        hometown: hometownLine,
      };
      const updated = await updateProfile(merged);
      setUser(updated);
      setIsEditing(false);
      setFormData({});
      setAddr(emptyAddr);
      setAddrPreview("");
      setHometownAddr(emptyAddr);
      setHometownPreview("");
    } catch {
      // toast từ AuthProvider
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarClick = () => {
    avatarInputRef.current?.click();
  };

  const handleAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Chỉ chấp nhận file ảnh");
      return;
    }
    const maxBytes = 2 * 1024 * 1024;
    if (file.size > maxBytes) {
      toast.error("Ảnh đại diện không được vượt quá 2MB");
      return;
    }
    setAvatarUploading(true);
    try {
      const { status } = await userService.uploadAvatar(file);
      if (typeof status === "number" && (status < 200 || status >= 300)) {
        toast.error("Cập nhật ảnh thất bại");
        return;
      }
      toast.success("Đã cập nhật ảnh đại diện");
      const profile = await fetchProfile();
      setUser(profile);
    } catch {
      toast.error("Không thể tải ảnh lên. Vui lòng thử lại.");
    } finally {
      setAvatarUploading(false);
    }
  };

  const fv = <K extends keyof ProfileData>(key: K): ProfileData[K] => {
    if (!user) return "" as ProfileData[K];
    const fromForm = formData[key];
    if (fromForm !== undefined) return fromForm as ProfileData[K];
    return user[key];
  };

  if (!user) {
    return <div className="min-h-0 flex-1 bg-background" />;
  }

  type MenuItem =
    | {
        icon: LucideIcon;
        label: string;
        description: string;
        href: string;
      }
    | {
        icon: LucideIcon;
        label: string;
        description: string;
        onClick: () => void;
      };

  const menuItems: MenuItem[] = [
    {
      icon: KeyRound,
      label: "Đổi mật khẩu",
      description: "Đặt lại mật khẩu qua email",
      onClick: () => setPasswordDialogOpen(true),
    },
    {
      icon: Send,
      label: "Viết hồ sơ chuyển Đảng",
      description: "Xin chuyển sinh hoạt đảng",
      onClick: () => setTransferDialogOpen(true),
    },
    {
      icon: Calendar,
      label: "Lịch sử điểm danh",
      description: "Thống kê tham gia họp",
      href: "/attendance-report",
    },
  ];

  return (
    <div className="min-h-0 flex-1 bg-muted/40 pb-20 md:pb-6">
      <main className="mx-auto max-w-4xl px-4 py-8">
        <Card className={cn(profileCardClass, "mb-6")}>
          <div className="relative">
            <div
              className="relative w-full min-h-[120px] aspect-820/312 max-h-[min(280px,42vh)] bg-cover bg-center bg-no-repeat sm:min-h-[160px]"
              style={{ backgroundImage: "url('/bg-profile.jpg')" }}
              role="presentation"
            />
            <div
              className="pointer-events-none absolute inset-0 bg-linear-to-t from-card via-card/25 to-muted/20"
              aria-hidden
            />
          </div>
          <CardContent className="relative z-10 pb-6 pt-5 sm:px-6">
            {/* Chỉ avatar kéo lên ảnh bìa — margin âm trên cả hàng sẽ đè phần họ tên */}
            <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-end sm:gap-6">
              <div className="relative -mt-14 shrink-0 sm:-mt-16">
                <Avatar className="h-28 w-28 border-4 border-card sm:h-32 sm:w-32">
                  <AvatarImage
                    src={avatarResolvedSrc ?? undefined}
                    alt=""
                  />
                  <AvatarFallback className="bg-primary text-2xl text-primary-foreground">
                    {(fv("name") || "?").toString().trim().charAt(0) || "?"}
                  </AvatarFallback>
                </Avatar>
                <button
                  type="button"
                  onClick={handleAvatarClick}
                  disabled={avatarUploading}
                  className="absolute bottom-0 right-0 rounded-full bg-primary p-1.5 text-primary-foreground disabled:opacity-50"
                >
                  {avatarUploading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Camera className="h-4 w-4" />
                  )}
                </button>
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarChange}
                />
              </div>
              <div className="flex-1 text-center sm:text-left">
                {isEditing ? (
                  <div className="space-y-2">
                    <Label className="text-xs">Họ và tên</Label>
                    <Input
                      value={String(fv("name"))}
                      onChange={(e) =>
                        setFormData((p) => ({ ...p, name: e.target.value }))
                      }
                    />
                  </div>
                ) : (
                  <h1 className="text-xl font-bold text-foreground">
                    {displayOrMissing(user.name)}
                  </h1>
                )}
                <div className="mt-2 flex flex-wrap justify-center gap-2 sm:justify-start">
                  <Badge className="bg-violet-100 text-violet-900" variant="secondary">
                    {profileRoleLabel(String(fv("role")))}
                  </Badge>
                </div>
              </div>
              {isEditing ? (
                <div className="flex gap-2">
                  <Button variant="outline" onClick={cancelEditing} disabled={saving}>
                    Hủy
                  </Button>
                  <Button onClick={() => void handleSave()} disabled={saving}>
                    {saving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Đang lưu…
                      </>
                    ) : (
                      "Lưu"
                    )}
                  </Button>
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

        <Card className={cn(profileCardClass, "mb-6")}>
          <CardHeader className={sectionHeaderClass}>
            <CardTitle className="flex items-center gap-2 text-base font-semibold tracking-tight">
              <User className="h-5 w-5 text-primary" />
              Thông tin cá nhân
            </CardTitle>
          </CardHeader>
          <CardContent className={cn(sectionBodyClass, "space-y-5")}>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5">
              <div className={fieldTileClass}>
                <div className="flex items-start gap-3">
                  <Mail className="mt-0.5 h-5 w-5 shrink-0 text-primary/80" />
                  <div className="min-w-0 flex-1">
                    <Label className="text-muted-foreground">Email</Label>
                    <p className="font-medium">{displayOrMissing(user.email)}</p>
                    <Button
                      type="button"
                      variant="link"
                      className="h-auto p-0 text-sm"
                      onClick={() => setEmailDialogOpen(true)}
                    >
                      Đổi email
                    </Button>
                  </div>
                </div>
              </div>
              <div className={fieldTileClass}>
                <div className="flex items-start gap-3">
                  <Phone className="mt-0.5 h-5 w-5 shrink-0 text-primary/80" />
                  <div className="min-w-0 flex-1">
                    <Label className="text-muted-foreground">Số điện thoại</Label>
                    {isEditing ? (
                      <Input
                        className="mt-1"
                        type="tel"
                        value={String(fv("phone"))}
                        onChange={(e) =>
                          setFormData((p) => ({ ...p, phone: e.target.value }))
                        }
                      />
                    ) : (
                      <p className="font-medium">{displayOrMissing(user.phone)}</p>
                    )}
                  </div>
                </div>
              </div>
              <div className={fieldTileWideClass}>
                <div className="flex items-start gap-3">
                  <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-primary/80" />
                  <div className="min-w-0 flex-1 space-y-2">
                    <Label className="text-muted-foreground">Quê quán</Label>
                    {isEditing ? (
                      <VietnamAddressFields
                        value={hometownAddr}
                        onChange={setHometownAddr}
                        onCompositeChange={setHometownPreview}
                        fullAddressLabel="Quê quán (đầy đủ)"
                      />
                    ) : (
                      <p className="font-medium">
                        {displayOrMissing(user.hometown)}
                      </p>
                    )}
                  </div>
                </div>
              </div>
              <div className={fieldTileWideClass}>
                <div className="flex items-start gap-3">
                  <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-primary/80" />
                  <div className="min-w-0 flex-1 space-y-2">
                    <Label className="text-muted-foreground">
                      Địa chỉ thường trú
                    </Label>
                    {isEditing ? (
                      <VietnamAddressFields
                        value={addr}
                        onChange={setAddr}
                        onCompositeChange={setAddrPreview}
                        fullAddressLabel="Địa chỉ thường trú (đầy đủ)"
                      />
                    ) : (
                      <p className="font-medium">
                        {displayOrMissing(user.address)}
                      </p>
                    )}
                  </div>
                </div>
              </div>
              <div className={fieldTileClass}>
                <div className="flex items-start gap-3">
                  <Calendar className="mt-0.5 h-5 w-5 shrink-0 text-primary/80" />
                  <div className="min-w-0 flex-1">
                    <Label className="text-muted-foreground">Ngày sinh</Label>
                    {isEditing ? (
                      <Input
                        className="mt-1"
                        type="date"
                        value={String(fv("dob"))}
                        onChange={(e) =>
                          setFormData((p) => ({ ...p, dob: e.target.value }))
                        }
                      />
                    ) : (
                      <p className="font-medium">{displayIsoDate(user.dob)}</p>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex gap-3 rounded-lg border border-border/60 bg-muted/25 p-4 shadow-sm">
                <UserRound className="mt-0.5 h-5 w-5 shrink-0 text-primary/90" />
                <div className="min-w-0 flex-1 space-y-2">
                  <Label className="text-muted-foreground">Giới tính</Label>
                  {isEditing ? (
                    <Select
                      value={
                        ["MALE", "FEMALE", "OTHER"].includes(
                          String(fv("gender")).toUpperCase(),
                        )
                          ? String(fv("gender")).toUpperCase()
                          : "MALE"
                      }
                      onValueChange={(v) =>
                        setFormData((p) => ({ ...p, gender: v }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="MALE">Nam</SelectItem>
                        <SelectItem value="FEMALE">Nữ</SelectItem>
                        <SelectItem value="OTHER">Khác</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <p className="font-medium">{displayGender(user.gender)}</p>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={cn(profileCardClass, "mb-6")}>
          <CardHeader className={sectionHeaderClass}>
            <CardTitle className="flex items-center gap-2 text-base font-semibold tracking-tight">
              <Shield className="h-5 w-5 text-primary" />
              Thông tin Đảng viên
            </CardTitle>
          </CardHeader>
          <CardContent className={cn(sectionBodyClass, "space-y-4")}>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4">
              <div
                className={cn(
                  fieldTileWideClass,
                  "border-primary/25 bg-primary/5",
                )}
              >
                <div className="flex items-start gap-3">
                  <Shield className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="text-sm text-muted-foreground">Vai trò (hiển thị)</p>
                    <p className="font-medium">
                      {displayOrMissing(profileRoleLabel(String(fv("role"))))}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Mã: {displayOrMissing(String(fv("roleCode")))}
                    </p>
                  </div>
                </div>
              </div>

              <div className={fieldTileClass}>
                <div className="flex items-start gap-3">
                  <Users className="mt-0.5 h-5 w-5 shrink-0 text-primary/80" />
                  <div className="min-w-0 flex-1 space-y-2">
                    <p className="text-sm text-muted-foreground">Đối tượng</p>
                {isEditing ? (
                  <Select
                    value={String(fv("objectType"))}
                    onValueChange={(v) =>
                      setFormData((p) => ({ ...p, objectType: v }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn" />
                    </SelectTrigger>
                    <SelectContent>
                      {(() => {
                        const c = String(fv("objectType"));
                        const known = targetGroupOptions.some((o) => o.value === c);
                        return (
                          <>
                            {!known && c.trim() ? (
                              <SelectItem value={c}>{c}</SelectItem>
                            ) : null}
                            {targetGroupOptions.map((o) => (
                              <SelectItem key={o.value} value={o.value}>
                                {o.label}
                              </SelectItem>
                            ))}
                          </>
                        );
                      })()}
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="font-medium">{displayOrMissing(user.objectType)}</p>
                )}
                  </div>
                </div>
              </div>

              <div className={fieldTileClass}>
                <div className="flex items-start gap-3">
                  <GraduationCap className="mt-0.5 h-5 w-5 shrink-0 text-primary/80" />
                  <div className="min-w-0 flex-1 space-y-2">
                    <p className="text-sm text-muted-foreground">Trình độ học vấn</p>
                {isEditing ? (
                  <Select
                    value={String(fv("education"))}
                    onValueChange={(v) =>
                      setFormData((p) => ({ ...p, education: v }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn" />
                    </SelectTrigger>
                    <SelectContent>
                      {(() => {
                        const c = String(fv("education"));
                        const known = academicLevelOptions.some((o) => o === c);
                        return (
                          <>
                            {!known && c.trim() ? (
                              <SelectItem value={c}>{c}</SelectItem>
                            ) : null}
                            {academicLevelOptions.map((o) => (
                              <SelectItem key={o} value={o}>
                                {o}
                              </SelectItem>
                            ))}
                          </>
                        );
                      })()}
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="font-medium">{displayOrMissing(user.education)}</p>
                )}
                  </div>
                </div>
              </div>

              <div className={fieldTileClass}>
                <div className="flex items-start gap-3">
                  <Flag className="mt-0.5 h-5 w-5 shrink-0 text-primary/80" />
                  <div className="min-w-0 flex-1 space-y-2">
                    <p className="text-sm text-muted-foreground">Ngày vào Đảng</p>
                {isEditing ? (
                  <Input
                    type="date"
                    value={toDateInput(String(fv("joinDate")))}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, joinDate: e.target.value }))
                    }
                  />
                ) : (
                  <p className="font-medium">{displayIsoDate(user.joinDate)}</p>
                )}
                  </div>
                </div>
              </div>

              <div className={fieldTileClass}>
                <div className="flex items-start gap-3">
                  <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-primary/80" />
                  <div className="min-w-0 flex-1 space-y-2">
                    <p className="text-sm text-muted-foreground">Ngày chính thức</p>
                {isEditing ? (
                  <Input
                    type="date"
                    value={toDateInput(String(fv("officialDate")))}
                    onChange={(e) =>
                      setFormData((p) => ({
                        ...p,
                        officialDate: e.target.value,
                      }))
                    }
                  />
                ) : (
                  <p className="font-medium">{displayIsoDate(user.officialDate)}</p>
                )}
                  </div>
                </div>
              </div>

              <div className={fieldTileClass}>
                <div className="flex items-start gap-3">
                  <BookOpen className="mt-0.5 h-5 w-5 shrink-0 text-primary/80" />
                  <div className="min-w-0 flex-1 space-y-2">
                    <p className="text-sm text-muted-foreground">
                      Trình độ lý luận chính trị
                    </p>
                {isEditing ? (
                  <Select
                    value={String(fv("politicalTheoryLevel"))}
                    onValueChange={(v) =>
                      setFormData((p) => ({
                        ...p,
                        politicalTheoryLevel: v,
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn" />
                    </SelectTrigger>
                    <SelectContent>
                      {(() => {
                        const c = String(fv("politicalTheoryLevel"));
                        const known = politicalTheoryLevelOptions.some(
                          (o) => o === c,
                        );
                        return (
                          <>
                            {!known && c.trim() ? (
                              <SelectItem value={c}>{c}</SelectItem>
                            ) : null}
                            {politicalTheoryLevelOptions.map((o) => (
                              <SelectItem key={o} value={o}>
                                {o}
                              </SelectItem>
                            ))}
                          </>
                        );
                      })()}
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="font-medium">
                    {displayOrMissing(user.politicalTheoryLevel)}
                  </p>
                )}
                  </div>
                </div>
              </div>

              <div className={fieldTileClass}>
                <div className="flex items-start gap-3">
                  <Globe className="mt-0.5 h-5 w-5 shrink-0 text-primary/80" />
                  <div className="min-w-0 flex-1 space-y-2">
                    <p className="text-sm text-muted-foreground">Dân tộc</p>
                {isEditing ? (
                  <Input
                    value={String(fv("ethnicity"))}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, ethnicity: e.target.value }))
                    }
                  />
                ) : (
                  <p className="font-medium">{displayOrMissing(user.ethnicity)}</p>
                )}
                  </div>
                </div>
              </div>

              <div className={fieldTileClass}>
                <div className="flex items-start gap-3">
                  <Landmark className="mt-0.5 h-5 w-5 shrink-0 text-primary/80" />
                  <div className="min-w-0 flex-1 space-y-2">
                    <p className="text-sm text-muted-foreground">Tôn giáo</p>
                {isEditing ? (
                  <Input
                    value={String(fv("religion"))}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, religion: e.target.value }))
                    }
                  />
                ) : (
                  <p className="font-medium">{displayOrMissing(user.religion)}</p>
                )}
                  </div>
                </div>
              </div>

              <div className={fieldTileWideClass}>
                <div className="flex items-start gap-3">
                  <Building2 className="mt-0.5 h-5 w-5 shrink-0 text-primary/80" />
                  <div className="min-w-0 flex-1 space-y-2">
                    <p className="text-sm text-muted-foreground">Chi bộ (tên)</p>
                    <p className="font-medium">{displayOrMissing(user.branch)}</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={cn(profileCardClass, "mb-6")}>
          <CardHeader className={sectionHeaderClass}>
            <CardTitle className="flex items-center gap-2 text-base font-semibold tracking-tight">
              <Sparkles className="h-5 w-5 text-primary" />
              Tiện ích
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {menuItems.map((item, index) => (
              <div key={item.label}>
                {"href" in item ? (
                  <Link
                    href={item.href}
                    className="flex items-center justify-between px-5 py-4 transition-colors hover:bg-muted/55 sm:px-6"
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
                    className="flex w-full items-center justify-between px-5 py-4 text-left transition-colors hover:bg-muted/55 sm:px-6"
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
          </CardContent>
        </Card>

        <TransferDialog
          open={transferDialogOpen}
          onClose={() => setTransferDialogOpen(false)}
        />
        <ChangePasswordDialog
          open={passwordDialogOpen}
          onOpenChange={setPasswordDialogOpen}
          accountEmail={user.email}
        />
        <ChangeEmailDialog
          open={emailDialogOpen}
          onOpenChange={setEmailDialogOpen}
          currentEmail={user.email}
          onSuccess={async () => {
            const profile = await fetchProfile();
            setUser(profile);
          }}
        />
      </main>
      <BottomNav />
    </div>
  );
}
