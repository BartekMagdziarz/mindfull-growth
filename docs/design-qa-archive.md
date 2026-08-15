# Design QA archive

Historical visual QA notes collected during the Month V2 and UX Lab work. Some evidence paths point
to ignored local captures that intentionally remain outside version control. Current product status
and next actions live in [`current-status-and-roadmap.md`](current-status-and-roadmap.md).

## Month V2 soft radar

## Evidence

- Source visual truth: `/var/folders/wl/0mvnhqgx5bv_c21bqdykfy180000gn/T/codex-clipboard-c52a587a-2598-43e3-bc6c-6b2aee99950b.png`
- Browser-rendered implementation: `/Users/mg/Developer/mindfull-growth/.month-v2-soft-radar.png`
- Side-by-side comparison input: `/Users/mg/Developer/mindfull-growth/.month-v2-soft-radar-comparison.png`
- Route and state: `/calendar/month/2026-06?layout=v2`, seeded closed-month overview
- Browser viewport: 1280 × 720

## Full-view comparison

The reference and implementation were opened together in the side-by-side comparison input. Both use an airy blue/rose pastel palette, fading translucent fills, small endpoint markers, minimal outlines, and generous negative space. The implementation adapts the reference into small weekly illustrations while keeping the existing month-v2 composition and density.

The weekly visuals now read as irregular translucent patches rather than analytical charts. The six category cells remain icon-free, and the Goals/Habits progress marks have lighter tracks, softer markers, quieter percentage labels, and lower-contrast shadows.

## Focused-region comparison

The weekly strip was inspected at readable size in the browser capture. Each complete week contains two smooth closed paths with no visible grid, spokes, scale rings, or hard polygon corners. Small deterministic offsets keep the silhouettes from looking mechanically symmetrical. A low-opacity blurred wash extends beyond each fill, producing the soft illustrated edge requested by the user.

Every rendered week exposes the DOM order `state > requirements`: blue State is painted first and remains behind; rose Requirements is painted second and remains on top. At equal values the translucent overlap and violet endpoint create a restrained purple accent.

## Required fidelity surfaces

- Fonts and typography: existing product typography is unchanged. The mini-chart percentages were softened from strong primary text to the muted token with a lighter weight.
- Spacing and layout rhythm: no grid, breakpoint, card, or panel dimensions changed. The weekly illustrations retain the same slots and negative space as the previous month-v2 layout.
- Colors and visual tokens: fills use existing sky/rose ramps at 0.20–0.35 opacity; strokes stay below 0.42 opacity. The violet equal-state marker is deliberately local and subdued.
- Image quality and asset fidelity: the source contains no raster product assets requiring reproduction. The data-bound SVG remains sharp at every scale; Gaussian blur is restricted to a separate ambient wash so the actual contour stays clean.
- Copy and content: no visible copy changed. Accessible chart descriptions continue to name both categories and all four numeric area values.

## Interaction and technical checks

- Five weekly charts render with realistic seeded data.
- All five report `state > requirements` in DOM paint order.
- Complete, partial, empty, and equal-value datasets are covered by component tests.
- Browser inspection found no chart/render errors. Console output contains only the verification environment's known pre-login repository messages.
- Production build, typecheck, and 20 focused component tests pass.

## Comparison history

1. Previous iteration used independent radial ribbons. Although layering was explicit, the cross-like result still read as a mathematical diagram.
2. Fix: restored two radar surfaces, removed all grid/spoke geometry, increased curve tension, introduced slight per-series asymmetry, lowered stroke/fill contrast, and added blurred ambient washes.
3. Previous Goals/Habits progress marks still had relatively crisp tracks, markers, and percentage labels.
4. Fix: reduced track/value widths and opacity, softened the marker outline, moved the label to the muted token, and added only a faint diffused shadow.
5. Post-fix visual evidence shows soft irregular weekly patches with rose consistently above blue and no actionable P0/P1/P2 regression.

## Findings

No actionable P0, P1, or P2 findings remain.

## Follow-up polish

- P3: after the remaining four category visualization concepts are chosen, apply the same low-contrast, illustration-first language without adding icons.

final result: passed

# Today UX Lab — Sketchbook design QA

## Evidence

- Layout sources:
  - `/Users/mg/Developer/mindfull-growth/ux-lab/audit/today/sketchbook/01-layout-collapsed-source.png`
  - `/Users/mg/Developer/mindfull-growth/ux-lab/audit/today/sketchbook/02-layout-expanded-source.png`
- Hand-drawn style sources:
  - `/Users/mg/Developer/mindfull-growth/ux-lab/audit/today/sketchbook/03-handdrawn-components-source.png`
  - `/Users/mg/Developer/mindfull-growth/ux-lab/audit/today/sketchbook/04-handdrawn-expanded-source.png`
- Browser-rendered implementation:
  - `/Users/mg/Developer/mindfull-growth/ux-lab/audit/today/sketchbook/05-sketchbook-collapsed.png`
  - `/Users/mg/Developer/mindfull-growth/ux-lab/audit/today/sketchbook/06-sketchbook-expanded.png`
- Side-by-side comparison inputs:
  - `/Users/mg/Developer/mindfull-growth/ux-lab/audit/today/sketchbook/comparison-collapsed.jpg`
  - `/Users/mg/Developer/mindfull-growth/ux-lab/audit/today/sketchbook/comparison-expanded.jpg`
  - `/Users/mg/Developer/mindfull-growth/ux-lab/audit/today/sketchbook/comparison-style.jpg`
- Route: `/preview/today/sketchbook-v1/current`
- Browser viewport: 1280 × 720. Mobile was intentionally out of scope.

