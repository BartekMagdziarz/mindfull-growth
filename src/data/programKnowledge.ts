/**
 * Knowledge cards of a path ("Zrozumieć") — short reads (150–300 words)
 * tied to phases, shown in the path dashboard and linked from step intros.
 * All cards are visible from the start; the current phase's cards are
 * highlighted and `pinned` ones ("Gdy ciepło boli", "Kiedy to za dużo")
 * always come first. Reading is a marker, never a gate
 * (`ProgramEnrollment.readCards`).
 *
 * Copy: `src/locales/{pl,en}/programKnowledge.json` →
 * `<i18nKey>.{title, lead, body[], sources[]}`.
 *
 * Decision D2 (plan ideas/html-plans/2026-10-04-shame-path-v3.html): the
 * rationale is an active ingredient — credibility predicts outcome and
 * completion — but it lives in the dashboard, not in exercise steps.
 */

export interface KnowledgeCard {
  key: string
  programSlug: string
  /** Phase keys the card belongs to (highlighted while the path is in one of them). */
  phaseKeys: string[]
  i18nKey: string
  /** Always listed first, regardless of phase. */
  pinned?: boolean
}

export const PROGRAM_KNOWLEDGE: readonly KnowledgeCard[] = [
  { key: 'whatShame', programSlug: 'shame-compassion', phaseKeys: ['w1'], i18nKey: 'whatShame' },
  { key: 'notYourFault', programSlug: 'shame-compassion', phaseKeys: ['w1'], i18nKey: 'notYourFault' },
  { key: 'compassParts', programSlug: 'shame-compassion', phaseKeys: ['w1', 'w5'], i18nKey: 'compassParts' },
  { key: 'threeSystems', programSlug: 'shame-compassion', phaseKeys: ['w2'], i18nKey: 'threeSystems' },
  { key: 'whenWarmthHurts', programSlug: 'shame-compassion', phaseKeys: ['w2'], i18nKey: 'whenWarmthHurts', pinned: true },
  { key: 'actEventDemand', programSlug: 'shame-compassion', phaseKeys: ['w3'], i18nKey: 'actEventDemand' },
  { key: 'readingProgress', programSlug: 'shame-compassion', phaseKeys: ['w4'], i18nKey: 'readingProgress' },
  { key: 'criticProtector', programSlug: 'shame-compassion', phaseKeys: ['w5'], i18nKey: 'criticProtector' },
  { key: 'notIndulgence', programSlug: 'shame-compassion', phaseKeys: ['w5', 'w6'], i18nKey: 'notIndulgence' },
  { key: 'outOfHiding', programSlug: 'shame-compassion', phaseKeys: ['w7'], i18nKey: 'outOfHiding' },
  { key: 'whenTooMuch', programSlug: 'shame-compassion', phaseKeys: [], i18nKey: 'whenTooMuch', pinned: true },
]

export function knowledgeCardsFor(programSlug: string): KnowledgeCard[] {
  return PROGRAM_KNOWLEDGE.filter((card) => card.programSlug === programSlug)
}

/**
 * Cards in display order for a phase: pinned first, then the phase's own
 * cards, then the rest in definition order.
 */
export function orderedKnowledgeCards(programSlug: string, phaseKey: string | undefined): KnowledgeCard[] {
  const cards = knowledgeCardsFor(programSlug)
  const rank = (card: KnowledgeCard) =>
    card.pinned ? 0 : phaseKey && card.phaseKeys.includes(phaseKey) ? 1 : 2
  return [...cards].sort((a, b) => rank(a) - rank(b) || cards.indexOf(a) - cards.indexOf(b))
}

export function getKnowledgeCard(key: string): KnowledgeCard | undefined {
  return PROGRAM_KNOWLEDGE.find((card) => card.key === key)
}
