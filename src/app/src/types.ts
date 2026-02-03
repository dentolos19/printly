import generateServerFunctions from "@/lib/server";

export type ServerFetch = (endpoint: string, init?: RequestInit) => Promise<Response>;
export type ServerFunctions = ReturnType<typeof generateServerFunctions>;

export type UserClaims = {
  id: string;
  email: string;
  role: "admin" | "user";
};

export type UserProfile = {
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