## Full-view comparison

The collapsed and expanded references were each opened next to the matching browser capture. The implementation preserves the source's desktop composition: a persistent daily list on the left, a 3 × 4 shortcut board in the collapsed state, category tabs and progress cards in the expanded state, and a 3 × 3 shortcut footer.

The visual treatment deliberately moves toward the supplied drawn draft without replacing the product language. Shortcut icons sit on softly irregular blue, lavender, and rose tiles; circular values, graph dots, bars, chart echoes, borders, and corner radii use small controlled variations. The result remains recognizably soft-neumorphic and uses the application's palette rather than introducing green, yellow, or amber accents.

## Focused-region comparison

The right-side board was compared with the hand-drawn component source at readable size. The implementation matches its larger icon tiles, simple separators, minimal labels, and illustration-first graph previews. In the expanded state, the dot, bar, and line presentations keep each object's native scale and retain the source interaction model: one, two, or three cards per row, with vertical scrolling confined to the details panel only when the one-card density requires it.

## Required fidelity surfaces

- Fonts and typography: existing product typography and Material Symbols remain in place; hand-drawn character comes from geometry and data marks rather than a foreign display font.
- Spacing and layout rhythm: both primary states fit exactly inside 1280 × 720 with no document-level vertical or horizontal scrolling. The persistent left list stays aligned between states.
- Colors and visual tokens: all colors resolve from existing blue, lavender, purple, rose, red, and neutral application tokens. No green or yellow styling was added.
- Image quality and asset fidelity: the screen has no raster product assets. Existing Material Symbols are used for icons; graph marks remain sharp at desktop scale.
- Copy and content: labels and realistic values follow the supplied draft and the existing Today vocabulary. The expanded header explicitly names both category and period: `ostatnie 14 dni`.

## Interaction and technical checks

- Clicking Cele, Nawyki, or Trackery opens its progress cards; clicking the active tab again or the close control returns to the shortcut board.
- Clicking a featured graph opens the matching category and selects the corresponding detail card.
- Density controls 1, 2, and 3 change the real card grid. Density 1 keeps document dimensions at 1280 × 720 and scrolls only the detail panel.
- Daily completion, numeric, and routine-step controls update visibly; shortcut buttons retain selected state.
- No Vite error overlay is present in the final browser state.
- UX Lab boundary check, Vue typecheck, production build, and all 12 automated tests pass.

## Comparison history

1. The first expanded browser pass exceeded the full-window viewport by about 48 px; an initial compression still left 17 px of document scroll.
2. Fix: reduced only the daily control rhythm, kept chart and footer proportions intact, and made the inner sheet consume the exact available viewport height.
3. The one-card density initially expanded the document to 889 px because its five cards contributed their natural grid height.
4. Fix: constrained the main grid and kept overflow inside the details surface. Densities 1, 2, and 3 now preserve the full-window frame.
5. Post-fix side-by-side evidence shows the same information architecture and interaction states as the source, with the requested more illustrative geometry. No actionable P0/P1/P2 regression remains.

## Findings

No actionable P0, P1, or P2 findings remain.

## Follow-up polish

- P3: after using the experiment, decide whether the irregularity should stay this restrained or move one step further toward a visibly pencil-textured line treatment.

final result: passed

---

# Today UX Lab — focus hierarchy and progress overview design QA

## Evidence

- Source visual truth: `/Users/mg/Developer/mindfull-growth/ux-lab/audit/today/full-window/00-baseline.png`
- Browser-rendered implementations:
  - `/Users/mg/Developer/mindfull-growth/ux-lab/audit/today/full-window/01-shared-axis-v2.png`
  - `/Users/mg/Developer/mindfull-growth/ux-lab/audit/today/full-window/02-focus-ladder-v2.png`
  - `/Users/mg/Developer/mindfull-growth/ux-lab/audit/today/full-window/03-now-v2.png`
  - `/Users/mg/Developer/mindfull-growth/ux-lab/audit/today/full-window/04-supporting-v2.png`
  - `/Users/mg/Developer/mindfull-growth/ux-lab/audit/today/full-window/05-minimal-v2.png`
- Full-view side-by-side comparison: `/Users/mg/Developer/mindfull-growth/ux-lab/audit/today/full-window/comparison-baseline-vs-focus-v2.jpg`
- Focused right-section comparison: `/Users/mg/Developer/mindfull-growth/ux-lab/audit/today/full-window/comparison-focused-v2.jpg`
- Browser viewport: 1280 × 720; captured content surface: 1265 × 712.
- State: 19 July 2026, priority `Regularny ruch i kondycja`, monthly focus selected. All five variants were also opened directly in a full desktop window.

## Full-view comparison

The baseline and Experiment 01 were opened together in one side-by-side comparison input. The left-hand daily execution area preserves the established airy Sky Mist / soft-neumorphic language. The redesigned right side intentionally replaces the baseline's dense matrix of unrelated object cards with one explicit focus hierarchy and one readable progress surface.

The three top contexts are visible without scrolling and name both role and period: yearly priority, monthly focus, and weekly focus. The selected context uses raised/inset state treatment rather than relying on color alone. The right panel fits entirely above the fold and does not introduce horizontal overflow.

## Focused-region comparison

The top context field and right overview were compared at readable size. The new design removes repeated per-object axes, dense icon repetition, ambiguous aggregate controls, and unexplained status dots. Experiment 01 instead surfaces one object, its current state, its target, and one six-period history. When the selected object is a one-time goal, the timeline is explicitly labeled as a supporting metric rather than presented as the goal's own counter.

## Required fidelity surfaces

