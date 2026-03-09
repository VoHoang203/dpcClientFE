import { beforeEach, describe, expect, it, vi } from "vitest";
import { authService, type ProfileData } from "@/services/authService";
import { loginWithTestUsers } from "@/test_services/authTestService";
import { committeeAuthService } from "@/services/committeeAuthService";
import { rawUsers } from "@/test_services/users";

// Mocks
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/test_services/authTestService", () => ({
  loginWithTestUsers: vi.fn(),
}));
vi.mock("@/services/committeeAuthService", () => ({
  committeeAuthService: {
    fetchCommitteeToken: vi.fn(),
    saveCommitteeToken: vi.fn(),
    getCommitteeAccessToken: vi.fn(),
    clearCommitteeToken: vi.fn(),
  },
}));

// Minimal localStorage mock
class LocalStorageMock {
  private store: Record<string, string> = {};
  clear() { this.store = {}; }
  getItem(key: string) { return this.store[key] ?? null; }
  setItem(key: string, value: string) { this.store[key] = value; }
  removeItem(key: string) { delete this.store[key]; }
}

const setupLoggedIn = (user: { id: string; role: string; username: string }) => {
  localStorage.setItem("accessToken", user.id);
  localStorage.setItem("refreshToken", user.id);
  localStorage.setItem("currentUser", JSON.stringify(user));
};

// @ts-expect-error override global for tests
global.localStorage = new LocalStorageMock();
global.window = { location: { href: "" } } as any;

describe("authService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("Should login successfully and store tokens and user; should fetch committee token for COMMITTEE role", async () => {
    const mockUser = { id: "U1", username: "U1", role: "COMMITTEE", email: "a@b.com" } as any;
    (loginWithTestUsers as unknown as vi.Mock).mockResolvedValue({
      user: mockUser,
      accessToken: "acc-U1",
      refreshToken: "ref-U1",
    });
    (committeeAuthService.fetchCommitteeToken as unknown as vi.Mock).mockResolvedValue({ accessToken: "com-acc", refreshToken: "com-ref" });

    const res = await authService.login({ username: "U1", password: "U1" });

    expect(res).toEqual({ userId: "U1", accessToken: "acc-U1", refreshToken: "ref-U1", message: "Đăng nhập thành công" });
    expect(localStorage.getItem("accessToken")).toBe("acc-U1");
    expect(localStorage.getItem("refreshToken")).toBe("ref-U1");
    const storedUser = JSON.parse(localStorage.getItem("currentUser")!);
    expect(storedUser.id).toBe("U1");
    expect(committeeAuthService.fetchCommitteeToken).toHaveBeenCalledTimes(1);
    expect(committeeAuthService.saveCommitteeToken).toHaveBeenCalledWith("com-acc", "com-ref");
  });

  it("Should show error toast if committee token fetch fails but still succeed login", async () => {
    const mockUser = { id: "U2", username: "U2", role: "COMMITTEE", email: "a@b.com" } as any;
    (loginWithTestUsers as unknown as vi.Mock).mockResolvedValue({ user: mockUser, accessToken: "acc-U2", refreshToken: "ref-U2" });
    (committeeAuthService.fetchCommitteeToken as unknown as vi.Mock).mockRejectedValue(new Error("committee down"));

    const res = await authService.login({ username: "U2", password: "U2" });

    expect(res.userId).toBe("U2");
    expect(localStorage.getItem("accessToken")).toBe("acc-U2");
    expect(committeeAuthService.fetchCommitteeToken).toHaveBeenCalledTimes(1);
    // saveCommitteeToken should not be called when fetch fails
    expect(committeeAuthService.saveCommitteeToken).not.toHaveBeenCalled();
  });

  it("Should reject login and show error toast when credentials invalid", async () => {
    (loginWithTestUsers as unknown as vi.Mock).mockRejectedValue(new Error("Sai tài khoản hoặc mật khẩu"));
    await expect(authService.login({ username: "bad", password: "creds" })).rejects.toThrowError();
    expect(localStorage.getItem("accessToken")).toBeNull();
  });

  it("Should fetch profile when logged in and merge overrides from localStorage", async () => {
    // Use an existing raw user to ensure profile mapping works
    const sample = rawUsers[0];
    setupLoggedIn({ id: sample.ma_so_nhan_vien, username: sample.ma_so_nhan_vien, role: "PARTY_MEMBER" });
    // add overrides
    localStorage.setItem(`profileOverride:${sample.ma_so_nhan_vien}`, JSON.stringify({ phone: "0123456789", education: "Đại học+" }));

    const profile = await authService.profile();

    expect(profile.memberId).toBe(sample.ma_so_nhan_vien);
    expect(profile.name).toBe(sample.ho_ten);
    expect(profile.phone).toBe("0123456789");
    expect(profile.education).toBe("Đại học+");
  });

  it("Should throw when fetching profile without access token", async () => {
    await expect(authService.profile()).rejects.toThrowError(/Ch.+ng nh.+p/u);
  });

  it("Should throw when profile user not found in rawUsers", async () => {
    setupLoggedIn({ id: "nonexistent", username: "nonexistent", role: "PARTY_MEMBER" });
    await expect(authService.profile()).rejects.toThrowError("Không tìm thấy hồ sơ người dùng");
  });

  it("Should update profile and persist overrides then return merged profile", () => {
    const sample = rawUsers[1];
    setupLoggedIn({ id: sample.ma_so_nhan_vien, username: sample.ma_so_nhan_vien, role: "PARTY_MEMBER" });

    const updated = authService.updateProfile({ phone: "0999999999", address: "Somewhere" });
    const stored = localStorage.getItem(`profileOverride:${sample.ma_so_nhan_vien}`);

    expect(stored).not.toBeNull();
    const parsed = JSON.parse(stored!);
    expect(parsed.phone).toBe("0999999999");
    expect(updated.address).toBe("Somewhere");
    expect(updated.memberId).toBe(sample.ma_so_nhan_vien);
  });

  it("Should throw when updating profile without login", () => {
    expect(() => authService.updateProfile({ phone: "1" })).toThrowError("Chưa đăng nhập");
  });

  it("Should throw when updating profile for unknown user", () => {
    setupLoggedIn({ id: "ghost", username: "ghost", role: "PARTY_MEMBER" });
    expect(() => authService.updateProfile({ phone: "1" })).toThrowError("Không tìm thấy hồ sơ người dùng");
  });

  it("Should logout clearing storage and redirect to /login", () => {
    setupLoggedIn({ id: "U10", username: "U10", role: "PARTY_MEMBER" });

    authService.logout();

    expect(localStorage.getItem("accessToken")).toBeNull();
    expect(localStorage.getItem("currentUser")).toBeNull();
    expect(committeeAuthService.clearCommitteeToken).toHaveBeenCalledTimes(1);
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

  it("Should return user list from testUsers", () => {
    const list = authService.getUserList();
    expect(Array.isArray(list)).toBe(true);
    expect(list.length).toBeGreaterThan(0);
    expect(list[0]).toHaveProperty("id");
  });
});
