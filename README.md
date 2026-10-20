# pi-herewego

Hardened autonomous loop engineering lifecycle for the Pi coding agent, combining:
- **`herewego` 8-phase engineering lifecycle** (Preflight, Recon/Grilling, Spec/Tickets, Worktree TDD, Two-Axis Review, Security Hardening, Verification/Screenshots, PR report, Audit settlement).
- **GLLA integration**: Automatically initializes supervised background goal loop (`/goal start <objective>`).
- **Herdr status bridge**: Emits `herdr:blocked` when a goal pauses or needs user intervention.
- **Preflight memory guard**: Warns/aborts before launching heavy bundlers under low RAM (<1.2GB).

## Installation

Install directly into any Pi instance via Git or local path:

```bash
# If hosted on Git:
pi install git:github.com/rizkitriandani/herewgo

# Or install locally:
pi install ./packages/pi-herewego
```

*(Recommended companion package for full detached audit loop)*:
```bash
pi install npm:pi-goal-list-loop-audit
```

## Usage

In any project repository, run:
```text
/herewego [task or feature description]
```
Pi will automatically run environment preflight checks, construct the full 8-phase contract, and activate supervised goal execution.
