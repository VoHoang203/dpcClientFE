import { testUsers, type TestUser } from "./users";

export interface TestLoginResponse {
  user: TestUser;
  accessToken: string;
  refreshToken: string;
}

export const loginWithTestUsers = async (
  username: string,
  password: string
): Promise<TestLoginResponse> => {
  const normalizedUsername = username.trim();
  const normalizedPassword = password.trim();

  const match = testUsers.find(
    (user) =>
      user.username === normalizedUsername &&
      user.username === normalizedPassword
  );

  if (!match) {
    throw new Error("Sai tài khoản hoặc mật khẩu");
  }

  return {
    user: match,
    accessToken: match.username,
    refreshToken: match.username,
  };
};
