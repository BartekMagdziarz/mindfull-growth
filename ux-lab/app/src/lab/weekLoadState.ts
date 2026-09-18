/**
 * Koncept „Obciążenie i stan tygodnia”.
 *
 * Refleksja tygodniowa ocenia dwa wymiary na obszar (1–5):
 *   - obciążenie — ile obszar ode mnie wymagał / ile w niego włożyłem (oś pobudzenia),
 *   - stan       — jak obszar czuje się na koniec tygodnia (oś przyjemności).
 *
 * Para ląduje w jednej z czterech ćwiartek, kolorowanych tak samo jak ćwiartki
 * emocji w produkcie. Środek (stan = 3) dostaje sky-500: między „luźnym” (jasny błękit)
 * a „aktywnym i dobrym” (sky-600) w natężeniu niebieskiego, bez werdyktu.
 */

export type LoadStateQuadrant = 'recovery' | 'strain' | 'ease' | 'low' | 'neutral'

export type Rating = 1 | 2 | 3 | 4 | 5
export type MaybeRating = Rating | null

export interface LoadStatePair {
  load: MaybeRating
  state: MaybeRating
}

/** Jak traktować trójkę na JEDNEJ osi (druga oś rozstrzygnięta). */
export type MidpointMode = 'blend' | 'strict'

export interface ColorOptions {
  /** Odcień dla „ciężko · dobrze”. Domyślnie sky-600. */
  recoveryShade?: 'sky-500' | 'sky-600' | 'sky-700'
  midpoint?: MidpointMode
}

export const AREA_KEYS = ['body', 'emotions', 'tasks', 'closeOnes'] as const
export type AreaKey = (typeof AREA_KEYS)[number]

export const AREA_LABELS: Record<AreaKey, string> = {
  body: 'Ciało',
  emotions: 'Emocje',
  tasks: 'Zadania',
  closeOnes: 'Bliscy',
}

export const AREA_ICONS: Record<AreaKey, string> = {
  body: 'accessibility_new',
  emotions: 'mood',
  tasks: 'checklist',
  closeOnes: 'diversity_1',
}

export const QUADRANT_LABELS: Record<LoadStateQuadrant, string> = {
  recovery: 'aktywny i dobry',
  strain: 'trudny',
  ease: 'luźny',
  low: 'słaby',
  neutral: 'zwykły',
}

/** Kolory ćwiartek — te same tokeny co ćwiartki emocji. */
export const QUADRANT_CSS: Record<Exclude<LoadStateQuadrant, 'recovery'>, string> = {
  strain: 'var(--color-quadrant-high-energy-low-pleasantness)',
  ease: 'var(--color-quadrant-low-energy-high-pleasantness)',
  low: 'var(--color-quadrant-low-energy-low-pleasantness)',
  neutral: 'rgb(var(--sky-500))',
}

export function recoveryCss(shade: ColorOptions['recoveryShade'] = 'sky-600'): string {
  return `rgb(var(--${shade}))`
}

export function quadrantCss(quadrant: LoadStateQuadrant, options: ColorOptions = {}): string {
  return quadrant === 'recovery' ? recoveryCss(options.recoveryShade) : QUADRANT_CSS[quadrant]
}

/** Kolor tekstu czytelny na tle ćwiartki. */
export function quadrantInkCss(quadrant: LoadStateQuadrant): string {
  switch (quadrant) {
    case 'recovery': return 'white'
    case 'strain': return 'var(--color-quadrant-high-energy-low-pleasantness-text)'
    case 'ease': return 'var(--color-quadrant-low-energy-high-pleasantness-text)'
    case 'low': return 'var(--color-quadrant-low-energy-low-pleasantness-text)'
    default: return 'white'
  }
}

const isLow = (v: Rating) => v <= 2
const isHigh = (v: Rating) => v >= 4

/**
 * Ćwiartka pary. Trójka stanu = brak werdyktu (środek). Trójka obciążenia przy
 * rozstrzygniętym stanie: w trybie `blend` zwracamy ćwiartkę po stronie stanu z flagą
 * `blended`, żeby kolor zmieszać z sąsiadem; w trybie `strict` — środek.
 */
export function classifyPair(load: MaybeRating, state: MaybeRating, midpoint: MidpointMode = 'blend'): {
  quadrant: LoadStateQuadrant
  /** Para sąsiadów do zmieszania (tylko gdy obciążenie = 3 i tryb blend). */
  blend?: [LoadStateQuadrant, LoadStateQuadrant]
} {
  if (load == null || state == null) return { quadrant: 'neutral' }
  if (state === 3) return { quadrant: 'neutral' }
  const good = isHigh(state)
  if (load === 3) {
    if (midpoint === 'strict') return { quadrant: 'neutral' }
    return good
      ? { quadrant: 'ease', blend: ['ease', 'recovery'] }
      : { quadrant: 'low', blend: ['low', 'strain'] }
  }
  if (isHigh(load)) return { quadrant: good ? 'recovery' : 'strain' }
  if (isLow(load)) return { quadrant: good ? 'ease' : 'low' }
  return { quadrant: 'neutral' }
}

/** Gotowy kolor CSS dla pary (z mieszaniem dla trójki obciążenia). */
export function pairColor(load: MaybeRating, state: MaybeRating, options: ColorOptions = {}): string {
  const { quadrant, blend } = classifyPair(load, state, options.midpoint)
  if (blend) {
    return `color-mix(in oklab, ${quadrantCss(blend[0], options)} 50%, ${quadrantCss(blend[1], options)})`
  }
  return quadrantCss(quadrant, options)
}

