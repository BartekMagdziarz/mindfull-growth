---
name: codex-review
description: Ask Codex CLI for an independent code review of uncommitted changes, a branch diff, a commit, or a specific implementation. Use when the user asks for a review, second opinion, Codex review, GPT review, regression audit, missing-test audit, security check, or comparison against requirements.
---

# Codex Review

Use Codex as an independent reviewer. Treat Codex's output as evidence, not
authority: inspect cited files or diffs before reporting findings to the user.

Prefer Claude's normal local review process for tiny checks. Use this skill
when a second-pass review is useful, the change is broad, the user explicitly
asks for Codex, or the model-selection guidance calls for an independent pass.

## Workflow

1. Identify the review target: uncommitted changes, base branch, commit SHA, PR
   checkout, or specific files.
2. Create a temporary artifact directory for the prompt and report.
3. Write a focused review prompt with the target, requirements, risky areas,
   and any tests or files Claude is unsure about.
4. Run one of the command shapes below.
5. Read Codex's report and verify important claims against the code before
   presenting them.

## Command Shapes

```bash
ARTIFACT_DIR="$(mktemp -d "${TMPDIR:-/tmp}/codex-review.XXXXXX")"
REPORT="$ARTIFACT_DIR/report.md"
PROMPT="$ARTIFACT_DIR/prompt.md"
```

Review staged, unstaged, and untracked changes:

```bash
codex -C "$PWD" review --uncommitted - < "$PROMPT" > "$REPORT"
```

Review current branch against `main`:

```bash
codex -C "$PWD" review --base main - < "$PROMPT" > "$REPORT"
```

Review a single commit:

```bash
codex -C "$PWD" review --commit <sha> - < "$PROMPT" > "$REPORT"
```

## Review Prompt

Ask Codex to use a code-review stance:

```text
Review these changes for bugs, regressions, missing tests, security issues,
and requirement mismatches.

Prioritize findings over summary. For each finding include:
- severity
- file and line reference
- concrete failure mode
- suggested fix direction

Do not edit files. If there are no substantive findings, say so and name any
residual test gaps.
```

Add task-specific context when useful: requirements, expected behavior, risky
areas, relevant tests, or files Claude is unsure about.

## Reporting Back

Before relaying a Codex finding, inspect the cited code or diff enough to
decide whether the finding is real. In the user-facing response, separate
confirmed issues from Codex suggestions you did not verify.

If Codex finds nothing, say that clearly and mention what review target it
inspected.

If `codex` is not installed or the command fails, report the error and offer to
review the changes directly instead.
