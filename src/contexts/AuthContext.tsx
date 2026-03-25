"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { toast } from "sonner";
import {
  authService,
  type CurrentUserSnapshot,
  type LoginPayload,
  type LoginResponse,
  type ProfileData,
} from "@/services/authService";

type AuthStatus = "loading" | "ready";

export type AuthContextValue = {
  user: CurrentUserSnapshot | null;
  status: AuthStatus;
  isReady: boolean;
  isAuthenticated: boolean;
  refreshUser: () => Promise<void>;
  login: (payload: LoginPayload) => Promise<LoginResponse>;
  logout: () => Promise<void>;
  fetchProfile: () => Promise<ProfileData>;
  updateProfile: (payload: Partial<ProfileData>) => Promise<ProfileData>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CurrentUserSnapshot | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");

  const refreshUser = useCallback(async () => {
    if (typeof window === "undefined") return;
    if (!localStorage.getItem("accessToken")) {
      setUser(null);
      setStatus("ready");
      return;
    }
    const snap = await authService.ensureHeaderUser();
    setUser(snap);
    setStatus("ready");
  }, []);

  useEffect(() => {
    void refreshUser();
  }, [refreshUser]);

  const login = useCallback(async (payload: LoginPayload) => {
    try {
      const res = await authService.login(payload);
      toast.success("Đăng nhập thành công");
      setUser(authService.getCurrentUserSnapshot());
      return res;
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "Vui lòng kiểm tra lại thông tin đăng nhập";
      toast.error("Đăng nhập thất bại", { description: message });
      throw error;
    }
  }, []);

  const logout = useCallback(async () => {
    toast.success("Đã đăng xuất");
    setUser(null);
    await authService.logout();
  }, []);

  const fetchProfile = useCallback(async () => {
    if (!localStorage.getItem("accessToken")) {
      toast.error("Vui lòng đăng nhập");
      throw new Error("Chưa đăng nhập");
    }
    try {
      return await authService.profile();
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Không tải được hồ sơ";
      toast.error(message);
      throw error instanceof Error ? error : new Error(message);
    }
  }, []);

  const updateProfile = useCallback(
    async (payload: Partial<ProfileData>) => {
      try {
        const updated = await authService.updateProfile(payload);
        toast.success("Đã cập nhật hồ sơ");
        await refreshUser();
        return updated;
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : "Cập nhật thất bại";
        if (msg === "Chưa đăng nhập") toast.error("Vui lòng đăng nhập");
        else if (msg === "Không tìm thấy hồ sơ người dùng") toast.error(msg);
        else toast.error(msg);
        throw error;
      }
    },
    [refreshUser]
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      status,
      isReady: status === "ready",
      isAuthenticated: status === "ready" && !!user,
      refreshUser,
      login,
      logout,
      fetchProfile,
      updateProfile,
    }),
    [user, status, refreshUser, login, logout, fetchProfile, updateProfile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth phải dùng bên trong AuthProvider");
  }
  return ctx;
}
