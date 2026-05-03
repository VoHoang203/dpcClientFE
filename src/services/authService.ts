import { normalizeAvatarDisplayUrl } from "@/lib/avatarUrl";
import httpService from "@/lib/http";
import { userService } from "@/services/userService";
import type { UpdateProfilePayload } from "@/services/userService";
import { isClientForbiddenRole } from "@/types/roles";

/** Đăng nhập Admin bị chặn — AuthContext hiển thị toast Sonner. */
export const CLIENT_ADMIN_FORBIDDEN = "CLIENT_ADMIN_FORBIDDEN";

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
  /** URL ảnh đại diện nếu BE trả về. */
  avatarUrl: string | null;
}

function optStr(v: unknown): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s === "" ? null : s;
}

function normalizePartyCell(raw: unknown): UserMePartyCell | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const id = String(o.id ?? "").trim();
  const name = String(o.name ?? "").trim();
  if (!id && !name) return null;
  return { id: id || "", name: name || "" };
}

/** Chuẩn hóa GET /users/me (camelCase hoặc snake_case). */
function normalizeUserMeData(raw: unknown): UserMeData {
  const r = (raw ?? {}) as Record<string, unknown>;
  return {
    id: String(r.id ?? "").trim(),
    userId: String(r.userId ?? r.user_id ?? "").trim(),
    employeeCode: String(r.employeeCode ?? r.employee_code ?? "").trim(),
    email: String(r.email ?? "").trim(),
    position: optStr(r.position),
    roleCode: optStr(r.roleCode ?? r.role_code),
    fullName: String(r.fullName ?? r.full_name ?? "").trim(),
    dob: optStr(r.dob),
    gender: optStr(r.gender),
    phone: optStr(r.phone),
    hometown: optStr(r.hometown),
    permanentAddress: optStr(r.permanentAddress ?? r.permanent_address),
    joinDate: optStr(r.joinDate ?? r.join_date),
    officialDate: optStr(r.officialDate ?? r.official_date),
    partyCardId: optStr(r.partyCardId ?? r.party_card_id),
    status: optStr(r.status),
    ethnicity: optStr(r.ethnicity),
    religion: optStr(r.religion),
    targetGroup: optStr(r.targetGroup ?? r.target_group),
    academicLevel: optStr(r.academicLevel ?? r.academic_level),
    politicalTheoryLevel: optStr(
      r.politicalTheoryLevel ?? r.political_theory_level,
    ),
    partyCell: normalizePartyCell(r.partyCell ?? r.party_cell),
    avatarUrl: optStr(
      r.avatarUrl ?? r.avatar_url ?? r.profileImageUrl ?? r.profile_image_url,
    ),
  };
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
  /** Địa chỉ thường trú (PATCH `permanentAddress`). */
  address: string;
  /** Quê quán (PATCH `hometown`). */
  hometown: string;
  dob: string;
  joinDate: string;
  officialDate: string;
  memberId: string;
  /** Chức danh / vị trí (map từ `position` khi có). */
  position: string;
  /** Vai trò phân quyền — từ `users/me.roleCode` (fallback: map `position`). */
  role: string;
  /** Mã vai trò từ BE (vd. COMMITTEE_MEMBER) — hiển thị dòng "Mã:". */
  roleCode: string;
  branch: string;
  classification: string;
  objectType: string;
  ethnicity: string;
  religion: string;
  education: string;
  gender: string;
  politicalTheoryLevel: string;
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
  /** Id hồ sơ đảng viên — từ GET /users/me `data.id` (khác `userId` tài khoản). */
  memberId?: string;
};

/** Khóa localStorage lưu riêng `data.id` từ /users/me. */
export const MEMBER_ID_STORAGE_KEY = "memberId";

function clearLocalAuthOnly(): void {
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("currentUser");
  localStorage.removeItem(MEMBER_ID_STORAGE_KEY);
}

