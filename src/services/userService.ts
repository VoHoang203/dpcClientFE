import httpService from "@/lib/http";

export interface CompleteProfilePayload {
  fullName: string;
  gender: "MALE" | "FEMALE" | "OTHER";
  dateOfBirth: string;
  hometown: string;
  phone: string;
  newPassword: string;
  confirmPassword: string;
  ethnicity: string;
  religion: string;
  targetGroup: string;
  academicLevel: string;
  politicalTheoryLevel: string;
  partyCellId: string;
}

export interface ForgotPasswordPayload {
  email: string;
}

export interface ResetPasswordPayload {
  token: string;
  newPassword: string;
}

/** PATCH `/users/profile` — khớp contract BE (chỉ các trường được phép cập nhật). */
export interface UpdateProfilePayload {
  fullName?: string;
  gender?: "MALE" | "FEMALE" | "OTHER";
  dob?: string;
  hometown?: string;
  permanentAddress?: string;
  phone?: string;
  ethnicity?: string;
  religion?: string;
  targetGroup?: string;
  academicLevel?: string;
  politicalTheoryLevel?: string;
  joinDate?: string;
  officialDate?: string;
}

export interface VerifyEmailChangePayload {
  token: string;
  newEmail: string;
}

export interface AssignPositionPayload {
  positionCode: "SECRETARY" | "DEPUTY_SECRETARY" | "COMMITTEE" | "PARTY_MEMBER";
  appointedDate: string;
  note?: string;
}

export const userService = {
  completeProfile(payload: CompleteProfilePayload) {
    return httpService.post("/users/complete-profile", payload);
  },
  forgotPassword(payload: ForgotPasswordPayload) {
    return httpService.post("/users/forgot-password", payload);
  },
  resetPassword(payload: ResetPasswordPayload) {
    return httpService.post("/users/reset-password", payload);
  },
  updateProfile(payload: UpdateProfilePayload) {
    return httpService.patch("/users/profile", payload);
  },

  /** POST `/users/request-email-change` — gửi mã về email hiện tại (Bearer). */
  requestEmailChange() {
    return httpService.post("/users/request-email-change");
  },

  /** POST `/users/verify-email-change` — xác nhận mã và email mới (Bearer). */
  verifyEmailChange(payload: VerifyEmailChangePayload) {
    return httpService.post("/users/verify-email-change", payload);
  },

  /** POST `/users/avatar` — multipart, field `file`, tối đa 2MB (Bearer). */
  uploadAvatar(file: File) {
    const formData = new FormData();
    formData.append("file", file);
    return httpService.postFormData("/users/avatar", formData);
  },

  async assignPosition(_partyMemberId: string, _payload: AssignPositionPayload) {
    await new Promise((resolve) => setTimeout(resolve, 5000));
    return { success: true };
  },
};
