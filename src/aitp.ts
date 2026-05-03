/**
 * AITP (AI Theoretical Physics) topic state reader.
 *
 * Reads the active AITP topic's state.md YAML frontmatter and
 * returns structured data for the HUD statusline display.
 * Caches based on file mtime since the HUD runs every ~300ms.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';

export interface AitpStatus {
  slug: string;
  title: string;
  stage: string;
  posture: string;
  activity: string;
  lane: string;
  gateStatus: string;
  status: string;
  sources: string;
  compute: string;
  l4Status: string;
  l4Job: string;
  l4Eta: string;
  l4Host: string;
}

interface CacheEntry {
  mtime: number;
  status: AitpStatus | null;
}

let _cache: CacheEntry | null = null;

function resolveTopicsRoot(): string | null {
  const env = process.env['AITP_TOPICS_ROOT'];
  if (env && fs.existsSync(env) && fs.statSync(env).isDirectory()) {
    return env;
  }
  // Fallback to known workspace path
  const fallback = 'D:/BaiduSyncdisk/Theoretical-Physics/research/aitp-topics';
  if (fs.existsSync(fallback)) {
    return fallback;
  }
  return null;
}

function parseFrontmatter(text: string): Record<string, string> {
  const fm: Record<string, string> = {};
  if (!text.startsWith('---')) return fm;

  const endIdx = text.indexOf('---', 3);
  if (endIdx === -1) return fm;

  const block = text.slice(3, endIdx);
  for (const line of block.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || !trimmed.includes(':')) continue;
    const colonIdx = trimmed.indexOf(':');
    const key = trimmed.slice(0, colonIdx).trim();
    let val = trimmed.slice(colonIdx + 1).trim();
    // Strip quotes
    if ((val.startsWith("'") && val.endsWith("'")) ||
        (val.startsWith('"') && val.endsWith('"'))) {
      val = val.slice(1, -1);
    }
    fm[key] = val;
  }
  return fm;
}

function findActiveTopic(topicsRoot: string): string | null {
  // Check .current_topic marker
  const marker = path.join(topicsRoot, '.current_topic');
  if (fs.existsSync(marker)) {
    const slug = fs.readFileSync(marker, 'utf-8').trim();
    if (slug && fs.existsSync(path.join(topicsRoot, slug, 'state.md'))) {
      return slug;
    }
  }

  // Fallback: most recently modified state.md
  let bestSlug: string | null = null;
  let bestMtime = 0;
  try {
    for (const entry of fs.readdirSync(topicsRoot)) {
      if (entry.startsWith('.')) continue;
      const statePath = path.join(topicsRoot, entry, 'state.md');
      if (!fs.existsSync(statePath)) continue;
      try {
        const mtime = fs.statSync(statePath).mtimeMs;
        if (mtime > bestMtime) {
          bestMtime = mtime;
          bestSlug = entry;
        }
      } catch { /* skip */ }
    }
  } catch { /* skip */ }
  return bestSlug;
}

export function readAitpStatus(): AitpStatus | null {
  const root = resolveTopicsRoot();
  if (!root) return null;

  const slug = findActiveTopic(root);
  if (!slug) return null;

  const statePath = path.join(root, slug, 'state.md');
  if (!fs.existsSync(statePath)) return null;

  let mtime: number;
  try {
    mtime = fs.statSync(statePath).mtimeMs;
  } catch {
    return null;
  }

  // Check cache
  if (_cache && _cache.mtime === mtime) {
    return _cache.status;
  }

  try {
    const text = fs.readFileSync(statePath, 'utf-8');
    const fm = parseFrontmatter(text);

    const status: AitpStatus = {
      slug,
      title: fm['title'] || slug,
      stage: fm['stage'] || '?',
      posture: fm['posture'] || '',
      activity: fm['l3_activity'] || '',
      lane: fm['lane'] || '',
      gateStatus: fm['gate_status'] || '',
      status: fm['status'] || '',
      sources: fm['sources_count'] || '',
      compute: fm['compute'] || '',
      l4Status: fm['l4_background_status'] || '',
      l4Job: fm['l4_job_id'] || '',
      l4Eta: fm['l4_job_estimated_time'] || '',
      l4Host: fm['l4_job_host'] || fm['compute'] || '',
    };

    _cache = { mtime, status };
    return status;
  } catch {
    _cache = { mtime, status: null };
    return null;
  }
}
