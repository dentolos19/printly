import { ServerFetch } from "@/types";

export type RegisterDto = {
  name: string;
  email: string;
  password: string;
};

export type LoginDto = {
  email: string;
  password: string;
};

export type RefreshDto = {
  refreshToken: string;
};

export type AuthResponse = {
  accessToken: string;
  refreshToken: string;
};

export type ToggleRoleResponse = {
  role: string;
};

export default function initAuthController(fetch: ServerFetch) {
  return {
    register: async (body: RegisterDto): Promise<void> => {
      const response = await fetch("/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error("Failed to register");
      }
    },

    login: async (body: LoginDto): Promise<AuthResponse> => {
      const response = await fetch("/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error("Failed to login");
      }

      return response.json();
    },

    verify: async (): Promise<void> => {
      const response = await fetch("/auth/verify", {
        method: "GET",
      });

      if (!response.ok) {
        throw new Error("User verification failed");
      }
    },

    refresh: async (body: RefreshDto): Promise<AuthResponse> => {
      const response = await fetch("/auth/refresh", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error("Failed to refresh token");
      }

      return response.json();
    },

    revoke: async (body: RefreshDto): Promise<void> => {
      const response = await fetch("/auth/revoke", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error("Failed to revoke token");
      }
    },

    toggleRole: async (): Promise<ToggleRoleResponse> => {
      const response = await fetch("/auth/toggle-role", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to toggle role");
      }

      return response.json();
    },
  };
}
