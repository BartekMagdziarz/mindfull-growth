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
    momentKind: 'anger',
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
      { exerciseSlug: 'moment-anger', everyDays: 1, startsAfterStep: 0, introKey: 'programs.anger-signal.practices.moment-anger.intro' },
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
  // ── Ze wstydu do współczucia (problem path, 8 weeks + Powrót, content v3) ──
  // v3 (2026-10-04): phases = weeks (w1…w8) plus a follow-up phase; the
  // compass reactions become IFS parts; FSCRS alongside SCS-SF (start ·
  // połowa · koniec · powrót); safe place and resistances before the first
  // inward practice; the compassionate self; a mid-path dose check; fierce
  // self-compassion; writing after a moment; a letter to the future self;
  // the path closes on the maintenance plan and "Powrót" follows 56 days
  // later. Plan: ideas/html-plans/2026-10-04-shame-path-v3.html. Older
  // enrollments are re-mapped by `programContentMigration` (legacy v1, v2).
  {
    slug: 'shame-compassion',
    i18nKey: 'programs.shame-compassion',
    icon: 'mg-exercise-compassionate-image',
    estimatedWeeks: 8,
    contentVersion: 3,
    momentKind: 'shame',
    outcomeSlug: 'scs-sf',
    outcomeSlugs: ['scs-sf', 'fscrs'],
    signSlug: 'my-sign',
    weeklyReflection: true,
    steps: [
      { exerciseSlug: 'scs-sf', minGapDays: 0, introKey: 'programs.shame-compassion.steps.step1.intro' },
      { exerciseSlug: 'fscrs', minGapDays: 0, introKey: 'programs.shame-compassion.steps.step2.intro' },
      { exerciseSlug: 'shame-map', minGapDays: 1, introKey: 'programs.shame-compassion.steps.step3.intro' },
      { exerciseSlug: 'my-sign', minGapDays: 1, introKey: 'programs.shame-compassion.steps.step4.intro' },
      { exerciseSlug: 'safe-place', minGapDays: 3, introKey: 'programs.shame-compassion.steps.step5.intro' },
      { exerciseSlug: 'compassionate-image', minGapDays: 2, introKey: 'programs.shame-compassion.steps.step6.intro' },
      { exerciseSlug: 'compassionate-self', minGapDays: 2, introKey: 'programs.shame-compassion.steps.step7.intro' },
      { exerciseSlug: 'shame-response', minGapDays: 3, introKey: 'programs.shame-compassion.steps.step8.intro' },
      { exerciseSlug: 'shame-or-guilt', minGapDays: 3, introKey: 'programs.shame-compassion.steps.step9.intro' },
      { exerciseSlug: 'thought-record', minGapDays: 4, introKey: 'programs.shame-compassion.steps.step10.intro', startFrom: 'moment' },
      { exerciseSlug: 'scs-sf', minGapDays: 3, introKey: 'programs.shame-compassion.steps.step11.intro' },
      { exerciseSlug: 'dose-check', minGapDays: 0, introKey: 'programs.shame-compassion.steps.step12.intro' },
      { exerciseSlug: 'trailhead', minGapDays: 5, introKey: 'programs.shame-compassion.steps.step13.intro', startFrom: 'moment' },
      { exerciseSlug: 'protector-appreciation', minGapDays: 3, introKey: 'programs.shame-compassion.steps.step14.intro', launchQuery: { partTag: 'shame-compass:attackSelf' } },
      { exerciseSlug: 'direct-access', minGapDays: 2, introKey: 'programs.shame-compassion.steps.step15.intro', optional: true, launchQuery: { partTag: 'shame-compass:attackSelf' } },
      { exerciseSlug: 'compassionate-letter', minGapDays: 3, introKey: 'programs.shame-compassion.steps.step16.intro', startFrom: 'moment' },
      { exerciseSlug: 'defender-voice', minGapDays: 3, introKey: 'programs.shame-compassion.steps.step17.intro' },
      { exerciseSlug: 'core-beliefs', minGapDays: 4, introKey: 'programs.shame-compassion.steps.step18.intro', startFrom: 'fairDemand' },
      { exerciseSlug: 'behavioral-experiment', minGapDays: 3, introKey: 'programs.shame-compassion.steps.step19.intro' },
      { exerciseSlug: 'exile-witnessing', minGapDays: 2, introKey: 'programs.shame-compassion.steps.step20.intro', optional: true },
      { exerciseSlug: 'scs-sf', minGapDays: 4, introKey: 'programs.shame-compassion.steps.step21.intro' },
      { exerciseSlug: 'fscrs', minGapDays: 0, introKey: 'programs.shame-compassion.steps.step22.intro' },
      { exerciseSlug: 'letter-to-future-self', minGapDays: 2, introKey: 'programs.shame-compassion.steps.step23.intro' },
      { exerciseSlug: 'maintenance-plan', minGapDays: 1, introKey: 'programs.shame-compassion.steps.step24.intro', closesPath: true },
      { exerciseSlug: 'scs-sf', minGapDays: 56, introKey: 'programs.shame-compassion.steps.step25.intro', afterCompletion: true },
      { exerciseSlug: 'fscrs', minGapDays: 0, introKey: 'programs.shame-compassion.steps.step26.intro', afterCompletion: true },
      { exerciseSlug: 'path-return', minGapDays: 0, introKey: 'programs.shame-compassion.steps.step27.intro', afterCompletion: true },
    ],
    phases: [
      { key: 'w1', fromStepIndex: 0, week: 1 },
      { key: 'w2', fromStepIndex: 4, week: 2 },
      { key: 'w3', fromStepIndex: 7, week: 3 },
      { key: 'w4', fromStepIndex: 9, week: 4 },
      { key: 'w5', fromStepIndex: 12, week: 5 },
      { key: 'w6', fromStepIndex: 15, week: 6 },
      { key: 'w7', fromStepIndex: 17, week: 7 },
      { key: 'w8', fromStepIndex: 20, week: 8 },
      { key: 'return', fromStepIndex: 24 },
    ],
    // Never more than two at once: breath → breath + Momenty → Momenty +
    // break → break + writing → break + positive data (plan §1.4).
    practices: [
      { exerciseSlug: 'paced-breathing', everyDays: 1, endsAfterStep: 6, introKey: 'programs.shame-compassion.practices.paced-breathing.intro' },
      { exerciseSlug: 'moment-shame', everyDays: 2, startsAfterStep: 2, endsAfterStep: 13, introKey: 'programs.shame-compassion.practices.moment-shame.intro' },
      { exerciseSlug: 'self-compassion-break', everyDays: 2, startsAfterStep: 6, endsAfterStep: 23, introKey: 'programs.shame-compassion.practices.self-compassion-break.intro' },
      { exerciseSlug: 'shame-writing', everyDays: 2, startsAfterStep: 14, endsAfterStep: 16, introKey: 'programs.shame-compassion.practices.shame-writing.intro' },
      { exerciseSlug: 'positive-data-log', everyDays: 2, startsAfterStep: 17, endsAfterStep: 23, introKey: 'programs.shame-compassion.practices.positive-data-log.intro' },
    ],
    // 2–3 per week (the planning ritual offers a choice); `linkSlug` is the
    // exercise whose completion counts as a day of the task.
    weeklyTasks: [
      { key: 'nameShame', phaseKey: 'w1', entryMode: 'counter', times: 3, linkSlug: 'moment-shame' },
      { key: 'catchBody', phaseKey: 'w1', entryMode: 'counter', times: 3, linkSlug: 'moment-shame' },
      { key: 'soothingGesture', phaseKey: 'w2', entryMode: 'counter', times: 3, linkSlug: 'moment-shame' },
      { key: 'receiveKindness', phaseKey: 'w2', entryMode: 'counter', times: 2 },
      { key: 'kindAct', phaseKey: 'w2', entryMode: 'counter', times: 2, linkSlug: 'moment-shame' },
      { key: 'useResponse', phaseKey: 'w3', entryMode: 'counter', times: 3, linkSlug: 'moment-shame' },
      { key: 'unblendSay', phaseKey: 'w3', entryMode: 'counter', times: 3, linkSlug: 'moment-shame' },
      { key: 'friendTest', phaseKey: 'w3', entryMode: 'counter', times: 3, linkSlug: 'moment-shame' },
      { key: 'stayLonger', phaseKey: 'w4', entryMode: 'counter', times: 2, linkSlug: 'moment-shame' },
      { key: 'repairGuilt', phaseKey: 'w4', entryMode: 'completion', times: 1, linkSlug: 'moment-shame' },
      { key: 'noticeCritic', phaseKey: 'w5', entryMode: 'counter', times: 3, linkSlug: 'moment-shame' },
      { key: 'handOver', phaseKey: 'w5', entryMode: 'counter', times: 2, linkSlug: 'moment-shame' },
      { key: 'sayNo', phaseKey: 'w6', entryMode: 'completion', times: 1 },
      { key: 'readAloud', phaseKey: 'w6', entryMode: 'counter', times: 2 },
      { key: 'defendSelf', phaseKey: 'w6', entryMode: 'counter', times: 2, linkSlug: 'moment-shame' },
      { key: 'collectEvidence', phaseKey: 'w7', entryMode: 'counter', times: 3, linkSlug: 'positive-data-log' },
      { key: 'breakDemand', phaseKey: 'w7', entryMode: 'completion', times: 1, linkSlug: 'behavioral-experiment' },
      { key: 'tellSafePerson', phaseKey: 'w7', entryMode: 'completion', times: 1, linkSlug: 'moment-shame' },
      { key: 'showImperfect', phaseKey: 'w7', entryMode: 'completion', times: 1, linkSlug: 'moment-shame' },
      { key: 'askQuestion', phaseKey: 'w7', entryMode: 'counter', times: 2, linkSlug: 'moment-shame' },
      { key: 'keepResponse', phaseKey: 'w8', entryMode: 'counter', times: 3, linkSlug: 'moment-shame' },
      { key: 'askSupport', phaseKey: 'w8', entryMode: 'completion', times: 1, linkSlug: 'moment-shame' },
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
