"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { Eye, EyeOff, KeyRound, Loader2, Lock, Mail } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { userService } from "@/services/userService";

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

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Email đăng nhập hiện tại — có thì bước 1 không nhập tay, chỉ gửi mã về email này. */
  accountEmail?: string;
};

export function ChangePasswordDialog({
  open,
  onOpenChange,
  accountEmail,
}: Props) {
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [emailSent, setEmailSent] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const lockedEmail = String(accountEmail ?? "").trim();

  useEffect(() => {
    if (!open) {
      setEmail("");
      setToken("");
      setNewPassword("");
      setConfirmPassword("");
      setEmailSent(false);
      setShowNewPassword(false);
      setShowConfirmPassword(false);
      return;
    }
    if (lockedEmail) {
      setEmail(lockedEmail);
    }
  }, [open, lockedEmail]);

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    const toSend = lockedEmail || email.trim();
    if (!toSend) {
      toast.error("Thiếu email");
      return;
    }
    setIsSendingEmail(true);
    try {
      const { status } = await userService.forgotPassword({ email: toSend });
      if (!isSuccessStatus(status)) {
        toast.error("Gửi email thất bại", {
          description: "Máy chủ trả về phản hồi không thành công.",
        });
        return;
      }
      toast.success("Đã gửi email", {
        description:
          "Kiểm tra hộp thư, sau đó nhập mã và mật khẩu mới bên dưới.",
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
      onOpenChange(false);
    } catch (error: unknown) {
      toast.error("Đặt lại mật khẩu thất bại", {
        description: apiErrorMessage(error, "Không thể đặt lại mật khẩu."),
      });
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {!emailSent ? "Yêu cầu khôi phục mật khẩu" : "Đặt lại mật khẩu"}
          </DialogTitle>
          <DialogDescription>
            {!emailSent
              ? lockedEmail
                ? "Chúng tôi sẽ gửi mã xác nhận tới email đăng nhập của bạn."
                : "Nhập email để nhận mã xác nhận."
              : `Đã gửi hướng dẫn tới ${lockedEmail || email.trim()}. Nhập mã từ email và mật khẩu mới.`}
          </DialogDescription>
        </DialogHeader>

        {!emailSent ? (
          <form onSubmit={handleSendEmail} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor={lockedEmail ? undefined : "cp-email"}>Email</Label>
              {lockedEmail ? (
                <div className="rounded-md border bg-muted/40 px-3 py-2.5 text-sm">
                  <div className="flex items-start gap-2">
                    <Mail className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="font-medium break-all text-foreground">
                      {lockedEmail}
                    </span>
                  </div>
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    Mã khôi phục sẽ được gửi tới địa chỉ email đăng nhập này.
                  </p>
                </div>
              ) : (
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="cp-email"
                    type="email"
                    placeholder="email@example.com"
                    value={email}
                    onChange={(ev) => setEmail(ev.target.value)}
                    className="pl-10"
                    required
                    disabled={isSendingEmail}
                    autoComplete="email"
                  />
                </div>
              )}
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Đóng
              </Button>
              <Button type="submit" disabled={isSendingEmail}>
                {isSendingEmail ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Đang gửi…
                  </>
                ) : (
                  "Gửi mã"
                )}
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cp-token">Mã xác nhận</Label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="cp-token"
                  type="text"
                  placeholder="Mã từ email"
                  value={token}
                  onChange={(ev) => setToken(ev.target.value)}
                  className="pl-10 font-mono text-sm"
                  required
                  disabled={isResetting}
                  autoComplete="one-time-code"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="cp-new">Mật khẩu mới</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="cp-new"
                  type={showNewPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(ev) => setNewPassword(ev.target.value)}
                  className="pl-10 pr-10"
                  required
                  minLength={6}
                  disabled={isResetting}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground disabled:pointer-events-none"
                  disabled={isResetting}
                  aria-label={showNewPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                >
                  {showNewPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="cp-confirm">Xác nhận mật khẩu</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="cp-confirm"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(ev) => setConfirmPassword(ev.target.value)}
                  className="pl-10 pr-10"
                  required
                  minLength={6}
                  disabled={isResetting}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground disabled:pointer-events-none"
                  disabled={isResetting}
                  aria-label={showConfirmPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
            <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
              <Button
                type="button"
                variant="outline"
                disabled={isResetting}
                onClick={() => {
                  setEmailSent(false);
                  setToken("");
                  setNewPassword("");
                  setConfirmPassword("");
                  setShowNewPassword(false);
                  setShowConfirmPassword(false);
                }}
              >
                Gửi lại email
              </Button>
              <div className="flex gap-2">
                <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                  Đóng
                </Button>
                <Button type="submit" disabled={isResetting}>
                  {isResetting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Đang xử lý…
                    </>
                  ) : (
                    "Xác nhận"
                  )}
                </Button>
              </div>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
