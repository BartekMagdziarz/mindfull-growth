<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppIcon from '@product/components/shared/AppIcon.vue'
import MomentsChart from '~lab/components/MomentsChart.vue'
import { cardsFor, skillColumns, skillsFor, statsFor, weeks } from '~lab/lab/shamePath'
import { doneDate } from '~lab/lab/pathViewV2'
import {
  dataSample,
  flatSteps,
  phaseTitle,
  phaseWhy,
  collectionAt,
  RETURN_WEEK,
  sceneSamples,
  tasksFor,
  usePathProgressV3,
  type FlatStep,
  type SceneSample,
} from '~lab/lab/pathViewV3'

/**
 * Path view v3 (2026-11-01, round 7). After the round-6 port the user still
 * sees too much text at once, phase rows with short names and a lot of
 * empty width, and practice tiles that look like step tiles.
 *
 * This concept: the phases as ONE horizontal strip across the whole view,
 * the open phase spilling into a field with its steps, a description only
 * on the current step, and the repeating practices as pills or discs — a
 * different shape from the one-off step tiles (shape = role).
 */
const route = useRoute()
const router = useRouter()
const sample = computed<SceneSample>(() => (sceneSamples.some(s => s.id === route.query.sample) ? (route.query.sample as SceneSample) : 'fresh'))
const practiceVariants = [
  { id: 'pills', label: 'Pigułki: dysk z ikoną · nazwa · akcja' },
  { id: 'discs', label: 'Dyski: ikona nad nazwą, jak narzędzia' },
]
const practiceVariant = computed(() => (practiceVariants.some(v => v.id === route.query.practices) ? String(route.query.practices) : 'pills'))
const themes = [
  { id: 'sky-mist', label: 'Sky Mist' },
  { id: 'current', label: 'Current (domyślny produktu)' },
  { id: 'sunrise-cloud', label: 'Sunrise Cloud' },
]
const theme = computed(() => (themes.some(t => t.id === route.query.theme) ? String(route.query.theme) : 'sky-mist'))
watch(theme, value => document.documentElement.setAttribute('data-theme', value), { immediate: true })
onUnmounted(() => document.documentElement.removeAttribute('data-theme'))
const standalone = computed(() => Boolean(route.meta.standalone))
const previewHref = computed(() => {
  const query = new URLSearchParams(Object.entries(route.query).filter((pair): pair is [string, string] => typeof pair[1] === 'string'))
  const search = query.toString()
  return `/preview/path-view-v3${search ? `?${search}` : ''}`
})

const paused = computed(() => sample.value === 'paused')
const isReturn = computed(() => sample.value === 'return')
const progress = usePathProgressV3(sample)
const { enrolled, closed } = progress

const openPhase = ref<number>(-1)
const restartOpen = ref(false)
const menuOpen = ref(false)
const notice = ref('')
const taskOpen = ref(false)
const measureOpen = ref(false)
const readCards = ref<string[]>([])

const stats = computed(() => statsFor(dataSample(sample.value)))
const hasMoments = computed(() => stats.value.some(week => week.total > 0))
const skills = computed(() => skillsFor(dataSample(sample.value)))
const activePhase = computed(() => Math.max(0, Math.min(progress.currentWeek.value, RETURN_WEEK)))
const phaseKey = computed(() => weeks[activePhase.value]!.key)
const cards = computed(() => cardsFor(phaseKey.value).filter(c => c.pinned || c.phaseKeys.includes(phaseKey.value)).slice(0, 2))
const eyebrowState = computed(() => {
  if (!enrolled.value) return '8 tygodni · 24 kroki'
  if (isReturn.value) return 'Powrót'
  if (closed.value) return 'Zakończona'
  return `Tydzień ${progress.currentWeek.value + 1} z 8${paused.value ? ' · wstrzymana' : ''}`
})

/* The growing collection: every practice handed over so far; the ones in their rhythm window first. */
const collection = computed(() => [...collectionAt(progress.done.value.size)].sort((a, b) => Number(b.active) - Number(a.active)))
/* Phases in rows of four; Powrót gets its own row only once the path is closed. */
const phaseRows = computed(() => (closed.value || isReturn.value ? [[0, 1, 2, 3], [4, 5, 6, 7], [RETURN_WEEK]] : [[0, 1, 2, 3], [4, 5, 6, 7]]))
const phaseTasks = computed(() => tasksFor(phaseKey.value))
const taskKey = ref<string>('')
const chosenTask = computed(() => phaseTasks.value.find(t => t.key === taskKey.value) ?? phaseTasks.value[0] ?? null)
const taskAdded = ref(sample.value === 'mid' || sample.value === 'quiet')

const format = (n: number) => n.toFixed(1).replace('.', ',')
const lastIndex = (points: (number | null)[]) => points.map((p, i) => (p === null ? -1 : i)).filter(i => i >= 0).at(-1)
const pos = (row: { min: number; max: number }, value: number) => `${((value - row.min) / (row.max - row.min)) * 100}%`

