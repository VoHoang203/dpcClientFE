/** 7 bước quy trình (đồng bộ seed SQL + UI). */

export const ADMISSION_STEP_DEFINITIONS = [
  { step: 1, title: "Nộp hồ sơ", description: "Cá nhân hoàn thiện và gửi hồ sơ đăng ký kết nạp Đảng." },
  { step: 2, title: "Chi ủy kiểm tra", description: "Chi ủy tiến hành thẩm định và sơ duyệt các thông tin trong hồ sơ." },
  { step: 3, title: "Lãnh đạo duyệt nội dung", description: "Phó Bí thư rà soát và phê duyệt các nội dung chi tiết của hồ sơ." },
  { step: 4, title: "Xác minh lý lịch", description: "Tiến hành xác minh lý lịch tại địa phương và thu thập minh chứng." },
  { step: 5, title: "Kiểm tra dấu đỏ", description: "Kiểm tra tính pháp lý, con dấu xác thực và chốt hồ sơ cuối cùng." },
  { step: 6, title: "Soạn thảo nghị quyết", description: "Chi ủy thực hiện soạn thảo Nghị quyết đề nghị kết nạp Đảng viên." },
  { step: 7, title: "Phê duyệt kết nạp", description: "Bí thư chính thức phê duyệt Nghị quyết và hoàn tất thủ tục kết nạp." },
] as const;

export type DemoReceiverRole = "chi_uy" | "pho_bi_thu" | "bi_thu" | "qcut";

export type DemoNotificationPayload = {
  receiver_role: DemoReceiverRole;
  title: string;
  body: string;
  /** Chỉ QCUT: giới hạn thông báo theo user đã nộp hồ sơ. */
  receiver_user_id?: string | null;
};

/** Role được phép bấm duyệt bước `currentStep` (2–7, trừ 4 = QCUT riêng). */
export function requiredRoleForApproveStep(currentStep: number): DemoReceiverRole | null {
  switch (currentStep) {
    case 2:
      return "chi_uy";
    case 3:
    case 5:
      return "pho_bi_thu";
    case 6:
      return "chi_uy";
    case 7:
      return "bi_thu";
    default:
      return null;
  }
}

/** Sau khi hoàn thành bước `completedStep` (1–7), gửi thông báo cho role kế tiếp. */
export function notificationsAfterStepComplete(
  completedStep: number,
  admissionId: string,
  fullName: string,
  qcutSubmitterUserId?: string | null
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
          receiver_user_id: qcutSubmitterUserId ?? null,
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
  | { kind: "returned"; remark: string | null; message: string; step: number }
  | { kind: "completed" };

export function resolveQcutAdmissionUi(
  workflowStatus: string,
  currentStep: number,
  remark?: string | null
): QcutAdmissionUiMode {
  /** Chưa có hồ sơ trên BE (404 my-current-status) — coi như chưa bắt đầu bước 1. */
  if (workflowStatus === "not_started") {
    return { kind: "form" };
  }
  if (workflowStatus === "draft") {
    return { kind: "form" };
  }
  if (workflowStatus === "rejected") {
    return { kind: "rejected", remark: remark ?? null };
  }
  if (workflowStatus === "completed" || currentStep >= 8) {
    return { kind: "completed" };
  }
  if (workflowStatus === "returned") {
    if (currentStep >= 4) {
      return { kind: "verification_action" };
    }
    return {
      kind: "returned",
      remark: remark ?? null,
      message:
        "Hồ sơ được trả lại để bổ sung. Vui lòng chỉnh sửa và gửi lại theo yêu cầu của Chi ủy / Phó Bí thư.",
      step: currentStep,
    };
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
