// @ts-nocheck
import { execSync } from 'node:child_process';
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
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

export function getHerewegoStatus(cwd: string) {
  const agentDir = process.env.PI_CODING_AGENT_DIR || join(homedir(), '.pi/agent');
  let settings: any = {};
  try {
    settings = JSON.parse(readFileSync(join(agentDir, 'settings.json'), 'utf8'));
  } catch {}

  const packages = (settings.packages || []).map((p: any) => (typeof p === 'string' ? p : p.source || ''));
  const hasGoal = packages.some((p: string) => p.includes('pi-goal-list-loop-audit'));
  const hasSubagents = packages.some((p: string) => p.includes('pi-subagents'));

  let gllaSettings: any = {};
  const gllaPath = join(agentDir, 'pi-goal-list-loop-audit.settings.json');
  try {
    gllaSettings = JSON.parse(readFileSync(gllaPath, 'utf8'));
  } catch {}

  const preflight = checkPreflight(cwd || process.cwd());

  return {
    hasGoal,
    hasSubagents,
    defaultSubagentModel: settings.subagents?.defaultModel || null,
    wedgeAlertMinutes: gllaSettings.wedgeAlertMinutes || null,
    preflight,
  };
}

export async function handleSetup(pi: ExtensionAPI, ctx: ExtensionCommandContext) {
  const agentDir = process.env.PI_CODING_AGENT_DIR || join(homedir(), '.pi/agent');
  ctx.ui?.notify('🔧 Setting up herewego environment...', 'info');

  const settingsPath = join(agentDir, 'settings.json');
  let settings: any = {};
  try {
    settings = JSON.parse(readFileSync(settingsPath, 'utf8'));
  } catch {
    settings = {};
  }

  const packages = (settings.packages || []).map((p: any) => (typeof p === 'string' ? p : p.source || ''));

  // 1. Install companion packages if missing
  const toInstall: string[] = [];
  if (!packages.some((p: string) => p.includes('pi-goal-list-loop-audit'))) {
    toInstall.push('npm:pi-goal-list-loop-audit');
  }
  if (!packages.some((p: string) => p.includes('pi-subagents'))) {
    toInstall.push('npm:pi-subagents');
  }

  for (const pkg of toInstall) {
    ctx.ui?.notify(`📦 Installing ${pkg}...`, 'info');
    const res = await pi.exec('pi', ['install', pkg]);
    if (res.code !== 0) {
      ctx.ui?.notify(`Failed to install ${pkg}: ${res.stderr || res.stdout}`, 'error');
    }
  }

  // 2. Configure default subagent model
  if (!settings.subagents) settings.subagents = {};
  if (!settings.subagents.defaultModel) {
    settings.subagents.defaultModel = '9router/ag/gemini-3.8-flash-high';
  }
  try {
    writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + '\n');
  } catch (e: any) {
    ctx.ui?.notify(`Could not update settings.json: ${e.message}`, 'warning');
  }

  // 3. Configure GLLA 5-minute watchdog settings
  const gllaPath = join(agentDir, 'pi-goal-list-loop-audit.settings.json');
  let gllaSettings: any = {};
  try {
    gllaSettings = JSON.parse(readFileSync(gllaPath, 'utf8'));
  } catch {}

  gllaSettings.wedgeAlertMinutes = 5;
  gllaSettings.auditorStallMs = 300000;
  gllaSettings.auditorToolTimeoutMs = 300000;
  gllaSettings.decisionPauseBudget = 0;
  gllaSettings.autoAcceptDrafts = true;

  try {
    writeFileSync(gllaPath, JSON.stringify(gllaSettings, null, 2) + '\n');
  } catch (e: any) {
    ctx.ui?.notify(`Could not update GLLA settings: ${e.message}`, 'warning');
  }

  // 4. Remove loose legacy ~/.pi/agent/skills/herewego to prevent collisions
  const looseSkill = join(agentDir, 'skills/herewego');
  if (existsSync(looseSkill)) {
    try {
      rmSync(looseSkill, { recursive: true, force: true });
    } catch {}
  }

  // 5. Gather status and report BEFORE reloading the context
  const st = getHerewegoStatus(ctx.cwd || process.cwd());
  const report = [
    '✅ herewego Setup Complete:',
    `• GLLA: ${st.hasGoal ? 'Ready' : 'Installed'}`,
    `• pi-subagents: ${st.hasSubagents ? 'Ready' : 'Installed'}`,
    `• Subagent default model: ${st.defaultSubagentModel || '9router/ag/gemini-3.8-flash-high'}`,
    `• Watchdog stall timeout: 5 minutes (${st.wedgeAlertMinutes || 5}m alert)`,
    `• RAM: ${st.preflight.availableMb}MB available`,
  ].join('\n');

  ctx.ui?.notify(report, 'info');

  // 6. Reload as final step (ctx is invalidated after reload)
  if (typeof ctx.reload === 'function') {
    await ctx.reload();
  }
}

