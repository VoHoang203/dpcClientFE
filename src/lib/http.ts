"use client";

import { getDeployAPI } from "@/lib/apiEnv";
import axios, {
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from "axios";

interface TokenData {
  accessToken: string;
  refreshToken: string;
}

export type SignInPayload = {
  username: string;
  password: string;
};

function pickSignInTokens(data: unknown): { accessToken: string; refreshToken: string } {
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

  if (!accessToken || !refreshToken) {
    throw new Error("Phản hồi đăng nhập thiếu accessToken hoặc refreshToken");
  }

  return { accessToken, refreshToken };
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
      throw new Error("No refresh token available");
    }

    try {
      const response = await axios.post<TokenData>(
        `${this.axiosInstance.defaults.baseURL}/auth/refresh`,
        {
          refreshToken,
        }
      );

      const { accessToken, refreshToken: newRefreshToken } = response.data;

      this.saveTokens(accessToken, newRefreshToken || refreshToken);

      return accessToken;
    } catch (error) {
      this.clearTokens();
      window.location.href = "/login";
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

        if (error.response?.status === 401 && !originalRequest._retry) {
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

  /** POST /auth/refresh — body refreshToken, không dùng Bearer accessToken. */
  public async refreshSession(): Promise<string> {
    return this.refreshAccessToken();
  }

  public logout(): void {
    this.clearTokens();
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

const baseURL = getDeployAPI() || "http://localhost:4000";

const httpService = new HttpService(baseURL);

export default httpService;