function normalizeCurrentUserSnapshot(
  raw: Record<string, unknown>,
): CurrentUserSnapshot | null {
  const userId = raw.userId;
  if (typeof userId !== "string" || !userId) return null;
  let memberId: string | undefined =
    typeof raw.memberId === "string" && raw.memberId.trim()
      ? raw.memberId.trim()
      : undefined;
  if (
    !memberId &&
    typeof window !== "undefined" &&
    typeof localStorage !== "undefined"
  ) {
    const fromKey = localStorage.getItem(MEMBER_ID_STORAGE_KEY)?.trim();
    if (fromKey) memberId = fromKey;
  }
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
    ...(memberId ? { memberId } : {}),
  };
}

const mapUserMeToProfileData = (d: UserMeData): ProfileData => {
  const resolvedRole = resolveRoleFromUserMe(d);
  const rc = (d.roleCode ?? "").trim();
  return {
    name: d.fullName || "",
    email: d.email || "",
    phone: d.phone ?? "",
    address: (d.permanentAddress ?? "").trim(),
    hometown: (d.hometown ?? "").trim(),
    dob: d.dob ?? "",
    joinDate: d.joinDate ?? "",
    officialDate: d.officialDate ?? "",
    memberId: (d.id ?? "").trim() || d.employeeCode || "",
    position: positionDisplayFromMe(d),
    role: resolvedRole,
    roleCode: rc || resolvedRole,
    branch: d.partyCell?.name ?? "",
    classification: d.status ?? "",
    objectType: d.targetGroup ?? "",
    ethnicity: d.ethnicity ?? "",
    religion: d.religion ?? "",
    education: d.academicLevel ?? "",
    gender: (d.gender ?? "").trim(),
    politicalTheoryLevel: (d.politicalTheoryLevel ?? "").trim(),
    avatarUrl: normalizeAvatarDisplayUrl(d.avatarUrl),
  };
};

function dobToPatch(dob: string): string | undefined {
  const t = dob.trim();
  if (!t) return undefined;
  if (t.length >= 10) return t.slice(0, 10);
  return t;
}

function isGender(g: string): g is "MALE" | "FEMALE" | "OTHER" {
  const u = g.toUpperCase();
  return u === "MALE" || u === "FEMALE" || u === "OTHER";
}

function profileDataToUpdatePayload(p: ProfileData): UpdateProfilePayload {
  const genderRaw = p.gender.trim();
  return {
    fullName: p.name.trim() || undefined,
    gender: isGender(genderRaw)
      ? (genderRaw.toUpperCase() as "MALE" | "FEMALE" | "OTHER")
      : undefined,
    dob: dobToPatch(p.dob),
    hometown: p.hometown.trim() || undefined,
    permanentAddress: p.address.trim() || undefined,
    phone: p.phone.trim() || undefined,
    ethnicity: p.ethnicity.trim() || undefined,
    religion: p.religion.trim() || undefined,
    targetGroup: p.objectType.trim() || undefined,
    academicLevel: p.education.trim() || undefined,
    politicalTheoryLevel: p.politicalTheoryLevel.trim() || undefined,
    joinDate: dobToPatch(p.joinDate),
    officialDate: dobToPatch(p.officialDate),
  };
}

/** Chỉ giữ trường khác `undefined` — tránh `{ ...base, ...patch }` bị ghi đè bởi `undefined` từ object rải rác. */
function pickDefinedProfilePatch(
  patch: Partial<ProfileData>,
): Partial<ProfileData> {
  const out: Partial<ProfileData> = {};
  for (const key of Object.keys(patch) as (keyof ProfileData)[]) {
    const v = patch[key];
    if (v !== undefined) {
      (out as Record<string, unknown>)[key as string] = v as unknown;
    }
  }
  return out;
}

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
  const { data: body } = await httpService.get<unknown>("/users/me");
  const envelope = body as UserMeApiResponse | Record<string, unknown> | null;
  const payload =
    envelope &&
    typeof envelope === "object" &&
    "data" in envelope &&
    (envelope as UserMeApiResponse).data != null
      ? (envelope as UserMeApiResponse).data
      : body;
  if (!payload || typeof payload !== "object") {
    throw new Error("Không lấy được hồ sơ người dùng");
  }
  return normalizeUserMeData(payload);
}

function storedUserFromMe(d: UserMeData): CurrentUserSnapshot {
  const memberId = (d.id ?? "").trim();
  return {
    userId: d.userId,
    username: d.employeeCode,
    role: resolveRoleFromUserMe(d),
    email: d.email || undefined,
    fullName: (d.fullName && d.fullName.trim()) || d.employeeCode,
    position: positionDisplayFromMe(d),
    ...(memberId ? { memberId } : {}),
  };
}

