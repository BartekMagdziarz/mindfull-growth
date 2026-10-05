<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppIcon from '@product/components/shared/AppIcon.vue'
import { collectOwnSentences, UNLOGGED_BUCKETS } from '@product/domain/momentsProgress'
import ShameMomentsGlance from '~lab/components/ShameMomentsGlance.vue'
import {
  samples,
  weeks,
  totalSteps,
  entries,
  ownEntries,
  statsFor,
  weeksLived,
  cardsFor,
  pathCopy,
  sentenceSources,
  skillsFor,
  skillColumns,
  type Sample,
  type Surface,
} from '~lab/lab/shamePath'

/**
 * Shame path v3 · P2 · round 3 — the path view redrawn in the language of
 * Dzisiaj / Kalendarz / Obiekty after the Codex draft (round 2):
 * one card for the whole journey with weeks as rows (the Dzisiaj row grammar,
 * the open week one step whiter), steps as small wells, Momenty read as a
 * matrix heatmap + reading discs + stacked bars (the Kalendarz grammar),
 * uppercase eyebrows for card heads, chip actions, no pills or badges.
 */
const route = useRoute()
const router = useRouter()
const sample = computed(() =>
  samples.some(s => s.id === route.query.sample) ? (route.query.sample as Sample) : 'mid'
)
const surface = computed<Surface>(() =>
  route.query.surface === 'reflection' || route.query.surface === 'today' ? route.query.surface : 'dashboard'
)
const closed = computed(() => sample.value === 'completed' || sample.value === 'return')
const currentWeek = computed(() =>
  sample.value === 'start' ? 0 : sample.value === 'return' ? 8 : closed.value ? -1 : 3
)
const currentStep = computed(() => (sample.value === 'start' || sample.value === 'return' ? 0 : 1))
const expanded = ref<number[]>([3])
const stats = computed(() => statsFor(sample.value))
const skills = computed(() => skillsFor(sample.value))
const phaseKey = computed(() => weeks[Math.max(0, currentWeek.value)]!.key)
const allCards = computed(() => cardsFor(phaseKey.value))
const showAllCards = ref(false)
const cards = computed(() =>
  showAllCards.value ? allCards.value : allCards.value.filter(c => c.pinned || c.phaseKeys.includes(phaseKey.value))
)
const readCards = ref<string[]>([])
const drawerKey = ref<string | null>(null)
const drawer = computed(() => allCards.value.find(c => c.key === drawerKey.value))
const drawerElement = ref<HTMLDialogElement>()
const showAllSentences = ref(false)
const ownSentences = computed(() =>
  sample.value === 'start'
    ? []
    : collectOwnSentences([
        ...entries.filter(e => e.createdAt <= (closed.value ? '2026-11-02' : '2026-10-05')),
        ...ownEntries,
      ])
)
const notice = ref('')
const unlogged = ref<string | null>(null)
const severity = ref<number | null>(null)
const reflection = ref('')
const reflectionStats = computed(() =>
  stats.value.slice(-2).map((week, i, list) => ({
    ...week,
    ...(i === list.length - 1 && unlogged.value ? { unlogged: UNLOGGED_BUCKETS[unlogged.value] } : {}),
  }))
)
const responseOpen = ref(false)
const futureLetterOpen = ref(false)
const skillDetails = ref(false)
const taskOpen = ref(false)
const task = ref('stayLonger')
const tasks = [
  { key: 'stayLonger', title: 'Zostań w sytuacji minutę dłużej', times: 2, done: 1 },
  { key: 'repairGuilt', title: 'Napraw to, co możesz naprawić', times: 2, done: 0 },
]
const chosenTask = computed(() => tasks.find(t => t.key === task.value)!)
const nextStep = computed(() => weeks[Math.max(0, currentWeek.value)]!.steps[currentStep.value]!)
const doneSteps = computed(() => {
  if (closed.value) return totalSteps
  return weeks.slice(0, currentWeek.value).reduce((sum, w) => sum + w.steps.length, 0) + currentStep.value
})
const stepOrdinal = computed(() => doneSteps.value + 1)
const practiceDays = computed(() => (sample.value === 'quiet' ? [] : [0, 2, 5]))
const dayLetters = ['p', 'w', 'ś', 'c', 'p', 's', 'n']
const dayNames = ['Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota', 'Niedziela']