function setQuery(key: string, value: string) {
  void router.replace({ query: { ...route.query, [key]: value } })
}
function togglePhase(index: number) {
  openPhase.value = openPhase.value === index ? -1 : index
}
function disc(index: number) {
  const { done, total } = progress.weekCompletion(index)
  return { done, total, fill: `${Math.round((done / Math.max(1, total)) * 100)}%` }
}
function ordinal(step: FlatStep) {
  return step.index - progress.weekSteps(step.week)[0]!.index + 1
}
function mark(step: FlatStep) {
  const state = progress.stepState(step.index)
  if (state === 'done') return doneDate(step)
  if (state === 'current') return paused.value ? 'czeka' : `${step.minutes} min`
  return step.optional ? 'opcjonalny' : `${step.minutes} min`
}
function start(step: FlatStep) {
  notice.value = `Podgląd w Labie: „${step.title}”. W produkcie otwiera się ćwiczenie; tu krok zostaje oznaczony jako ukończony.`
  progress.complete(step.index)
  openPhase.value = progress.currentWeek.value
}
function skip(step: FlatStep) {
  progress.complete(step.index)
  notice.value = `Pominięto „${step.title}”.`
  openPhase.value = progress.currentWeek.value
}
function undo(step: FlatStep) {
  progress.undo(step.index)
  notice.value = `Cofnięto ukończenie „${step.title}”. Wpis ćwiczenia zostaje w historii.`
}
function restart() {
  progress.restart()
  restartOpen.value = false
  openPhase.value = 0
  notice.value = 'Ścieżka ruszyła od pierwszego kroku. Ukończone ćwiczenia zostają w historii.'
}
function simulate(title: string) {
  notice.value = `Podgląd w Labie: „${title}”.`
}
function read(key: string, title: string) {
  if (!readCards.value.includes(key)) readCards.value.push(key)
  simulate(title)
}
function reset() {
  progress.reset()
  openPhase.value = progress.currentWeek.value < 0 ? -1 : progress.currentWeek.value
  restartOpen.value = false
  menuOpen.value = false
  taskOpen.value = false
  measureOpen.value = false
  readCards.value = []
  taskKey.value = ''
  taskAdded.value = sample.value === 'mid' || sample.value === 'quiet'
  notice.value = ''
}
watch(sample, reset, { immediate: true })

const decisions = [
  { id: 'D1', title: 'Fazy jako siatka 4 × 2, kafle dominujące', body: 'Osiem faz w dwóch rzędach po cztery, każdy kafel większy niż w rundzie 7a: numer w studni na środku, tytuł pod nim na środku, większy font. Ukończona faza ma kropkę W MIEJSCU numeru (user 01.11), bieżąca pierścień i wypełnienie studni proporcjonalne do kroków, nierozpoczęta pustą studnię z numerem. Żadnego drugiego dysku po prawej.' },
  { id: 'D2', title: 'Jedna stała wysokość kafli, zmienia się tylko szerokość', body: 'Wszystkie kafle faz mają tę samą wysokość 15 rem (user 01.11: rozciągnięte do wysokości otwartej fazy wyglądały fatalnie, więc nic nie może zmieniać wysokości innych kafli i pól). Kliknięcie kafla otwiera go w miejscu: rośnie do czterech udziałów szerokości rzędu, trzy pozostałe kafle zwężają się do 0,55 udziału (numer + tytuł na środku, tytuł może łamać się do trzech linii). Jedna faza otwarta naraz; domyślnie bieżąca. Otwarty kafel: nagłówek w jednym rzędzie — numer (albo kropka) i tytuł po lewej, dalej krótki opis fazy — a pod nim kroki wypełniają pozostałą wysokość.' },
  { id: 'D3', title: 'Kroki w otwartej fazie: bieżący większy, pozostałe małe obok', body: 'Rząd kafli kroków w pozostałej wysokości: małe kafle mają stałą szerokość 8,5 rem (numer, tytuł, jeden znacznik: czas · data · „opcjonalny”), bieżący krok bierze całą resztę i ma „co” (do 3 linii), „po co” (do 2 linii), Rozpocznij / Pomiń przy dolnej krawędzi; dłuższe zdania są przycinane, bo wysokość jest stała — do sprawdzenia na wszystkich 27 krokach przed portem. Krok wcześniejszy niż bieżący ma kropkę zamiast numeru. Otwarta inna faza niż bieżąca pokazuje jej kroki, ale żadnego nie da się uruchomić (brak przycisku) — kolejność jest sztywna (user, pkt 1).' },
  { id: 'D4', title: 'Nagłówek strony: tylko ikona i nazwa ścieżki', body: 'Bez eyebrow „Ścieżki”, numeru tygodnia i opisu celu (user 01.11). Strzałka wstecz i menu ⋯ zostają. Numer tygodnia czyta się z siatki faz.' },
  { id: 'D5', title: 'Praktyki = rosnąca kolekcja narzędzi', body: 'Zamiast praktyk „tej fazy” (katalog: okna od kroku N do M) pole pokazuje WSZYSTKO, co ścieżka dotąd oddała: praktyki w swoim oknie rytmu najpierw, z rytmem jednym słowem; praktyki po oknie zostają jako „na żądanie”, cichsze. Nic przed przekazaniem — kolekcja tylko rośnie (jedna pigułka na starcie, pięć na końcu). Kształt bez zmian: dysk z ikoną (powtarza się) vs kafel z numerem (raz). Zadanie tygodnia jak dotąd, pigułka z flagą. Wariant „dyski” zostaje do porównania.' },
  { id: 'D6', title: 'Powrót poza siatką', body: 'Powrót nie jest dziewiątą fazą w siatce; pojawia się jako własny, pełnoszeroki rząd pod siatką dopiero po zamknięciu ścieżki (scenariusze „Po zakończeniu” i „Powrót”). Do rozważenia: zamiast rzędu — kafel w karcie po zamknięciu.' },
  { id: 'D7', title: 'Dolny rząd bez zmian', body: 'Praktyki + Warto wiedzieć po lewej, Postęp po prawej (1.2fr / 1fr). Postęp jak w rundzie 6.' },
  { id: 'D8', title: 'Pytania', body: 'Czy 15 rem to dobra wysokość domyślna? Czy 0,55 udziału dla zamkniętych faz w rzędzie otwartej to dość miejsca? Czy „na żądanie” w kolekcji ma mieć inny ton, czy tylko inne słowo? Czy Powrót ma rząd pod siatką, czy miejsce w karcie zamknięcia?' },
]
</script>

