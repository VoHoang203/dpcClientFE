"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, KeyRound, Loader2, Lock, Mail } from "lucide-react";
import axios from "axios";
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
import { userService } from "@/services/userService";
import {
  authCardClassName,
  authHeadingClassName,
  authInputClassName,
  authSubheadingClassName,
} from "@/app/(auth)/auth-ui";

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

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  /** Sau khi POST forgot-password thành công — hiển thị form đặt lại mật khẩu (vẫn /forgot-password). */
  const [emailSent, setEmailSent] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSendingEmail(true);
    try {
      const { status } = await userService.forgotPassword({ email: email.trim() });
      if (!isSuccessStatus(status)) {
        toast.error("Gửi email thất bại", {
          description: "Máy chủ trả về phản hồi không thành công.",
        });
        return;
      }
      toast.success("Đã gửi email", {
        description: "Kiểm tra hộp thư và làm theo hướng dẫn, sau đó nhập mã và mật khẩu mới bên dưới.",
      });
      setEmailSent(true);
    } catch (error: unknown) {
      toast.error("Gửi email thất bại", {
        description: apiErrorMessage(error, "Không thể gửi yêu cầu khôi phục mật khẩu."),
      });
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error("Mật khẩu xác nhận không khớp");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("Mật khẩu phải có ít nhất 6 ký tự");
      return;
    }
    setIsResetting(true);
    try {
      const { status } = await userService.resetPassword({
        token: token.trim(),
        newPassword,
      });
      if (!isSuccessStatus(status)) {
        toast.error("Đặt lại mật khẩu thất bại", {
          description: "Máy chủ trả về phản hồi không thành công.",
        });
        return;
      }
      toast.success("Đặt lại mật khẩu thành công", {
        description: "Bạn có thể đăng nhập bằng mật khẩu mới.",
      });
      window.location.href = "/login";
    } catch (error: unknown) {
      toast.error("Đặt lại mật khẩu thất bại", {
        description: apiErrorMessage(error, "Không thể đặt lại mật khẩu."),
      });
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg ring-2 ring-white/30">
            <span className="text-2xl font-bold">ĐV</span>
          </div>
          <h1 className={`text-2xl font-bold ${authHeadingClassName}`}>
            Quên mật khẩu
          </h1>
          <p className={`mt-1 ${authSubheadingClassName}`}>
            Khôi phục mật khẩu của bạn
          </p>
        </div>

        <Card className={authCardClassName}>
          <CardHeader className="space-y-1">
            <CardTitle className="text-xl">
              {!emailSent
                ? "Đặt lại mật khẩu"
                : "Nhập mã và mật khẩu mới"}
            </CardTitle>
            <CardDescription>
              {!emailSent
                ? "Nhập email để nhận hướng dẫn đặt lại mật khẩu"
                : `Đã gửi hướng dẫn tới ${email}. Dán mã (token) từ email, rồi đặt mật khẩu mới.`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!emailSent ? (
              <form onSubmit={handleSendEmail} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="Nhập email của bạn"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className={`pl-10 ${authInputClassName}`}
                      required
                      disabled={isSendingEmail}
                      autoComplete="email"
                    />
                  </div>
                </div>

                <Button type="submit" className="w-full" disabled={isSendingEmail}>
                  {isSendingEmail ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Đang gửi...
                    </>
                  ) : (
                    "Gửi link đặt lại"
                  )}
                </Button>

                <Button asChild variant="ghost" className="w-full" type="button">
                  <Link href="/login">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Quay lại đăng nhập
                  </Link>
                </Button>
              </form>
            ) : (
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="token">Mã xác nhận (token)</Label>
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="token"
                      type="text"
                      placeholder="Dán mã từ email"
                      value={token}
                      onChange={(e) => setToken(e.target.value)}
                      className={`pl-10 font-mono text-sm ${authInputClassName}`}
                      required
                      disabled={isResetting}
                      autoComplete="one-time-code"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="newPassword">Mật khẩu mới</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="newPassword"
                      type="password"
                      placeholder="Mật khẩu mới"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className={`pl-10 ${authInputClassName}`}
                      required
                      minLength={6}
                      disabled={isResetting}
                      autoComplete="new-password"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Xác nhận mật khẩu</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="confirmPassword"
                      type="password"
                      placeholder="Nhập lại mật khẩu mới"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className={`pl-10 ${authInputClassName}`}
                      required
                      minLength={6}
                      disabled={isResetting}
                      autoComplete="new-password"
                    />
                  </div>
                </div>

                <Button type="submit" className="w-full" disabled={isResetting}>
                  {isResetting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Đang xác nhận...
                    </>
                  ) : (
                    "Xác nhận đặt lại mật khẩu"
                  )}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  disabled={isResetting}
                  onClick={() => {
                    setEmailSent(false);
                    setToken("");
                    setNewPassword("");
                    setConfirmPassword("");
                  }}
                >
                  Gửi lại email
                </Button>

                <Button asChild variant="ghost" className="w-full" type="button">
                  <Link href="/login">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Quay lại đăng nhập
                  </Link>
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
    </div>
  );
}
