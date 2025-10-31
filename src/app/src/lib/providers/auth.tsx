"use client";

import { API_URL } from "@/environment";
import { jwtDecode } from "jwt-decode";
import { createContext, useContext, useEffect, useState } from "react";

const AuthContext = createContext<{
  claims: UserClaims | null;
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
  claims: null,
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
  const { tokens } = useAuth();
  return tokens ? children : null;
}

export function LoggedOut({ children }: { children: React.ReactNode }) {
  const { tokens } = useAuth();
  return !tokens ? children : null;
}

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [claims, setClaims] = useState<UserClaims | null>(null);

  const decode = (token: string): UserClaims => {
    const decoded = jwtDecode<{
      sub: string;
      email: string;
      role?: string;
      "http://schemas.microsoft.com/ws/2008/06/identity/claims/role"?: string;
      // exp: number;
    }>(token);
    return {
      id: decoded.sub,
      email: decoded.email,
      role: (decoded.role as any) || decoded["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"] || "user",
    };
  };

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
    const claims = decode(data.accessToken);

    setAccessToken(data.accessToken);
    setRefreshToken(data.refreshToken);
    setClaims(claims);

    localStorage.setItem("accessToken", data.accessToken);
    localStorage.setItem("refreshToken", data.refreshToken);
  };

  const loginWithToken = (accessToken: string, refreshToken: string) => {
    const claims = decode(accessToken);

    setAccessToken(accessToken);
    setRefreshToken(refreshToken);
    setClaims(claims);

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
    setClaims(null);

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
    const claims = decode(data.accessToken);

    setAccessToken(data.accessToken);
    setRefreshToken(data.refreshToken);
    setClaims(claims);

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
    setClaims(null);

    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
  };

  useEffect(() => {
    const storedToken = localStorage.getItem("accessToken");
    const storedRefresh = localStorage.getItem("refreshToken");

    if (storedToken) {
      const claims = decode(storedToken);
      setAccessToken(storedToken);
      setClaims(claims);
    }

    if (storedRefresh) {
      setRefreshToken(storedRefresh);
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        claims,
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