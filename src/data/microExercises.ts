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
      // Body before words: twenty seconds of the soothing rhythm (optional).
      {
        key: 'breath',
        type: 'breathTimer',
        phaseSeconds: [4, 0, 6, 0],
        totalSeconds: 20,
        optional: true,
      },
      { key: 'mindfulness', type: 'textarea' },
      { key: 'humanity', type: 'textarea' },
      { key: 'kindness', type: 'textarea' },
      { key: 'helpful', type: 'slider', min: 1, max: 5, optional: true },
    ],
    innerPractice: true,
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
      { key: 'helpful', type: 'slider', min: 1, max: 5, optional: true },
    ],
    innerPractice: true,
  },
  // Momenty — one moment log for every problem path. `kind` is preset by
  // the catalog variants (moment-shame, moment-anger); branches hang on
  // kind + hadMoment. Shared keys (situation, body) keep one copy.
  // v3 (plan 2026-10-04 §2.1): the shame branch starts with five taps —
  // which part took over · when I noticed · what I did instead · how strong
  // — then "Zapisz teraz"; the prose steps are optional. Since 2026-10-18
  // (plan 2026-10-18-anger-anxiety-paths-v2 §2) the anger and anxiety
  // branches do the same with their reaction families (`momentFamilies.ts`):
  // a reaction instead of a part, the path's own moves, a 1–5 strength. The
  // `other` branch keeps the v2 prose.
  {
    slug: 'moments',
    i18nKey: 'moments',
    earlyFinishAfter: ['strength', 'angerStrength', 'anxietyStrength'],
    steps: [
      { key: 'kind', type: 'choice', options: ['shame', 'anger', 'anxiety', 'other'] },
      { key: 'hadMoment', type: 'choice', options: ['none', 'yes'] },
      {
        key: 'quietDay',
        type: 'textarea',
        optional: true,
        showWhen: { step: 'hadMoment', in: ['none'] },
      },
      // ── anger: the quick five (reaction · noticed · moves · strength) ──
      {
        key: 'angerReaction',
        type: 'choice',
        options: ['sharp', 'outburst', 'silence', 'selfBlame', 'pause'],
        showWhen: [
          { step: 'kind', in: ['anger'] },
          { step: 'hadMoment', in: ['yes'] },
        ],
        hintFrom: { source: 'latest', slug: 'anger-map', step: 'reactionKinds' },
      },
      // ── anxiety: the quick five ──
      {
        key: 'anxietyReaction',
        type: 'choice',
        options: ['postpone', 'withdraw', 'check', 'worry', 'approach'],
        showWhen: [
          { step: 'kind', in: ['anxiety'] },
          { step: 'hadMoment', in: ['yes'] },
        ],
        hintFrom: { source: 'latest', slug: 'anxiety-map', step: 'reactionKinds' },
      },
      // ── shame: the quick five ──
      {
        key: 'compass',
        type: 'choice',
        options: ['withdraw', 'attackSelf', 'attackOthers', 'avoid', 'none'],
        labelsFromParts: {
          withdraw: 'shame-compass:withdraw',
          attackSelf: 'shame-compass:attackSelf',
          attackOthers: 'shame-compass:attackOthers',
          avoid: 'shame-compass:avoid',
        },
        showWhen: [
          { step: 'kind', in: ['shame'] },
          { step: 'hadMoment', in: ['yes'] },
        ],
      },
      // ── shared by the three paths: when I noticed ──
      {
        key: 'noticed',
        type: 'choice',
        options: ['during', 'soon', 'hours', 'later'],
        showWhen: [
          { step: 'kind', in: ['shame', 'anger', 'anxiety'] },
          { step: 'hadMoment', in: ['yes'] },
        ],
      },
      {
        key: 'response',
        type: 'choice',
        multiple: true,
        // kindAct · gesture · stayed · thanked: the week tasks' own moves (2026-10-11), so a task counts a day only when it happened.
        options: [
          'breath',
          'named',
          'unblend',
          'question',
          'sentence',
          'defend',
          'contact',
          'repair',
          'test',
          'kindAct',
          'gesture',
          'stayed',
          'thanked',
          'nothing',
        ],
        showWhen: [
          { step: 'kind', in: ['shame'] },
          { step: 'hadMoment', in: ['yes'] },
        ],
        hintFrom: { source: 'latest', slug: 'shame-response', step: 'move' },
      },
      {
        key: 'strength',
        type: 'slider',
        min: 1,
        max: 5,
        showWhen: [
          { step: 'kind', in: ['shame'] },
          { step: 'hadMoment', in: ['yes'] },
        ],
      },
      // ── anger: the moves (the week tasks' own: pause · announce · returned · altThought · need · request · step · repair) and the strength ──
      {
        key: 'angerResponse',
        type: 'choice',
        multiple: true,
        options: [
          'breath',
          'named',
          'pause',
          'announce',
          'returned',
          'altThought',
          'need',
          'request',
          'step',
          'repair',
          'nothing',
        ],
        showWhen: [
          { step: 'kind', in: ['anger'] },
          { step: 'hadMoment', in: ['yes'] },
        ],
        hintFrom: { source: 'latest', slug: 'pause-plan', step: 'ifThen' },
      },
      {
        key: 'angerStrength',
        type: 'slider',
        min: 1,
        max: 5,
        showWhen: [
          { step: 'kind', in: ['anger'] },
          { step: 'hadMoment', in: ['yes'] },
        ],
      },
      // ── anxiety: the moves (stayed · anyway · noCheck · postponed · prediction · step · meaningful) and the strength ──
      {
        key: 'anxietyResponse',
        type: 'choice',
        multiple: true,
        options: [
          'breath',
          'named',
          'stayed',
          'anyway',
          'noCheck',
          'postponed',
          'prediction',
          'step',
          'meaningful',
          'nothing',
        ],
        showWhen: [
          { step: 'kind', in: ['anxiety'] },
          { step: 'hadMoment', in: ['yes'] },
        ],
        hintFrom: { source: 'latest', slug: 'anxiety-map', step: 'withoutFear' },
      },
      {
        key: 'anxietyStrength',
        type: 'slider',
        min: 1,
        max: 5,
        showWhen: [
          { step: 'kind', in: ['anxiety'] },
          { step: 'hadMoment', in: ['yes'] },
        ],
      },
      // ── shared (required for `other`, optional after the quick taps) ──
      {
        key: 'situation',
        type: 'textarea',
        showWhen: { step: 'hadMoment', in: ['yes'] },
        optionalWhen: { step: 'kind', in: ['shame', 'anger', 'anxiety'] },
      },
      // ── shame: the optional tail ──
      {
        key: 'about',
        type: 'choice',
        options: ['act', 'event', 'demand', 'unsure'],
        optional: true,
        showWhen: [
          { step: 'kind', in: ['shame'] },
          { step: 'hadMoment', in: ['yes'] },
        ],
      },
      // ── shared (after the kind-specific sorting); the body hint comes from the path's own map ──
      {
        key: 'body',
        type: 'textarea',
        optional: true,
        showWhen: [
          { step: 'kind', in: ['shame', 'other'] },
          { step: 'hadMoment', in: ['yes'] },
        ],
        hintFrom: {
          source: 'latest',
          slug: 'shame-map',
          step: 'bodySigns',
          when: { step: 'kind', in: ['shame'] },
        },
      },
      {
        key: 'angerBody',
        type: 'textarea',
        optional: true,
        showWhen: [
          { step: 'kind', in: ['anger'] },
          { step: 'hadMoment', in: ['yes'] },
        ],
        hintFrom: { source: 'latest', slug: 'anger-map', step: 'bodySigns' },
      },
      {
        key: 'anxietyBody',
        type: 'textarea',
        optional: true,
        showWhen: [
          { step: 'kind', in: ['anxiety'] },
          { step: 'hadMoment', in: ['yes'] },
        ],
        hintFrom: { source: 'latest', slug: 'anxiety-map', step: 'bodySigns' },
      },
      // ── shame ──
      {
        key: 'criticSaid',
        type: 'textarea',
        optional: true,
        showWhen: [
          { step: 'kind', in: ['shame'] },
          { step: 'hadMoment', in: ['yes'] },
        ],
      },
      {
        key: 'kindVoice',
        type: 'textarea',
        optional: true,
        showWhen: [
          { step: 'kind', in: ['shame'] },
          { step: 'hadMoment', in: ['yes'] },
        ],
        hintFrom: { source: 'latest', slug: 'compassionate-self', step: 'toPart' },
      },
      {
        key: 'nextTime',
        type: 'textarea',
        optional: true,
        showWhen: [
          { step: 'kind', in: ['shame'] },
          { step: 'hadMoment', in: ['yes'] },
        ],
      },
      // ── anger, anxiety, other: the thought (anxiety: the prediction) ──
      {
        key: 'thought',
        type: 'textarea',
        optional: true,
        showWhen: [
          { step: 'kind', in: ['anger', 'anxiety', 'other'] },
          { step: 'hadMoment', in: ['yes'] },
        ],
      },
      // ── anger: the need behind it (the same list as "Potrzeba i prośba") ──
      {
        key: 'need',
        type: 'choice',
        multiple: true,
        optional: true,
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
        showWhen: [
          { step: 'kind', in: ['anger'] },
          { step: 'hadMoment', in: ['yes'] },
        ],
      },
      // ── anxiety: what really happened (prediction → outcome, inhibitory learning) ──
      {
        key: 'outcome',
        type: 'textarea',
        optional: true,
        showWhen: [
          { step: 'kind', in: ['anxiety'] },
          { step: 'hadMoment', in: ['yes'] },
        ],
      },
      // ── other: the v2 prose ──
      {
        key: 'behavior',
        type: 'textarea',
        showWhen: [
          { step: 'kind', in: ['other'] },
          { step: 'hadMoment', in: ['yes'] },
        ],
      },
      {
        key: 'helped',
        type: 'textarea',
        optional: true,
        showWhen: [
          { step: 'kind', in: ['anger', 'anxiety', 'other'] },
          { step: 'hadMoment', in: ['yes'] },
        ],
      },
    ],
  },
  {
    slug: 'anger-map',
    i18nKey: 'angerMap',
    steps: [
      { key: 'intro', type: 'info' },
      { key: 'triggers', type: 'textList', prompts: 5 },
      { key: 'bodySigns', type: 'textList', prompts: 3 },
      // The reaction families of the anger Momenty (plan 2026-10-18 §2.2); the prose keeps the detail.
      {
        key: 'reactionKinds',
        type: 'choice',
        multiple: true,
        options: ['sharp', 'outburst', 'silence', 'selfBlame'],
      },
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
      {
        key: 'earlySigns',
        type: 'textList',
        prompts: 3,
        hintFrom: { source: 'latest', slug: 'anger-map', step: 'bodySigns' },
      },
      { key: 'ifThen', type: 'textarea' },
      { key: 'returnPromise', type: 'textarea' },
      { key: 'confidence', type: 'slider', min: 0, max: 100, step: 5 },
    ],
    // After saving: log the moment the pause was used in (the anger counterpart of the shame response's hand-over).
    afterSave: {
      route: '/exercises/micro/moment-anger',
      prefillFrom: { angerResponse: { set: ['pause'] } },
    },
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
        options: ['withdraw', 'attackSelf', 'attackOthers', 'avoid'],
        labelsFromParts: {
          withdraw: 'shame-compass:withdraw',
          attackSelf: 'shame-compass:attackSelf',
          attackOthers: 'shame-compass:attackOthers',
          avoid: 'shame-compass:avoid',
        },
      },
      // Each reaction is a protector part; saving the map creates them (shamePartsService).
      { key: 'partsIntro', type: 'info' },
      { key: 'audience', type: 'choice', options: ['others', 'self', 'both'] },
      { key: 'standard', type: 'textarea' },
      { key: 'friendTest', type: 'choice', options: ['yes', 'no', 'unsure'] },
      { key: 'origin', type: 'textarea' },
    ],
  },
  // "O czym jest ten wstyd?" — three exits: act → repair, event → care,
  // demand → check the demand. Starts from a moment when there is one.
  {
    slug: 'shame-or-guilt',
    i18nKey: 'shameOrGuilt',
    steps: [
      {
        key: 'episode',
        type: 'entryPick',
        slug: 'moments',
        show: ['situation', 'about'],
        filter: [
          { step: 'kind', in: ['shame'] },
          { step: 'hadMoment', in: ['yes'] },
        ],
        optional: true,
      },
      {
        key: 'facts',
        type: 'textarea',
        hintFrom: { source: 'picked', pickStep: 'episode', step: 'situation' },
      },
      { key: 'statement', type: 'textarea' },
      { key: 'about', type: 'choice', multiple: true, options: ['act', 'event', 'demand'] },
      { key: 'repair', type: 'textarea', showWhen: { step: 'about', in: ['act'] } },
      { key: 'care', type: 'textarea', showWhen: { step: 'about', in: ['event'] } },
      { key: 'friendTest', type: 'textarea', showWhen: { step: 'about', in: ['demand'] } },
      {
        key: 'whoseDemand',
        type: 'textarea',
        showWhen: { step: 'about', in: ['demand'] },
        hintFrom: { source: 'latest', slug: 'shame-map', step: 'standard' },
      },
      { key: 'fairDemand', type: 'textarea', showWhen: { step: 'about', in: ['demand'] } },
      {
        key: 'kindVoice',
        type: 'textarea',
        hintFrom: { source: 'latest', slug: 'compassionate-image', step: 'message' },
      },
    ],
  },
  {
    slug: 'compassionate-image',
    i18nKey: 'compassionateImage',
    steps: [
      // The easiest flow first: compassion towards someone else warms the system up.
      { key: 'toOther', type: 'textarea' },
      { key: 'intro', type: 'info' },
      { key: 'wisdom', type: 'textarea' },
      { key: 'strength', type: 'textarea' },
      { key: 'warmth', type: 'textarea' },
      { key: 'nonJudgement', type: 'textarea' },
      { key: 'message', type: 'textarea' },
      { key: 'helpful', type: 'slider', min: 1, max: 5, optional: true },
    ],
    innerPractice: true,
  },
  // "Odpowiedź na wstyd" — a personal plan for the moment of shame, the
  // shame path's counterpart of the anger pause plan.
  {
    slug: 'shame-response',
    i18nKey: 'shameResponse',
    steps: [
      { key: 'intro', type: 'info' },
      {
        key: 'signals',
        type: 'textList',
        prompts: 2,
        hintFrom: { source: 'latest', slug: 'shame-map', step: 'bodySigns' },
      },
      {
        key: 'breath',
        type: 'breathTimer',
        phaseSeconds: [4, 0, 6, 0],
        totalSeconds: 60,
        optional: true,
      },
      { key: 'name', type: 'textarea' },
      // IFS: the reaction is a part taking the wheel — name it, then step back from it.
      {
        key: 'unblend',
        type: 'choice',
        options: ['withdraw', 'attackSelf', 'attackOthers', 'avoid'],
        labelsFromParts: {
          withdraw: 'shame-compass:withdraw',
          attackSelf: 'shame-compass:attackSelf',
          attackOthers: 'shame-compass:attackOthers',
          avoid: 'shame-compass:avoid',
        },
        hintFrom: { source: 'latest', slug: 'shame-map', step: 'compass' },
      },
      { key: 'unblendSentence', type: 'textarea' },
      { key: 'question', type: 'info' },
      {
        key: 'sentence',
        type: 'textarea',
        hintFrom: { source: 'latest', slug: 'compassionate-self', step: 'toPart' },
      },
      {
        key: 'move',
        type: 'choice',
        multiple: true,
        options: ['stay', 'eyes', 'say', 'ask', 'hand', 'later'],
      },
      { key: 'moveNote', type: 'textarea', optional: true },
      // Tiny Habits: the plan is rehearsed when calm so it comes by itself when hot.
      {
        key: 'anchor',
        type: 'choice',
        optional: true,
        options: ['coffee', 'commute', 'evening', 'other'],
      },
    ],
    // After saving: log the moment it was used in, with the moves carried over.
    afterSave: {
      route: '/exercises/micro/moment-shame',
      prefillFrom: {
        response: {
          from: 'move',
          map: {
            stay: 'contact',
            eyes: 'contact',
            say: 'sentence',
            ask: 'question',
            hand: 'breath',
            later: 'contact',
          },
        },
      },
    },
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
      // The reaction families of the anxiety Momenty (plan 2026-10-18 §2.2).
      {
        key: 'reactionKinds',
        type: 'choice',
        multiple: true,
        options: ['postpone', 'withdraw', 'check', 'worry'],
      },
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
      // The path's practices as choices (plus the personal plan for a hard moment); phase P3 turns them into repeat plans.
      {
        key: 'keep',
        type: 'choice',
        multiple: true,
        optionsFrom: 'programPractices',
        options: ['response'],
      },
      { key: 'rhythm', type: 'choice', options: ['daily', 'every2', 'every3', 'weekly'] },
      { key: 'signal', type: 'textarea' },
      { key: 'support', type: 'textarea', optional: true },
    ],
  },
  // ── Shame path v3 (plan ideas/html-plans/2026-10-04-shame-path-v3.html §3) ──
  // "Mój znak": the path's goal in the user's words — read by the dashboard header.
  // Shared by the three problem paths: the step launches it with `?kind=`
  // (a preset, like a variant), and the intro and the main target branch on it;
  // entries without a kind are the shame path's older ones.
  {
    slug: 'my-sign',
    i18nKey: 'mySign',
    steps: [
      { key: 'kind', type: 'choice', options: ['shame', 'anger', 'anxiety'], optional: true },
      { key: 'intro', type: 'info', showWhen: { step: 'kind', in: ['shame'] } },
      { key: 'introAnger', type: 'info', showWhen: { step: 'kind', in: ['anger'] } },
      { key: 'introAnxiety', type: 'info', showWhen: { step: 'kind', in: ['anxiety'] } },
      {
        key: 'mainTarget',
        type: 'choice',
        options: ['withdraw', 'attackSelf', 'attackOthers', 'avoid'],
        labelsFromParts: {
          withdraw: 'shame-compass:withdraw',
          attackSelf: 'shame-compass:attackSelf',
          attackOthers: 'shame-compass:attackOthers',
          avoid: 'shame-compass:avoid',
        },
        hintFrom: { source: 'latest', slug: 'shame-map', step: 'compass' },
        showWhen: { step: 'kind', in: ['shame'] },
      },
      {
        key: 'angerTarget',
        type: 'choice',
        options: ['sharp', 'outburst', 'silence', 'selfBlame'],
        hintFrom: { source: 'latest', slug: 'anger-map', step: 'reactionKinds' },
        showWhen: { step: 'kind', in: ['anger'] },
      },
      {
        key: 'anxietyTarget',
        type: 'choice',
        options: ['postpone', 'withdraw', 'check', 'worry'],
        hintFrom: { source: 'latest', slug: 'anxiety-map', step: 'reactionKinds' },
        showWhen: { step: 'kind', in: ['anxiety'] },
      },
      { key: 'sign', type: 'textarea' },
      { key: 'safePerson', type: 'textarea', optional: true },
    ],
  },
  // Safe place + the resistances named before the first inward practice (backdraft rule, D5).
  {
    slug: 'safe-place',
    i18nKey: 'safePlace',
    steps: [
      { key: 'intro', type: 'info' },
      {
        key: 'breath',
        type: 'breathTimer',
        phaseSeconds: [4, 0, 6, 0],
        totalSeconds: 90,
        optional: true,
      },
      { key: 'place', type: 'textarea' },
      { key: 'anchor', type: 'textList', prompts: 2 },
      {
        key: 'resistance',
        type: 'choice',
        multiple: true,
        options: ['weak', 'undeserved', 'lazy', 'dependent', 'unfamiliar', 'grief', 'none'],
      },
      { key: 'resistanceReply', type: 'textarea', optional: true },
      { key: 'helpful', type: 'slider', min: 1, max: 5, optional: true },
    ],
    innerPractice: true,
  },
  // The compassionate self (CFT) = Self-energy (IFS): embodied, then speaking to the part that is ashamed.
  {
    slug: 'compassionate-self',
    i18nKey: 'compassionateSelf',
    steps: [
      { key: 'intro', type: 'info' },
      {
        key: 'breath',
        type: 'breathTimer',
        phaseSeconds: [4, 0, 6, 0],
        totalSeconds: 60,
        optional: true,
      },
      { key: 'posture', type: 'textarea' },
      {
        key: 'qualities',
        type: 'choice',
        multiple: true,
        options: [
          'calm',
          'curiosity',
          'clarity',
          'compassion',
          'confidence',
          'courage',
          'creativity',
          'connectedness',
        ],
      },
      {
        key: 'toPart',
        type: 'textarea',
        hintFrom: { source: 'latest', slug: 'compassionate-image', step: 'message' },
      },
      { key: 'helpful', type: 'slider', min: 1, max: 5, optional: true },
    ],
    innerPractice: true,
  },
  // Fierce self-compassion: a voice that takes your side (EFT protective anger, DBT opposite action).
  {
    slug: 'defender-voice',
    i18nKey: 'defenderVoice',
    steps: [
      { key: 'intro', type: 'info' },
      {
        key: 'episode',
        type: 'entryPick',
        slug: 'moments',
        show: ['situation', 'criticSaid'],
        filter: [
          { step: 'kind', in: ['shame'] },
          { step: 'hadMoment', in: ['yes'] },
        ],
        optional: true,
      },
      {
        key: 'attack',
        type: 'textarea',
        hintFrom: { source: 'picked', pickStep: 'episode', step: 'criticSaid' },
      },
      { key: 'friendDefends', type: 'textarea' },
      { key: 'mySentence', type: 'textarea' },
      {
        key: 'posture',
        type: 'choice',
        multiple: true,
        options: ['headUp', 'voice', 'eyes', 'noApology'],
      },
      { key: 'helpful', type: 'slider', min: 1, max: 5, optional: true },
    ],
    innerPractice: true,
  },
  // Self-compassionate writing after a moment of shame (Johnson & O'Brien 2013): a real paragraph each.
  {
    slug: 'shame-writing',
    i18nKey: 'shameWriting',
    steps: [
      {
        key: 'episode',
        type: 'entryPick',
        slug: 'moments',
        show: ['situation', 'compass'],
        filter: [
          { step: 'kind', in: ['shame'] },
          { step: 'hadMoment', in: ['yes'] },
        ],
        days: 7,
        optional: true,
      },
      {
        key: 'facts',
        type: 'textarea',
        hintFrom: { source: 'picked', pickStep: 'episode', step: 'situation' },
      },
      { key: 'humanity', type: 'textarea', minLength: 150 },
      {
        key: 'kindness',
        type: 'textarea',
        minLength: 150,
        hintFrom: { source: 'latest', slug: 'compassionate-self', step: 'toPart' },
      },
      { key: 'perspective', type: 'textarea', minLength: 100 },
      { key: 'helpful', type: 'slider', min: 1, max: 5, optional: true },
    ],
    innerPractice: true,
  },
  // Mid-path check: the dose, not the result.
  {
    slug: 'dose-check',
    i18nKey: 'doseCheck',
    steps: [
      { key: 'intro', type: 'info' },
      { key: 'load', type: 'choice', options: ['tooMuch', 'right', 'tooLittle', 'none'] },
      {
        key: 'helpsMost',
        type: 'choice',
        multiple: true,
        optionsFrom: 'programPractices',
        options: [],
        optional: true,
      },
      { key: 'inTheWay', type: 'textarea', optional: true },
    ],
  },
  // A letter from the compassionate self to the future self, resurfacing on a chosen week.
  {
    slug: 'letter-to-future-self',
    i18nKey: 'letterToFutureSelf',
    steps: [
      { key: 'intro', type: 'info' },
      {
        key: 'letter',
        type: 'textarea',
        minLength: 300,
        hintFrom: { source: 'latest', slug: 'compassionate-self', step: 'toPart' },
      },
      { key: 'returnIn', type: 'choice', options: ['w4', 'w8', 'w12'] },
    ],
  },
  // "Powrót": eight weeks after the path closed — what stayed, what came back.
  // Shared by the three problem paths (`?kind=` preset): "what came back" lists
  // the path's own parts or reactions.
  {
    slug: 'path-return',
    i18nKey: 'pathReturn',
    steps: [
      { key: 'kind', type: 'choice', options: ['shame', 'anger', 'anxiety'], optional: true },
      {
        key: 'letter',
        type: 'info',
        hintFrom: { source: 'latest', slug: 'letter-to-future-self', step: 'letter', full: true },
      },
      {
        key: 'kept',
        type: 'choice',
        multiple: true,
        optionsFrom: 'programPractices',
        options: ['response', 'sentences'],
        optional: true,
      },
      {
        key: 'returned',
        type: 'choice',
        multiple: true,
        options: ['withdraw', 'attackSelf', 'attackOthers', 'avoid', 'none'],
        labelsFromParts: {
          withdraw: 'shame-compass:withdraw',
          attackSelf: 'shame-compass:attackSelf',
          attackOthers: 'shame-compass:attackOthers',
          avoid: 'shame-compass:avoid',
        },
        showWhen: { step: 'kind', in: ['shame'] },
      },
      {
        key: 'returnedAnger',
        type: 'choice',
        multiple: true,
        options: ['sharp', 'outburst', 'silence', 'selfBlame', 'none'],
        showWhen: { step: 'kind', in: ['anger'] },
      },
      {
        key: 'returnedAnxiety',
        type: 'choice',
        multiple: true,
        options: ['postpone', 'withdraw', 'check', 'worry', 'none'],
        showWhen: { step: 'kind', in: ['anxiety'] },
      },
      { key: 'next', type: 'textarea', optional: true },
    ],
  },
]

export function getMicroExercise(slug: string): MicroExerciseDefinition | undefined {
  return MICRO_EXERCISES.find(definition => definition.slug === slug)
}
