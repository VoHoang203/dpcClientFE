import httpService from "@/lib/http";

export type { RawPartyUser } from "@/services/authTypes";

/** UUID chức vụ cố định từ DB → mã role (đồng bộ BE). */
const POSITION_UUID_TO_CODE: Record<string, string> = {
  "17344b1e-bb42-4029-99a7-031de9a0abb2": "SECRETARY",
  "30712521-ca69-442e-bfce-e8b5b31fcf2f": "DEPUTY_SECRETARY",
  "4dff4dc4-7145-4937-817f-a5659ec0bf4e": "COMMITTEE_MEMBER",
  "f2917fad-de89-4051-bcf5-a9343fe0aacb": "MEMBER",
};

const UUID_V4_LIKE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * `/users/me` có thể trả `position` là UUID chức vụ hoặc đã là mã (vd. PARTY_MEMBER).
 * - Khớp 1 trong 4 UUID → mã tương ứng.
 * - UUID lạ → PARTY_MEMBER (giống BE).
 * - Không phải UUID → giữ nguyên (vd. PARTY_MEMBER, MEMBER).
 */
export function mapUserMePositionToRoleCode(
  raw: string | null | undefined,
): string {
  const s = (raw ?? "").trim();
  if (!s) return "PARTY_MEMBER";
  if (!UUID_V4_LIKE.test(s)) return s;
  return POSITION_UUID_TO_CODE[s.toLowerCase()] ?? "PARTY_MEMBER";
}

export interface LoginPayload {
  username: string;
  password: string;
}

export interface LoginResponse {
  /** Rỗng khi `isFirstLogin` — chưa gọi /users/me. */
  userId: string;
  accessToken: string;
  refreshToken: string;
  message: string;
  role: string;
  /** Từ `data.isFirstLogin` khi đăng nhập — true thì cần hoàn hồ sơ (không gọi /me ở bước login). */
  isFirstLogin: boolean;
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
  /** Chức vụ / UUID — có thể null (BE mới). */
  position: string | null;
  /** Mã vai trò phân quyền từ BE (vd. PARTY_MEMBER, DEPUTY_SECRETARY). */
  roleCode: string | null;
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

/** Vai trò phân quyền: ưu tiên `roleCode` từ GET /users/me, không ép trên FE. */
export function resolveRoleFromUserMe(d: UserMeData): string {
  const rc = (d.roleCode ?? "").trim();
  if (rc) return rc;
  return mapUserMePositionToRoleCode(d.position);
}

function positionDisplayFromMe(d: UserMeData): string {
  const p = d.position;
  if (p == null || String(p).trim() === "") return "";
  return mapUserMePositionToRoleCode(p);
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
  /** Chức danh / vị trí (map từ `position` khi có). */
  position: string;
  /** Vai trò phân quyền — từ `users/me.roleCode` (fallback: map `position`). */
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

function normalizeCurrentUserSnapshot(
  raw: Record<string, unknown>,
): CurrentUserSnapshot | null {
  const userId = raw.userId;
  if (typeof userId !== "string" || !userId) return null;
  return {
    userId,
    username: typeof raw.username === "string" ? raw.username : "",
    role:
      typeof raw.role === "string" && raw.role.trim()
        ? raw.role
        : "PARTY_MEMBER",
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
  position: positionDisplayFromMe(d),
  role: resolveRoleFromUserMe(d),
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
    role: resolveRoleFromUserMe(d),
    email: d.email || undefined,
    fullName: (d.fullName && d.fullName.trim()) || d.employeeCode,
    position: positionDisplayFromMe(d),
  };
}

export const authService = {
  async login(payload: LoginPayload): Promise<LoginResponse> {
    try {
      const { accessToken, refreshToken, isFirstLogin } =
        await httpService.signIn(payload);

      if (isFirstLogin) {
      let role = "";
      try {
        const { data } = await httpService.post<{ data?: { role?: string }; role?: string }>("/auth/signin", payload);
        role =
          (data?.data &&
            typeof data.data.role === "string" &&
            data.data.role) ||
          (typeof data.role === "string" && data.role) ||
          "";
      } catch {
      }
      if (role !== "OUTSTANDING_INDIVIDUAL") {
        localStorage.removeItem("currentUser");
      }
      return {
        userId: "",
        accessToken,
        refreshToken,
        role,
        message: "Đăng nhập thành công",
        isFirstLogin: true,
      };
    }

      const me = await fetchUserMe();
      const storedUser = storedUserFromMe(me);
      localStorage.setItem("currentUser", JSON.stringify(storedUser));

      return {
        userId: storedUser.userId,
        accessToken,
        refreshToken,
        role: storedUser.role,
        message: "Đăng nhập thành công",
        isFirstLogin: false,
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

  /** GET /users/me — dữ liệu thô (form hoàn hồ sơ, v.v.). */
  async fetchMe(): Promise<UserMeData> {
    if (!localStorage.getItem("accessToken")) {
      throw new Error("Chưa đăng nhập");
    }
    return fetchUserMe();
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
        if (
          typeof parsed.fullName === "string" &&
          parsed.fullName.trim().length > 0
        ) {
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
        return normalizeCurrentUserSnapshot(
          JSON.parse(raw) as Record<string, unknown>,
        );
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
