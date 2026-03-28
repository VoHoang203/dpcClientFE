import httpService from "@/lib/http";

export type { RawPartyUser } from "@/services/authTypes";

/**
 * Đổi giá trị tại đây khi test phân quyền UI. API vẫn là nguồn đúng qua token;
 * trường này chỉ để hiển thị / getCurrentRole / login response khớp khi dev.
 */
export const PROFILE_ROLE_DEV_OVERRIDE = "COMMITTEE_MEMBER";

export interface LoginPayload {
  username: string;
  password: string;
}

export interface LoginResponse {
  userId: string;
  accessToken: string;
  refreshToken: string;
  message: string;
  role: string;
}

/** Payload `data` từ GET /users/me */
export interface UserMePartyCell {
  id: string;
  name: string;
}

export interface UserMeData {
  id: string;
  userId: string;
  employeeCode: string;
  email: string;
  position: string;
  fullName: string;
  dob: string | null;
  gender: string | null;
  phone: string | null;
  hometown: string | null;
  permanentAddress: string | null;
  joinDate: string | null;
  officialDate: string | null;
  partyCardId: string | null;
  status: string | null;
  ethnicity: string | null;
  religion: string | null;
  targetGroup: string | null;
  academicLevel: string | null;
  politicalTheoryLevel: string | null;
  partyCell: UserMePartyCell | null;
}

export interface UserMeApiResponse {
  statusCode: number;
  message: string;
  data: UserMeData;
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
  /** Chức danh / vị trí từ API (`users/me.position`). */
  position: string;
  /** Vai trò phân quyền UI — hiện lấy từ `PROFILE_ROLE_DEV_OVERRIDE`. */
  role: string;
  branch: string;
  classification: string;
  objectType: string;
  ethnicity: string;
  religion: string;
  education: string;
  profileNumber: string;
  avatarUrl?: string;
}

/** Dữ liệu lưu sau đăng nhập (GET /users/me) — dùng cho header, getCurrentRole, v.v. */
export type CurrentUserSnapshot = {
  userId: string;
  username: string;
  role: string;
  fullName: string;
  /** Chức danh từ API (`position`), có thể là enum hoặc chuỗi hiển thị. */
  position: string;
  email?: string;
};

function normalizeCurrentUserSnapshot(raw: Record<string, unknown>): CurrentUserSnapshot | null {
  const userId = raw.userId;
  if (typeof userId !== "string" || !userId) return null;
  return {
    userId,
    username: typeof raw.username === "string" ? raw.username : "",
    role: typeof raw.role === "string" ? raw.role : PROFILE_ROLE_DEV_OVERRIDE,
    fullName:
      typeof raw.fullName === "string" && raw.fullName.trim()
        ? raw.fullName.trim()
        : typeof raw.username === "string"
          ? raw.username
          : "",
    position: typeof raw.position === "string" ? raw.position : "",
    email: typeof raw.email === "string" ? raw.email : undefined,
  };
}

const mapUserMeToProfileData = (d: UserMeData): ProfileData => ({
  name: d.fullName || "",
  email: d.email || "",
  phone: d.phone ?? "",
  address: d.permanentAddress ?? d.hometown ?? "",
  dob: d.dob ?? "",
  joinDate: d.joinDate ?? "",
  officialDate: d.officialDate ?? "",
  memberId: d.employeeCode || "",
  position: d.position || "",
  role: PROFILE_ROLE_DEV_OVERRIDE,
  branch: d.partyCell?.name ?? "",
  classification: d.status ?? "",
  objectType: d.targetGroup ?? "",
  ethnicity: d.ethnicity ?? "",
  religion: d.religion ?? "",
  education: d.academicLevel ?? "",
  profileNumber: d.partyCardId ?? d.id,
  avatarUrl: "",
});

const getProfileOverrideKey = (userId: string) => `profileOverride:${userId}`;

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

