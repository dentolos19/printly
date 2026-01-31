import { API_URL } from "@/environment";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    // Fetch download URL from backend
    const response = await fetch(`${API_URL}/asset/${id}/download`);

    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json({ error: "Asset not found" }, { status: 404 });
      }
      throw new Error(`Failed to fetch asset download URL: ${response.statusText}`);
    }

    const { url } = (await response.json()) as { url: string };

    // Fetch the actual file from storage with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      const fileResponse = await fetch(url, {
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!fileResponse.ok) {
        throw new Error(`Failed to download file: ${fileResponse.statusText}`);
      }

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
    } catch (fetchError) {
      clearTimeout(timeoutId);
      throw fetchError;
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error downloading asset:", errorMessage, error);

    // Return more specific error for debugging
    if (error instanceof Error && error.name === "AbortError") {
      return NextResponse.json({ error: "Request timed out" }, { status: 504 });
    }

    return NextResponse.json({ error: `Failed to download asset: ${errorMessage}` }, { status: 500 });
  }
}
