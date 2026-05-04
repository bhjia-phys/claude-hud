/**
 * Cron status line renderer.
 *
 * Shows active durable cron jobs from .claude/scheduled_tasks.json.
 * Renders as a standalone dim line below all other elements.
 */
import type { RenderContext } from '../../types.js';
import { cyan, dim } from '../colors.js';

export function renderCronLine(ctx: RenderContext): string | null {
  const crons = ctx.aitpStatus?.cronJobs;
  if (!crons || crons.length === 0) return null;

  const parts: string[] = [];
  for (const c of crons) {
    const shortId = c.id.length > 8 ? c.id.slice(0, 8) : c.id;
    const interval = (c.cron || '').replace(/\s+/g, ' ').trim();
    parts.push(`${cyan('#' + shortId)} ${dim(interval)}`);
  }
  return dim('cron ') + parts.join('  ');
}
