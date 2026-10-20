// @ts-nocheck
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export function readGoalPause(cwd: string): string | null {
  try {
    const file = readFileSync(join(cwd, '.pi-glla/active.jsonl'), 'utf8');
    for (const line of file.split('\n').reverse()) {
      if (!line.includes('"type":"state"')) continue;
      const parsed = JSON.parse(line);
      const goal = parsed.value?.goal;
      return goal?.status === 'paused' ? (goal.pauseReason || 'Goal paused') : null;
    }
  } catch {
    // absent or incomplete ledger
  }
  return null;
}

export default function (pi: any) {
  if (process.env.HERDR_ENV !== '1') return;
  let blocked = false;

  function sync(ctx: any) {
    if (ctx?.mode !== 'tui') return;
    const reason = readGoalPause(ctx.cwd || process.cwd());
    if (reason && !blocked) {
      pi.events.emit('herdr:blocked', { active: true, label: reason.slice(0, 180) });
      blocked = true;
    } else if (!reason && blocked) {
      pi.events.emit('herdr:blocked', { active: false });
      blocked = false;
    }
  }

  pi.on('session_start', (_, ctx) => sync(ctx));
  pi.on('agent_start', (_, ctx) => sync(ctx));
  pi.on('agent_settled', (_, ctx) => sync(ctx));
  pi.on('session_shutdown', () => {
    if (blocked) {
      pi.events.emit('herdr:blocked', { active: false });
    }
  });
}
