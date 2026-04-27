import { label } from '../colors.js';
export function renderDeepseekLine(ctx) {
    if (!ctx.deepseekBalance)
        return null;
    return label(ctx.deepseekBalance, ctx.config?.colors);
}
//# sourceMappingURL=deepseek.js.map