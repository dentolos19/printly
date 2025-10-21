"use client";

import { API_KEY } from "@/environment";
import { createContext, useContext, useEffect, useState } from "react";

const AuthContext = createContext<{
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  register: (name: string, email: string, password: string) => Promise<void>;
}>({
  token: null,
  login: async () => {},
  logout: () => {},
  register: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);

  const login = async (email: string, password: string) => {
    const response = await fetch(`${API_KEY}/login2`, {
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

  const logout = () => {
    setToken(null);
    localStorage.removeItem("token");
  };

  const register = async (name: string, email: string, password: string) => {
    const response = await fetch(`${API_KEY}/register2`, {
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

  return <AuthContext.Provider value={{ token, login, logout, register }}>{children}</AuthContext.Provider>;
}