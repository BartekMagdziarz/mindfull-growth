/**
 * Koncept „Pole oceny w widoku tygodnia” (2026-11-14, runda 1).
 *
 * Po wdrożeniu macierzy „Obciążenie i stan” karta podsumowania tygodnia
 * pokazuje jeden wiersz: cztery leżące słupki w polu 854 × 232 px. Osiem liczb
 * nie wypełnia takiego pola, a w bieżącym tygodniu (refleksja powstaje w
 * niedzielę) pole jest puste przez sześć dni. Scena pokazuje sześć kierunków
 * na tych samych danych: zmniejszyć pole, dać ocenie kontekst czasu, zmienić
 * jej układ albo dołożyć dane, których tabela pod kartą nie pokazuje.
 *
 * Czysta logika i dane próbek; znak (słupek + kropka) i kolory pochodzą z
 * produktu (`LoadStateTrack`, `loadStateTone`).
 */

import type { MaybeRating, Rating } from './weekLoadState'

export const AREAS = [
  { key: 'body', label: 'Ciało', icon: 'fitness_center' },
  { key: 'emotions', label: 'Emocje', icon: 'favorite' },
  { key: 'tasks', label: 'Zadania', icon: 'checklist' },
  { key: 'closeOnes', label: 'Bliscy', icon: 'diversity_1' },
] as const
export type AreaKey = (typeof AREAS)[number]['key']

export interface Pair {
  load: MaybeRating
  state: MaybeRating
}
export type AreaPairs = Record<AreaKey, Pair>

/** Ćwiartki pickera emocji — sufiks tokenów `--color-quadrant-*`. */
export type Quadrant =
  | 'high-energy-high-pleasantness'
  | 'high-energy-low-pleasantness'
  | 'low-energy-high-pleasantness'
  | 'low-energy-low-pleasantness'

const Q: Record<'hh' | 'hl' | 'lh' | 'll', Quadrant> = {
  hh: 'high-energy-high-pleasantness',
  hl: 'high-energy-low-pleasantness',
  lh: 'low-energy-high-pleasantness',
  ll: 'low-energy-low-pleasantness',
}

export interface DaySample {
  label: string
  date: number
  /** Jeden zapis emocji = jedna kropka w kolorze ćwiartki. */
  emotions: Quadrant[]
}
export interface WeekSample {
  id: WeekSampleId
  name: string
  /** Poniedziałek tygodnia w zapisie osi macierzy. */
  label: string
  pairs: AreaPairs
  /** Cztery wcześniejsze tygodnie, od najstarszego. */
  history: { label: string; pairs: AreaPairs }[]
  days: DaySample[]
  words: { label: string; quadrant: Quadrant }[]
  anchors: { key: 'good' | 'hard' | 'lesson'; label: string; icon: string; text: string }[]
  tiles: { label: string; pct: number | null }[]
}
export type WeekSampleId = 'mixed' | 'hard' | 'calm'

const pairs = (values: [number, number][]): AreaPairs =>
  Object.fromEntries(
    AREAS.map((area, i) => [area.key, { load: values[i][0] as Rating, state: values[i][1] as Rating }]),
  ) as AreaPairs
export const EMPTY_PAIRS: AreaPairs = Object.fromEntries(
  AREAS.map(area => [area.key, { load: null, state: null }]),
) as AreaPairs

