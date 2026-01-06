/**
 * Xero API Configuration
 */

export const XERO_CONFIG = {
  // OAuth2 endpoints
  authorizationUrl: "https://login.xero.com/identity/connect/authorize",
  tokenUrl: "https://identity.xero.com/connect/token",
  
  // API base URL
  apiBaseUrl: "https://api.xero.com/api.xro/2.0",
  
  // Required scopes for full access
  scopes: [
    "openid",
    "profile",
    "email",
    "accounting.transactions",
    "accounting.transactions.read",
    "accounting.contacts",
    "accounting.contacts.read",
    "accounting.settings",
    "accounting.settings.read",
    "accounting.reports.read",
    "accounting.journals.read",
    "offline_access",
  ],
  
  // Data sync configuration
  sync: {
    // How many months of history to import on initial sync
    historyMonths: 24,
    
    // Page sizes for API requests
    pageSizes: {
      accounts: 100,
      contacts: 100,
      bankTransactions: 100,
      invoices: 100,
      payments: 100,
      manualJournals: 100,
    },
    
    // Rate limiting
    rateLimits: {
      // Xero allows 60 calls per minute
      requestsPerMinute: 60,
      // Delay between requests in ms
      requestDelay: 1100,
    },
  },
} as const;

export type XeroScope = (typeof XERO_CONFIG.scopes)[number];
