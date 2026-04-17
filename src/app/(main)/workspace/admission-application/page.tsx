"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import {
  FileText,
  Upload,
  Send,
  Save,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import {
  ADMISSION_STEP_DEFINITIONS,
  resolveQcutAdmissionUi,
} from "@/lib/admissionWorkflow";
import {
  AdmissionDocumentType,
  AdmissionWorkflowStep,
} from "@/lib/partyAdmissionEnums";
import {
  extractPartyAdmissionError,
  partyAdmissionService,
} from "@/services/partyAdmissionService";
import type { PartyAdmissionSessionPayload } from "@/lib/partyAdmissionAdapter";
import { AdmissionStepDetailDialog } from "@/components/workspace/AdmissionStepDetailDialog";

type UploadSlotItem = {
  label: string;
  type: AdmissionDocumentType;
  required: boolean;
};

/** Bước 1 — các ô upload (documentType tương ứng). */
const STEP_ONE_UPLOAD_ITEMS: UploadSlotItem[] = [
  {
    label: "Đơn xin vào Đảng",
    type: AdmissionDocumentType.DON_XIN_VAO_DANG,
    required: true,
  },
  {
    label: "Lý lịch của người xin vào Đảng",
    type: AdmissionDocumentType.LY_LICH_NGUOI_XIN_VAO_DANG,
    required: true,
  },
  {
    label: "Giấy giới thiệu của đảng viên chính thức (người thứ nhất)",
    type: AdmissionDocumentType.GIAY_GIOI_THIEU_DANG_VIEN_1,
    required: true,
  },
  {
    label: "Giấy giới thiệu của đảng viên chính thức (người thứ hai)",
    type: AdmissionDocumentType.GIAY_GIOI_THIEU_DANG_VIEN_2,
    required: true,
  },
];

/** Merge file mới đã chọn với key đã lưu nháp. */
async function mergeUploadedStepOneDocuments(
  slotFiles: Partial<Record<AdmissionDocumentType, File | null>>,
  persisted: Partial<Record<string, string>> | undefined
): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  if (persisted) {
    for (const [k, v] of Object.entries(persisted)) {
      if (typeof v === "string" && v.trim()) out[k] = v.trim();
    }
  }
  for (const item of STEP_ONE_UPLOAD_ITEMS) {
    const f = slotFiles[item.type];
    if (f) {
      out[item.type] = await partyAdmissionService.uploadFile(f);
    }
  }
  return out;
}