function setQuery(key: string, value: string) {
  void router.replace({ query: { ...route.query, [key]: value } })
}
function openResponse() {
  setQuery('surface', 'dashboard')
  responseOpen.value = true
}
function toggleWeek(index: number) {
  expanded.value = expanded.value.includes(index)
    ? expanded.value.filter(i => i !== index)
    : [...expanded.value, index]
}
type StepState = 'done' | 'current' | 'later'
function stepState(wi: number, si: number): StepState {
  if (wi < 8 && closed.value) return 'done'
  if (wi < currentWeek.value || (wi === currentWeek.value && si < currentStep.value)) return 'done'
  return wi === currentWeek.value && si === currentStep.value ? 'current' : 'later'
}
function weekState(wi: number): StepState {
  if (wi === currentWeek.value) return 'current'
  if (wi < 8 && (closed.value || wi < currentWeek.value)) return 'done'
  return 'later'
}
function weekDone(wi: number) {
  return weeks[wi]!.steps.filter((_, si) => stepState(wi, si) === 'done').length
}
function pickTask(key: string) {
  task.value = key
  taskOpen.value = false
}
function reset() {
  expanded.value = currentWeek.value < 0 ? [] : [currentWeek.value]
  readCards.value = []
  unlogged.value = null
  severity.value = null
  reflection.value = ''
  task.value = 'stayLonger'
  taskOpen.value = false
  showAllCards.value = false
  showAllSentences.value = false
  responseOpen.value = false
  futureLetterOpen.value = false
  skillDetails.value = false
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
function simulate(title: string) {
  notice.value = `Podgląd w Labie: „${title}”. Przejście do ćwiczenia zostanie podłączone przy wdrożeniu.`
}
const skillPos = (row: { min: number; max: number; lessIsBetter: boolean }, value: number) => {
  const share = (value - row.min) / (row.max - row.min)
  return (row.lessIsBetter ? 1 - share : share) * 100
}
const lastPoint = (points: (number | null)[]) => [...points].reverse().find(p => p !== null) ?? null
const lastPointIndex = (points: (number | null)[]) =>
  points.length - 1 - [...points].reverse().findIndex(p => p !== null)
function trail(row: { min: number; max: number; lessIsBetter: boolean; points: (number | null)[] }) {
  const start = row.points[0]
  const now = lastPoint(row.points)
  if (start === null || start === undefined || now === null || lastPointIndex(row.points) === 0) return null
  const a = skillPos(row, start)
  const b = skillPos(row, now)
  return { left: `${Math.min(a, b)}%`, width: `${Math.max(0.5, Math.abs(a - b))}%` }
}
const formatDate = (iso: string) => new Date(iso).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' })

const decisions = [
  { id: 'D1', title: 'Jedna karta „Twoja droga”, tygodnie jako wiersze', body: 'Zamiast dziewięciu osobnych kart z cieniem — jedna karta i wiersze jak w planie dnia: przezroczyste w spoczynku, mist na hover, otwarty tydzień na papierze (jeden stopień bielszy), bez obrysu i bez wypełnionego numeru. Numer tygodnia to dysk-studnia z Dzisiaj: ukończony = wypełniony, bieżący = pusta studnia z pierścieniem.' },
  { id: 'D2', title: 'Kroki jako małe studnie, nie kropki 6 px', body: 'W zwiniętym wierszu kroki tygodnia to rząd małych organicznych studni (zrobiony = wypełniony, bieżący = pierścień, dalszy = kontur); w rozwiniętym — lista z tą samą studnią przy nazwie. Czas i „opcjonalnie” tylko w rozwinięciu.' },
  { id: 'D3', title: 'Momenty czytane jak Kalendarz: macierz zamiast szrafur', body: 'Szkic używał czterech wzorów (paski, kropki, kratka) dla części — obcych aplikacji i trudnych do odczytu. Teraz „Kto przejmuje ster” to macierz cieplna wiersze = części × kolumny = tygodnie (gramatyka kart tygodnia), ton = częstość, wiersz „Żadna część” w mocnym atramencie jako nowy wzorzec, „Niezapisane ≈” kreskowane. Bez palety kategorycznej, bez legendy wzorów.' },
  { id: 'D4', title: 'Odpowiedź zamiast reakcji = dyski odczytu z Dzisiaj', body: 'Zamiast kropek na kreskowanej osi — jeden dysk na tydzień wypełniany od dołu (ten sam dysk, co odczyt liczbowy we wstędze 7 dni), ułamek pod spodem, cichy tydzień = pusty dysk z kreską, przyszłe tygodnie = kreskowane gniazda. Pomiar „Kiedy zauważam” = dwa paski warstwowe Początek / Ostatnio w tonach błękitu (ciemniej = wcześniej).' },
  { id: 'D5', title: 'Umiejętności: w prawo zawsze znaczy „w stronę celu”', body: 'Wiersze „mniej znaczy lepiej” są odwrócone i mówią to w etykiecie („Mniej nieadekwatnego ja”), zamiast strzałek ↑↓ i różu. Pusty punkt = start, pełny = ostatni pomiar; „Pomiary” rozwija siatkę Start · Połowa · Koniec · Powrót z pustymi gniazdami jak w ProgramOutcomeSummary.' },
  { id: 'D6', title: 'Nagłówki kart = wersaliki jak w Dzisiaj, akcje = czipy, zero pigułek', body: 'Każda karta ma wersalikowy nagłówek z Dzisiaj (NAJBLIŻEJ, ŚCIEŻKI) i jedną cichą akcję po prawej. Akcje w treści to czipy z rozwiniętego wiersza planu dnia (papier, obwódka, organiczny promień), jeden wypełniony przycisk na stronie — „Rozpocznij” w karcie TERAZ. Rozmiary tekstu z drabinki tokenów (11 / 13 / 15 px); nic poniżej 11 px poza literami dni.' },
  { id: 'D7', title: 'Zadanie tygodnia jako wiersz ze studnią, nie <select>', body: 'W polu „W świecie” zadanie to wiersz z dyskiem wykonania i ułamkiem „1 z 2”; „Zmień” rozwija pozostałe zadania jako wiersze radiowe (ten sam ProgramTaskChoice, już przerobiony na wiersze ze studnią).' },
  { id: 'D8', title: 'Refleksja i pole w Dzisiaj replikują gotowe komponenty', body: 'Blok w refleksji tygodnia używa kompaktowej wersji tych samych trzech obrazów (ten tydzień obok poprzedniego), pytań jako czipów i skali 1–5 w stylu qr-scale. Pole w Dzisiaj to grupa next-day-rail__group (papier, wersaliki, wiersze ndi) — zgodnie z rundą 2: nawigacja, najbliższy krok, praktyka, ≤2 akcje.' },
]
</script>

<template>
  <section class="scenario-page spv mg-design-v2">
    <header class="concept-heading">
      <div>
        <span class="lab-eyebrow">P2 · Ścieżka „Ze wstydu do współczucia” · widok ścieżki, refleksja, Dzisiaj · runda 3</span>
        <h1>Jedna droga w jednej karcie, bieżący tydzień na wierzchu, postęp czytany jak Kalendarz</h1>
        <p>
          Przerysowanie szkicu z rundy 2 (Codex) w języku Dzisiaj, Kalendarza i Obiektów: wiersze zamiast stosu kart,
          studnie zamiast kropek, macierz cieplna zamiast szrafur, wersalikowe nagłówki i czipy zamiast pigułek.
          Dane przykładowe liczy czysta domena <code>momentsProgress</code>; karty wiedzy biorą kopię PL z aplikacji.
        </p>
      </div>
      <span class="status-badge status-badge--experiment">Propozycja do oceny · runda 3</span>
    </header>

    <div class="spv__toolbar">
      <div class="spv__tabs" role="tablist" aria-label="Powierzchnia konceptu">
        <button
          v-for="tab in [
            { id: 'dashboard', label: 'Widok ścieżki' },
            { id: 'reflection', label: 'Refleksja tygodnia' },
            { id: 'today', label: 'Pole w Dzisiaj' },
          ]"
          :key="tab.id"
          type="button"
          role="tab"
          :aria-selected="surface === tab.id"
          @click="setQuery('surface', tab.id)"
        >
          {{ tab.label }}
        </button>
      </div>
      <label class="spv__select"
        >Scenariusz
        <select :value="sample" @change="setQuery('sample', ($event.target as HTMLSelectElement).value)">
          <option v-for="s in samples" :key="s.id" :value="s.id">{{ s.label }}</option>
        </select></label
      >
      <button type="button" class="spv__reset" @click="reset">Przywróć przykład</button>
    </div>

    <!-- ───────────── 01 · widok ścieżki ───────────── -->
    <div v-if="surface === 'dashboard'" class="spv__stage">
      <div class="pv">
        <header class="pv__head">
          <button type="button" class="pv__back" aria-label="Wróć do ćwiczeń"><AppIcon name="arrow_back" /></button>
          <span class="pv__icon"><AppIcon name="mg-exercise-compassionate-image" /></span>
          <div class="pv__titles">
            <span class="pv__eyebrow">
              Ścieżki
              <b>{{
                closed
                  ? sample === 'return'
                    ? 'Powrót · 8 tygodni po zakończeniu'
                    : 'Zakończona · Powrót 27 grudnia'
                  : `Tydzień ${currentWeek + 1} z 8 · krok ${stepOrdinal} z ${totalSteps}`
              }}{{ sample === 'paused' ? ' · wstrzymana' : '' }}</b>
            </span>
            <h1>Ze wstydu do współczucia</h1>
            <p class="pv__goal">
              Zauważać wstyd szybciej. Odpowiadać ciepłem — sobie i innym — zamiast atakiem albo ukryciem. Wracać do kontaktu.
            </p>
          </div>
          <div class="pv__head-actions">
            <button v-if="!closed" type="button" class="chip" @click="setQuery('sample', sample === 'paused' ? 'mid' : 'paused')">
              <AppIcon :name="sample === 'paused' ? 'play_arrow' : 'pause'" />{{ sample === 'paused' ? 'Wznów' : 'Wstrzymaj' }}
            </button>
            <button type="button" class="chip" @click="setQuery('sample', 'start')"><AppIcon name="replay" />Od nowa</button>
          </div>
        </header>

        <p class="pv__sign" :class="{ 'is-empty': sample === 'start' }">
          <AppIcon name="mg-exercise-my-sign" />
          <span>
            <small>Mój znak</small>
            <em v-if="sample !== 'start'">„Gdy zrobię błąd przy ludziach, zostanę w rozmowie zamiast zniknąć.”</em>
            <em v-else>Twoje zdanie pojawi się po kroku „Mój znak” w pierwszym tygodniu.</em>
          </span>
        </p>

        <div class="pv__grid">
          <!-- left: the journey -->
          <section class="card pv__journey" aria-label="Twoja droga">
            <header class="card__head">
              <span>Twoja droga</span>
              <small>{{ doneSteps }} z {{ totalSteps }} kroków</small>
            </header>

            <article
              v-for="(week, wi) in weeks"
              :key="week.key"
              class="wk"
              :class="[`wk--${weekState(wi)}`, { 'wk--open': expanded.includes(wi), 'wk--return': wi === 8 }]"
            >
              <button
                type="button"
                class="wk__row"
                :aria-expanded="expanded.includes(wi)"
                :aria-controls="`week-${week.key}`"
                @click="toggleWeek(wi)"
              >
                <span class="well wk__disc" :class="{ 'well--done': weekState(wi) === 'done', 'well--current': weekState(wi) === 'current' }">
                  <AppIcon v-if="wi === 8" name="replay" />
                  <b v-else-if="weekState(wi) !== 'done'">{{ wi + 1 }}</b>
                </span>
                <span class="wk__title">
                  <strong>{{ week.title }}</strong>
                  <small v-if="wi === 8">8 tygodni po zakończeniu</small>
                  <small v-else-if="weekState(wi) === 'current'">Ten tydzień · {{ weekDone(wi) }} z {{ week.steps.length }} kroków</small>
                </span>
                <span class="wk__marks" :aria-label="`${weekDone(wi)} z ${week.steps.length} kroków`">
                  <i v-for="(_, si) in week.steps" :key="si" class="mark" :class="`mark--${stepState(wi, si)}`" />
                </span>
                <AppIcon class="wk__chevron" :name="expanded.includes(wi) ? 'expand_less' : 'expand_more'" />
              </button>

              <div v-if="expanded.includes(wi)" :id="`week-${week.key}`" class="wk__body">
                <p class="wk__why">{{ wi === 8 ? 'Wracasz do dwóch pomiarów i do listu, który napisałeś do siebie.' : week.why }}</p>

                <ul class="steps">
                  <li v-for="(step, si) in week.steps" :key="step.slug + si" class="st" :class="`st--${stepState(wi, si)}`">
                    <span class="mark mark--lg" :class="`mark--${stepState(wi, si)}`"><AppIcon v-if="stepState(wi, si) === 'done'" name="check" /></span>
                    <span class="st__copy">
                      <strong>{{ step.title }}</strong>
                      <small>
                        <template v-if="stepState(wi, si) === 'current'">{{ sample === 'paused' ? 'Czeka na Twój powrót' : `Dziś · ${step.minutes}` }}</template>
                        <template v-else>{{ step.minutes }}{{ step.optional ? ' · opcjonalnie' : '' }}</template>
                      </small>
                    </span>
                    <button v-if="stepState(wi, si) === 'current' && sample !== 'paused'" type="button" class="chip chip--primary" @click="simulate(step.title)">Rozpocznij</button>
                    <button v-else-if="stepState(wi, si) === 'done'" type="button" class="chip" @click="simulate(step.title)">Zobacz</button>
                    <button v-else-if="step.optional" type="button" class="chip chip--ghost" @click="simulate(step.title)">Pomiń</button>
                  </li>
                </ul>

                <div v-if="wi === currentWeek && wi < 8 && sample !== 'start'" class="wk__fields">
                  <section class="fld">
                    <header class="fld__head"><span>Praktyki</span><small>co 2 dni</small></header>
                    <div class="pr">
                      <AppIcon name="mg-exercise-self-compassion-break" />
                      <span><strong>Przerwa na współczucie</strong><small>dziś</small></span>
                      <button type="button" class="chip" :disabled="sample === 'paused'" @click="simulate('Przerwa na współczucie')">Otwórz</button>
                    </div>
                    <div class="pr">
                      <AppIcon name="mg-exercise-moments" />
                      <span><strong>Momenty</strong><small>jutro</small></span>
                    </div>
                    <div class="days" aria-label="Dni z praktyką w tym tygodniu">
                      <span v-for="(letter, di) in dayLetters" :key="di" class="days__day" :title="`${dayNames[di]}: ${practiceDays.includes(di) ? 'praktyka zapisana' : 'bez wpisu'}`">
                        <i class="well well--sm" :class="{ 'well--done': practiceDays.includes(di), 'well--today': di === 3 }" />
                        <small>{{ letter }}</small>
                      </span>
                      <small class="days__sum">{{ practiceDays.length }} dni</small>
                    </div>
                  </section>

                  <section class="fld">
                    <header class="fld__head"><span>W świecie</span><button type="button" class="fld__link" :aria-expanded="taskOpen" @click="taskOpen = !taskOpen">{{ taskOpen ? 'Zostaw' : 'Zmień' }}</button></header>
                    <div class="tk">
                      <span class="tk__copy"><strong>{{ chosenTask.title }}</strong><small>{{ chosenTask.done }} z {{ chosenTask.times }} w tym tygodniu</small></span>
                      <span class="tk__wells"><i v-for="n in chosenTask.times" :key="n" class="well well--sm" :class="{ 'well--done': n <= chosenTask.done }" /></span>
                    </div>
                    <div v-if="taskOpen" class="tk__options" role="radiogroup" aria-label="Zadanie tygodnia">
                      <label v-for="option in tasks.filter(t => t.key !== task)" :key="option.key" class="tk__option">
                        <input type="radio" name="task" :value="option.key" :checked="task === option.key" @change="pickTask(option.key)" />
                        <span><strong>{{ option.title }}</strong><small>{{ option.times }} razy w tygodniu</small></span>
                        <i class="well well--sm" />
                      </label>
                    </div>
                  </section>
                </div>

                <div v-if="allCards.some(c => c.phaseKeys.includes(week.key))" class="wk__knowledge">
                  <button v-for="card in allCards.filter(c => c.phaseKeys.includes(week.key))" :key="card.key" type="button" class="chip" @click="drawerKey = card.key">
                    <AppIcon :name="readCards.includes(card.key) ? 'check' : 'menu_book'" />{{ card.title }}
                  </button>
                </div>
                <p v-if="week.question" class="wk__question">
                  <small>Na koniec tygodnia</small>{{ typeof week.question === 'string' ? week.question : week.question.m }}
                </p>
              </div>
            </article>

            <div v-if="closed" class="pv__closed">
              <AppIcon name="mg-exercise-maintenance-plan" />
              <div>
                <strong>To, co pomaga, zostaje z Tobą</strong>
                <p>Twoje zdania, Momenty i plan podtrzymania są dalej pod ręką.</p>
              </div>
              <button type="button" class="chip" @click="simulate('Plan podtrzymania')">Plan podtrzymania</button>
            </div>
          </section>

          <!-- right: context -->
          <aside class="pv__side" aria-label="Kontekst ścieżki">
            <section v-if="!closed || sample === 'return'" class="card">
              <header class="card__head">
                <span>{{ sample === 'paused' ? 'Gdy wrócisz' : sample === 'return' ? 'Powrót' : 'Teraz' }}</span>
                <small>{{ sample === 'return' ? '27 grudnia' : 'Dziś' }}</small>
              </header>
              <div class="now">
                <span class="now__icon"><AppIcon :name="`mg-exercise-${nextStep.slug}`" /></span>
                <span class="now__copy">
                  <strong>{{ nextStep.title }}</strong>
                  <small>{{ nextStep.minutes }} · krok {{ stepOrdinal }} z {{ totalSteps }}</small>
                </span>
              </div>
              <button v-if="sample !== 'paused'" type="button" class="btn-primary btn-primary--wide" @click="simulate(nextStep.title)">Rozpocznij <AppIcon name="arrow_forward" /></button>
              <p v-else class="muted">Ścieżka czeka. Praktyki i Momenty pozostają dostępne.</p>
              <div v-if="sample !== 'start' && sample !== 'return'" class="pr pr--now">
                <AppIcon name="mg-exercise-self-compassion-break" />
                <span><strong>Przerwa na współczucie</strong><small>na dziś</small></span>
                <button type="button" class="chip" :disabled="sample === 'paused'" @click="simulate('Przerwa na współczucie')">Otwórz</button>
              </div>
              <div class="chips chips--spaced">
                <button type="button" class="chip" @click="simulate('Zapisz moment')"><AppIcon name="add" />Zapisz moment</button>
                <button v-if="sample !== 'start'" type="button" class="chip" :class="{ 'is-active': responseOpen }" :aria-expanded="responseOpen" @click="responseOpen = !responseOpen">
                  <AppIcon name="mg-exercise-shame-response" />Moja odpowiedź
                </button>
                <button v-if="sample === 'return'" type="button" class="chip" :class="{ 'is-active': futureLetterOpen }" @click="futureLetterOpen = !futureLetterOpen">
                  <AppIcon name="mg-exercise-letter-to-future-self" />List od Ciebie
                </button>
              </div>
              <div v-if="responseOpen" class="fld fld--quote">
                <p><em>„To moja część, nie cały ja.”</em></p>
                <p>Oddech. Stopy na ziemi. Zostań minutę dłużej.</p>
                <button type="button" class="chip" @click="simulate('Moment z mojej odpowiedzi')">Zapisz jako moment</button>
              </div>
              <div v-if="futureLetterOpen" class="fld fld--quote">
                <p><em>„Jeśli dziś jest trudniej, wróć do pierwszej minuty. Oddychaj. Powiedz komuś, że potrzebujesz chwili. Nie zaczynasz od zera.”</em></p>
                <small class="muted">Napisany 1 listopada 2026</small>
              </div>
            </section>

            <section class="card">
              <header class="card__head">
                <span>Umiejętności</span>
                <button type="button" class="card__link" :aria-expanded="skillDetails" @click="skillDetails = !skillDetails">{{ skillDetails ? 'Mniej' : 'Pomiary' }}</button>
              </header>
              <div v-for="row in skills" :key="row.key" class="sk">
                <span class="sk__label">{{ row.label }}</span>
                <span class="sk__track" :title="`${row.label} (${row.instrument}): ${row.points.map((p, i) => `${skillColumns[i]} ${p ?? '—'}`).join(' · ')}`">
                  <i v-if="trail(row)" class="sk__trail" :style="trail(row)!" />
                  <i v-if="row.points[0] !== null" class="sk__start" :style="{ left: `${skillPos(row, row.points[0]!)}%` }" />
                  <i v-if="lastPoint(row.points) !== null && lastPointIndex(row.points) > 0" class="sk__now" :style="{ left: `${skillPos(row, lastPoint(row.points)!)}%` }" />
                </span>
              </div>
              <p class="sk__legend"><i class="sk__start" />start <i class="sk__now" />ostatni pomiar <span>w prawo = w stronę celu</span></p>
              <div v-if="skillDetails" class="sk__table" role="table" aria-label="Pomiary w czasie ścieżki">
                <div class="sk__tr sk__tr--head" role="row"><span /><span v-for="col in skillColumns" :key="col" role="columnheader">{{ col }}</span></div>
                <div v-for="row in skills" :key="row.key" class="sk__tr" role="row">
                  <span role="rowheader">{{ row.label }} <small>{{ row.instrument }}</small></span>
                  <span v-for="(p, i) in row.points" :key="i" role="cell" class="sk__td" :class="{ 'is-pending': p === null }">{{ p === null ? '–' : p.toFixed(1) }}</span>
                </div>
                <small class="muted">SCS-SF 1–5 · FSCRS 0–4 · to obraz zmiany, nie ocena kliniczna.</small>
              </div>
            </section>

            <section class="card">
              <header class="card__head">
                <span>Momenty</span>
                <button type="button" class="card__link" @click="simulate('Zapisz moment')">Zapisz</button>
              </header>
              <p v-if="sample === 'start'" class="muted muted--gap">Tu pojawią się Twoje zapisy. Nie musisz wiedzieć od razu, co powiedzieć.</p>
              <ShameMomentsGlance :stats="stats" :slots="8" />
            </section>

            <section class="card">
              <header class="card__head">
                <span>Moje zdania</span>
                <button v-if="ownSentences.length > 3" type="button" class="card__link" @click="showAllSentences = !showAllSentences">{{ showAllSentences ? 'Mniej' : `Wszystkie (${ownSentences.length})` }}</button>
              </header>
              <p v-if="!ownSentences.length" class="muted">Zdania z obrazu, odpowiedzi na wstyd i Momentów będą wracały tutaj.</p>
              <ul class="quotes">
                <li v-for="sentence in ownSentences.slice(0, showAllSentences ? undefined : 3)" :key="sentence.text">
                  <em>„{{ sentence.text }}”</em>
                  <small>{{ sentenceSources[sentence.source] }} · {{ formatDate(sentence.createdAt) }}</small>
                </li>
              </ul>
            </section>

            <section class="card">
              <header class="card__head">
                <span>Zrozumieć</span>
                <button type="button" class="card__link" :aria-expanded="showAllCards" @click="showAllCards = !showAllCards">{{ showAllCards ? 'Bieżące' : 'Wszystkie' }}</button>
              </header>
              <ul class="kn">
                <li v-for="card in cards" :key="card.key">
                  <button type="button" @click="drawerKey = card.key">
                    <AppIcon :name="readCards.includes(card.key) ? 'check' : card.pinned ? 'bookmark' : 'menu_book'" />
                    <span><strong>{{ card.title }}</strong><small>{{ readCards.includes(card.key) ? 'Przeczytane' : card.lead }}</small></span>
                    <AppIcon name="chevron_right" />
                  </button>
                </li>
              </ul>
            </section>

            <details v-if="sample !== 'start'" class="card card--details">
              <summary class="card__head"><span>W świecie · wcześniej</span><AppIcon name="expand_more" /></summary>
              <ul class="past">
                <li><span>Nazwij wstyd, gdy przychodzi</span><small>3 z 3</small></li>
                <li><span>Przyjmij życzliwość</span><small>1 z 2</small></li>
                <li><span>Użyj swojej odpowiedzi na wstyd</span><small>2 z 3</small></li>
              </ul>
            </details>
          </aside>
        </div>
      </div>
    </div>

    <!-- ───────────── 02 · refleksja tygodnia ───────────── -->
    <div v-else-if="surface === 'reflection'" class="spv__stage spv__stage--narrow">
      <section class="card rf" aria-label="Ścieżka w refleksji tygodnia">
        <header class="card__head">
          <span>Ścieżka · Ze wstydu do współczucia</span>
          <button type="button" class="card__link" @click="setQuery('surface', 'dashboard')">Widok ścieżki</button>
        </header>
        <p class="rf__meta">{{ sample === 'start' ? 'Rozpoznać' : 'Spojrzeć inaczej' }} · tydzień {{ weeksLived(sample) }} z 8 · 28 września–4 października</p>
        <div v-if="sample !== 'start'" class="tk tk--rf">
          <span class="tk__copy"><strong>{{ chosenTask.title }}</strong><small>zadanie tygodnia · {{ chosenTask.done }} z {{ chosenTask.times }}</small></span>
          <span class="tk__wells"><i v-for="n in chosenTask.times" :key="n" class="well well--sm" :class="{ 'well--done': n <= chosenTask.done }" /></span>
        </div>
        <ShameMomentsGlance :stats="reflectionStats" compact />
        <div class="rf__questions">
          <section class="fld">
            <header class="fld__head"><span>Były momenty, których nie zapisałeś?</span></header>
            <p class="muted">Mniej więcej ile? To tylko szacunek — dorysuje się kreskowane pole w macierzy.</p>
            <div class="chips">
              <button v-for="choice in [{ key: 'none', label: 'żaden' }, { key: 'few', label: '1–2' }, { key: 'several', label: '3–5' }, { key: 'many', label: 'więcej' }]" :key="choice.key" type="button" class="chip" :class="{ 'is-active': unlogged === choice.key }" :aria-pressed="unlogged === choice.key" @click="unlogged = unlogged === choice.key ? null : choice.key">{{ choice.label }}</button>
            </div>
          </section>
          <section class="fld">
            <header class="fld__head"><span>Jak mocno wstyd dawał o sobie znać?</span></header>
            <div class="scale" role="radiogroup" aria-label="Nasilenie wstydu w tym tygodniu">
              <button v-for="n in 5" :key="n" type="button" class="scale__btn" :class="{ 'is-active': severity === n }" :aria-pressed="severity === n" @click="severity = severity === n ? null : n">{{ n }}</button>
            </div>
            <p class="scale__labels"><span>ledwo</span><span>bardzo mocno</span></p>
          </section>
        </div>
        <label class="rf__question">
          <span>{{ pathCopy.phases.w4.question }}</span>
          <textarea v-model="reflection" rows="3" placeholder="Jeśli chcesz, zapisz jedną sytuację…" />
        </label>
        <footer class="rf__foot">
          <small class="muted">Szkic w Labie · tylko w tej sesji</small>
          <button type="button" class="btn-primary" @click="notice = 'Odpowiedzi zachowane w pamięci Labu. Przykład nie zapisuje refleksji w aplikacji.'">Dalej <AppIcon name="arrow_forward" /></button>
        </footer>
      </section>
    </div>

    <!-- ───────────── 03 · pole w Dzisiaj ───────────── -->
    <div v-else class="spv__stage spv__stage--today">
      <section class="td" aria-label="Ścieżki">
        <header class="td__head">Ścieżki</header>
        <button type="button" class="td__row td__row--path" @click="setQuery('surface', 'dashboard')">
          <span class="td__lead"><AppIcon name="mg-exercise-compassionate-image" /></span>
          <span class="td__copy">
            <strong>Ze wstydu do współczucia</strong>
            <small>{{ closed ? 'Zakończona · Powrót 27 grudnia' : `${weeks[Math.max(0, currentWeek)]!.title} · tydzień ${currentWeek + 1} z 8` }}{{ sample === 'paused' ? ' · wstrzymana' : '' }}</small>
          </span>
          <AppIcon name="chevron_right" />
        </button>
        <div v-if="!closed || sample === 'return'" class="td__row">
          <span class="td__lead td__lead--sub"><AppIcon :name="`mg-exercise-${nextStep.slug}`" /></span>
          <span class="td__copy">
            <strong>{{ nextStep.title }}</strong>
            <small>{{ sample === 'paused' ? 'po wznowieniu' : sample === 'return' ? '27 grudnia' : `jutro · ${nextStep.minutes}` }}</small>
          </span>
          <button v-if="sample !== 'paused'" type="button" class="chip" @click="simulate(nextStep.title)">Otwórz</button>
        </div>
        <div v-if="!closed && sample !== 'paused' && sample !== 'start'" class="td__row">
          <span class="td__lead td__lead--sub"><AppIcon name="mg-exercise-self-compassion-break" /></span>
          <span class="td__copy"><strong>Przerwa na współczucie</strong><small>praktyka · na dziś</small></span>
          <i class="well" aria-label="Nie wykonano" />
        </div>
        <div class="td__actions">
          <button type="button" class="chip" @click="simulate('Zapisz moment')"><AppIcon name="add" />Zapisz moment</button>
          <button v-if="sample !== 'start'" type="button" class="chip" @click="openResponse"><AppIcon name="mg-exercise-shame-response" />Moja odpowiedź</button>
        </div>
      </section>
      <p class="spv__note">Dzień bez kroku: ścieżka pozostaje widoczna, najbliższy krok ma datę, praktyka na dziś ma dysk jak każda pozycja planu dnia. Pełna analiza — w widoku ścieżki (runda 2, D1–D3).</p>
    </div>

    <!-- ───────────── 04 · decyzje ───────────── -->
    <section class="spv__block">
      <header class="spv__block-head">
        <span class="lab-eyebrow">04 · Co zmieniło się względem szkicu z rundy 2</span>
        <h2>Decyzje projektowe do oceny</h2>
      </header>
      <ul class="spv__decisions">
        <li v-for="d in decisions" :key="d.id">
          <span class="spv__decision-id">{{ d.id }}</span>
          <div><strong>{{ d.title }}</strong><p>{{ d.body }}</p></div>
        </li>
      </ul>
    </section>

    <p v-if="notice" class="spv__notice" role="status">
      {{ notice }}<button type="button" class="chip chip--ghost" aria-label="Zamknij komunikat" @click="notice = ''"><AppIcon name="close" /></button>
    </p>

    <dialog ref="drawerElement" class="drawer mg-design-v2" aria-labelledby="knowledge-title" @cancel="drawerKey = null" @click="$event.target === drawerElement && (drawerKey = null)">
      <template v-if="drawer">
        <header class="drawer__head">
          <span class="card__head"><span>Zrozumieć · 2–3 min</span></span>
          <button type="button" class="chip chip--ghost" aria-label="Zamknij kartę wiedzy" @click="drawerKey = null"><AppIcon name="close" /></button>
        </header>
        <h2 id="knowledge-title">{{ drawer.title }}</h2>
        <p class="drawer__lead">{{ drawer.lead }}</p>
        <p v-for="paragraph in drawer.body" :key="paragraph">{{ paragraph }}</p>
        <details class="drawer__sources">
          <summary>Źródła</summary>
          <p v-for="source in drawer.sources" :key="source">{{ source }}</p>
        </details>
        <button type="button" class="btn-primary" @click="markRead">{{ readCards.includes(drawer.key) ? 'Zamknij' : 'Oznacz jako przeczytane' }}</button>
      </template>
    </dialog>
  </section>
