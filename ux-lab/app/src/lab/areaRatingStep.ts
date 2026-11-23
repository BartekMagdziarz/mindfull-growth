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
  load: ['delegacja', 'mało snu', 'termin oferty', 'choroba w domu', 'dwa treningi', 'remont', 'nadgodziny', 'wyjazd', 'goście w domu', 'egzamin'],
  state: ['napięcie', 'spokój', 'ból pleców', 'wolny weekend', 'wdzięczność', 'zmęczenie', 'lekkość', 'bezsenność', 'rozdrażnienie'],
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

/**
 * Istniejące tagi pasujące do wpisywanego tekstu: bez już wybranych, najpierw
 * zaczynające się od tekstu, potem zawierające go; pusty tekst zwraca całą bazę.
 */
export function matchTags(pool: string[], chosen: string[], query: string, limit = Infinity): string[] {
  const lower = (value: string) => value.toLocaleLowerCase('pl')
  const taken = new Set(chosen.map(lower))
  const free = pool.filter(tag => !taken.has(lower(tag)))
  const needle = lower(query.trim())
  if (!needle) return free.slice(0, limit)
  const starts = free.filter(tag => lower(tag).startsWith(needle))
  const inside = free.filter(tag => !lower(tag).startsWith(needle) && lower(tag).includes(needle))
  return [...starts, ...inside].slice(0, limit)
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

/** Miejsce skali o `delta` dalej; poniżej 1 ocena znika, bez oceny ruch w prawo zaczyna od 1 (jak `DsRatingStack`). */
export function steppedRating(current: MaybeRating, delta: number): MaybeRating {
  if (current == null) return delta > 0 ? 1 : null
  const next = current + delta
  if (next < 1) return null
  return Math.min(5, next) as Rating
}

/** Runda 4: czy minione tygodnie są rozwinięte (domyślnie schowane). */
export type PastFold = 'closed' | 'open'
export const PAST_FOLDS: readonly { id: PastFold; label: string }[] = [
  { id: 'closed', label: 'Schowane' },
  { id: 'open', label: 'Rozwinięte' },
]

export type VariantId = 'k' | 'h' | 'i' | 'j' | 'g' | 'e' | 'f' | 'a' | 'b' | 'c' | 'd'
export const VARIANT_IDS: readonly VariantId[] = ['k', 'h', 'i', 'j', 'g', 'e', 'f', 'a', 'b', 'c', 'd']
export interface VariantDef {
  id: VariantId
  /** 5 = kafel wyniku i pola z licznikami, 4 = suwaki przy znaku, 3 = uchwyty na znaku, 2 = duży znak z ocenami obok, 1 = pierwsze cztery podejścia. */
  round: 1 | 2 | 3 | 4 | 5
  title: string
  lead: string
  sets: string
  history: string
  risk: string
}
export const VARIANTS: readonly VariantDef[] = [
  {
    id: 'k',
    round: 5,
    title: 'Kafel wyniku i dwa pola z licznikami',
    lead: 'Na górze kafel wyniku: ikona, nazwa obszaru, „Minione tygodnie” i żywy znak tygodnia. Pod nim dwa równe pola, „Obciążenie” i „Stan”. Każde ma tytuł, licznik z samą dużą cyfrą i strzałkami pod kursorem, a na dole tagi z dwoma małymi przyciskami: „+” i strzałką w dół.',
    sets: 'Licznik w polu osi: strzałki po bokach cyfry, pod nimi słowa końców skali. „+” otwiera pole wpisywania; podczas pisania pod polem wyskakują pasujące istniejące tagi. Strzałka w dół rozwija bazę wcześniejszych tagów tej osi.',
    history: 'Schowana w kaflu wyniku. Rozwija się od razu pod znakiem, na jego skali; pola zjeżdżają niżej.',
    risk: 'Cyfra na wierzchu to wyjątek od zasady „zero liczb”. Strzałki licznika widać dopiero pod kursorem — pusty licznik pokazuje je od razu. Przy dużej bazie rozwinięta lista tagów wydłuża pole.',
  },
  {
    id: 'h',
    round: 4,
    title: 'Suwaki pod znakiem, trzy furtki',
    lead: 'Znak stoi na środku, zaraz pod nim dwa suwaki tej samej szerokości: gałka „Obciążenia” stoi dokładnie pod końcem słupka, gałka „Stanu” pod kropką. Niżej jedna cicha linia z trzema furtkami: tag do obciążenia, tag do stanu, minione tygodnie.',
    sets: 'Dwa suwaki pod znakiem, na jego skali. Klik w tor przeskakuje, gałkę można przeciągnąć. Tagi dopisuje się w linii furtek; każda grupa ma znaczek swojej osi.',
    history: 'Schowana. „Minione tygodnie” rozwija pięć mniejszych znaków pod linią furtek, na tej samej skali.',
    risk: 'Tagi stoją dalej od suwaka, którego dotyczą — łączy je tylko znaczek osi. Rozwinięta historia jest oddzielona od dużego znaku suwakami.',
  },
  {
    id: 'i',
    round: 4,
    title: 'Dwie chmury obok siebie',
    lead: 'Pod znakiem dwie równe chmury: „Obciążenie” z lewej, „Stan” z prawej. Każda ma wszystko, co dotyczy jej osi: nazwę, suwak, słowa końców skali i swoje tagi. Krok wypełnia szerokość karty.',
    sets: 'Suwak w chmurze swojej osi, tagi tuż pod nim. Najechanie na chmurę budzi jej element na znaku.',
    history: 'Schowana. „Minione tygodnie” pod chmurami rozwija pięć znaków na skali dużego znaku.',
    risk: 'Suwaki są o połowę krótsze niż znak, więc gałka nie stoi pod elementem, który przesuwa. Związek trzymają znaczek osi, kolor i podświetlenie.',
  },
  {
    id: 'j',
    round: 4,
    title: 'Suwaki nad znakiem, historia pod nim',
    lead: 'Na górze dwa suwaki z tagami w linii nazwy, pod nimi wynik: kafel obszaru jak w kalendarzu, tylko duży. Gałki stoją dokładnie nad końcem słupka i nad kropką. Minione tygodnie rozwijają się w tym samym kaflu, od razu pod znakiem.',
    sets: 'Dwa suwaki nad znakiem, na jego skali. Tagi po prawej w linii nazwy osi.',
    history: 'Schowana. Rozwija się bezpośrednio pod dużym znakiem — porównanie bez przeskoku wzrokiem.',
    risk: 'Znak nie jest pierwszą rzeczą pod pytaniem; ręka i kursor pracują nad wykresem. Dużo tagów wydłuża linię nazwy.',
  },
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
  { id: '1', title: 'Przyciski tagów pod chipami — zdecydowane', body: 'User 22.11: przyciski zostają w osobnym wierszu pod chipami, zawsze na środku na dole pola. W spoczynku są wyblakłe, pod kursorem pola stają się chmurami — tak samo jak strzałki licznika. W pustym polu są wyraźne od razu.' },
  { id: '2', title: 'Podpowiedzi podczas pisania', body: 'Dymek pod polem pokazuje do pięciu istniejących tagów: najpierw te, które zaczynają się od wpisanego tekstu, potem te, które go zawierają. Strzałki w górę i w dół wybierają, Enter dopisuje wybrany albo wpisany tekst, Esc zamyka.' },
  { id: '3', title: 'Baza tagów pod strzałką', body: 'Rozwinięta baza pokazuje wcześniejsze tagi tej osi bez już wybranych; klik dopisuje, baza zostaje otwarta. Gdy baza jest otwarta, wpisywany tekst filtruje ją w miejscu, bez dymka. Do rozstrzygnięcia: ile tagów pokazać naraz przy dużej bazie.' },
  { id: '4', title: 'Kiedy widać strzałki licznika', body: 'Po ustawieniu oceny strzałki budzą się pod kursorem i przy fokusie z klawiatury. Dopóki oś nie ma oceny, widać je od razu razem ze słowami końców skali. Strzałka w lewo przy 1 czyści ocenę.' },
  { id: '5', title: 'Rozwinięta historia przesuwa pola', body: 'Historia rozwija się w kaflu wyniku, więc pola z licznikami zjeżdżają o jej wysokość. Do rozstrzygnięcia: czy aplikacja pamięta rozwinięcie między czterema krokami obszarów.' },
  { id: '6', title: 'Co to znaczy dla wspólnego znaku', body: 'Przy wdrożeniu `LoadStateTrack` dostaje rozmiar 48 px, płynne przejście, rysowanie jednej oceny, cień podglądu i podświetlenie elementu. Licznik oceny to kandydat na odmianę `mg-v2-stepper`, nie nową anatomię.' },
]