export default function AdmissionApplicationPage() {
  const { user, logout } = useAuth();
  const [slotFiles, setSlotFiles] = useState<
    Partial<Record<AdmissionDocumentType, File | null>>
  >({});
  const [fullName, setFullName] = useState("");
  const [dob, setDob] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [streetAddress, setStreetAddress] = useState("");
  const [provinceCodeStr, setProvinceCodeStr] = useState("");
  const [districtCodeStr, setDistrictCodeStr] = useState("");
  const [wardCodeStr, setWardCodeStr] = useState("");
  const [reason, setReason] = useState("");

  const { data: provinces } = useSWR("https://provinces.open-api.vn/api/p/", (url) => fetch(url).then(r => r.json()));
  const { data: districtsData } = useSWR(provinceCodeStr ? `https://provinces.open-api.vn/api/p/${provinceCodeStr}?depth=2` : null, (url) => fetch(url).then(r => r.json()));
  const { data: wardsData } = useSWR(districtCodeStr ? `https://provinces.open-api.vn/api/d/${districtCodeStr}?depth=2` : null, (url) => fetch(url).then(r => r.json()));

  const compositeAddress = useMemo(() => {
    const parts = [];
    if (streetAddress) parts.push(streetAddress);
    if (wardCodeStr && wardsData?.wards) {
      const w = wardsData.wards.find((x: any) => String(x.code) === wardCodeStr);
      if (w) parts.push(w.name);
    }
    if (districtCodeStr && districtsData?.districts) {
      const d = districtsData.districts.find((x: any) => String(x.code) === districtCodeStr);
      if (d) parts.push(d.name);
    }
    if (provinceCodeStr && provinces) {
      const p = provinces.find((x: any) => String(x.code) === provinceCodeStr);
      if (p) parts.push(p.name);
    }
    return parts.join(", ");
  }, [streetAddress, wardCodeStr, districtCodeStr, provinceCodeStr, provinces, districtsData, wardsData]);
  const [submitting, setSubmitting] = useState(false);
  const [draftSaving, setDraftSaving] = useState(false);
  const draftHydratedIdRef = useRef<string | null>(null);

  const [qcutNote, setQcutNote] = useState("");
  const [qcutFiles, setQcutFiles] = useState<File[]>([]);
  const [qcutBusy, setQcutBusy] = useState(false);
  const [stepDialogOpen, setStepDialogOpen] = useState(false);
  const [stepDetail, setStepDetail] = useState<Record<string, unknown> | null>(
    null
  );

  const swrKey = useMemo(
    () => (user?.userId ? `admission-applications-me:${user.userId}` : null),
    [user?.userId]
  );

  const { data, error, isLoading, mutate } = useSWR<
    PartyAdmissionSessionPayload,
    Error
  >(
    swrKey,
    () => partyAdmissionService.loadMySession(),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      refreshInterval: 0,
    }
  );

  const isNotFoundError =
    error instanceof Error &&
    (error.message.includes("404") ||
      error.message.includes("Không tìm thấy") ||
      error.message.includes("không tìm thấy"));

  const uiMode = useMemo(() => {
    if (!data?.admission) return null;
    const rawStep = Number(data.admission.currentStep);
    const status = String(data.admission.workflowStatus);

    let effectiveStep = rawStep;
    if (status === "returned") {
      // If we already passed Step 4 (marked as completed in progress)
      // or if any step >= 4 was returned, the user wants to stay at Step 4 UI.
      const reachedStep4 = data.progress?.some(
        (p) => p.stepNumber >= 4 && (p.isCompleted || p.rawStep?.status === "RETURNED")
      );
      if (reachedStep4 && rawStep < 4) {
        effectiveStep = 4;
      }
    }

    return resolveQcutAdmissionUi(
      status,
      effectiveStep,
      data.admission.remark
    );
  }, [data]);

  const showInitialForm =
    !user?.userId ||
    !swrKey ||
    (isNotFoundError && !isLoading) ||
    data?.admission?.workflowStatus === "draft" ||
    data?.admission?.workflowStatus === "not_started" ||
    (uiMode?.kind === "returned" && (uiMode.step || 1) < 4);

  useEffect(() => {
    const a = data?.admission;
    const isHydratable =
      a?.workflowStatus === "draft" || a?.workflowStatus === "returned";

    if (!a?.id || !isHydratable) {
      if (a?.workflowStatus && !isHydratable) {
        draftHydratedIdRef.current = null;
      }
      return;
    }
    if (draftHydratedIdRef.current === a.id) return;
    draftHydratedIdRef.current = a.id;
    if (a.fullName && a.fullName !== "—") setFullName(a.fullName);
    if (a.phone) setPhone(a.phone);
    if (a.email) setEmail(a.email);
    if (a.dateOfBirth) setDob(a.dateOfBirth);
    if (a.permanentAddress) setStreetAddress(a.permanentAddress);
  }, [data]);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    if (uiMode?.kind === "completed") {
      toast({
        title: "KẾT NẠP THÀNH CÔNG",
        description: "Bạn đã được cấp tài khoản đảng viên, hãy đăng nhập lại.",
      });
      timeoutId = setTimeout(() => {
        void logout();
      }, 3500);
    }
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [uiMode?.kind, logout]);

  const handleSaveDraft = async () => {
    if (!user?.userId) {
      toast({
        title: "Yêu cầu Đăng nhập",
        description: "Vui lòng đăng nhập hệ thống để thực hiện lưu trữ dữ liệu nháp của bạn.",
      });
      return;
    }
    const hasText =
      fullName.trim() ||
      dob ||
      phone.trim() ||
      email.trim() ||
      compositeAddress.trim() ||
      reason.trim();
    const hasNewFile = STEP_ONE_UPLOAD_ITEMS.some((i) => slotFiles[i.type]);
    const keys = data?.admission?.documentKeys;
    const hasSavedDoc = STEP_ONE_UPLOAD_ITEMS.some((i) => keys?.[i.type]);
    const hasAdmissionId = Boolean(data?.admission?.id?.trim());
    if (!hasText && !hasNewFile && !hasSavedDoc && !hasAdmissionId) {
      toast({
        title: "Thông tin chưa hoàn thiện",
        description:
          "Vui lòng cung cấp ít nhất một trường thông tin hoặc tải tệp lên để thực hiện lưu nháp.",
      });
      return;
    }

    setDraftSaving(true);
    try {
      const documents = await mergeUploadedStepOneDocuments(
        slotFiles,
        data?.admission?.documentKeys
      );
      const formData: Record<string, unknown> = {
        fullName: fullName.trim() || undefined,
        dateOfBirth: dob || undefined,
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        permanentAddress: compositeAddress.trim() || undefined,
        reason: reason.trim() || undefined,
        partyCellCode: "FPTU-DPC2",
        documents,
      };
      const admissionId = data?.admission?.id?.trim() || undefined;
      await partyAdmissionService.saveDraft({
        formData,
      });
      setSlotFiles((prev) => {
        const next = { ...prev };
        for (const item of STEP_ONE_UPLOAD_ITEMS) {
          if (prev[item.type]) delete next[item.type];
        }
        return next;
      });
      await mutate();
      toast({ title: "Thông tin nháp đã được lưu thành công." });
    } catch (err: unknown) {
      toast({
        title: "Không thể lưu dữ liệu",
        description: extractPartyAdmissionError(err),
      });
    } finally {
      setDraftSaving(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.userId) {
      toast({
        title: "Yêu cầu Đăng nhập",
        description: "Vui lòng đăng nhập để thực hiện gửi hồ sơ đăng ký kết nạp Đảng.",
      });
      return;
    }
    setSubmitting(true);
    try {
      const persisted = data?.admission?.documentKeys ?? {};
      for (const item of STEP_ONE_UPLOAD_ITEMS) {
        if (!item.required) continue;
        const hasFile = slotFiles[item.type];
        const hasKey = Boolean(persisted[item.type]?.trim());
        if (!hasFile && !hasKey) {
          toast({
            title: "Hồ sơ chưa đầy đủ",
            description: `Vui lòng tải lên tài liệu: ${item.label}.`,
          });
          setSubmitting(false);
          return;
        }
      }

      const documents = await mergeUploadedStepOneDocuments(
        slotFiles,
        data?.admission?.documentKeys
      );

      const formData: Record<string, unknown> = {
        fullName: fullName.trim(),
        dateOfBirth: dob || undefined,
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        permanentAddress: compositeAddress.trim() || undefined,
        reason: reason.trim() || undefined,
        partyCellCode: "FPTU-DPC2",
        ...documents,
      };

      await partyAdmissionService.submitAdmissionStep(
        AdmissionWorkflowStep.APPLICATION,
        { formData }
      );

      await mutate();
      draftHydratedIdRef.current = null;
      setSlotFiles({});
      toast({
        title: "Gửi hồ sơ thành công",
        description:
          "Hồ sơ của bạn đã được tiếp nhận và đang chờ Chi ủy thẩm định. Bạn có thể theo dõi tiến độ trong thông báo cá nhân.",
      });
    } catch (err: unknown) {
      toast({
        title: "Lỗi",
        description: extractPartyAdmissionError(err),
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleQcutConfirm = async () => {
    if (!data?.admission?.id || !user?.userId) return;
    if (qcutFiles.length === 0) {
      toast({
        title: "Minh chứng chưa đầy đủ",
        description:
          "Vui lòng tải lên tài liệu xác minh lý lịch từ địa phương để hoàn tất bước này.",
      });
      return;
    }
    setQcutBusy(true);
    try {
      const formData: Record<string, string> = {};
      for (let i = 0; i < qcutFiles.length; i++) {
        const url = await partyAdmissionService.uploadFile(qcutFiles[i]);
        const key =
          qcutFiles.length === 1
            ? AdmissionDocumentType.XAC_MINH_DIA_PHUONG
            : `${AdmissionDocumentType.XAC_MINH_DIA_PHUONG}_${i}`;
        formData[key] = url;
      }
      const stepCodeToSubmit = data.admission.rawStepCode || AdmissionWorkflowStep.LOCAL_VERIFICATION;

      // Nếu Backend đang ở Bước 1 (APPLICATION), ta cần gửi cả các thông tin cơ bản
      // để Backend không báo lỗi thiếu dữ liệu hồ sơ.
      if (stepCodeToSubmit === AdmissionWorkflowStep.APPLICATION) {
        formData["fullName"] = data.admission.fullName;
        if (data.admission.phone) formData["phone"] = data.admission.phone;
        if (data.admission.dateOfBirth) formData["dateOfBirth"] = data.admission.dateOfBirth;
        if (data.admission.permanentAddress) formData["permanentAddress"] = data.admission.permanentAddress;
      }

      await partyAdmissionService.submitAdmissionStep(
        stepCodeToSubmit,
        { formData }
      );
      toast({
        title: "Hoàn tất xác minh",
        description: "Dữ liệu xác minh lý lịch đã được gửi thành công để rà soát.",
      });
      setQcutNote("");
      setQcutFiles([]);
      await mutate();
    } catch (err: unknown) {
      toast({
        title: "Lỗi",
        description: extractPartyAdmissionError(err),
      });
    } finally {
      setQcutBusy(false);
    }
  };

  const handleQcutDecline = async () => {
    if (!data?.admission?.id || !user?.userId) return;
    if (
      !confirm(
        "Bạn xác nhận từ bỏ / rút hồ sơ? Hệ thống sẽ ghi nhận trên máy chủ."
      )
    ) {
      return;
    }
    setQcutBusy(true);
    try {
      await partyAdmissionService.withdraw(data.admission.id, {
        note: qcutNote.trim() || "Cá nhân chủ động rút hồ sơ",
      });
      toast({ title: "Hệ thống đã ghi nhận việc từ bỏ hồ sơ của bạn." });
      await mutate();
    } catch (err: unknown) {
      toast({
        title: "Lỗi",
        description: extractPartyAdmissionError(err),
      });
    } finally {
      setQcutBusy(false);
    }
  };

  const clearSessionStartNew = () => {
    draftHydratedIdRef.current = null;
    void mutate(undefined, { revalidate: false });
    setFullName("");
    setDob("");
    setPhone("");
    setEmail("");
    setStreetAddress("");
    setProvinceCodeStr("");
    setDistrictCodeStr("");
    setWardCodeStr("");
    setReason("");
    setSlotFiles({});
  };

  const validationErrors = useMemo(() => {
    const errors: Record<string, string> = {};
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = "Email không hợp lệ.";
    }
    if (phone && !/^(0|\+84)(3|5|7|8|9)[0-9]{8}$/.test(phone)) {
      errors.phone = "Số điện thoại không hợp lệ (phải là số Việt Nam).";
    }
    if (dob) {
      const today = new Date();
      const birthDate = new Date(dob);
      let age = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      if (age < 18 || age > 100) {
        errors.dob = "Tuổi phải trên 18.";
      }
    }
    return errors;
  }, [email, phone, dob]);

  const isFormValid = useMemo(() => {
    if (!fullName.trim() || !dob || !phone.trim() || !email.trim() || !compositeAddress.trim() || !reason.trim() || !provinceCodeStr || !districtCodeStr || !wardCodeStr || !streetAddress.trim()) return false;
    if (Object.keys(validationErrors).length > 0) return false;

    const persisted = data?.admission?.documentKeys ?? {};
    for (const item of STEP_ONE_UPLOAD_ITEMS) {
      if (!item.required) continue;
      const hasFile = slotFiles[item.type];
      const hasKey = Boolean(persisted[item.type]?.trim());
      if (!hasFile && !hasKey) return false;
    }
    return true;
  }, [fullName, dob, phone, email, compositeAddress, reason, provinceCodeStr, districtCodeStr, wardCodeStr, streetAddress, slotFiles, data, validationErrors]);

  return (
    <div className="flex w-full justify-center p-6">
      <div className="w-full max-w-4xl">
        <div className="mb-6 text-center">
          <h1 className="flex items-center justify-center gap-2 text-2xl font-bold text-foreground">
            <FileText className="h-6 w-6 text-primary" />
            Xin làm Đảng viên
          </h1>
          <p className="text-muted-foreground">Nộp hồ sơ xin kết nạp Đảng</p>
        </div>

        <AdmissionStepDetailDialog
          open={stepDialogOpen}
          onOpenChange={setStepDialogOpen}
          step={stepDetail}
          applicationCode={data?.admission?.code ?? null}
        />

        {!user?.userId && (
          <Card className="mb-6 border-amber-200 bg-amber-50">
            <CardContent className="p-4 text-sm text-amber-900">
              Vui lòng <span className="font-medium">đăng nhập</span> tài khoản quần chúng
              ưu tú để nộp hồ sơ và đồng bộ với máy chủ (API kết nạp).
            </CardContent>
          </Card>
        )}

        <Card className="mb-6 border-blue-200 bg-blue-50 text-left">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Info className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />
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

        {swrKey && isLoading && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            Đang tải trạng thái hồ sơ…
          </div>
        )}

        {swrKey && error && !isNotFoundError && (
          <Card className="mb-6 border-destructive/40">
            <CardContent className="p-4 text-sm text-destructive">
              {error.message}{" "}
              <Button variant="link" className="h-auto p-0" onClick={clearSessionStartNew}>
                Làm mới biểu mẫu
              </Button>
            </CardContent>
          </Card>
        )}

        {swrKey && data && uiMode && (
          <div className="mb-8 max-w-4xl space-y-4">
            {uiMode.kind === "returned" && (
              <Card className="border-orange-200 bg-orange-50">
                <CardContent className="flex gap-3 p-4">
                  <AlertTriangle className="h-6 w-6 shrink-0 text-orange-700" />
                  <div>
                    <p className="font-medium text-orange-900">Yêu cầu bổ sung hồ sơ</p>
                    <p className="mt-1 text-sm text-orange-900/90">{uiMode.message}</p>
                    {uiMode.remark && (
                      <p className="mt-2 text-sm font-medium text-orange-800">
                        Ghi chú từ Chi ủy: {uiMode.remark}
                      </p>
                    )}
                    <p className="mt-2 text-xs text-orange-800/80 leading-relaxed">
                      Vui lòng rà soát và cập nhật lại thông tin theo yêu cầu phía trên.
                      Bạn có thể chỉnh sửa trực tiếp tại biểu mẫu bên dưới.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {!showInitialForm && (
              <>
                {uiMode.kind === "completed" && (
                  <Card className="border-green-200 bg-green-50">
                    <CardContent className="flex gap-3 p-4">
                      <PartyPopper className="h-6 w-6 shrink-0 text-green-700" />
                      <div>
                        <p className="font-medium text-green-900">
                          Chúc mừng! Bạn đã hoàn tất quy trình kết nạp
                        </p>
                        <p className="mt-1 text-sm text-green-800">
                          Quy trình kết nạp Đảng của đồng chí {data.admission.fullName} đã thành công tốt đẹp.
                          Mọi chi tiết lịch sử có thể xem tại trang Tiến độ.
                        </p>
                        <Button asChild className="mt-3 bg-green-600 hover:bg-green-700 font-medium" size="sm">
                          <Link href="/workspace/admission-progress">
                            Xem lịch sử tiến độ
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
                          Hồ sơ đã dừng hoặc bị từ chối phê duyệt
                        </p>
                        {uiMode.remark && (
                          <p className="mt-2 text-sm font-medium text-destructive">
                            Lý do: {uiMode.remark}
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
                          Hồ sơ đang trong quá trình xét duyệt
                        </p>
                        <p className="mt-1 text-sm text-amber-900/90">{uiMode.message}</p>
                        <p className="mt-2 text-xs text-amber-800/80 leading-relaxed">
                          Hồ sơ đã được tiếp nhận. Ban Chi ủy và các cấp lãnh đạo đang tiến hành rà soát kỹ lưỡng.
                          Bạn vui lòng chờ thông báo mới khi hồ sơ chuyển sang giai đoạn kế tiếp.
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
                        Bước 4 — Xác minh lý lịch (QCUT)
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <p className="text-sm text-muted-foreground">
                        Đây là bước quan trọng để xác thực thông tin lý lịch cá nhân.
                        Vui lòng tải lên các tệp tài liệu xác minh (PDF hoặc ảnh) được cấp từ địa phương
                        để làm cơ sở cho Chi ủy thẩm định hồ sơ.
                      </p>
                      <div className="space-y-2">
                        <Label htmlFor="qcutNote">Ghi chú bổ sung (nếu có)</Label>
                        <Textarea
                          id="qcutNote"
                          placeholder="Nhập các ghi chú hoặc thông tin bổ sung về quá trình xác minh lý lịch của bạn..."
                          rows={3}
                          value={qcutNote}
                          onChange={(e) => setQcutNote(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Tệp minh chứng xác minh địa phương *</Label>
                        <Input
                          type="file"
                          multiple
                          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                          onChange={(e) =>
                            setQcutFiles(
                              e.target.files ? Array.from(e.target.files) : []
                            )
                          }
                        />
                        {qcutFiles.length > 0 && (
                          <p className="text-xs text-muted-foreground">
                            Đã chọn {qcutFiles.length} tệp tài liệu.
                          </p>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          onClick={() => void handleQcutConfirm()}
                          disabled={qcutBusy || qcutFiles.length === 0}
                        >
                          {qcutBusy ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <CheckCircle2 className="mr-2 h-4 w-4" />
                          )}
                          Xác nhận đã hoàn thành
                        </Button>
                        <Button
                          className="bg-destructive text-destructive-foreground"
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
                            className="flex flex-col gap-1 rounded-lg border px-3 py-2 text-sm"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-muted-foreground">
                                {p.stepNumber}. {p.title}
                              </span>
                              {p.isCompleted ? (
                                <CheckCircle2 className="h-4 w-4 shrink-0 text-green-600" />
                              ) : (
                                <Clock className="h-4 w-4 shrink-0 text-muted-foreground" />
                              )}
                            </div>
                            <Button
                              type="button"
                              variant="link"
                              className="h-auto justify-start p-0 text-xs"
                              onClick={() => {
                                setStepDetail(p.rawStep ?? null);
                                setStepDialogOpen(true);
                              }}
                            >
                              Chi tiết
                            </Button>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  )}

              </>
            )}

            <div className="flex flex-wrap gap-2 text-sm">
              <Button variant="outline" size="sm" asChild>
                <Link href="/workspace/admission-progress">Tiến trình kết nạp</Link>
              </Button>
            </div>
          </div>
        )}

        {showInitialForm && (
          <form onSubmit={handleSubmit} className="mx-auto w-full space-y-6">
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
                      className={validationErrors.dob ? "border-red-500" : ""}
                    />
                    {validationErrors.dob && <p className="text-xs text-red-500">{validationErrors.dob}</p>}
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
                      className={validationErrors.phone ? "border-red-500" : ""}
                    />
                    {validationErrors.phone && <p className="text-xs text-red-500">{validationErrors.phone}</p>}
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
                      className={validationErrors.email ? "border-red-500" : ""}
                    />
                    {validationErrors.email && <p className="text-xs text-red-500">{validationErrors.email}</p>}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Địa chỉ thường trú *</Label>
                  <p className="text-xs tracking-tight text-muted-foreground mt-0.5">Vui lòng chọn Tỉnh/Thành, Quận/Huyện, Phường/Xã trước khi nhập số nhà.</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-2">
                    <Select value={provinceCodeStr} onValueChange={(val) => { setProvinceCodeStr(val); setDistrictCodeStr(''); setWardCodeStr(''); }}>
                      <SelectTrigger>
                        <SelectValue placeholder="Tỉnh / Thành phố" />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.isArray(provinces) && provinces.map((p: any) => (
                          <SelectItem key={p.code} value={String(p.code)}>{p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select value={districtCodeStr} onValueChange={(val) => { setDistrictCodeStr(val); setWardCodeStr(''); }} disabled={!provinceCodeStr}>
                      <SelectTrigger>
                        <SelectValue placeholder="Quận / Huyện" />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.isArray(districtsData?.districts) && districtsData.districts.map((d: any) => (
                          <SelectItem key={d.code} value={String(d.code)}>{d.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select value={wardCodeStr} onValueChange={setWardCodeStr} disabled={!districtCodeStr}>
                      <SelectTrigger>
                        <SelectValue placeholder="Phường / Xã" />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.isArray(wardsData?.wards) && wardsData.wards.map((w: any) => (
                          <SelectItem key={w.code} value={String(w.code)}>{w.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Input
                      placeholder="Số nhà, tên đường..."
                      value={streetAddress}
                      onChange={(e) => setStreetAddress(e.target.value)}
                    />
                  </div>
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
                <CardTitle className="text-lg">Bước 1 — Giấy tờ cần nộp</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                {STEP_ONE_UPLOAD_ITEMS.map((item) => (
                  <div key={item.type} className="space-y-2">
                    <Label htmlFor={`doc-${item.type}`}>
                      {item.label}
                      {item.required ? " *" : ""}
                    </Label>
                    <div className="rounded-lg border-2 border-dashed border-border p-4 text-center">
                      <Upload className="mx-auto mb-2 h-6 w-6 text-muted-foreground" />
                      <Input
                        id={`doc-${item.type}`}
                        type="file"
                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                        className="cursor-pointer text-sm"
                        onChange={(e) => {
                          const f = e.target.files?.[0] ?? null;
                          setSlotFiles((prev) => ({
                            ...prev,
                            [item.type]: f,
                          }));
                        }}
                      />
                      {slotFiles[item.type] ? (
                        <p className="mt-2 flex items-center justify-center gap-2 text-xs text-muted-foreground">
                          <FileText className="h-3.5 w-3.5 shrink-0" />
                          {slotFiles[item.type]!.name}
                        </p>
                      ) : null}
                      {data?.admission?.documentKeys?.[item.type] &&
                        !slotFiles[item.type] ? (
                        <p className="mt-2 text-xs text-green-700 dark:text-green-400">
                          Đã lưu nháp trên máy chủ — có thể chọn file khác để thay
                          thế.
                        </p>
                      ) : null}
                    </div>
                  </div>
                ))}
                <p className="text-xs text-muted-foreground">
                  Khi tới bước xác minh lý lịch tại địa phương, quay lại trang này để
                  xác nhận và đính kèm minh chứng (tuỳ chọn). Nghị quyết Chi đoàn /
                  nghị quyết kết nạp do Chi ủy xử lý tại mục chờ duyệt.
                </p>
              </CardContent>
            </Card>

            <div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-center">
              <Button
                type="button"
                variant="outline"
                className="w-full gap-2 sm:max-w-xs sm:flex-1"
                disabled={draftSaving || submitting || !user?.userId}
                onClick={() => void handleSaveDraft()}
              >
                {draftSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Lưu nháp
              </Button>
              <Button
                type="submit"
                className="w-full gap-2 sm:max-w-xs sm:flex-1"
                disabled={submitting || draftSaving || !user?.userId || !isFormValid}
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                Gửi hồ sơ
              </Button>
            </div>
          </form>
        )}

        {swrKey && !showInitialForm && !isLoading && !error && !data && (
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
    </div>
  );
}