/** Ghi `currentUser` + `memberId` (localStorage) sau mỗi lần có dữ liệu /users/me. */
function syncUserMeToLocalStorage(me: UserMeData): CurrentUserSnapshot {
  const snap = storedUserFromMe(me);
  if (isClientForbiddenRole(snap.role)) {
    clearLocalAuthOnly();
    throw new Error(CLIENT_ADMIN_FORBIDDEN);
  }
  localStorage.setItem("currentUser", JSON.stringify(snap));
  const mid = (me.id ?? "").trim();
  if (mid) {
    localStorage.setItem(MEMBER_ID_STORAGE_KEY, mid);
  } else {
    localStorage.removeItem(MEMBER_ID_STORAGE_KEY);
  }
  return snap;
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
      if (isClientForbiddenRole(role)) {
        clearLocalAuthOnly();
        throw new Error(CLIENT_ADMIN_FORBIDDEN);
      }
      if (role !== "OUTSTANDING_INDIVIDUAL") {
        localStorage.removeItem("currentUser");
        localStorage.removeItem(MEMBER_ID_STORAGE_KEY);
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
      const storedUser = syncUserMeToLocalStorage(me);

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
      localStorage.removeItem(MEMBER_ID_STORAGE_KEY);
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
      syncUserMeToLocalStorage(me);
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
    const me = await fetchUserMe();
    syncUserMeToLocalStorage(me);
    return me;
  },

  async updateProfile(payload: Partial<ProfileData>): Promise<ProfileData> {
    const accessToken = localStorage.getItem("accessToken");
    if (!accessToken) {
      throw new Error("Chưa đăng nhập");
    }

    const me = await fetchUserMe();
    syncUserMeToLocalStorage(me);
    const base = mapUserMeToProfileData(me);
    // `readProfileOverride` chỉ dùng khi đọc `profile()` (avatar data URL, v.v.) — không gộm vào PATCH
    // để tránh snapshot cũ / JSON demo trong localStorage làm body cập nhật sai.
    const patch = pickDefinedProfilePatch(payload);
    const merged: ProfileData = { ...base, ...patch };

    await userService.updateProfile(profileDataToUpdatePayload(merged));

    const me2 = await fetchUserMe();
    syncUserMeToLocalStorage(me2);
    const fresh = mapUserMeToProfileData(me2);

    const avatarOnly: Partial<ProfileData> = {};
    const keepAvatar =
      typeof merged.avatarUrl === "string" &&
      merged.avatarUrl.startsWith("data:");
    if (keepAvatar) {
      avatarOnly.avatarUrl = merged.avatarUrl;
    }
    writeProfileOverride(me2.userId, avatarOnly);
    return { ...fresh, ...avatarOnly };
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
    localStorage.removeItem(MEMBER_ID_STORAGE_KEY);
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
        const hasName =
          typeof parsed.fullName === "string" &&
          parsed.fullName.trim().length > 0;
        const hasMemberInSnap =
          typeof parsed.memberId === "string" &&
          parsed.memberId.trim().length > 0;
        const hasMemberKey =
          typeof localStorage !== "undefined" &&
          !!localStorage.getItem(MEMBER_ID_STORAGE_KEY)?.trim();
        if (hasName && (hasMemberInSnap || hasMemberKey)) {
          const snap = normalizeCurrentUserSnapshot(parsed);
          if (snap && isClientForbiddenRole(snap.role)) {
            clearLocalAuthOnly();
            throw new Error(CLIENT_ADMIN_FORBIDDEN);
          }
          return snap;
        }
      } catch (e) {
        if (e instanceof Error && e.message === CLIENT_ADMIN_FORBIDDEN) {
          throw e;
        }
        /* refetch */
      }
    }
    try {
      const me = await fetchUserMe();
      const snap = syncUserMeToLocalStorage(me);
      return snap;
    } catch (e) {
      if (e instanceof Error && e.message === CLIENT_ADMIN_FORBIDDEN) {
        throw e;
      }
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
