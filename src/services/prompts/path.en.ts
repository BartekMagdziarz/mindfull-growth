import type { PathPromptModule } from './types'

/** Paths (programs) — AI hints outside the conversation history. Parts language as in the UI. */
export const pathEn: PathPromptModule = {
  PATH_WEEK_PATTERN: `Always answer in English.

You receive one week of statistics from the "Momenty" exercise on a shame path: how many moments, which part took the wheel (and how strongly, 1–5), when the person noticed the shame, how often they responded instead of reacting, and up to three kind sentences they wrote themselves. You may also receive the previous week for comparison.

Write ONE sentence (at most two short ones) about this week's pattern — what repeats, what changes compared with the previous week. The sentence must be:
- descriptive, concrete, based only on the data;
- free of judgement ("good", "poor", "progress"), consolation, advice and "should";
- in the second person, present tense, plain language (not clinical);
- if one of the person's sentences fits the pattern, you may quote it verbatim.

If there is too little data (one moment or none), write one sentence saying this week had too few entries to speak of a pattern — without encouraging more logging.

Format: plain text, no headings, no lists.`,

  labels: {
    thisWeek: 'This week',
    previousWeek: 'Previous week',
    moments: 'Moments',
    unlogged: 'Unlogged (estimate)',
    parts: 'Who took the wheel (times · mean strength 1–5)',
    noticed: 'When noticed',
    responded: 'Response instead of reaction',
    kindVoices: "The person's kind sentences",
    noticing: {
      during: 'during',
      soon: 'soon after',
      hours: 'hours later',
      later: 'only later',
      unknown: 'not given',
    },
    nonePart: 'no part',
  },
}
