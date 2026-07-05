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
]

export function getMicroExercise(slug: string): MicroExerciseDefinition | undefined {
  return MICRO_EXERCISES.find((definition) => definition.slug === slug)
}
