"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import axios from "axios";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AuthBrandLogo } from "@/components/auth/AuthBrandLogo";
import { cn } from "@/lib/utils";
import {
  authCardClassName,
  authHeadingClassName,
  authInputClassName,
  authSubheadingClassName,
} from "@/app/(auth)/auth-ui";
import { authService } from "@/services/authService";
import { userService } from "@/services/userService";
import type { CompleteProfilePayload } from "@/services/userService";

const UUID_LIKE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const DEFAULT_PARTY_CELL_ID = "4dc9d414-0e5d-47dc-828a-e0a249b2b888";

function apiErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { message?: string } | undefined;
    if (data?.message && typeof data.message === "string") return data.message;
  }
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

function isSuccessStatus(status: number | undefined): boolean {
  return typeof status === "number" && status >= 200 && status < 300;
}

function normalizeGender(
  raw: string | null | undefined
): CompleteProfilePayload["gender"] {
  const u = (raw ?? "").toUpperCase();
  if (u === "FEMALE" || u === "MALE" || u === "OTHER") return u;
  return "MALE";
}

function dobToDateInput(dob: string | null | undefined): string {
  if (!dob) return "";
  const s = dob.trim();
  if (s.length >= 10) return s.slice(0, 10);
  return s;
}

export default function CompleteProfilePage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [fullName, setFullName] = useState("");
  const [gender, setGender] = useState<CompleteProfilePayload["gender"]>("MALE");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [hometown, setHometown] = useState("");
  const [phone, setPhone] = useState("");
  const [ethnicity, setEthnicity] = useState("");
  const [religion, setReligion] = useState("");
  const [targetGroup, setTargetGroup] = useState("");
  const [academicLevel, setAcademicLevel] = useState("");
  const [politicalTheoryLevel, setPoliticalTheoryLevel] = useState("");
  const [partyCellId, setPartyCellId] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!localStorage.getItem("accessToken")) {
        router.replace("/login");
        return;
      }
      try {
        const me = await authService.fetchMe();
        if (cancelled) return;
        setFullName(me.fullName ?? "");
        setGender(normalizeGender(me.gender));
        setDateOfBirth(dobToDateInput(me.dob));
        setHometown(me.hometown ?? "");
        setPhone(me.phone ?? "");
        setEthnicity(me.ethnicity ?? "");
        setReligion(me.religion ?? "");
        setTargetGroup(me.targetGroup ?? "");
        setAcademicLevel(me.academicLevel ?? "");
        setPoliticalTheoryLevel(me.politicalTheoryLevel ?? "");
        setPartyCellId(me.partyCell?.id ?? DEFAULT_PARTY_CELL_ID);
      } catch {
        if (!cancelled) {
          toast.message("Không tải được dữ liệu hồ sơ", {
            description: "Bạn vẫn có thể điền form và gửi.",
          });
        }
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      toast.error("Vui lòng nhập họ và tên");
      return;
    }
    if (!dateOfBirth.trim()) {
      toast.error("Vui lòng chọn ngày sinh");
      return;
    }
    const resolvedPartyCellId = partyCellId.trim() || DEFAULT_PARTY_CELL_ID;
    if (!UUID_LIKE.test(resolvedPartyCellId)) {
      toast.error("Mã chi bộ không đúng định dạng UUID");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Mật khẩu xác nhận không khớp");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("Mật khẩu phải có ít nhất 6 ký tự");
      return;
    }

    const payload: CompleteProfilePayload = {
      fullName: fullName.trim(),
      gender,
      dateOfBirth: dateOfBirth.trim(),
      hometown: hometown.trim(),
      phone: phone.trim(),
      newPassword,
      confirmPassword,
      ethnicity: ethnicity.trim(),
      religion: religion.trim(),
      targetGroup: targetGroup.trim(),
      academicLevel: academicLevel.trim(),
      politicalTheoryLevel: politicalTheoryLevel.trim(),
      partyCellId: resolvedPartyCellId,
    };

    setIsSubmitting(true);
    try {
      const { status } = await userService.completeProfile(payload);
      if (!isSuccessStatus(status)) {
        toast.error("Hoàn hồ sơ thất bại", {
          description: "Máy chủ trả về phản hồi không thành công.",
        });
        return;
      }
      toast.success("Đã hoàn thành hồ sơ", {
        description: "Đang chuyển về trang chủ.",
      });
      await authService.ensureHeaderUser();
      window.location.href = "/";
    } catch (error: unknown) {
      toast.error("Hoàn hồ sơ thất bại", {
        description: apiErrorMessage(error, "Không thể gửi yêu cầu hoàn hồ sơ."),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!ready) {
    return (
      <div className="flex w-full max-w-2xl flex-col items-center justify-center py-16">
        <Loader2 className="size-10 animate-spin text-primary" aria-hidden />
        <p className="mt-4 text-sm text-muted-foreground">Đang tải…</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl">
      <div className="mb-6 text-center">
        <div className="mb-4 flex justify-center">
          <AuthBrandLogo />
        </div>
        <h1 className={`text-2xl font-bold ${authHeadingClassName}`}>
          Hoàn thiện hồ sơ
        </h1>
        <p className={`mt-1 ${authSubheadingClassName}`}>
          Điền thông tin và đặt mật khẩu mới theo yêu cầu hệ thống
        </p>
      </div>

      <Card className={authCardClassName}>
        <CardHeader className="space-y-1 pb-4">
          <CardTitle className="text-lg">Thông tin tài khoản</CardTitle>
          <CardDescription>
            Các trường bắt buộc: họ tên, ngày sinh, mã chi bộ (UUID), mật khẩu.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <p className="text-sm font-medium text-foreground">
                Thông tin cá nhân
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="fullName">Họ và tên</Label>
                  <Input
                    id="fullName"
                    className={authInputClassName}
                    value={fullName}
                    onChange={(ev) => setFullName(ev.target.value)}
                    autoComplete="name"
                    placeholder="Nguyễn Văn A"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Giới tính</Label>
                  <Select
                    value={gender}
                    onValueChange={(v) =>
                      setGender(v as CompleteProfilePayload["gender"])
                    }
                  >
                    <SelectTrigger
                      className={cn(authInputClassName, "h-10 w-full")}
                    >
                      <SelectValue placeholder="Chọn" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MALE">Nam</SelectItem>
                      <SelectItem value="FEMALE">Nữ</SelectItem>
                      <SelectItem value="OTHER">Khác</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dateOfBirth">Ngày sinh</Label>
                  <Input
                    id="dateOfBirth"
                    type="date"
                    className={authInputClassName}
                    value={dateOfBirth}
                    onChange={(ev) => setDateOfBirth(ev.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="hometown">Quê quán</Label>
                  <Input
                    id="hometown"
                    className={authInputClassName}
                    value={hometown}
                    onChange={(ev) => setHometown(ev.target.value)}
                    placeholder="Hà Nội"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Số điện thoại</Label>
                  <Input
                    id="phone"
                    type="tel"
                    className={authInputClassName}
                    value={phone}
                    onChange={(ev) => setPhone(ev.target.value)}
                    placeholder="0987654321"
                    autoComplete="tel"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ethnicity">Dân tộc</Label>
                  <Input
                    id="ethnicity"
                    className={authInputClassName}
                    value={ethnicity}
                    onChange={(ev) => setEthnicity(ev.target.value)}
                    placeholder="Kinh"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="religion">Tôn giáo</Label>
                  <Input
                    id="religion"
                    className={authInputClassName}
                    value={religion}
                    onChange={(ev) => setReligion(ev.target.value)}
                    placeholder="Không"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <p className="text-sm font-medium text-foreground">
                Học vấn & đối tượng
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="targetGroup">Đối tượng</Label>
                  <Input
                    id="targetGroup"
                    className={authInputClassName}
                    value={targetGroup}
                    onChange={(ev) => setTargetGroup(ev.target.value)}
                    placeholder="CBGV FPTU"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="academicLevel">Trình độ học vấn</Label>
                  <Input
                    id="academicLevel"
                    className={authInputClassName}
                    value={academicLevel}
                    onChange={(ev) => setAcademicLevel(ev.target.value)}
                    placeholder="Thạc sĩ"
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="politicalTheoryLevel">
                    Trình độ lý luận chính trị
                  </Label>
                  <Input
                    id="politicalTheoryLevel"
                    className={authInputClassName}
                    value={politicalTheoryLevel}
                    onChange={(ev) => setPoliticalTheoryLevel(ev.target.value)}
                    placeholder="Sơ cấp"
                  />
                </div>
              </div>
            </div>

            <input
              type="hidden"
              name="partyCellId"
              value={partyCellId || DEFAULT_PARTY_CELL_ID}
              readOnly
            />

            <div className="space-y-4">
              <p className="text-sm font-medium text-foreground">Mật khẩu mới</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="newPassword">Mật khẩu mới</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    className={authInputClassName}
                    value={newPassword}
                    onChange={(ev) => setNewPassword(ev.target.value)}
                    autoComplete="new-password"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Xác nhận mật khẩu</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    className={authInputClassName}
                    value={confirmPassword}
                    onChange={(ev) => setConfirmPassword(ev.target.value)}
                    autoComplete="new-password"
                  />
                </div>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Đang gửi…
                </>
              ) : (
                "Hoàn tất hồ sơ"
              )}
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              <Link href="/" className="text-primary underline-offset-4 hover:underline">
                Quay lại trang chủ
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
