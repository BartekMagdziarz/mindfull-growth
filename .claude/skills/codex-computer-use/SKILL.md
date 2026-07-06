---
name: codex-computer-use
description: Ask Codex CLI to run local app verification that needs browser automation, Playwright, screenshots, console inspection, runtime checks, or UI flow testing. Use when the user asks to verify an app feature, check whether a flow works, inspect UI behavior, capture screenshots, or perform Browser/Computer-use style validation without spending Claude tokens on direct browser control.
---

# Codex Computer Use

Use Codex as the local verification agent when the task needs real UI
interaction, screenshots, browser state, console inspection, or runtime checks.
For this project, this skill is the default path for exploratory verification
that would otherwise use Claude's Browser or Computer use.

Do not use this for ordinary code reading, typechecking, linting, or unit tests
Claude can run directly. Do not let Codex edit app code during verification.

## Project Safety Rules

- Use `npm run dev:verify` and `http://127.0.0.1:5199` for seeded app
  verification.
- Use `127.0.0.1:5183` only for disposable Playwright flow e2e.
- Never run seeds, resets, destructive e2e, or browser automation against
  `5173`, `localhost:5173`, or any origin with real user data.
- Report bugs; do not fix them in the shared tree unless the user explicitly
  asks for implementation.

## Workflow

1. Read `docs/agent-verification.md` and `.claude/skills/verify-app/SKILL.md`
   when project data, routes, or isolation details matter.
2. Start `npm run dev:verify` in the background, or reuse it if port 5199 is
   already occupied.
3. Create a temporary artifact directory for prompt, report, screenshots, and
   any short Playwright scripts Codex needs.
4. Ask Codex to verify the requested flow on `http://127.0.0.1:5199`.
5. Read Codex's report and inspect screenshot paths or quoted console errors
   before responding.
6. If Codex is unavailable or blocked, report the blocker instead of falling
   back to Claude's own Browser/Computer use.

## Command Shape

```bash
ARTIFACT_DIR="$(mktemp -d "${TMPDIR:-/tmp}/codex-computer-use.XXXXXX")"
REPORT="$ARTIFACT_DIR/report.md"
PROMPT="$ARTIFACT_DIR/prompt.md"

codex exec \
  -C "$PWD" \
  --add-dir "$ARTIFACT_DIR" \
  -s "$SANDBOX_MODE" \
  -o "$REPORT" \
  - < "$PROMPT"
```

### Sandbox mode — pick by whether a browser launches

- **Browser automation (Playwright/Chromium): `SANDBOX_MODE=danger-full-access`.**
  User-approved default (2026-07-06). Headless Chromium cannot launch under
  `workspace-write` on macOS — Seatbelt denies its Mach-port bootstrap
  (`bootstrap_check_in … Permission denied (1100)`), every launch dies
  instantly, and Codex burns minutes silently retrying workarounds that cannot
  succeed. With the filesystem sandbox off, the prompt rules below are the only
  guardrail — always include the "no edits", "artifact dir only" and "5199
  only" lines, and skim `git status` after the run.
- **No browser involved** (HTTP checks, log inspection, plain node scripts):
  `SANDBOX_MODE=workspace-write`, plus
  `-c sandbox_workspace_write.network_access=true` when the task talks to
  127.0.0.1:5199 (workspace-write blocks network by default).

### Hang vs. silent reasoning

Codex at high reasoning effort (summaries disabled) can go several minutes with
zero new output while thinking — that alone is not a hang. Before killing a
run, check whether `$ARTIFACT_DIR` gained files and whether the `codex exec`
process is still alive. Do kill and rerun when the transcript shows a
Playwright launch failure under `workspace-write` (see above) — iteration will
not fix a sandbox denial.

## Prompt Requirements

Tell Codex:

- the exact flow or behavior to verify
- the verification URL: `http://127.0.0.1:5199`
- that the app is seeded and auto-logged-in through `npm run dev:verify`
- that it must not touch `5173` or real user data
- that it must not edit app source files
- that ALL byproducts (scripts, reports, screenshots, probe dirs) MUST be
  written inside `$ARTIFACT_DIR` — never next to the files under inspection
  (Codex otherwise drops helpers into the repo; verified 2026-07-06)
- whether screenshots are expected
- which console errors or warnings to capture
- to report pass, fail, or blocked
- to list only artifacts that actually exist on disk (a failed run must not
  report screenshot paths it never wrote)

Ask for this report shape:

```text
Result: pass | fail | blocked

Flow checked:
- route(s)
- steps performed

Findings:
- expected vs actual behavior
- console errors/warnings
- screenshots or artifact paths

Notes:
- anything not checked
- blockers or uncertainty
```

## Reporting Back

Summarize Codex's result in the user-facing response. Include routes checked,
important findings, screenshot paths if useful, and any blockers. Do not claim
visual confirmation unless Codex captured or described the relevant UI state.
