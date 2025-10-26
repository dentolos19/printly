"use client";

import { API_URL } from "@/environment";
import { createContext, useContext, useEffect, useState } from "react";

const AuthContext = createContext<{
  user: any;
  auth: {
    userToken: string;
    refreshToken: string;
  } | null;
  login: (email: string, password: string) => Promise<void>;
  loginWithToken: (token: string, refreshToken: string) => void;
  logout: () => void;
  register: (name: string, email: string, password: string) => Promise<void>;
  refreshToken: () => Promise<void>;
  revokeToken: () => Promise<void>;
}>({
  user: null,
  auth: null,
  login: async () => {},
  loginWithToken: () => {},
  logout: () => {},
  register: async () => {},
  refreshToken: async () => {},
  revokeToken: async () => {},
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
  const [token, setToken] = useState<string | null>(null);
  const [storedRefreshToken, setStoredRefreshToken] = useState<string | null>(null);

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

    const data = (await response.json()) as { token: string; refreshToken: string };
    setToken(data.token);
    setStoredRefreshToken(data.refreshToken);
    localStorage.setItem("token", data.token);
    localStorage.setItem("refreshToken", data.refreshToken);
  };

  const loginWithToken = (token: string, refreshToken: string) => {
    setToken(token);
    setStoredRefreshToken(refreshToken);
    localStorage.setItem("token", token);
    localStorage.setItem("refreshToken", refreshToken);
  };

  const logout = async () => {
    if (storedRefreshToken) {
      try {
        await fetch(`${API_URL}/auth/revoke`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ refreshToken: storedRefreshToken }),
        });
      } catch (error) {
        console.error("Failed to revoke token:", error);
      }
    }

    setToken(null);
    setStoredRefreshToken(null);
    localStorage.removeItem("token");
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

  const refreshToken = async () => {
    if (!storedRefreshToken) {
      throw new Error("No refresh token available");
    }

    const response = await fetch(`${API_URL}/auth/refresh`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ refreshToken: storedRefreshToken }),
    });

    if (!response.ok) {
      // If refresh fails, logout the user
      logout();
      throw new Error("Token refresh failed");
    }

    const data = (await response.json()) as { token: string; refreshToken: string };
    setToken(data.token);
    setStoredRefreshToken(data.refreshToken);
    localStorage.setItem("token", data.token);
    localStorage.setItem("refreshToken", data.refreshToken);
  };

  const revokeToken = async () => {
    if (!storedRefreshToken) {
      throw new Error("No refresh token available");
    }

    const response = await fetch(`${API_URL}/auth/revoke`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ refreshToken: storedRefreshToken }),
    });

    if (!response.ok) {
      throw new Error("Token revocation failed");
    }

    setToken(null);
    setStoredRefreshToken(null);
    localStorage.removeItem("token");
    localStorage.removeItem("refreshToken");
  };

  useEffect(() => {
    const storedToken = localStorage.getItem("token");
    const storedRefresh = localStorage.getItem("refreshToken");
    if (storedToken) {
      setToken(storedToken);
    }
    if (storedRefresh) {
      setStoredRefreshToken(storedRefresh);
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user: token,
        auth: token && storedRefreshToken ? { userToken: token, refreshToken: storedRefreshToken } : null,
        login,
        loginWithToken,
        logout,
        register,
        refreshToken,
        revokeToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}