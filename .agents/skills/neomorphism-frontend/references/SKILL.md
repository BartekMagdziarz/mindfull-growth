---
name: neomorphism-frontend
description: >
  Design Mindful Growth interfaces in its current Sky Mist style: light blue,
  cloud-like organic surfaces, restrained depth and minimal copy, grounded in
  Today, Calendar and Objects. Also use for explicit neumorphism or soft UI
  requests outside this project; adapt to the existing design system.
---

# Soft surfaces and Sky Mist

In Mindful Growth this skill means the application's current Sky Mist design,
not the original gray, heavily embossed neumorphism tutorial. Keep the skill
name for compatibility. The product has evolved toward airy blue surfaces,
cloud-like geometry, a monotonic tonal ladder and sparse, progressively
revealed information.

## Ground the design in the current app

Before substantial UI work, read the relevant project instructions and inspect
Today, Calendar and Objects. Use screenshots or the running interface when
needed to judge density and composition. Start with existing components and
patterns instead of constructing a parallel design system.

Sources in this repository:

- `src/design-system/tokens.css` — canonical `--mg-*` tokens.
- `src/design-system/base.css` — surfaces, controls, organic completion wells.
- `src/features/planning-next/NextDayRail.vue` and `NextDayItemRow.vue` — Today.
- `src/features/calendar-rhythm/rhythm.css` and `RhythmBoard.vue` — Calendar.
- `src/components/objects/ObjectsLibraryMeasurementCard.vue` — Objects.
- `ux-lab/app/AGENTS.md` — durable design decisions and prototype boundaries.

The application is the visual source of truth. Historical experiments are
references, not permission to restore superseded patterns.

## Mindful Growth visual rules

- Convey the lightness of clouds and the blue of the sky through real tokens,
  spacing and restrained organic geometry. Do not add literal cloud decorations,
  glass panels or large atmospheric gradients without a design reason.
- Use `.mg-design-v2`, its Nunito typography and the shared organic icon family
  through `AppIcon`. Preserve dedicated emotion artwork. Do not substitute
  generic font stacks, emoji or unrelated icon sets.
- Follow one tonal direction: canvas → surface/card → mist/field → paper/inner.
  Each deeper level gets lighter. Controls inside a field are lighter than it;
  hover is one step lighter. Different parent/child backgrounds are intentional.
- Give first-level cards only a subtle paired shadow. Nested content stays flat.
  Reserve inset shadows for controls, tracks and pressed states, not content
  containers. Avoid deep extrusion, repeated wells and alternating blue/white
  bands. Use the existing shadow tokens with the same light direction.
- Reuse organic radius tokens. Small irregularities should feel calm; preserve
  alignment and geometry that encode data. Avoid arbitrary rotation of text,
  exaggerated blobs, stacked framing and decorative outlines.
- Blue is the primary accent. Rose/lavender are available when they carry a real
  distinction. Do not introduce green, yellow, amber or mint in Today. Preserve
  existing semantic palettes in other contexts; do not recolor emotion quadrants.
- Use `--mg-color-primary-strong` for small accent text; filled primary controls
  use `--mg-color-primary-fill` and the corresponding foreground token. Read
  token definitions rather than guessing ramp names or hard-coding colors.

## Content and interaction

The default surface should be quiet. Use short titles, brief action labels and
only the text necessary to understand or act. Minimize badges, counts, status
pills, repeated headings and helper paragraphs. Never add a badge just to fill
space or explain hierarchy already evident in the layout.

Reveal secondary actions on row hover AND keyboard focus. Keep explanations,
raw measurement values, metadata and less-used settings behind purposeful
interaction. A selected or expanded item receives its detail in place; do not
repeat its title or summary in several panels. Keep a clear primary action.

When interpretation is necessary, provide a concise accessible help control or
details disclosure beside the relevant data. Hiding text must not hide the
meaning of a measurement, a choice or a chart. Label inputs and actionable
icons, preserve focus feedback, and never rely on color or shadows alone.

Completion uses the established pale-blue organic well with a smaller blue
center when the surrounding product uses it. Do not replace it with unrelated
status badges or a generic success-green checkmark.

## Build and verify

Honor the user's chosen delivery surface. Use UX Lab for a requested concept;
keep its state isolated and resettable, its scenarios linkable by URL, and
notes outside the product-like surface. Obtain a design decision before a
production port only when the user or established plan requires one.

Run the applicable type/build checks, inspect the running UI and exercise its
important states. Check text overflow, whitespace, focus, progressive disclosure
and the full view, not just individual cards. Prefer brief, specific findings
and concrete corrections over decorative expansion.

For token-based CSS examples, read [css-patterns.md](css-patterns.md). For an
explicit classical neumorphism request in another project, adapt the paired
shadow formula to that project's palette. Do not carry Mindful Growth's colors
or prototype workflow into an unrelated application.
