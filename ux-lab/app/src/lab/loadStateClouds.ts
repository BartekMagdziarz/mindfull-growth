/**
 * Koncept „Obciążenie i stan jako chmury” (2026-11-14).
 *
 * Wstęga (ołówek + akwarela + papier w linie) nie pasuje do reszty widoku
 * miesiąca. Rundy 1–3 doszły do: macierz we własnym polu karty, leżący płaski
 * słupek o długości obciążenia, kropka w miejscu stanu. Runda 4 (wybory usera):
 * macierz obrócona — tygodnie w wierszach, obszary w kolumnach o wspólnej
 * skali — bez nici i bez przebiegu; kolory wyłącznie ze stopni palety
 * aplikacji; kropka stanu to „studnia wykonania” z Dzisiaj. Runda 5 (wybory
 * usera): kropka w kolorze słupka z zabarwionym polem; więcej stopni
 * natężenia, najmocniejsze tylko dla skrajnych ocen. Rundy 6–7: skok barwy
 * między stanem 3 a 2; konwencja kolorów jak w pickerze emocji (fiolet =
 * mało energii i słabo, róż = dużo energii i słabo), mieszanie dozwolone.
 * Runda 8: w „przejściu w słupku” stan 3 przy obciążeniu 2–4 zostaje
 * neutralny i lekko pozytywny. Czysta logika.
 */

import {
  AREA_KEYS,
  AREA_LABELS,
  buildStorySeries,
  classifyPair,
  QUADRANT_LABELS,
  type AreaKey,
  type MaybeRating,
  type Rating,
  type WeekPoint,
} from './weekLoadState'

export type CloudSize = 'narrow' | 'medium' | 'wide'
/**
 * Jak barwa przechodzi między dobrą a słabą stroną skali stanu. We wszystkich
 * schematach narożniki trzymają konwencję pickera emocji: lekko · dobrze jasny
 * błękit, ciężko · dobrze granat, lekko · źle fiolet, ciężko · źle róż.
 *   split — runda 5: stan 3–5 błękit, stan 1–2 fiolet / róż; ostra granica pod stanem 3,
 *   tint  — pomysł usera: wiersz stanu 3 zostaje błękitny, ale z domieszką koloru wiersza 2
 *           (fiolet przy lekkim, róż przy ciężkim tygodniu),
 *   fade  — przejście w słupku: w wierszu stanu 3 słupek zaczyna się błękitem, a kończy kolorem
 *           wiersza 2 — bez płaskiego fioletu, który daje zmieszanie błękitu z różem,
 *   map   — mapa ćwiartek: płynne mieszanie w obu osiach między czterema kolorami narożników.
 */
export type Scheme = 'tint' | 'fade' | 'map' | 'split'
/** Najmocniejszy róż — narożnik „obciążenie 5 · stan 1”. */
export type RosePeak = 'rose-500' | 'rose-400'
/**
 * Ile koloru wiersza 2 dostaje wiersz stanu 3 (schematy `tint` i `fade`):
 *   edges — runda 8: wyraźnie tylko przy obciążeniu 1 i 5, środek prawie czysty błękit,
 *   even  — runda 7: tyle samo przy każdym obciążeniu.
 */
export type TintProfile = 'edges' | 'even'
export type MonthPresetId = 'mixed' | 'hard' | 'calm'

export interface CloudLook {
  size: CloudSize
  scheme: Scheme
  peak: RosePeak
  profile: TintProfile
}

export const DEFAULT_LOOK: CloudLook = { size: 'wide', scheme: 'fade', peak: 'rose-500', profile: 'edges' }

/** Wybór koloru: schemat, szczyt różu i profil odcienia — bez rozmiaru. */
export type ColourLook = Pick<CloudLook, 'scheme' | 'peak' | 'profile'>

/** Grubość leżącego słupka w px. */
export const SIZE_PX: Record<CloudSize, number> = { narrow: 14, medium: 18, wide: 22 }

export const SCHEMES: { id: Scheme; name: string; rule: string }[] = [
  { id: 'split', name: 'Dziś: ostra granica (runda 5)', rule: 'Stan 3–5 błękit, stan 1–2 fiolet albo róż. Cała zmiana barwy przypada na krok 3→2.' },
  { id: 'tint', name: 'Odcień w stanie 3', rule: 'Twój pomysł: wiersz stanu 3 zostaje błękitny, ale w jednej trzeciej bierze kolor wiersza 2 — fiolet przy lekkim tygodniu, róż przy ciężkim.' },
  { id: 'fade', name: 'Przejście w słupku', rule: 'W wierszu stanu 3 słupek zaczyna się błękitem i kończy kolorem wiersza 2. Ciężki tydzień ma różowy koniec zamiast liliowego środka.' },
  { id: 'map', name: 'Mapa ćwiartek', rule: 'Kolor miesza się płynnie w obu osiach między czterema kolorami ćwiartek z pickera emocji. Żadnej granicy, także między fioletem a różem.' },
]

