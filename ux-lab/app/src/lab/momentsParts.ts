import type { MomentsWeekStats, ShamePartKey } from '@product/domain/momentsProgress'
import { partLabels } from '~lab/lab/shamePath'

/**
 * Round 6k (2026-10-11): two colour FAMILIES, two shades each — the user's
 * reading of the compass of shame: Krytyk and Agresor (ex-Oskarżyciel) are the same
 * move (attack) pointed at self vs others; Ukrywający and Odwracający uwagę
 * are the same move (hiding) from others vs from oneself. So:
 *
 *   attack  = reds     Krytyk  rose-200   · Agresor  rose-400 (the app's effort red)
 *   hiding  = violets  Odwracający uwagę jasny liliowy · Ukrywający  lawenda (zmierzch)
 *   Ja      = czyste niebo, the app's own blue washed with paper
 *
 * Within a family the LIGHTER shade points at the self, the DEEPER one at
 * others. All pastel, all pencil-outlined; the first (saturated) palette
 * and the five-hue sky palette of round 6j were rejected.
 *
 * ORDER = stacking order bottom → top: the ground (Ja), the hiding pair, the
 * attack pair on top. The only order whose adjacent pairs all clear the
 * dataviz validator's CVD floor on the mist tile (#f3f7fd): worst 8.0
 * (lilac ↔ blue, protan; rose-200 ↔ rose-400 clears it too); normal-vision worst 10.9 — below the tool's 15,
 * which is calibrated for saturated marks — so colour is never the only
 * channel: outlines, 2 px gaps, the legend and hover counts.
 */
export const PART_ORDER: readonly ShamePartKey[] = ['none', 'avoid', 'withdraw', 'attackSelf', 'attackOthers']

export const PART_COLOR: Record<ShamePartKey, string> = {
  none: 'color-mix(in srgb, rgb(var(--sky-400)) 78%, var(--mg-color-paper))',
  /** hiding from oneself — the light lilac (lavender-soft washed) */
  avoid: 'rgb(227 220 246)',
  /** hiding from others — the lavender of the low-energy quadrant, a touch deeper */
  withdraw: 'rgb(197 168 216)',
  /** attack on the self — rose-200, the light step of the app's own red ramp (effort-soft) */
  attackSelf: 'rgb(var(--rose-200))',
  /** attack on others — rose-400, the app's "effort" red (round 6m: coral and a loose pastel red rejected — use a red the app already has) */
  attackOthers: 'rgb(var(--rose-400))',
}

/** The sky moment each colour stands for — spoken in the hover, never on the surface. */
export const PART_SKY: Record<ShamePartKey, string> = {
  none: 'czyste niebo',
  avoid: 'ukrycie przed sobą · jasny liliowy',
  withdraw: 'ukrycie przed innymi · lawenda',
  attackSelf: 'atak na siebie · rose-200',
  attackOthers: 'atak na innych · rose-400',
}

export const PART_LABEL: Record<ShamePartKey, string> = {
  withdraw: partLabels[0]!,
  attackSelf: partLabels[1]!,
  attackOthers: partLabels[2]!,
  avoid: partLabels[3]!,
  none: 'Ja',
}

export interface Dominant {
  part: ShamePartKey
  count: number
  /** Share of the week's moments the dominant part took (0–1). */
  share: number
  /** Parts tied with the winner (excluding it), in PART_ORDER. */
  tiedWith: ShamePartKey[]
}

/** Who took the wheel most often this week; ties go to the earlier part in PART_ORDER ("Ja" first). */
export function dominantPart(week: MomentsWeekStats): Dominant | null {
  if (!week.total) return null
  const max = Math.max(...PART_ORDER.map(part => week.byPart[part]))
  const winners = PART_ORDER.filter(part => week.byPart[part] === max)
  return { part: winners[0]!, count: max, share: max / week.total, tiedWith: winners.slice(1) }
}
