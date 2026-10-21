// @ts-nocheck
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import type { ExtensionAPI, ExtensionCommandContext } from '@earendil-works/pi-coding-agent';

export interface PreflightResult {
  ok: boolean;
  availableMb: number;
  isGit: boolean;
  reason?: string;
}

export function checkPreflight(cwd: string): PreflightResult {
  let availableMb = 0;
  try {
    const meminfo = readFileSync('/proc/meminfo', 'utf8');
    const match = meminfo.match(/MemAvailable:\s+(\d+)\s+kB/);
    if (match) {
      availableMb = Math.round(Number.parseInt(match[1], 10) / 1024);
    }
  } catch {
    availableMb = 9999;
  }

  let isGit = false;
  try {
    execSync('git rev-parse --is-inside-work-tree', { cwd, stdio: 'ignore' });
    isGit = true;
  } catch {
    isGit = false;
  }

  if (!isGit) {
    return { ok: false, availableMb, isGit, reason: 'Current directory is not a Git repository.' };
  }

  // ponytail: safe threshold set at 1200MB; allow override via PREFLIGHT_MIN_MEM_MB
  const minMem = Number.parseInt(process.env.PREFLIGHT_MIN_MEM_MB || '1200', 10);
  if (availableMb < minMem) {
    return {
      ok: false,
      availableMb,
      isGit,
      reason: `Available memory (${availableMb}MB) is below threshold (${minMem}MB).`,
    };
  }

  return { ok: true, availableMb, isGit };
}

export function buildHerewegoObjective(task: string): string {
  return [
    `"${task.trim().replace(/"/g, "'")}"`,
    'Done when: strictly verified via the 8-phase herewego autonomous engineering lifecycle:',
    '1. Preflight & Recon/Grilling (grill-with-docs, record assumptions in .scratch/)',
    '2. Spec & Vertical Tracer-Bullet Tickets (.scratch/spec.md & tickets.md)',
    '3. Worktree TDD Implementation (subagent default: 9router/ag/gemini-3.8-flash-high)',
    '4. Two-Axis Code Review (Standards & Spec against main, max 3 rounds)',
    '5. Security Hardening Audit (OWASP/STRIDE, max 3 rounds)',
    '6. Verification & Visual Parity (tests, build, desktop & mobile screenshot check)',
    '7. Branch Push & PR Reporting (format PR body, strictly NO automated GitHub PR creation)',
    '8. Audit Settlement & Owner Override (GLLA detached audit check or /goal accept)',
  ].join(' ');
}

export default function (pi: ExtensionAPI) {
  pi.registerCommand('herewego', {
    description: 'Launch herewego autonomous loop engineering lifecycle with GLLA supervision',
    handler: async (args: string, ctx: ExtensionCommandContext) => {
      const task = args.trim();
      if (!task) {
        ctx.ui?.notify('Usage: /herewego <task description>', 'warning');
        return;
      }

      const preflight = checkPreflight(ctx.cwd || process.cwd());
      if (!preflight.isGit) {
        ctx.ui?.notify(`Cannot start herewego: ${preflight.reason}`, 'error');
        return;
      }

      if (!preflight.ok) {
        ctx.ui?.notify(`⚠️ Preflight Warning: ${preflight.reason} (proceeding in monitored loop)`, 'warning');
      }

      // Check companion dependencies (runtime tools/commands or declared settings packages)
      const commands = pi.getCommands ? pi.getCommands() : [];
      const hasGoalCmd = commands.some((c: any) => c.name === 'goal' || c.invocationName === 'goal');
      const allTools = pi.getAllTools ? pi.getAllTools() : [];
      const hasSubagentTool = allTools.some((t: any) => t.name === 'subagent');

      const settings = pi.getSettings ? pi.getSettings() : null;
      const packageSources = (settings?.packages || []).map((p: any) =>
        typeof p === 'string' ? p : p.source || '',
      );
      const hasGoalInSettings = packageSources.some((s: string) => s.includes('pi-goal-list-loop-audit'));
      const hasSubagentsInSettings = packageSources.some((s: string) => s.includes('pi-subagents'));

      const hasGoal = hasGoalCmd || hasGoalInSettings;
      const hasSubagent = hasSubagentTool || hasSubagentsInSettings;

      if (!hasGoal || !hasSubagent) {
        const missing: string[] = [];
        if (!hasGoal) missing.push('npm:pi-goal-list-loop-audit');
        if (!hasSubagent) missing.push('npm:pi-subagents');

        if (ctx.hasUI && ctx.ui?.confirm) {
          const proceedInstall = await ctx.ui.confirm(
            'Install Companion Packages?',
            `Herewego requires ${missing.join(', ')} for background supervision and subagent delegation. Install now?`,
          );
          if (proceedInstall) {
            try {
              // pi install must be run sequentially per package
              for (const pkg of missing) {
                ctx.ui?.notify(`Installing ${pkg}...`, 'info');
                const res = await pi.exec('pi', ['install', pkg]);
                if (res.code !== 0) {
                  throw new Error(res.stderr?.trim() || `Command failed with code ${res.code}`);
                }
              }
              ctx.ui?.notify('Packages installed successfully! Reloading session...', 'info');
              await ctx.reload();
              ctx.ui?.notify('Ready! Re-running /herewego...', 'info');
              pi.sendUserMessage(`/herewego ${task}`, { expandPromptTemplates: true });
              return;
            } catch (err: any) {
              ctx.ui?.notify(`Installation failed: ${err.message}`, 'error');
              return;
            }
          }
        } else {
          ctx.ui?.notify(
            `⚠️ Missing companion packages: run 'pi install ${missing.join(' ')}' for full background loop supervision.`,
            'warning',
          );
        }
      }

      const fullObjective = buildHerewegoObjective(task);
      if (hasGoal) {
        ctx.ui?.notify(`🚀 Initiating herewego loop for: "${task}"`, 'info');
        pi.sendUserMessage(`/goal start ${fullObjective}`, { expandPromptTemplates: true });
      } else {
        ctx.ui?.notify(`🚀 Initiating herewego execution for: "${task}"`, 'info');
        pi.sendUserMessage(
          `Execute following task using the 8-phase herewego skill:\n\n${fullObjective}`,
          { expandPromptTemplates: true },
        );
      }
    },
  });
}
