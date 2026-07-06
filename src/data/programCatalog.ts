/**
 * Program Catalog ("ścieżki")
 *
 * Static, code-defined program sequences built entirely from existing
 * catalog exercises (no new content). Content versions with code, like
 * `exerciseCatalog.ts`. Copy lives in `src/locales/{en,pl}/programs.json`
 * under `programs.<slug>`.
 *
 * Gap math: `eligibleDay(step) = day(anchor) + minGapDays`, where the
 * anchor is the previous step's completion (enrollment start for step 0)
 * — see `programSchedulerService.eligibleDayForStep`.
 *
 * Design: docs/exercise-scheduling-design.md §4.5.
 */

import type { ProgramDefinition } from '@/domain/program'

export const PROGRAM_CATALOG: readonly ProgramDefinition[] = [
  // ── Poznaj swoje części (IFS, ~4 weeks) ─────────────────────────────
  {
    slug: 'ifs-parts',
    i18nKey: 'programs.ifs-parts',
    icon: 'diversity_2',
    estimatedWeeks: 4,
    steps: [
      { exerciseSlug: 'parts-mapping', minGapDays: 0, introKey: 'programs.ifs-parts.steps.step1.intro' },
      { exerciseSlug: 'unblending', minGapDays: 3, introKey: 'programs.ifs-parts.steps.step2.intro' },
      { exerciseSlug: 'trailhead', minGapDays: 4, introKey: 'programs.ifs-parts.steps.step3.intro' },
      { exerciseSlug: 'protector-appreciation', minGapDays: 4, introKey: 'programs.ifs-parts.steps.step4.intro' },
      { exerciseSlug: 'exile-witnessing', minGapDays: 5, introKey: 'programs.ifs-parts.steps.step5.intro' },
      { exerciseSlug: 'self-energy', minGapDays: 4, introKey: 'programs.ifs-parts.steps.step6.intro' },
      { exerciseSlug: 'parts-dialogue', minGapDays: 4, introKey: 'programs.ifs-parts.steps.step7.intro' },
    ],
  },
  // ── Fundament samopoznania ──────────────────────────────────────────
  // One step per foundation coverage group, in FOUNDATION_GROUP_ORDER
  // (each group's FOUNDATION_GROUP_MIN_REQUIRED is 1, so completing the
  // path unlocks the foundation build — the finale below).
  {
    slug: 'foundation',
    i18nKey: 'programs.foundation',
    icon: 'foundation',
    estimatedWeeks: 2,
    finaleRouteName: 'profile-psychological-build',
    steps: [
      { exerciseSlug: 'values', minGapDays: 0, introKey: 'programs.foundation.steps.step1.intro' },
      { exerciseSlug: 'purpose', minGapDays: 2, introKey: 'programs.foundation.steps.step2.intro' },
      { exerciseSlug: 'ipip-bfm-50', minGapDays: 2, introKey: 'programs.foundation.steps.step3.intro' },
      { exerciseSlug: 'erq', minGapDays: 2, introKey: 'programs.foundation.steps.step4.intro' },
      { exerciseSlug: 'ecr-rs', minGapDays: 2, introKey: 'programs.foundation.steps.step5.intro' },
      { exerciseSlug: 'wheel-of-life', minGapDays: 2, introKey: 'programs.foundation.steps.step6.intro' },
    ],
  },
  // ── CBT: myśli pod lupą ─────────────────────────────────────────────
  {
    slug: 'cbt-thoughts',
    i18nKey: 'programs.cbt-thoughts',
    icon: 'psychology',
    estimatedWeeks: 2,
    steps: [
      { exerciseSlug: 'cognitive-distortions', minGapDays: 0, introKey: 'programs.cbt-thoughts.steps.step1.intro' },
      { exerciseSlug: 'thought-record', minGapDays: 2, introKey: 'programs.cbt-thoughts.steps.step2.intro' },
      { exerciseSlug: 'thought-record', minGapDays: 2, introKey: 'programs.cbt-thoughts.steps.step3.intro' },
      { exerciseSlug: 'thought-record', minGapDays: 2, optional: true, introKey: 'programs.cbt-thoughts.steps.step4.intro' },
      { exerciseSlug: 'core-beliefs', minGapDays: 3, introKey: 'programs.cbt-thoughts.steps.step5.intro' },
    ],
  },
]

export function getProgramDefinition(slug: string): ProgramDefinition | undefined {
  return PROGRAM_CATALOG.find((program) => program.slug === slug)
}
