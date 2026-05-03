"use client";

import { useState } from "react";
import axios from "axios";
import { KeyRound, Loader2, Mail } from "lucide-react";
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
  /** Email hiện tại (chỉ hiển thị). */
  currentEmail: string;
  onSuccess: () => void | Promise<void>;
};

export function ChangeEmailDialog({
  open,
  onOpenChange,
  currentEmail,
  onSuccess,
}: Props) {
  const [step, setStep] = useState<"request" | "verify">("request");
  const [token, setToken] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [requesting, setRequesting] = useState(false);
  const [verifying, setVerifying] = useState(false);

  const reset = () => {
    setStep("request");
    setToken("");
    setNewEmail("");
  };

  const handleClose = (next: boolean) => {
    if (!next) {
      reset();
    }
    onOpenChange(next);
  };

  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setRequesting(true);
    try {
      const { status } = await userService.requestEmailChange();
      if (!isSuccessStatus(status)) {
        toast.error("Gửi mã thất bại", {
          description: "Máy chủ trả về phản hồi không thành công.",
        });
        return;
      }
      toast.success("Đã gửi mã", {
        description: `Kiểm tra hộp thư ${currentEmail || "hiện tại"} để lấy mã xác nhận.`,
      });
      setStep("verify");
    } catch (error: unknown) {
      toast.error("Gửi mã thất bại", {
        description: apiErrorMessage(error, "Không thể gửi mã đổi email."),
      });
    } finally {
      setRequesting(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedEmail = newEmail.trim();
    if (!trimmedEmail) {
      toast.error("Vui lòng nhập email mới");
      return;
    }
    setVerifying(true);
    try {
      const { status } = await userService.verifyEmailChange({
        token: token.trim(),
        newEmail: trimmedEmail,
      });
      if (!isSuccessStatus(status)) {
        toast.error("Xác nhận thất bại", {
          description: "Máy chủ trả về phản hồi không thành công.",
        });
        return;
      }
      toast.success("Đã cập nhật email");
      reset();
      onOpenChange(false);
      await onSuccess();
    } catch (error: unknown) {
      toast.error("Xác nhận thất bại", {
        description: apiErrorMessage(error, "Không thể đổi email."),
      });
    } finally {
      setVerifying(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Đổi email</DialogTitle>
          <DialogDescription>
            {step === "request"
              ? "Hệ thống sẽ gửi mã xác nhận tới email hiện tại của bạn."
              : "Nhập mã từ email cũ và địa chỉ email mới."}
          </DialogDescription>
        </DialogHeader>

        {step === "request" ? (
          <form onSubmit={handleRequest} className="space-y-4">
            <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm">
              <span className="text-muted-foreground">Email hiện tại: </span>
              <span className="font-medium break-all">
                {currentEmail.trim() || "—"}
              </span>
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => handleClose(false)}>
                Hủy
              </Button>
              <Button type="submit" disabled={requesting}>
                {requesting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Đang gửi…
                  </>
                ) : (
                  "Gửi mã về email"
                )}
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <form onSubmit={handleVerify} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="ce-token">Mã xác nhận</Label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="ce-token"
                  type="text"
                  placeholder="Mã từ email cũ"
                  value={token}
                  onChange={(ev) => setToken(ev.target.value)}
                  className="pl-10 font-mono text-sm"
                  required
                  disabled={verifying}
                  autoComplete="one-time-code"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="ce-new">Email mới</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="ce-new"
                  type="email"
                  placeholder="email.moi@example.com"
                  value={newEmail}
                  onChange={(ev) => setNewEmail(ev.target.value)}
                  className="pl-10"
                  required
                  disabled={verifying}
                  autoComplete="email"
                />
              </div>
            </div>
            <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
              <Button
                type="button"
                variant="outline"
                disabled={verifying}
                onClick={() => setStep("request")}
              >
                Quay lại
              </Button>
              <div className="flex gap-2">
                <Button type="button" variant="ghost" onClick={() => handleClose(false)}>
                  Đóng
                </Button>
                <Button type="submit" disabled={verifying}>
                  {verifying ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Đang xử lý…
                    </>
                  ) : (
                    "Xác nhận đổi email"
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
