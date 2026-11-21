/**
 * Koncept „Krok obszaru w refleksji tygodnia” (2026-11-16, runda 1).
 *
 * Po wdrożeniu znaku „Obciążenie i stan” (leżący słupek + kropka) krok obszaru
 * w rytuale zaczyna się od kolumny dziesięciu tygodni historii, a dwa pionowe
 * słupki oceny zjeżdżają pod zgięcie karty. Scena pokazuje cztery podejścia na
 * tych samych danych: ustawianie obu ocen jest pierwsze, historia jest
 * dodatkiem, a tagi zostają osobno dla obciążenia i stanu.
 *
 * Czysta logika i dane próbek. Znak i kolory pochodzą z produktu
 * (`LoadStateTrack`, `loadStateTone`), teksty pytań z `locales/pl/planning.json`.
 */

import type { MaybeRating, Rating } from '@product/domain/loadState'

export type AxisKey = 'load' | 'state'
export const AXES: readonly AxisKey[] = ['load', 'state']
export const AXIS_TITLE: Record<AxisKey, string> = { load: 'Obciążenie', state: 'Stan' }

export interface AxisCopy {
  /** Pytanie osi — w produkcie pod „?”. */
  hint: string
  low: string
  high: string
}
export interface AreaDef {
  key: AreaKey
  label: string
  icon: string
  /** Pytanie w nagłówku kroku (w produkcie to pytanie osi „Stan”). */
  question: string
  load: AxisCopy
  state: AxisCopy
}
export type AreaKey = 'body' | 'emotions' | 'tasks' | 'closeOnes'

export const AREAS: readonly AreaDef[] = [
  {
    key: 'body',
    label: 'Ciało',
    icon: 'fitness_center',
    question: 'Z jaką energią kończysz ten tydzień?',
    load: { hint: 'Jak bardzo ten tydzień obciążał Twoje ciało?', low: 'Lekko', high: 'Ciężko' },
    state: { hint: 'Z jaką energią kończysz ten tydzień?', low: 'Wyczerpanie', high: 'Pełnia energii' },
  },
  {
    key: 'emotions',
    label: 'Emocje',
    icon: 'favorite',
    question: 'W jakim nastroju kończysz ten tydzień?',
    load: { hint: 'Jak mocno rzeczy poruszały Cię w tym tygodniu?', low: 'Ledwo', high: 'Bardzo mocno' },
    state: { hint: 'W jakim nastroju kończysz ten tydzień?', low: 'Niski', high: 'Świetny' },
  },
  {
    key: 'tasks',
    label: 'Zadania',
    icon: 'checklist',
    question: 'Czy jesteś na bieżąco z zadaniami?',
    load: { hint: 'Ile pracy faktycznie udało się przerobić w tym tygodniu?', low: 'Niewiele', high: 'Bardzo dużo' },
    state: { hint: 'Czy jesteś na bieżąco z zadaniami — bez poczucia przytłoczenia?', low: 'Przytłoczenie', high: 'Pełna kontrola' },
  },
  {
    key: 'closeOnes',
    label: 'Bliscy',
    icon: 'diversity_1',
    question: 'Jak silną więź czujesz z bliskimi na koniec tygodnia?',
    load: { hint: 'Ile poszło do bliskich i ile Cię to kosztowało w tym tygodniu?', low: 'Niewiele', high: 'Bardzo dużo' },
    state: { hint: 'Jak silną więź czujesz z bliskimi na koniec tygodnia?', low: 'Oddalenie', high: 'Bliskość' },
  },
]
export const AREA_KEYS = AREAS.map(area => area.key)
export const areaOf = (key: AreaKey): AreaDef => AREAS.find(area => area.key === key) ?? AREAS[0]

/** Pytanie kroku, gdy cztery obszary dzielą jeden ekran (wariant D). */
export const MERGED_QUESTION = 'Ile ten tydzień wymagał i z czym go kończysz?'