</template>

<style scoped>
/* ── Lab chrome ─────────────────────────────────────────────────────── */
.spv {
  min-width: 0;
  padding-bottom: 40px;
  color: var(--mg-color-ink);
}
.spv code {
  font-size: 0.9em;
}
.spv__toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 14px;
  margin-bottom: 18px;
  padding: 12px 14px;
  border: 1px solid var(--mg-color-border);
  border-radius: var(--mg-radius-lg);
  background: var(--mg-color-mist);
}
.spv__tabs {
  display: inline-flex;
  gap: 4px;
  padding: 4px;
  border-radius: 18px 15px 19px 16px;
  background: var(--mg-color-surface);
  box-shadow: var(--mg-shadow-inset-sm);
}
.spv__tabs button {
  min-height: 34px;
  padding: 0 14px;
  border: 1px solid transparent;
  border-radius: 12px 15px 11px 16px;
  background: transparent;
  color: var(--mg-color-muted);
  font: inherit;
  font-size: 12px;
  font-weight: 800;
  cursor: pointer;
}
.spv__tabs button[aria-selected='true'] {
  border-color: var(--mg-color-border);
  background: var(--mg-color-paper);
  color: var(--mg-color-primary-strong);
}
.spv__select {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: var(--mg-color-muted);
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}
.spv__select select {
  min-height: 34px;
  padding: 6px 28px 6px 10px;
  border: 1px solid var(--mg-color-field-border);
  border-radius: var(--mg-radius-sm);
  background: var(--mg-color-paper);
  color: var(--mg-color-ink);
  font: inherit;
  font-size: 12px;
  letter-spacing: 0;
  text-transform: none;
}
.spv__reset {
  min-height: 34px;
  margin-left: auto;
  padding: 0 12px;
  border: 1px solid var(--mg-color-border);
  border-radius: var(--mg-radius-pill);
  background: var(--mg-color-paper);
  color: var(--mg-color-primary-strong);
  font: inherit;
  font-size: 11px;
  font-weight: 800;
  cursor: pointer;
}
.spv__stage {
  padding: 24px 22px 30px;
  border: 1px solid var(--mg-color-border);
  border-radius: var(--mg-radius-xl);
  background: var(--mg-color-canvas);
}
.spv__stage--narrow {
  display: grid;
  justify-content: center;
}
.spv__stage--narrow > .card {
  width: min(1080px, 100%);
}
.spv__stage--today {
  display: grid;
  justify-items: center;
  gap: 16px;
  padding-block: 40px;
}
.spv__note {
  max-width: 440px;
  margin: 0;
  color: var(--mg-color-muted);
  font-size: 12px;
  line-height: 1.55;
}
.spv__block {
  margin-top: 30px;
}
.spv__block-head {
  margin-bottom: 14px;
}
.spv__block-head h2 {
  margin: 6px 0 0;
  font-size: 20px;
  line-height: 1.2;
}
.spv__decisions {
  display: grid;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.spv__decisions li {
  display: grid;
  grid-template-columns: 40px 1fr;
  gap: 12px;
  padding: 12px 14px;
  border: 1px solid var(--mg-color-border);
  border-radius: var(--mg-radius-md);
  background: var(--mg-color-mist);
}
.spv__decision-id {
  color: var(--mg-color-primary-strong);
  font-size: 12px;
  font-weight: 900;
}
.spv__decisions strong {
  display: block;
  font-size: 13px;
}
.spv__decisions p {
  margin: 4px 0 0;
  color: var(--mg-color-muted);
  font-size: 12px;
  line-height: 1.5;
}
.spv__notice {
  position: fixed;
  bottom: 20px;
  left: 50%;
  z-index: 8;
  display: flex;
  align-items: center;
  gap: 14px;
  max-width: 600px;
  margin: 0;
  padding: 12px 12px 12px 18px;
  border: 1px solid var(--mg-color-border);
  border-radius: var(--mg-radius-md);
  background: var(--mg-color-paper);
  box-shadow: var(--mg-shadow-raised);
  font-size: 12px;
  transform: translateX(-50%);
}

/* ── Product vocabulary (replica) ───────────────────────────────────── */
.pv {
  max-width: 1180px;
  margin: 0 auto;
  font-family: var(--mg-font-sans);
}
.pv__head {
  display: grid;
  grid-template-columns: auto auto minmax(0, 1fr) auto;
  gap: var(--mg-space-3);
  align-items: start;
}
.pv__back {
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  margin-top: 10px;
  border: 0;
  border-radius: var(--mg-radius-organic-a);
  background: var(--mg-color-mist);
  color: var(--mg-color-primary-strong);
  cursor: pointer;
}
.pv__icon {
  display: grid;
  place-items: center;
  width: 52px;
  height: 52px;
  margin-top: 2px;
  border-radius: var(--mg-radius-icon-field-a);
  background: var(--mg-color-sky-well);
  color: var(--mg-color-primary-strong);
}
.pv__icon :deep(.app-icon) {
  font-size: 28px;
}
.pv__titles {
  display: grid;
  gap: 4px;
  min-width: 0;
}
.pv__eyebrow {
  color: var(--mg-color-primary-strong);
  font-size: var(--mg-font-size-xs);
  font-weight: 900;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}
.pv__eyebrow b {
  margin-left: 10px;
  color: var(--mg-color-muted);
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: none;
}
.pv__titles h1 {
  margin: 0;
  font-size: 26px;
  font-weight: 800;
  letter-spacing: -0.015em;
  line-height: 1.15;
}
.pv__goal {
  max-width: 62ch;
  margin: 2px 0 0;
  color: var(--mg-color-muted);
  font-size: var(--mg-font-size-sm);
  line-height: 1.55;
}
.pv__head-actions {
  display: flex;
  gap: 6px;
  margin-top: 10px;
}
.pv__sign {
  display: flex;
  align-items: center;
  gap: var(--mg-space-3);
  width: fit-content;
  max-width: 100%;
  margin: var(--mg-space-4) 0 var(--mg-space-5) calc(34px + var(--mg-space-3));
  padding: 10px 16px 10px 12px;
  border: 1px solid var(--mg-color-border);
  border-radius: var(--mg-radius-md);
  background: var(--mg-color-paper);
}
.pv__sign > :deep(.app-icon) {
  font-size: 22px;
  color: var(--mg-color-primary-strong);
}
.pv__sign span {
  display: grid;
  gap: 1px;
}
.pv__sign small {
  color: var(--mg-color-muted);
  font-size: 0.66rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.pv__sign em {
  font-size: var(--mg-font-size-md);
  font-style: normal;
  font-weight: 700;
  line-height: 1.4;
}
.pv__sign.is-empty em {
  color: var(--mg-color-muted);
  font-size: var(--mg-font-size-sm);
  font-weight: 600;
}
.pv__grid {
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(330px, 1fr);
  gap: var(--mg-space-5);
  align-items: start;
}
.pv__side {
  display: grid;
  gap: var(--mg-space-4);
  min-width: 0;
}

/* card = the only level with a shadow; field = mist; inner = paper */
.card {
  min-width: 0;
  padding: var(--mg-space-4);
  border: 1px solid var(--mg-color-border);
  border-radius: var(--mg-radius-lg);
  background: var(--mg-color-surface);
  box-shadow: var(--mg-shadow-raised-sm);
}
.card__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--mg-space-2);
  margin-bottom: var(--mg-space-3);
  color: var(--mg-color-primary-strong);
  font-size: var(--mg-font-size-xs);
  font-weight: 900;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}