- Fonts and typography: Roboto and Material Symbols Rounded remain aligned with the product. Hierarchy is carried by a restrained 17–22 px heading range and compact labels; no unexpected wrapping or truncation appears in the inspected 1280 × 720 state.
- Spacing and layout rhythm: the existing left column was kept stable. The right panel and top context field share the product's radii, soft elevation, inset controls, and generous negative space. Measured checks found no document, ribbon, or progress-card horizontal overflow; the full right panel ends at y=667 within a 720 px viewport.
- Colors and visual tokens: Today uses only Sky Mist blues, existing lavender/purple emotion tokens, rose/pink, red, and neutral surface/border tokens. No success-green, warning-yellow, amber, or mint token is referenced by the Today experiment.
- Image quality and asset fidelity: the screen contains no raster product imagery. All visible icons come from the existing Material Symbols component; no placeholder, emoji, or custom SVG substitution was introduced.
- Copy and content: every surface names the active context and period. Values remain in each object's native scale (`17 / 15`, deadline, or `Brak danych`) and are not converted to an unexplained score. Secondary contribution copy is disclosed only after interaction.

## Interaction and technical checks

- Clicking yearly priority, monthly focus, or weekly focus updates the right-hand title, period, target, and history.
- Changing the priority selector replaces both the monthly and weekly focus objects while leaving the accepted left daily action list unchanged.
- Progressive disclosure expands and collapses the contribution details.
- All five experiment routes were inspected directly in the full desktop window; mobile was intentionally out of scope.
- Browser console check returned no messages or runtime errors.
- Browser layout check: no horizontal overflow in the document, top context ribbon, or right progress card.
- UX Lab production build, boundary check, typecheck, and automated tests pass.

## Comparison history

1. Initial implementation rendered the one-time `Przebiec 10 km bez zatrzymania` goal as `Osiągnięty` before its September deadline and reused a recurring numeric chart. This was a P1 semantic error because it misrepresented the user's progress.
2. Fix: one-time goals now show `W toku` plus their deadline. Their chart is replaced by a clearly named supporting key-result metric in that metric's own weekly scale.
3. Initial week copy used the nominative month form (`13–19 lipiec`). This reduced period clarity.
4. Fix: week ranges now use Polish genitive month forms (`13–19 lipca`).
5. Post-fix full-window captures show the corrected goal state and explicit metric source in all affected variants. No actionable P0/P1/P2 finding remains.

## Findings

No actionable P0, P1, or P2 findings remain.

## Follow-up polish

- P3: validate with users whether Experiment 01's raw bar labels or Experiment 05's minimal history produces faster comprehension before selecting the production direction.

final result: passed

---

# Today UX Lab — Sketchbook scale and controls design QA

## Evidence

- Source visual truth: `/Users/mg/Developer/mindfull-growth/ux-lab/audit/today/sketchbook-v2/01-zoom-150-source.png`
- Browser-rendered implementation:
  - `/Users/mg/Developer/mindfull-growth/ux-lab/audit/today/sketchbook-v2/02-sketchbook-v2-collapsed.png`
  - `/Users/mg/Developer/mindfull-growth/ux-lab/audit/today/sketchbook-v2/03-sketchbook-v2-expanded.png`
- Full-view comparison: `/Users/mg/Developer/mindfull-growth/ux-lab/audit/today/sketchbook-v2/comparison-full.jpg`
- Focused right-board comparison: `/Users/mg/Developer/mindfull-growth/ux-lab/audit/today/sketchbook-v2/comparison-right.jpg`
- Focused data-control comparison: `/Users/mg/Developer/mindfull-growth/ux-lab/audit/today/sketchbook-v2/comparison-controls.jpg`
- Route: `/preview/today/sketchbook-v1/current`
- Browser viewport: 1280 × 720; mobile intentionally out of scope.

## Full-view comparison

The supplied 150% browser view and the final 100% implementation were normalized and opened together. The revised experiment recreates the larger optical scale while preserving the complete desktop frame: icon tiles occupy roughly 55–62% of each shortcut button's usable width, labels and daily-item text are larger, and the outer canvas now has 20 px breathing room for the future application sidebar. The daily list and all four right-hand rows remain visible without document scrolling.

The source's lavender and rose icon surfaces were intentionally not reproduced because the user explicitly requested one color. Every shortcut icon, icon field, navigation state, density control, and daily data stamp now uses the existing Sky Mist blue family. The rose priority star and the rose history dot remain semantic data accents rather than component-surface colors.

## Focused-region comparisons

The right-board comparison confirms that icon fields are substantially larger than the previous implementation and that every text label shares the same vertical grid track. Rotation is now limited to the irregular icon field itself; the button and label are not rotated, removing the earlier baseline drift.

The control comparison shows the new shared component language on the daily list. Numeric values use pale-blue pressed rectangular stamps. Incomplete completion items use an `add` stamp, and completed items switch to a `check` stamp with a stronger blue inset state. Routine substeps use the same geometry, palette, and raised/pressed behavior. This removes the competing system of dark circular counters while keeping state readable without color alone.

## Required fidelity surfaces

- Fonts and typography: existing product typography remains unchanged. Daily labels increased to 11.25 px and shortcut labels to 12.5 px; all labels are centered in fixed 24 px tracks with no observed wrapping or clipping.
- Spacing and layout rhythm: the outer margin increased from 14 px to 20 px, the panel gap increased to 20 px, and the four-row board gap increased to 16 px. Both collapsed and expanded states measure exactly 1280 × 720 with no document-level overflow.
- Colors and visual tokens: component surfaces use only existing Sky Mist background, primary, border, and neumorphic shadow tokens. Category-specific lavender and rose fields were removed.
- Image quality and asset fidelity: Material Symbols remain the icon source. Line charts are rendered as cubic Bézier paths with rounded caps and joins; the softer echo stroke remains aligned to the same path.
- Copy and content: no product labels or values changed. The expanded state continues to state category and period explicitly (`ostatnie 14 dni`).

