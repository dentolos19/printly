"use client";

import { API_URL } from "@/environment";
import { createContext, useContext, useEffect, useState } from "react";

const AuthContext = createContext<{
  user: any;
  tokens: {
    accessToken: string;
    refreshToken: string;
  } | null;
  login: (email: string, password: string) => Promise<void>;
  loginWithToken: (accessToken: string, refreshToken: string) => void;
  logout: () => void;
  register: (name: string, email: string, password: string) => Promise<void>;
  refreshAccess: () => Promise<void>;
  revokeAccess: () => Promise<void>;
}>({
  user: null,
  tokens: null,
  login: async () => {},
  loginWithToken: () => {},
  logout: () => {},
  register: async () => {},
  refreshAccess: async () => {},
  revokeAccess: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

export function LoggedIn({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  return user ? children : null;
}

export function LoggedOut({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  return !user ? children : null;
}

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);

  const login = async (email: string, password: string) => {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      throw new Error("Login failed");
    }

    const data = (await response.json()) as { accessToken: string; refreshToken: string };
    setAccessToken(data.accessToken);
    setRefreshToken(data.refreshToken);
    localStorage.setItem("accessToken", data.accessToken);
    localStorage.setItem("refreshToken", data.refreshToken);
  };

  const loginWithToken = (accessToken: string, refreshToken: string) => {
    setAccessToken(accessToken);
    setRefreshToken(refreshToken);
    localStorage.setItem("accessToken", accessToken);
    localStorage.setItem("refreshToken", refreshToken);
  };

  const logout = async () => {
    if (refreshToken) {
      try {
        await fetch(`${API_URL}/auth/revoke`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ refreshToken: refreshToken }),
        });
      } catch (error) {
        console.error("Failed to revoke token:", error);
      }
    }

    setAccessToken(null);
    setRefreshToken(null);
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
  };

  const register = async (name: string, email: string, password: string) => {
    const response = await fetch(`${API_URL}/auth/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name, email, password }),
    });

    if (!response.ok) {
      throw new Error("Registration failed");
    }
  };

  const refreshAccess = async () => {
    if (!refreshToken) {
      throw new Error("No refresh token available");
    }

    const response = await fetch(`${API_URL}/auth/refresh`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ refreshToken: refreshToken }),
    });

    if (!response.ok) {
      // If refresh fails, logout the user
      logout();
      throw new Error("Token refresh failed");
    }

    const data = (await response.json()) as { accessToken: string; refreshToken: string };
    setAccessToken(data.accessToken);
    setRefreshToken(data.refreshToken);
    localStorage.setItem("accessToken", data.accessToken);
    localStorage.setItem("refreshToken", data.refreshToken);
  };

  const revokeAccess = async () => {
    if (!refreshToken) {
      throw new Error("No refresh token available");
    }

    const response = await fetch(`${API_URL}/auth/revoke`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ refreshToken: refreshToken }),
    });

    if (!response.ok) {
      throw new Error("Token revocation failed");
    }

    setAccessToken(null);
    setRefreshToken(null);
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
  };

  useEffect(() => {
    const storedToken = localStorage.getItem("accessToken");
    const storedRefresh = localStorage.getItem("refreshToken");
    if (storedToken) setAccessToken(storedToken);
    if (storedRefresh) setRefreshToken(storedRefresh);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user: accessToken,
        tokens: accessToken && refreshToken ? { accessToken: accessToken, refreshToken: refreshToken } : null,
        login,
        loginWithToken,
        logout,
        register,
        refreshAccess,
        revokeAccess,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}