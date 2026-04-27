export interface DeepseekBalanceCache {
    label: string;
    ts: number;
}
/**
 * Get the DeepSeek balance label.
 * - Returns cached value immediately if fresh.
 * - If stale/missing, fetches from API (async) and updates cache.
 * - Falls back to stale cache if API call fails.
 * Returns null if no data is available at all.
 */
export declare function getDeepseekBalanceLabel(): Promise<string | null>;
//# sourceMappingURL=deepseek-balance.d.ts.map