<template>
  <section class="scenario-page pv3 mg-design-v2" :class="{ 'pv3--standalone': standalone }">
    <header v-if="!standalone" class="concept-heading">
      <div>
        <span class="lab-eyebrow">Ścieżki · widok ścieżki „Ze wstydu do współczucia” · runda 7b · 01.11.2026</span>
        <h1>Siatka faz 4 × 2, otwarta faza rozszerza się, kolekcja praktyk rośnie</h1>
        <p>
          Po rundzie 7a: fazy mają dominować (większe kafle, numer i tytuł na środku, kropka zamiast numeru po ukończeniu), leżeć po
          cztery w rzędzie, a otwarta faza ma się rozszerzać kosztem sąsiadów i mieścić kafle kroków, z większym bieżącym krokiem.
          Nagłówek strony zostaje z samą ikoną i nazwą, a pole Praktyki staje się kolekcją narzędzi, która rośnie z postępem.
        </p>
      </div>
      <span class="status-badge status-badge--experiment">Propozycja do oceny · runda 7b</span>
    </header>

    <div v-if="!standalone" class="pv3__toolbar">
      <label class="pv3__select"
        >Scenariusz
        <select :value="sample" @change="setQuery('sample', ($event.target as HTMLSelectElement).value)">
          <option v-for="s in sceneSamples" :key="s.id" :value="s.id">{{ s.label }}</option>
        </select></label
      >
      <label class="pv3__select"
        >Praktyki
        <select :value="practiceVariant" @change="setQuery('practices', ($event.target as HTMLSelectElement).value)">
          <option v-for="v in practiceVariants" :key="v.id" :value="v.id">{{ v.label }}</option>
        </select></label
      >
      <label class="pv3__select"
        >Motyw
        <select :value="theme" @change="setQuery('theme', ($event.target as HTMLSelectElement).value)">
          <option v-for="t in themes" :key="t.id" :value="t.id">{{ t.label }}</option>
        </select></label
      >
      <a class="pv3__reset" :href="previewHref" target="_blank" rel="noopener">Podgląd 1:1 bez pasków Laba ↗</a>
      <button type="button" class="pv3__reset pv3__reset--tight" @click="reset">Przywróć przykład</button>
    </div>

    <div class="pv3__stage">
      <div class="pv">
        <header class="pv__head">
          <button type="button" class="pv__back" aria-label="Wróć do ćwiczeń"><AppIcon name="arrow_back" /></button>
          <span class="pv__icon"><AppIcon name="mg-exercise-compassionate-image" /></span>
          <h1 class="pv__title">Ze wstydu do współczucia</h1>
          <div class="pv__menu">
            <button v-if="!enrolled" type="button" class="btn-primary" @click="setQuery('sample', 'fresh')">Rozpocznij ścieżkę</button>
            <template v-else>
              <button type="button" class="chip chip--ghost" aria-label="Więcej" :aria-expanded="menuOpen" @click="menuOpen = !menuOpen"><AppIcon name="more_horiz" /></button>
              <div v-if="menuOpen" class="pv__menu-list">
                <button v-if="!closed && !isReturn" type="button" @click="setQuery('sample', paused ? 'mid' : 'paused')">{{ paused ? 'Wznów' : 'Wstrzymaj' }}</button>
                <button type="button" @click="setQuery('sample', 'start')">Porzuć</button>
              </div>
            </template>
          </div>
        </header>

        <!-- Twoja droga: phases in rows of four; the open one widens in its row -->
        <section class="card journey" aria-label="Twoja droga">
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

          <div class="grid">
            <div v-for="(row, ri) in phaseRows" :key="ri" class="grid__row" :class="{ 'grid__row--open': row.includes(openPhase) }">
              <article
                v-for="wi in row"
                :key="weeks[wi]!.key"
                class="ph"
                :class="[`ph--${progress.weekState(wi)}`, { 'ph--open': openPhase === wi, 'ph--return': wi === RETURN_WEEK }]"
              >
                <button type="button" class="ph__head" :aria-expanded="openPhase === wi" :aria-controls="`phase-${weeks[wi]!.key}`" @click="togglePhase(wi)">
                  <span
                    class="well ph__num"
                    :class="{ 'well--done': progress.weekState(wi) === 'done', 'well--current ph__num--meter': progress.weekState(wi) === 'current' }"
                    :style="progress.weekState(wi) === 'current' ? { '--fill': disc(wi).fill } : undefined"
                    :aria-label="progress.weekState(wi) === 'current' ? `${disc(wi).done} z ${disc(wi).total} kroków` : undefined"
                  >
                    <AppIcon v-if="wi === RETURN_WEEK" name="replay" />
                    <b v-else-if="progress.weekState(wi) !== 'done'">{{ wi + 1 }}</b>
                  </span>
                  <strong class="ph__title">{{ phaseTitle(wi) }}</strong>
                  <span v-if="openPhase === wi" class="ph__why">{{ phaseWhy(wi) }}</span>
                </button>

                <div v-if="openPhase === wi" :id="`phase-${weeks[wi]!.key}`" class="ph__body">
                  <div class="steps">
                    <article
                      v-for="step in progress.weekSteps(wi)"
                      :key="step.index"
                      class="st"
                      :class="[`st--${progress.stepState(step.index)}`, { 'st--paused': paused && progress.stepState(step.index) === 'current' }]"
                    >
                      <template v-if="progress.stepState(step.index) === 'current'">
                        <header class="st__head">
                          <span class="well well--current"><b>{{ ordinal(step) }}</b></span>
                          <strong class="st__title">{{ step.title }}</strong>
                          <small class="st__mark">{{ mark(step) }}</small>
                        </header>
                        <p class="st__what">{{ step.what }}</p>
                        <p class="st__why"><b>Po co:</b> {{ step.why }}</p>
                        <footer v-if="!paused" class="st__foot">
                          <button type="button" class="chip chip--primary" @click="start(step)">Rozpocznij</button>
                          <button v-if="step.optional" type="button" class="chip" @click="skip(step)">Pomiń</button>
                        </footer>
                      </template>
                      <template v-else>
                        <span class="well" :class="{ 'well--done': progress.stepState(step.index) === 'done' }"><b v-if="progress.stepState(step.index) !== 'done'">{{ ordinal(step) }}</b></span>
                        <strong class="st__title">{{ step.title }}</strong>
                        <small class="st__mark">{{ mark(step) }}</small>
                        <button v-if="progress.stepState(step.index) === 'done' && step.index === progress.lastDone.value" type="button" class="chip chip--ghost st__undo" @click="undo(step)">Cofnij</button>
                      </template>
                    </article>
                  </div>
                </div>
              </article>
            </div>
          </div>

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

        <div v-if="enrolled" class="pv__lower">
          <div class="pv__col">
            <!-- Praktyki: the growing collection of tools — a shape of its own -->
            <section v-if="!closed && !isReturn" class="card" aria-label="Praktyki">
              <header class="card__head"><span>{{ paused ? 'Gdy wrócisz' : 'Praktyki' }}</span></header>

              <div v-if="practiceVariant === 'pills'" class="pills">
                <span v-for="item in collection" :key="item.def.slug" class="pill" :class="{ 'pill--quiet': !item.active }" :title="item.def.what">
                  <span class="pill__icon"><AppIcon :name="item.def.icon" /></span>
                  <span class="pill__copy"><strong>{{ item.def.title }}</strong><small>{{ item.active ? item.def.rhythm : 'na żądanie' }}</small></span>
                  <button v-if="!paused" type="button" class="chip" @click="simulate(`${item.def.action}: ${item.def.title}`)">{{ item.def.action }}</button>
                </span>
                <span v-if="chosenTask" class="pill pill--task" :title="chosenTask.why">
                  <span class="pill__icon pill__icon--task"><AppIcon name="flag" /></span>
                  <span class="pill__copy"><strong>{{ chosenTask.title }}</strong><small>w świecie</small></span>
                  <template v-if="!paused">
                    <span v-if="taskAdded" class="well disc disc--meter disc--sm" :style="{ '--fill': `${Math.round((1 / chosenTask.times) * 100)}%` }" :aria-label="`1 z ${chosenTask.times}`"><b>1<i>/{{ chosenTask.times }}</i></b></span>
                    <button v-else type="button" class="chip" @click="taskAdded = true">Dodaj do tego tygodnia</button>
                    <button type="button" class="card__link" :aria-expanded="taskOpen" @click="taskOpen = !taskOpen">{{ taskOpen ? 'Zostaw' : 'Zmień' }}</button>
                  </template>
                </span>
              </div>

              <div v-else class="discs">
                <span v-for="item in collection" :key="item.def.slug" class="dsk" :class="{ 'dsk--quiet': !item.active }" :title="item.def.what">
                  <span class="dsk__icon"><AppIcon :name="item.def.icon" /></span>
                  <strong>{{ item.def.title }}</strong>
                  <small>{{ item.active ? item.def.rhythm : 'na żądanie' }}</small>
                  <button v-if="!paused" type="button" class="chip" @click="simulate(`${item.def.action}: ${item.def.title}`)">{{ item.def.action }}</button>
                </span>
                <span v-if="chosenTask" class="dsk dsk--task" :title="chosenTask.why">
                  <span class="dsk__icon dsk__icon--task"><AppIcon name="flag" /></span>
                  <strong>{{ chosenTask.title }}</strong>
                  <small>w świecie</small>
                  <span v-if="!paused" class="dsk__actions">
                    <span v-if="taskAdded" class="well disc disc--meter disc--sm" :style="{ '--fill': `${Math.round((1 / chosenTask.times) * 100)}%` }"><b>1<i>/{{ chosenTask.times }}</i></b></span>
                    <button v-else type="button" class="chip" @click="taskAdded = true">Dodaj</button>
                    <button type="button" class="card__link" :aria-expanded="taskOpen" @click="taskOpen = !taskOpen">{{ taskOpen ? 'Zostaw' : 'Zmień' }}</button>
                  </span>
                </span>
              </div>

              <div v-if="taskOpen" class="opts" role="radiogroup" aria-label="Zadanie tygodnia">
                <label v-for="option in phaseTasks" :key="option.key" class="opt" :class="{ 'is-selected': option.key === chosenTask?.key }">
                  <input type="radio" name="task" :value="option.key" :checked="chosenTask?.key === option.key" @change="taskKey = option.key; taskOpen = false" />
                  <strong>{{ option.title }}</strong>
                  <small>{{ option.times }}× w tygodniu</small>
                </label>
              </div>
            </section>

            <section v-if="isReturn" class="card">
              <header class="card__head"><span>Powrót</span><small>osiem tygodni później</small></header>
              <div class="chips chips--top">
                <button type="button" class="chip" @click="simulate('List od Ciebie')"><AppIcon name="mg-exercise-letter-to-future-self" />List od Ciebie</button>
                <button type="button" class="chip" @click="simulate('Mój plan')"><AppIcon name="mg-exercise-shame-response" />Mój plan</button>
              </div>
            </section>

            <!-- Warto wiedzieć -->
            <section v-if="cards.length" class="card" aria-label="Warto wiedzieć">
              <header class="card__head"><span>Warto wiedzieć</span><button type="button" class="card__link" @click="simulate('Wszystkie artykuły')">Wszystkie</button></header>
              <div class="kn">
                <button v-for="c in cards" :key="c.key" type="button" class="kn__tile" :class="{ 'is-read': readCards.includes(c.key) }" @click="read(c.key, c.title)">
                  <span class="kn__icon"><AppIcon :name="readCards.includes(c.key) ? 'task' : 'menu_book'" /></span>
                  <strong>{{ c.title }}</strong>
                </button>
              </div>
            </section>
          </div>

          <!-- Postęp: unchanged from round 6 -->
          <section class="card" aria-label="Postęp">
            <header class="card__head"><span>Postęp</span></header>
            <div class="ptile">
              <header class="measure__head"><span class="blk__label">Części</span></header>
              <MomentsChart v-if="hasMoments" variant="columns" :stats="stats" :slots="8" />
              <p v-else class="muted">Jeszcze bez Momentów.</p>
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
              <div v-if="measureOpen" class="sk__table" role="table">
                <div class="sk__tr sk__tr--head" role="row"><span /><span v-for="c in skillColumns" :key="c" role="columnheader">{{ c }}</span></div>
                <div v-for="row in skills" :key="row.key" class="sk__tr" role="row">
                  <span role="rowheader">{{ row.name }} <small>{{ row.label }}</small></span>
                  <span v-for="(p, i) in row.points" :key="i" class="sk__td" :class="{ 'is-pending': p === null }" role="cell">{{ p === null ? '·' : format(p) }}</span>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>

    <p v-if="notice" class="pv3__notice" role="status">
      <span>{{ notice }}</span>
      <button type="button" class="chip chip--ghost" aria-label="Zamknij" @click="notice = ''"><AppIcon name="close" /></button>
    </p>

    <section v-if="!standalone" class="pv3__block">
      <header class="pv3__block-head">
        <span class="lab-eyebrow">02 · decyzje do oceny</span>
        <h2>Co ten koncept rozstrzyga</h2>
      </header>
      <ul class="pv3__decisions">
        <li v-for="d in decisions" :key="d.id">
          <span class="pv3__decision-id">{{ d.id }}</span>
          <div><strong>{{ d.title }}</strong><p>{{ d.body }}</p></div>
        </li>
      </ul>
    </section>
  </section>