/** Kropki stopki rytuału: osiem kroków dziś, pięć, gdy obszary dzielą jeden. */
export const STEPS_SEPARATE = ['Przegląd', 'Ciało', 'Emocje', 'Zadania', 'Bliscy', 'Ścieżka', 'Kotwice', 'Dziennik'] as const
export const STEPS_MERGED = ['Przegląd', 'Obszary', 'Ścieżka', 'Kotwice', 'Dziennik'] as const

// ── szkic ocen ─────────────────────────────────────────────────────────────

export interface AreaDraft {
  load: MaybeRating
  state: MaybeRating
  tags: Record<AxisKey, string[]>
}
export type Draft = Record<AreaKey, AreaDraft>

export type FillId = 'empty' | 'partial' | 'rated'
export const FILLS: readonly { id: FillId; label: string }[] = [
  { id: 'rated', label: 'Oceniony' },
  { id: 'partial', label: 'W połowie' },
  { id: 'empty', label: 'Pusty' },
]

const pair = (load: MaybeRating, state: MaybeRating, loadTags: string[] = [], stateTags: string[] = []): AreaDraft => ({
  load,
  state,
  tags: { load: loadTags, state: stateTags },
})

/** Stan startowy sceny. „W połowie”: obciążenie ustawione, stan jeszcze nie. */
export function draftFor(fill: FillId): Draft {
  if (fill === 'empty') return { body: pair(null, null), emotions: pair(null, null), tasks: pair(null, null), closeOnes: pair(null, null) }
  if (fill === 'partial') {
    return {
      body: pair(3, null, ['mało snu']),
      emotions: pair(4, null),
      tasks: pair(null, null),
      closeOnes: pair(null, null),
    }
  }
  return {
    body: pair(3, 4, ['mało snu', 'dwa treningi'], ['wolny weekend']),
    emotions: pair(4, 2, ['rozmowa z szefem'], ['napięcie']),
    tasks: pair(5, 3, ['termin oferty']),
    closeOnes: pair(2, 5, [], ['wieczór we dwoje']),
  }
}

export const isRated = (draft: AreaDraft) => draft.load != null && draft.state != null

/** Klik w ustawioną ocenę ją czyści — jak w `DsRatingStack`. */
export function toggled(current: MaybeRating, value: number): MaybeRating {
  return current === value ? null : (Math.max(1, Math.min(5, value)) as Rating)
}

// ── historia ───────────────────────────────────────────────────────────────

export interface PastWeek {
  /** Poniedziałek tygodnia, jak w osi macierzy kalendarza. */
  label: string
  load: MaybeRating
  state: MaybeRating
}
export const CURRENT_WEEK_LABEL = '9.11'
const MONDAYS = ['14.09', '21.09', '28.09', '5.10', '12.10', '19.10', '26.10', '2.11']
const weeks = (pairs: ([Rating, Rating] | null)[]): PastWeek[] =>
  pairs.map((item, index) => ({ label: MONDAYS[index], load: item?.[0] ?? null, state: item?.[1] ?? null }))

/** Osiem wcześniejszych tygodni, od najstarszego; `null` = tydzień bez refleksji. */
export const HISTORY: Record<AreaKey, PastWeek[]> = {
  body: weeks([[4, 3], [3, 3], [4, 2], null, [3, 4], null, [2, 4], [4, 3]]),
  emotions: weeks([[3, 4], [4, 2], [5, 1], null, [3, 3], null, [2, 2], [3, 4]]),
  tasks: weeks([[5, 4], [4, 4], [5, 2], null, [4, 3], null, [3, 5], [4, 4]]),
  closeOnes: weeks([[2, 4], [3, 5], [4, 3], null, [2, 2], null, [1, 3], [3, 4]]),
}

export type HistoryMode = 'rated' | 'recent'
export const HISTORY_MODES: readonly { id: HistoryMode; label: string }[] = [
  { id: 'rated', label: 'Tylko ocenione tygodnie' },
  { id: 'recent', label: 'Ostatnie tygodnie z lukami' },
]

