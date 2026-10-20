<script setup lang="ts">
import { computed, nextTick, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppIcon from '@product/components/shared/AppIcon.vue'
import { collectOwnSentences } from '@product/domain/momentsProgress'
import ShameMomentsGlance from '~lab/components/ShameMomentsGlance.vue'
import MomentsChart, { type MomentsChartVariant } from '~lab/components/MomentsChart.vue'
import { cardsFor, entries, ownEntries, samples, skillColumns, skillsFor, statsFor, weeks, type Sample } from '~lab/lab/shamePath'
import { doneDate, RETURN_WEEK, flatSteps, usePathProgress, type FlatStep } from '~lab/lab/pathViewV2'
import journeyCurrent from '~lab/assets/path-view-v2/journey-current.png'
import nowCurrent from '~lab/assets/path-view-v2/now-current.png'
import knowledgeCurrent from '~lab/assets/path-view-v2/knowledge-current.png'

/**
 * Path view v2 (2026-10-11). After the round-5 port the user still saw too
 * much on the surface (notes, dashed lines, minutes, dots on both sides of
 * the week row), no plain "what and why" per step, wasted width in rows that
 * push a lone button or chevron to the far edge, and no easy reset.
 *
 * This concept: numbered wells on the left, ONE state disc on the right
 * (the Today rating disc: fill + "1/3"), steps as tiles with their own
 * buttons, the current step as the lit guide tile with "co" and "po co",
 * no dashed separators, no permanent chevrons, actions next to content,
 * and "Od nowa" one click away.
 */
const route = useRoute()
const router = useRouter()
const sample = computed<Sample>(() => (samples.some(s => s.id === route.query.sample) ? (route.query.sample as Sample) : 'mid'))
const themes = [
  { id: 'sky-mist', label: 'Sky Mist' },
  { id: 'current', label: 'Current (domyślny produktu)' },
  { id: 'sunrise-cloud', label: 'Sunrise Cloud' },
]
/** The product paints its canvas from `:root[data-theme]`; the Lab never set one and so showed the saturated default. */
const theme = computed(() => (themes.some(t => t.id === route.query.theme) ? String(route.query.theme) : 'sky-mist'))
watch(theme, value => document.documentElement.setAttribute('data-theme', value), { immediate: true })
onUnmounted(() => document.documentElement.removeAttribute('data-theme'))
/** `/preview/path-view-v2` renders the stage alone, at the product's wide width (1600 px, 1.2fr/1fr) — no Lab sidebars. */
const standalone = computed(() => Boolean(route.meta.standalone))
const previewHref = computed(() => {
  const query = new URLSearchParams(Object.entries(route.query).filter((pair): pair is [string, string] => typeof pair[1] === 'string'))
  const search = query.toString()
  return `/preview/path-view-v2${search ? `?${search}` : ''}`
})
const paused = computed(() => sample.value === 'paused')
const isReturn = computed(() => sample.value === 'return')
const progress = usePathProgress(sample)
const { enrolled, closed } = progress

const expanded = ref<number[]>([])
const restartOpen = ref(false)
const menuOpen = ref(false)
const notice = ref('')
const worldOpen = ref(false)
const planOpen = ref(false)
const letterOpen = ref(false)
const measureOpen = ref(false)
const showAllCards = ref(false)
const showAllSentences = ref(false)
const readCards = ref<string[]>([])
const drawerKey = ref<string | null>(null)
const drawerElement = ref<HTMLDialogElement>()

const stats = computed(() => statsFor(sample.value))
const charts: { id: MomentsChartVariant | 'bars'; label: string; earlier?: boolean }[] = [
  { id: 'columns', label: 'Kolumny: tydzień po tygodniu, pastele nieba, legenda po lewej' },
  { id: 'tracks', label: 'Tory: było → jest (runda 6h)', earlier: true },
  { id: 'pair', label: 'Dwa paski: Start · Teraz (runda 6h)', earlier: true },
  { id: 'river', label: 'Rzeka: pasek na tydzień (runda 6h)', earlier: true },
  { id: 'bars', label: 'Słupki (obecnie w produkcie)', earlier: true },
]
const chart = computed(() => (charts.some(c => c.id === route.query.chart) ? (route.query.chart as MomentsChartVariant | 'bars') : 'columns'))
const chartsNow = charts.filter(c => !c.earlier)
const chartsEarlier = charts.filter(c => c.earlier)
const skills = computed(() => skillsFor(sample.value))
const phaseKey = computed(() => weeks[Math.max(0, Math.min(progress.currentWeek.value, RETURN_WEEK))]!.key)
const allCards = computed(() => cardsFor(phaseKey.value))
const cards = computed(() => (showAllCards.value ? allCards.value : allCards.value.filter(c => c.pinned || c.phaseKeys.includes(phaseKey.value)).slice(0, 2)))
const drawer = computed(() => allCards.value.find(c => c.key === drawerKey.value))
const ownSentences = computed(() =>
  sample.value === 'start' ? [] : collectOwnSentences([...entries.filter(e => e.createdAt <= (closed.value || isReturn.value ? '2026-11-02' : '2026-10-05')), ...ownEntries])
)
const eyebrowState = computed(() => {
  if (!enrolled.value) return '8 tygodni · 24 kroki'
  if (isReturn.value) return 'Powrót'
  if (closed.value) return 'Zakończona'
  return `Tydzień ${progress.currentWeek.value + 1} z 8${paused.value ? ' · wstrzymana' : ''}`
})
function currentFoot(step: FlatStep) {
  if (paused.value) return 'czeka na Twój powrót'
  if (isReturn.value) return '27 grudnia'
  return step.optional ? 'opcjonalny' : `${step.minutes} min`
}

const tasks = [
  { key: 'stayLonger', title: 'Zostań w sytuacji minutę dłużej', times: 2, done: 1, why: 'Wstyd każe zniknąć. Minuta dłużej pokazuje, że nic się nie dzieje.' },
  { key: 'repairGuilt', title: 'Napraw to, co możesz naprawić', times: 1, done: 0, why: 'Wina domyka się przez naprawę, a wstyd przez ukrycie. Wybierz naprawę.' },
  { key: 'friendTest', title: 'Zapytaj: czy ktoś bliski też powinien się wstydzić?', times: 3, done: 0, why: 'Jeśli nie, to cudze wymaganie. Pytanie odbiera mu władzę.' },
]
const task = ref('stayLonger')
const chosenTask = computed(() => tasks.find(t => t.key === task.value)!)
/** "Praktyki": what repeats in the active phase — the practices (in the app) and the week's real-world task, as tiles. */
interface PracticeTile { key: string; title: string; note: string; what: string; world?: boolean; action: string; state: 'done' | 'due' | 'idle' }
const practiceTiles = computed<PracticeTile[]>(() => {
  const quiet = sample.value === 'quiet'
  return [
    { key: 'break', title: 'Przerwa na współczucie', note: 'co 2 dni', what: 'Dwadzieścia sekund oddechu i trzy kroki: co boli, nie tylko ja, co chcę sobie powiedzieć.', action: 'Otwórz', state: quiet ? 'due' : 'due' },
    { key: 'moments', title: 'Momenty', note: 'co 2 dni', what: 'Pięć dotknięć po trudnej chwili: która część przejęła ster, kiedy to zauważasz, co robisz zamiast, jak mocno.', action: 'Zapisz', state: quiet ? 'idle' : 'done' },
    { key: 'task', title: chosenTask.value.title, note: `w świecie · ${chosenTask.value.times}× w tygodniu`, what: chosenTask.value.why, world: true, action: 'Zapisz', state: 'idle' },
  ]
})
const format = (n: number) => n.toFixed(1).replace('.', ',')
const lastIndex = (points: (number | null)[]) => points.map((p, i) => (p === null ? -1 : i)).filter(i => i >= 0).at(-1)
const pos = (row: { min: number; max: number }, value: number) => `${((value - row.min) / (row.max - row.min)) * 100}%`

function setQuery(key: string, value: string) {
  void router.replace({ query: { ...route.query, [key]: value } })
}
function toggleWeek(index: number) {
  expanded.value = expanded.value.includes(index) ? expanded.value.filter(i => i !== index) : [...expanded.value, index]
}
const isOpen = (index: number) => expanded.value.includes(index)
function weekTitle(index: number) {
  return weeks[index]!.title
}
function weekWhy(index: number) {
  return index === RETURN_WEEK ? 'Wracasz do dwóch pomiarów i do listu, który napisałeś do siebie.' : weeks[index]!.why
}
function disc(index: number) {
  const { done, total } = progress.weekCompletion(index)
  return { done, total, fill: `${Math.round((done / Math.max(1, total)) * 100)}%` }
}
function start(step: FlatStep) {
  notice.value = `Podgląd w Labie: „${step.title}”. W produkcie otwiera się ćwiczenie; tu krok zostaje oznaczony jako ukończony.`
  progress.complete(step.index)
}
function skip(step: FlatStep) {
  progress.complete(step.index)
  notice.value = `Pominięto „${step.title}”.`
}
function undo(step: FlatStep) {
  progress.undo(step.index)
  notice.value = `Cofnięto ukończenie „${step.title}”. Wpis ćwiczenia zostaje w historii.`
}
function restart() {
  progress.restart()
  restartOpen.value = false
  expanded.value = [0]
  notice.value = 'Ścieżka ruszyła od pierwszego kroku. Ukończone ćwiczenia zostają w historii.'
}
function simulate(title: string) {
  notice.value = `Podgląd w Labie: „${title}”.`
}
function reset() {
  progress.reset()
  expanded.value = progress.currentWeek.value < 0 ? [] : [progress.currentWeek.value]
  restartOpen.value = false
  menuOpen.value = false
  worldOpen.value = false
  planOpen.value = false
  letterOpen.value = false
  measureOpen.value = false
  showAllCards.value = false
  showAllSentences.value = false
  readCards.value = []
  task.value = 'stayLonger'
  notice.value = ''
}
watch(sample, reset, { immediate: true })
watch(drawerKey, async key => {
  await nextTick()
  if (key) drawerElement.value?.showModal()
  else drawerElement.value?.close()
})
function markRead() {
  if (drawerKey.value && !readCards.value.includes(drawerKey.value)) readCards.value.push(drawerKey.value)
  drawerKey.value = null
}

const audit = [
  {
    id: 'A1',
    where: 'PathJourney · wiersz tygodnia (.wk__row)',
    image: journeyCurrent,
    now: 'Studnia z numerem po lewej, tytuł, cztery kropki stanu i strzałka zawsze widoczne po prawej. Dwa zestawy „kropek” na jednym wierszu: numer i kropki kroków.',
    next: 'Po lewej zostaje studnia z numerem (✓ po ukończeniu). Po prawej jeden dysk jak w Dzisiaj przy zadaniu z oceną: wypełnienie i odczyt „1/3”; pełny dysk z kropką, gdy tydzień jest zamknięty; pusta studnia, gdy jeszcze nie zaczęty. Bez strzałki — rząd jest przyciskiem, otwarty rząd zmienia ton na papier, a zdanie „po co” tygodnia wchodzi pod tytuł.',
  },
  {
    id: 'A2',
    where: 'PathJourney · lista kroków (.st) i wiersze Praktyki / W świecie (.pp-row)',
    now: 'Druga lista z kropkami pod wierszem tygodnia: kropka, tytuł, dopisek „7 min” albo „zaległe”, a jedyny przycisk odsunięty do prawej krawędzi. Pod spodem dwa wiersze z eyebrow w stałej kolumnie 6,5 rem, strzałką i kreskowaną linią nad każdym.',
    next: 'Kroki jako kafle: cały tydzień w jednym rzędzie (cztery miejsca), bez ikon, w stylu cichego pola — tytuł, zdanie „co robisz”, stopka z czasem. Bieżący kafel jest podświetlony i dostaje „po co” oraz Rozpocznij; ukończony ma tę samą anatomię w tonie sky-field ze studnią w stopce, a data ukończenia i Cofnij pojawiają się na hover. Praktyki i W świecie wychodzą z drogi do karty „Ten tydzień” po prawej. Zero kreskowanych linii.',
  },
  {
    id: 'A3',
    where: 'PathNowCard · „Teraz” (.now, .pp-pr--now)',
    image: nowCurrent,
    now: 'Ikona i tytuł po lewej, Rozpocznij przyklejony do prawej krawędzi, pod spodem opis, kreskowana linia, praktyka z „Otwórz” znów na prawej krawędzi, a „Zapisz moment” jako osobny czip. Ten sam krok i ten sam przycisk są wyżej w „Twojej drodze”.',
    next: 'Karta znika. Jej rola „prowadzenia” przechodzi do kafla-przewodnika w drodze (jedyne Rozpocznij na stronie), a praktyka na dziś, zadanie tygodnia i czipy trafiają do karty „Ten tydzień”, gdzie przycisk stoi tuż za nazwą, nie przy krawędzi.',
  },
  {
    id: 'A4',
    where: 'PathKnowledgeCard · „Warto wiedzieć” (.kn button)',
    image: knowledgeCurrent,
    now: 'Każdy tytuł to wiersz na całą szerokość: ikonka, tekst, strzałka „>” na prawej krawędzi. Dwa wiersze i dużo pustego pola między tekstem a strzałką.',
    next: 'Dwa niewielkie kafle obok siebie: pole z ikoną książki i tytuł łamany do dwóch linii. Przeczytana karta dostaje ✓ w polu ikony. „Wszystkie” zostaje w nagłówku karty.',
  },
  {
    id: 'A5',
    where: 'ProgramDetailView · blok po zakończeniu (.path-view__closed)',
    now: 'Ikona, tekst i dwa czipy rozciągnięte do krawędzi karty (auto / 1fr / auto).',
    next: 'Zwarty blok: pole z ikoną, tytuł i czipy pod tytułem, wszystko wyrównane do lewej.',
  },
  {
    id: 'A6',
    where: 'Reguła na przyszłość (także Dzisiaj · NextDayPrograms, PathPracticesRow)',
    now: 'Wzorzec „ikona | tekst | akcja przy prawej krawędzi” powtarza się w wielu miejscach. Przy szerokich kartach zostaje pusty środek, a oko musi przejechać cały rząd, żeby znaleźć przycisk.',
    next: 'Prawa krawędź rzędu należy wyłącznie do STANU (dysk, studnia). AKCJA stoi tuż za treścią, której dotyczy. Gdy w rzędzie jest tylko akcja i nie ma stanu, element powinien być kaflem albo klastrem, nie rzędem na całą szerokość.',
  },
]

const decisions = [
  { id: 'D1', title: 'Rząd tygodnia: numer po lewej, jeden dysk stanu po prawej', body: 'Dysk to ten sam .mg-well co w Dzisiaj przy zadaniu z oceną: wypełnienie od lewej i odczyt „ukończone/wszystkie”. Zamknięty tydzień = dysk z kropką (mg-well--done), nieotwarty = pusta studnia. Kropki kroków i strzałki znikają z rzędu.' },
  { id: 'D2', title: 'Kroki jako kafle: tydzień w jednym rzędzie, bez ikon, bez stopki', body: 'Kolumn tyle, ile kroków w tygodniu (najwyżej cztery), więc tydzień z trzema krokami ma trzy szersze kafle. Kafel = nagłówek (tytuł + znacznik po prawej) i zdanie „co robisz”. Znacznik: „7 min” dla kroków przed tobą, studnia z kropką dla ukończonych (po poprzedniej wersji kropka w stopce zajmowała cały pusty rząd). Kafle w jednym polu mają równą wysokość (rząd wyznacza najwyższy; stopka przy dolnej krawędzi) — wersja z naturalną, nierówną wysokością odrzucona 11.10. Data ukończenia i Cofnij (tylko ostatni) wysuwają się na hover w miejscu znacznika.' },
  { id: 'D3', title: 'Bieżący krok = podświetlony kafel w rzędzie', body: 'Ten sam rozmiar co sąsiedzi, ale ton papieru z pierścieniem, pełne „co robisz”, „po co” (nowe zdanie per krok — propozycja treści do programs.json: steps.stepN.why), jedyne wypełnione Rozpocznij na stronie, Pomiń dla kroków opcjonalnych, czas. Bez eyebrow „Teraz” — pierścień i przycisk wystarczą. Karta „Teraz” z prawej kolumny znika, bo powtarzała ten kafel.' },
  { id: 'D4', title: 'Bez kreskowanych linii; drabinka tonalna w jedną stronę', body: 'Podział robią odstępy i ton, a ton idzie tylko w stronę bieli, jak lekko zachmurzone niebo: płótno → karta (surface) → otwarty rząd tygodnia (mist) → kafle (papier). Nic w środku nie wraca do niebieskiego — ukończone kafle też są papierowe (poprzednia wersja z sky-field odrzucona 11.10). Rząd tygodnia jest przyciskiem z aria-expanded; hover zamkniętego rzędu = mist. Praktyki i W świecie nie są już zwijanymi wierszami w drodze. Uwaga do portu: produktowy PathJourney ma otwarty rząd w tonie papieru — z kaflami w środku musi zejść na mist.' },
  { id: 'D5', title: 'Karta „Ten tydzień” zamiast „Teraz”', body: 'Praktyka na dziś (ikona, nazwa, „zaległa od…”, Otwórz tuż za nazwą) z wstęgą siedmiu dni, zadanie W świecie z jego studniami i cichym „Zmień”, czipy Zapisz moment · Mój plan. Wstrzymana ścieżka: ta sama karta pod nagłówkiem „Gdy wrócisz”, bez aktywnych przycisków.' },
  { id: 'D6', title: 'Warto wiedzieć jako małe kafle', body: 'Dwa kafle obok siebie: pole z ikoną + tytuł w dwóch liniach, ✓ po przeczytaniu. Szuflada z treścią bez zmian.' },
  { id: 'D7', title: 'Reset na wyciągnięcie ręki', body: '„Od nowa” jako cichy link w nagłówku karty „Twoja droga”; potwierdzenie w miejscu (pasek nad rzędami), nie w modalu. Dodatkowo Cofnij na ostatnim ukończonym kaflu — cofnięcie jednego kroku bez zaczynania od zera. Wstrzymaj i Porzuć zostają pod ⋯ w nagłówku strony.' },
  { id: 'D8', title: 'Akcja przy treści, stan przy krawędzi', body: 'Reguła dla całego widoku (i do przeniesienia na Dzisiaj): prawa krawędź rzędu tylko dla dysku/studni stanu; przyciski i linki zaraz za tekstem, którego dotyczą. Rząd bez stanu po prawej nie powinien istnieć — staje się kaflem albo klastrem.' },
  { id: 'D9', title: 'Dopiski ograniczone do jednego na element', body: 'Przy kroku tylko jedno w stopce: czas, „opcjonalny” albo (na hover) data ukończenia. Przy praktyce „zaległa od 4 paź” albo „dziś”, nigdy oba.' },
  { id: 'D13', title: 'Postęp: dwa kafle (Części · Pomiar), kolumny tydzień po tygodniu, dwie rodziny pasteli, legenda po lewej', body: 'Runda 6h (tory, pary, rzeka) odrzucona: użytkownik chce widzieć przebieg z tygodnia na tydzień, oś czasu pozioma. Runda 6i (kolumny w nasyconych barwach, legenda pod osią, dymek na hover) odrzucona: kolory nie z nieba, nie pastelowe, nie rysunkowe. Runda 6j: karta Postęp = dwa kafle mist jeden pod drugim; w obu słowa w tej samej lewej kolumnie 7,4 rem (legenda części nad nazwami skal Pomiaru). Wykres: kolumna na tydzień, wysokość = liczba momentów, segmenty = części w dwóch rodzinach (runda 6k, odczyt usera potwierdzony: Krytyk i Agresor = atak na siebie / na innych, Ukrywający i Odwracający uwagę = ukrycie przed innymi / przed sobą): czerwienie = dwa kroki drabinki rose, której aplikacja już używa: rose-200 (Krytyk) i rose-400 (Agresor, ten sam co „wysiłek”), fiolety = jasny liliowy (Odwracający uwagę) i lawenda (Ukrywający), Ja = czyste niebo; w rodzinie jaśniejszy odcień = ku sobie, głębszy = ku innym; kolejność w słupku Ja → liliowy → lawenda → rose-200 → rose-400 (jedyna, w której sąsiednie pary przechodzą próg CVD walidatora: 8,0; normalne 10,9), ołówkowy obrys 1 px, kreskowana podstawa, przechył kolumn ±0,3°. Legenda mała, zawsze widoczna, bez dymka: najazd/focus na tydzień wpisuje liczby przy nazwach i pogrubia dominującą część, podpisuje tydzień na osi. Nigdy: radialne, punktowe, poziome słupki per część, nasycone kolory. momentsParts.ts (PART_COLOR, PART_SKY, dominantPart), MomentsChart.vue (variant=columns), chart= w URL.' },
  { id: 'D14', title: 'Rząd tygodnia: tytuł na równi ze studnią numeru, opis jako osobne pole', body: 'Uwaga usera 11.10: tytuł fazy (np. „Inne spojrzenie”) ma stać na równi z kropką numeru po lewej, a krótki opis dostać osobne miejsce niżej. Teraz: rząd = studnia · tytuł · dysk stanu w jednej linii; pod nim, tylko w otwartym tygodniu, opis w osobnym polu w tonie papieru (jak kafle), a dopiero potem kafle kroków. Przy okazji naprawiona kolizja klas: kafle Postępu nazywały się .tile jak kafle kroków i nadpisały im tło (kafle zlały się z polem fazy) — teraz .ptile.' },
  { id: 'D12', title: 'Karta „Praktyki”: kafle aktywnej fazy, zadanie tygodnia jako jeden z nich', body: 'Praktyki (mikro w aplikacji w rytmie „co 2 dni”) i zadanie tygodnia („w świecie”, N razy w tygodniu, intencja z rytuału) różnią się pochodzeniem, nie tym, co masz zrobić — dla użytkownika to jedna kategoria: „co powtarzam w tej fazie obok kroków”. Karta nazywa się więc „Praktyki” i pokazuje kafle w anatomii kafli kroków (tytuł, znacznik, jedno zdanie, akcja w stopce), najwyżej trzy w rzędzie, ton mist (karta → kafle, bez rzędu pośredniego). Bez dopisków (runda 6e: „dziś”, „w świecie” i „2× w tygodniu” usunięte — rozjeżdżały tytuł i stopkę w węższej kolumnie): wszystkie akcje to ten sam cichy czip (wypełniony „Otwórz” odrzucony — odstawał od reszty), bez studni „zrobione dziś” przy Momentach; przy zadaniu akcja i cichy „Zmień”. Kafle równej wysokości. Kafli w rzędzie tyle, ile mieści się po ≥ 11 rem (trzy w kolumnie produktu, dwa w węższej). Wersja z siatką tygodnia (wiersze × 7 dni) odrzucona 11.10: znów rozciągała komponent wszerz, a wykres dni nie jest tu potrzebny. Sekcje PRAKTYKA / W ŚWIECIE, wstęga dni i czip „Zapisz moment” usunięte; „Mój plan” to link w nagłówku.' },
  { id: 'D11', title: 'Szerokość: Lab ma dwa paski, produkt nie', body: 'Scena w Labie ma 224 px nawigacji i 306 px notatek, a szerokość widoku 1180 px — kolumna drogi jest o ~150 px węższa niż w produkcie (strona „wide” 1600 px, dok 72 px, siatka 1.2fr/1fr). Link „Podgląd 1:1 bez pasków Laba” otwiera /preview/path-view-v2 w szerokości produktu; scenariusz i motyw idą w URL.' },
  { id: 'D10', title: 'Kolory: Lab musi rysować w motywie użytkownika', body: 'Tokeny są wspólne, ale produkt maluje płótno z :root[data-theme] (current · sky-mist · sunrise-cloud), a Lab nigdy nie ustawiał motywu, więc pokazywał domyślny „current” z nasyconym tłem rgb(211 226 248). Scena ustawia data-theme (domyślnie Sky Mist, przełącznik w pasku, URL theme=). Kropka „wykonane” używa produktowego --mg-color-state zamiast primary-fill. Do potwierdzenia: który motyw masz w Profil → Preferencje.' },
]
</script>

<template>
  <section class="scenario-page pv2 mg-design-v2" :class="{ 'pv2--standalone': standalone }">
    <header v-if="!standalone" class="concept-heading">
      <div>
        <span class="lab-eyebrow">Ścieżki · widok ścieżki „Ze wstydu do współczucia” · runda 6 · 11.10.2026</span>
        <h1>Mniej elementów, więcej prowadzenia</h1>
        <p>
          Po wdrożeniu rundy 5 wciąż za dużo się dzieje: dopiski, kreskowane linie, minuty, kropki po obu stronach rzędu,
          przyciski i strzałki odsunięte do krawędzi. Ten koncept zostawia numer po lewej i jeden dysk stanu po prawej, zamienia
          listy kroków na kafle z przyciskami, podświetla bieżący krok jako przewodnika z „co” i „po co” oraz daje reset na jeden klik.
        </p>
      </div>
      <span class="status-badge status-badge--experiment">Propozycja do oceny · runda 6</span>
    </header>

    <div v-if="!standalone" class="pv2__toolbar">
      <label class="pv2__select"
        >Scenariusz
        <select :value="sample" @change="setQuery('sample', ($event.target as HTMLSelectElement).value)">
          <option v-for="s in samples" :key="s.id" :value="s.id">{{ s.label }}</option>
        </select></label
      >
      <label class="pv2__select"
        >Wykres momentów
        <select :value="chart" @change="setQuery('chart', ($event.target as HTMLSelectElement).value)">
          <option v-for="c in charts" :key="c.id" :value="c.id">{{ c.label }}</option>
        </select></label
      >
      <label class="pv2__select"
        >Motyw
        <select :value="theme" @change="setQuery('theme', ($event.target as HTMLSelectElement).value)">
          <option v-for="t in themes" :key="t.id" :value="t.id">{{ t.label }}</option>
        </select></label
      >
      <a class="pv2__reset" :href="previewHref" target="_blank" rel="noopener">Podgląd 1:1 bez pasków Laba ↗</a>
      <button type="button" class="pv2__reset pv2__reset--tight" @click="reset">Przywróć przykład</button>
    </div>

    <!-- 01 · widok ścieżki -->
    <div class="pv2__stage">
      <div class="pv">
        <header class="pv__head">
          <button type="button" class="pv__back" aria-label="Wróć do ćwiczeń"><AppIcon name="arrow_back" /></button>
          <span class="pv__icon"><AppIcon name="mg-exercise-compassionate-image" /></span>
          <div class="pv__titles">
            <span class="pv__eyebrow">Ścieżki <b>{{ eyebrowState }}</b></span>
            <h1>Ze wstydu do współczucia</h1>
            <p class="pv__goal">Zauważać wstyd szybciej. Odpowiadać ciepłem, sobie i innym, zamiast atakiem albo ukryciem. Wracać do kontaktu.</p>
            <p v-if="enrolled" class="pv__sign"><small>Mój znak</small><em>„Gdy zrobię błąd przy ludziach, zostanę w rozmowie zamiast zniknąć.”</em></p>
          </div>
          <div class="pv__menu">
            <button v-if="!enrolled" type="button" class="btn-primary" @click="setQuery('sample', 'mid')">Rozpocznij ścieżkę</button>
            <template v-else>
              <button type="button" class="chip chip--ghost" aria-label="Więcej" :aria-expanded="menuOpen" @click="menuOpen = !menuOpen"><AppIcon name="more_horiz" /></button>
              <div v-if="menuOpen" class="pv__menu-list">
                <button v-if="!closed && !isReturn" type="button" @click="setQuery('sample', paused ? 'mid' : 'paused')">{{ paused ? 'Wznów' : 'Wstrzymaj' }}</button>
                <button type="button" @click="setQuery('sample', 'start')">Porzuć</button>
              </div>
            </template>
          </div>
        </header>

        <div class="pv__grid">
          <!-- Twoja droga -->
          <section class="card pv__journey" aria-label="Twoja droga">
            <header class="card__head">
              <span>Twoja droga</span>
              <button v-if="enrolled" type="button" class="card__link" :aria-expanded="restartOpen" @click="restartOpen = !restartOpen">Od nowa</button>
            </header>
            <div v-if="restartOpen" class="confirm" role="group" aria-label="Zacząć od nowa?">
              <span>Zacząć ścieżkę od pierwszego kroku? Ukończone ćwiczenia zostają w historii.</span>
              <span class="confirm__actions">
                <button type="button" class="chip chip--primary" @click="restart">Zacznij od nowa</button>
                <button type="button" class="chip" @click="restartOpen = false">Zostaw</button>
              </span>
            </div>

            <article
              v-for="(week, wi) in weeks"
              :key="week.key"
              class="wk"
              :class="[`wk--${progress.weekState(wi)}`, { 'wk--open': isOpen(wi), 'wk--return': wi === RETURN_WEEK }]"
            >
              <button type="button" class="wk__row" :aria-expanded="isOpen(wi)" :aria-controls="`week-${week.key}`" @click="toggleWeek(wi)">
                <span class="well" :class="{ 'well--past': progress.weekState(wi) === 'done', 'well--current': progress.weekState(wi) === 'current' }">
                  <AppIcon v-if="wi === RETURN_WEEK" name="replay" />
                  <b v-else>{{ wi + 1 }}</b>
                </span>
                <span class="wk__copy">
                  <strong class="wk__title">{{ weekTitle(wi) }}</strong>
                </span>
                <span
                  class="well disc"
                  :class="{ 'well--done': progress.weekState(wi) === 'done', 'disc--meter': progress.weekState(wi) === 'current' }"
                  :style="progress.weekState(wi) === 'current' ? { '--fill': disc(wi).fill } : undefined"
                  :aria-label="`${disc(wi).done} z ${disc(wi).total} kroków`"
                >
                  <b v-if="progress.weekState(wi) === 'current'">{{ disc(wi).done }}<i>/{{ disc(wi).total }}</i></b>
                </span>
              </button>

              <p v-if="isOpen(wi)" class="wk__why">{{ weekWhy(wi) }}</p>
              <div v-if="isOpen(wi)" :id="`week-${week.key}`" class="wk__body" :style="{ '--cols': Math.min(4, progress.weekSteps(wi).length) }">
                <article
                  v-for="step in progress.weekSteps(wi)"
                  :key="step.index"
                  class="tile"
                  :class="[`tile--${progress.stepState(step.index)}`, { 'tile--paused': paused && progress.stepState(step.index) === 'current' }]"
                >
                  <header class="tile__head">
                    <strong class="tile__title">{{ step.title }}</strong>
                    <i v-if="progress.stepState(step.index) === 'done'" class="well well--sm well--done tile__mark" :title="`ukończono ${doneDate(step)}`" aria-hidden="true" />
                    <small v-else-if="progress.stepState(step.index) === 'later'" class="tile__mark">{{ step.optional ? 'opcjonalny' : `${step.minutes} min` }}</small>
                  </header>
                  <span v-if="progress.stepState(step.index) === 'done'" class="tile__tray">
                    <small>ukończono {{ doneDate(step) }}</small>
                    <button v-if="step.index === progress.lastDone.value" type="button" class="chip chip--ghost" @click="undo(step)">Cofnij</button>
                  </span>
                  <p class="tile__what">{{ step.what }}</p>
                  <p v-if="progress.stepState(step.index) === 'current'" class="tile__why"><b>Po co:</b> {{ step.why }}</p>
                  <footer v-if="progress.stepState(step.index) === 'current'" class="tile__foot">
                    <button v-if="!paused" type="button" class="chip chip--primary" @click="start(step)">Rozpocznij</button>
                    <button v-if="!paused && step.optional" type="button" class="chip" @click="skip(step)">Pomiń</button>
                    <small>{{ currentFoot(step) }}</small>
                  </footer>
                </article>
              </div>
            </article>

            <div v-if="closed" class="closed">
              <span class="closed__icon"><AppIcon name="mg-exercise-maintenance-plan" /></span>
              <span class="closed__copy">
                <strong>To, co pomaga, zostaje z Tobą</strong>
                <span class="chips">
                  <button type="button" class="chip" @click="simulate('Plan podtrzymania')">Plan podtrzymania</button>
                  <button type="button" class="chip" @click="setQuery('sample', 'start')">Rozpocznij ponownie</button>
                </span>
              </span>
            </div>
          </section>

          <aside class="pv__side" aria-label="Kontekst ścieżki">
            <!-- Praktyki: the active phase's practices and the week's task, as tiles -->
            <section v-if="enrolled && !closed && !isReturn" class="card">
              <header class="card__head">
                <span>{{ paused ? 'Gdy wrócisz' : 'Praktyki' }}</span>
                <button type="button" class="card__link" :class="{ 'is-active': planOpen }" :aria-expanded="planOpen" @click="planOpen = !planOpen">Mój plan</button>
              </header>
              <div class="pr-grid">
                <article v-for="tile in practiceTiles" :key="tile.key" class="tile tile--mist">
                  <header class="tile__head">
                    <strong class="tile__title">{{ tile.title }}</strong>
                  </header>
                  <p class="tile__what">{{ tile.what }}</p>
                  <footer v-if="!paused" class="tile__foot">
                    <button type="button" class="chip" @click="simulate(`${tile.action}: ${tile.title}`)">{{ tile.action }}</button>
                    <button v-if="tile.world" type="button" class="card__link" :aria-expanded="worldOpen" @click="worldOpen = !worldOpen">{{ worldOpen ? 'Zostaw' : 'Zmień' }}</button>
                  </footer>
                </article>
              </div>
              <div v-if="worldOpen" class="opts" role="radiogroup" aria-label="Zadanie tygodnia">
                <label v-for="option in tasks" :key="option.key" class="opt" :class="{ 'is-selected': option.key === task }">
                  <input type="radio" name="task" :value="option.key" :checked="task === option.key" @change="task = option.key; worldOpen = false" />
                  <strong>{{ option.title }}</strong>
                  <small>{{ option.times }}× w tygodniu</small>
                </label>
              </div>
              <div v-if="planOpen" class="quote">
                <p><em>„To moja część, nie cały ja.”</em></p>
                <p>Oddech. Stopy na ziemi. Zostań minutę dłużej.</p>
                <button type="button" class="chip" @click="simulate('Moment z mojej odpowiedzi')">Zapisz jako moment</button>
              </div>
            </section>

            <!-- Powrót -->
            <section v-if="isReturn" class="card">
              <header class="card__head"><span>Powrót</span><small>osiem tygodni później</small></header>
              <div class="chips chips--top">
                <button type="button" class="chip" :class="{ 'is-active': letterOpen }" :aria-expanded="letterOpen" @click="letterOpen = !letterOpen"><AppIcon name="mg-exercise-letter-to-future-self" />List od Ciebie</button>
                <button type="button" class="chip" :class="{ 'is-active': planOpen }" :aria-expanded="planOpen" @click="planOpen = !planOpen"><AppIcon name="mg-exercise-shame-response" />Mój plan</button>
              </div>
              <div v-if="letterOpen" class="quote">
                <p><em>„Jeśli dziś jest trudniej, wróć do pierwszej minuty. Oddychaj. Powiedz komuś, że potrzebujesz chwili. Nie zaczynasz od zera.”</em></p>
              </div>
              <div v-if="planOpen" class="quote">
                <p><em>„To moja część, nie cały ja.”</em></p>
                <p>Oddech. Stopy na ziemi. Zostań minutę dłużej.</p>
              </div>
            </section>

            <!-- Postęp: two tiles, one under the other; words in the same left column -->
            <section v-if="enrolled" class="card">
              <header class="card__head"><span>Postęp</span></header>
              <div class="ptile">
                <header class="measure__head"><span class="blk__label">Części</span></header>
                <ShameMomentsGlance v-if="chart === 'bars'" :stats="stats" :slots="8" />
                <MomentsChart v-else :variant="chart" :stats="stats" :slots="8" />
              </div>
              <div class="ptile measure">
                <header class="measure__head">
                  <span class="blk__label">Pomiar</span>
                  <button type="button" class="card__link" :aria-expanded="measureOpen" @click="measureOpen = !measureOpen">{{ measureOpen ? 'Mniej' : 'Szczegóły' }}</button>
                </header>
                <div v-for="row in skills" :key="row.key" class="sk">
                  <span class="sk__label">{{ row.name }}</span>
                  <span class="sk__track">
                    <i v-if="row.points[0] !== null && lastIndex(row.points)! > 0" class="sk__trail" :style="{ left: `min(${pos(row, row.points[0]!)}, ${pos(row, row.points[lastIndex(row.points)!]!)})`, right: `min(calc(100% - ${pos(row, row.points[0]!)}), calc(100% - ${pos(row, row.points[lastIndex(row.points)!]!)}))` }" />
                    <i v-if="row.points[0] !== null" class="sk__start" :style="{ left: pos(row, row.points[0]!) }" />
                    <i v-if="lastIndex(row.points) !== undefined && lastIndex(row.points)! > 0" class="sk__now" :style="{ left: pos(row, row.points[lastIndex(row.points)!]!) }" />
                  </span>
                </div>
                <div v-if="measureOpen" class="sk__table" role="table" aria-label="Pomiary w czasie ścieżki">
                  <div class="sk__tr sk__tr--head" role="row"><span /><span v-for="col in skillColumns" :key="col" role="columnheader">{{ col }}</span></div>
                  <div v-for="row in skills" :key="row.key" class="sk__tr" role="row">
                    <span role="rowheader">{{ row.name }} <small>{{ row.instrument }}</small></span>
                    <span v-for="(p, i) in row.points" :key="i" role="cell" class="sk__td" :class="{ 'is-pending': p === null }">{{ p === null ? '–' : format(p) }}</span>
                  </div>
                  <small class="muted">SCS-SF (1–5): jak traktujesz siebie w trudnych chwilach. FSCRS (0–4): jak często się krytykujesz i jak często uspokajasz. Dla dwóch dolnych torów mniej znaczy lepiej.</small>
                </div>
              </div>
            </section>

            <!-- Moje zdania -->
            <section v-if="ownSentences.length" class="card">
              <header class="card__head">
                <span>Moje zdania</span>
                <button v-if="ownSentences.length > 2" type="button" class="card__link" @click="showAllSentences = !showAllSentences">{{ showAllSentences ? 'Mniej' : 'Wszystkie' }}</button>
              </header>
              <ul class="quotes">
                <li v-for="sentence in ownSentences.slice(0, showAllSentences ? undefined : 2)" :key="sentence.text">„{{ sentence.text }}”</li>
              </ul>
            </section>

            <!-- Warto wiedzieć -->
            <section class="card">
              <header class="card__head">
                <span>Warto wiedzieć</span>
                <button v-if="allCards.length > 2" type="button" class="card__link" :aria-expanded="showAllCards" @click="showAllCards = !showAllCards">{{ showAllCards ? 'Mniej' : 'Wszystkie' }}</button>
              </header>
              <div class="kn">
                <button v-for="card in cards" :key="card.key" type="button" class="kn__tile" :class="{ 'is-read': readCards.includes(card.key) }" @click="drawerKey = card.key">
                  <span class="kn__icon"><AppIcon :name="readCards.includes(card.key) ? 'check' : 'menu_book'" /></span>
                  <strong>{{ card.title }}</strong>
                </button>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </div>

    <!-- 02 · audyt rozciągniętych rzędów -->
    <section v-if="!standalone" class="pv2__block">
      <header class="pv2__block-head">
        <span class="lab-eyebrow">02 · Rzędy rozciągnięte na całą szerokość</span>
        <h2>Gdzie to jest i co proponuję zamiast</h2>
      </header>
      <ul class="audit">
        <li v-for="item in audit" :key="item.id">
          <span class="audit__id">{{ item.id }}</span>
          <figure v-if="item.image" class="audit__figure"><img :src="item.image" :alt="`Obecnie: ${item.where}`" /></figure>
          <span v-else class="audit__figure audit__figure--empty">bez zrzutu</span>
          <div class="audit__copy">
            <strong>{{ item.where }}</strong>
            <p><b>Obecnie.</b> {{ item.now }}</p>
            <p><b>Propozycja.</b> {{ item.next }}</p>
          </div>
        </li>
      </ul>
    </section>

    <!-- 02b · wykres momentów -->
    <section v-if="!standalone" class="pv2__block">
      <header class="pv2__block-head">
        <span class="lab-eyebrow">02b · „Kto przejmuje ster” — kolumny tydzień po tygodniu, narysowane na niebie (runda 6j)</span>
        <h2>Pastele nieba, ołówkowy obrys, mała legenda po lewej w jednej kolumnie z opisami Pomiaru</h2>
      </header>
      <p class="charts__lead">Pierwsza paleta (nasycone róż · bursztyn · zieleń · lawenda · błękit) odrzucona 11.10: aplikacja bierze kolory z nieba i ma rysunkowy charakter. Runda 6k: dwie rodziny pasteli po dwa odcienie, bo części łączą się w pary (odczyt usera): atak = czerwienie z drabinki rose, którą aplikacja już ma — <b>Krytyk</b> rose-200 (na siebie), <b>Agresor</b> rose-400, czerwień „wysiłku” (na innych); ukrycie = fiolety — <b>Odwracający uwagę</b> jasny liliowy (przed sobą), <b>Ukrywający</b> lawenda (przed innymi); <b>Ja</b> = czyste niebo. W rodzinie jaśniejszy odcień = ku sobie, głębszy = ku innym. Każdy segment ma ołówkowy obrys, podstawa to kreskowana kreska jak w osi czasu obiektu, kolumny mają lekki przechył jak kafle. Legenda mała, po lewej, w tej samej kolumnie 7,4 rem co nazwy Pomiaru; najazd na tydzień wpisuje przy nazwach liczby tego tygodnia i pogrubia część, która dominowała — bez dymka. Kolejność w słupku Ja → liliowy → lawenda → rose-200 → rose-400 to jedyna, w której sąsiednie pary przechodzą próg CVD walidatora (najgorsza 8,0), przy normalnym widzeniu 10,9 (narzędzie jest skalibrowane pod nasycone wykresy), stąd obrys, przerwy i liczby na hover jako drugi kanał.</p>
      <div class="charts">
        <article v-for="c in chartsNow" :key="c.id" class="charts__item charts__item--wide" :class="{ 'is-active': chart === c.id }">
          <header><strong>{{ c.label }}</strong><button type="button" class="card__link" @click="setQuery('chart', c.id)">Pokaż</button></header>
          <div class="charts__stage charts__stage--tile">
            <MomentsChart :variant="c.id as MomentsChartVariant" :stats="stats" :slots="8" />
          </div>
          <p>Kolumna na tydzień, czas od lewej. Wysokość = ile momentów, segmenty = która część brała ster, „Ja” na dole jako grunt, który rośnie; nad nim para ukrycia (fiolety), na szczycie para ataku (czerwienie). Przyszłe tygodnie = puste miejsca nad kreską, cichy tydzień = pusta kolumna, szacunek „niezapisanych” z refleksji = kreskowana czapka. Osie: tylko T1 i T8, najechany tydzień podpisuje się sam. Warianty 100 % i pasek dominującej części z poprzedniej odpowiedzi usunięte — kolumny wybrane.</p>
        </article>
      </div>
      <details class="charts__earlier">
        <summary>Wcześniejsze odczyty (runda 6h — pionowa oś czasu, odrzucone 11.10)</summary>
        <div class="charts">
          <article v-for="c in chartsEarlier" :key="c.id" class="charts__item" :class="{ 'is-active': chart === c.id }">
            <header><strong>{{ c.label }}</strong><button type="button" class="card__link" @click="setQuery('chart', c.id)">Pokaż</button></header>
            <div class="charts__stage">
              <ShameMomentsGlance v-if="c.id === 'bars'" :stats="stats" :slots="8" />
              <MomentsChart v-else :variant="c.id as MomentsChartVariant" :stats="stats" />
            </div>
            <p v-if="c.id === 'tracks'">Tor na część, pozycja = momenty na tydzień; pusty punkt = początek, pełny = teraz. Odrzucone: nie widać przebiegu tydzień po tygodniu.</p>
            <p v-else-if="c.id === 'pair'">Start · Teraz jako dwa paski składu. Odrzucone: dwa punkty w czasie to za mało.</p>
            <p v-else-if="c.id === 'river'">Pasek na tydzień, ale czas biegnie w dół, a części różnią się tylko odcieniem błękitu. Odrzucone: oś czasu ma być pozioma.</p>
            <p v-else>Wiersz na część, słupek na tydzień, jeden odcień. Odrzucone: pięć wierszy po osiem słupków, trend składany w głowie.</p>
          </article>
        </div>
      </details>
    </section>

    <!-- 03 · decyzje -->
    <section v-if="!standalone" class="pv2__block">
      <header class="pv2__block-head">
        <span class="lab-eyebrow">03 · Decyzje projektowe</span>
        <h2>Do oceny</h2>
      </header>
      <ul class="pv2__decisions">
        <li v-for="d in decisions" :key="d.id">
          <span class="pv2__decision-id">{{ d.id }}</span>
          <div><strong>{{ d.title }}</strong><p>{{ d.body }}</p></div>
        </li>
      </ul>
    </section>

    <p v-if="notice" class="pv2__notice" role="status">
      {{ notice }}<button type="button" class="chip chip--ghost" aria-label="Zamknij komunikat" @click="notice = ''"><AppIcon name="close" /></button>
    </p>

    <dialog ref="drawerElement" class="drawer mg-design-v2" aria-labelledby="knowledge-title" @cancel="drawerKey = null" @click="$event.target === drawerElement && (drawerKey = null)">
      <template v-if="drawer">
        <header class="drawer__head">
          <span class="card__head"><span>Warto wiedzieć</span></span>
          <button type="button" class="chip chip--ghost" aria-label="Zamknij kartę wiedzy" @click="drawerKey = null"><AppIcon name="close" /></button>
        </header>
        <h2 id="knowledge-title">{{ drawer.title }}</h2>
        <p class="drawer__lead">{{ drawer.lead }}</p>
        <p v-for="paragraph in drawer.body" :key="paragraph">{{ paragraph }}</p>
        <details class="drawer__sources">
          <summary>Źródła</summary>
          <p v-for="source in drawer.sources" :key="source">{{ source }}</p>
        </details>
        <button type="button" class="btn-primary" @click="markRead">{{ readCards.includes(drawer.key) ? 'Zamknij' : 'Przeczytane' }}</button>
      </template>
    </dialog>
  </section>
</template>

<style scoped>
/* ── Lab chrome ── */
.pv2 { min-width: 0; padding-bottom: 40px; color: var(--mg-color-ink); }
.pv2__toolbar { display: flex; flex-wrap: wrap; align-items: center; gap: 14px; margin-bottom: 18px; padding: 12px 14px; border: 1px solid var(--mg-color-border); border-radius: var(--mg-radius-lg); background: var(--mg-color-mist); }
.pv2__select { display: inline-flex; align-items: center; gap: 8px; color: var(--mg-color-muted); font-size: 10px; font-weight: 800; letter-spacing: 0.04em; text-transform: uppercase; }
.pv2__select select { min-height: 34px; padding: 6px 28px 6px 10px; border: 1px solid var(--mg-color-field-border); border-radius: var(--mg-radius-sm); background: var(--mg-color-paper); color: var(--mg-color-ink); font: inherit; font-size: 12px; letter-spacing: 0; text-transform: none; }
.pv2__reset { min-height: 34px; margin-left: auto; padding: 0 12px; border: 1px solid var(--mg-color-border); border-radius: var(--mg-radius-sm); background: var(--mg-color-paper); color: var(--mg-color-primary-strong); font: inherit; font-size: 11px; font-weight: 800; cursor: pointer; }
.pv2__reset--tight { margin-left: 0; }
/* Standalone preview: the product's wide page (1600 px, dock gutter 72 px, grid 1.2fr / 1fr), no Lab chrome. */
.pv2--standalone { width: auto; min-height: 100vh; padding: 28px 32px 48px 104px; background: var(--mg-color-canvas); }
.pv2--standalone .pv2__stage { padding: 0; border: 0; border-radius: 0; background: transparent; }
.pv2--standalone .pv { max-width: 1600px; margin: 0; }
.pv2--standalone .pv__grid { grid-template-columns: minmax(0, 1.2fr) minmax(330px, 1fr); }
.pv2__stage { padding: 24px 22px 30px; border: 1px solid var(--mg-color-border); border-radius: var(--mg-radius-xl); background: var(--mg-color-canvas); }
.pv2__block { margin-top: 30px; }
.pv2__block-head { margin-bottom: 14px; }
.pv2__block-head h2 { margin: 6px 0 0; font-size: 20px; line-height: 1.2; }
.pv2__decisions { display: grid; gap: 8px; margin: 0; padding: 0; list-style: none; }
.pv2__decisions li { display: grid; grid-template-columns: 40px 1fr; gap: 12px; padding: 12px 14px; border: 1px solid var(--mg-color-border); border-radius: var(--mg-radius-md); background: var(--mg-color-mist); }
.pv2__decision-id { color: var(--mg-color-primary-strong); font-size: 12px; font-weight: 900; }
.pv2__decisions strong { display: block; font-size: 13px; }
.pv2__decisions p { margin: 4px 0 0; color: var(--mg-color-muted); font-size: 12px; line-height: 1.5; }
.pv2__notice { position: fixed; bottom: 20px; left: 50%; z-index: 8; display: flex; align-items: center; gap: 14px; max-width: 600px; margin: 0; padding: 12px 12px 12px 18px; border: 1px solid var(--mg-color-border); border-radius: var(--mg-radius-md); background: var(--mg-color-paper); box-shadow: var(--mg-shadow-raised); font-size: 12px; transform: translateX(-50%); }
.charts { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
.charts__item { display: grid; gap: 8px; padding: 14px; border: 1px solid var(--mg-color-border); border-radius: var(--mg-radius-md); background: var(--mg-color-mist); }
.charts__item.is-active { border-color: var(--mg-color-primary); }
.charts__item--wide { grid-column: 1 / -1; max-width: 40rem; }
.charts__stage--tile { background: var(--mg-color-mist); }
.charts__item header { display: flex; align-items: center; justify-content: space-between; gap: 8px; font-size: 13px; }
.charts__stage { padding: 12px; border-radius: var(--mg-radius-md); background: var(--mg-color-surface); }
.charts__item p { margin: 0; color: var(--mg-color-muted); font-size: 12px; line-height: 1.5; }
.charts__lead { margin: 0 0 12px; color: var(--mg-color-muted); font-size: 13px; line-height: 1.55; }
.charts__lead b { color: var(--mg-color-ink); }
.charts__earlier { margin-top: 14px; }
.charts__earlier > summary { cursor: pointer; color: var(--mg-color-primary-strong); font-size: 13px; font-weight: 800; }
.charts__earlier > .charts { margin-top: 10px; opacity: 0.85; }
.audit { display: grid; gap: 10px; margin: 0; padding: 0; list-style: none; }
.audit li { display: grid; grid-template-columns: 40px 300px minmax(0, 1fr); gap: 14px; align-items: start; padding: 12px 14px; border: 1px solid var(--mg-color-border); border-radius: var(--mg-radius-md); background: var(--mg-color-mist); }
.audit__id { color: var(--mg-color-primary-strong); font-size: 12px; font-weight: 900; }
.audit__figure { display: grid; place-items: center; min-height: 72px; margin: 0; overflow: hidden; border: 1px solid var(--mg-color-border); border-radius: var(--mg-radius-sm); background: var(--mg-color-paper); }
.audit__figure img { display: block; width: 100%; height: auto; }
.audit__figure--empty { color: var(--mg-color-muted); font-size: 11px; font-weight: 700; }
.audit__copy strong { display: block; font-size: 13px; }
.audit__copy p { margin: 6px 0 0; color: var(--mg-color-muted); font-size: 12px; line-height: 1.5; }
.audit__copy b { color: var(--mg-color-ink); }

/* ── Product vocabulary (ported from the shame-path scene, minus dashes) ── */
.pv { max-width: 1180px; margin: 0 auto; font-family: var(--mg-font-sans); }
.pv__head { display: grid; grid-template-columns: auto auto minmax(0, 1fr) auto; gap: var(--mg-space-3); align-items: start; margin-bottom: var(--mg-space-5); }
.pv__back { display: grid; place-items: center; width: 34px; height: 34px; margin-top: 10px; border: 0; border-radius: var(--mg-radius-organic-a); background: var(--mg-color-mist); color: var(--mg-color-primary-strong); cursor: pointer; }
.pv__icon { display: grid; place-items: center; width: 52px; height: 52px; margin-top: 2px; border-radius: var(--mg-radius-icon-field-a); background: var(--mg-color-sky-well); color: var(--mg-color-primary-strong); }
.pv__icon :deep(.app-icon) { font-size: 28px; }
.pv__titles { display: grid; gap: 4px; min-width: 0; }
.pv__eyebrow { color: var(--mg-color-primary-strong); font-size: var(--mg-font-size-xs); font-weight: 900; letter-spacing: 0.1em; text-transform: uppercase; }
.pv__eyebrow b { margin-left: 10px; color: var(--mg-color-muted); font-weight: 700; letter-spacing: 0.04em; text-transform: none; }
.pv__titles h1 { margin: 0; font-size: 26px; font-weight: 800; letter-spacing: -0.015em; line-height: 1.15; }
.pv__goal { max-width: 62ch; margin: 2px 0 0; color: var(--mg-color-muted); font-size: var(--mg-font-size-sm); line-height: 1.55; }
.pv__sign { display: flex; flex-wrap: wrap; align-items: baseline; gap: 2px 10px; margin: 6px 0 0; }
.pv__sign small { color: var(--mg-color-muted); font-size: 0.66rem; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; }
.pv__sign em { font-size: var(--mg-font-size-sm); font-weight: 600; line-height: 1.45; }
.pv__menu { position: relative; margin-top: 8px; }
.pv__menu-list { position: absolute; right: 0; z-index: 3; display: grid; min-width: 11rem; margin-top: 4px; padding: 4px; border: 1px solid var(--mg-color-border); border-radius: var(--mg-radius-md); background: var(--mg-color-paper); box-shadow: var(--mg-shadow-raised-sm); }
.pv__menu-list button { padding: 8px 10px; border: 0; border-radius: var(--mg-radius-sm); background: transparent; color: var(--mg-color-ink); font: inherit; font-size: var(--mg-font-size-sm); font-weight: 700; text-align: left; cursor: pointer; }
.pv__menu-list button:hover { background: var(--mg-color-mist); }
.pv__grid { display: grid; grid-template-columns: minmax(0, 1.5fr) minmax(300px, 1fr); gap: var(--mg-space-5); align-items: start; }
.pv__side { display: grid; gap: var(--mg-space-4); min-width: 0; }
.card { min-width: 0; padding: var(--mg-space-4); border: 1px solid var(--mg-color-border); border-radius: var(--mg-radius-lg); background: var(--mg-color-surface); box-shadow: var(--mg-shadow-raised-sm); }
.card__head { display: flex; align-items: center; justify-content: space-between; gap: var(--mg-space-2); margin-bottom: var(--mg-space-3); color: var(--mg-color-primary-strong); font-size: var(--mg-font-size-xs); font-weight: 900; letter-spacing: 0.1em; text-transform: uppercase; }
.card__head small { color: var(--mg-color-muted); font-size: var(--mg-font-size-xs); font-weight: 700; letter-spacing: 0.02em; text-transform: none; }
.card__link { padding: 2px 0; border: 0; background: none; color: var(--mg-color-primary-strong); font: inherit; font-size: var(--mg-font-size-xs); font-weight: 800; letter-spacing: 0.02em; text-transform: none; cursor: pointer; }
.card__link:hover { text-decoration: underline; }
.muted { margin: 0; color: var(--mg-color-muted); font-size: var(--mg-font-size-xs); line-height: 1.5; }
.chip { display: inline-flex; align-items: center; gap: 5px; min-height: 1.75rem; padding: 3px var(--mg-space-2); border: 1px solid var(--mg-color-border); border-radius: var(--mg-radius-sm); background: var(--mg-color-paper); color: var(--mg-color-muted); font: inherit; font-size: var(--mg-font-size-xs); font-weight: 800; white-space: nowrap; cursor: pointer; }
.chip :deep(.app-icon) { font-size: var(--mg-font-size-sm); }
.chip:hover, .chip.is-active { background: var(--mg-color-sky-well); color: var(--mg-color-primary-strong); }
.chip:disabled { opacity: 0.5; cursor: default; }
.chip--primary { border-color: transparent; background: var(--mg-color-primary-fill); color: var(--mg-color-on-primary); }
.chip--primary:hover { background: var(--mg-color-primary-fill-hover); color: var(--mg-color-on-primary); }
.chip--ghost { border-color: transparent; background: transparent; }
.chips { display: flex; flex-wrap: wrap; gap: 6px; margin-top: var(--mg-space-3); }
.chips--top { margin-top: 0; }
.btn-primary { display: inline-flex; align-items: center; justify-content: center; gap: var(--mg-space-2); min-height: 2.25rem; padding: 0 var(--mg-space-4); border: 1px solid transparent; border-radius: var(--mg-radius-md); background: var(--mg-color-primary-fill); color: var(--mg-color-on-primary); font: inherit; font-size: var(--mg-font-size-sm); font-weight: 800; white-space: nowrap; cursor: pointer; }
.btn-primary:hover { background: var(--mg-color-primary-fill-hover); }

/* Wells: the app's completion disc. */
.well { position: relative; display: grid; place-items: center; flex: 0 0 auto; width: var(--well, 1.85rem); height: var(--well, 1.85rem); border: 1px solid var(--mg-color-border); border-radius: var(--mg-radius-organic-a); background: var(--mg-color-canvas); box-shadow: var(--mg-shadow-inset-sm); color: var(--mg-color-muted); font-size: var(--mg-font-size-xs); font-weight: 800; font-style: normal; }
.well--sm { --well: 1.3rem; }
.well--done { border-color: transparent; background: var(--mg-color-sky-field); }
.well--done::after { width: 62%; aspect-ratio: 1; border-radius: var(--mg-radius-organic-c); background: var(--mg-color-state); content: ''; transform: rotate(-2deg); }
.well--current { border-color: var(--mg-color-primary); color: var(--mg-color-primary-strong); box-shadow: var(--mg-shadow-inset-sm), 0 0 0 3px var(--mg-color-primary-soft); }
.well--today { border-color: var(--mg-color-primary); }
.well--past { border-color: transparent; background: var(--mg-color-sky-field); color: var(--mg-color-primary-strong); box-shadow: none; }
.well :deep(.app-icon) { font-size: var(--mg-font-size-sm); }
.wells { display: inline-flex; gap: 4px; }

/* The week's state disc: the Today rating disc (fill from the left + reading). */
.disc { --well: 2.1rem; overflow: hidden; }
.disc--meter { color: var(--mg-color-primary-strong); background: linear-gradient(to right, var(--mg-color-sky-field) var(--fill, 0%), var(--mg-color-canvas) var(--fill, 0%)); }
.disc b { font-size: 0.78rem; font-weight: 900; line-height: 1; }
.disc b i { font-size: 0.6rem; font-weight: 700; font-style: normal; opacity: 0.7; }

/* ── Twoja droga ── */
.pv__journey { display: grid; gap: 2px; }
.pv__journey > .card__head { margin-bottom: var(--mg-space-2); }
.confirm { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: var(--mg-space-3); align-items: center; margin-bottom: var(--mg-space-2); padding: var(--mg-space-2) var(--mg-space-3); border-radius: var(--mg-radius-md); background: var(--mg-color-mist); font-size: var(--mg-font-size-sm); font-weight: 600; }
.confirm__actions { display: inline-flex; gap: 6px; }
.wk { border-radius: var(--mg-radius-md); transition: background var(--mg-duration-fast) var(--mg-ease-standard); }
.wk:hover { background: var(--mg-color-mist); }
.wk--open, .wk--open:hover { background: var(--mg-color-mist); }
.wk--return { margin-top: var(--mg-space-3); }
.wk__row { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; gap: var(--mg-space-3); align-items: center; width: 100%; min-height: 3rem; padding: var(--mg-space-2) var(--mg-space-3) var(--mg-space-2) var(--mg-space-2); border: 0; background: transparent; color: inherit; font: inherit; text-align: left; cursor: pointer; }
.wk__copy { display: grid; gap: 2px; min-width: 0; }
.wk__title { font-size: var(--mg-font-size-md); font-weight: 700; line-height: 1.3; }
.wk--later .wk__title { color: color-mix(in srgb, var(--mg-color-ink) 70%, var(--mg-color-muted)); font-weight: 600; }
.wk--current .wk__title { font-weight: 800; }
/* The week's "why": its own quiet field under the head row (user, 11.10: the title sits level with the number well, the description gets a separate place). */
.wk__why { margin: 0 var(--mg-space-2) var(--mg-space-2); padding: 10px 14px; border-radius: var(--mg-radius-md); background: var(--mg-color-paper); color: var(--mg-color-muted); font-size: var(--mg-font-size-sm); font-weight: 500; line-height: 1.45; }
.wk__body { display: grid; grid-template-columns: repeat(var(--cols, 4), minmax(0, 1fr)); gap: var(--mg-space-2); align-items: stretch; padding: var(--mg-space-1) var(--mg-space-2) var(--mg-space-3); }

/* Step tiles: the quiet field ("Czy nie za dużo?") — title, one sentence, nothing else unless current.
   Columns follow the week (max four); tiles in one field share the row's height (user, 2026-10-11),
   the footer stays at the bottom. Tonal ladder: card (surface) → open row (mist) → tiles (paper). */
.tile { position: relative; display: flex; flex-direction: column; gap: var(--mg-space-1); min-width: 0; padding: var(--mg-space-3); border: 1px solid transparent; border-radius: var(--mg-radius-md); background: var(--mg-color-paper); transition: background var(--mg-duration-fast) var(--mg-ease-standard); }
.tile__head { display: flex; align-items: flex-start; justify-content: space-between; gap: var(--mg-space-2); }
.tile__title { font-size: var(--mg-font-size-sm); font-weight: 700; line-height: 1.3; }
.tile__mark { flex: 0 0 auto; margin-top: 1px; color: var(--mg-color-muted); font-size: var(--mg-font-size-xs); font-weight: 700; white-space: nowrap; }
.tile__what { display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 4; margin: 0; overflow: hidden; color: var(--mg-color-muted); font-size: var(--mg-font-size-xs); line-height: 1.5; }
.tile__why { margin: 0; color: var(--mg-color-muted); font-size: var(--mg-font-size-xs); line-height: 1.5; }
.tile__why b { color: var(--mg-color-primary-strong); font-weight: 800; }
.tile__foot { display: flex; flex-wrap: nowrap; align-items: center; gap: 6px 8px; margin-top: var(--mg-space-1); padding-top: var(--mg-space-1); }
.tile__foot small { color: var(--mg-color-muted); font-size: var(--mg-font-size-xs); font-weight: 700; }
.tile--current { border-color: var(--mg-color-primary-soft); background: var(--mg-color-paper); box-shadow: 0 0 0 3px var(--mg-color-primary-soft); }
.tile--current .tile__title { font-weight: 800; }
.tile--current .tile__what { display: block; -webkit-line-clamp: unset; color: var(--mg-color-ink); }
.tile--paused { border-color: var(--mg-color-border); box-shadow: none; }
/* Done: same tone (never back to blue), quieter ink, the done well beside the title, two lines of the sentence. */
.tile--done .tile__title { color: color-mix(in srgb, var(--mg-color-ink) 60%, var(--mg-color-muted)); }
.tile--done .tile__what { -webkit-line-clamp: 2; color: color-mix(in srgb, var(--mg-color-muted) 72%, var(--mg-color-paper)); }
.tile--done .tile__mark { transition: opacity var(--mg-duration-fast) var(--mg-ease-standard); }
.tile__tray { position: absolute; top: calc(var(--mg-space-3) - 2px); right: var(--mg-space-3); display: inline-flex; align-items: center; gap: 4px; padding-left: 10px; background: var(--mg-color-paper); box-shadow: -14px 0 12px -2px var(--mg-color-paper); opacity: 0; pointer-events: none; white-space: nowrap; transition: opacity var(--mg-duration-fast) var(--mg-ease-standard); }
.tile__tray small { color: var(--mg-color-muted); font-size: var(--mg-font-size-xs); font-weight: 700; }
.tile--done:hover .tile__tray, .tile--done:focus-within .tile__tray { opacity: 1; pointer-events: auto; }
.tile--done:hover .tile__mark, .tile--done:focus-within .tile__mark { opacity: 0; }
.closed { display: grid; grid-template-columns: auto minmax(0, 1fr); gap: var(--mg-space-3); align-items: start; margin-top: var(--mg-space-3); padding: var(--mg-space-3); border-radius: var(--mg-radius-md); background: var(--mg-color-mist); }
.closed__icon { display: grid; place-items: center; width: 2.6rem; height: 2.6rem; border-radius: var(--mg-radius-icon-field-b); background: var(--mg-color-sky-well); color: var(--mg-color-primary-strong); }
.closed__icon :deep(.app-icon) { font-size: 24px; }
.closed__copy { display: grid; gap: var(--mg-space-1); align-self: center; }
.closed__copy strong { font-size: var(--mg-font-size-sm); }
.closed .chips { margin-top: var(--mg-space-1); }

/* ── Right column ── */
.blk__label { color: var(--mg-color-muted); font-size: 0.66rem; font-weight: 900; letter-spacing: 0.1em; text-transform: uppercase; }
.card__link.is-active { text-decoration: underline; }
/* Practice tiles: the step-tile anatomy, one ladder step below the card (mist), up to three per row. */
/* As many tiles as fit at ≥ 11 rem each (three in the product column, two in a narrow one); never stretched to fill. */
.pr-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(11rem, 100%), 1fr)); gap: var(--mg-space-2); align-items: stretch; }
.tile--mist { background: var(--mg-color-mist); }
.opts { margin-top: var(--mg-space-2); }
.opt { position: relative; display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: var(--mg-space-2); align-items: center; padding: var(--mg-space-1) var(--mg-space-2); border-radius: var(--mg-radius-sm); cursor: pointer; }
.opt:hover, .opt.is-selected { background: var(--mg-color-mist); }
.opt input { position: absolute; inset: 0; margin: 0; opacity: 0; cursor: inherit; }
.opt strong { font-size: var(--mg-font-size-sm); font-weight: 700; }
.opt small { color: var(--mg-color-muted); font-size: var(--mg-font-size-xs); font-weight: 700; }
.quote { display: grid; gap: var(--mg-space-2); margin-top: var(--mg-space-3); padding: var(--mg-space-3); border: 1px solid var(--mg-color-border); border-radius: var(--mg-radius-md); background: var(--mg-color-mist); }
.quote p { margin: 0; font-size: var(--mg-font-size-sm); line-height: 1.5; }
.quote em { font-style: normal; font-weight: 700; }
.quote .chip { justify-self: start; }
.ptile { display: grid; gap: 6px; padding: 12px 14px 12px; border-radius: var(--mg-radius-md); background: var(--mg-color-mist); }
.ptile + .ptile { margin-top: var(--mg-space-3); }
.measure { display: grid; gap: 6px; }
.measure__head { display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 2px; }
.sk { display: grid; grid-template-columns: 7.4rem minmax(0, 1fr); gap: var(--mg-space-2); align-items: center; min-height: 1.3rem; }
.sk__label { color: var(--mg-color-muted); font-size: var(--mg-font-size-xs); font-weight: 700; line-height: 1.2; }
.sk__track { position: relative; display: block; height: 0.45rem; border-radius: 4px; background: var(--mg-color-paper); box-shadow: var(--mg-shadow-inset-sm); }
.sk__trail { position: absolute; top: 0; bottom: 0; border-radius: inherit; background: color-mix(in srgb, var(--mg-color-primary) 34%, var(--mg-color-paper)); }
.sk__start, .sk__now { position: absolute; top: 50%; width: 0.7rem; height: 0.7rem; border: 1.5px solid var(--mg-color-primary-fill); border-radius: var(--mg-radius-organic-a); background: var(--mg-color-paper); transform: translate(-50%, -50%); }
.sk__now { z-index: 1; background: var(--mg-color-primary-fill); }
.sk__table { display: grid; gap: 4px; margin-top: var(--mg-space-2); }
.sk__tr { display: grid; grid-template-columns: minmax(0, 1.6fr) repeat(4, minmax(0, 1fr)); gap: 4px; align-items: center; font-size: var(--mg-font-size-xs); }
.sk__tr--head span { color: var(--mg-color-muted); font-weight: 800; text-align: center; }
.sk__tr [role='rowheader'] { font-weight: 700; }
.sk__tr [role='rowheader'] small { color: var(--mg-color-muted); font-weight: 600; }
.sk__td { padding: 4px 0; border-radius: var(--mg-radius-sm); background: var(--mg-color-paper); color: var(--mg-color-ink); font-weight: 800; text-align: center; }
.sk__td.is-pending { border: 1px dashed var(--mg-color-border); background: transparent; color: var(--mg-color-muted); }
.sk__table > .muted { margin-top: var(--mg-space-1); }
.quotes { display: grid; gap: var(--mg-space-2); margin: 0; padding: 0; list-style: none; font-size: var(--mg-font-size-sm); font-weight: 700; line-height: 1.45; }

