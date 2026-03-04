const committeeCredentials = {
  username: "vohoangplusmoi@yaaho.email",
  password: "tung12345",
};

const getApiBaseUrl = () => {
  const baseUrl =
    process.env.NEXT_PUBLIC_API_DEPLOY || process.env.API_DEPLOY || "";
  return baseUrl.replace(/\/$/, "");
};

type CommitteeAuthResponse = {
  accessToken?: string;
  refreshToken?: string;
  token?: string;
  data?: {
    accessToken?: string;
    refreshToken?: string;
  };
};

export const committeeAuthService = {
  async fetchCommitteeToken(): Promise<{
    accessToken: string;
    refreshToken?: string;
  }> {
    const baseUrl = getApiBaseUrl();
    if (!baseUrl) {
      throw new Error("Thiếu cấu hình API_DEPLOY");
    }

    const response = await fetch(`${baseUrl}/auth/signin`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(committeeCredentials),
    });

    if (!response.ok) {
      throw new Error("Không thể lấy token chi ủy");
    }

    const data = (await response.json()) as CommitteeAuthResponse;
    const accessToken =
      data.accessToken || data.data?.accessToken || data.token || "";
    const refreshToken = data.refreshToken || data.data?.refreshToken;

    if (!accessToken) {
      throw new Error("Dữ liệu token chi ủy không hợp lệ");
    }

    return { accessToken, refreshToken };
  },
  saveCommitteeToken(accessToken: string, refreshToken?: string) {
    localStorage.setItem("committeeAccessToken", accessToken);
    if (refreshToken) {
      localStorage.setItem("committeeRefreshToken", refreshToken);
    } else {
      localStorage.removeItem("committeeRefreshToken");
    }
  },
  getCommitteeAccessToken() {
    return localStorage.getItem("committeeAccessToken");
  },
  clearCommitteeToken() {
    localStorage.removeItem("committeeAccessToken");
    localStorage.removeItem("committeeRefreshToken");
  },
};