/**
 * Ostatnie `count` tygodni obszaru, od najstarszego. `rated` pomija tygodnie
 * bez refleksji (pusty tor nic nie mówi przy ocenianiu), `recent` zostawia luki
 * tak, jak rysuje je macierz kalendarza.
 */
export function pastWeeks(area: AreaKey, mode: HistoryMode, count: number): PastWeek[] {
  const all = HISTORY[area]
  const pool = mode === 'rated' ? all.filter(week => week.load != null && week.state != null) : all
  return pool.slice(-count)
}

// ── tagi ───────────────────────────────────────────────────────────────────

/** Wcześniej użyte tagi osi (w produkcie: z innych obszarów i tygodni). */
export const TAG_POOL: Record<AxisKey, string[]> = {
  load: ['delegacja', 'mało snu', 'termin oferty', 'choroba w domu', 'dwa treningi', 'remont'],
  state: ['napięcie', 'spokój', 'ból pleców', 'wolny weekend', 'wdzięczność'],
}

/** Podpowiedzi: najpierw tagi tej osi z innych obszarów tygodnia, potem wcześniejsze; bez już wybranych. */
export function tagSuggestions(draft: Draft, area: AreaKey, axis: AxisKey): string[] {
  const chosen = new Set(draft[area].tags[axis])
  const out: string[] = []
  const push = (tag: string) => {
    if (!chosen.has(tag) && !out.includes(tag)) out.push(tag)
  }
  for (const key of AREA_KEYS) if (key !== area) draft[key].tags[axis].forEach(push)
  TAG_POOL[axis].forEach(push)
  return out
}

const fold = (value: string) => value.trim().replace(/\s+/g, ' ')
/** Dopisuje tag (przycięty, ≤ 32 znaki), jeśli jeszcze go nie ma. */
export function withTag(tags: string[], raw: string): string[] {
  const tag = fold(raw).slice(0, 32)
  if (!tag || tags.some(entry => entry.toLocaleLowerCase('pl') === tag.toLocaleLowerCase('pl'))) return tags
  return [...tags, tag]
}

// ── mapa (wariant C) ───────────────────────────────────────────────────────

export interface MapCell {
  load: Rating
  state: Rating
  /** Wcześniejsze tygodnie, które wypadły w tym polu. */
  past: PastWeek[]
}
const RATINGS: readonly Rating[] = [1, 2, 3, 4, 5]
/** 25 pól wierszami: stan od 5 (góra) do 1, obciążenie od 1 (lewo) do 5. */
export function mapCells(past: PastWeek[]): MapCell[] {
  return [...RATINGS].reverse().flatMap(state =>
    RATINGS.map(load => ({ load, state, past: past.filter(week => week.load === load && week.state === state) }))
  )
}

// ── opis wariantów i decyzje ───────────────────────────────────────────────

/** Runda 2: układ kroku z dużym znakiem i sposób ustawiania oceny. */
export type HeroLayout = 'stack' | 'side'
export type ControlStyle = 'dots' | 'steps'
export const CONTROL_STYLES: readonly { id: ControlStyle; label: string }[] = [
  { id: 'dots', label: 'Kropki 1–5' },
  { id: 'steps', label: 'Przyciski − / +' },
]

/** Runda 3: gdzie stoi nazwa osi — na uchwycie czy z lewej jak podpis wiersza. */
export type HandleLabels = 'chip' | 'row'
export const HANDLE_LABELS: readonly { id: HandleLabels; label: string }[] = [
  { id: 'chip', label: 'Na uchwycie' },
  { id: 'row', label: 'Z lewej, uchwyt bez słów' },
]

/**
 * Miejsce skali (1–5) pod kursorem na torze znaku: `offset` od lewej krawędzi
 * toru, `width` toru, `size` = wysokość znaku (środki skrajnych miejsc leżą pół
 * wysokości od krawędzi).
 */
export function stopFromOffset(offset: number, width: number, size: number): Rating {
  const stepWidth = (width - size) / 4
  if (stepWidth <= 0) return 1
  const index = Math.round((offset - size / 2) / stepWidth)
  return (Math.max(0, Math.min(4, index)) + 1) as Rating
}