export const PROFILES: { id: TintProfile; name: string; rule: string }[] = [
  { id: 'edges', name: 'Tylko na skrajach', rule: 'Stan 3 przy obciążeniu 2–4 zostaje prawie czystym błękitem — zwykły tydzień czyta się lekko pozytywnie. Fiolet i róż pojawiają się dopiero przy obciążeniu 1 i 5.' },
  { id: 'even', name: 'Równo (runda 7)', rule: 'Każde obciążenie dostaje tyle samo koloru wiersza 2. Kroki są równe, ale zwykły tydzień wychodzi różowawy.' },
]

/**
 * Średni udział koloru wiersza 2 w wierszu stanu 3, dla obciążenia 1…5.
 * `even` = 35% wszędzie (kroki 4→3 i 3→2 równe). `edges` = pomysł usera
 * dosłownie: odcień na końcach, środek neutralny i lekko pozytywny.
 */
export const TINT_SHARE: Record<TintProfile, number[]> = {
  even: [0.35, 0.35, 0.35, 0.35, 0.35],
  edges: [0.35, 0.15, 0.08, 0.18, 0.35],
}
/** Jak daleko dochodzi koniec słupka w schemacie `fade`: dwa razy średni udział, a w rundzie 7 do samego koloru wiersza 2. */
const fadeEnd = (load: Rating, profile: TintProfile) => (profile === 'even' ? 1 : Math.min(1, TINT_SHARE.edges[load - 1] * 2))

type Rgb = [number, number, number]

/** Stopnie palety aplikacji (motyw `current`), z `src/styles/tokens.css`. */
const PALETTE = {
  'sky-200': [208, 225, 253],
  'sky-300': [181, 207, 247],
  'sky-400': [141, 182, 234],
  'sky-500': [94, 146, 216],
  'sky-600': [62, 110, 184],
  'rose-200': [250, 198, 210],
  'rose-300': [240, 168, 186],
  'rose-400': [229, 132, 156],
  'rose-500': [216, 95, 126],
  /** ćwiartka emocji „mało energii · nieprzyjemnie”: `-bottom` i kolor bazowy */
  'violet-soft': [220, 203, 230],
  violet: [205, 180, 219],
  /** `--mg-color-paper`: biel 80% na sky-100 */
  paper: [250, 252, 255],
} satisfies Record<string, Rgb>

// --- oklab: mieszanie i odległość liczone tak, jak oko widzi różnicę ---------
type Lab = [number, number, number]
const toLinear = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
const toGamma = (c: number) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055)

export function rgbToOklab([r8, g8, b8]: Rgb): Lab {
  const [r, g, b] = [r8, g8, b8].map(v => toLinear(v / 255))
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b)
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b)
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b)
  return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s]
}

function oklabToRgb([L, a, b]: Lab): Rgb {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3
  const lin = [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s]
  return lin.map(v => Math.round(Math.max(0, Math.min(1, toGamma(v))) * 255)) as Rgb
}

/** `t` = udział koloru `b` (0–1), mieszane w oklab. */
function mix(a: Rgb, b: Rgb, t: number): Rgb {
  if (t <= 0) return a
  if (t >= 1) return b
  const [x, y] = [rgbToOklab(a), rgbToOklab(b)]
  return oklabToRgb([x[0] + (y[0] - x[0]) * t, x[1] + (y[1] - x[1]) * t, x[2] + (y[2] - x[2]) * t])
}

/** Różnica dwóch kolorów w oklab × 100 (ok. 2 = ledwo widać, 10+ = wyraźnie inny kolor). */
export function colourDistance(a: Rgb, b: Rgb): number {
  const [x, y] = [rgbToOklab(a), rgbToOklab(b)]
  return Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2]) * 100
}

/** Obciążenie 1–2 razem, potem po jednym: 0 · 1 · 2 · 3. */
const loadBucket = (load: Rating) => (load <= 2 ? 0 : load - 2)
const pick = <T,>(items: T[], index: number) => items[Math.max(0, Math.min(index, items.length - 1))]

