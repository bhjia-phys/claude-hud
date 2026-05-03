/**
 * AITP status dashboard line renderer.
 *
 * Renders a 4-5 line panel showing the active AITP topic's
 * stage, gate, lane, L4 job, and next action.
 */
import type { RenderContext } from '../../types.js';
import { dim, cyan, yellow, red, green, magenta, RESET } from '../colors.js';

// ── helpers ─────────────────────────────────────────────────────

function laneShort(lane: string): string {
  const m: Record<string, string> = {
    code_method: 'code',
    formal_theory: 'formal',
    toy_numeric: 'toy',
  };
  return m[lane] || lane;
}

function stageLabel(s: { stage: string; posture: string; activity: string }): string {
  const part = s.posture || s.activity;
  return part ? `${s.stage}/${part}` : s.stage;
}

function gateIcon(status: string): string {
  if (status === 'passed' || status === 'clean') return `${green('✓')}`;
  if (status.startsWith('blocked')) return `${red('✗')}`;
  return `${yellow('△')}`;
}

function gateLabel(status: string): string {
  if (status === 'passed' || status === 'clean') return green('passed');
  if (status.startsWith('blocked')) return red(status.replace('blocked_', '').replace(/_/g, ' '));
  if (!status || status === 'not_evaluated') return yellow('pending');
  return yellow(status);
}

function l4Display(l4Status: string): string {
  if (l4Status === 'submitted') return `${yellow('⬆')} submitted`;
  if (l4Status === 'running') return `${yellow('◐')} running`;
  if (l4Status === 'complete') return `${green('✓')} done`;
  if (l4Status === 'failed') return `${red('✗')} failed`;
  return l4Status;
}

function nextAction(s: { stage: string; activity: string; posture: string; gateStatus: string }): string {
  if (s.gateStatus.startsWith('blocked')) {
    const field = s.gateStatus.replace('blocked_', '').replace(/_/g, ' ');
    return `Complete required: ${field}`;
  }
  const key = s.activity || s.posture;
  const hints: Record<string, string> = {
    'L0': 'Discover and register sources',
    'L1': 'Complete reading notes, frame question, advance to L3',
    'L3:ideate': 'Generate and refine research ideas; promote candidate',
    'L3:derive': 'Execute derivation steps with source anchoring (file:line)',
    'L3:integrate': 'Combine results into findings; synthesize claims',
    'L3:distill': 'Extract final claims from integrated results',
    'L3:gap-audit': 'Find hidden assumptions and missing correspondence checks',
    'L3:plan': 'Design derivation route; map steps and dependencies',
    'L4': 'Submit adversarial review; verify against evidence and known limits',
    'promote': 'Request promotion gate; human approval for L2 merge',
  };
  const hintKey = key ? `${s.stage}:${key}` : s.stage;
  return hints[hintKey] || 'Use aitp_get_execution_brief for detailed instructions';
}

// ── pad to visible width (accounting for ANSI escapes) ──────────

function visLen(s: string): number {
  // eslint-disable-next-line no-control-regex
  return s.replace(/\x1b\[[0-9;]*m/g, '').length;
}

function padRight(s: string, width: number): string {
  const need = width - visLen(s);
  return need > 0 ? s + ' '.repeat(need) : s;
}

// ── main render ─────────────────────────────────────────────────

export function renderAitpLine(ctx: RenderContext): string | null {
  const s = ctx.aitpStatus;
  if (!s) return null;

  const w = 78;
  const inner = w - 2;
  const rpad = Math.floor(inner / 2) + 3;

  const stage = stageLabel(s);
  const gIcon = gateIcon(s.gateStatus);
  const gLabel = gateLabel(s.gateStatus);
  const lane = laneShort(s.lane);

  // Info meta: status · N sources · @compute
  const metaParts: string[] = [];
  if (s.status) metaParts.push(s.status);
  if (s.sources) metaParts.push(`${s.sources} sources`);
  if (s.compute) metaParts.push(`@${s.compute}`);
  const meta = metaParts.length > 0 ? metaParts.join(` ${dim('·')} `) : '--';

  function row(left: string, right?: string): string {
    if (right) {
      const gap = Math.max(2, rpad - visLen(left));
      return padRight(`${left}${' '.repeat(gap)}${right}`, inner);
    }
    return padRight(left, inner);
  }

  const lines: string[] = [];

  // Top border
  const title = `AITP · ${s.slug}`;
  const titlePart = visLen(title) > inner - 4 ? title.slice(0, inner - 7) + '..' : title;
  lines.push(`${cyan('┌─')} ${titlePart} ${cyan('─'.repeat(Math.max(1, inner - visLen(titlePart) - 2)) + '┐')}`);

  // Row 1: Stage + Gate
  lines.push(`${cyan('│')} ${row(
    `Stage ${dim('.....')} ${stage}`,
    `Gate ${dim('......')} ${gIcon} ${gLabel}`,
  )} ${cyan('│')}`);

  // Row 2: Lane + Info
  lines.push(`${cyan('│')} ${row(
    `Lane ${dim('......')} ${cyan(lane)}`,
    `Info ${dim('......')} ${meta}`,
  )} ${cyan('│')}`);

  // Row 3: L4 job (if active)
  if (s.l4Status && s.l4Status !== 'idle') {
    const job = s.l4Job && s.l4Job.length <= 10 ? s.l4Job : s.l4Job.slice(-8);
    let l4Str = `${magenta(`#${job || '?'}`)}  ${l4Display(s.l4Status)}`;
    if (s.l4Eta) l4Str += `  ${dim('~' + s.l4Eta)}`;
    if (s.l4Host) l4Str += `  ${dim('on')} ${s.l4Host}`;
    lines.push(`${cyan('│')} ${row(`L4 ${dim('.......')} ${l4Str}`)} ${cyan('│')}`);
  }

  // Row 4: Next action
  const next = nextAction(s);
  lines.push(`${cyan('│')} ${row(`${yellow('→')} Next ${dim('...')} ${next}`)} ${cyan('│')}`);

  // Bottom
  lines.push(`${cyan('└')}${'─'.repeat(inner)}${cyan('┘')}${RESET}`);

  return lines.join('\n');
}