## Interaction and technical checks

- Category tabs open Cele, Nawyki, and Trackery and update the period header.
- Density controls 1, 2, and 3 change the card grid. Density 1 scrolls only inside the details panel; the document remains 1280 × 720.
- Completion stamps change from `add` to `check`; numeric values increment; routine steps toggle pressed state.
- The featured charts still open their corresponding detail cards, and the close control returns to the shortcut board.
- No Vite runtime error overlay is present in the final browser state.
- UX Lab boundary check, Vue typecheck, production build, and all 15 automated tests pass.

## Comparison history

1. Previous implementation: icon fields occupied a small minority of the shortcut buttons, used three category colors, kept 9 px labels, rotated an entire middle button, and rendered linear charts with angular polylines. These were P2 scale, consistency, and alignment mismatches against the user's feedback.
2. Fix: increased the icon field to 55–62% of usable button width, increased typography, unified all component fields to Sky Mist blue, moved irregular rotation onto the icon field only, and replaced polylines with Catmull-Rom-derived cubic Bézier paths.
3. First revised control pass used the same `check` icon for both incomplete and complete items. This was a P2 state-affordance ambiguity even though the pressed state differed.
4. Fix: incomplete items now show `add`, completed items show `check`, and numeric values use a separate recorded-state class. Focused post-fix evidence shows the controls remain visually unified while their states are distinct.
5. Final full-window evidence shows no clipping, label drift, document overflow, or remaining actionable P0/P1/P2 issue.

## Findings

No actionable P0, P1, or P2 findings remain.

## Follow-up polish

- P3: after reviewing the enlarged version in the Lab shell with the real sidebar visible, tune the 20 px outer margin only if the combined frame feels too tight.

final result: passed

---

# Today UX Lab — Błękitna Kropka controls and rounded typography design QA

## Evidence

- Source visual truth: `/Users/mg/Developer/mindfull-growth/ux-lab/audit/today/blue-dot-v3/01-blue-dot-logo-source.png`
- Previous full-window implementation: `/Users/mg/Developer/mindfull-growth/ux-lab/audit/today/sketchbook-v2/05-exact-icons-implementation.png`
- Final collapsed implementation: `/Users/mg/Developer/mindfull-growth/ux-lab/audit/today/blue-dot-v3/04-collapsed-final.png`
- Final expanded implementation: `/Users/mg/Developer/mindfull-growth/ux-lab/audit/today/blue-dot-v3/05-expanded-final.png`
- Full-view before/after comparison: `/Users/mg/Developer/mindfull-growth/ux-lab/audit/today/blue-dot-v3/comparison-full-v3.jpg`
- Focused logo/control comparison: `/Users/mg/Developer/mindfull-growth/ux-lab/audit/today/blue-dot-v3/comparison-blue-dot-controls.jpg`
- Route: `/preview/today/sketchbook-v1/current`
- Browser viewport: 1280 × 720; mobile intentionally out of scope.

## Findings

No actionable P0, P1, or P2 findings remain.

The daily controls now use a 34 px pale-blue near-circle. Completed tasks add a 24 px dark Sky Mist near-circle, preserving the source mark's approximate 70–75% inner/outer ratio without reusing the logo as a literal product asset. Incomplete tasks remain visually empty, numeric/rating controls keep navy text inside the pale form, and the former red priority star is absent.

Compact category tabs retain three 34 px pale-blue icon fields, while all nine footer shortcuts retain 26 px pale-blue icon fields. Labels remain outside those fields, which preserves scanability for longer Polish names while still making the large icon rectangles visibly morph into smaller irregular circles.

## Required fidelity surfaces

- Fonts and typography: the experiment uses Nunito for daily copy, metadata, values, and dense content. Concert One is limited to the large shortcut labels and compact category names as a display accent. Both fonts report loaded in the final browser state; the fallback chain remains explicit. Polish diacritics render without clipping, and the dense list keeps its readable weight hierarchy.
- Spacing and layout rhythm: the outer/inner dot ratio follows the supplied source. Removing vertical row padding offsets the larger circular controls, so the complete daily list fits inside the 648 px panel (`scrollHeight === clientHeight === 648`). The document remains exactly 1280 × 720 in collapsed and expanded states.
- Colors and visual tokens: control surfaces use `sky-200`; completed centers use `sky-700`; numeric text uses `sky-800`. No new color outside the product palette is introduced, and the red star has been removed.
- Image quality and asset fidelity: the supplied foundation logo is used as proportional and color guidance, not displayed or approximated as a brand asset inside the interface. Material Symbols remain unchanged for functional icons. The focused comparison input confirms that the control anatomy reflects the logo's nested-dot composition.
- Copy and content: task names, values, category labels, periods, and chart summaries remain unchanged. The removed star does not remove focus information because that hierarchy is already present in the right-hand overview.

## Primary interactions tested

- An incomplete completion control exposes `aria-pressed="false"`, contains no text or dark center, and becomes `aria-pressed="true"` with one dark center after click.
- The first numeric control increments from `6/30` to `7/30` and remains legible inside its pale near-circle.
- Opening a category preserves three compact category icon fields and nine compact footer icon fields.
- Expanded category switching, detail charts, density controls, and the close action remain functional from the preceding QA pass.
- No Vite runtime overlay is present in either final state.

## Comparison history