</template>

<style scoped>
/* ── Lab chrome ── */
.pv3 { min-width: 0; padding-bottom: 40px; color: var(--mg-color-ink); }
.pv3__toolbar { display: flex; flex-wrap: wrap; align-items: center; gap: 14px; margin-bottom: 18px; padding: 12px 14px; border: 1px solid var(--mg-color-border); border-radius: var(--mg-radius-lg); background: var(--mg-color-mist); }
.pv3__select { display: inline-flex; align-items: center; gap: 8px; color: var(--mg-color-muted); font-size: 10px; font-weight: 800; letter-spacing: 0.04em; text-transform: uppercase; }
.pv3__select select { min-height: 34px; padding: 6px 28px 6px 10px; border: 1px solid var(--mg-color-field-border); border-radius: var(--mg-radius-sm); background: var(--mg-color-paper); color: var(--mg-color-ink); font: inherit; font-size: 12px; letter-spacing: 0; text-transform: none; }
.pv3__reset { min-height: 34px; margin-left: auto; padding: 0 12px; border: 1px solid var(--mg-color-border); border-radius: var(--mg-radius-sm); background: var(--mg-color-paper); color: var(--mg-color-primary-strong); font: inherit; font-size: 11px; font-weight: 800; cursor: pointer; }
.pv3__reset--tight { margin-left: 0; }
.pv3--standalone { width: auto; min-height: 100vh; padding: 28px 32px 48px 104px; background: var(--mg-color-canvas); }
.pv3--standalone .pv3__stage { padding: 0; border: 0; border-radius: 0; background: transparent; }
.pv3--standalone .pv { max-width: 1600px; margin: 0; }
.pv3__stage { padding: 24px 22px 30px; border: 1px solid var(--mg-color-border); border-radius: var(--mg-radius-xl); background: var(--mg-color-canvas); }
.pv3__block { margin-top: 30px; }
.pv3__block-head { margin-bottom: 14px; }
.pv3__block-head h2 { margin: 6px 0 0; font-size: 20px; line-height: 1.2; }
.pv3__decisions { display: grid; gap: 8px; margin: 0; padding: 0; list-style: none; }
.pv3__decisions li { display: grid; grid-template-columns: 40px 1fr; gap: 12px; padding: 12px 14px; border: 1px solid var(--mg-color-border); border-radius: var(--mg-radius-md); background: var(--mg-color-mist); }
.pv3__decision-id { color: var(--mg-color-primary-strong); font-size: 12px; font-weight: 900; }
.pv3__decisions strong { display: block; font-size: 13px; }
.pv3__decisions p { margin: 4px 0 0; color: var(--mg-color-muted); font-size: 12px; line-height: 1.5; }
.pv3__notice { position: fixed; bottom: 20px; left: 50%; z-index: 8; display: flex; align-items: center; gap: 14px; max-width: 600px; margin: 0; padding: 12px 12px 12px 18px; border: 1px solid var(--mg-color-border); border-radius: var(--mg-radius-md); background: var(--mg-color-paper); box-shadow: var(--mg-shadow-raised); font-size: 12px; transform: translateX(-50%); }

