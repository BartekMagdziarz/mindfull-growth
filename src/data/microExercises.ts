/**
 * Micro exercise definitions — interpreted by `MicroExerciseRunner.vue`.
 *
 * Step `key`s are i18n keys: copy lives at
 * `exerciseWizards.micro.<i18nKey>.<key>.{title,description,placeholder,…}`.
 * Design: docs/exercise-scheduling-design.md §4.3.
 */

import type { MicroExerciseDefinition } from '@/domain/microExercises'

export const MICRO_EXERCISES: MicroExerciseDefinition[] = [
  {
    slug: 'gratitude-list',
    i18nKey: 'gratitudeList',
    steps: [
      { key: 'intro', type: 'info' },
      { key: 'items', type: 'textList', prompts: 3 },
      { key: 'why', type: 'textarea', optional: true },
    ],
  },
  {
    slug: 'savoring-moment',
    i18nKey: 'savoringMoment',
    steps: [
      { key: 'moment', type: 'textarea' },
      { key: 'pleasantness', type: 'slider', min: 0, max: 100 },
      { key: 'senses', type: 'textarea' },
    ],
  },
  {
    slug: 'self-compassion-break',
    i18nKey: 'selfCompassionBreak',
    steps: [
      { key: 'intro', type: 'info' },
      { key: 'mindfulness', type: 'textarea' },
      { key: 'humanity', type: 'textarea' },
      { key: 'kindness', type: 'textarea' },
    ],
  },
  {
    slug: 'grounding-54321',
    i18nKey: 'grounding54321',
    steps: [
      { key: 'see', type: 'textList', prompts: 5 },
      { key: 'feel', type: 'textList', prompts: 4 },
      { key: 'hear', type: 'textList', prompts: 3 },
      { key: 'smell', type: 'textList', prompts: 2 },
      { key: 'taste', type: 'textList', prompts: 1 },
    ],
  },
  {
    slug: 'box-breathing',
    i18nKey: 'boxBreathing',
    steps: [
      { key: 'before', type: 'emotionPick', optional: true },
      { key: 'breath', type: 'breathTimer', phaseSeconds: [4, 4, 4, 4], totalSeconds: 120 },
      { key: 'after', type: 'emotionPick', optional: true },
    ],
  },
  {
    slug: 'one-small-win',
    i18nKey: 'oneSmallWin',
    steps: [
      { key: 'win', type: 'textarea' },
      { key: 'meaning', type: 'textarea' },
    ],
  },
  // ── Problem-focused path tools (anger · shame · anxiety) ────────────
  // Plan: ideas/html-plans/2026-09-23-problem-focused-paths.html §6.3.
  {
    slug: 'paced-breathing',
    i18nKey: 'pacedBreathing',
    steps: [
      { key: 'before', type: 'emotionPick', optional: true },
      // Longer exhale than box breathing: 4 s in, 6 s out, no holds.
      { key: 'breath', type: 'breathTimer', phaseSeconds: [4, 0, 6, 0], totalSeconds: 180 },
      { key: 'after', type: 'emotionPick', optional: true },
    ],
  },
  {
    slug: 'anger-log',
    i18nKey: 'angerLog',
    steps: [
      { key: 'hadEpisode', type: 'choice', options: ['none', 'mild', 'strong'] },
      { key: 'quietDay', type: 'textarea', optional: true, showWhen: { step: 'hadEpisode', in: ['none'] } },
      { key: 'intensity', type: 'slider', min: 0, max: 10, showWhen: { step: 'hadEpisode', in: ['mild', 'strong'] } },
      { key: 'trigger', type: 'textarea', showWhen: { step: 'hadEpisode', in: ['mild', 'strong'] } },
      { key: 'firstSign', type: 'textarea', optional: true, showWhen: { step: 'hadEpisode', in: ['mild', 'strong'] } },
      { key: 'thought', type: 'textarea', showWhen: { step: 'hadEpisode', in: ['mild', 'strong'] } },
      { key: 'behavior', type: 'textarea', showWhen: { step: 'hadEpisode', in: ['mild', 'strong'] } },
      { key: 'helped', type: 'textarea', optional: true, showWhen: { step: 'hadEpisode', in: ['mild', 'strong'] } },
    ],
  },
  {
    slug: 'anger-map',
    i18nKey: 'angerMap',
    steps: [
      { key: 'intro', type: 'info' },
      { key: 'triggers', type: 'textList', prompts: 5 },
      { key: 'bodySigns', type: 'textList', prompts: 3 },
      { key: 'reaction', type: 'textarea' },
      { key: 'cost', type: 'textarea' },
      { key: 'protects', type: 'textarea', optional: true },
    ],
  },
  {
    slug: 'pause-plan',
    i18nKey: 'pausePlan',
    steps: [
      { key: 'intro', type: 'info' },
      { key: 'earlySigns', type: 'textList', prompts: 3 },
      { key: 'ifThen', type: 'textarea' },
      { key: 'returnPromise', type: 'textarea' },
      { key: 'confidence', type: 'slider', min: 0, max: 100, step: 5 },
    ],
  },
  {
    slug: 'need-behind-anger',
    i18nKey: 'needBehindAnger',
    steps: [
      { key: 'observation', type: 'textarea' },
      { key: 'feeling', type: 'emotionPick' },
      {
        key: 'needs',
        type: 'choice',
        multiple: true,
        options: [
          'respect',
          'understanding',
          'fairness',
          'autonomy',
          'safety',
          'rest',
          'support',
          'closeness',
          'appreciation',
          'honesty',
          'order',
          'space',
          'cooperation',
          'predictability',
        ],
      },
      { key: 'needNote', type: 'textarea', optional: true },
      { key: 'request', type: 'textarea' },
    ],
  },
  {
    slug: 'shame-log',
    i18nKey: 'shameLog',
    steps: [
      { key: 'hadMoment', type: 'choice', options: ['none', 'yes'] },
      { key: 'quietDay', type: 'textarea', optional: true, showWhen: { step: 'hadMoment', in: ['none'] } },
      { key: 'situation', type: 'textarea', showWhen: { step: 'hadMoment', in: ['yes'] } },
      { key: 'body', type: 'textarea', optional: true, showWhen: { step: 'hadMoment', in: ['yes'] } },
      {
        key: 'compass',
        type: 'choice',
        options: ['withdraw', 'avoid', 'attackSelf', 'attackOthers'],
        showWhen: { step: 'hadMoment', in: ['yes'] },
      },
      { key: 'criticSaid', type: 'textarea', showWhen: { step: 'hadMoment', in: ['yes'] } },
      { key: 'kindVoice', type: 'textarea', showWhen: { step: 'hadMoment', in: ['yes'] } },
    ],
  },
  {
    slug: 'shame-map',
    i18nKey: 'shameMap',
    steps: [
      { key: 'intro', type: 'info' },
      {
        key: 'areas',
        type: 'choice',
        multiple: true,
        options: [
          'body',
          'work',
          'money',
          'relationships',
          'family',
          'parenting',
          'health',
          'competence',
          'belonging',
          'past',
        ],
      },
      { key: 'bodySigns', type: 'textList', prompts: 3 },
      {
        key: 'compass',
        type: 'choice',
        multiple: true,
        options: ['withdraw', 'avoid', 'attackSelf', 'attackOthers'],
      },
      { key: 'audience', type: 'choice', options: ['others', 'self', 'both'] },
      { key: 'standard', type: 'textarea' },
      { key: 'origin', type: 'textarea', optional: true },
    ],
  },
  {
    slug: 'shame-or-guilt',
    i18nKey: 'shameOrGuilt',
    steps: [
      { key: 'facts', type: 'textarea' },
      { key: 'statement', type: 'textarea' },
      { key: 'verdict', type: 'choice', options: ['act', 'self', 'mixed'] },
      { key: 'repair', type: 'textarea', showWhen: { step: 'verdict', in: ['act', 'mixed'] } },
      { key: 'kindVoice', type: 'textarea', showWhen: { step: 'verdict', in: ['self', 'mixed'] } },
    ],
  },
  {
    slug: 'compassionate-image',
    i18nKey: 'compassionateImage',
    steps: [
      { key: 'intro', type: 'info' },
      { key: 'wisdom', type: 'textarea' },
      { key: 'strength', type: 'textarea' },
      { key: 'warmth', type: 'textarea' },
      { key: 'nonJudgement', type: 'textarea' },
      { key: 'message', type: 'textarea' },
    ],
  },
  {
    slug: 'worry-postponement',
    i18nKey: 'worryPostponement',
    followUp: { route: '/exercises/worry-tree' },
    steps: [
      { key: 'intro', type: 'info' },
      { key: 'worries', type: 'textList', prompts: 5 },
      { key: 'stillMatters', type: 'slider', min: 0, max: 100, step: 10 },
      { key: 'pick', type: 'textarea', optional: true },
    ],
  },
  {
    slug: 'anxiety-map',
    i18nKey: 'anxietyMap',
    steps: [
      { key: 'intro', type: 'info' },
      { key: 'situations', type: 'textList', prompts: 5 },
      { key: 'bodySigns', type: 'textList', prompts: 3 },
      { key: 'avoidance', type: 'textList', prompts: 4 },
      { key: 'safetyBehaviors', type: 'textList', prompts: 4 },
      { key: 'cost', type: 'textarea' },
      { key: 'withoutFear', type: 'textarea', optional: true },
    ],
  },
  {
    slug: 'maintenance-plan',
    i18nKey: 'maintenancePlan',
    steps: [
      { key: 'keep', type: 'textList', prompts: 3 },
      { key: 'signal', type: 'textarea' },
      { key: 'support', type: 'textarea', optional: true },
    ],
  },
]

export function getMicroExercise(slug: string): MicroExerciseDefinition | undefined {
  return MICRO_EXERCISES.find((definition) => definition.slug === slug)
}
