/**
 * Program Catalog ("ścieżki")
 *
 * Static, code-defined program sequences built from catalog exercises. Content versions with code, like
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
  // Problem paths (anger · anxiety · shame): steps + parallel practices +
  // weekly real-world tasks, measured before/after by `outcomeSlug`.
  // Plan: ideas/html-plans/2026-09-23-problem-focused-paths.html.
  // ── Złość jako sygnał (problem path, ~6 weeks) ──
  {
    slug: 'anger-signal',
    i18nKey: 'programs.anger-signal',
    icon: 'mg-exercise-anger-barometer',
    estimatedWeeks: 6,
    outcomeSlug: 'anger-barometer',
    weeklyReflection: true,
    steps: [
      { exerciseSlug: 'anger-barometer', minGapDays: 0, introKey: 'programs.anger-signal.steps.step1.intro' },
      { exerciseSlug: 'anger-map', minGapDays: 1, introKey: 'programs.anger-signal.steps.step2.intro' },
      { exerciseSlug: 'pause-plan', minGapDays: 3, introKey: 'programs.anger-signal.steps.step3.intro' },
      { exerciseSlug: 'cognitive-distortions', minGapDays: 3, introKey: 'programs.anger-signal.steps.step4.intro' },
      { exerciseSlug: 'thought-record', minGapDays: 3, introKey: 'programs.anger-signal.steps.step5.intro' },
      { exerciseSlug: 'trailhead', minGapDays: 3, introKey: 'programs.anger-signal.steps.step6.intro' },
      { exerciseSlug: 'protector-appreciation', minGapDays: 3, introKey: 'programs.anger-signal.steps.step7.intro' },
      { exerciseSlug: 'need-behind-anger', minGapDays: 3, introKey: 'programs.anger-signal.steps.step8.intro' },
      { exerciseSlug: 'structured-problem-solving', minGapDays: 3, introKey: 'programs.anger-signal.steps.step9.intro' },
      { exerciseSlug: 'behavioral-experiment', minGapDays: 3, introKey: 'programs.anger-signal.steps.step10.intro' },
      { exerciseSlug: 'compassionate-letter', minGapDays: 3, optional: true, introKey: 'programs.anger-signal.steps.step11.intro' },
      { exerciseSlug: 'anger-barometer', minGapDays: 4, introKey: 'programs.anger-signal.steps.step12.intro' },
      { exerciseSlug: 'maintenance-plan', minGapDays: 0, introKey: 'programs.anger-signal.steps.step13.intro' },
    ],
    phases: [
      { key: 'understanding', fromStepIndex: 0 },
      { key: 'pause', fromStepIndex: 2 },
      { key: 'thoughts', fromStepIndex: 3 },
      { key: 'need', fromStepIndex: 5 },
      { key: 'action', fromStepIndex: 8 },
      { key: 'consolidation', fromStepIndex: 10 },
    ],
    practices: [
      { exerciseSlug: 'anger-log', everyDays: 1, startsAfterStep: 0, introKey: 'programs.anger-signal.practices.anger-log.intro' },
      { exerciseSlug: 'paced-breathing', everyDays: 2, startsAfterStep: 1, introKey: 'programs.anger-signal.practices.paced-breathing.intro' },
    ],
    weeklyTasks: [
      { key: 'noticeSigns', phaseKey: 'understanding', entryMode: 'counter', times: 3 },
      { key: 'pauseInConversation', phaseKey: 'pause', entryMode: 'counter', times: 1 },
      { key: 'altThought', phaseKey: 'thoughts', entryMode: 'counter', times: 2 },
      { key: 'requestNotReproach', phaseKey: 'need', entryMode: 'counter', times: 2 },
      { key: 'applySolution', phaseKey: 'action', entryMode: 'completion', times: 1 },
      { key: 'calmRequest', phaseKey: 'action', entryMode: 'completion', times: 1 },
      { key: 'repairRelationship', phaseKey: 'consolidation', entryMode: 'completion', times: 1 },
    ],
  },
  // ── Lęk: podejść zamiast unikać (problem path, ~8 weeks) ──
  {
    slug: 'anxiety-approach',
    i18nKey: 'programs.anxiety-approach',
    icon: 'mg-exercise-anxiety-map',
    estimatedWeeks: 8,
    outcomeSlug: 'gad-7',
    weeklyReflection: true,
    steps: [
      { exerciseSlug: 'gad-7', minGapDays: 0, introKey: 'programs.anxiety-approach.steps.step1.intro' },
      { exerciseSlug: 'ius-12', minGapDays: 0, optional: true, introKey: 'programs.anxiety-approach.steps.step2.intro' },
      { exerciseSlug: 'anxiety-map', minGapDays: 1, introKey: 'programs.anxiety-approach.steps.step3.intro' },
      { exerciseSlug: 'worry-tree', minGapDays: 2, introKey: 'programs.anxiety-approach.steps.step4.intro' },
      { exerciseSlug: 'cognitive-distortions', minGapDays: 3, introKey: 'programs.anxiety-approach.steps.step5.intro' },
      { exerciseSlug: 'thought-record', minGapDays: 3, introKey: 'programs.anxiety-approach.steps.step6.intro' },
      { exerciseSlug: 'behavioral-experiment', minGapDays: 4, introKey: 'programs.anxiety-approach.steps.step7.intro' },
      { exerciseSlug: 'structured-problem-solving', minGapDays: 3, introKey: 'programs.anxiety-approach.steps.step8.intro' },
      { exerciseSlug: 'graded-exposure', minGapDays: 4, introKey: 'programs.anxiety-approach.steps.step9.intro' },
      { exerciseSlug: 'graded-exposure', minGapDays: 7, continueLatest: true, introKey: 'programs.anxiety-approach.steps.step10.intro' },
      { exerciseSlug: 'paradoxical-intention', minGapDays: 4, optional: true, introKey: 'programs.anxiety-approach.steps.step11.intro' },
      { exerciseSlug: 'dereflection', minGapDays: 3, optional: true, introKey: 'programs.anxiety-approach.steps.step12.intro' },
      { exerciseSlug: 'behavioral-activation', minGapDays: 3, optional: true, introKey: 'programs.anxiety-approach.steps.step13.intro' },
      { exerciseSlug: 'gad-7', minGapDays: 4, introKey: 'programs.anxiety-approach.steps.step14.intro' },
      { exerciseSlug: 'maintenance-plan', minGapDays: 0, introKey: 'programs.anxiety-approach.steps.step15.intro' },
    ],
    phases: [
      { key: 'map', fromStepIndex: 0 },
      { key: 'thoughts', fromStepIndex: 4 },
      { key: 'uncertainty', fromStepIndex: 6 },
      { key: 'problems', fromStepIndex: 7 },
      { key: 'approach', fromStepIndex: 8 },
      { key: 'stance', fromStepIndex: 10 },
      { key: 'consolidation', fromStepIndex: 13 },
    ],
    practices: [
      { exerciseSlug: 'worry-postponement', everyDays: 1, startsAfterStep: 1, endsAfterStep: 8, introKey: 'programs.anxiety-approach.practices.worry-postponement.intro' },
      { exerciseSlug: 'paced-breathing', everyDays: 2, startsAfterStep: 1, introKey: 'programs.anxiety-approach.practices.paced-breathing.intro' },
    ],
    weeklyTasks: [
      { key: 'noticeAvoidance', phaseKey: 'map', entryMode: 'counter', times: 3 },
      { key: 'predictionCheck', phaseKey: 'thoughts', entryMode: 'counter', times: 2 },
      { key: 'uncertainDecisions', phaseKey: 'uncertainty', entryMode: 'counter', times: 3 },
      { key: 'firstStep', phaseKey: 'problems', entryMode: 'completion', times: 1 },
      { key: 'exposureLow', phaseKey: 'approach', entryMode: 'counter', times: 2, linkSlug: 'graded-exposure' },
      { key: 'exposureNext', phaseKey: 'approach', entryMode: 'counter', times: 2, linkSlug: 'graded-exposure' },
      { key: 'meaningfulAct', phaseKey: 'stance', entryMode: 'completion', times: 1 },
      { key: 'planApproach', phaseKey: 'consolidation', entryMode: 'completion', times: 1 },
    ],
  },
  // ── Ze wstydu do współczucia (problem path, ~8 weeks) ──
  {
    slug: 'shame-compassion',
    i18nKey: 'programs.shame-compassion',
    icon: 'mg-exercise-compassionate-image',
    estimatedWeeks: 8,
    outcomeSlug: 'scs-sf',
    weeklyReflection: true,
    steps: [
      { exerciseSlug: 'scs-sf', minGapDays: 0, introKey: 'programs.shame-compassion.steps.step1.intro' },
      { exerciseSlug: 'shame-map', minGapDays: 1, introKey: 'programs.shame-compassion.steps.step2.intro' },
      { exerciseSlug: 'shame-or-guilt', minGapDays: 4, introKey: 'programs.shame-compassion.steps.step3.intro' },
      { exerciseSlug: 'thought-record', minGapDays: 3, introKey: 'programs.shame-compassion.steps.step4.intro' },
      { exerciseSlug: 'trailhead', minGapDays: 4, introKey: 'programs.shame-compassion.steps.step5.intro' },
      { exerciseSlug: 'protector-appreciation', minGapDays: 3, introKey: 'programs.shame-compassion.steps.step6.intro' },
      { exerciseSlug: 'compassionate-image', minGapDays: 4, introKey: 'programs.shame-compassion.steps.step7.intro' },
      { exerciseSlug: 'compassionate-letter', minGapDays: 3, introKey: 'programs.shame-compassion.steps.step8.intro' },
      { exerciseSlug: 'core-beliefs', minGapDays: 4, introKey: 'programs.shame-compassion.steps.step9.intro' },
      { exerciseSlug: 'behavioral-experiment', minGapDays: 5, introKey: 'programs.shame-compassion.steps.step10.intro' },
      { exerciseSlug: 'shadow-beliefs', minGapDays: 4, optional: true, introKey: 'programs.shame-compassion.steps.step11.intro' },
      { exerciseSlug: 'exile-witnessing', minGapDays: 4, optional: true, introKey: 'programs.shame-compassion.steps.step12.intro' },
      { exerciseSlug: 'scs-sf', minGapDays: 4, introKey: 'programs.shame-compassion.steps.step13.intro' },
      { exerciseSlug: 'maintenance-plan', minGapDays: 0, introKey: 'programs.shame-compassion.steps.step14.intro' },
    ],
    phases: [
      { key: 'recognition', fromStepIndex: 0 },
      { key: 'actOrSelf', fromStepIndex: 2 },
      { key: 'critic', fromStepIndex: 4 },
      { key: 'compassion', fromStepIndex: 6 },
      { key: 'beliefs', fromStepIndex: 8 },
      { key: 'outOfHiding', fromStepIndex: 9 },
      { key: 'deeper', fromStepIndex: 10 },
      { key: 'consolidation', fromStepIndex: 12 },
    ],
    practices: [
      { exerciseSlug: 'shame-log', everyDays: 2, startsAfterStep: 0, endsAfterStep: 8, introKey: 'programs.shame-compassion.practices.shame-log.intro' },
      { exerciseSlug: 'paced-breathing', everyDays: 2, startsAfterStep: 1, endsAfterStep: 4, introKey: 'programs.shame-compassion.practices.paced-breathing.intro' },
      { exerciseSlug: 'self-compassion-break', everyDays: 2, startsAfterStep: 4, endsAfterStep: 8, introKey: 'programs.shame-compassion.practices.self-compassion-break.intro' },
      { exerciseSlug: 'positive-data-log', everyDays: 2, startsAfterStep: 8, introKey: 'programs.shame-compassion.practices.positive-data-log.intro' },
    ],
    weeklyTasks: [
      { key: 'nameShame', phaseKey: 'recognition', entryMode: 'counter', times: 3 },
      { key: 'repairGuilt', phaseKey: 'actOrSelf', entryMode: 'completion', times: 1 },
      { key: 'noticeCritic', phaseKey: 'critic', entryMode: 'counter', times: 3 },
      { key: 'kindAct', phaseKey: 'compassion', entryMode: 'counter', times: 2 },
      { key: 'collectEvidence', phaseKey: 'beliefs', entryMode: 'counter', times: 3, linkSlug: 'positive-data-log' },
      { key: 'tellSafePerson', phaseKey: 'outOfHiding', entryMode: 'completion', times: 1 },
      { key: 'showImperfect', phaseKey: 'outOfHiding', entryMode: 'counter', times: 1 },
      { key: 'askSupport', phaseKey: 'consolidation', entryMode: 'completion', times: 1 },
    ],
  },
  // ── Poznaj swoje części (IFS, ~4 weeks) ─────────────────────────────
  {
    slug: 'ifs-parts',
    i18nKey: 'programs.ifs-parts',
    icon: 'diversity_2',
    estimatedWeeks: 4,
    steps: [
      // Protectors first, exiles last and only if their protectors allow it
      // (IFS sequencing). The 8 C's check-in is hygiene, so it comes early.
      { exerciseSlug: 'parts-mapping', minGapDays: 0, introKey: 'programs.ifs-parts.steps.step1.intro' },
      { exerciseSlug: 'unblending', minGapDays: 3, introKey: 'programs.ifs-parts.steps.step2.intro' },
      { exerciseSlug: 'trailhead', minGapDays: 4, introKey: 'programs.ifs-parts.steps.step3.intro' },
      { exerciseSlug: 'self-energy', minGapDays: 2, introKey: 'programs.ifs-parts.steps.step4.intro' },
      { exerciseSlug: 'protector-appreciation', minGapDays: 4, introKey: 'programs.ifs-parts.steps.step5.intro' },
      { exerciseSlug: 'parts-dialogue', minGapDays: 4, introKey: 'programs.ifs-parts.steps.step6.intro' },
      {
        exerciseSlug: 'exile-witnessing',
        minGapDays: 5,
        optional: true,
        introKey: 'programs.ifs-parts.steps.step7.intro',
      },
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
