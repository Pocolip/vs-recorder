import apiClient from "./client";
import type { AuthResponse, LoginCredentials, RegisterCredentials, User } from "../../types";

export const authApi = {
  register: (data: RegisterCredentials) =>
    apiClient.post("/api/auth/register", data) as Promise<AuthResponse>,

  login: (credentials: LoginCredentials) =>
    apiClient.post("/api/auth/login", credentials) as Promise<AuthResponse>,

  getCurrentUser: () =>
    apiClient.get("/api/auth/me") as Promise<User>,

  updateProfile: (updates: Partial<User>) =>
    apiClient.patch("/api/auth/me", updates) as Promise<User>,

  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    apiClient.post("/api/auth/change-password", data) as Promise<void>,

  refresh: (refreshToken: string) =>
    apiClient.post("/api/auth/refresh", { refreshToken }) as Promise<AuthResponse>,

  logout: () => {
    localStorage.removeItem("token");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("user");
  },

  forgotPassword: (email: string) =>
    apiClient.post("/api/auth/forgot-password", { email }) as Promise<{ message: string }>,

  validateResetToken: (token: string) =>
    apiClient.get(`/api/auth/reset-password/validate?token=${token}`) as Promise<{ valid: boolean }>,

  resetPassword: (data: { token: string; newPassword: string }) =>
    apiClient.post("/api/auth/reset-password", data) as Promise<{ message: string }>,
};

export default authApi;