/** Runda 5: drabinki palety, natężenie = obciążenie + skrajność stanu. */
function splitRgb(load: Rating, state: Rating, peak: RosePeak): Rgb {
  const b = loadBucket(load)
  if (state >= 3) return PALETTE[pick(['sky-200', 'sky-200', 'sky-300', 'sky-400', 'sky-500', 'sky-600'] as const, b + (state - 3))]
  if (load <= 2) return state === 2 ? PALETTE['violet-soft'] : PALETTE.violet
  const rose = peak === 'rose-500' ? (['rose-200', 'rose-300', 'rose-400', 'rose-500'] as const) : (['rose-200', 'rose-200', 'rose-300', 'rose-400'] as const)
  return PALETTE[pick([...rose], load - 3 + (2 - state))]
}

/** Jak daleko obciążenie przesuwa kolor od „lekko” do „ciężko”: 1–2 blisko lekkiego końca, 4–5 blisko ciężkiego. */
const LOAD_SHIFT = [0, 0.15, 0.5, 0.85, 1]
/** Udział dobrej strony w kolorze dla stanu 1…5: środek dokładnie w połowie, sąsiedzi blisko swoich stron. */
const STATE_SHIFT = [0, 0.12, 0.5, 0.88, 1]
/** Ile papieru dostaje kolor dla stanu 1…5: skrajne stany pełne, środek o ton jaśniejszy. */
const WASH = [0, 0.2, 0.3, 0.2, 0]

/** Mapa ćwiartek: dwuliniowe mieszanie między czterema kolorami narożników. */
function mapRgb(load: Rating, state: Rating, peak: RosePeak): Rgb {
  const u = LOAD_SHIFT[load - 1]
  const bad = mix(PALETTE.violet, PALETTE[peak], u)
  const good = mix(PALETTE['sky-300'], PALETTE['sky-600'], u)
  return mix(mix(bad, good, STATE_SHIFT[state - 1]), PALETTE.paper, WASH[state - 1])
}

/** Kolor słupka jako RGB; `null`, gdy tydzień nie ma pełnej oceny. */
export function cloudRgb(load: MaybeRating, state: MaybeRating, look: ColourLook = DEFAULT_LOOK): Rgb | null {
  if (load == null || state == null) return null
  switch (look.scheme) {
    case 'split':
      return splitRgb(load, state, look.peak)
    case 'tint':
      if (state !== 3) return splitRgb(load, state, look.peak)
      return mix(splitRgb(load, 3, look.peak), splitRgb(load, 2, look.peak), TINT_SHARE[look.profile][load - 1])
    case 'fade':
      // średni kolor przejścia — dla kropki i dla pomiaru skoku; sam słupek rysuje `cloudFill`
      if (state !== 3) return splitRgb(load, state, look.peak)
      return mix(splitRgb(load, 3, look.peak), splitRgb(load, 2, look.peak), fadeEnd(load, look.profile) / 2)
    case 'map':
      return mapRgb(load, state, look.peak)
  }
}

const css = ([r, g, b]: Rgb) => `rgb(${r} ${g} ${b})`

/** Kolor słupka; tydzień bez pełnej oceny nie ma koloru (rysuje pusty tor). */
export function cloudColor(load: MaybeRating, state: MaybeRating, look: ColourLook = DEFAULT_LOOK): string {
  const rgb = cloudRgb(load, state, look)
  return rgb ? css(rgb) : 'var(--mg-color-paper)'
}

/**
 * Wypełnienie słupka. Zwykle jeden kolor; w schemacie `fade` wiersz stanu 3
 * to przejście wzdłuż słupka od dzisiejszego błękitu do koloru wiersza 2,
 * liczone w oklab w pięciu punktach.
 */
export function cloudFill(load: MaybeRating, state: MaybeRating, look: ColourLook = DEFAULT_LOOK): string {
  if (look.scheme !== 'fade' || load == null || state !== 3) return cloudColor(load, state, look)
  const [from, to] = [splitRgb(load, 3, look.peak), splitRgb(load, 2, look.peak)]
  const end = fadeEnd(load, look.profile)
  return `linear-gradient(90deg, ${[0, 0.25, 0.5, 0.75, 1].map(t => css(mix(from, to, t * end))).join(', ')})`
}

/**
 * Kropka stanu w kolorze słupka (decyzja usera, rundy 5–6): środek = kolor
 * słupka, bez przyciemniania; pole = papier zabarwiony tym samym kolorem.
 */
