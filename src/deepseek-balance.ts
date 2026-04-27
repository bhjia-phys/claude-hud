// Query DeepSeek API balance, used by the deepseek HudElement.
// Reads from a cache file (5min TTL), refreshes via API when stale.
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import * as https from 'node:https';

const CACHE_FILE = path.join(os.homedir(), '.claude', 'cache', 'deepseek-balance.json');
const CACHE_TTL_MS = 5 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 2500;

export interface DeepseekBalanceCache {
  label: string;
  ts: number;
}

function readCache(): DeepseekBalanceCache | null {
  try {
    if (!fs.existsSync(CACHE_FILE)) return null;
    const data = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
    if (typeof data?.label === 'string' && typeof data?.ts === 'number') {
      return data;
    }
  } catch { /* corrupt */ }
  return null;
}

function isCacheFresh(cache: DeepseekBalanceCache): boolean {
  return Date.now() - cache.ts < CACHE_TTL_MS;
}

function writeCache(label: string): void {
  try {
    const dir = path.dirname(CACHE_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(CACHE_FILE, JSON.stringify({ label, ts: Date.now() }));
  } catch { /* can't write, no big deal */ }
}

function fetchBalance(): Promise<string | null> {
  const apiKey = process.env.ANTHROPIC_AUTH_TOKEN || '';
  if (!apiKey) return Promise.resolve(null);

  return new Promise((resolve) => {
    const req = https.request('https://api.deepseek.com/user/balance', {
      method: 'GET',
      headers: { Authorization: `Bearer ${apiKey}` },
      timeout: REQUEST_TIMEOUT_MS,
    }, (res) => {
      let body = '';
      res.on('data', (chunk: Buffer) => { body += chunk.toString(); });
      res.on('end', () => {
        try {
          const data = JSON.parse(body);
          const infos: Array<{ currency: string; total_balance: string }> =
            data.balance_infos || (data.data && data.data.balance_infos) || [];
          const cny = infos.find((i) => i.currency === 'CNY') || infos[0];
          if (cny && cny.total_balance) {
            const bal = parseFloat(cny.total_balance);
            if (!Number.isNaN(bal)) {
              resolve(`DS ¥${bal.toFixed(2)}`);
              return;
            }
          }
        } catch { /* parse failed */ }
        resolve(null);
      });
    });

    req.on('error', () => resolve(null));
    req.on('timeout', () => { req.destroy(); resolve(null); });
    req.end();
  });
}

/**
 * Get the DeepSeek balance label.
 * - Returns cached value immediately if fresh.
 * - If stale/missing, fetches from API (async) and updates cache.
 * - Falls back to stale cache if API call fails.
 * Returns null if no data is available at all.
 */
export async function getDeepseekBalanceLabel(): Promise<string | null> {
  const cached = readCache();
  if (cached && isCacheFresh(cached)) {
    return cached.label;
  }

  const label = await fetchBalance();
  if (label) {
    writeCache(label);
    return label;
  }

  // API failed — use stale cache as fallback
  if (cached) {
    return cached.label;
  }

  return null;
}