const completions = (items: Array<[string, string]>) => (prefix: string) => {
  const p = prefix.trimStart();
  return items
    .filter(([val]) => val.startsWith(p))
    .map(([val, description]) => ({
      value: val + ' ',
      label: val,
      description,
    }));
};

export default function (pi: ExtensionAPI) {
  pi.registerCommand('herewego', {
    description: 'Autonomous loop engineering lifecycle with GLLA supervision (/herewego setup|status|preflight|help|<task>)',
    getArgumentCompletions: completions([
      ['setup', 'Configure companion dependencies, subagent default model, and 5m watchdog'],
      ['status', 'Check environment and companion configuration status'],
      ['preflight', 'Check host memory and Git worktree readiness'],
      ['help', 'Show usage instructions for the 8-phase autonomous loop'],
      ['run', 'Execute a task using the 8-phase loop (/herewego run <task>)'],
    ]),
    handler: async (args: string, ctx: ExtensionCommandContext) => {
      const raw = args.trim();
      const firstWord = raw.split(/\s+/)[0]?.toLowerCase();
      const rest = raw.slice(firstWord.length).trim();

      if (firstWord === 'setup') {
        return handleSetup(pi, ctx);
      }

      if (firstWord === 'status') {
        const st = getHerewegoStatus(ctx.cwd || process.cwd());
        const info = [
          '📊 herewego Status:',
          `• GLLA installed: ${st.hasGoal ? 'Yes' : 'No'}`,
          `• pi-subagents installed: ${st.hasSubagents ? 'Yes' : 'No'}`,
          `• Subagent Model: ${st.defaultSubagentModel || 'Not configured'}`,
          `• GLLA Watchdog: ${st.wedgeAlertMinutes ? `${st.wedgeAlertMinutes}m alert` : 'Default'}`,
          `• Available Memory: ${st.preflight.availableMb}MB`,
          `• Inside Git Repo: ${st.preflight.isGit ? 'Yes' : 'No'}`,
        ].join('\n');
        ctx.ui?.notify(info, 'info');
        return;
      }

      if (firstWord === 'preflight') {
        const pf = checkPreflight(ctx.cwd || process.cwd());
        if (pf.ok) {
          ctx.ui?.notify(`✅ Preflight PASS: Memory ${pf.availableMb}MB available & inside Git worktree.`, 'info');
        } else {
          ctx.ui?.notify(`❌ Preflight FAIL: ${pf.reason}`, 'error');
        }
        return;
      }

      if (firstWord === 'help' || !raw) {
        const helpText = [
          '🚀 herewego — Hardened Autonomous Loop Engineering',
          '',
          'Commands:',
          '  /herewego <task>       Start the 8-phase autonomous loop for <task>',
          '  /herewego run <task>   Alias for running a task',
          '  /herewego setup        Install dependencies & configure 5m watchdog',
          '  /herewego status       Display dependency & watchdog configuration',
          '  /herewego preflight    Check available RAM and Git repository state',
          '  /herewego help         Show this guide',
        ].join('\n');
        ctx.ui?.notify(helpText, 'info');
        return;
      }

      const task = (firstWord === 'run' ? rest : raw).trim();
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

      const st = getHerewegoStatus(ctx.cwd || process.cwd());
      if (!st.hasGoal || !st.hasSubagents) {
        if (ctx.hasUI && ctx.ui?.confirm) {
          const runSetup = await ctx.ui.confirm(
            'Setup Companion Packages?',
            'Herewego requires GLLA & pi-subagents for autonomous supervision. Run /herewego setup now?',
          );
          if (runSetup) {
            await handleSetup(pi, ctx);
            return;
          }
        } else {
          ctx.ui?.notify("⚠️ Companion packages missing. Run '/herewego setup' first.", 'warning');
        }
      }

      const fullObjective = buildHerewegoObjective(task);
      const commands = pi.getCommands ? pi.getCommands() : [];
      const hasGoalCmd = commands.some((c: any) => c.name === 'goal' || c.invocationName === 'goal') || st.hasGoal;

      if (hasGoalCmd) {
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