/* ── Product vocabulary (round 6) ── */
.pv { max-width: 1180px; margin: 0 auto; font-family: var(--mg-font-sans); }
.pv__head { display: grid; grid-template-columns: auto auto minmax(0, 1fr) auto; gap: var(--mg-space-3); align-items: center; margin-bottom: var(--mg-space-5); }
.pv__title { margin: 0; font-size: 26px; font-weight: 800; letter-spacing: -0.015em; line-height: 1.15; }
.pv__back { display: grid; place-items: center; width: 34px; height: 34px; border: 0; border-radius: var(--mg-radius-organic-a); background: var(--mg-color-mist); color: var(--mg-color-primary-strong); cursor: pointer; }
.pv__icon { display: grid; place-items: center; width: 52px; height: 52px; border-radius: var(--mg-radius-icon-field-a); background: var(--mg-color-sky-well); color: var(--mg-color-primary-strong); }
.pv__icon :deep(.app-icon) { font-size: 28px; }
.pv__menu { position: relative; }
.pv__menu-list { position: absolute; right: 0; z-index: 3; display: grid; min-width: 11rem; margin-top: 4px; padding: 4px; border: 1px solid var(--mg-color-border); border-radius: var(--mg-radius-md); background: var(--mg-color-paper); box-shadow: var(--mg-shadow-raised-sm); }
.pv__menu-list button { padding: 8px 10px; border: 0; border-radius: var(--mg-radius-sm); background: transparent; color: var(--mg-color-ink); font: inherit; font-size: var(--mg-font-size-sm); font-weight: 700; text-align: left; cursor: pointer; }
.pv__menu-list button:hover { background: var(--mg-color-mist); }
.pv__lower { display: grid; grid-template-columns: minmax(0, 1.2fr) minmax(330px, 1fr); gap: var(--mg-space-5); align-items: start; margin-top: var(--mg-space-5); }
.pv__col { display: grid; gap: var(--mg-space-4); min-width: 0; }
.card { min-width: 0; padding: var(--mg-space-4); border: 1px solid var(--mg-color-border); border-radius: var(--mg-radius-lg); background: var(--mg-color-surface); box-shadow: var(--mg-shadow-raised-sm); }
.card__head { display: flex; align-items: center; justify-content: space-between; gap: var(--mg-space-2); margin-bottom: var(--mg-space-3); color: var(--mg-color-primary-strong); font-size: var(--mg-font-size-xs); font-weight: 900; letter-spacing: 0.1em; text-transform: uppercase; }
.card__head small { color: var(--mg-color-muted); font-size: var(--mg-font-size-xs); font-weight: 700; letter-spacing: 0.02em; text-transform: none; }
.card__link { padding: 2px 0; border: 0; background: none; color: var(--mg-color-primary-strong); font: inherit; font-size: var(--mg-font-size-xs); font-weight: 800; letter-spacing: 0.02em; text-transform: none; cursor: pointer; }
.card__link:hover { text-decoration: underline; }
.muted { margin: 0; color: var(--mg-color-muted); font-size: var(--mg-font-size-xs); line-height: 1.5; }
.chip { display: inline-flex; align-items: center; gap: 5px; min-height: 1.75rem; padding: 3px var(--mg-space-2); border: 1px solid var(--mg-color-border); border-radius: var(--mg-radius-sm); background: var(--mg-color-paper); color: var(--mg-color-muted); font: inherit; font-size: var(--mg-font-size-xs); font-weight: 800; white-space: nowrap; cursor: pointer; }
.chip :deep(.app-icon) { font-size: var(--mg-font-size-sm); }
.chip:hover, .chip.is-active { background: var(--mg-color-sky-well); color: var(--mg-color-primary-strong); }
.chip--primary { border-color: transparent; background: var(--mg-color-primary-fill); color: var(--mg-color-on-primary); }
.chip--primary:hover { background: var(--mg-color-primary-fill-hover); color: var(--mg-color-on-primary); }
.chip--ghost { border-color: transparent; background: transparent; }
.chips { display: flex; flex-wrap: wrap; gap: 6px; margin-top: var(--mg-space-3); }
.chips--top { margin-top: 0; }
.btn-primary { display: inline-flex; align-items: center; justify-content: center; gap: var(--mg-space-2); min-height: 2.25rem; padding: 0 var(--mg-space-4); border: 1px solid transparent; border-radius: var(--mg-radius-md); background: var(--mg-color-primary-fill); color: var(--mg-color-on-primary); font: inherit; font-size: var(--mg-font-size-sm); font-weight: 800; white-space: nowrap; cursor: pointer; }
.btn-primary:hover { background: var(--mg-color-primary-fill-hover); }

