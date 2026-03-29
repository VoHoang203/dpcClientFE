"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import {
  FileText,
  Upload,
  Send,
  Info,
  Loader2,
  CheckCircle2,
  Clock,
  AlertTriangle,
  PartyPopper,
  Ban,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { ADMISSION_DEMO_SESSION_STORAGE_KEY } from "@/lib/admissionDemoStorage";
import {
  ADMISSION_STEP_DEFINITIONS,
  resolveQcutAdmissionUi,
} from "@/lib/admissionWorkflow";

type SessionPayload = {
  admission: {
    id: string;
    fullName: string;
    currentStep: number;
    workflowStatus: string;
    remark: string | null;
  };
  progress: Array<{
    stepNumber: number;
    title: string;
    isCompleted: boolean;
  }>;
};

async function fetchSession(url: string): Promise<SessionPayload> {
  const res = await fetch(url);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      typeof err?.message === "string" ? err.message : "Không tải được hồ sơ"
    );
  }
  return res.json();
}

export default function AdmissionApplicationPage() {
  const [sessionKey, setSessionKey] = useState<string | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [fullName, setFullName] = useState("");
  const [dob, setDob] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [qcutNote, setQcutNote] = useState("");
  const [qcutFiles, setQcutFiles] = useState<File[]>([]);
  const [qcutBusy, setQcutBusy] = useState(false);

  useEffect(() => {
    setSessionKey(localStorage.getItem(ADMISSION_DEMO_SESSION_STORAGE_KEY));
  }, []);

  const swrKey = sessionKey
    ? `/api/admissions?sessionKey=${encodeURIComponent(sessionKey)}`
    : null;

  const { data, error, isLoading, mutate } = useSWR(swrKey, fetchSession, {
    revalidateOnFocus: true,
  });

  const uiMode = useMemo(() => {
    if (!data?.admission) return null;
    return resolveQcutAdmissionUi(
      String(data.admission.workflowStatus),
      Number(data.admission.currentStep),
      data.admission.remark
    );
  }, [data]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/admissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: fullName.trim(),
          dateOfBirth: dob || undefined,
          phone: phone.trim() || undefined,
          email: email.trim() || undefined,
          permanentAddress: address.trim() || undefined,
          reason: reason.trim() || undefined,
          partyCellCode: "FPTU-DPC2",
          documentsMeta: {
            fileCount: files.length,
            don: true,
            lyLich: true,
            gioiThieu: files.length >= 2,
            nghiQuyetDoan: true,
          },
        }),
      });
      const payload = (await res.json().catch(() => ({}))) as {
        message?: string;
        demoSessionKey?: string;
      };
      if (!res.ok) {
        throw new Error(payload.message || "Không gửi được hồ sơ");
      }
      if (payload.demoSessionKey) {
        localStorage.setItem(
          ADMISSION_DEMO_SESSION_STORAGE_KEY,
          payload.demoSessionKey
        );
        setSessionKey(payload.demoSessionKey);
        await mutate();
      }
      toast({
        title: "Đã gửi hồ sơ",
        description:
          "Đang chờ Chi ủy xét duyệt. Bạn có thể xem thông báo (role QCUT) trên header.",
      });
    } catch (err: unknown) {
      toast({
        title: "Lỗi",
        description:
          err instanceof Error ? err.message : "Không gửi được hồ sơ",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleQcutConfirm = async () => {
    if (!data?.admission || !sessionKey) return;
    setQcutBusy(true);
    try {
      const res = await fetch(`/api/admissions/${data.admission.id}/actions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "qcut_confirm",
          sessionKey,
          note: qcutNote.trim() || undefined,
          documentsMeta:
            qcutFiles.length > 0
              ? {
                  supplementCount: qcutFiles.length,
                  supplementAt: new Date().toISOString(),
                }
              : undefined,
        }),
      });
      const payload = (await res.json().catch(() => ({}))) as {
        message?: string;
      };
      if (!res.ok) {
        throw new Error(payload.message || "Không xác nhận được");
      }
      toast({
        title: "Đã xác nhận",
        description: "Bước xác minh lý lịch đã hoàn thành.",
      });
      setQcutNote("");
      setQcutFiles([]);
      await mutate();
    } catch (err: unknown) {
      toast({
        title: "Lỗi",
        description:
          err instanceof Error ? err.message : "Không xác nhận được",
      });
    } finally {
      setQcutBusy(false);
    }
  };

  const handleQcutDecline = async () => {
    if (!data?.admission || !sessionKey) return;
    if (
      !confirm(
        "Bạn xác nhận từ bỏ / rút hồ sơ? (demo — ghi nhận từ chối trên Neon)"
      )
    ) {
      return;
    }
    setQcutBusy(true);
    try {
      const res = await fetch(`/api/admissions/${data.admission.id}/actions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "qcut_decline",
          sessionKey,
          note: qcutNote.trim() || "QCUT từ bỏ quy trình",
        }),
      });
      const payload = (await res.json().catch(() => ({}))) as {
        message?: string;
      };
      if (!res.ok) {
        throw new Error(payload.message || "Không gửi được yêu cầu");
      }
      toast({ title: "Đã ghi nhận từ bỏ hồ sơ" });
      await mutate();
    } catch (err: unknown) {
      toast({
        title: "Lỗi",
        description:
          err instanceof Error ? err.message : "Không gửi được yêu cầu",
      });
    } finally {
      setQcutBusy(false);
    }
  };

  const clearSessionStartNew = () => {
    localStorage.removeItem(ADMISSION_DEMO_SESSION_STORAGE_KEY);
    setSessionKey(null);
    void mutate(undefined, { revalidate: false });
    setFullName("");
    setDob("");
    setPhone("");
    setEmail("");
    setAddress("");
    setReason("");
    setFiles([]);
  };

  const showInitialForm = !sessionKey;

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground">
          <FileText className="h-6 w-6 text-primary" />
          Xin làm Đảng viên
        </h1>
        <p className="text-muted-foreground">Nộp hồ sơ xin kết nạp Đảng</p>
      </div>

      <Card className="mb-6 border-blue-200 bg-blue-50">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Info className="mt-0.5 h-5 w-5 text-blue-600" />
            <div>
              <p className="font-medium text-blue-800">
                Quy trình kết nạp Đảng viên (7 bước)
              </p>
              <ol className="mt-2 list-inside list-decimal space-y-1 text-sm text-blue-700">
                {ADMISSION_STEP_DEFINITIONS.map((s) => (
                  <li key={s.step}>
                    {s.title} — {s.description}
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </CardContent>
      </Card>

      {sessionKey && isLoading && (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          Đang tải trạng thái hồ sơ…
        </div>
      )}

      {sessionKey && error && (
        <Card className="mb-6 border-destructive/40">
          <CardContent className="p-4 text-sm text-destructive">
            {error.message}{" "}
            <Button variant="link" className="h-auto p-0" onClick={clearSessionStartNew}>
              Xóa phiên và nộp lại
            </Button>
          </CardContent>
        </Card>
      )}

      {sessionKey && data && uiMode && (
        <div className="mb-8 max-w-2xl space-y-4">
          {uiMode.kind === "completed" && (
            <Card className="border-green-200 bg-green-50">
              <CardContent className="flex gap-3 p-4">
                <PartyPopper className="h-6 w-6 shrink-0 text-green-700" />
                <div>
                  <p className="font-medium text-green-900">
                    Hoàn tất quy trình kết nạp (demo)
                  </p>
                  <p className="mt-1 text-sm text-green-800">
                    Chúc mừng {data.admission.fullName}. Chi tiết xem tại Tiến
                    trình kết nạp.
                  </p>
                  <Button asChild className="mt-3" size="sm">
                    <Link href="/workspace/admission-progress">
                      Xem tiến trình
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {uiMode.kind === "rejected" && (
            <Card className="border-destructive/40 bg-destructive/5">
              <CardContent className="flex gap-3 p-4">
                <Ban className="h-6 w-6 shrink-0 text-destructive" />
                <div>
                  <p className="font-medium text-destructive">
                    Hồ sơ đã dừng / bị từ chối
                  </p>
                  {uiMode.remark && (
                    <p className="mt-2 text-sm text-muted-foreground">
                      Ghi chú: {uiMode.remark}
                    </p>
                  )}
                  <Button
                    variant="outline"
                    className="mt-3"
                    size="sm"
                    onClick={clearSessionStartNew}
                  >
                    Nộp hồ sơ mới
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {uiMode.kind === "waiting" && (
            <Card className="border-amber-200 bg-amber-50">
              <CardContent className="flex gap-3 p-4">
                <Clock className="h-6 w-6 shrink-0 text-amber-700" />
                <div>
                  <p className="font-medium text-amber-900">
                    Đã nộp — đang chờ xét duyệt
                  </p>
                  <p className="mt-1 text-sm text-amber-900/90">{uiMode.message}</p>
                  <p className="mt-2 text-xs text-amber-800/80">
                    Phía Chi ủy / Phó Bí thư / Bí thư xử lý tại &quot;Chờ sơ
                    duyệt&quot;. Bạn chỉ cần chờ; khi tới bước xác minh lý lịch,
                    form xác nhận sẽ hiện bên dưới.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {uiMode.kind === "verification_action" && (
            <Card className="border-primary/30">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-primary" />
                  Bước xác minh lý lịch (QCUT)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Sau khi Phó Bí thư duyệt nội dung, bạn cần hoàn tất xác minh lý
                  lịch tại địa phương. Khi đã thực hiện, xác nhận bên dưới (kèm
                  ghi chú / minh chứng tùy chọn).{" "}
                  <strong>Từ bỏ</strong> sẽ ghi nhận rút hồ sơ (demo).
                </p>
                <div className="space-y-2">
                  <Label htmlFor="qcutNote">Ghi chú / nội dung xác nhận</Label>
                  <Textarea
                    id="qcutNote"
                    placeholder="Ví dụ: Đã xác minh tại UBND phường…"
                    rows={4}
                    value={qcutNote}
                    onChange={(e) => setQcutNote(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Minh chứng bổ sung (tuỳ chọn)</Label>
                  <Input
                    type="file"
                    multiple
                    accept=".pdf,.jpg,.png"
                    onChange={(e) =>
                      setQcutFiles(
                        e.target.files ? Array.from(e.target.files) : []
                      )
                    }
                  />
                  {qcutFiles.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      Đã chọn {qcutFiles.length} tệp (demo chỉ lưu số lượng lên
                      Neon).
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    onClick={() => void handleQcutConfirm()}
                    disabled={qcutBusy}
                  >
                    {qcutBusy ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                    )}
                    Xác nhận đã hoàn thành
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => void handleQcutDecline()}
                    disabled={qcutBusy}
                  >
                    Từ bỏ hồ sơ
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {data.progress?.length > 0 &&
            uiMode.kind !== "rejected" &&
            uiMode.kind !== "completed" && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Tiến độ các bước</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {data.progress.map((p) => (
                    <div
                      key={p.stepNumber}
                      className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm"
                    >
                      <span className="text-muted-foreground">
                        {p.stepNumber}. {p.title}
                      </span>
                      {p.isCompleted ? (
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-green-600" />
                      ) : (
                        <Clock className="h-4 w-4 shrink-0 text-muted-foreground" />
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

          <div className="flex flex-wrap gap-2 text-sm">
            <Button variant="outline" size="sm" asChild>
              <Link href="/workspace/admission-progress">Tiến trình kết nạp</Link>
            </Button>
            <Button variant="ghost" size="sm" onClick={clearSessionStartNew}>
              Nộp hồ sơ mới (xóa phiên demo)
            </Button>
          </div>
        </div>
      )}

      {showInitialForm && (
        <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Thông tin cá nhân</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Họ và tên *</Label>
                  <Input
                    id="fullName"
                    placeholder="Nguyễn Văn A"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dob">Ngày sinh *</Label>
                  <Input
                    id="dob"
                    type="date"
                    required
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Số điện thoại *</Label>
                  <Input
                    id="phone"
                    placeholder="0912345678"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="email@example.com"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Địa chỉ thường trú *</Label>
                <Input
                  id="address"
                  placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành phố"
                  required
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Lý do xin vào Đảng</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Trình bày lý do bạn muốn được kết nạp vào Đảng Cộng sản Việt Nam..."
                rows={6}
                required
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Hồ sơ đính kèm</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border-2 border-dashed border-border p-6 text-center">
                <Upload className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
                <p className="mb-2 text-sm text-muted-foreground">
                  Kéo thả file hoặc click để chọn
                </p>
                <Input
                  type="file"
                  multiple
                  onChange={handleFileChange}
                  className="mx-auto max-w-xs"
                  accept=".pdf,.doc,.docx,.jpg,.png"
                />
              </div>
              {files.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">File đã chọn:</p>
                  {files.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 text-sm text-muted-foreground"
                    >
                      <FileText className="h-4 w-4" />
                      <span>{file.name}</span>
                    </div>
                  ))}
                </div>
              )}
              <div className="text-xs text-muted-foreground">
                <p className="mb-1 font-medium">Các giấy tờ cần nộp:</p>
                <ul className="list-inside list-disc space-y-0.5">
                  <li>Đơn xin vào Đảng</li>
                  <li>Lý lịch của người xin vào Đảng</li>
                  <li>Giấy giới thiệu của đảng viên chính thức (02 người)</li>
                  <li>Nghị quyết giới thiệu đoàn viên của Chi đoàn</li>
                  <li>Các giấy tờ khác (nếu có)</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          <Button type="submit" className="w-full gap-2" disabled={submitting}>
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            Gửi hồ sơ
          </Button>
        </form>
      )}

      {sessionKey && !showInitialForm && !isLoading && !error && !data && (
        <p className="text-sm text-muted-foreground">
          Không có dữ liệu phiên.{" "}
          <button
            type="button"
            className="text-primary underline"
            onClick={clearSessionStartNew}
          >
            Nộp mới
          </button>
        </p>
      )}
    </div>
  );
}
