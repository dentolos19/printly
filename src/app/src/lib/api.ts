import { API_URL } from "@/environment";

interface FetchWithAuthOptions extends RequestInit {
  skipAuth?: boolean;
}

/**
 * Fetch wrapper that automatically handles token refresh
 */
export async function fetchWithAuth(url: string, options: FetchWithAuthOptions = {}): Promise<Response> {
  const { skipAuth, ...fetchOptions } = options;

  // Get tokens from localStorage
  const token = localStorage.getItem("token");
  const refreshToken = localStorage.getItem("refreshToken");

  if (!skipAuth && token) {
    fetchOptions.headers = {
      ...fetchOptions.headers,
      Authorization: `Bearer ${token}`,
    };
  }

  let response = await fetch(url, fetchOptions);

  // If unauthorized and we have a refresh token, try to refresh
  if (response.status === 401 && refreshToken && !skipAuth) {
    try {
      const refreshResponse = await fetch(`${API_URL}/auth/refresh`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ refreshToken }),
      });

      if (refreshResponse.ok) {
        const data = (await refreshResponse.json()) as {
          token: string;
          refreshToken: string;
        };

        // Update stored tokens
        localStorage.setItem("token", data.token);
        localStorage.setItem("refreshToken", data.refreshToken);

        // Retry original request with new token
        fetchOptions.headers = {
          ...fetchOptions.headers,
          Authorization: `Bearer ${data.token}`,
        };

        response = await fetch(url, fetchOptions);
      } else {
        // Refresh failed, clear tokens
        localStorage.removeItem("token");
        localStorage.removeItem("refreshToken");
        window.location.href = "/auth";
      }
    } catch (error) {
      console.error("Token refresh failed:", error);
      localStorage.removeItem("token");
      localStorage.removeItem("refreshToken");
      window.location.href = "/auth";
    }
  }

  return response;
}