import { ServerFetch } from "@/types";

export type UserProfileResponse = {
  id: string;
  email: string;
  displayName: string | null;
  bio: string | null;
  avatarId: string | null;
  location: string | null;
  website: string | null;
  dateOfBirth: string | null;
  role: string;
  hasPassword: boolean;
  followersCount: number;
  followingCount: number;
  createdAt: string;
  updatedAt: string;
};

export type PublicUserProfileResponse = {
  id: string;
  displayName: string | null;
  bio: string | null;
  avatarId: string | null;
  location: string | null;
  website: string | null;
  followersCount: number;
  followingCount: number;
  isFollowing: boolean;
  createdAt: string;
};

export type UpdateProfileDto = {
  displayName?: string | null;
  bio?: string | null;
  avatarId?: string | null;
  location?: string | null;
  website?: string | null;
  dateOfBirth?: string | null;
};

export type UpdateEmailDto = {
  newEmail: string;
  password: string;
};

export type UpdatePasswordDto = {
  currentPassword: string;
  newPassword: string;
};

export default function initUserController(fetch: ServerFetch) {
  return {
    getProfile: async (): Promise<UserProfileResponse> => {
      const response = await fetch("/user/profile", {
        method: "GET",
      });

      if (!response.ok) {
        throw new Error("Failed to get profile");
      }

      return response.json();
    },

    updateProfile: async (body: UpdateProfileDto): Promise<UserProfileResponse> => {
      const response = await fetch("/user/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error("Failed to update profile");
      }

      return response.json();
    },

    updateEmail: async (body: UpdateEmailDto): Promise<void> => {
      const response = await fetch("/user/email", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error("Failed to update email");
      }
    },

    updatePassword: async (body: UpdatePasswordDto): Promise<void> => {
      const response = await fetch("/user/password", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error("Failed to update password");
      }
    },

    getPublicProfile: async (userId: string): Promise<PublicUserProfileResponse> => {
      const response = await fetch(`/user/${userId}`, {
        method: "GET",
      });

      if (!response.ok) {
        throw new Error("Failed to get public profile");
      }

      return response.json();
    },

    deleteAccount: async (): Promise<void> => {
      const response = await fetch("/user/account", {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete account");
      }
    },
  };
}