const DAY_LABELS = ['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'So', 'Nd']
const days = (logs: (keyof typeof Q)[][]): DaySample[] =>
  DAY_LABELS.map((label, i) => ({ label, date: 2 + i, emotions: (logs[i] ?? []).map(key => Q[key]) }))

const HISTORY_LABELS = ['5.10', '12.10', '19.10', '26.10']
const history = (weeks: ([number, number][] | null)[]) =>
  weeks.map((values, i) => ({ label: HISTORY_LABELS[i], pairs: values ? pairs(values) : EMPTY_PAIRS }))

const anchors = (good: string, hard: string, lesson: string): WeekSample['anchors'] => [
  { key: 'good', label: 'Dobre', icon: 'wb_sunny', text: good },
  { key: 'hard', label: 'Trudne', icon: 'thunderstorm', text: hard },
  { key: 'lesson', label: 'Lekcja', icon: 'lightbulb', text: lesson },
]

export const WEEKS: Record<WeekSampleId, WeekSample> = {
  mixed: {
    id: 'mixed',
    name: 'Mieszany',
    label: '2.11',
    // jak na zrzucie z verify: trzy błękity i trudny tydzień z bliskimi
    pairs: pairs([[4, 4], [5, 4], [4, 5], [5, 2]]),
    history: history([
      [[3, 4], [3, 3], [4, 3], [2, 4]],
      [[2, 3], [4, 2], [5, 2], [3, 3]],
      null,
      [[3, 4], [4, 4], [3, 4], [4, 3]],
    ]),
    days: days([['lh'], ['hh', 'hl'], ['hl', 'hl', 'll'], ['lh'], ['hh', 'hh'], ['lh', 'hl'], ['lh']]),
    words: [
      { label: 'spokój', quadrant: Q.lh },
      { label: 'napięcie', quadrant: Q.hl },
      { label: 'duma', quadrant: Q.hh },
      { label: 'zmęczenie', quadrant: Q.ll },
    ],
    anchors: anchors(
      'Cztery sesje głębokiej pracy i dwa treningi mimo napiętego kalendarza.',
      'Trzy wieczory z rzędu poza domem — rozmowa z Anią dopiero w sobotę.',
      'Wieczory planuję przed tygodniem, nie w jego trakcie.',
    ),
    tiles: [
      { label: 'Cele', pct: 50 },
      { label: 'Nawyki', pct: 50 },
      { label: 'Trackery', pct: 57 },
      { label: 'Intencje', pct: 25 },
    ],
  },
  hard: {
    id: 'hard',
    name: 'Trudny',
    label: '2.11',
    pairs: pairs([[2, 2], [5, 1], [5, 2], [4, 2]]),
    history: history([
      [[3, 3], [3, 3], [4, 3], [3, 4]],
      [[3, 3], [4, 2], [4, 3], [3, 3]],
      [[2, 2], [4, 2], [5, 2], [3, 2]],
      [[2, 2], [5, 2], [5, 1], [4, 2]],
    ]),
    days: days([['hl'], ['hl', 'll'], ['ll', 'll'], ['hl', 'hl', 'hl'], ['ll'], ['lh'], ['ll', 'lh']]),
    words: [
      { label: 'napięcie', quadrant: Q.hl },
      { label: 'bezsilność', quadrant: Q.ll },
      { label: 'złość', quadrant: Q.hl },
      { label: 'ulga', quadrant: Q.lh },
    ],
    anchors: anchors(
      'W sobotę odpuściłem pracę i poszedłem w góry.',
      'Termin przesunięty drugi raz, do tego źle spałem przez cały tydzień.',
      'Przy takim obciążeniu sen jest pierwszą rzeczą do obrony.',
    ),
    tiles: [
      { label: 'Cele', pct: 20 },
      { label: 'Nawyki', pct: 36 },
      { label: 'Trackery', pct: 43 },
      { label: 'Intencje', pct: null },
    ],
  },
  calm: {
    id: 'calm',
    name: 'Spokojny',
    label: '2.11',
    pairs: pairs([[2, 4], [2, 5], [3, 4], [2, 5]]),
    history: history([
      [[3, 4], [2, 4], [3, 3], [2, 4]],
      [[3, 4], [3, 4], [3, 4], [3, 4]],
      [[2, 4], [2, 4], [4, 4], [2, 5]],
      [[3, 5], [2, 4], [3, 4], [2, 4]],
    ]),
    days: days([['lh'], ['lh', 'hh'], [], ['lh'], ['hh'], ['lh', 'lh'], ['lh']]),
    words: [
      { label: 'spokój', quadrant: Q.lh },
      { label: 'wdzięczność', quadrant: Q.lh },
      { label: 'ciekawość', quadrant: Q.hh },
    ],
    anchors: anchors(
      'Dużo czasu z rodziną i codzienny spacer.',
      'Niewiele — raz zabrakło mi cierpliwości przy lekcjach.',
      'Spokojny tydzień nie musi być mniej wartościowy.',
    ),
    tiles: [
      { label: 'Cele', pct: 100 },
      { label: 'Nawyki', pct: 82 },
      { label: 'Trackery', pct: 61 },
      { label: 'Intencje', pct: 100 },
    ],
  },
}

/**
 * Bieżący tydzień w czwartek: refleksji jeszcze nie ma, zapisy emocji są
 * tylko z minionych dni. To najczęstszy stan, w którym ogląda się widok.
 */
export function withoutReflection(week: WeekSample): WeekSample {
  return {
    ...week,
    pairs: EMPTY_PAIRS,
    anchors: [],
    days: week.days.map((day, i) => (i < 4 ? day : { ...day, emotions: [] })),
    words: week.words.slice(0, 3),
  }
}

export function isRated(week: WeekSample): boolean {
  return AREAS.some(area => week.pairs[area.key].load != null && week.pairs[area.key].state != null)
}

/** Komórki mapy 5 × 5 od stanu 5 (góra) do 1 (dół); w komórce obszary o tej parze ocen. */
export function mapCells(week: WeekSample): { load: Rating; state: Rating; areas: (typeof AREAS)[number][] }[] {
  const scale: Rating[] = [1, 2, 3, 4, 5]
  return [...scale].reverse().flatMap(state =>
    scale.map(load => ({
      load,
      state,
      areas: AREAS.filter(area => week.pairs[area.key].load === load && week.pairs[area.key].state === state),
    })),
  )
}

export type DirectionId = 'a' | 'b' | 'c' | 'd' | 'e' | 'f'
export interface Direction {
  id: DirectionId
  title: string
  lead: string
  /** Co kierunek dokłada do karty. */
  adds: string
  /** Bieżący tydzień bez refleksji. */
  empty: string
  risk: string
}

export const DIRECTIONS: Direction[] = [
  {
    id: 'a',
    title: 'Ciasny pas',
    lead: 'Nic nie dokładamy. Ocena i wykonanie w jednym niskim pasie, tabela zaczyna się wyżej.',
    adds: 'Nic — oddaje tabeli około 130 px wysokości.',
    empty: 'Puste tory, ale w polu o połowę niższym.',
    risk: 'Kafle wykonania zmieniają układ z 2 × 2 na rząd; tydzień wygląda inaczej niż miesiąc.',
  },
  {
    id: 'b',
    title: 'Na tle ostatnich tygodni',
    lead: 'Ta sama macierz co w miesiącu: cztery wcześniejsze tygodnie, a pod nimi ten — większy, na papierze.',
    adds: 'Cztery poprzednie refleksje. Stan obszaru czyta się w dół kolumny.',
    empty: 'Dolny wiersz pusty, historia nad nim zostaje.',
    risk: 'Tory dłuższe niż w miesiącu (ok. 165 px zamiast 120).',
  },
  {
    id: 'c',
    title: 'Kafle obszarów',
    lead: 'Każdy obszar jest kaflem w kolorze swojej pary ocen — trudny obszar widać z daleka.',
    adds: 'Dwa słowa o obszarze („dużo · źle”) — legenda, której sam słupek nie ma.',
    empty: 'Cztery kafle w kolorze mgły z pustym torem.',
    risk: 'Kolor wychodzi ze słupka na powierzchnię; osiem kafli w jednej karcie, pole traci nagłówek.',
  },
  {
    id: 'd',
    title: 'Ocena i emocje tygodnia',
    lead: 'Ocena wąsko, obszary w wierszach. Obok to, co zapisywałeś w trakcie tygodnia: emocje dzień po dniu.',
    adds: 'Zapisy emocji z siedmiu dni i najczęstsze słowa — tabela ich nie pokazuje.',
    empty: 'Pole emocji żyje od poniedziałku, zanim powstanie refleksja.',
    risk: 'Drugi wykres w karcie; ma sens tylko przy regularnych zapisach emocji.',
  },
  {
    id: 'e',
    title: 'Ocena i słowa refleksji',
    lead: 'Obok oceny trzy zdania z refleksji: co było dobre, co trudne, czego się nauczyłem.',
    adds: 'Kotwice refleksji, po jednej linii. Klik otwiera spojrzenie „Refleksja”.',
    empty: 'Nie ma czego pokazać — pole znika, zostaje sama ocena.',
    risk: 'Tekst w kalendarzu, który dotąd pokazywał tylko znaki; powtarza spojrzenie „Refleksja”.',
  },
  {
    id: 'f',
    title: 'Mapa tygodnia',
    lead: 'Obciążenie w poziomie, stan w pionie. Cztery obszary stoją na mapie w kolorach pickera emocji.',
    adds: 'Układ obszarów względem siebie: co jest ciężkie i dobre, co ciężkie i złe.',
    empty: 'Pusta mapa.',
    risk: 'Drugi język dla tych samych danych (miesiąc i rok zostają przy słupkach).',
  },
]

export const decisions = [
  { id: 'D1', title: 'Dokładać czy zmniejszać', body: 'A zmniejsza pole i nie zmienia treści. B–F zostawiają wysokość karty i szukają dla niej treści. To pierwsza decyzja — reszta z niej wynika.' },
  { id: 'D2', title: 'Co ma żyć w bieżącym tygodniu', body: 'Refleksja powstaje w niedzielę, więc przez sześć dni pole oceny jest puste. Treść mają wtedy tylko B (historia) i D (emocje).' },
  { id: 'D3', title: 'Jeden język czy dwa', body: 'B trzyma znak i układ z miesiąca. C przenosi kolor na kafel, F zmienia wykres — oba wprowadzają w tygodniu coś, czego nie ma w miesiącu i roku.' },
  { id: 'D4', title: 'Tekst w karcie', body: 'E pokazuje zdania z refleksji. Kalendarz dotąd nie pokazywał treści wpisów poza spojrzeniem tabeli — to zmiana zasady, nie tylko układu.' },
  { id: 'D5', title: 'Obszary w wierszach', body: 'W D i E ocena stoi wąsko: nazwa po lewej, słupek po prawej. To osobny pomysł — pasuje też do B, jeśli historia trafi do drugiego pola.' },
  { id: 'D6', title: 'Kafle wykonania', body: 'Tylko A rusza kafle (rząd zamiast 2 × 2). W pozostałych zostają tak, jak ustaliliśmy dla miesiąca.' },
]

/* ------------------------------------------------------------------ runda 2: kafle obszarów (kierunek C) */

/** Co kafel obszaru odsłania pod kursorem. */
export type TileHover = 'dots' | 'legend' | 'split'
/** Gdzie siedzi kolor pary ocen. */
export type TileTint = 'tile' | 'disc'
/** Stan „pod kursorem” przypięty w scenie: żaden, jeden kafel („Bliscy”), wszystkie. */
export type TilePin = 'none' | 'one' | 'all'

export interface TileHoverOption {
  id: TileHover
  letter: string
  title: string
  lead: string
  shows: string
  why: string
  risk: string
}

export const TILE_HOVERS: TileHoverOption[] = [
  {
    id: 'dots',
    letter: 'C1',
    title: 'Kropki pod znakiem',
    lead: 'Znak zostaje. Pod nim wysuwają się dwie skale po pięć kropek: obciążenie i stan.',
    shows: 'Obie oceny jako kropki 1–5, bez liczb.',
    why: 'Ten sam język co natężenie w pickerze emocji: kółko w kółku, puste miejsca widać dopiero pod kursorem.',
    risk: 'Dwa nowe wiersze — kafel pod kursorem jest najgęstszy z trzech wersji.',
  },
  {
    id: 'legend',
    letter: 'C2',
    title: 'Legenda znaku',
    lead: 'Pod znakiem jedna linia: kształt słupka i „obciążenie”, kształt kropki i „stan”, przy każdym ocena.',
    shows: 'Co jest czym w znaku, plus oceny jako liczby.',
    why: 'Najmniej dokłada i uczy czytać sam znak — po kilku razach hover przestaje być potrzebny.',
    risk: 'Liczby w kalendarzu, choć tylko pod kursorem.',
  },
  {
    id: 'split',
    letter: 'C3',
    title: 'Dwa tory',
    lead: 'Znak rozkłada się na dwa cienkie tory: słupek obciążenia i osobno kropka stanu, każdy podpisany.',
    shows: 'Te same dwie oceny osobno, w tej samej skali i kolorze co znak.',
    why: 'Nic nowego do nauczenia: to ten sam słupek i ta sama kropka, tylko rozdzielone.',
    risk: 'Znak znika na czas hovera; blada kropka stanu na pustym torze jest słabo widoczna.',
  },
]

export const tileDecisions = [
  { id: 'T1', title: 'Co odsłania hover — C1', body: 'Rozstrzygnięte 14.11: kropki pod znakiem. C2 (legenda z liczbami) i C3 (dwa tory) zostają w scenie jako zapis. W spoczynku kafel pokazuje tylko ikonę, nazwę i znak.' },
  { id: 'T2', title: 'Kolor: cały kafel', body: 'Rozstrzygnięte 14.11: cały kafel. Cały kafel w barwie pary ocen pokazuje trudny obszar z daleka, ale w dobrym tygodniu trzy kafle są ciemniejsze od karty. Barwa tylko w polu ikony trzyma zasadę „głębiej = bielej” i gramatykę kafli Kompasu, za to mówi ciszej.' },
  { id: 'T3', title: 'Kafel jest kontrolką', body: 'Skoro reaguje na kursor, dostał cień kontrolki i unosi się jak kafle wykonania. Klik otwiera spojrzenie „Refleksja” w tabeli — potwierdzone 14.11.' },
  { id: 'T4', title: 'Bez nagłówka pola', body: 'Potwierdzone 14.11. Kafle stoją równo z kaflami wykonania, więc „Ocena tygodnia” nie ma gdzie stać. Nazwy obszarów mówią same za siebie; nagłówek wróciłby kosztem 26 px wysokości karty.' },
  { id: 'T5', title: 'Tydzień bez refleksji', body: 'Kafle w kolorze mgły z pustym torem, hover nic nie odsłania. Klik mógłby wtedy prowadzić do refleksji, gdy jej okno jest otwarte.' },
]
