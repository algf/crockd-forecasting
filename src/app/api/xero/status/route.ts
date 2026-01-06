import { NextResponse } from "next/server";
import { getXeroConnectionStatus, getSyncStatus } from "@/lib/xero";

export async function GET() {
  try {
    const connectionStatus = await getXeroConnectionStatus();
    const syncStatus = await getSyncStatus();

    return NextResponse.json({
      ...connectionStatus,
      sync: syncStatus,
    });
  } catch (error) {
    console.error("Error getting Xero status:", error);
    return NextResponse.json(
      { error: "Failed to get Xero status" },
      { status: 500 }
    );
  }
}
