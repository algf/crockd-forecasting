import { XeroClient } from "xero-node";
import { prisma } from "@/lib/db";
import { XERO_CONFIG } from "./config";

/**
 * Creates and configures a Xero client
 */
export function createXeroClient(): XeroClient {
  const clientId = process.env.XERO_CLIENT_ID;
  const clientSecret = process.env.XERO_CLIENT_SECRET;
  const redirectUri = process.env.XERO_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error(
      "Missing Xero credentials. Please set XERO_CLIENT_ID, XERO_CLIENT_SECRET, and XERO_REDIRECT_URI environment variables."
    );
  }

  const xero = new XeroClient({
    clientId,
    clientSecret,
    redirectUris: [redirectUri],
    scopes: XERO_CONFIG.scopes as unknown as string[],
  });

  return xero;
}

/**
 * Gets a configured Xero client with valid tokens
 */
export async function getAuthenticatedXeroClient(): Promise<{
  client: XeroClient;
  tenantId: string;
} | null> {
  // Get the active tenant from the database
  const tenant = await prisma.xeroTenant.findFirst({
    where: { isActive: true },
  });

  if (!tenant) {
    return null;
  }

  const xero = createXeroClient();

  // Check if token needs refresh
  const now = new Date();
  if (tenant.tokenExpiresAt <= now) {
    try {
      // Set the current token set for refresh
      xero.setTokenSet({
        access_token: tenant.accessToken,
        refresh_token: tenant.refreshToken,
        expires_at: Math.floor(tenant.tokenExpiresAt.getTime() / 1000),
        token_type: "Bearer",
        scope: XERO_CONFIG.scopes.join(" "),
      });

      // Refresh the token
      const newTokenSet = await xero.refreshToken();

      // Update the database with new tokens
      await prisma.xeroTenant.update({
        where: { id: tenant.id },
        data: {
          accessToken: newTokenSet.access_token!,
          refreshToken: newTokenSet.refresh_token!,
          tokenExpiresAt: new Date((newTokenSet.expires_at || 0) * 1000),
          updatedAt: new Date(),
        },
      });

      return { client: xero, tenantId: tenant.tenantId };
    } catch (error) {
      console.error("Failed to refresh Xero token:", error);
      // Mark tenant as inactive if refresh fails
      await prisma.xeroTenant.update({
        where: { id: tenant.id },
        data: { isActive: false },
      });
      return null;
    }
  }

  // Token is still valid, set it
  xero.setTokenSet({
    access_token: tenant.accessToken,
    refresh_token: tenant.refreshToken,
    expires_at: Math.floor(tenant.tokenExpiresAt.getTime() / 1000),
    token_type: "Bearer",
    scope: XERO_CONFIG.scopes.join(" "),
  });

  return { client: xero, tenantId: tenant.tenantId };
}

/**
 * Generates the authorization URL for Xero OAuth2 flow
 */
export async function getXeroAuthUrl(): Promise<string> {
  const xero = createXeroClient();
  const consentUrl = await xero.buildConsentUrl();
  return consentUrl;
}

/**
 * Handles the OAuth2 callback and stores the tokens
 */
export async function handleXeroCallback(callbackUrl: string): Promise<{
  success: boolean;
  tenantId?: string;
  error?: string;
}> {
  try {
    const xero = createXeroClient();
    
    // Exchange code for tokens
    const tokenSet = await xero.apiCallback(callbackUrl);
    
    // Update tenant connections
    await xero.updateTenants();
    
    // Get the first organization tenant
    const tenants = xero.tenants;
    const orgTenant = tenants.find((t) => t.tenantType === "ORGANISATION");
    
    if (!orgTenant) {
      return { success: false, error: "No organization tenant found" };
    }

    // Calculate token expiry
    const expiresAt = new Date((tokenSet.expires_at || 0) * 1000);

    // Deactivate any existing tenants
    await prisma.xeroTenant.updateMany({
      where: { isActive: true },
      data: { isActive: false },
    });

    // Upsert the new tenant
    await prisma.xeroTenant.upsert({
      where: { tenantId: orgTenant.tenantId },
      create: {
        tenantId: orgTenant.tenantId,
        tenantName: orgTenant.tenantName || "Unknown",
        tenantType: orgTenant.tenantType || "ORGANISATION",
        accessToken: tokenSet.access_token!,
        refreshToken: tokenSet.refresh_token!,
        tokenExpiresAt: expiresAt,
        isActive: true,
      },
      update: {
        tenantName: orgTenant.tenantName || "Unknown",
        accessToken: tokenSet.access_token!,
        refreshToken: tokenSet.refresh_token!,
        tokenExpiresAt: expiresAt,
        isActive: true,
        updatedAt: new Date(),
      },
    });

    return { success: true, tenantId: orgTenant.tenantId };
  } catch (error) {
    console.error("Xero callback error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Disconnects the current Xero tenant
 */
export async function disconnectXero(): Promise<void> {
  await prisma.xeroTenant.updateMany({
    where: { isActive: true },
    data: { isActive: false },
  });
}

/**
 * Checks if Xero is connected
 */
export async function isXeroConnected(): Promise<boolean> {
  const tenant = await prisma.xeroTenant.findFirst({
    where: { isActive: true },
  });
  return !!tenant;
}

/**
 * Gets the current Xero connection status
 */
export async function getXeroConnectionStatus(): Promise<{
  connected: boolean;
  tenantName?: string;
  lastSyncAt?: Date | null;
}> {
  const tenant = await prisma.xeroTenant.findFirst({
    where: { isActive: true },
  });

  if (!tenant) {
    return { connected: false };
  }

  return {
    connected: true,
    tenantName: tenant.tenantName,
    lastSyncAt: tenant.lastSyncAt,
  };
}
