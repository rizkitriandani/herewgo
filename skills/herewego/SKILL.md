---
name: herewego
description: Autonomous end-to-end development cycle composing using-superpowers, Matt Pocock's skills (grill-with-docs, to-spec, to-tickets), pi-herdr subagents, code-review, security-and-hardening, and pr reporting.
argument-hint: "[fitur, bugfix, atau task yang ingin dikerjakan]"
---

# herewego — Hardened Autonomous Loop Engineering Lifecycle

When this skill is invoked or an engineering loop is initiated, strictly execute the complete end-to-end pipeline composing:
- **using-superpowers**: Verification-before-completion, deliberate execution gates, and worktree isolation.
- **grill-with-docs**: Self-interrogating domain and architectural edge cases, recording assumptions and domain models before writing code.
- **to-spec & to-tickets (Matt Pocock)**: Spec formulation (seams, contracts) & vertical tracer-bullet slices with explicit blocking edges.
- **pi-herdr subagents**: Parallel background recon, isolated Git worktree execution, and cross-family review with default subagent model `9router/ag/gemini-3.8-flash-high`.
- **code-review & security-and-hardening**: Mandatory two-axis code audit and OWASP/STRIDE security hardening loops (max 3 rounds) before branch completion.
- **pr report**: Standardized PR body formatting; strictly NO automated remote pull request creation via `gh pr create` or APIs without manual owner sign-off.
- **GLLA & Herdr Bridge**: 5-minute watchdog stall timeout, status synchronization via `goal-herdr-state`, and `/goal accept` manual override escape hatch.

Do NOT pause for redundant confirmations between non-gated steps.

---

## 1. Skill Composition & Role Architecture

- **Parent Coordinator**: Drives the workflow, manages state transitions, orchestrates tickets, performs root merges, runs final test suites, and enforces preflight checks.
- **Subagent Default Model**: Subagents inherit `9router/ag/gemini-3.8-flash-high` configured globally in `~/.pi/agent/settings.json`.
- **Unattended Execution Policy**: Automated loops must run in `--mode yolo` or via `herdr-loop-run` to prevent interactive permission dialogs from wedging the process.
- **Watchdog & Override Policy**: GLLA watchdog alerts after 5 minutes of inactivity (`wedgeAlertMinutes: 5`). If an auditor run is prolonged or stuck and the owner approves the code review, use `/goal accept` to finalize the goal directly.

---

## The 8-Phase Hardened Autonomous Pipeline

### Phase 0: Preflight & Environment Audit
Before touching code or starting dev servers:
1. Run preflight guard: `loop-preflight` (or `/root/.pi/agent/bin/loop-preflight.sh`).
   - Verifies available RAM (>= 1.2GB) to protect against OOM kernel hangs on heavy bundlers (Astro/Vite/Webpack).
   - Verifies Git workspace isolation.
2. If memory is constrained, terminate stale background containers or idle servers before proceeding, or pass `--force` if explicitly authorized.

### Phase 1: Background Recon & Grilling (`grill-with-docs`)
1. **Parallel Recon Scout**: Spawn a read-only scout subagent to map related files, types, existing tests, and dependencies.
2. **Execute Self-Grilling**: Self-interrogate requirements against primary sources and official documentation.
   - Record explicit assumptions, failure modes, trust boundaries, and domain glossary in `.scratch/` or local notes.
   - Answer all architectural uncertainties before committing to a design.

### Phase 2: Spec & Tracer-Bullet Tickets (Matt Pocock Pipeline)
1. **Execute `to-spec`**: Synthesize user stories, interface contracts, testing seams, and explicit out-of-scope items into a concrete spec (`.scratch/spec.md`).
2. **Execute `to-tickets`**: Break the spec into vertical tracer-bullet slices (`.scratch/tickets.md`).
   - Every ticket must cut across schema/types + logic + tests.
   - Define dependency edges: which tickets are parallelizable vs sequentially gated.

### Phase 3: Worktree Implementation
For every unblocked ticket frontier:
1. Isolate work in a dedicated Git worktree branch (`feat/<task>-<slug>`).
2. Implement using Test-Driven Development (TDD):
   - Write failing test first (RED).
   - Implement minimal passing code (GREEN).
   - Refactor cleanly (REFACTOR).
3. Verify test pass and inspect zero-failure output before marking ticket done.

### Phase 4: Two-Axis Code Review & Fix Loop
1. Merge ticket branches into the feature integration branch.
2. Run independent `code-review` along two axes:
   - **Standards Axis**: Code smells, dead code, error handling conventions, and repository standards.
   - **Spec Axis**: Full alignment with `.scratch/spec.md` without feature creep or missed requirements.
3. **Fix Loop**: If Critical or Important issues are found, fix them immediately with covering tests and re-review (max 3 rounds).

### Phase 5: Security Hardening & Fix Loop
1. Run independent security audit:
   - Input validation at all external boundaries.
   - Injection prevention (SQL, command, path traversal).
   - Error handling & secret protection (no exposed tokens or stack traces).
   - Dependency vulnerability inspection.
2. **Fix Loop**: Fix any identified vulnerabilities with regression tests.
3. If security fixes introduce substantive code changes, rerun Phase 4 Code Review on the security diffs (max 3 rounds).

### Phase 6: Final Verification & Visual Parity
1. Execute the project's root verification commands:
   - Type-checker (`tsc` / `astro check` / framework linter).
   - Full test suite (`npm test` / `pytest` / `cargo test`).
   - Production build command (`npm run build`).
2. For UI/frontend tasks:
   - Capture desktop (1440px) and mobile (375px) screenshots of rendered pages.
   - Inspect visual layout, typography, contrast, and responsiveness before approving.

### Phase 7: Branch Push & PR Reporting
1. Commit all final artifacts with clear, descriptive commit messages.
2. Push the feature branch to the remote repository (`git push -u origin feat/...`).
3. Format the pull request description using the `pr` skill template (summary, changes, verification evidence, screenshots).
4. **STRICT REMOTE POLICY**: Output the PR body for the owner to review. Do NOT run `gh pr create` or automatically open PRs on GitHub.

### Phase 8: Audit Settlement & Owner Override
1. If running under GLLA supervision, submit completion via `complete_goal`.
2. Monitor detached auditor progress. Watchdog timeout is bounded to 5 minutes.
3. **Owner Escape Hatch**: If the auditor stalls or the owner explicitly confirms approval of the PR report, invoke `/goal accept` to finalize and transition the goal to `complete`.