/* Knowledge tiles. */
.kn { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--mg-space-2); }
.kn__tile { display: grid; grid-template-columns: auto minmax(0, 1fr); gap: var(--mg-space-2); align-items: center; min-height: 3.2rem; padding: var(--mg-space-2); border: 0; border-radius: var(--mg-radius-md); background: var(--mg-color-mist); color: inherit; font: inherit; text-align: left; cursor: pointer; transition: background var(--mg-duration-fast) var(--mg-ease-standard); }
.kn__tile:hover { background: var(--mg-color-paper); }
.kn__tile strong { font-size: var(--mg-font-size-xs); font-weight: 700; line-height: 1.3; }
.kn__icon { display: grid; place-items: center; width: 1.85rem; height: 1.85rem; border-radius: var(--mg-radius-icon-field-b); background: var(--mg-color-sky-well); color: var(--mg-color-primary-strong); }
.kn__icon :deep(.app-icon) { font-size: 16px; }
.kn__tile.is-read .kn__icon { background: var(--mg-color-sky-field); }

/* Drawer. */
.drawer { position: fixed; inset: 0 0 0 auto; width: min(540px, 90vw); height: 100vh; max-height: 100vh; margin: 0; padding: 28px 32px 32px; border: 0; border-left: 1px solid var(--mg-color-border); border-radius: var(--mg-radius-lg) 0 0 var(--mg-radius-lg); background: var(--mg-color-paper); color: var(--mg-color-ink); font-family: var(--mg-font-sans); }
.drawer::backdrop { background: var(--mg-color-scrim); }
.drawer__head { display: flex; align-items: center; justify-content: space-between; }
.drawer__head .card__head { margin: 0; }
.drawer h2 { margin: 18px 0 10px; font-size: 24px; font-weight: 800; line-height: 1.25; }
.drawer p { margin: 12px 0; font-size: var(--mg-font-size-md); line-height: 1.7; }
.drawer__lead { color: var(--mg-color-primary-strong); font-weight: 700; }
.drawer__sources { margin: 20px 0; color: var(--mg-color-muted); font-size: var(--mg-font-size-xs); }
.drawer__sources summary { cursor: pointer; font-weight: 800; }
.drawer__sources p { font-size: var(--mg-font-size-xs); line-height: 1.5; }
.pv2 :focus-visible, .drawer :focus-visible { outline: 2px solid var(--mg-color-focus); outline-offset: 2px; }

@media (max-width: 1180px) {
  .pv__grid { grid-template-columns: 1fr; }
  .pv__side { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .audit li { grid-template-columns: 40px 1fr; }
  .audit__figure { grid-column: 2; }
}
@media (max-width: 900px) {
  .pv__side { grid-template-columns: 1fr; }
  .wk__body { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
@media (prefers-reduced-motion: reduce) {
  .pv2 * { transition: none; }
}
</style>