.well { position: relative; display: grid; place-items: center; flex: 0 0 auto; width: var(--well, 1.85rem); height: var(--well, 1.85rem); border: 1px solid var(--mg-color-border); border-radius: var(--mg-radius-organic-a); background: var(--mg-color-canvas); box-shadow: var(--mg-shadow-inset-sm); color: var(--mg-color-muted); font-size: var(--mg-font-size-xs); font-weight: 800; font-style: normal; }
.well--sm { --well: 1.4rem; }
.well--done { border-color: transparent; background: var(--mg-color-sky-field); }
.well--done::after { width: 62%; aspect-ratio: 1; border-radius: var(--mg-radius-organic-c); background: var(--mg-color-state); content: ''; transform: rotate(-2deg); }
.well--current { border-color: var(--mg-color-primary); color: var(--mg-color-primary-strong); box-shadow: var(--mg-shadow-inset-sm), 0 0 0 3px var(--mg-color-primary-soft); }
.well--past { border-color: transparent; background: var(--mg-color-sky-field); color: var(--mg-color-primary-strong); box-shadow: none; }
.well :deep(.app-icon) { font-size: var(--mg-font-size-sm); }
.disc { --well: 2.1rem; overflow: hidden; }
.disc--sm { --well: 1.75rem; }
.disc--meter { color: var(--mg-color-primary-strong); background: linear-gradient(to right, var(--mg-color-sky-field) var(--fill, 0%), var(--mg-color-canvas) var(--fill, 0%)); }
.disc b { font-size: 0.78rem; font-weight: 900; line-height: 1; }
.disc b i { font-size: 0.6rem; font-weight: 700; font-style: normal; opacity: 0.7; }

/* ── Twoja droga: phases in rows of four; the open one widens ── */
.journey > .card__head { margin-bottom: var(--mg-space-3); }
.confirm { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: var(--mg-space-3); align-items: center; margin-bottom: var(--mg-space-3); padding: var(--mg-space-2) var(--mg-space-3); border-radius: var(--mg-radius-md); background: var(--mg-color-mist); font-size: var(--mg-font-size-sm); font-weight: 600; }
.confirm__actions { display: inline-flex; gap: 6px; }
.grid { --ph-h: 15rem; display: grid; gap: var(--mg-space-3); }
/* A row of four clouds of ONE fixed height (user, 01.11: only the width may change). The open phase takes four shares,
   its neighbours shrink to 0.55 share each so the steps have room. */
