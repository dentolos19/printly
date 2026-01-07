"use client";

import { API_URL } from "@/environment";
import { UserClaims } from "@/types";
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

  const decodeAccess = (token: string): UserClaims => {
    const data = jwtDecode<{
      sub: string;
      email: string;
      role?: string;
      "http://schemas.microsoft.com/ws/2008/06/identity/claims/role"?: string;
      exp: number;
    }>(token);
    return {
      id: data.sub,
      email: data.email,
      role: (data.role as any) || data["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"] || "user",
    };
  };

  const validateAccess = (token: string): boolean => {
    try {
      const decodedToken = jwtDecode<{ exp: number }>(token);
      const currentTime = Math.floor(Date.now() / 1000);
      return decodedToken.exp > currentTime + 60 * 10;
    } catch {
      return false;
    }
  };

  const shouldRefresh = (token: string): boolean => {
    try {
      const decodedToken = jwtDecode<{ exp: number; iat: number }>(token);
      const currentTime = Math.floor(Date.now() / 1000);
      const tokenAge = currentTime - (decodedToken.iat || currentTime);

      // Proactively refresh if access token is older than 3.5 days (halfway through 7-day lifetime)
      return tokenAge >= 3.5 * 24 * 60 * 60;
    } catch {
      return false;
    }
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
      throw new Error("Failed to login.");
    }

    const data = (await response.json()) as { accessToken: string; refreshToken: string };
    const claims = decodeAccess(data.accessToken);

    setAccessToken(data.accessToken);
    setRefreshToken(data.refreshToken);
    setClaims(claims);

    localStorage.setItem("accessToken", data.accessToken);
    localStorage.setItem("refreshToken", data.refreshToken);
  };

  const loginWithToken = (accessToken: string, refreshToken: string) => {
    const claims = decodeAccess(accessToken);

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
        console.error("Failed to revoke token.");
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
      throw new Error("Failed to register.");
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
      logout();
      throw new Error("Failed to refresh token.");
    }

    const data = (await response.json()) as { accessToken: string; refreshToken: string };
    const claims = decodeAccess(data.accessToken);

    setAccessToken(data.accessToken);
    setRefreshToken(data.refreshToken);
    setClaims(claims);

    localStorage.setItem("accessToken", data.accessToken);
    localStorage.setItem("refreshToken", data.refreshToken);
  };

  const revokeAccess = async () => {
    if (!refreshToken) {
      throw new Error("No refresh token available.");
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
    (async () => {
      const storedToken = localStorage.getItem("accessToken");
      const storedRefresh = localStorage.getItem("refreshToken");

      if (storedToken && storedRefresh) {
        // Check if access token is still valid
        if (validateAccess(storedToken)) {
          const claims = decodeAccess(storedToken);
          setAccessToken(storedToken);
          setRefreshToken(storedRefresh);
          setClaims(claims);
        } else {
          // Try to refresh the access token
          try {
            const response = await fetch(`${API_URL}/auth/refresh`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ refreshToken: storedRefresh }),
            });

            if (response.ok) {
              const data = (await response.json()) as { accessToken: string; refreshToken: string };
              const claims = decodeAccess(data.accessToken);

              setAccessToken(data.accessToken);
              setRefreshToken(data.refreshToken);
              setClaims(claims);

              localStorage.setItem("accessToken", data.accessToken);
              localStorage.setItem("refreshToken", data.refreshToken);
            } else {
              // Logout if refresh fails
              localStorage.removeItem("accessToken");
              localStorage.removeItem("refreshToken");
              setAccessToken(null);
              setRefreshToken(null);
              setClaims(null);
            }
          } catch (error) {
            console.error("Failed to refresh token.");

            setAccessToken(null);
            setRefreshToken(null);
            setClaims(null);

            localStorage.removeItem("accessToken");
            localStorage.removeItem("refreshToken");
          }
        }
      } else if (storedToken) {
        if (validateAccess(storedToken)) {
          const claims = decodeAccess(storedToken);
          setAccessToken(storedToken);
          setClaims(claims);
        } else {
          localStorage.removeItem("accessToken");
        }
      }
    })();
  }, []);

  // Background validation timer - checks tokens every 5 minutes
  useEffect(() => {
    if (!accessToken || !refreshToken) {
      return;
    }

    let hasRunInitialValidation = false;

    const validateAndRefresh = () => {
      (async () => {
        try {
          // Verify user still exists in database
          const verifyResponse = await fetch(`${API_URL}/auth/verify`, {
            method: "GET",
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          });

          if (!verifyResponse.ok) {
            console.error("User verification failed");
            logout();
            return;
          }

          // Check if access token should be proactively refreshed (older than 3.5 days)
          if (shouldRefresh(accessToken)) {
            console.log("Proactively refreshing tokens");
            refreshAccess().catch((error) => {
              console.error("Failed to refresh tokens:", error);
              // Only logout if it's actually an auth error, not a network error
              if (error.message?.includes("Failed to refresh")) {
                logout();
              }
            });
          }
        } catch (error) {
          console.error("Token validation error:", error);
          // Don't logout on network errors, will retry in next interval
        }
      })();
    };

    // Run validation immediately when user visits site (e.g., after page refresh)
    // This ensures deleted users get logged out quickly
    const immediateTimeout = setTimeout(() => {
      if (!hasRunInitialValidation) {
        hasRunInitialValidation = true;
        validateAndRefresh();
      }
    }, 1000);

    // Set up interval for periodic validation (every 5 minutes)
    const interval = setInterval(validateAndRefresh, 5 * 60 * 1000);

    return () => {
      clearTimeout(immediateTimeout);
      clearInterval(interval);
    };
  }, [accessToken, refreshToken]);

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