export function pairInk(load: MaybeRating, state: MaybeRating, options: ColorOptions = {}): string {
  const { quadrant, blend } = classifyPair(load, state, options.midpoint)
  if (blend && blend[1] === 'recovery') return 'rgb(var(--sky-800))'
  return quadrantInkCss(quadrant)
}

/** Zdanie werdyktu w tonie neutralnym — bez „sukces / porażka”. */
export function verdictSentence(area: AreaKey, load: MaybeRating, state: MaybeRating): string {
  const name = AREA_LABELS[area]
  const { quadrant } = classifyPair(load, state, 'strict')
  const loadWord = load == null ? null : isHigh(load) ? 'ciężki' : isLow(load) ? 'lekki' : 'zwykły'
  switch (quadrant) {
    case 'recovery': return `${name}: ciężki tydzień, a kończysz go w dobrym stanie.`
    case 'strain': return `${name}: ciężki tydzień i czuć to na koniec.`
    case 'ease': return `${name}: lekki tydzień, dobry stan.`
    case 'low': return `${name}: lekki tydzień, a stan słaby — przyczyna leży raczej poza tym tygodniem.`
    default:
      if (load == null || state == null) return `${name}: brak pełnej oceny.`
      if (state === 3) return `${name}: ${loadWord} tydzień, stan bez wyraźnego wychylenia.`
      return `${name}: zwykłe obciążenie, ${isHigh(state) ? 'dobry' : 'słaby'} stan.`
  }
}

// ---------------------------------------------------------------------------
// Próbka serii tygodni — autorska „opowieść”, żeby wizualizacja miała fabułę.
// ---------------------------------------------------------------------------

export interface WeekPoint {
  weekRef: string
  label: string
  load: MaybeRating
  state: MaybeRating
}

export type AreaSeries = Record<AreaKey, WeekPoint[]>

const R = (v: number): Rating => Math.max(1, Math.min(5, Math.round(v))) as Rating

/**
 * 24 tygodnie na obszar. Każdy obszar ma inny przebieg:
 *  - ciało: cykl treningowy → przeciążenie → regeneracja,
 *  - emocje: spokojna jesień → burzliwy grudzień → wyrównanie,
 *  - zadania: rosnące tempo, jeden tydzień unikania (lekko · słabo), sprint,
 *  - bliscy: intensywne wsparcie z dobrą więzią, potem konflikt.
 */
export function buildStorySeries(): AreaSeries {
  const weeks = Array.from({ length: 24 }, (_, i) => {
    const d = new Date(Date.UTC(2026, 2, 30 + i * 7))
    const weekRef = `2026-W${String(14 + i).padStart(2, '0')}`
    const label = `${d.getUTCDate()}.${String(d.getUTCMonth() + 1).padStart(2, '0')}`
    return { weekRef, label }
  })
  const body: [number, number][] = [
    [2, 4], [3, 4], [3, 4], [4, 4], [4, 4], [5, 3], [5, 2], [5, 2], [4, 2], [2, 2], [2, 3], [2, 4],
    [3, 4], [4, 5], [4, 5], [5, 5], [4, 4], [5, 4], [3, 3], [2, 4], [3, 4], [4, 4], [4, 5], [4, 4],
  ]
  const emotions: [number, number][] = [
    [2, 4], [2, 4], [2, 5], [3, 4], [2, 4], [3, 3], [4, 3], [5, 2], [5, 1], [4, 2], [4, 3], [3, 3],
    [3, 4], [2, 4], [2, 3], [1, 2], [1, 2], [2, 3], [3, 4], [4, 4], [4, 5], [3, 4], [2, 4], [2, 4],
  ]
  const tasks: [number, number][] = [
    [3, 3], [3, 4], [4, 4], [4, 3], [5, 3], [5, 2], [4, 2], [2, 1], [1, 1], [3, 2], [4, 3], [4, 4],
    [5, 4], [5, 4], [4, 5], [3, 4], [3, 4], [2, 4], [2, 5], [3, 4], [4, 4], [5, 3], [5, 2], [4, 3],
  ]
  const closeOnes: [number, number][] = [
    [3, 4], [4, 5], [4, 5], [5, 4], [4, 4], [3, 4], [2, 4], [2, 3], [3, 3], [4, 2], [5, 1], [4, 2],
    [3, 3], [2, 3], [2, 4], [3, 4], [3, 5], [4, 5], [4, 4], [2, 4], [1, 3], [1, 2], [2, 3], [3, 4],
  ]
  const wrap = (pairs: [number, number][]): WeekPoint[] =>
    weeks.map((w, i) => ({ ...w, load: R(pairs[i][0]), state: R(pairs[i][1]) }))
  return { body: wrap(body), emotions: wrap(emotions), tasks: wrap(tasks), closeOnes: wrap(closeOnes) }
}

/** Wszystkie 25 par do legendy: wiersze stan 5→1, kolumny obciążenie 1→5. */
export function legendGrid(): { load: Rating; state: Rating }[][] {
  return ([5, 4, 3, 2, 1] as Rating[]).map(state => ([1, 2, 3, 4, 5] as Rating[]).map(load => ({ load, state })))
}