.grid__row { display: flex; gap: var(--mg-space-3); align-items: stretch; }
.ph { display: flex; flex: 1 1 0; flex-direction: column; min-width: 0; height: var(--ph-h); border-radius: var(--mg-radius-lg); background: var(--mg-color-mist); box-shadow: var(--mg-shadow-raised-sm); transition: flex-grow var(--mg-duration-base) var(--mg-ease-standard), background var(--mg-duration-fast) var(--mg-ease-standard); }
.grid__row--open .ph:not(.ph--open) { flex-grow: 0.55; }
.ph--open { flex-grow: 4; }
.ph__head { display: grid; flex: 1 1 auto; align-content: center; justify-items: center; gap: var(--mg-space-2); width: 100%; min-height: 0; padding: var(--mg-space-3); border: 0; border-radius: inherit; background: transparent; color: inherit; font: inherit; text-align: center; cursor: pointer; transition: background var(--mg-duration-fast) var(--mg-ease-standard); }
.ph:not(.ph--open) .ph__head:hover { background: var(--mg-color-paper); }
/* Open: the head becomes one row — number · title · the phase's sentence — and the body takes the rest of the height. */
.ph--open .ph__head { --well: 2rem; flex: 0 0 auto; grid-template-columns: auto auto minmax(0, 1fr); align-items: center; justify-items: start; gap: var(--mg-space-2) var(--mg-space-3); padding: 10px var(--mg-space-3) 6px; border-bottom-left-radius: 0; border-bottom-right-radius: 0; text-align: left; cursor: default; }
.ph__num { --well: 2.4rem; font-size: var(--mg-font-size-sm); }
.ph__num--meter { background: linear-gradient(to top, var(--mg-color-sky-field) var(--fill, 0%), var(--mg-color-canvas) var(--fill, 0%)); }
.ph__title { display: block; font-size: var(--mg-font-size-md); font-weight: 700; line-height: 1.25; }
.ph--later .ph__title { color: color-mix(in srgb, var(--mg-color-ink) 70%, var(--mg-color-muted)); font-weight: 600; }
.ph--done .ph__title { color: color-mix(in srgb, var(--mg-color-ink) 62%, var(--mg-color-muted)); }
.ph--current .ph__title { font-weight: 800; }
.ph__why { min-width: 0; color: var(--mg-color-muted); font-size: var(--mg-font-size-xs); font-weight: 500; line-height: 1.45; }
.ph__body { display: flex; flex: 1 1 auto; min-height: 0; padding: 0 var(--mg-space-3) var(--mg-space-3); }

/* Steps in the open phase fill the remaining height: the current step takes the width left by the small fixed tiles. */
.steps { display: flex; flex: 1 1 auto; gap: var(--mg-space-2); align-items: stretch; min-width: 0; }
.st { position: relative; display: grid; flex: 0 0 8.5rem; justify-items: center; align-content: center; gap: 4px; min-width: 0; padding: var(--mg-space-2); border-radius: var(--mg-radius-md); background: var(--mg-color-paper); text-align: center; }
.st__title { font-size: var(--mg-font-size-sm); font-weight: 700; line-height: 1.3; }
.st--later .st__title { color: color-mix(in srgb, var(--mg-color-ink) 70%, var(--mg-color-muted)); font-weight: 600; }
.st--done .st__title { color: color-mix(in srgb, var(--mg-color-ink) 60%, var(--mg-color-muted)); }
.st__mark { color: var(--mg-color-muted); font-size: var(--mg-font-size-xs); font-weight: 700; white-space: nowrap; }
.st__undo { position: absolute; right: var(--mg-space-2); bottom: var(--mg-space-2); opacity: 0; pointer-events: none; transition: opacity var(--mg-duration-fast) var(--mg-ease-standard); }
.st--done:hover .st__undo, .st--done:focus-within .st__undo { opacity: 1; pointer-events: auto; }
.st--current { flex: 1 1 0; justify-items: start; align-content: start; gap: 2px; overflow: hidden; padding: var(--mg-space-2) var(--mg-space-3); box-shadow: 0 0 0 3px var(--mg-color-primary-soft); text-align: left; }
.st--paused { box-shadow: none; }
.st__head { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; gap: var(--mg-space-2); align-items: center; width: 100%; }
.st--current .st__title { font-size: var(--mg-font-size-md); font-weight: 800; }
.st__what { display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 3; margin: 2px 0 0; overflow: hidden; color: var(--mg-color-ink); font-size: var(--mg-font-size-xs); line-height: 1.5; }
.st__why { display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; margin: 0; overflow: hidden; color: var(--mg-color-muted); font-size: var(--mg-font-size-xs); line-height: 1.5; }
.st__why b { color: var(--mg-color-primary-strong); font-weight: 800; }
.st__foot { display: flex; gap: 8px; margin-top: auto; padding-top: var(--mg-space-1); }
.closed { display: grid; grid-template-columns: auto minmax(0, 1fr); gap: var(--mg-space-3); align-items: start; margin-top: var(--mg-space-3); padding: var(--mg-space-3); border-radius: var(--mg-radius-md); background: var(--mg-color-mist); }
.closed__icon { display: grid; place-items: center; width: 2.6rem; height: 2.6rem; border-radius: var(--mg-radius-icon-field-b); background: var(--mg-color-sky-well); color: var(--mg-color-primary-strong); }
.closed__icon :deep(.app-icon) { font-size: 24px; }
.closed__copy { display: grid; gap: var(--mg-space-1); align-self: center; }
.closed__copy strong { font-size: var(--mg-font-size-sm); }
.closed .chips { margin-top: var(--mg-space-1); }

