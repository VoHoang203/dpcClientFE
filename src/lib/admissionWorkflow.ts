/** 7 bước quy trình (đồng bộ seed SQL + UI). */

export const ADMISSION_STEP_DEFINITIONS = [
  { step: 1, title: "Nộp hồ sơ", description: "QCUT nộp hồ sơ xin kết nạp" },
  { step: 2, title: "Chi ủy kiểm tra", description: "Đ/c Hồng (CU) kiểm tra lỗi hồ sơ" },
  { step: 3, title: "PBT duyệt nội dung", description: "Đ/c Ngân (PBT) duyệt nội dung hồ sơ" },
  { step: 4, title: "Xác minh lý lịch", description: "QCUT đi xác minh lý lịch tại địa phương" },
  { step: 5, title: "Kiểm tra dấu đỏ", description: "Đ/c Ngân (PBT) kiểm tra dấu đỏ và chốt" },
  { step: 6, title: "Soạn nghị quyết", description: "Đ/c Hồng (CU) soạn Nghị quyết kết nạp" },
  { step: 7, title: "Duyệt nghị quyết", description: "Đ/c Thủy (BT) duyệt Nghị quyết" },
] as const;

export type DemoReceiverRole = "chi_uy" | "pho_bi_thu" | "bi_thu" | "qcut";

export type DemoNotificationPayload = {
  receiver_role: DemoReceiverRole;
  title: string;
  body: string;
};

/** Sau khi hoàn thành bước `completedStep` (1–7), gửi thông báo cho role kế tiếp. */
export function notificationsAfterStepComplete(
  completedStep: number,
  admissionId: string,
  fullName: string
): DemoNotificationPayload[] {
  const name = fullName.trim() || "Ứng viên";
  const shortId = admissionId.slice(0, 8);
  switch (completedStep) {
    case 1:
      return [
        {
          receiver_role: "chi_uy",
          title: "Hồ sơ mới cần sơ duyệt",
          body: `QCUT ${name} vừa nộp hồ sơ xin kết nạp (mã ${shortId}).`,
        },
      ];
    case 2:
      return [
        {
          receiver_role: "pho_bi_thu",
          title: "Chờ duyệt nội dung hồ sơ",
          body: `Hồ sơ ${name} đã qua bước Chi ủy.`,
        },
      ];
    case 3:
      return [
        {
          receiver_role: "qcut",
          title: "PBT đã duyệt nội dung",
          body: `Hồ sơ ${name}: tiếp tục bước xác minh lý lịch.`,
        },
      ];
    case 4:
      return [
        {
          receiver_role: "pho_bi_thu",
          title: "QCUT đã xác minh lý lịch",
          body: `Hồ sơ ${name} chờ kiểm tra dấu đỏ.`,
        },
      ];
    case 5:
      return [
        {
          receiver_role: "chi_uy",
          title: "Chờ soạn nghị quyết",
          body: `Hồ sơ ${name} đã chốt dấu đỏ — soạn Nghị quyết kết nạp.`,
        },
      ];
    case 6:
      return [
        {
          receiver_role: "bi_thu",
          title: "Chờ duyệt Nghị quyết",
          body: `Chi ủy đã soạn Nghị quyết cho ${name}.`,
        },
      ];
    case 7:
      return [
        {
          receiver_role: "qcut",
          title: "Hoàn tất quy trình",
          body: `Hồ sơ ${name} đã được duyệt Nghị quyết.`,
        },
      ];
    default:
      return [];
  }
}

/** Tab “Chờ sơ duyệt” — gom theo bước (demo). current_step = bước chưa xong đầu tiên (1–7), 8 = xong. */
export function reviewBucketFromStep(currentStep: number): "preliminary" | "verification" | "resolution" | "done" {
  if (currentStep >= 8) return "done";
  if (currentStep <= 3) return "preliminary";
  if (currentStep <= 5) return "verification";
  return "resolution";
}

/** Thông báo chờ (QCUT) theo bước đang mở — bước 4 dùng UI riêng (xác minh). */
export function getQcutWaitingCopy(currentStep: number): string | null {
  const m: Record<number, string> = {
    2: "Bạn đã nộp hồ sơ. Đang chờ Chi ủy sơ duyệt.",
    3: "Chi ủy đã xử lý. Đang chờ Phó Bí thư duyệt nội dung hồ sơ.",
    5: "Đang chờ Phó Bí thư kiểm tra dấu đỏ và chốt.",
    6: "Đang chờ Chi ủy soạn Nghị quyết kết nạp.",
    7: "Đang chờ Bí thư phê duyệt Nghị quyết.",
  };
  return m[currentStep] ?? null;
}

export type QcutAdmissionUiMode =
  | { kind: "form" }
  | { kind: "waiting"; message: string; step: number }
  | { kind: "verification_action" }
  | { kind: "rejected"; remark: string | null }
  | { kind: "completed" };

export function resolveQcutAdmissionUi(
  workflowStatus: string,
  currentStep: number,
  remark?: string | null
): QcutAdmissionUiMode {
  if (workflowStatus === "rejected") {
    return { kind: "rejected", remark: remark ?? null };
  }
  if (workflowStatus === "completed" || currentStep >= 8) {
    return { kind: "completed" };
  }
  if (currentStep === 4) {
    return { kind: "verification_action" };
  }
  const msg = getQcutWaitingCopy(currentStep);
  if (msg) {
    return { kind: "waiting", message: msg, step: currentStep };
  }
  return {
    kind: "waiting",
    message: "Hồ sơ đang được xử lý. Theo dõi tiến độ tại mục Tiến trình kết nạp.",
    step: currentStep,
  };
}
