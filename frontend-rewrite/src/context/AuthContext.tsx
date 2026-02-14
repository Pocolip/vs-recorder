import { createContext, useContext, useState, useEffect } from "react";
import type { ReactNode } from "react";
import { authApi } from "../services/api";
import type { User, LoginCredentials, RegisterCredentials, AuthResponse } from "../types";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  register: (credentials: RegisterCredentials) => Promise<AuthResponse>;
  login: (credentials: LoginCredentials) => Promise<AuthResponse>;
  logout: () => void;
  updateProfile: (updates: Partial<User>) => Promise<User>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem("token");
      const storedUser = localStorage.getItem("user");

      if (token && storedUser) {
        try {
          const currentUser = await authApi.getCurrentUser();
          setUser(currentUser);
        } catch (err) {
          console.error("Auth verification failed:", err);
          localStorage.removeItem("token");
          localStorage.removeItem("refreshToken");
          localStorage.removeItem("user");
          setUser(null);
        }
      }

      setLoading(false);
    };

    initAuth();
  }, []);

  const register = async (credentials: RegisterCredentials): Promise<AuthResponse> => {
    try {
      setError(null);
      const response = await authApi.register(credentials);

      localStorage.setItem("token", response.token);
      if (response.refreshToken) {
        localStorage.setItem("refreshToken", response.refreshToken);
      }
      localStorage.setItem("user", JSON.stringify(response));

      setUser(response);
      return response;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Registration failed";
      setError(message);
      throw err;
    }
  };

  const login = async (credentials: LoginCredentials): Promise<AuthResponse> => {
    try {
      setError(null);
      const response = await authApi.login(credentials);

      localStorage.setItem("token", response.token);
      if (response.refreshToken) {
        localStorage.setItem("refreshToken", response.refreshToken);
      }
      localStorage.setItem("user", JSON.stringify(response));

      setUser(response);
      return response;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Login failed";
      setError(message);
      throw err;
    }
  };

  const logout = () => {
    authApi.logout();
    setUser(null);
    setError(null);
  };

  const updateProfile = async (updates: Partial<User>): Promise<User> => {
    try {
      setError(null);
      const updatedUser = await authApi.updateProfile(updates);

      localStorage.setItem("user", JSON.stringify(updatedUser));
      setUser(updatedUser);

      return updatedUser;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Profile update failed";
      setError(message);
      throw err;
    }
  };

  const value: AuthContextType = {
    user,
    loading,
    error,
    isAuthenticated: !!user,
    register,
    login,
    logout,
    updateProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export default AuthContext;
