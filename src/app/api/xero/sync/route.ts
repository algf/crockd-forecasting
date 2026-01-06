import { NextRequest, NextResponse } from "next/server";
import { runInitialSync, runIncrementalSync, isXeroConnected } from "@/lib/xero";

export async function POST(request: NextRequest) {
  try {
    // Check if connected
    const connected = await isXeroConnected();
    if (!connected) {
      return NextResponse.json(
        { error: "Not connected to Xero" },
        { status: 400 }
      );
    }

    // Get sync type from body
    const body = await request.json().catch(() => ({}));
    const syncType = body.type || "incremental";

    let results;
    if (syncType === "initial") {
      results = await runInitialSync();
    } else {
      results = await runIncrementalSync();
    }

    return NextResponse.json(results);
  } catch (error) {
    console.error("Error running sync:", error);
    return NextResponse.json(
      { error: "Failed to sync with Xero" },
      { status: 500 }
    );
  }
}
