import type { RenderContext } from '../../types.js';
import { label } from '../colors.js';

export function renderDeepseekLine(ctx: RenderContext): string | null {
  if (!ctx.deepseekBalance) return null;
  return label(ctx.deepseekBalance, ctx.config?.colors);
}
