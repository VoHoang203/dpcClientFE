import { toast } from "sonner";
import { loginWithTestUsers } from "@/test_services/authTestService";
import { rawUsers, testUsers, type RawPartyUser } from "@/test_services/users";
import { committeeAuthService } from "@/services/committeeAuthService";

export interface LoginPayload {
  username: string;
  password: string;
}

export interface LoginResponse {
  userId: string;
  accessToken: string;
  refreshToken: string;
  message: string;
}

export interface ProfileData {
  name: string;
  email: string;
  phone: string;
  address: string;
  dob: string;
  joinDate: string;
  officialDate: string;
  memberId: string;
  position: string;
  branch: string;
  classification: string;
  objectType: string;
  ethnicity: string;
  religion: string;
  education: string;
  profileNumber: string;
  avatarUrl?: string;
}

const parseEthnicityReligion = (raw: string) => {
  const normalized = raw.replace("\n", "/").split("/");
  return {
    ethnicity: normalized[0]?.trim() || "",
    religion: normalized[1]?.trim() || "",
  };
};

const buildProfile = (user: RawPartyUser): ProfileData => {
  const { ethnicity, religion } = parseEthnicityReligion(user.dan_toc_ton_giao);

  return {
    name: user.ho_ten,
    email: user.email,
    phone: "",
    address: user.que_quan,
    dob: user.nam_sinh,
    joinDate: user.ngay_vao_dang,
    officialDate: user.ngay_chinh_thuc,
    memberId: user.ma_so_nhan_vien,
    position: user.chuc_vu,
    branch: user.chi_bo,
    classification: "",
    objectType: user.doi_tuong,
    ethnicity,
    religion,
    education: user.trinh_do_hoc_van,
    profileNumber: `HS-${user.ma_so_nhan_vien}`,
    avatarUrl: "",
  };
};

const getProfileOverrideKey = (userId: string) =>
  `profileOverride:${userId}`;

const readProfileOverride = (userId: string): Partial<ProfileData> | null => {
  const raw = localStorage.getItem(getProfileOverrideKey(userId));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Partial<ProfileData>;
  } catch {
    return null;
  }
};

const writeProfileOverride = (userId: string, data: Partial<ProfileData>) => {
  localStorage.setItem(getProfileOverrideKey(userId), JSON.stringify(data));
};

export const authService = {
  async login(payload: LoginPayload): Promise<LoginResponse> {
    try {
      const response = await loginWithTestUsers(
        payload.username,
        payload.password
      );

      localStorage.setItem("accessToken", response.accessToken);
      localStorage.setItem("refreshToken", response.refreshToken);
      localStorage.setItem("currentUser", JSON.stringify(response.user));

      if (response.user.role === "COMMITTEE") {
        try {
          const committeeToken = await committeeAuthService.fetchCommitteeToken();
          committeeAuthService.saveCommitteeToken(
            committeeToken.accessToken,
            committeeToken.refreshToken
          );
        } catch {
          toast.error("Không lấy được token chi ủy");
        }
      }

      toast.success("Đăng nhập thành công");

      return {
        userId: response.user.id,
        accessToken: response.accessToken,
        refreshToken: response.refreshToken,
        message: "Đăng nhập thành công",
      };
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "Vui lòng kiểm tra lại thông tin đăng nhập";
      toast.error("Đăng nhập thất bại", { description: message });
      throw error;
    }
  },
  async profile(): Promise<ProfileData> {
    const accessToken = localStorage.getItem("accessToken");

    if (!accessToken) {
      toast.error("Vui lòng đăng nhập");
      throw new Error("Chưa đăng nhập");
    }

    const storedUser = localStorage.getItem("currentUser");
    const parsedUser = storedUser
      ? (JSON.parse(storedUser) as { username?: string })
      : null;
    const userId = parsedUser?.username || accessToken;

    const match = rawUsers.find(
      (user) => user.ma_so_nhan_vien === userId
    );

    if (!match) {
      toast.error("Không tìm thấy hồ sơ người dùng");
      throw new Error("Không tìm thấy hồ sơ người dùng");
    }

    const baseProfile = buildProfile(match);
    const override = readProfileOverride(userId);
    return override ? { ...baseProfile, ...override } : baseProfile;
  },
  updateProfile(payload: Partial<ProfileData>): ProfileData {
    const accessToken = localStorage.getItem("accessToken");
    if (!accessToken) {
      toast.error("Vui lòng đăng nhập");
      throw new Error("Chưa đăng nhập");
    }

    const storedUser = localStorage.getItem("currentUser");
    const parsedUser = storedUser
      ? (JSON.parse(storedUser) as { username?: string })
      : null;
    const userId = parsedUser?.username || accessToken;

    const match = rawUsers.find(
      (user) => user.ma_so_nhan_vien === userId
    );
    if (!match) {
      toast.error("Không tìm thấy hồ sơ người dùng");
      throw new Error("Không tìm thấy hồ sơ người dùng");
    }

    const existingOverride = readProfileOverride(userId) || {};
    const nextOverride = { ...existingOverride, ...payload };
    writeProfileOverride(userId, nextOverride);

    toast.success("Đã cập nhật hồ sơ");
    return { ...buildProfile(match), ...nextOverride };
  },
  logout() {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("currentUser");
    committeeAuthService.clearCommitteeToken();
    toast.success("Đã đăng xuất");
    window.location.href = "/login";
  },
  getCurrentRole() {
    const storedUser = localStorage.getItem("currentUser");
    if (!storedUser) return null;
    try {
      const parsed = JSON.parse(storedUser) as { role?: string };
      return parsed.role || null;
    } catch {
      return null;
    }
  },
  getUserList() {
    return testUsers;
  },
};