async function fetchUserMe(): Promise<UserMeData> {
  const { data: body } = await httpService.get<UserMeApiResponse>("/users/me");
  if (!body?.data) {
    throw new Error("Không lấy được hồ sơ người dùng");
  }
  return body.data;
}

function storedUserFromMe(d: UserMeData): CurrentUserSnapshot {
  return {
    userId: d.userId,
    username: d.employeeCode,
    role: PROFILE_ROLE_DEV_OVERRIDE,
    email: d.email || undefined,
    fullName: (d.fullName && d.fullName.trim()) || d.employeeCode,
    position: (d.position && d.position.trim()) || "",
  };
}

export const authService = {
  async login(payload: LoginPayload): Promise<LoginResponse> {
    try {
      const { accessToken, refreshToken } = await httpService.signIn(payload);
      const me = await fetchUserMe();
      const storedUser = storedUserFromMe(me);
      localStorage.setItem("currentUser", JSON.stringify(storedUser));

      return {
        userId: storedUser.userId,
        accessToken,
        refreshToken,
        role: storedUser.role,
        message: "Đăng nhập thành công",
      };
    } catch (error: unknown) {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("currentUser");
      throw error;
    }
  },

  async profile(): Promise<ProfileData> {
    const accessToken = localStorage.getItem("accessToken");
    if (!accessToken) {
      throw new Error("Chưa đăng nhập");
    }

    try {
      const me = await fetchUserMe();
      const base = mapUserMeToProfileData(me);
      const override = readProfileOverride(me.userId);
      return override ? { ...base, ...override } : base;
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Không tải được hồ sơ";
      throw error instanceof Error ? error : new Error(message);
    }
  },

  async updateProfile(payload: Partial<ProfileData>): Promise<ProfileData> {
    const accessToken = localStorage.getItem("accessToken");
    if (!accessToken) {
      throw new Error("Chưa đăng nhập");
    }

    const me = await fetchUserMe();
    const base = mapUserMeToProfileData(me);
    const existingOverride = readProfileOverride(me.userId) || {};
    const nextOverride = { ...existingOverride, ...payload };
    writeProfileOverride(me.userId, nextOverride);
    return { ...base, ...nextOverride };
  },

  async logout() {
    const accessToken = localStorage.getItem("accessToken");
    if (accessToken) {
      try {
        await httpService.logoutRemote();
      } catch {
        // Vẫn xóa phiên cục bộ nếu server lỗi
      }
    }
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("currentUser");
    window.location.href = "/login";
  },

  getCurrentRole() {
    const snap = this.getCurrentUserSnapshot();
    return snap?.role ?? null;
  },

  /** Đọc nhanh từ localStorage (sau login đã có fullName / position). */
  getCurrentUserSnapshot(): CurrentUserSnapshot | null {
    const raw = localStorage.getItem("currentUser");
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      return normalizeCurrentUserSnapshot(parsed);
    } catch {
      return null;
    }
  },

  /**
   * Cho header: đảm bảo có fullName từ phiên cũ thiếu trường — gọi GET /users/me (không toast).
   */
  async ensureHeaderUser(): Promise<CurrentUserSnapshot | null> {
    if (!localStorage.getItem("accessToken")) return null;
    const raw = localStorage.getItem("currentUser");
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as Record<string, unknown>;
        if (typeof parsed.fullName === "string" && parsed.fullName.trim().length > 0) {
          return normalizeCurrentUserSnapshot(parsed);
        }
      } catch {
        /* refetch */
      }
    }
    try {
      const me = await fetchUserMe();
      const snap = storedUserFromMe(me);
      localStorage.setItem("currentUser", JSON.stringify(snap));
      return snap;
    } catch {
      if (!raw) return null;
      try {
        return normalizeCurrentUserSnapshot(JSON.parse(raw) as Record<string, unknown>);
      } catch {
        return null;
      }
    }
  },

  /** Stub — danh sách người dùng lấy từ API khi có endpoint. */
  getUserList() {
    return [] as const;
  },
};
