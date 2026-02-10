import httpService from "@/lib/http";

export interface CompleteProfilePayload {
  fullName: string;
  gender: "MALE" | "FEMALE" | "OTHER";
  dateOfBirth: string;
  hometown: string;
  phone: string;
  newPassword: string;
  confirmPassword: string;
}

export interface ForgotPasswordPayload {
  email: string;
}

export interface ResetPasswordPayload {
  token: string;
  newPassword: string;
}

export interface UpdateProfilePayload {
  fullName?: string;
  gender?: "MALE" | "FEMALE" | "OTHER";
  dob?: string;
  hometown?: string;
  phone?: string;
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
};
