"use client";

import { API_URL } from "@/environment";
import { createContext, useContext, useEffect, useState } from "react";

const AuthContext = createContext<{
  user: any;
  login: (email: string, password: string) => Promise<void>;
  loginWithToken: (token: string) => void;
  logout: () => void;
  register: (name: string, email: string, password: string) => Promise<void>;
}>({
  user: null,
  login: async () => {},
  loginWithToken: () => {},
  logout: () => {},
  register: async () => {},
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

    const data = (await response.json()) as { token: string };
    setToken(data.token);
    localStorage.setItem("token", data.token);
  };

  const loginWithToken = (token: string) => {
    setToken(token);
    localStorage.setItem("token", token);
  };

  const logout = () => {
    setToken(null);
    localStorage.removeItem("token");
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

    // const data = (await response.json()) as { token: string };
    // setToken(data.token);
    // localStorage.setItem("token", data.token);
  };

  useEffect(() => {
    const storedToken = localStorage.getItem("token");
    if (storedToken) {
      setToken(storedToken);
    }
  }, []);

  return <AuthContext.Provider value={{ user: token, login, loginWithToken, logout, register }}>{children}</AuthContext.Provider>;
}