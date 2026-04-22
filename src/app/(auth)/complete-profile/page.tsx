"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import axios from "axios";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
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
import {
  academicLevelOptions,
  DEFAULT_PARTY_CELL_ID,
  politicalTheoryLevelOptions,
  targetGroupOptions,
} from "@/lib/profileFormOptions";

const UUID_LIKE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isAtLeast18YearsOld(value: string) {
  const dob = new Date(value);
  if (Number.isNaN(dob.getTime())) return false;

  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age -= 1;
  }

  return age >= 18;
}

const personalInfoSchema = z.object({
  fullName: z.string().trim().min(1, "Vui lòng nhập họ và tên"),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]),
  dateOfBirth: z
    .string()
    .trim()
    .min(1, "Vui lòng chọn ngày sinh")
    .refine(isAtLeast18YearsOld, "Người dùng phải đủ 18 tuổi"),
  hometown: z.string().trim().min(1, "Vui lòng nhập quê quán"),
  phone: z.string().trim().min(1, "Vui lòng nhập số điện thoại"),
  ethnicity: z.string().trim().min(1, "Vui lòng nhập dân tộc"),
  religion: z.string().trim().min(1, "Vui lòng nhập tôn giáo"),
});

const educationSchema = z.object({
  targetGroup: z.string().trim().min(1, "Vui lòng nhập đối tượng"),
  academicLevel: z.string().trim().min(1, "Vui lòng nhập trình độ học vấn"),
  politicalTheoryLevel: z
    .string()
    .trim()
    .min(1, "Vui lòng nhập trình độ lý luận chính trị"),
  partyCellId: z
    .string()
    .trim()
    .regex(UUID_LIKE, "Mã chi bộ không đúng định dạng UUID"),
});

