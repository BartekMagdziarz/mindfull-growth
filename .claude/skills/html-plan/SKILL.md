---
name: html-plan
description: Create standalone HTML implementation plans instead of long markdown plans for larger roadmaps, architecture changes, multi-step implementation plans, UI or data-flow plans, and planning work that benefits from visual layout, timelines, diagrams, risk tables, or mockup sections. Do not use for short answers, simple checklists, or tiny implementation plans.
---

# HTML Plan

Use this skill when a plan is large enough that structure, visual grouping, or
diagrams will make it easier to understand than a markdown answer in chat.
Generate a standalone HTML file and return a short summary plus the file path.

This skill is inspired by HTML-first planning examples such as
`ThariqS/html-effectiveness`: the goal is a readable artifact, not a web app.

## Output Location

Write plans to:

```text
ideas/html-plans/<date>-<slug>.html
```

Use local date format `YYYY-MM-DD`. Create `ideas/html-plans/` if needed.
`ideas/` is ignored by git, so these are local planning artifacts unless the
user asks to move one into tracked docs.

## When To Use

Use HTML for:

- roadmaps with multiple phases
- architecture or data-flow plans
- UI flow plans, redesign plans, or interaction plans
- implementation plans with dependencies, risks, and acceptance criteria
- plans that would be long or hard to scan in markdown

Do not use HTML for:

- one-off answers
- short checklists
- small bug-fix plans
- situations where the user explicitly asks for markdown or plain text

## Required Sections

Every HTML plan must include:

- title
- short summary
- phases or timeline
- implementation changes
- verification plan
- risks or open questions
- assumptions and defaults

For UI or data-flow plans, add at least one simple visual section: diagram,
flow lanes, card mockup, or data-flow boxes. Use HTML/CSS for these visuals;
do not depend on external assets or remote scripts.

## HTML Requirements

- Create a single self-contained `.html` file.
- Include semantic HTML and inline CSS.
- Keep it readable in a browser without a build step.
- Use responsive layout with no horizontal overflow.
- Prefer restrained, scannable styling over decorative effects.
- Include enough detail that another agent or engineer can implement the plan
  without asking for decisions.
- Do not include secrets, credentials, or private data.

## Response Back

After creating the file, respond in chat with:

- the plan title
- the absolute or project-relative path to the HTML file
- a 2-4 bullet summary of the main phases or decisions

Do not paste the full HTML plan into chat unless the user asks.