1. First implementation pass: an incomplete completion control fell through to the numeric template and displayed `0`. This was a P1 semantic/state error.
2. Fix: numeric content now renders only for non-completion objects; incomplete completion circles are empty and completed circles disclose only the dark center. Post-fix browser evidence confirms empty incomplete text and the correct pressed-state transition.
3. First implementation pass: 34 px controls combined with 2 px vertical row padding increased the panel scroll height to 675 px, clipping the final `Sen (h)` row beyond the 648 px daily panel. This was a P2 full-window fit regression.
4. Fix: daily rows keep their 34 px minimum height but remove vertical padding. The final row ends above the panel edge and `scrollHeight === clientHeight === 648`.
5. First implementation pass: active routine-step controls replaced the entire pale circle with navy, losing the nested-dot relationship. This was a P2 component-consistency mismatch.
6. Fix: active routine controls retain the pale outer circle and add a smaller dark near-circle behind the existing functional icon. The second visual comparison shows consistent nested-dot anatomy across completion and routine states.

## Follow-up polish

- P3: after one or two real-use sessions, reassess whether Concert One should remain on all large shortcut labels or be reduced further to only the three category labels.

final result: passed

---

# Today UX Lab — exact shortcut icon design QA

## Evidence

- Exact icon reference: `/Users/mg/Developer/mindfull-growth/ux-lab/audit/today/sketchbook-v2/04-exact-icons-source.png`
- Final full-window implementation: `/Users/mg/Developer/mindfull-growth/ux-lab/audit/today/sketchbook-v2/05-exact-icons-implementation.png`
- Combined visual comparison: `/Users/mg/Developer/mindfull-growth/ux-lab/audit/today/sketchbook-v2/comparison-icons-exact.jpg`
- Expanded implementation: `/Users/mg/Developer/mindfull-growth/ux-lab/audit/today/sketchbook-v2/03-sketchbook-v2-expanded.png`
- Browser viewport: 1280 × 720; mobile intentionally out of scope.

## Findings and fix

The first pass used semantically similar Material Symbols for several shortcuts, but their silhouettes did not match the supplied icon sheet. This was a P2 visual-fidelity mismatch. The final one-to-one map is `mountain_flag`, `change_circle`, `show_chart`, `history_edu`, `cognition`, `psychology`, `pregnant_woman`, `health_and_safety`, and `stress_management`.

The collapsed board, expanded category tabs, and expanded footer all render from the same category/action data, so the exact glyph choices remain consistent between interaction states. An automated regression test asserts the full ordered nine-icon set, including the user-confirmed `history_edu` glyph for Dziennik.

The combined comparison input confirms matching silhouettes for all nine shortcuts. The final browser pass reports a 1280 × 720 viewport, a 1280 × 720 document, no runtime overlay, and no remaining actionable P0/P1/P2 issue.

final result: passed

---

# Today UX Lab — unified Polish typography design QA

## Evidence

- Previous mixed-font implementation: `/Users/mg/Developer/mindfull-growth/ux-lab/audit/today/blue-dot-v3/04-collapsed-final.png`
- Final collapsed implementation: `/Users/mg/Developer/mindfull-growth/ux-lab/audit/today/typography-audit/02-unified-nunito.png`
- Final expanded implementation: `/Users/mg/Developer/mindfull-growth/ux-lab/audit/today/typography-audit/03-unified-nunito-expanded.png`
- Full-view comparison: `/Users/mg/Developer/mindfull-growth/ux-lab/audit/today/typography-audit/comparison-font-mix-vs-nunito.jpg`
- Focused label comparison: `/Users/mg/Developer/mindfull-growth/ux-lab/audit/today/typography-audit/comparison-labels-focused.jpg`
- Route: `/preview/today/sketchbook-v1/current`
- Browser viewport: 1280 × 720; mobile intentionally out of scope.

## Findings and fix

The previous display-font layer used Concert One for prominent shortcut labels. Although the official metadata declares `latin-ext`, direct cmap inspection of the distributed font file found that most Polish diacritics were absent. The browser therefore substituted glyphs from a fallback font inside otherwise Concert One-rendered words, producing visible differences in shape, stroke weight, and spacing. This was a P1 language-support and visual-consistency issue.

The final implementation removes Concert One and uses Nunito throughout the experiment. Prominent shortcut and category labels use weight 800, while dense content keeps its existing lighter hierarchy. This preserves the rounded, friendly direction without mixing glyph systems inside Polish words or introducing a second display family on a screen whose labels are too small to benefit from a distinct headline voice.

## Required fidelity surfaces

- Fonts and typography: root copy, all 12 collapsed-board labels, all three expanded tabs, and all nine expanded shortcuts render in Nunito. The browser font check confirms Polish glyph support, and no label wraps, clips, or overflows.
- Spacing and layout rhythm: the typography correction does not alter panel geometry. The final document remains exactly 1280 × 720; the daily panel remains `scrollHeight === clientHeight === 648`.
- Colors and visual tokens: no palette, surface, shadow, or state color changed.
- Image quality and asset fidelity: Material Symbols, icon-field geometry, circular daily controls, and smooth chart paths remain unchanged.
- Copy and content: all Polish labels, values, category names, periods, and summaries remain unchanged.

## Interaction and technical checks

- Collapsed and expanded states were opened in the full-window route, not only inside the Lab shell.
- Polish diacritics including `Ć`, `ą`, `ś`, `ę`, `ł`, and `ó` render with the same family and weight as their surrounding letters.
- All existing category, detail, density, completion, numeric-entry, and close interactions remain intact.
- No Vite runtime overlay is present.
- UX Lab boundary check, Vue typecheck, production build, and all 15 automated tests pass.

## Comparison history

