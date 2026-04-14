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
import axios from "axios";
import {
  authService,
  MEMBER_ID_STORAGE_KEY,
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

function authApiErrorParts(error: unknown): { statusCode?: number; message: string } {
  if (axios.isAxiosError(error)) {
    const httpStatus =
      typeof error.response?.status === "number" ? error.response.status : undefined;
    const body = error.response?.data as unknown;
    if (body && typeof body === "object") {
      const o = body as Record<string, unknown>;
      const statusCode =
        typeof o.statusCode === "number" ? o.statusCode : httpStatus;
      const msg = o.message;
      if (typeof msg === "string" && msg.trim()) {
        return { statusCode, message: msg.trim() };
      }
    }
    return {
      statusCode: httpStatus,
      message: error.message || "Yêu cầu thất bại",
    };
  }
  if (error instanceof Error) return { message: error.message || "Yêu cầu thất bại" };
  return { message: "Yêu cầu thất bại" };
}

function toastAuthError(title: string, error: unknown, fallback: string) {
  const { statusCode, message } = authApiErrorParts(error);
  const finalMessage = message?.trim() ? message.trim() : fallback;
  toast.error(title, {
    description:
      typeof statusCode === "number"
        ? `${finalMessage} (statusCode: ${statusCode})`
        : finalMessage,
  });
}

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
      const outstandingUser = {
        userId: "OUTSTANDING_DEMO_02",
        username: "outstanding_demoo",
        fullName: "Quần chúng ưu tuuúu",
        email: "outstandinu@example.com",
        role: "OUTSTANDING_INDIVIDUAL",
        partyCellId: "4dc9d414-0e5d-47dc-828a-e0a249b2b888",
        position: "Quần chúng ưu tú",
      };
      toast.success("Đăng nhập thành công");
      if (res.isFirstLogin && res.role !== "OUTSTANDING_INDIVIDUAL") {
        setUser(null);
      } else {
        setUser(authService.getCurrentUserSnapshot());
      }
      if (res.role === "OUTSTANDING_INDIVIDUAL") {
        localStorage.setItem(
          "currentUser",
          JSON.stringify(outstandingUser)
        );
        localStorage.removeItem(MEMBER_ID_STORAGE_KEY);
        setUser(authService.getCurrentUserSnapshot());
      }
      return res;
    } catch (error: unknown) {
      toastAuthError(
        "Đăng nhập thất bại",
        error,
        "Vui lòng kiểm tra lại thông tin đăng nhập"
      );
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
      toastAuthError("Không tải được hồ sơ", error, "Không tải được hồ sơ");
      throw error;
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
        const { message } = authApiErrorParts(error);
        if (message === "Chưa đăng nhập") toast.error("Vui lòng đăng nhập");
        else if (message === "Không tìm thấy hồ sơ người dùng") toast.error(message);
        else toastAuthError("Cập nhật thất bại", error, "Cập nhật thất bại");
        throw error;
      }
    },
    [refreshUser],
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
    [user, status, refreshUser, login, logout, fetchProfile, updateProfile],
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