export function dotColors(load: MaybeRating, state: MaybeRating, look: ColourLook = DEFAULT_LOOK): { field: string; centre: string } {
  const rgb = cloudRgb(load, state, look)
  if (!rgb) return { field: 'var(--mg-color-paper)', centre: 'var(--mg-color-paper)' }
  return { field: css(mix(PALETTE.paper, rgb, 0.24)), centre: css(rgb) }
}

/**
 * Średnia różnica koloru między sąsiednimi stanami (5→4, 4→3, 3→2, 2→1), po
 * wszystkich obciążeniach. Miara tego, czy skok jest równy, czy tylko przesunięty.
 */
export function stateJumps(look: ColourLook): number[] {
  const loads: Rating[] = [1, 2, 3, 4, 5]
  return ([5, 4, 3, 2] as Rating[]).map(upper => {
    const total = loads.reduce((sum, load) => sum + colourDistance(cloudRgb(load, upper, look)!, cloudRgb(load, (upper - 1) as Rating, look)!), 0)
    return total / loads.length
  })
}

/** Krok koloru między stanem `upper` a stanem niżej przy jednym obciążeniu. */
export function stateJumpAt(load: Rating, upper: Rating, look: ColourLook): number {
  return colourDistance(cloudRgb(load, upper, look)!, cloudRgb(load, (upper - 1) as Rating, look)!)
}

/** Cztery kolory narożników — konwencja pickera emocji. */
export function cornerLegend(look: ColourLook): { label: string; css: string }[] {
  return [
    { label: 'lekko · dobrze', css: cloudColor(1, 5, look) },
    { label: 'ciężko · dobrze', css: cloudColor(5, 5, look) },
    { label: 'lekko · źle', css: cloudColor(1, 1, look) },
    { label: 'ciężko · źle', css: cloudColor(5, 1, look) },
  ]
}

export interface CloudPart {
  /** cloud = kolorowy słupek · track = tor całej skali · gap = tydzień bez refleksji */
  kind: 'cloud' | 'track' | 'gap'
  /** Oceny, w których środkach słupek zaczyna się i kończy (1–5). */
  from: number
  to: number
}

/** Części jednego słupka: tor skali i słupek od początku skali do obciążenia. */
export function cloudParts(load: MaybeRating, state: MaybeRating): CloudPart[] {
  if (load == null || state == null) return [{ kind: 'gap', from: 1, to: 5 }]
  return [
    { kind: 'track', from: 1, to: 5 },
    { kind: 'cloud', from: 1, to: load },
  ]
}

/** Jedno zdanie do podpowiedzi i aria — liczby tylko tutaj, nie na wierzchu. */
export function cloudTitle(area: AreaKey, weekLabel: string, load: MaybeRating, state: MaybeRating): string {
  const head = `${AREA_LABELS[area]} · ${weekLabel}`
  if (load == null || state == null) return `${head}: bez refleksji`
  return `${head}: obciążenie ${load}, stan ${state} · tydzień ${QUADRANT_LABELS[classifyPair(load, state).quadrant]}`
}

export interface MonthUnit {
  ref: string
  /** Poniedziałek tygodnia, `d.MM` — oś pod słupkami. */
  label: string
  /** Zakres jak w osi tabeli kalendarza. */
  range: string
}

export interface MonthPreset {
  id: MonthPresetId
  name: string
  title: string
  units: MonthUnit[]
  series: Record<AreaKey, WeekPoint[]>
  compass: (number | null)[]
}

type Pair = [number, number] | null

function wrap(units: MonthUnit[], pairs: Pair[]): WeekPoint[] {
  return units.map((unit, i) => {
    const pair = pairs[i]
    return { weekRef: unit.ref, label: unit.label, load: pair ? (pair[0] as Rating) : null, state: pair ? (pair[1] as Rating) : null }
  })
}

const OCTOBER: MonthUnit[] = [
  { ref: '2026-W40', label: '28.09', range: '28.09–04.10' },
  { ref: '2026-W41', label: '5.10', range: '05–11.10' },
  { ref: '2026-W42', label: '12.10', range: '12–18.10' },
  { ref: '2026-W43', label: '19.10', range: '19–25.10' },
  { ref: '2026-W44', label: '26.10', range: '26.10–01.11' },
]

function storyMonth(from: number, ranges: string[]): Pick<MonthPreset, 'units' | 'series'> {
  const story = buildStorySeries()
  const units = story.body.slice(from, from + 5).map((p, i) => ({ ref: p.weekRef, label: p.label, range: ranges[i] }))
  const series = Object.fromEntries(AREA_KEYS.map(area => [area, story[area].slice(from, from + 5)])) as Record<AreaKey, WeekPoint[]>
  return { units, series }
}