1. Previous implementation: Concert One was limited to prominent labels while Nunito handled the rest of the screen. Missing Polish glyphs caused browser fallback within individual words.
2. Fix: removed the Concert One request and declarations, then assigned Nunito weight 800 to the prominent labels so hierarchy comes from weight and scale rather than a second typeface.
3. Final full-window and focused comparisons show consistent Polish glyph shapes, no layout regression, and no remaining actionable P0/P1/P2 issue.

## Findings

No actionable P0, P1, or P2 findings remain.

final result: passed

---

# Today UX Lab — current-week chart simplification QA

## Evidence

- Source behavior: production Today overview uses seven Monday–Sunday day slots for weekly completion dots, daily bars, rating bars, and value lines.
- Implementation route: `/preview/today/sketchbook-v1/current`
- Intended viewport: 1280 × 720; mobile intentionally out of scope.
- Rendered implementation screenshot: blocked — the selected in-app Browser rejected navigation to the local UX Lab address under its active security policy.
- Full-view and focused comparison evidence: blocked for the same reason; no alternate browser surface was used.

## Implemented changes

- Replaced 14-day mock series with seven explicit `pn–nd` positions for every expanded chart.
- Future Friday–Sunday values remain empty for the Thursday fixture, matching the current-week day-slot model.
- Changed the section label from `ostatnie 14 dni` to `bieżący tydzień`.
- Kept the existing hand-drawn dots, rounded bars, smooth line paths, target line, palette, card geometry, and interactions.
- Removed persistent top-right summaries from the resting state; they now appear on card hover and `:focus-visible`, while remaining available to assistive technology through `aria-describedby`.
- Unified completion-dot semantics with the Błękitna Kropka controls: pale blue for assigned/pending, pale blue with a navy center for completed, neutral gray for unassigned, and rose for assigned past days without completion. Today follows the pending/completed pair.

## Technical checks

- UX Lab import boundaries and direct Vite production bundling pass.
- All 15 automated tests pass, including seven weekday labels and the ordered completion-state mapping on expanded goal charts.
- The aggregate `npm run build` currently stops in the independently edited `MonthSketchbookReplica.vue` at line 369 because a plain string is passed to a `Set<WeekRef>`. The Today completion-dot change does not touch that file or type path.

## Findings

- P1 verification blocker: the final desktop render cannot be visually inspected or compared until the in-app Browser is allowed to open the local UX Lab preview again.
- P2 workspace blocker: the unrelated Month replica type error must be resolved by its owner before the aggregate Vue typecheck can pass.

final result: blocked

---

# Planning Next — wspólny Kalendarz i rytuał roczny design QA

## Evidence

- Source visual truth:
  - Day collapsed/expanded: `/Users/mg/Developer/mindfull-growth/ux-lab/audit/today/blue-dot-v3/04-collapsed-final.png`, `/Users/mg/Developer/mindfull-growth/ux-lab/audit/today/blue-dot-v3/05-expanded-final.png`
  - Week: `/Users/mg/Developer/mindfull-growth/ux-lab/app/qa/new-calendar/week-v6-overview-default.jpg`
  - Month: `/Users/mg/Developer/mindfull-growth/ux-lab/app/qa/month-sketch-01-board.png`
  - Year: `/Users/mg/Developer/mindfull-growth/ux-lab/app/qa/new-calendar/year-v6-overview.jpg`
  - Annual ritual: `/Users/mg/Developer/mindfull-growth/ux-lab/app/qa/production-next/annual-lab-reference-1280x720.png`
- Browser-rendered implementation:
  - `/Users/mg/Developer/mindfull-growth/ux-lab/app/qa/production-next/day-1280x720.png`
  - `/Users/mg/Developer/mindfull-growth/ux-lab/app/qa/production-next/day-goals-expanded-1280x720.png`
  - `/Users/mg/Developer/mindfull-growth/ux-lab/app/qa/production-next/week-1280x720.png`
  - `/Users/mg/Developer/mindfull-growth/ux-lab/app/qa/production-next/month-1280x720.png`
  - `/Users/mg/Developer/mindfull-growth/ux-lab/app/qa/production-next/year-1280x720.png`
  - `/Users/mg/Developer/mindfull-growth/ux-lab/app/qa/production-next/annual-plan-1280x720.png`
  - `/Users/mg/Developer/mindfull-growth/ux-lab/app/qa/production-next/day-1440-pinned.png`
- Routes and states: canonical day, current week, current month, current year, yearly planning step 1, day Goals expanded, and Month V2 through `ui=legacy`.
- Browser viewport: 1280 × 720 at 1× pixel density; additional 1440 × 900 pass with the application dock visibly pinned.

## Full-view comparison

Every source and its matching implementation were inspected together at readable size. The production workspace preserves the accepted desktop anatomy: approximately 30/70 rail and stage, soft Sky Mist surfaces, a four-scale period control, large illustration-first shortcuts, and progressive disclosure rather than a dense dashboard. Day, Week, Month, and Year share one composition and one typographic/token hierarchy while exposing period-specific context in the rail.

The annual ritual carries the same soft surface language and six-step progression into production without importing Lab fixtures. Its production adaptation deliberately retains the real year/month context in the left rail and places the chapter progression in the stage; future chapters are now semantically disabled and the active chapter exposes `aria-current="step"`.

## Focused-region comparison

