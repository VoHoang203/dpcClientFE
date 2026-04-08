import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  authService,
  mapUserMePositionToRoleCode,
  resolveRoleFromUserMe,
  type UserMeData,
} from "@/services/authService";

const { mockHttp } = vi.hoisted(() => ({
  mockHttp: {
    signIn: vi.fn(),
    get: vi.fn(),
    logoutRemote: vi.fn(),
  },
}));

vi.mock("@/lib/http", () => ({ default: mockHttp }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

class LocalStorageMock {
  private store: Record<string, string> = {};
  clear() {
    this.store = {};
  }
  getItem(key: string) {
    return this.store[key] ?? null;
  }
  setItem(key: string, value: string) {
    this.store[key] = value;
  }
  removeItem(key: string) {
    delete this.store[key];
  }
}

const mockMeUser: UserMeData = {
  id: "a5dbd126-ad31-4bc8-9ea6-ddb4903c37d4",
  userId: "e034ab89-43c4-464b-9c7c-5f16468095da",
  employeeCode: "NV001",
  email: "test@example.com",
  position: "PARTY_MEMBER",
  roleCode: "PARTY_MEMBER",
  fullName: "Test User",
  dob: "2005-01-01",
  gender: null,
  phone: "0123456789",
  hometown: "Hà Nội",
  permanentAddress: null,
  joinDate: null,
  officialDate: null,
  partyCardId: null,
  status: "MASSES",
  ethnicity: null,
  religion: null,
  targetGroup: null,
  academicLevel: null,
  politicalTheoryLevel: null,
  partyCell: { id: "4dc9d414-0e5d-47dc-828a-e0a249b2b888", name: "FPTU" },
};

const userMeEnvelope = (data: UserMeData) => ({
  data: {
    statusCode: 200,
    message: "Thành công",
    data,
  },
});

// @ts-expect-error override global for tests
global.localStorage = new LocalStorageMock();
global.window = { location: { href: "" } } as any;

describe("authService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("Should map position UUID from /users/me to role code", () => {
    expect(
      mapUserMePositionToRoleCode("17344b1e-bb42-4029-99a7-031de9a0abb2")
    ).toBe("SECRETARY");
    expect(
      mapUserMePositionToRoleCode("30712521-ca69-442e-bfce-e8b5b31fcf2f")
    ).toBe("DEPUTY_SECRETARY");
    expect(
      mapUserMePositionToRoleCode("4dff4dc4-7145-4937-817f-a5659ec0bf4e")
    ).toBe("COMMITTEE_MEMBER");
    expect(
      mapUserMePositionToRoleCode("f2917fad-de89-4051-bcf5-a9343fe0aacb")
    ).toBe("MEMBER");
    expect(mapUserMePositionToRoleCode("00000000-0000-4000-8000-000000000000")).toBe(
      "PARTY_MEMBER"
    );
    expect(mapUserMePositionToRoleCode("PARTY_MEMBER")).toBe("PARTY_MEMBER");
  });

  it("Should resolve role from roleCode first, else from position", () => {
    expect(
      resolveRoleFromUserMe({
        ...mockMeUser,
        roleCode: "DEPUTY_SECRETARY",
        position: null,
      })
    ).toBe("DEPUTY_SECRETARY");
    expect(
      resolveRoleFromUserMe({
        ...mockMeUser,
        roleCode: null,
        position: "17344b1e-bb42-4029-99a7-031de9a0abb2",
      })
    ).toBe("SECRETARY");
  });

  it("Should login via signIn then fetch /users/me and store tokens and currentUser", async () => {
    mockHttp.signIn.mockImplementation(async () => {
      localStorage.setItem("accessToken", "acc-1");
      localStorage.setItem("refreshToken", "ref-1");
      return { accessToken: "acc-1", refreshToken: "ref-1", isFirstLogin: false };
    });
    mockHttp.get.mockResolvedValue(userMeEnvelope(mockMeUser));

    const res = await authService.login({ username: "NV001", password: "secret" });

    expect(mockHttp.signIn).toHaveBeenCalledWith({
      username: "NV001",
      password: "secret",
    });
    expect(mockHttp.get).toHaveBeenCalledWith("/users/me");
    expect(res).toEqual({
      userId: mockMeUser.userId,
      accessToken: "acc-1",
      refreshToken: "ref-1",
      role: "PARTY_MEMBER",
      message: "Đăng nhập thành công",
      isFirstLogin: false,
    });
    expect(localStorage.getItem("accessToken")).toBe("acc-1");
    expect(localStorage.getItem("refreshToken")).toBe("ref-1");
    const stored = JSON.parse(localStorage.getItem("currentUser")!);
    expect(stored.userId).toBe(mockMeUser.userId);
    expect(stored.username).toBe("NV001");
    expect(stored.role).toBe("PARTY_MEMBER");
    expect(stored.fullName).toBe(mockMeUser.fullName);
    expect(stored.position).toBe(mockMeUser.position);
    expect(stored.memberId).toBe(mockMeUser.id);
    expect(localStorage.getItem("memberId")).toBe(mockMeUser.id);
  });

  it("Should login first-time without GET /users/me until complete-profile", async () => {
    mockHttp.signIn.mockImplementation(async () => {
      localStorage.setItem("accessToken", "acc-ft");
      localStorage.setItem("refreshToken", "ref-ft");
      return { accessToken: "acc-ft", refreshToken: "ref-ft", isFirstLogin: true };
    });

    const res = await authService.login({ username: "NV001", password: "secret" });

    expect(mockHttp.get).not.toHaveBeenCalled();
    expect(res.isFirstLogin).toBe(true);
    expect(res.userId).toBe("");
    expect(res.role).toBe("PARTY_MEMBER");
    expect(localStorage.getItem("currentUser")).toBeNull();
    expect(localStorage.getItem("accessToken")).toBe("acc-ft");
  });

  it("Should reject login when signIn fails", async () => {
    mockHttp.signIn.mockRejectedValue(new Error("Sai tài khoản hoặc mật khẩu"));
    await expect(authService.login({ username: "bad", password: "creds" })).rejects.toThrowError();
    expect(localStorage.getItem("accessToken")).toBeNull();
  });

  it("Should fetch profile from GET /users/me and merge overrides", async () => {
    localStorage.setItem("accessToken", "tok");
    localStorage.setItem(
      "currentUser",
      JSON.stringify({
        userId: mockMeUser.userId,
        username: mockMeUser.employeeCode,
        role: mockMeUser.position,
      })
    );
    localStorage.setItem(
      `profileOverride:${mockMeUser.userId}`,
      JSON.stringify({ phone: "0999999999", education: "Đại học+" })
    );
    mockHttp.get.mockResolvedValue(userMeEnvelope(mockMeUser));

    const profile = await authService.profile();

    expect(profile.name).toBe(mockMeUser.fullName);
    expect(profile.role).toBe("PARTY_MEMBER");
    expect(profile.phone).toBe("0999999999");
    expect(profile.education).toBe("Đại học+");
  });

  it("Should throw when fetching profile without access token", async () => {
    await expect(authService.profile()).rejects.toThrowError(/Ch.+ng nh.+p/u);
  });

  it("Should throw when /users/me returns no data", async () => {
    localStorage.setItem("accessToken", "tok");
    mockHttp.get.mockResolvedValue({ data: { statusCode: 200, message: "ok", data: null as any } });

    await expect(authService.profile()).rejects.toThrowError();
  });

  it("Should update profile with API session: fetch me, merge overrides", async () => {
    localStorage.setItem("accessToken", "tok");
    localStorage.setItem(
      "currentUser",
      JSON.stringify({
        userId: mockMeUser.userId,
        username: mockMeUser.employeeCode,
        role: mockMeUser.position,
      })
    );
    mockHttp.get.mockResolvedValue(userMeEnvelope(mockMeUser));

    const updated = await authService.updateProfile({ phone: "0888888888", address: "Somewhere" });

    expect(updated.phone).toBe("0888888888");
    expect(updated.address).toBe("Somewhere");
    expect(updated.memberId).toBe(mockMeUser.id);
    const stored = localStorage.getItem(`profileOverride:${mockMeUser.userId}`);
    expect(stored).not.toBeNull();
    expect(JSON.parse(stored!).phone).toBe("0888888888");
  });

  it("Should update profile via GET /users/me when currentUser lacks userId", async () => {
    localStorage.setItem("accessToken", "tok");
    localStorage.setItem(
      "currentUser",
      JSON.stringify({ username: mockMeUser.employeeCode, role: "PARTY_MEMBER" })
    );
    mockHttp.get.mockResolvedValue(userMeEnvelope(mockMeUser));

    const updated = await authService.updateProfile({ phone: "0999999999", address: "Somewhere" });
    const stored = localStorage.getItem(`profileOverride:${mockMeUser.userId}`);

    expect(stored).not.toBeNull();
    expect(JSON.parse(stored!).phone).toBe("0999999999");
    expect(updated.address).toBe("Somewhere");
    expect(updated.memberId).toBe(mockMeUser.id);
  });

  it("Should throw when updating profile without login", async () => {
    await expect(authService.updateProfile({ phone: "1" })).rejects.toThrowError("Chưa đăng nhập");
  });

  it("Should throw when GET /users/me fails during updateProfile", async () => {
    localStorage.setItem("accessToken", "tok");
    localStorage.setItem("currentUser", JSON.stringify({ username: "ghost", role: "PARTY_MEMBER" }));
    mockHttp.get.mockRejectedValue(new Error("Network error"));
    await expect(authService.updateProfile({ phone: "1" })).rejects.toThrowError("Network error");
  });

  it("Should logout clearing storage and redirect to /login", async () => {
    localStorage.setItem("accessToken", "U10");
    localStorage.setItem("refreshToken", "r10");
    localStorage.setItem("currentUser", JSON.stringify({ userId: "u", username: "U10", role: "PARTY_MEMBER" }));
    mockHttp.logoutRemote.mockResolvedValue(undefined);

    await authService.logout();

    expect(mockHttp.logoutRemote).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem("accessToken")).toBeNull();
    expect(localStorage.getItem("currentUser")).toBeNull();
    expect(localStorage.getItem("memberId")).toBeNull();
    expect(global.window.location.href).toBe("/login");
  });

  it("Should getCurrentRole return null when no stored user or invalid JSON", () => {
    expect(authService.getCurrentRole()).toBeNull();
    localStorage.setItem("currentUser", "{ invalid json");
    expect(authService.getCurrentRole()).toBeNull();
  });

  it("Should getCurrentRole return role when valid stored user exists", () => {
    localStorage.setItem("currentUser", JSON.stringify({ role: "COMMITTEE" }));
    expect(authService.getCurrentRole()).toBe("COMMITTEE");
  });
});
