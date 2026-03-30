"use client";

import { getDeployAPI } from "@/lib/apiEnv";
import axios, {
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from "axios";

export type SignInPayload = {
  username: string;
  password: string;
};

/** Parse envelope BE: `{ data: { accessToken, refreshToken, ... } }` hoặc phẳng. */
function extractTokenEnvelope(data: unknown): {
  accessToken: string;
  refreshToken: string;
  isFirstLogin: boolean;
} {
  const d = data as Record<string, unknown>;
  const nested = (d?.data as Record<string, unknown>) || {};

  const accessToken =
    (nested.accessToken as string) ||
    (d?.accessToken as string) ||
    (d?.token as string) ||
    "";

  const refreshToken =
    (nested.refreshToken as string) ||
    (d?.refreshToken as string) ||
    "";

  const isFirstLogin =
    nested.isFirstLogin === true || d.isFirstLogin === true;

  return { accessToken, refreshToken, isFirstLogin };
}

function pickSignInTokens(data: unknown): {
  accessToken: string;
  refreshToken: string;
  isFirstLogin: boolean;
} {
  const { accessToken, refreshToken, isFirstLogin } = extractTokenEnvelope(data);

  if (!accessToken || !refreshToken) {
    throw new Error("Phản hồi đăng nhập thiếu accessToken hoặc refreshToken");
  }

  return { accessToken, refreshToken, isFirstLogin };
}

/** Phản hồi refresh: bắt buộc có accessToken; refreshToken có thể xoay vòng hoặc giữ cũ. */
function pickRefreshTokens(data: unknown): { accessToken: string; refreshToken: string | null } {
  const { accessToken, refreshToken } = extractTokenEnvelope(data);
  if (!accessToken) {
    throw new Error("Phản hồi refresh thiếu accessToken");
  }
  return { accessToken, refreshToken: refreshToken || null };
}

class HttpService {
  private axiosInstance: AxiosInstance;
  private isRefreshing = false;
  private failedQueue: Array<{
    resolve: (token: string) => void;
    reject: (error: unknown) => void;
  }> = [];

  constructor(baseURL: string) {
    this.axiosInstance = axios.create({
      baseURL,
      timeout: 3000000,
      headers: {
        "Content-Type": "application/json",
      },
    });

    this.setupInterceptors();
  }

  private saveTokens(accessToken: string, refreshToken: string): void {
    localStorage.setItem("accessToken", accessToken);
    localStorage.setItem("refreshToken", refreshToken);
  }

  private getAccessToken(): string | null {
    return localStorage.getItem("accessToken");
  }

  private getRefreshToken(): string | null {
    return localStorage.getItem("refreshToken");
  }

  private clearTokens(): void {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
  }

  /** Xóa phiên đăng nhập (khi refresh hết hạn / thất bại). */
  private clearAuthSession(): void {
    this.clearTokens();
    localStorage.removeItem("currentUser");
  }

  private processQueue(error: unknown = null, token: string | null = null): void {
    this.failedQueue.forEach((prom) => {
      if (error) {
        prom.reject(error);
      } else {
        prom.resolve(token!);
      }
    });

    this.failedQueue = [];
  }

  private async refreshAccessToken(): Promise<string> {
    const refreshToken = this.getRefreshToken();

    if (!refreshToken) {
      this.clearAuthSession();
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
      throw new Error("Không có refresh token");
    }

    const base = this.axiosInstance.defaults.baseURL ?? "";

    try {
      // BE: POST /auth/refresh — gửi RT trên header (JWT), không gửi Bearer AT.
      const response = await axios.post(
        `${base}/auth/refresh`,
        {},
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${refreshToken}`,
          },
        }
      );

      const { accessToken, refreshToken: newRt } = pickRefreshTokens(response.data);
      this.saveTokens(accessToken, newRt ?? refreshToken);

      return accessToken;
    } catch (error) {
      // Chỉ khi refresh thất bại (RT hết hạn / thu hồi) mới về login.
      this.clearAuthSession();
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
      throw error;
    }
  }

  private setupInterceptors(): void {
    this.axiosInstance.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        const accessToken = this.getAccessToken();

        if (accessToken) {
          config.headers.Authorization = `Bearer ${accessToken}`;
        }

        return config;
      },
      (error) => Promise.reject(error)
    );

    this.axiosInstance.interceptors.response.use(
      (response: AxiosResponse) => response,
      async (error) => {
        const originalRequest = error.config as InternalAxiosRequestConfig & {
          _retry?: boolean;
        };

        const reqUrl = String(originalRequest.url ?? "");
        const isAuthRefreshCall = reqUrl.includes("/auth/refresh");
        const isAuthSignInCall = reqUrl.includes("/auth/signin");

        if (
          error.response?.status === 401 &&
          !originalRequest._retry &&
          !isAuthRefreshCall &&
          !isAuthSignInCall
        ) {
          if (this.isRefreshing) {
            return new Promise((resolve, reject) => {
              this.failedQueue.push({ resolve, reject });
            })
              .then((token) => {
                originalRequest.headers.Authorization = `Bearer ${token}`;
                return this.axiosInstance(originalRequest);
              })
              .catch((err) => Promise.reject(err));
          }

          originalRequest._retry = true;
          this.isRefreshing = true;

          try {
            const newAccessToken = await this.refreshAccessToken();
            this.processQueue(null, newAccessToken);
            originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
            return this.axiosInstance(originalRequest);
          } catch (refreshError) {
            this.processQueue(refreshError, null);
            return Promise.reject(refreshError);
          } finally {
            this.isRefreshing = false;
          }
        }

        return Promise.reject(error);
      }
    );
  }

  /** POST /auth/signin — không gửi Bearer; lưu token vào localStorage. */
  public async signIn(payload: SignInPayload): Promise<{
    accessToken: string;
    refreshToken: string;
    isFirstLogin: boolean;
  }> {
    const base = this.axiosInstance.defaults.baseURL;
    const { data } = await axios.post(`${base}/auth/signin`, payload, {
      headers: { "Content-Type": "application/json" },
    });
    const tokens = pickSignInTokens(data);
    this.saveTokens(tokens.accessToken, tokens.refreshToken);
    return tokens;
  }

  /** POST /auth/logout — Bearer accessToken (interceptor). */
  public async logoutRemote(): Promise<void> {
    await this.post("/auth/logout");
  }

  public setTokens(accessToken: string, refreshToken: string): void {
    this.saveTokens(accessToken, refreshToken);
  }

  /** POST /auth/refresh — Bearer refresh token trên header, không dùng AT. */
  public async refreshSession(): Promise<string> {
    return this.refreshAccessToken();
  }

  public logout(): void {
    this.clearAuthSession();
    window.location.href = "/login";
  }

  public get<T = unknown>(
    url: string,
    config?: AxiosRequestConfig
  ): Promise<AxiosResponse<T>> {
    return this.axiosInstance.get<T>(url, config);
  }

  public post<T = unknown>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig
  ): Promise<AxiosResponse<T>> {
    return this.axiosInstance.post<T>(url, data, config);
  }

  /** POST multipart (FormData) — bỏ Content-Type mặc định application/json để axios gắn boundary. */
  public postFormData<T = unknown>(
    url: string,
    formData: FormData,
    config?: AxiosRequestConfig
  ): Promise<AxiosResponse<T>> {
    return this.axiosInstance.post<T>(url, formData, {
      ...config,
      transformRequest: [
        (data, headers) => {
          if (data instanceof FormData) {
            const h = headers as import("axios").AxiosHeaders;
            h.delete("Content-Type");
          }
          return data;
        },
      ],
    });
  }

  public put<T = unknown>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig
  ): Promise<AxiosResponse<T>> {
    return this.axiosInstance.put<T>(url, data, config);
  }

  public patch<T = unknown>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig
  ): Promise<AxiosResponse<T>> {
    return this.axiosInstance.patch<T>(url, data, config);
  }

  public delete<T = unknown>(
    url: string,
    config?: AxiosRequestConfig
  ): Promise<AxiosResponse<T>> {
    return this.axiosInstance.delete<T>(url, config);
  }
}

/**
 * Base URL cho axios (chạy trong browser).
 * - Production: **bắt buộc** `NEXT_PUBLIC_BACKEND_DEPLOY` hoặc `NEXT_PUBLIC_API_BASE_URL`
 *   (cùng giá trị backend, ví dụ `http://160.25.81.143:3000`) — set trên nền deploy và **build lại**.
 * - Chỉ `API_DEPLOY` không đủ: Next không gửi biến không NEXT_PUBLIC_ xuống client.
 * - Dev: fallback `http://localhost:4000` khi env trống.
 */
function resolveHttpClientBaseURL(): string {
  const fromEnv = getDeployAPI().trim().replace(/\/$/, "");
  if (fromEnv) return fromEnv;

  if (process.env.NODE_ENV !== "production") {
    return "http://localhost:4000";
  }

  if (typeof window !== "undefined") {
    console.error(
      "[API] Thiếu NEXT_PUBLIC_BACKEND_DEPLOY hoặc NEXT_PUBLIC_API_BASE_URL khi build. " +
        "Trên Vercel/… hãy thêm một trong hai biến (cùng URL backend như API_DEPLOY) rồi deploy lại."
    );
  }
  return "";
}

const baseURL = resolveHttpClientBaseURL();

const httpService = new HttpService(baseURL);

export default httpService;
