import { API_URL } from "@/environment";
import { NextRequest, NextResponse } from "next/server";

const PLACEHOLDER_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"><rect width="200" height="200" fill="#f3f4f6"/><text x="100" y="95" text-anchor="middle" fill="#9ca3af" font-family="system-ui" font-size="14">Image</text><text x="100" y="115" text-anchor="middle" fill="#9ca3af" font-family="system-ui" font-size="14">Unavailable</text></svg>`;
const PLACEHOLDER_BYTES = new TextEncoder().encode(PLACEHOLDER_SVG);

function isImageAccept(request: NextRequest): boolean {
  const accept = request.headers.get("accept") || "";
  return accept.includes("image") || accept.includes("*/*");
}

function placeholderResponse() {
  return new NextResponse(PLACEHOLDER_BYTES, {
    status: 502,
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "no-cache",
    },
  });
}

async function fetchWithRetry(url: string, retries = 1, timeoutMs = 30000): Promise<Response> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (res.ok) return res;
      lastError = new Error(`HTTP ${res.status}: ${res.statusText}`);
    } catch (err) {
      clearTimeout(timeoutId);
      lastError = err;
    }
    // Brief backoff before retry
    if (attempt < retries) await new Promise((r) => setTimeout(r, 500));
  }
  throw lastError;
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    // Fetch download URL from backend
    const response = await fetch(`${API_URL}/asset/${id}/download`);

    if (!response.ok) {
      if (response.status === 404) {
        if (isImageAccept(request)) return placeholderResponse();
        return NextResponse.json({ error: "Asset not found" }, { status: 404 });
      }
      throw new Error(`Failed to fetch asset download URL: ${response.statusText}`);
    }

    const { url } = (await response.json()) as { url: string };

    // Fetch the actual file from storage with retry and timeout
    const fileResponse = await fetchWithRetry(url);

    const contentType = fileResponse.headers.get("content-type") || "application/octet-stream";
    const contentDisposition = fileResponse.headers.get("content-disposition");

    // Stream the file back to the client
    return new NextResponse(fileResponse.body, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
        ...(contentDisposition && { "Content-Disposition": contentDisposition }),
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error downloading asset:", errorMessage, error);

    // For image requests, return a placeholder image instead of JSON error
    if (isImageAccept(request)) return placeholderResponse();

    if (error instanceof Error && error.name === "AbortError") {
      return NextResponse.json({ error: "Request timed out" }, { status: 504 });
    }

    return NextResponse.json({ error: `Failed to download asset: ${errorMessage}` }, { status: 500 });
  }
}
