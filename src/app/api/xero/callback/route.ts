import { NextRequest, NextResponse } from "next/server";
import { handleXeroCallback } from "@/lib/xero";

export async function GET(request: NextRequest) {
  try {
    const callbackUrl = request.url;
    const result = await handleXeroCallback(callbackUrl);

    if (result.success) {
      // Redirect to settings page with success message
      return NextResponse.redirect(
        new URL("/settings/xero?connected=true", request.url)
      );
    } else {
      // Redirect with error
      return NextResponse.redirect(
        new URL(`/settings/xero?error=${encodeURIComponent(result.error || "Unknown error")}`, request.url)
      );
    }
  } catch (error) {
    console.error("Error handling Xero callback:", error);
    return NextResponse.redirect(
      new URL(`/settings/xero?error=${encodeURIComponent("Failed to connect to Xero")}`, request.url)
    );
  }
}