.card__head small {
  color: var(--mg-color-muted);
  font-size: var(--mg-font-size-xs);
  font-weight: 700;
  letter-spacing: 0.02em;
  text-transform: none;
}
.card__link {
  padding: 2px 0;
  border: 0;
  background: none;
  color: var(--mg-color-primary-strong);
  font: inherit;
  font-size: var(--mg-font-size-xs);
  font-weight: 800;
  letter-spacing: 0.02em;
  text-transform: none;
  cursor: pointer;
}
.card__link:hover {
  text-decoration: underline;
}
.card--details > summary {
  margin-bottom: 0;
  cursor: pointer;
  list-style: none;
}
.card--details > summary::-webkit-details-marker {
  display: none;
}
.card--details[open] > summary {
  margin-bottom: var(--mg-space-2);
}
.card--details > summary :deep(.app-icon) {
  font-size: 18px;
}
.muted {
  margin: 0;
  color: var(--mg-color-muted);
  font-size: var(--mg-font-size-xs);
  line-height: 1.5;
}
.muted--gap {
  margin-bottom: var(--mg-space-3);
}

/* chips = the actions of the expanded Dzisiaj row */
.chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  min-height: 1.7rem;
  padding: 3px var(--mg-space-2);
  border: 1px solid var(--mg-color-border);
  border-radius: var(--mg-radius-organic-b);
  background: var(--mg-color-paper);
  color: var(--mg-color-muted);
  font: inherit;
  font-size: var(--mg-font-size-xs);
  font-weight: 800;
  white-space: nowrap;
  cursor: pointer;
}
.chip :deep(.app-icon) {
  font-size: var(--mg-font-size-sm);
}
.chip:hover,
.chip.is-active {
  background: var(--mg-color-sky-well);
  color: var(--mg-color-primary-strong);
}
.chip:disabled {
  opacity: 0.5;
  cursor: default;
}
.chip--primary {
  border-color: transparent;
  background: var(--mg-color-primary-fill);
  color: var(--mg-color-on-primary);
}
.chip--primary:hover {
  background: var(--mg-color-primary-fill-hover);
  color: var(--mg-color-on-primary);
}
.chip--ghost {
  border-color: transparent;
  background: transparent;
}
.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.chips--spaced {
  margin-top: var(--mg-space-3);
}
.btn-primary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--mg-space-2);
  min-height: 2.25rem;
  padding: 0 var(--mg-space-4);
  border: 1px solid transparent;
  border-radius: var(--mg-radius-md);
  background: var(--mg-color-primary-fill);
  color: var(--mg-color-on-primary);
  font: inherit;
  font-size: var(--mg-font-size-sm);
  font-weight: 800;
  cursor: pointer;
}
.btn-primary:hover {
  background: var(--mg-color-primary-fill-hover);
}
.btn-primary :deep(.app-icon) {
  font-size: 16px;
}
.btn-primary--wide {
  width: 100%;
}

