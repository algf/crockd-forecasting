// Client
export {
  createXeroClient,
  getAuthenticatedXeroClient,
  getXeroAuthUrl,
  handleXeroCallback,
  disconnectXero,
  isXeroConnected,
  getXeroConnectionStatus,
} from "./client";

// Config
export { XERO_CONFIG } from "./config";

// Sync
export { syncAccounts, getAccountsByType, getAllAccounts } from "./sync/accounts";
export { syncContacts, getSuppliers, getCustomers } from "./sync/contacts";
export { syncBankTransactions } from "./sync/bank-transactions";
export { syncInvoicesAndBills } from "./sync/invoices";
export {
  runInitialSync,
  runIncrementalSync,
  getSyncStatus,
  type SyncProgress,
  type SyncResults,
} from "./sync/orchestrator";