- Day collapsed: the 3 × 3 shortcut board, persistent execution rail, category counts, and restrained blue icon fields follow the accepted Blue Dot reference.
- Day expanded: Goals open into token-driven chart cards with density controls and a clear close action; the daily execution rail remains stable and uses the existing mutation controls.
- Week: seven real days, qualitative Wysiłek/Stan context, three focus cards, and object families remain visible without horizontal overflow.
- Month: compass, top priorities, weeks, and object families preserve the Lab information hierarchy while using live plan/reflection data.
- Year: twelve months and priorities are readable above the fold, with future months visibly distinct and contextual detail disclosed on demand.
- Annual ritual: the six existing domain steps are present in the accepted order, step 1 advances to Obszary życia, and five future chapters are locked before progression.

## Required fidelity surfaces

- Fonts and typography: the scoped workspace uses Nunito, including Polish diacritics, with no local font declarations in Planning Next.
- Spacing and layout rhythm: 1280 px renders without horizontal overflow; vertical scrolling is retained where real data exceeds the reference height, as allowed by the desktop-only acceptance scope. The 1440 px pinned-dock state also has no horizontal document overflow.
- Colors and visual tokens: Planning Next resolves colors, radii, elevations, motion, focus, and z-layers through `src/design-system`; the guard rejects raw colors, local shadows/fonts, and `neo-*` classes in new components.
- Image quality and asset fidelity: existing `AppIcon` and `EntityIcon` assets remain sharp; no Lab raster or fixture is used by production.
- Copy and content: period labels, object names, ratings, counts, current/future/closed semantics, and ritual step names come from production stores and services.

## Interaction and technical checks

- Canonical `/calendar` resolves to Day with the Next renderer; `/today/:dayRef` redirects to canonical Day and preserves `ui=legacy`.
- `?ui=legacy` renders the old Month view and preserves Month V2-only query parameters; no `.mg-design-v2` root leaks into the legacy renderer.
- Day category expansion, scale navigation, annual step progression, future-step locking, and the 1440 px dock state were exercised in the in-app Browser.
- Browser inspection found no runtime error or Vite overlay on the inspected Next routes.
- Main Vitest: 193 files passed, 2029 tests passed, 1 skipped. UX Lab: 2 files and 26 tests passed.
- Root typecheck/build, Lab typecheck/build, UX Lab boundary guard, design-system guard, and all 28 locale-pair checks pass.

## Comparison history

1. First period screenshots were captured before asynchronous data had completed loading and showed only the application background.
2. Fix: visual verification now waits for the period heading; recaptured Week, Month, and Year screens contain the ready state and live seeded data.
3. The annual progress dots initially looked locked but remained focusable future buttons without disabled semantics.
4. Fix: future annual steps now receive `disabled`, while the active step receives `aria-current="step"`; a browser DOM check confirms five locked steps at the Brief stage.
5. The first 1440 px attempt exercised the off-canvas pin action without opening the dock, so it did not prove the visible pinned state.
6. Fix: the dock was opened, pinned through its visible action, measured at 220 px, and recaptured with the full application navigation shown.

## Findings

No actionable P0, P1, or P2 findings remain.

## Follow-up polish

- P3: after real-user use of the annual ritual, decide whether its chapter list should replace the year/month context in the rail or remain embedded in the stage as implemented.

final result: passed

---

# Planning Next — korekta zgodności widoków i rytuałów z UX Labem

## Zakres i dowody

- Źródła prawdy: komplet 27 ekranów Dnia, Tygodnia, Miesiąca, Roku oraz wszystkich kroków rytuałów tygodniowych i miesięcznych w `ux-lab/app/qa/planning-next-audit-2026-07-22/source/`.
- Implementacja po korekcie: 22 stany w `ux-lab/app/qa/planning-next-audit-2026-07-22/implementation/09-day-fixed.png`–`30-week-reflect-journal-final.png`.
- Każdy kluczowy ekran źródłowy i odpowiadający mu ekran produkcyjny został ponownie oceniony w jednym wejściu porównawczym przy 1280 × 720.

## Naprawione rozbieżności

- Dzień: przywrócono pełną planszę dużych skrótów, właściwe miękkie pola ikon, układ kategorii 3 × 3, pas priorytetów oraz dolny pas trendów; lewy rail zachowuje realne akcje i dane planu.
- Tydzień: dodano brakujący wykres dwóch serii Wysiłek/Stan dla czterech obszarów, stany braku danych, siedem prawdziwych dni i właściwe pasy priorytetów oraz obiektów.
- Miesiąc: odbudowano pięciowymiarowy kompas ocen, osobne wykresy Wysiłek/Stan dla tygodni, priorytety miesiąca i prawidłową hierarchię trzech pasów obiektów; stan przeszłego miesiąca potwierdza realne zapisane oceny.
- Rok: ujednolicono anatomię z pozostałymi skalami, zachowując dwanaście miesięcy, priorytety i kontekst ujawniany na żądanie.
- Plan tygodnia: Fokus, Rytm i Przegląd odpowiadają ekranom Labu i nadal zapisują wybór, targety oraz dni przez istniejące serwisy.
- Refleksja tygodnia: komplet ośmiu kroków mieści się w railu bez ucinania; fakty, przegląd obiektów, cztery obszary, kotwice i dziennik korzystają z istniejącego composable oraz repozytoriów.
- Plan miesiąca: Kierunki, Wsparcie, Tygodnie i Przegląd mają odtworzoną anatomię Labu i pracują na realnych priorytetach, aktywacjach i macierzy tygodni.
- Refleksja miesiąca: Priorytety, Kompas, Kotwice i Dziennik zachowują rzeczywiste oceny, werdykty, notatki i zapis.
- Dzienniki obu refleksji ponownie używają produkcyjnego panelu kontekstu z podsumowaniem AI, pytaniami AI, szybkimi wstawkami, ocenami, emocjami i kotwicami. AI pozostaje opt-in i korzysta z istniejącego dostawcy; nie powstała atrapa Labu.

