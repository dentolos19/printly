import { API_URL } from "@/environment";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    // Fetch asset without authentication
    const response = await fetch(`${API_URL}/asset/${id}`);

    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json({ error: "Asset not found" }, { status: 404 });
      }
      throw new Error(`Failed to fetch asset: ${response.statusText}`);
    }

    const asset = await response.json();
    return NextResponse.json(asset);
  } catch (error) {
    console.error("Error fetching asset:", error);
    return NextResponse.json({ error: "Failed to fetch asset" }, { status: 500 });
  }
}