/**
 * Trzy miesiące do oceny czytelności:
 *  - mixed: pisany ręcznie, wszystkie ćwiartki, remisy i tydzień bez refleksji (jak październik w verify),
 *  - hard: maj z „opowieści” — przeciążenie ciała i emocji,
 *  - calm: sierpień z „opowieści” — spokojny.
 */
export function buildMonthPresets(): Record<MonthPresetId, MonthPreset> {
  return {
    mixed: {
      id: 'mixed',
      name: 'Mieszany, z luką',
      title: 'Październik 2026',
      units: OCTOBER,
      series: {
        body: wrap(OCTOBER, [[5, 2], [4, 4], [2, 4], null, [3, 4]]),
        emotions: wrap(OCTOBER, [[2, 2], [3, 2], [4, 5], null, [2, 5]]),
        tasks: wrap(OCTOBER, [[5, 3], [5, 4], [4, 4], null, [3, 3]]),
        closeOnes: wrap(OCTOBER, [[1, 4], [2, 3], [4, 2], null, [5, 5]]),
      },
      compass: [5, 3, 4, null, null],
    },
    hard: {
      id: 'hard',
      name: 'Trudny',
      title: 'Maj 2026',
      ...storyMonth(5, ['04–10.05', '11–17.05', '18–24.05', '25–31.05', '01–07.06']),
      compass: [2, 3, 3, 3, 2],
    },
    calm: {
      id: 'calm',
      name: 'Spokojny',
      title: 'Sierpień 2026',
      ...storyMonth(18, ['03–09.08', '10–16.08', '17–23.08', '24–30.08', '31.08–06.09']),
      compass: [4, 4, 4, 3, 4],
    },
  }
}

export const COMPASS_AXES = ['Balans', 'Sens', 'Rozwój', 'Zasady', 'Wpływ'] as const

export const decisions = [
  { id: 'D1', title: 'Konwencja jak w pickerze emocji', body: 'Decyzja usera (runda 7): fiolet znaczy w całej aplikacji coś smutniejszego (mało energii, słaby stan), róż wyższą aktywność przy słabym stanie. Wszystkie schematy trzymają cztery narożniki: lekko · dobrze jasny błękit, ciężko · dobrze granat, lekko · źle fiolet, ciężko · źle róż.' },
  { id: 'D2', title: 'Przejście w słupku', body: 'Wybór usera po rundzie 7. W wierszu stanu 3 słupek zaczyna się błękitem i kończy kolorem wiersza 2, więc błękit i róż nie mieszają się w płaski fiolet.' },
  { id: 'D3', title: 'Zwykły tydzień ma być neutralny i lekko pozytywny', body: 'Uwaga usera (runda 8): przy stanie 3 i obciążeniu 2–4 chce więcej neutralności, a parę 3 · 3 czyta jako lekko pozytywny sygnał — w rundzie 7 jej koniec był wręcz różowy. Teraz odcień zależy od obciążenia: przy 1 i 5 jak w rundzie 7, przy 2 i 4 słaby, przy 3 ledwo widoczny. Para 3 · 3 jest praktycznie tym samym bladym błękitem co przed zmianami.' },
  { id: 'D4', title: 'Cena przyjęta: w środku obciążenia skok wraca', body: 'Zaakceptowane przez usera 14.11 („zostaw neutralny”). Krok koloru 3→2 (różnica w oklab) przy obciążeniu 3: 8,7 w rundzie 5, 4,3 w rundzie 7, 8,0 teraz. Przy obciążeniu 5 zostaje złagodzony: 17,7 → 11,6. Średnio po obciążeniach kroki 4→3 / 3→2 to 6,1 / 7,7 (runda 5: 5,3 / 10,1). To świadomy wybór: między „zwykle i w porządku” a „zwykle i słabo” jest granica znaczenia, więc kolor ma prawo ją pokazać.' },
  { id: 'D5', title: 'Kropka i reszta bez zmian', body: 'Środek kropki = kolor słupka (w wierszu stanu 3: średni kolor przejścia), pole = papier zabarwiony tym kolorem; bez przyciemniania. Natężenie = obciążenie + skrajność stanu; najmocniejsze odcienie tylko dla par 5 · 5 i 5 · 1.' },
  { id: 'D6', title: 'Otwarte', body: 'W produkcie kolory byłyby gotowymi tokenami albo color-mix w oklab, a przejście — gradientem liczonym z tych samych kolorów. Dalej otwarte: spojrzenie tabeli „Oceny tygodni”, rok, ogon refleksji tygodnia, „Z tygodni”.' },
]
