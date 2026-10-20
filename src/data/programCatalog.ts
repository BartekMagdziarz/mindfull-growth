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
  // ── Złość jako sygnał (problem path, 6 weeks + Powrót, content v2) ──
  // v2 (2026-10-18, plan ideas/html-plans/2026-10-18-anger-anxiety-paths-v2.html):
  // phases = weeks (w1…w6) plus Powrót; "Mój znak"; the barometer halfway
  // with a dose check; the letter for a worse day; the path closes on the
  // maintenance plan and Powrót follows 56 days later; Momenty every other
  // day with the anger reaction family; tasks 2–3 per week counted from the
  // Moments' own moves. v1 enrollments are re-mapped by `programContentMigration`.
  {
    slug: 'anger-signal',
    i18nKey: 'programs.anger-signal',
    icon: 'mg-exercise-anger-barometer',
    estimatedWeeks: 6,
    contentVersion: 2,
    momentKind: 'anger',
    outcomeSlug: 'anger-barometer',
    outcomeSlugs: ['anger-barometer'],
    signSlug: 'my-sign',
    weeklyReflection: true,
    steps: [
      { exerciseSlug: 'anger-barometer', minGapDays: 0, introKey: 'programs.anger-signal.steps.step1.intro' },
      { exerciseSlug: 'anger-map', minGapDays: 1, introKey: 'programs.anger-signal.steps.step2.intro' },
      { exerciseSlug: 'my-sign', minGapDays: 1, introKey: 'programs.anger-signal.steps.step3.intro', launchQuery: { kind: 'anger' } },
      { exerciseSlug: 'pause-plan', minGapDays: 2, introKey: 'programs.anger-signal.steps.step4.intro' },
      { exerciseSlug: 'cognitive-distortions', minGapDays: 3, introKey: 'programs.anger-signal.steps.step5.intro' },
      { exerciseSlug: 'thought-record', minGapDays: 3, introKey: 'programs.anger-signal.steps.step6.intro', startFrom: 'moment' },
      { exerciseSlug: 'anger-barometer', minGapDays: 3, introKey: 'programs.anger-signal.steps.step7.intro' },
      { exerciseSlug: 'dose-check', minGapDays: 0, introKey: 'programs.anger-signal.steps.step8.intro', launchQuery: { kind: 'anger' } },
      // The part met at the trailhead is tagged for the path, so "Co próbuje chronić" finds it.
      { exerciseSlug: 'trailhead', minGapDays: 3, introKey: 'programs.anger-signal.steps.step9.intro', startFrom: 'moment', launchQuery: { tagPart: 'program:anger-signal' } },
      { exerciseSlug: 'protector-appreciation', minGapDays: 3, introKey: 'programs.anger-signal.steps.step10.intro', launchQuery: { partTag: 'program:anger-signal' } },
      { exerciseSlug: 'need-behind-anger', minGapDays: 2, introKey: 'programs.anger-signal.steps.step11.intro', startFrom: 'moment', momentPrefill: { observation: 'situation' } },
      { exerciseSlug: 'structured-problem-solving', minGapDays: 3, introKey: 'programs.anger-signal.steps.step12.intro' },
      { exerciseSlug: 'behavioral-experiment', minGapDays: 3, introKey: 'programs.anger-signal.steps.step13.intro' },
      { exerciseSlug: 'compassionate-letter', minGapDays: 3, optional: true, introKey: 'programs.anger-signal.steps.step14.intro', startFrom: 'moment' },
      { exerciseSlug: 'anger-barometer', minGapDays: 4, introKey: 'programs.anger-signal.steps.step15.intro' },
      { exerciseSlug: 'letter-to-future-self', minGapDays: 0, introKey: 'programs.anger-signal.steps.step16.intro', launchQuery: { kind: 'anger' } },
      { exerciseSlug: 'maintenance-plan', minGapDays: 1, introKey: 'programs.anger-signal.steps.step17.intro', closesPath: true },
      { exerciseSlug: 'anger-barometer', minGapDays: 56, introKey: 'programs.anger-signal.steps.step18.intro', afterCompletion: true },
      { exerciseSlug: 'path-return', minGapDays: 0, introKey: 'programs.anger-signal.steps.step19.intro', afterCompletion: true, launchQuery: { kind: 'anger' } },
    ],
    phases: [
      { key: 'w1', fromStepIndex: 0, week: 1 },
      { key: 'w2', fromStepIndex: 3, week: 2 },
      { key: 'w3', fromStepIndex: 5, week: 3 },
      { key: 'w4', fromStepIndex: 8, week: 4 },
      { key: 'w5', fromStepIndex: 11, week: 5 },
      { key: 'w6', fromStepIndex: 13, week: 6 },
      { key: 'return', fromStepIndex: 17 },
    ],
    // Never more than two at once: breath + Momenty until the dose check, then Momenty alone until the letter.
    practices: [
      { exerciseSlug: 'paced-breathing', everyDays: 2, endsAfterStep: 7, introKey: 'programs.anger-signal.practices.paced-breathing.intro' },
      { exerciseSlug: 'moment-anger', everyDays: 2, startsAfterStep: 1, endsAfterStep: 13, introKey: 'programs.anger-signal.practices.moment-anger.intro' },
    ],
    // 2–3 per week; a task counts a day only when the Moment says the move happened (`countRule`).
    weeklyTasks: [
      { key: 'noticeSigns', phaseKey: 'w1', entryMode: 'counter', times: 3, linkSlug: 'moment-anger', countRule: { options: ['named'] } },
      { key: 'noticeCost', phaseKey: 'w1', entryMode: 'counter', times: 2, linkSlug: 'moment-anger', countRule: { any: true } },
      { key: 'pauseInConversation', phaseKey: 'w2', entryMode: 'counter', times: 2, linkSlug: 'moment-anger', countRule: { options: ['pause'] } },
      { key: 'announceReturn', phaseKey: 'w2', entryMode: 'completion', times: 1, linkSlug: 'moment-anger', countRule: { options: ['announce'] } },
      { key: 'breathBefore', phaseKey: 'w2', entryMode: 'counter', times: 3, linkSlug: 'moment-anger', countRule: { options: ['breath'] } },
      { key: 'altThought', phaseKey: 'w3', entryMode: 'counter', times: 2, linkSlug: 'moment-anger', countRule: { options: ['altThought'] } },
      { key: 'factOnly', phaseKey: 'w3', entryMode: 'counter', times: 2, linkSlug: 'moment-anger', countRule: { options: ['named', 'altThought'] } },
      { key: 'requestNotReproach', phaseKey: 'w4', entryMode: 'counter', times: 2, linkSlug: 'moment-anger', countRule: { options: ['request'] } },
      { key: 'nameNeed', phaseKey: 'w4', entryMode: 'counter', times: 3, linkSlug: 'moment-anger', countRule: { options: ['need'] } },
      { key: 'returnToTalk', phaseKey: 'w4', entryMode: 'completion', times: 1, linkSlug: 'moment-anger', countRule: { options: ['returned'] } },
      { key: 'applySolution', phaseKey: 'w5', entryMode: 'completion', times: 1, linkSlug: 'moment-anger', countRule: { options: ['step'] } },
      { key: 'calmRequest', phaseKey: 'w5', entryMode: 'completion', times: 1, linkSlug: 'moment-anger', countRule: { options: ['request'] } },
      { key: 'sayNoCalmly', phaseKey: 'w5', entryMode: 'completion', times: 1, linkSlug: 'moment-anger', countRule: { options: ['request', 'pause'] } },
      { key: 'repairRelationship', phaseKey: 'w6', entryMode: 'completion', times: 1, linkSlug: 'moment-anger', countRule: { options: ['repair'] } },
      { key: 'keepPause', phaseKey: 'w6', entryMode: 'counter', times: 3, linkSlug: 'moment-anger', countRule: { any: true } },
    ],
  },
  // ── Lęk: podejść zamiast unikać (problem path, 8 weeks + Powrót, content v2) ──
  // v2 (2026-10-18, same plan): phases = weeks (w1…w8) plus Powrót; "Mój
  // znak"; GAD-7 halfway with a dose check; IUS-12 at the start and the end
  // (both optional); the experiment starts from a Moment's prediction; the
  // letter; the close on the maintenance plan and Powrót 56 days later;
  // Momenty every other day with the anxiety reaction family.
  {
    slug: 'anxiety-approach',
    momentKind: 'anxiety',
    i18nKey: 'programs.anxiety-approach',
    icon: 'mg-exercise-anxiety-map',
    estimatedWeeks: 8,
    contentVersion: 2,
    outcomeSlug: 'gad-7',
    outcomeSlugs: ['gad-7', 'ius-12'],
    signSlug: 'my-sign',
    weeklyReflection: true,
    steps: [
      { exerciseSlug: 'gad-7', minGapDays: 0, introKey: 'programs.anxiety-approach.steps.step1.intro' },
      { exerciseSlug: 'ius-12', minGapDays: 0, optional: true, introKey: 'programs.anxiety-approach.steps.step2.intro' },
      { exerciseSlug: 'anxiety-map', minGapDays: 1, introKey: 'programs.anxiety-approach.steps.step3.intro' },
      { exerciseSlug: 'my-sign', minGapDays: 1, introKey: 'programs.anxiety-approach.steps.step4.intro', launchQuery: { kind: 'anxiety' } },
      { exerciseSlug: 'worry-tree', minGapDays: 2, introKey: 'programs.anxiety-approach.steps.step5.intro' },
      { exerciseSlug: 'cognitive-distortions', minGapDays: 3, introKey: 'programs.anxiety-approach.steps.step6.intro' },
      { exerciseSlug: 'thought-record', minGapDays: 3, introKey: 'programs.anxiety-approach.steps.step7.intro', startFrom: 'moment' },
      { exerciseSlug: 'behavioral-experiment', minGapDays: 3, introKey: 'programs.anxiety-approach.steps.step8.intro', startFrom: 'moment' },
      { exerciseSlug: 'structured-problem-solving', minGapDays: 3, introKey: 'programs.anxiety-approach.steps.step9.intro' },
      { exerciseSlug: 'gad-7', minGapDays: 3, introKey: 'programs.anxiety-approach.steps.step10.intro' },
      { exerciseSlug: 'dose-check', minGapDays: 0, introKey: 'programs.anxiety-approach.steps.step11.intro', launchQuery: { kind: 'anxiety' } },
      { exerciseSlug: 'graded-exposure', minGapDays: 4, introKey: 'programs.anxiety-approach.steps.step12.intro' },
      { exerciseSlug: 'graded-exposure', minGapDays: 7, continueLatest: true, introKey: 'programs.anxiety-approach.steps.step13.intro' },
      { exerciseSlug: 'paradoxical-intention', minGapDays: 4, optional: true, introKey: 'programs.anxiety-approach.steps.step14.intro' },
      { exerciseSlug: 'dereflection', minGapDays: 3, optional: true, introKey: 'programs.anxiety-approach.steps.step15.intro' },
      { exerciseSlug: 'behavioral-activation', minGapDays: 3, optional: true, introKey: 'programs.anxiety-approach.steps.step16.intro' },
      { exerciseSlug: 'gad-7', minGapDays: 4, introKey: 'programs.anxiety-approach.steps.step17.intro' },
      { exerciseSlug: 'ius-12', minGapDays: 0, optional: true, introKey: 'programs.anxiety-approach.steps.step18.intro' },
      { exerciseSlug: 'letter-to-future-self', minGapDays: 0, introKey: 'programs.anxiety-approach.steps.step19.intro', launchQuery: { kind: 'anxiety' } },
      { exerciseSlug: 'maintenance-plan', minGapDays: 1, introKey: 'programs.anxiety-approach.steps.step20.intro', closesPath: true },
      { exerciseSlug: 'gad-7', minGapDays: 56, introKey: 'programs.anxiety-approach.steps.step21.intro', afterCompletion: true },
      { exerciseSlug: 'path-return', minGapDays: 0, introKey: 'programs.anxiety-approach.steps.step22.intro', afterCompletion: true, launchQuery: { kind: 'anxiety' } },
    ],
    phases: [
      { key: 'w1', fromStepIndex: 0, week: 1 },
      { key: 'w2', fromStepIndex: 4, week: 2 },
      { key: 'w3', fromStepIndex: 6, week: 3 },
      { key: 'w4', fromStepIndex: 8, week: 4 },
      { key: 'w5', fromStepIndex: 11, week: 5 },
      { key: 'w6', fromStepIndex: 12, week: 6 },
      { key: 'w7', fromStepIndex: 14, week: 7 },
      { key: 'w8', fromStepIndex: 16, week: 8 },
      { key: 'return', fromStepIndex: 20 },
    ],
    // Never more than two at once: breath + Momenty until the worry tree,
    // then the daily worry time + Momenty until the second exposure, then
    // Momenty alone. (The breath cannot return later: one window per slug.)
    practices: [
      { exerciseSlug: 'paced-breathing', everyDays: 2, endsAfterStep: 4, introKey: 'programs.anxiety-approach.practices.paced-breathing.intro' },
      { exerciseSlug: 'moment-anxiety', everyDays: 2, startsAfterStep: 2, endsAfterStep: 15, introKey: 'programs.anxiety-approach.practices.moment-anxiety.intro' },
      { exerciseSlug: 'worry-postponement', everyDays: 1, startsAfterStep: 4, endsAfterStep: 12, introKey: 'programs.anxiety-approach.practices.worry-postponement.intro' },
    ],
    weeklyTasks: [
      { key: 'noticeAvoidance', phaseKey: 'w1', entryMode: 'counter', times: 3, linkSlug: 'moment-anxiety', countRule: { options: ['named'] } },
      { key: 'noticeUrge', phaseKey: 'w1', entryMode: 'counter', times: 2, linkSlug: 'moment-anxiety', countRule: { options: ['named'], part: 'check' } },
      { key: 'postponeWorry', phaseKey: 'w2', entryMode: 'counter', times: 3, linkSlug: 'worry-postponement' },
      { key: 'sortWorry', phaseKey: 'w2', entryMode: 'counter', times: 2, linkSlug: 'moment-anxiety', countRule: { options: ['postponed', 'step'] } },
      { key: 'predictionCheck', phaseKey: 'w3', entryMode: 'counter', times: 2, linkSlug: 'moment-anxiety', countRule: { options: ['prediction'] } },
      { key: 'uncertainDecisions', phaseKey: 'w3', entryMode: 'counter', times: 3, linkSlug: 'moment-anxiety', countRule: { options: ['noCheck'] } },
      { key: 'firstStep', phaseKey: 'w4', entryMode: 'completion', times: 1, linkSlug: 'moment-anxiety', countRule: { options: ['step'] } },
      { key: 'leaveOneUnknown', phaseKey: 'w4', entryMode: 'counter', times: 2, linkSlug: 'moment-anxiety', countRule: { options: ['noCheck'] } },
      { key: 'exposureLow', phaseKey: 'w5', entryMode: 'counter', times: 2, linkSlug: 'graded-exposure' },
      { key: 'stayAMinute', phaseKey: 'w5', entryMode: 'counter', times: 2, linkSlug: 'moment-anxiety', countRule: { options: ['stayed'] } },
      { key: 'exposureNext', phaseKey: 'w6', entryMode: 'counter', times: 2, linkSlug: 'graded-exposure' },
      { key: 'doItAnyway', phaseKey: 'w6', entryMode: 'counter', times: 2, linkSlug: 'moment-anxiety', countRule: { options: ['anyway'] } },
      { key: 'meaningfulAct', phaseKey: 'w7', entryMode: 'completion', times: 1, linkSlug: 'moment-anxiety', countRule: { options: ['meaningful'] } },
      { key: 'attentionOut', phaseKey: 'w7', entryMode: 'counter', times: 2, linkSlug: 'moment-anxiety', countRule: { options: ['anyway', 'stayed'] } },
      { key: 'planApproach', phaseKey: 'w8', entryMode: 'completion', times: 1 },
      { key: 'keepWorryTime', phaseKey: 'w8', entryMode: 'counter', times: 3, linkSlug: 'worry-postponement' },
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
      { exerciseSlug: 'my-sign', minGapDays: 1, introKey: 'programs.shame-compassion.steps.step4.intro', launchQuery: { kind: 'shame' } },
      { exerciseSlug: 'safe-place', minGapDays: 3, introKey: 'programs.shame-compassion.steps.step5.intro' },
      { exerciseSlug: 'compassionate-image', minGapDays: 2, introKey: 'programs.shame-compassion.steps.step6.intro' },
      { exerciseSlug: 'compassionate-self', minGapDays: 2, introKey: 'programs.shame-compassion.steps.step7.intro' },
      { exerciseSlug: 'shame-response', minGapDays: 3, introKey: 'programs.shame-compassion.steps.step8.intro' },
      { exerciseSlug: 'shame-or-guilt', minGapDays: 3, introKey: 'programs.shame-compassion.steps.step9.intro' },
      { exerciseSlug: 'thought-record', minGapDays: 4, introKey: 'programs.shame-compassion.steps.step10.intro', startFrom: 'moment' },
      { exerciseSlug: 'scs-sf', minGapDays: 3, introKey: 'programs.shame-compassion.steps.step11.intro' },
      { exerciseSlug: 'dose-check', minGapDays: 0, introKey: 'programs.shame-compassion.steps.step12.intro', launchQuery: { kind: 'shame' } },
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
      { exerciseSlug: 'letter-to-future-self', minGapDays: 2, introKey: 'programs.shame-compassion.steps.step23.intro', launchQuery: { kind: 'shame' } },
      { exerciseSlug: 'maintenance-plan', minGapDays: 1, introKey: 'programs.shame-compassion.steps.step24.intro', closesPath: true },
      { exerciseSlug: 'scs-sf', minGapDays: 56, introKey: 'programs.shame-compassion.steps.step25.intro', afterCompletion: true },
      { exerciseSlug: 'fscrs', minGapDays: 0, introKey: 'programs.shame-compassion.steps.step26.intro', afterCompletion: true },
      { exerciseSlug: 'path-return', minGapDays: 0, introKey: 'programs.shame-compassion.steps.step27.intro', afterCompletion: true, launchQuery: { kind: 'shame' } },
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
    // exercise whose completion counts as a day of the task, `countRule`
    // says WHICH Moments count (a Moment with "nic, tym razem" is not a
    // kind act — Lab /concepts/path-week-reflection, 2026-10-11).
    weeklyTasks: [
      { key: 'nameShame', phaseKey: 'w1', entryMode: 'counter', times: 3, linkSlug: 'moment-shame', countRule: { options: ['named'] } },
      { key: 'catchBody', phaseKey: 'w1', entryMode: 'counter', times: 3, linkSlug: 'moment-shame', countRule: { options: ['named'] } },
      { key: 'soothingGesture', phaseKey: 'w2', entryMode: 'counter', times: 3, linkSlug: 'moment-shame', countRule: { options: ['gesture'] } },
      { key: 'receiveKindness', phaseKey: 'w2', entryMode: 'counter', times: 2 },
      { key: 'kindAct', phaseKey: 'w2', entryMode: 'counter', times: 2, linkSlug: 'moment-shame', countRule: { options: ['kindAct'] } },
      { key: 'useResponse', phaseKey: 'w3', entryMode: 'counter', times: 3, linkSlug: 'moment-shame', countRule: { any: true } },
      { key: 'unblendSay', phaseKey: 'w3', entryMode: 'counter', times: 3, linkSlug: 'moment-shame', countRule: { options: ['unblend'] } },
      { key: 'friendTest', phaseKey: 'w3', entryMode: 'counter', times: 3, linkSlug: 'moment-shame', countRule: { options: ['test'] } },
      { key: 'stayLonger', phaseKey: 'w4', entryMode: 'counter', times: 2, linkSlug: 'moment-shame', countRule: { options: ['stayed'] } },
      { key: 'repairGuilt', phaseKey: 'w4', entryMode: 'completion', times: 1, linkSlug: 'moment-shame', countRule: { options: ['repair'] } },
      { key: 'noticeCritic', phaseKey: 'w5', entryMode: 'counter', times: 3, linkSlug: 'moment-shame', countRule: { options: ['named', 'unblend'], part: 'attackSelf' } },
      { key: 'handOver', phaseKey: 'w5', entryMode: 'counter', times: 2, linkSlug: 'moment-shame', countRule: { options: ['thanked'], part: 'attackSelf' } },
      { key: 'sayNo', phaseKey: 'w6', entryMode: 'completion', times: 1 },
      { key: 'readAloud', phaseKey: 'w6', entryMode: 'counter', times: 2 },
      { key: 'defendSelf', phaseKey: 'w6', entryMode: 'counter', times: 2, linkSlug: 'moment-shame', countRule: { options: ['defend'] } },
      { key: 'collectEvidence', phaseKey: 'w7', entryMode: 'counter', times: 3, linkSlug: 'positive-data-log' },
      { key: 'breakDemand', phaseKey: 'w7', entryMode: 'completion', times: 1, linkSlug: 'behavioral-experiment' },
      { key: 'tellSafePerson', phaseKey: 'w7', entryMode: 'completion', times: 1, linkSlug: 'moment-shame', countRule: { options: ['contact'] } },
      { key: 'showImperfect', phaseKey: 'w7', entryMode: 'completion', times: 1, linkSlug: 'moment-shame', countRule: { options: ['contact', 'question'] } },
      { key: 'askQuestion', phaseKey: 'w7', entryMode: 'counter', times: 2, linkSlug: 'moment-shame', countRule: { options: ['question', 'contact'] } },
      { key: 'keepResponse', phaseKey: 'w8', entryMode: 'counter', times: 3, linkSlug: 'moment-shame', countRule: { any: true } },
      { key: 'askSupport', phaseKey: 'w8', entryMode: 'completion', times: 1, linkSlug: 'moment-shame', countRule: { options: ['contact'] } },
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