/* wells = the Dzisiaj entry disc; marks = its small sibling for steps */
.well {
  position: relative;
  display: grid;
  place-items: center;
  flex: 0 0 auto;
  width: var(--well, 1.85rem);
  height: var(--well, 1.85rem);
  border: 1px solid var(--mg-color-border);
  border-radius: var(--mg-radius-organic-a);
  background: var(--mg-color-canvas);
  box-shadow: var(--mg-shadow-inset-sm);
  color: var(--mg-color-muted);
  font-size: var(--mg-font-size-xs);
  font-weight: 800;
  font-style: normal;
}
.well--sm {
  --well: 1.3rem;
}
.well--done {
  border-color: transparent;
  background: var(--mg-color-sky-field);
}
.well--done::after {
  width: 62%;
  aspect-ratio: 1;
  border-radius: var(--mg-radius-organic-c);
  background: var(--mg-color-state);
  content: '';
  transform: rotate(-2deg);
}
.well--current {
  border-color: var(--mg-color-primary-strong);
  color: var(--mg-color-primary-strong);
  box-shadow: var(--mg-shadow-inset-sm), 0 0 0 3px var(--mg-color-primary-soft);
}
.well--today {
  border-color: var(--mg-color-primary-strong);
}
.well :deep(.app-icon) {
  font-size: var(--mg-font-size-sm);
}
.mark {
  display: inline-grid;
  place-items: center;
  width: 0.6rem;
  height: 0.6rem;
  border: 1px solid var(--mg-color-border);
  border-radius: var(--mg-radius-organic-b);
  background: var(--mg-color-canvas);
}
.mark:nth-child(even) {
  border-radius: var(--mg-radius-organic-c);
}
.mark--done {
  border-color: transparent;
  background: var(--mg-color-state);
}
.mark--current {
  border-color: var(--mg-color-primary-strong);
  box-shadow: 0 0 0 2px var(--mg-color-primary-soft);
}
.mark--lg {
  width: 1.3rem;
  height: 1.3rem;
  color: var(--mg-color-on-primary);
  box-shadow: var(--mg-shadow-inset-sm);
}
.mark--lg.mark--done {
  background: var(--mg-color-sky-field);
  color: var(--mg-color-primary-strong);
  box-shadow: none;
}
.mark--lg :deep(.app-icon) {
  font-size: 0.8rem;
}