## Interakcje, dostępność i dane

- Nowe rytuały są rozdzielane przez `NextRitualHost` na cztery osobne renderery, a rytuał roczny pozostaje pod istniejącym wizardem.
- Wykresy mają opisy dostępności, brak danych nie jest prezentowany jako zero, a znaczenie Wysiłek/Stan nie zależy wyłącznie od koloru.
- Widoki i rytuały nie odwołują się bezpośrednio do Dexie; używają istniejących zapytań, composables i mutacji.
- W przeglądarce nie wystąpił błąd runtime ani overlay Vite. Wszystkie sprawdzane ekrany mieszczą się w referencyjnym dokumencie 1280 × 720, a wewnętrzne listy przewijają się bez przesuwania całej strony.

## Bramki jakości

- Główny Vitest: 194 pliki, 2035 testów zaliczonych, 1 pominięty.
- Testy Planning Next po ostatniej korekcie: 3 pliki, 13 testów zaliczonych, w tym dispatch rytuałów, ośmiokrokowa ścieżka i osobna akcja „Zapisz i planuj kolejny tydzień”.
- UX Lab: 2 pliki, 26 testów zaliczonych.
- Root typecheck i build, Lab build/typecheck/boundary guard, design-system guard oraz zgodność wszystkich 28 par plików lokalizacji przechodzą.

## Wynik porównania

Nie pozostaje żaden istotny problem P0, P1 ani P2. Różnice treści i liczebności kart wynikają z realnego zestawu danych produkcyjnych zamiast fixture'ów UX Labu; anatomia, hierarchia, stany i interakcje są zgodne.

final result: passed

---

# Planning Next — finalna korekta pól ikon, wykresów obiektów i osi okresów

## Dowody porównawcze 1280 × 720

- Dzień, pola ikon: źródło `ux-lab/app/qa/planning-next-audit-2026-07-22/source/01-day.png`, implementacja `ux-lab/app/qa/planning-next-audit-2026-07-22/implementation/31-day-icon-fields.jpg`.
- Dzień, wykresy kart: źródło `ux-lab/audit/today/blue-dot-v3/05-expanded-final.png`, implementacja `ux-lab/app/qa/planning-next-audit-2026-07-22/implementation/32-day-object-charts.jpg`.
- Tydzień, wykresy kart: źródło `ux-lab/app/qa/planning-next-audit-2026-07-22/source/10-week-object-charts.jpg`, implementacja `ux-lab/app/qa/planning-next-audit-2026-07-22/implementation/38-week-object-charts-final.jpg`.
- Miesiąc, plansza i rail: źródło `ux-lab/app/qa/planning-next-audit-2026-07-22/source/03-month.png`, implementacja `ux-lab/app/qa/planning-next-audit-2026-07-22/implementation/39-month-fields-priorities-final.jpg`.
- Miesiąc, wykresy kart: źródło `ux-lab/app/qa/planning-next-audit-2026-07-22/source/09-month-object-charts.jpg`, implementacja `ux-lab/app/qa/planning-next-audit-2026-07-22/implementation/35-month-object-charts.jpg`.
- Każdą parę źródło/implementacja oceniono razem, aby porównać anatomię, proporcje, wysokości, podpisy i zachowanie kart.

## Naprawione rozbieżności

- Pola głównych ikon mają organiczne, nieregularne kształty z systemu designu, a ikony zostały powiększone do 52 px.
- Priorytety miesiąca używają właściwych ikon i rzeczywistych ocen wysiłku w skali `/5`.
- Dzień, Tydzień i Miesiąc współdzielą cztery gramatyki wykresów kart: kropki wykonania, słupki licznika, linię wartości z echem i celem oraz zakres całego miesiąca.
- Wykresy korzystają z realnych agregacji i rozróżniają wykonanie, brak wykonania, przyszłość, punkt końcowy oraz cel; karty nie powodują poziomego przepełnienia.
- W Miesiącu podpisy wymiarów są stale widoczne tylko pod ocenami miesiąca. W wykresach tygodni pojawiają się wyłącznie przy hoverze lub focusie, a większa wysokość uwidacznia różnice ocen.
- W Tygodniu pod kolumnami ocen pozostają same podpisy bez ikon. Karty dni pokazują nazwę dnia tygodnia i datę w jednym wierszu, a nagłówek okresu ma naturalny format.
- Skróty w szczegółach Dnia zachowują układ 3 × 3 z projektu.

## Dostępność i zachowanie

- Wykresy mają etykiety dostępności, a znaczenie nie jest przekazywane wyłącznie kolorem.
- Focus jest widoczny, a przejścia etykiet respektują `prefers-reduced-motion`.
- Dokument zachowuje szerokość 1280 px bez poziomego przepełnienia; dłuższa zawartość przewija się wewnątrz workspace'u.

## Bramki jakości

- Główny Vitest: 195 plików, 2038 testów zaliczonych, 1 pominięty.
- Testy Planning Next: 4 pliki, 16 testów zaliczonych, w tym wszystkie warianty wykresów kart.
- UX Lab: 2 pliki, 26 testów zaliczonych; kontrola granic importów przechodzi.
- Root i UX Lab: typecheck oraz build przechodzą; zielone są także design-system guard i zgodność 28 par plików lokalizacji.
- Kontrola w przeglądarce nie wykazała błędów runtime ani overlayu Vite.

## Wynik

Nie pozostaje żaden istotny problem P0, P1 ani P2 w porównywanym zakresie. Różnice treści kart wynikają wyłącznie z użycia realnych danych produkcyjnych zamiast fixture'ów UX Labu.

final result: passed
