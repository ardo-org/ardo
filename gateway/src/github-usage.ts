import { CopilotClient } from "@github/copilot-sdk";
import { log } from "./log.ts";

// Types for GitHub Copilot quota information
export interface GitHubCopilotQuota {
  entitlementRequests: number;
  usedRequests: number;
  remainingRequests: number;
  remainingPercentage: number;
  overage: number;
  resetDate?: string;
}

export interface GitHubCopilotUsageData {
  quota: GitHubCopilotQuota;
  status: "authenticated" | "unauthenticated" | "error";
  lastUpdated: string;
}

// Cache for quota data
let cachedQuotaData: GitHubCopilotUsageData | null = null;
let lastFetchTime: number = 0;
const CACHE_DURATION_MS = 60_000; // 60 seconds, following opencode-copilot-plus pattern

// Copilot SDK client instance
let copilotClient: CopilotClient | null = null;

/**
 * Initialize the GitHub Copilot SDK client for usage tracking
 */
export async function initializeGitHubUsageTracking(): Promise<void> {
  try {
    if (!copilotClient) {
      copilotClient = new CopilotClient();
      await copilotClient.start();
      log("info", "GitHub Copilot usage tracking initialized");
    }
  } catch (error) {
    log("warn", "Failed to initialize GitHub Copilot usage tracking", {
      error: error instanceof Error ? error.message : String(error),
    });
    copilotClient = null;
  }
}

/**
 * Shutdown the GitHub Copilot SDK client
 */
export async function shutdownGitHubUsageTracking(): Promise<void> {
  if (copilotClient) {
    try {
      await copilotClient.stop();
      copilotClient = null;
      log("info", "GitHub Copilot usage tracking shutdown");
    } catch (error) {
      log("warn", "Error shutting down GitHub Copilot usage tracking", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}

/**
 * Fetch GitHub Copilot quota data via the SDK
 * Returns cached data if fresh (< 60 seconds old)
 */
export async function fetchGitHubCopilotQuota(): Promise<GitHubCopilotUsageData | null> {
  const now = Date.now();

  // Return cached data if still fresh
  if (cachedQuotaData && (now - lastFetchTime) < CACHE_DURATION_MS) {
    return cachedQuotaData;
  }

  // Initialize client if needed
  if (!copilotClient) {
    await initializeGitHubUsageTracking();
  }

  if (!copilotClient) {
    log("warn", "GitHub Copilot client not initialized");
    return {
      quota: {
        entitlementRequests: 0,
        usedRequests: 0,
        remainingRequests: 0,
        remainingPercentage: 0,
        overage: 0,
      },
      status: "unauthenticated",
      lastUpdated: new Date().toISOString(),
    };
  }

  try {
    log("info", "Attempting to fetch GitHub Copilot quota data");

    // Call the RPC method to get quota information
    const result = await copilotClient.rpc.account.getQuota();
    log("info", "Successfully received quota result", { result: JSON.stringify(result) });

    // The result has quotaSnapshots as a Record<string, QuotaSnapshot>
    // We'll aggregate all quotas or pick the first/main one
    const quotaSnapshots = result.quotaSnapshots;
    const quotaEntries = Object.entries(quotaSnapshots);

    if (quotaEntries.length === 0) {
      throw new Error("No quota snapshots available");
    }

    // Use the first quota snapshot (there's usually just one for individual users)
    const [quotaId, snapshot] = quotaEntries[0];
    log("info", "Using quota snapshot", { quotaId, snapshot });

    const remainingRequests = Math.max(snapshot.entitlementRequests - snapshot.usedRequests, 0);

    const usageData: GitHubCopilotUsageData = {
      quota: {
        entitlementRequests: snapshot.entitlementRequests,
        usedRequests: snapshot.usedRequests,
        remainingRequests,
        remainingPercentage: snapshot.remainingPercentage,
        overage: Math.max(snapshot.usedRequests - snapshot.entitlementRequests, 0),
        // resetDate is not provided in the snapshot, would need separate API call
      },
      status: "authenticated",
      lastUpdated: new Date().toISOString(),
    };

    // Cache the result
    cachedQuotaData = usageData;
    lastFetchTime = now;

    log("info", "Successfully fetched GitHub Copilot quota", {
      quotaId,
      usedRequests: usageData.quota.usedRequests,
      entitlementRequests: usageData.quota.entitlementRequests,
      remainingPercentage: usageData.quota.remainingPercentage,
    });

    return usageData;
  } catch (error) {
    log("error", "Failed to fetch GitHub Copilot quota", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });

    const errorData: GitHubCopilotUsageData = {
      quota: {
        entitlementRequests: 0,
        usedRequests: 0,
        remainingRequests: 0,
        remainingPercentage: 0,
        overage: 0,
      },
      status: "error",
      lastUpdated: new Date().toISOString(),
    };

    // Cache the error state briefly to avoid hammering the API
    cachedQuotaData = errorData;
    lastFetchTime = now;

    return errorData;
  }
}

/**
 * Clear the quota data cache, forcing a fresh fetch on next request
 */
export function clearQuotaCache(): void {
  cachedQuotaData = null;
  lastFetchTime = 0;
}

/**
 * Get cached quota data without making a network request
 * Returns null if no cached data exists
 */
export function getCachedQuotaData(): GitHubCopilotUsageData | null {
  const now = Date.now();

  if (cachedQuotaData && (now - lastFetchTime) < CACHE_DURATION_MS) {
    return cachedQuotaData;
  }

  return null;
}