export type VariantId = 'g' | 'e' | 'f' | 'a' | 'b' | 'c' | 'd'
export const VARIANT_IDS: readonly VariantId[] = ['g', 'e', 'f', 'a', 'b', 'c', 'd']
export interface VariantDef {
  id: VariantId
  /** 3 = uchwyty na znaku, 2 = duży znak z ocenami obok, 1 = pierwsze cztery podejścia. */
  round: 1 | 2 | 3
  title: string
  lead: string
  sets: string
  history: string
  risk: string
}
export const VARIANTS: readonly VariantDef[] = [
  {
    id: 'g',
    round: 3,
    title: 'Uchwyty na znaku',
    lead: 'Kontrolka stoi na wykresie, nie obok. Uchwyt „Stan” siedzi nad kropką, uchwyt „Obciążenie” pod końcem słupka; oba wskazują swój element i jadą razem z nim. Strzałki przesuwają o jeden stopień, klik w miejsce skali przeskakuje, a kropkę i koniec słupka można też po prostu złapać i przeciągnąć.',
    sets: 'Dwa uchwyty przypięte do znaku. Pod kursorem znak pokazuje cień tego, co się zmieni. Tagi stoją w wierszu swojej osi, po prawej.',
    history: 'Pięć wcześniejszych tygodni pod torem obciążenia, na tej samej skali co duży znak.',
    risk: 'Nazwa osi porusza się razem z uchwytem. Uchwyt bez oceny czeka na początku toru jako duch. Przeciąganie to nowy gest w aplikacji.',
  },
  {
    id: 'e',
    round: 2,
    title: 'Duży znak, oceny pod nim',
    lead: 'Głównym elementem kroku jest znak z kalendarza w dużym rozmiarze. Każde kliknięcie w kropki pod nim zmienia długość słupka, położenie kropki i kolor. Niżej stoją wcześniejsze tygodnie tym samym znakiem, mniejszym.',
    sets: 'Dwa wiersze kropek 1–5 pod znakiem, takie jak pod kursorem na kaflu w kalendarzu. Tagi w linii pod każdą skalą.',
    history: 'Pięć wcześniejszych tygodni pod ocenami, na tej samej skali co duży znak.',
    risk: 'Między dużym znakiem a historią stoją oceny i tagi, więc porównanie wymaga przeskoku wzrokiem.',
  },
  {
    id: 'f',
    round: 2,
    title: 'Duży znak i historia razem, oceny obok',
    lead: 'Duży znak i wcześniejsze tygodnie tworzą jedną kolumnę wykresów, jak wiersze macierzy miesiąca z powiększonym pierwszym. Oceny i tagi stoją w cichej kolumnie po prawej.',
    sets: 'Te same kropki i tagi, w kolumnie obok znaku.',
    history: 'Bezpośrednio pod dużym znakiem: stopnie obu rozmiarów stoją jeden pod drugim.',
    risk: 'Ocenę ustawia się obok wykresu, nie pod nim. Krok jest szerszy (944 px) i mniej symetryczny.',
  },
  {
    id: 'a',
    round: 1,
    title: 'Słupki najpierw',
    lead: 'Dwa słupki chmurek zostają, ale stoją na górze. Historia przechodzi do wąskiej kolumny obok, a bieżący tydzień dorysowuje się w niej na żywo.',
    sets: 'Słupek chmurek z produktu (`DsRatingStack`), oba w kolorze pary ocen. Tagi pod słupkiem jako chipy.',
    history: 'Kolumna po prawej, bez własnego pola. Ostatni wiersz to ten tydzień.',
    risk: 'Pionowe słupki i leżący znak to nadal dwa języki. Łączy je tylko wiersz „9.11”.',
  },
  {
    id: 'b',
    round: 1,
    title: 'Znak w dwóch warstwach',
    lead: 'Znak rozłożony na części: wiersz chmurek to długość słupka, wiersz dysków to położenie kropki. Pod nimi obie warstwy składają się w znak tygodnia, a niżej stoją wcześniejsze tygodnie na tej samej skali.',
    sets: 'Leżące chmurki dla obciążenia, dyski dla stanu. Tagi w tej samej linii co ocena.',
    history: 'Przedłużenie znaku w dół: cztery wcześniejsze tygodnie, od najnowszego.',
    risk: 'Leżący rząd chmurek to nowa odmiana `DsRatingStack`. Sam znak jest tu mały.',
  },
  {
    id: 'c',
    round: 1,
    title: 'Mapa tygodnia',
    lead: 'Jedno pole 5 × 5: w prawo obciążenie, w górę stan. Jedno kliknięcie ustawia obie oceny, a pole ma od razu kolor swojej pary.',
    sets: 'Kafel mapy. Obok znak tygodnia i dwie linie tagów.',
    history: 'Kropki wcześniejszych tygodni leżą w polach mapy, bez osobnego elementu.',
    risk: 'Najbardziej „matematyczny” widok. Nie da się ocenić jednej osi, a 25 pól wymaga celowania.',
  },
  {
    id: 'd',
    round: 1,
    title: 'Cztery kafle, jeden krok',
    lead: 'Kafle z karty tygodnia w kalendarzu, tylko do wypełnienia. Cztery kroki rytuału stają się jednym, a kafel przybiera kolor pary w trakcie oceniania.',
    sets: 'Dwa wiersze kropek 1–5, jak pod kursorem w kalendarzu. Tagi pod każdym wierszem.',
    history: 'Pod kursorem na znaku kafla: dymek z czterema wcześniejszymi tygodniami.',
    risk: 'Znika pytanie osobne dla obszaru i chwila skupienia na jednym. Osiem linii tagów na ekranie. Zmienia decyzję o czterech osobnych ekranach (7.09).',
  },
]
export const variantOf = (id: VariantId): VariantDef => VARIANTS.find(item => item.id === id) ?? VARIANTS[0]

