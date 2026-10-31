/**
 * Explicit contract of the canonical icon catalogue.
 *
 * The source of truth is `src/design-system/icons/organicIcons.ts`; the Lab
 * serves it as `public/icon-library/catalog.json` through
 * `scripts/export-icons.mjs` (part of `npm run build`). The numbers below are
 * NOT derived from the source: they record what has been approved, so that a
 * new contour cannot slip in by merely changing the array. Raising a count
 * here means listing the new ids in `APPROVED_ADDITIONS` with the date and the
 * decision they come from.
 *
 * History: 320 icons at the 2026-10-05 baseline (spec commit 0eea72cf), 325
 * since 2026-10-20 (commit 9957bbfd: the anxiety-log glyph and the four
 * "form of work" glyphs of the path step tiles, decision 2026-10-17).
 */
export const APPROVED_COLLECTION_COUNTS: Readonly<Record<1 | 2 | 3 | 4, number>> = {
  1: 84, // seed set + drafts (the original organic family)
  2: 36, // additions (parenting, home, …)
  3: 153, // expansion: media, exercises, rituals — 148 at the baseline + 5 below
  4: 52, // wellbeing (phone-free, sleep hygiene, …)
}

export const APPROVED_ICON_COUNT = 325

/** Icons approved after the 320-icon baseline, in catalogue order. */
export const APPROVED_ADDITIONS: ReadonlyArray<{
  id: string
  collection: 1 | 2 | 3 | 4
  approved: string
  reason: string
}> = [
  {
    id: 'exercise-anxiety-log',
    collection: 3,
    approved: '2026-10-20',
    reason: 'anxiety path: the "Dziennik lęku" micro-exercise glyph',
  },
  {
    id: 'form-measure',
    collection: 3,
    approved: '2026-10-20',
    reason: 'path step tile, form of work "Pomiar" (decision 2026-10-17)',
  },
  {
    id: 'form-imagery',
    collection: 3,
    approved: '2026-10-20',
    reason: 'path step tile, form of work "Wyobraźnia" (decision 2026-10-17)',
  },
  {
    id: 'form-reflection',
    collection: 3,
    approved: '2026-10-20',
    reason: 'path step tile, form of work "Namysł" (decision 2026-10-17)',
  },
  {
    id: 'form-action',
    collection: 3,
    approved: '2026-10-20',
    reason: 'path step tile, form of work "Działanie" (decision 2026-10-17)',
  },
]