const passwordSchema = z
  .object({
    newPassword: z
      .string()
      .min(6, "Mật khẩu phải có ít nhất 6 ký tự"),
    confirmPassword: z.string().min(1, "Vui lòng xác nhận mật khẩu"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Mật khẩu xác nhận không khớp",
    path: ["confirmPassword"],
  });

const stepTitles = [
  "Thông tin cá nhân",
  "Học vấn & đối tượng",
  "Cập nhật mật khẩu mới",
] as const;

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

function normalizeTargetGroup(raw: string | null | undefined): string {
  const value = (raw ?? "").trim();
  if (
    value === "CBGV FPTU (Cán bộ giảng viên Đại học FPT)" ||
    value === "CBGV FPTU"
  ) {
    return "CBGV FPTU";
  }
  return value;
}

export default function CompleteProfilePage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [step, setStep] = useState(0);
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
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const personalInfoResult = personalInfoSchema.safeParse({
    fullName,
    gender,
    dateOfBirth,
    hometown,
    phone,
    ethnicity,
    religion,
  });
  const educationResult = educationSchema.safeParse({
    targetGroup,
    academicLevel,
    politicalTheoryLevel,
    partyCellId: partyCellId.trim() || DEFAULT_PARTY_CELL_ID,
  });
  const passwordResult = passwordSchema.safeParse({
    newPassword,
    confirmPassword,
  });

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
        setTargetGroup(normalizeTargetGroup(me.targetGroup));
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

  const handleFinalSubmit = async () => {
    if (!personalInfoResult.success) {
      toast.error(personalInfoResult.error.issues[0]?.message ?? "Thông tin cá nhân chưa hợp lệ");
      setStep(0);
      return;
    }
    if (!educationResult.success) {
      toast.error(educationResult.error.issues[0]?.message ?? "Thông tin học vấn chưa hợp lệ");
      setStep(1);
      return;
    }
    if (!passwordResult.success) {
      toast.error(passwordResult.error.issues[0]?.message ?? "Mật khẩu chưa hợp lệ");
      setStep(2);
      return;
    }

    const resolvedPartyCellId = partyCellId.trim() || DEFAULT_PARTY_CELL_ID;
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

  const personalInfoErrors = personalInfoResult.success
    ? {}
    : personalInfoResult.error.flatten().fieldErrors;
  const educationErrors = educationResult.success
    ? {}
    : educationResult.error.flatten().fieldErrors;
  const passwordErrors = passwordResult.success
    ? {}
    : passwordResult.error.flatten().fieldErrors;

  const isStepValid = [
    personalInfoResult.success,
    educationResult.success,
    passwordResult.success,
  ][step];

  const handleNextStep = () => {
    if (step === 0 && !personalInfoResult.success) {
      toast.error(personalInfoResult.error.issues[0]?.message ?? "Thông tin cá nhân chưa hợp lệ");
      return;
    }
    if (step === 1 && !educationResult.success) {
      toast.error(educationResult.error.issues[0]?.message ?? "Thông tin học vấn chưa hợp lệ");
      return;
    }
    setStep((prev) => Math.min(prev + 1, 2));
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
          <div className="grid grid-cols-3 gap-2 pt-3">
            {stepTitles.map((title, index) => (
              <div
                key={title}
                className={cn(
                  "rounded-md border px-3 py-2 text-center text-sm",
                  index === step && "border-primary bg-primary/5 text-primary",
                )}
              >
                <p className="font-medium">Bước {index + 1}</p>
                <p className="text-xs">{title}</p>
              </div>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-6"
            onSubmit={(e) => {
              e.preventDefault();
            }}
          >
            {step === 0 && (
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
                    {personalInfoErrors.fullName?.[0] && (
                      <p className="text-sm text-destructive">
                        {personalInfoErrors.fullName[0]}
                      </p>
                    )}
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
                    {personalInfoErrors.dateOfBirth?.[0] && (
                      <p className="text-sm text-destructive">
                        {personalInfoErrors.dateOfBirth[0]}
                      </p>
                    )}
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
                    {personalInfoErrors.hometown?.[0] && (
                      <p className="text-sm text-destructive">
                        {personalInfoErrors.hometown[0]}
                      </p>
                    )}
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
                    {personalInfoErrors.phone?.[0] && (
                      <p className="text-sm text-destructive">
                        {personalInfoErrors.phone[0]}
                      </p>
                    )}
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
                    {personalInfoErrors.ethnicity?.[0] && (
                      <p className="text-sm text-destructive">
                        {personalInfoErrors.ethnicity[0]}
                      </p>
                    )}
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
                    {personalInfoErrors.religion?.[0] && (
                      <p className="text-sm text-destructive">
                        {personalInfoErrors.religion[0]}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {step === 1 && (
              <div className="space-y-4">
                <p className="text-sm font-medium text-foreground">
                  Học vấn & đối tượng
                </p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Đối tượng</Label>
                    <Select
                      value={targetGroup}
                      onValueChange={setTargetGroup}
                    >
                      <SelectTrigger
                        className={cn(authInputClassName, "h-10 w-full")}
                      >
                        <SelectValue placeholder="Chọn đối tượng" />
                      </SelectTrigger>
                      <SelectContent>
                        {targetGroupOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {educationErrors.targetGroup?.[0] && (
                      <p className="text-sm text-destructive">
                        {educationErrors.targetGroup[0]}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Trình độ học vấn</Label>
                    <Select
                      value={academicLevel}
                      onValueChange={setAcademicLevel}
                    >
                      <SelectTrigger
                        className={cn(authInputClassName, "h-10 w-full")}
                      >
                        <SelectValue placeholder="Chọn trình độ học vấn" />
                      </SelectTrigger>
                      <SelectContent>
                        {academicLevelOptions.map((option) => (
                          <SelectItem key={option} value={option}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {educationErrors.academicLevel?.[0] && (
                      <p className="text-sm text-destructive">
                        {educationErrors.academicLevel[0]}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label>Trình độ lý luận chính trị</Label>
                    <Select
                      value={politicalTheoryLevel}
                      onValueChange={setPoliticalTheoryLevel}
                    >
                      <SelectTrigger
                        className={cn(authInputClassName, "h-10 w-full")}
                      >
                        <SelectValue placeholder="Chọn trình độ lý luận chính trị" />
                      </SelectTrigger>
                      <SelectContent>
                        {politicalTheoryLevelOptions.map((option) => (
                          <SelectItem key={option} value={option}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {educationErrors.politicalTheoryLevel?.[0] && (
                      <p className="text-sm text-destructive">
                        {educationErrors.politicalTheoryLevel[0]}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <p className="text-sm font-medium text-foreground">
                  Cập nhật mật khẩu mới
                </p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">Mật khẩu mới</Label>
                    <div className="relative">
                      <Input
                        id="newPassword"
                        type={showNewPassword ? "text" : "password"}
                        className={cn(authInputClassName, "pr-11")}
                        value={newPassword}
                        onChange={(ev) => setNewPassword(ev.target.value)}
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword((prev) => !prev)}
                        className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-muted-foreground"
                        aria-label={
                          showNewPassword ? "Ẩn mật khẩu mới" : "Hiện mật khẩu mới"
                        }
                      >
                        {showNewPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                    {passwordErrors.newPassword?.[0] && (
                      <p className="text-sm text-destructive">
                        {passwordErrors.newPassword[0]}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Xác nhận mật khẩu</Label>
                    <div className="relative">
                      <Input
                        id="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        className={cn(authInputClassName, "pr-11")}
                        value={confirmPassword}
                        onChange={(ev) => setConfirmPassword(ev.target.value)}
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword((prev) => !prev)}
                        className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-muted-foreground"
                        aria-label={
                          showConfirmPassword
                            ? "Ẩn xác nhận mật khẩu"
                            : "Hiện xác nhận mật khẩu"
                        }
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                    {passwordErrors.confirmPassword?.[0] && (
                      <p className="text-sm text-destructive">
                        {passwordErrors.confirmPassword[0]}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            <input
              type="hidden"
              name="partyCellId"
              value={partyCellId || DEFAULT_PARTY_CELL_ID}
              readOnly
            />

            <div className="flex gap-3">
              {step > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setStep((prev) => Math.max(prev - 1, 0))}
                >
                  Quay lại
                </Button>
              )}
              {step < 2 ? (
                <Button
                  type="button"
                  className="flex-1"
                  disabled={!isStepValid}
                  onClick={handleNextStep}
                >
                  Xác nhận
                </Button>
              ) : (
                <Button
                  type="button"
                  className="flex-1"
                  disabled={!isStepValid || isSubmitting}
                  onClick={() => void handleFinalSubmit()}
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
              )}
            </div>

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