/* ── Praktyki: shape = role. Steps are numbered tiles; what repeats is a round disc with an icon. ── */
.pills { display: flex; flex-wrap: wrap; gap: var(--mg-space-2); }
.pill { display: inline-flex; align-items: center; gap: var(--mg-space-2); max-width: 100%; min-height: 2.9rem; padding: var(--mg-space-1) var(--mg-space-2) var(--mg-space-1) var(--mg-space-1); border-radius: var(--mg-radius-pill, 999px); background: var(--mg-color-mist); box-shadow: var(--mg-shadow-raised-sm); }
.pill--task { flex-basis: 100%; }
.pill--quiet { box-shadow: none; }
.pill--quiet .pill__icon { background: var(--mg-color-sky-field); }
.pill--quiet .pill__copy strong { color: color-mix(in srgb, var(--mg-color-ink) 70%, var(--mg-color-muted)); }
.pill__icon { display: grid; place-items: center; flex: 0 0 auto; width: 2.3rem; height: 2.3rem; border-radius: var(--mg-radius-icon-field-b); background: var(--mg-color-sky-well); color: var(--mg-color-primary-strong); }
.pill__icon :deep(.app-icon) { font-size: 20px; }
.pill__icon--task { border-radius: var(--mg-radius-icon-field-c); background: var(--mg-color-sky-field); }
.pill__copy { display: grid; gap: 1px; min-width: 0; padding-right: var(--mg-space-1); }
.pill__copy strong { font-size: var(--mg-font-size-sm); font-weight: 700; line-height: 1.25; }
.pill__copy small { color: var(--mg-color-muted); font-size: var(--mg-font-size-xs); font-weight: 700; }
.discs { display: grid; grid-template-columns: repeat(auto-fill, minmax(8.5rem, 1fr)); gap: var(--mg-space-3) var(--mg-space-2); align-items: start; }
.dsk { display: grid; justify-items: center; gap: 4px; min-width: 0; padding: var(--mg-space-2) var(--mg-space-1); text-align: center; }
.dsk--task { grid-column: span 2; }
.dsk--quiet .dsk__icon { background: var(--mg-color-sky-field); box-shadow: none; }
.dsk--quiet strong { color: color-mix(in srgb, var(--mg-color-ink) 70%, var(--mg-color-muted)); }
.dsk__icon { display: grid; place-items: center; width: 3.2rem; height: 3.2rem; margin-bottom: 2px; border-radius: var(--mg-radius-icon-field-a); background: var(--mg-color-sky-well); box-shadow: var(--mg-shadow-raised-sm); color: var(--mg-color-primary-strong); }
.dsk__icon :deep(.app-icon) { font-size: 26px; }
.dsk__icon--task { border-radius: var(--mg-radius-icon-field-c); background: var(--mg-color-sky-field); }
.dsk strong { font-size: var(--mg-font-size-sm); font-weight: 700; line-height: 1.25; }
.dsk small { color: var(--mg-color-muted); font-size: var(--mg-font-size-xs); font-weight: 700; }
.dsk .chip, .dsk__actions { margin-top: 4px; }
.dsk__actions { display: inline-flex; align-items: center; gap: 8px; }
.opts { margin-top: var(--mg-space-3); }
.opt { position: relative; display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: var(--mg-space-2); align-items: center; padding: var(--mg-space-1) var(--mg-space-2); border-radius: var(--mg-radius-sm); cursor: pointer; }
.opt:hover, .opt.is-selected { background: var(--mg-color-mist); }
.opt input { position: absolute; inset: 0; margin: 0; opacity: 0; cursor: inherit; }
.opt strong { font-size: var(--mg-font-size-sm); font-weight: 700; }
.opt small { color: var(--mg-color-muted); font-size: var(--mg-font-size-xs); font-weight: 700; }

/* ── Postęp (round 6) ── */
.blk__label { color: var(--mg-color-muted); font-size: 0.66rem; font-weight: 900; letter-spacing: 0.1em; text-transform: uppercase; }
.ptile { display: grid; gap: 6px; padding: 12px 14px 12px; border-radius: var(--mg-radius-md); background: var(--mg-color-mist); }
.ptile + .ptile { margin-top: var(--mg-space-3); }
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
.sk__td.is-pending { background: var(--mg-color-mist); color: var(--mg-color-muted); }

/* Knowledge tiles (round 6). */
.kn { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--mg-space-2); }
.kn__tile { display: grid; grid-template-columns: auto minmax(0, 1fr); gap: var(--mg-space-2); align-items: center; min-height: 3.2rem; padding: var(--mg-space-2); border: 0; border-radius: var(--mg-radius-md); background: var(--mg-color-mist); color: inherit; font: inherit; text-align: left; cursor: pointer; transition: background var(--mg-duration-fast) var(--mg-ease-standard); }
.kn__tile:hover { background: var(--mg-color-paper); }
.kn__tile strong { font-size: var(--mg-font-size-xs); font-weight: 700; line-height: 1.3; }
.kn__icon { display: grid; place-items: center; width: 1.85rem; height: 1.85rem; border-radius: var(--mg-radius-icon-field-b); background: var(--mg-color-sky-well); color: var(--mg-color-primary-strong); }
.kn__icon :deep(.app-icon) { font-size: 16px; }
.kn__tile.is-read .kn__icon { background: var(--mg-color-sky-field); }
.pv3 :focus-visible { outline: 2px solid var(--mg-color-focus); outline-offset: 2px; }

@media (max-width: 1180px) {
  .pv__lower { grid-template-columns: 1fr; }
  .grid__row { flex-wrap: wrap; }
}
@media (prefers-reduced-motion: reduce) {
  .pv3 * { transition: none; }
}
</style>
