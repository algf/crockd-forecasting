import { NextResponse } from "next/server";
import { getXeroAuthUrl } from "@/lib/xero";

export async function GET() {
  try {
    const authUrl = await getXeroAuthUrl();
    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error("Error generating Xero auth URL:", error);
    return NextResponse.json(
      { error: "Failed to connect to Xero" },
      { status: 500 }
    );
  }
}