export const decisions: readonly { id: string; title: string; body: string }[] = [
  { id: '1', title: 'Nazwa na uchwycie czy z lewej', body: 'Na uchwycie: podpis leży na tym, co zmienia, i nie da się go pomylić, ale tekst się porusza. Z lewej: spokojniej, uchwyt ma same strzałki, a oś nazywa podpis wiersza. Przełącznik „Podpis” pokazuje obie wersje.' },
  { id: '2', title: 'Trzy gesty czy mniej', body: 'Strzałki (krok), klik w miejsce skali (skok) i przeciąganie (kropka, koniec słupka, uchwyt). Wszystkie robią to samo. Jeśli przeciąganie nie pasuje do aplikacji, zostają dwa pierwsze.' },
  { id: '3', title: 'Stan nad znakiem, obciążenie pod', body: 'Uchwyt stanu wskazuje kropkę z góry, uchwyt obciążenia koniec słupka z dołu, więc nie wchodzą na siebie przy tej samej ocenie. Kolejność od góry zgadza się z pytaniem kroku, które dotyczy stanu.' },
  { id: '4', title: 'Uchwyt bez oceny', body: 'Dopóki oś nie ma oceny, uchwyt czeka na początku toru jako duch, a miejsca skali są wyraźniejsze. Pierwszy klik w miejsce albo strzałka w prawo ustawia ocenę.' },
  { id: '5', title: 'Ile historii i co z lukami', body: 'Scena pokazuje pięć tygodni, domyślnie tylko ocenione. Przełącznik „Historia” zostawia tygodnie bez refleksji jako puste tory, tak jak macierz miesiąca.' },
  { id: '6', title: 'Co to znaczy dla wspólnego znaku', body: 'Przy wdrożeniu `LoadStateTrack` dostaje rozmiar 48 px, płynne przejście, rysowanie jednej oceny i cień podglądu. Uchwyty z torami to nowa anatomia tego kroku — jeden konsument, więc żyje w stylach rytuału.' },
]