/* week rows */
.pv__journey {
  display: grid;
  gap: 2px;
}
.pv__journey > .card__head {
  margin-bottom: var(--mg-space-2);
}
.wk {
  border-radius: var(--mg-radius-sm);
  transition: background var(--mg-duration-fast) var(--mg-ease-standard);
}
.wk:hover {
  background: var(--mg-color-mist);
}
.wk--open,
.wk--open:hover {
  background: var(--mg-color-paper);
}
.wk--return {
  margin-top: var(--mg-space-2);
  padding-top: var(--mg-space-2);
  border-top: 1.5px dashed color-mix(in srgb, var(--mg-color-muted) 38%, transparent);
  border-radius: 0 0 var(--mg-radius-sm) var(--mg-radius-sm);
}
.wk__row {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto 18px;
  gap: var(--mg-space-2);
  align-items: center;
  width: 100%;
  min-height: 2.9rem;
  padding: var(--mg-space-1) var(--mg-space-2);
  border: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
}
.wk__title {
  display: grid;
  gap: 1px;
  min-width: 0;
}
.wk__title strong {
  font-size: var(--mg-font-size-md);
  font-weight: 700;
  line-height: 1.3;
}
.wk--later .wk__title strong {
  color: color-mix(in srgb, var(--mg-color-ink) 70%, var(--mg-color-muted));
  font-weight: 600;
}
.wk--current .wk__title strong {
  font-weight: 800;
}
.wk__title small {
  color: var(--mg-color-muted);
  font-size: var(--mg-font-size-xs);
  font-weight: 700;
}
.wk__marks {
  display: inline-flex;
  gap: 4px;
}
.wk__chevron {
  color: var(--mg-color-primary-strong);
  font-size: 18px;
}
.wk__body {
  display: grid;
  gap: var(--mg-space-3);
  padding: 0 var(--mg-space-2) var(--mg-space-3) calc(1.85rem + var(--mg-space-2) * 2);
}
.wk__why {
  margin: 0;
  color: var(--mg-color-muted);
  font-size: var(--mg-font-size-sm);
  line-height: 1.5;
}
.steps {
  display: grid;
  gap: 2px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.st {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: var(--mg-space-2);
  align-items: center;
  min-height: 2.4rem;
  padding: 2px 0;
}
.st__copy {
  display: grid;
  gap: 1px;
  min-width: 0;
}
.st__copy strong {
  font-size: var(--mg-font-size-sm);
  font-weight: 700;
}
.st--current .st__copy strong {
  color: var(--mg-color-primary-strong);
  font-weight: 800;
}
.st--later .st__copy strong {
  color: color-mix(in srgb, var(--mg-color-ink) 75%, var(--mg-color-muted));
  font-weight: 600;
}
.st__copy small {
  color: var(--mg-color-muted);
  font-size: var(--mg-font-size-xs);
  font-weight: 600;
}
.wk__fields {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(17rem, 1fr));
  gap: var(--mg-space-3);
}
.fld {
  display: grid;
  gap: var(--mg-space-2);
  padding: var(--mg-space-3);
  border: 1px solid var(--mg-color-border);
  border-radius: var(--mg-radius-md);
  background: var(--mg-color-mist);
}
.fld--quote {
  margin-top: var(--mg-space-3);
}
.fld--quote p {
  margin: 0;
  font-size: var(--mg-font-size-sm);
  line-height: 1.5;
}
.fld--quote em {
  font-style: normal;
  font-weight: 700;
}
.fld--quote .chip {
  justify-self: start;
}
.fld__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--mg-space-2);
  color: var(--mg-color-primary-strong);
  font-size: 0.66rem;
  font-weight: 900;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}
