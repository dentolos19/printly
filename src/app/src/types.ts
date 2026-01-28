import generateServerFunctions from "@/lib/server";

export type ServerFetch = (endpoint: string, init?: RequestInit) => Promise<Response>;
export type ServerFunctions = ReturnType<typeof generateServerFunctions>;

export type UserClaims = {
  id: string;
  email: string;
  role: "admin" | "user";
};
