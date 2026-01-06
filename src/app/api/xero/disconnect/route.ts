import { NextResponse } from "next/server";
import { disconnectXero } from "@/lib/xero";

export async function POST() {
  try {
    await disconnectXero();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error disconnecting Xero:", error);
    return NextResponse.json(
      { error: "Failed to disconnect from Xero" },
      { status: 500 }
    );
  }
}