.fld__head small {
  color: var(--mg-color-muted);
  font-size: var(--mg-font-size-xs);
  font-weight: 700;
  letter-spacing: 0;
  text-transform: none;
}
.fld__link {
  padding: 0;
  border: 0;
  background: none;
  color: var(--mg-color-primary-strong);
  font: inherit;
  font-size: var(--mg-font-size-xs);
  font-weight: 800;
  letter-spacing: 0;
  text-transform: none;
  cursor: pointer;
}
.pr {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: var(--mg-space-2);
  align-items: center;
  min-height: 2rem;
}
.pr > :deep(.app-icon) {
  font-size: 18px;
  color: var(--mg-color-primary-strong);
}
.pr > span {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 2px 8px;
  min-width: 0;
}
.pr strong {
  font-size: var(--mg-font-size-sm);
  font-weight: 700;
}
.pr small {
  color: var(--mg-color-muted);
  font-size: var(--mg-font-size-xs);
  font-weight: 700;
}
.pr--now {
  margin-top: var(--mg-space-3);
  padding-top: var(--mg-space-3);
  border-top: 1.5px dashed color-mix(in srgb, var(--mg-color-muted) 38%, transparent);
}
.days {
  display: flex;
  align-items: end;
  gap: 6px;
  margin-top: 2px;
}
.days__day {
  display: grid;
  justify-items: center;
  gap: 3px;
}
.days__day small,
.days__sum {
  color: var(--mg-color-muted);
  font-size: 0.66rem;
  font-weight: 700;
  line-height: 1;
}
.days__sum {
  margin-left: auto;
  padding-bottom: 2px;
  color: var(--mg-color-primary-strong);
}
.tk {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: var(--mg-space-2);
  align-items: center;
}
.tk__copy {
  display: grid;
  gap: 1px;
}
.tk__copy strong {
  font-size: var(--mg-font-size-sm);
  font-weight: 700;
  line-height: 1.35;
}
.tk__copy small {
  color: var(--mg-color-muted);
  font-size: var(--mg-font-size-xs);
  font-weight: 700;
}
.tk__wells {
  display: inline-flex;
  gap: 4px;
}
.tk--rf {
  margin-bottom: var(--mg-space-4);
  padding: var(--mg-space-2) var(--mg-space-3);
  border: 1px solid var(--mg-color-border);
  border-radius: var(--mg-radius-md);
  background: var(--mg-color-mist);
}
.tk__options {
  display: grid;
  gap: 2px;
  padding-top: var(--mg-space-1);
  border-top: 1.5px dashed color-mix(in srgb, var(--mg-color-muted) 38%, transparent);
}
.tk__option {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: var(--mg-space-2);
  align-items: center;
  padding: var(--mg-space-1) var(--mg-space-2);
  border-radius: var(--mg-radius-sm);
  cursor: pointer;
}
.tk__option:hover {
  background: var(--mg-color-paper);
}
.tk__option input {
  position: absolute;
  inset: 0;
  margin: 0;
  opacity: 0;
  cursor: inherit;
}
.tk__option span {
  display: grid;
  gap: 1px;
}
.tk__option strong {
  font-size: var(--mg-font-size-sm);
  font-weight: 700;
}
.tk__option small {
  color: var(--mg-color-muted);
  font-size: var(--mg-font-size-xs);
  font-weight: 700;
}
.wk__knowledge {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.wk__question {
  display: grid;
  gap: 2px;
  margin: 0;
  color: var(--mg-color-muted);
  font-size: var(--mg-font-size-sm);
  font-style: italic;
  line-height: 1.5;
}
.wk__question small {
  font-size: 0.66rem;
  font-style: normal;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.pv__closed {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: var(--mg-space-3);
  align-items: center;
  margin-top: var(--mg-space-3);
  padding: var(--mg-space-3);
  border: 1px solid var(--mg-color-border);
  border-radius: var(--mg-radius-md);
  background: var(--mg-color-mist);
}
.pv__closed > :deep(.app-icon) {
  font-size: 26px;
  color: var(--mg-color-primary-strong);
}
.pv__closed strong {
  display: block;
  font-size: var(--mg-font-size-sm);
}
.pv__closed p {
  margin: 2px 0 0;
  color: var(--mg-color-muted);
  font-size: var(--mg-font-size-xs);
}

/* now */
.now {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: var(--mg-space-3);
  align-items: center;
  margin-bottom: var(--mg-space-3);
}
.now__icon {
  display: grid;
  place-items: center;
  width: 2.6rem;
  height: 2.6rem;
  border-radius: var(--mg-radius-icon-field-b);
  background: var(--mg-color-sky-well);
  color: var(--mg-color-primary-strong);
}
.now__icon :deep(.app-icon) {
  font-size: 24px;
}
.now__copy {
  display: grid;
  gap: 2px;
}
.now__copy strong {
  font-size: var(--mg-font-size-md);
  font-weight: 800;
  line-height: 1.3;
}
.now__copy small {
  color: var(--mg-color-muted);
  font-size: var(--mg-font-size-xs);
  font-weight: 700;
}

/* skills */
.sk {
  display: grid;
  grid-template-columns: 11rem minmax(0, 1fr);
  gap: var(--mg-space-3);
  align-items: center;
  min-height: 1.9rem;
}
.sk__label {
  font-size: var(--mg-font-size-xs);
  font-weight: 700;
  line-height: 1.25;
}
.sk__track {
  position: relative;
  display: block;
  height: 0.5rem;
  border-radius: var(--mg-radius-pill);
  background: var(--mg-color-canvas);
  box-shadow: var(--mg-shadow-inset-sm);
}
.sk__trail {
  position: absolute;
  top: 50%;
  height: 2px;
  background: var(--mg-color-state-soft);
  transform: translateY(-50%);
}
.sk__start,
.sk__now {
  position: absolute;
  top: 50%;
  width: 0.7rem;
  height: 0.7rem;
  border: 1.5px solid var(--mg-color-primary-strong);
  border-radius: var(--mg-radius-organic-a);
  background: var(--mg-color-paper);
  transform: translate(-50%, -50%);
}
.sk__now {
  z-index: 1;
  background: var(--mg-color-primary-strong);
}
.sk__legend {
  display: flex;
  align-items: center;
  gap: 5px;
  margin: var(--mg-space-2) 0 0;
  color: var(--mg-color-muted);
  font-size: 0.66rem;
  font-weight: 700;
}
.sk__legend i {
  position: static;
  width: 0.55rem;
  height: 0.55rem;
  transform: none;
}
.sk__legend i + i {
  margin-left: 6px;
}
.sk__legend span {
  margin-left: auto;
  font-weight: 600;
}
.sk__table {
  display: grid;
  gap: 4px;
  margin-top: var(--mg-space-3);
  padding-top: var(--mg-space-3);
  border-top: 1.5px dashed color-mix(in srgb, var(--mg-color-muted) 38%, transparent);
}
.sk__tr {
  display: grid;
  grid-template-columns: minmax(0, 1.6fr) repeat(4, minmax(0, 1fr));
  gap: 4px;
  align-items: center;
  font-size: var(--mg-font-size-xs);
}
.sk__tr--head span {
  color: var(--mg-color-muted);
  font-weight: 800;
  text-align: center;
}
.sk__tr [role='rowheader'] {
  font-weight: 700;
}
.sk__tr [role='rowheader'] small {
  color: var(--mg-color-muted);
  font-weight: 600;
}
.sk__td {
  padding: 4px 0;
  border-radius: var(--mg-radius-sm);
  background: var(--mg-color-paper);
  color: var(--mg-color-ink);
  font-weight: 800;
  text-align: center;
}
.sk__td.is-pending {
  border: 1px dashed var(--mg-color-border);
  background: transparent;
  color: var(--mg-color-muted);
}

/* quotes / knowledge / past */
.quotes {
  display: grid;
  gap: var(--mg-space-3);
  margin: 0;
  padding: 0;
  list-style: none;
}
.quotes li {
  display: grid;
  gap: 2px;
}
.quotes em {
  font-size: var(--mg-font-size-sm);
  font-style: normal;
  font-weight: 700;
  line-height: 1.45;
}
.quotes small {
  color: var(--mg-color-muted);
  font-size: var(--mg-font-size-xs);
  font-weight: 700;
}
.kn {
  display: grid;
  gap: 2px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.kn button {
  display: grid;
  grid-template-columns: 18px minmax(0, 1fr) 18px;
  gap: var(--mg-space-2);
  align-items: center;
  width: 100%;
  padding: var(--mg-space-1) var(--mg-space-2);
  border: 0;
  border-radius: var(--mg-radius-sm);
  background: transparent;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
}
.kn button:hover {
  background: var(--mg-color-mist);
}
.kn :deep(.app-icon) {
  font-size: 18px;
  color: var(--mg-color-primary-strong);
}
.kn span {
  display: grid;
  gap: 1px;
  min-width: 0;
}
.kn strong {
  font-size: var(--mg-font-size-sm);
  font-weight: 700;
}
.kn small {
  overflow: hidden;
  color: var(--mg-color-muted);
  font-size: var(--mg-font-size-xs);
  text-overflow: ellipsis;
  white-space: nowrap;
}
.past {
  display: grid;
  gap: 2px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.past li {
  display: flex;
  justify-content: space-between;
  gap: var(--mg-space-2);
  padding: var(--mg-space-1) var(--mg-space-2);
  font-size: var(--mg-font-size-sm);
}
.past small {
  color: var(--mg-color-primary-strong);
  font-size: var(--mg-font-size-xs);
  font-weight: 800;
}

/* reflection */
.rf__meta {
  margin: calc(var(--mg-space-3) * -1) 0 var(--mg-space-3);
  color: var(--mg-color-muted);
  font-size: var(--mg-font-size-sm);
}
.rf__questions {
  display: grid;
  grid-template-columns: 1.2fr 1fr;
  gap: var(--mg-space-3);
  margin-top: var(--mg-space-5);
}
.rf__questions .fld__head {
  color: var(--mg-color-ink);
  font-size: var(--mg-font-size-sm);
  font-weight: 800;
  letter-spacing: 0;
  text-transform: none;
}
.scale {
  display: flex;
  gap: 8px;
}
.scale__btn {
  display: grid;
  place-items: center;
  width: 2.25rem;
  height: 2.25rem;
  border: 1px solid var(--mg-color-border);
  border-radius: var(--mg-radius-organic-a);
  background: var(--mg-color-canvas);
  box-shadow: var(--mg-shadow-inset-sm);
  color: var(--mg-color-muted);
  font: inherit;
  font-size: var(--mg-font-size-sm);
  font-weight: 800;
  cursor: pointer;
}
.scale__btn:nth-child(even) {
  border-radius: var(--mg-radius-organic-b);
}
.scale__btn:hover {
  background: var(--mg-color-paper);
}
.scale__btn.is-active {
  border-color: transparent;
  background: var(--mg-color-sky-field);
  color: var(--mg-color-primary-strong);
  box-shadow: none;
}
.scale__labels {
  display: flex;
  justify-content: space-between;
  max-width: calc(5 * 2.25rem + 4 * 8px);
  margin: 0;
  color: var(--mg-color-muted);
  font-size: 0.66rem;
  font-weight: 700;
}
.rf__question {
  display: grid;
  gap: var(--mg-space-2);
  margin-top: var(--mg-space-4);
  font-size: var(--mg-font-size-sm);
  font-weight: 700;
}
.rf__question textarea {
  width: 100%;
  padding: var(--mg-space-3);
  border: 1px solid var(--mg-color-field-border);
  border-radius: var(--mg-radius-md);
  background: var(--mg-color-paper);
  color: var(--mg-color-ink);
  font: inherit;
  font-size: var(--mg-font-size-sm);
  font-weight: 500;
  resize: vertical;
}
.rf__question textarea:focus-visible {
  outline: 0;
  box-shadow: var(--mg-shadow-inset-sm), var(--mg-focus-ring);
}
.rf__foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: var(--mg-space-4);
}

/* today group = next-day-rail__group */
.td {
  display: grid;
  gap: 2px;
  width: min(440px, 100%);
  padding: var(--mg-space-2);
  border: 1px solid var(--mg-color-border);
  border-radius: var(--mg-radius-md);
  background: var(--mg-color-paper);
  font-family: var(--mg-font-sans);
}
.td__head {
  padding: var(--mg-space-1) var(--mg-space-2);
  color: var(--mg-color-primary-strong);
  font-size: var(--mg-font-size-xs);
  font-weight: 900;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}
.td__row {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: var(--mg-space-2);
  align-items: center;
  min-height: 2.6rem;
  padding: var(--mg-space-1) var(--mg-space-2);
  border: 0;
  border-radius: var(--mg-radius-sm);
  background: transparent;
  color: inherit;
  font: inherit;
  text-align: left;
}
.td__row--path {
  cursor: pointer;
}
.td__row--path:hover {
  background: var(--mg-color-mist);
}
.td__row--path > :deep(.app-icon) {
  color: var(--mg-color-primary-strong);
}
.td__lead {
  display: grid;
  place-items: center;
  width: 1.85rem;
  height: 1.85rem;
  border-radius: var(--mg-radius-icon-field-a);
  background: var(--mg-color-sky-field);
  color: var(--mg-color-primary-strong);
}
.td__lead--sub {
  background: var(--mg-color-sky-well);
}
.td__lead :deep(.app-icon) {
  font-size: var(--mg-font-size-md);
}
.td__copy {
  display: grid;
  gap: 1px;
  min-width: 0;
}
.td__copy strong {
  font-size: var(--mg-font-size-sm);
  font-weight: 700;
}
.td__row--path .td__copy strong {
  font-size: var(--mg-font-size-md);
}
.td__copy small {
  color: var(--mg-color-muted);
  font-size: var(--mg-font-size-xs);
  font-weight: 700;
}
.td__actions {
  display: flex;
  gap: 6px;
  padding: var(--mg-space-2) var(--mg-space-2) var(--mg-space-1);
}

/* knowledge drawer */
.drawer {
  position: fixed;
  inset: 0 0 0 auto;
  width: min(540px, 90vw);
  height: 100vh;
  max-height: 100vh;
  margin: 0;
  padding: 28px 32px 32px;
  border: 0;
  border-left: 1px solid var(--mg-color-border);
  border-radius: var(--mg-radius-lg) 0 0 var(--mg-radius-lg);
  background: var(--mg-color-paper);
  color: var(--mg-color-ink);
  font-family: var(--mg-font-sans);
}
.drawer::backdrop {
  background: var(--mg-color-scrim);
}
.drawer__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.drawer__head .card__head {
  margin: 0;
}
.drawer h2 {
  margin: 18px 0 10px;
  font-size: 24px;
  font-weight: 800;
  line-height: 1.25;
}
.drawer p {
  margin: 12px 0;
  font-size: var(--mg-font-size-md);
  line-height: 1.7;
}
.drawer__lead {
  color: var(--mg-color-primary-strong);
  font-weight: 700;
}
.drawer__sources {
  margin: 20px 0;
  color: var(--mg-color-muted);
  font-size: var(--mg-font-size-xs);
}
.drawer__sources summary {
  cursor: pointer;
  font-weight: 800;
}
.drawer__sources p {
  font-size: var(--mg-font-size-xs);
  line-height: 1.5;
}
.spv :focus-visible,
.drawer :focus-visible {
  outline: 2px solid var(--mg-color-focus);
  outline-offset: 2px;
}

@media (max-width: 1180px) {
  .pv__grid {
    grid-template-columns: 1fr;
  }
  .pv__side {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
@media (max-width: 900px) {
  .pv__side,
  .wk__fields,
  .rf__questions {
    grid-template-columns: 1fr;
  }
  .wk__marks {
    display: none;
  }
}
@media (prefers-reduced-motion: reduce) {
  .spv * {
    transition: none;
  }
}
</style>
