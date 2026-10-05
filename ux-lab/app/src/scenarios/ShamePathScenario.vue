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
  skillsFor,
  skillColumns,
  type Sample,
  type Surface,
} from '~lab/lab/shamePath'

/**
 * Shame path v3 · P2 · round 5 — only what is needed on the surface.
 * Names, wells, bars and actions stay visible; every number, fraction,
 * explanation and legend moved into a disclosure or into the table, or
 * was removed. Per-week small multiples for the parts (user: the per-week
 * bar idea was right, the colours were wrong); minimal "was → is" tracks
 * for the two questionnaires.
 */
const route = useRoute()
const router = useRouter()
const sample = computed(() => (samples.some(s => s.id === route.query.sample) ? (route.query.sample as Sample) : 'mid'))
const surface = computed<Surface>(() =>
  route.query.surface === 'reflection' || route.query.surface === 'today' ? route.query.surface : 'dashboard'
)
const closed = computed(() => sample.value === 'completed' || sample.value === 'return')
const currentWeek = computed(() => (sample.value === 'start' ? 0 : sample.value === 'return' ? 8 : closed.value ? -1 : 3))
const currentStep = computed(() => (sample.value === 'start' || sample.value === 'return' ? 0 : 1))
const expanded = ref<number[]>([3])
const stats = computed(() => statsFor(sample.value))
const skills = computed(() => skillsFor(sample.value))
const phaseKey = computed(() => weeks[Math.max(0, currentWeek.value)]!.key)
const allCards = computed(() => cardsFor(phaseKey.value))
const showAllCards = ref(false)
const cards = computed(() => (showAllCards.value ? allCards.value : allCards.value.filter(c => c.pinned || c.phaseKeys.includes(phaseKey.value)).slice(0, 2)))
const readCards = ref<string[]>([])
const drawerKey = ref<string | null>(null)
const drawer = computed(() => allCards.value.find(c => c.key === drawerKey.value))
const drawerElement = ref<HTMLDialogElement>()
const showAllSentences = ref(false)
const ownSentences = computed(() =>
  sample.value === 'start'
    ? []
    : collectOwnSentences([...entries.filter(e => e.createdAt <= (closed.value ? '2026-11-02' : '2026-10-05')), ...ownEntries])
)
const notice = ref('')
const unlogged = ref<string | null>(null)
const severity = ref<number | null>(null)
const reflection = ref('')
const reflectionStats = computed(() =>
  stats.value.map((week, i, list) => ({
    ...week,
    ...(i === list.length - 1 && unlogged.value ? { unlogged: UNLOGGED_BUCKETS[unlogged.value] } : {}),
  }))
)
const responseOpen = ref(false)
const futureLetterOpen = ref(false)
const measureOpen = ref(false)
const menuOpen = ref(false)
const task = ref('stayLonger')
const tasks = [
  { key: 'stayLonger', title: 'Zostań w sytuacji minutę dłużej', times: 2, done: 1 },
  { key: 'repairGuilt', title: 'Napraw to, co możesz naprawić', times: 2, done: 0 },
]
const chosenTask = computed(() => tasks.find(t => t.key === task.value)!)
const nextStep = computed(() => weeks[Math.max(0, currentWeek.value)]!.steps[currentStep.value]!)
const practiceDays = computed(() => (sample.value === 'quiet' ? [] : [0, 2, 5]))
const dayLetters = ['p', 'w', 'ś', 'c', 'p', 's', 'n']
const dayNames = ['Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota', 'Niedziela']
const format = (n: number) => n.toFixed(1).replace('.', ',')
const lastIndex = (points: (number | null)[]) => points.map((p, i) => (p === null ? -1 : i)).filter(i => i >= 0).at(-1)
const pos = (row: { min: number; max: number }, value: number) => `${((value - row.min) / (row.max - row.min)) * 100}%`
const skillTitle = (row: { name: string; instrument: string; points: (number | null)[] }) =>
  `${row.name} (${row.instrument}): ${row.points.map((p, i) => `${skillColumns[i]} ${p === null ? '—' : format(p)}`).join(' · ')}`

function setQuery(key: string, value: string) {
  void router.replace({ query: { ...route.query, [key]: value } })
}
function openResponse() {
  setQuery('surface', 'dashboard')
  responseOpen.value = true
}
function toggleWeek(index: number) {
  expanded.value = expanded.value.includes(index) ? expanded.value.filter(i => i !== index) : [...expanded.value, index]
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
function reset() {
  expanded.value = currentWeek.value < 0 ? [] : [currentWeek.value]
  readCards.value = []
  unlogged.value = null
  severity.value = null
  reflection.value = ''
  task.value = 'stayLonger'
  showAllCards.value = false
  showAllSentences.value = false
  responseOpen.value = false
  futureLetterOpen.value = false
  measureOpen.value = false
  menuOpen.value = false
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

const decisions = [
  { id: 'D1', title: 'Na wierzchu tylko nazwy, studnie, słupki i akcje', body: 'Usunięte z powierzchni: liczniki kroków, „ten tydzień · 1 z 3”, minuty przy krokach niebieżących, podpisy „Zobacz”, ułamki zadań, linia podsumowania Momentów, legendy, reguły czytania, zdania pomiaru, źródła i daty przy zdaniach, leady kart wiedzy, licznik w „Wszystkie”, notka pod polem Dzisiaj, pytanie „na koniec tygodnia” (żyje w refleksji), historia zadań. Liczby mieszkają w jednym miejscu: tabela „Liczby” w Szczegółach.' },
  { id: 'D2', title: '„Kto przejmuje ster” = małe wielokrotności per tydzień', body: 'Wiersz na część, słupek na tydzień: wysokość = ile razy ta część przejęła ster w tym tygodniu, ton = jak mocno (ocena 1–5 z Momentu). Jeden odcień akcentu zamiast palety kategorycznej, bez arbitralnego okna „ostatnie 2 tygodnie” — widać cały przebieg i względną siłę wzorców. Oś tylko T1 i T8, hover podaje liczby.' },
  { id: 'D3', title: 'Pomiar jako cztery ciche tory', body: 'Współczucie dla siebie, Uspokajam siebie, Nieadekwatne ja, Znienawidzone ja: tor skali, pusty punkt = start, pełny = ostatni pomiar, nic więcej. Hover podaje wartości; „Szczegóły” rozwija siatkę Start · Połowa · Koniec · Powrót i jedno zdanie, co mierzą SCS-SF i FSCRS. Bez odwracania osi.' },
  { id: 'D4', title: 'Nagłówek: cel i znak, akcje w ⋯', body: 'Eyebrow „ŚCIEŻKI · Tydzień 4 z 8”, tytuł, jedno zdanie celu, Mój znak jako kursywa. Wstrzymaj i Od nowa schowane pod jednym ⋯.' },
  { id: 'D5', title: 'Otwarty tydzień: zdanie „po co”, kroki, dwa zwijane wiersze', body: 'Praktyki (nazwy i „dziś/jutro”, w rozwinięciu Otwórz i wstęga dni) oraz W świecie (zadanie i studnie, w rozwinięciu wybór zadania). Przycisk tylko przy bieżącym kroku.' },
  { id: 'D6', title: 'Prawa kolumna: cztery karty bez powtórzeń', body: 'TERAZ (krok + Rozpocznij, praktyka na dziś, dwie akcje), POSTĘP (słupki części + Szczegóły, tory pomiaru + Szczegóły), MOJE ZDANIA (dwa cytaty), WARTO WIEDZIEĆ (dwa tytuły). „Zapisz moment” tylko raz, w TERAZ.' },
]
</script>

<template>
  <section class="scenario-page spv mg-design-v2">
    <header class="concept-heading">
      <div>
        <span class="lab-eyebrow">P2 · Ścieżka „Ze wstydu do współczucia” · widok ścieżki, refleksja, Dzisiaj · runda 5</span>
        <h1>Tylko to, co niezbędne: droga, krok, słupki, tory</h1>
        <p>
          Po rundzie 4 („zdecydowanie za dużo tekstów, dopisków, liczb, ułamków”): przegląd element po elemencie. Na wierzchu
          zostają nazwy, studnie, słupki i akcje; liczby są w jednej tabeli w Szczegółach, objaśnienia zniknęły. Części
          wróciły do słupków per tydzień, pomiar do minimalnych torów.
        </p>
      </div>
      <span class="status-badge status-badge--experiment">Propozycja do oceny · runda 5</span>
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

    <!-- 01 · widok ścieżki -->
    <div v-if="surface === 'dashboard'" class="spv__stage">
      <div class="pv">
        <header class="pv__head">
          <button type="button" class="pv__back" aria-label="Wróć do ćwiczeń"><AppIcon name="arrow_back" /></button>
          <span class="pv__icon"><AppIcon name="mg-exercise-compassionate-image" /></span>
          <div class="pv__titles">
            <span class="pv__eyebrow">
              Ścieżki
              <b>{{ closed ? (sample === 'return' ? 'Powrót' : 'Zakończona') : `Tydzień ${currentWeek + 1} z 8` }}{{ sample === 'paused' ? ' · wstrzymana' : '' }}</b>
            </span>
            <h1>Ze wstydu do współczucia</h1>
            <p class="pv__goal">Zauważać wstyd szybciej. Odpowiadać ciepłem — sobie i innym — zamiast atakiem albo ukryciem. Wracać do kontaktu.</p>
            <p v-if="sample !== 'start'" class="pv__sign"><small>Mój znak</small><em>„Gdy zrobię błąd przy ludziach, zostanę w rozmowie zamiast zniknąć.”</em></p>
          </div>
          <div class="pv__menu">
            <button type="button" class="chip chip--ghost" aria-label="Więcej" :aria-expanded="menuOpen" @click="menuOpen = !menuOpen"><AppIcon name="more_horiz" /></button>
            <div v-if="menuOpen" class="pv__menu-list">
              <button v-if="!closed" type="button" @click="setQuery('sample', sample === 'paused' ? 'mid' : 'paused')">{{ sample === 'paused' ? 'Wznów' : 'Wstrzymaj' }}</button>
              <button type="button" @click="setQuery('sample', 'start')">Zacznij od nowa</button>
            </div>
          </div>
        </header>

        <div class="pv__grid">
          <section class="card pv__journey" aria-label="Twoja droga">
            <header class="card__head"><span>Twoja droga</span></header>
            <article
              v-for="(week, wi) in weeks"
              :key="week.key"
              class="wk"
              :class="[`wk--${weekState(wi)}`, { 'wk--open': expanded.includes(wi), 'wk--return': wi === 8 }]"
            >
              <button type="button" class="wk__row" :aria-expanded="expanded.includes(wi)" :aria-controls="`week-${week.key}`" @click="toggleWeek(wi)">
                <span class="well" :class="{ 'well--done': weekState(wi) === 'done', 'well--current': weekState(wi) === 'current' }">
                  <AppIcon v-if="wi === 8" name="replay" />
                  <b v-else-if="weekState(wi) !== 'done'">{{ wi + 1 }}</b>
                </span>
                <strong class="wk__title">{{ week.title }}</strong>
                <span class="wk__marks"><i v-for="(_, si) in week.steps" :key="si" class="mark" :class="`mark--${stepState(wi, si)}`" /></span>
                <AppIcon class="wk__chevron" :name="expanded.includes(wi) ? 'expand_less' : 'expand_more'" />
              </button>

              <div v-if="expanded.includes(wi)" :id="`week-${week.key}`" class="wk__body">
                <p class="wk__why">{{ wi === 8 ? 'Wracasz do dwóch pomiarów i do listu, który napisałeś do siebie.' : week.why }}</p>
                <ul class="steps">
                  <li v-for="(step, si) in week.steps" :key="step.slug + si" class="st" :class="`st--${stepState(wi, si)}`">
                    <span class="mark mark--lg" :class="`mark--${stepState(wi, si)}`"><AppIcon v-if="stepState(wi, si) === 'done'" name="check" /></span>
                    <span class="st__copy">
                      <strong>{{ step.title }}</strong>
                      <small v-if="stepState(wi, si) === 'current'">{{ sample === 'paused' ? 'czeka na Twój powrót' : step.minutes }}</small>
                      <small v-else-if="step.optional">opcjonalnie</small>
                    </span>
                    <button v-if="stepState(wi, si) === 'current' && sample !== 'paused'" type="button" class="chip chip--primary" @click="simulate(step.title)">Rozpocznij</button>
                  </li>
                </ul>

                <template v-if="wi === currentWeek && wi < 8 && sample !== 'start'">
                  <details class="row">
                    <summary class="row__head">
                      <span class="row__eyebrow">Praktyki</span>
                      <span class="row__text">Przerwa na współczucie <small>dziś</small> · Momenty <small>jutro</small></span>
                      <AppIcon name="expand_more" />
                    </summary>
                    <div class="row__body">
                      <div class="pr">
                        <AppIcon name="mg-exercise-self-compassion-break" />
                        <strong>Przerwa na współczucie</strong>
                        <button type="button" class="chip" :disabled="sample === 'paused'" @click="simulate('Przerwa na współczucie')">Otwórz</button>
                      </div>
                      <div class="pr">
                        <AppIcon name="mg-exercise-moments" />
                        <strong>Momenty</strong>
                        <button type="button" class="chip" :disabled="sample === 'paused'" @click="simulate('Zapisz moment')">Zapisz</button>
                      </div>
                      <div class="days" aria-label="Dni z praktyką w tym tygodniu">
                        <span v-for="(letter, di) in dayLetters" :key="di" class="days__day" :title="`${dayNames[di]}: ${practiceDays.includes(di) ? 'praktyka' : 'bez wpisu'}`">
                          <i class="well well--sm" :class="{ 'well--done': practiceDays.includes(di), 'well--today': di === 3 }" />
                          <small>{{ letter }}</small>
                        </span>
                      </div>
                    </div>
                  </details>
                  <details class="row">
                    <summary class="row__head">
                      <span class="row__eyebrow">W świecie</span>
                      <span class="row__text">{{ chosenTask.title }}</span>
                      <span class="wells"><i v-for="n in chosenTask.times" :key="n" class="well well--sm" :class="{ 'well--done': n <= chosenTask.done }" /></span>
                      <AppIcon name="expand_more" />
                    </summary>
                    <div class="row__body" role="radiogroup" aria-label="Zadanie tygodnia">
                      <label v-for="option in tasks" :key="option.key" class="opt" :class="{ 'is-selected': option.key === task }">
                        <input type="radio" name="task" :value="option.key" :checked="task === option.key" @change="task = option.key" />
                        <strong>{{ option.title }}</strong>
                        <i class="well well--sm" :class="{ 'well--done': option.key === task }" />
                      </label>
                    </div>
                  </details>
                </template>
              </div>
            </article>

            <div v-if="closed" class="pv__closed">
              <AppIcon name="mg-exercise-maintenance-plan" />
              <strong>To, co pomaga, zostaje z Tobą</strong>
              <button type="button" class="chip" @click="simulate('Plan podtrzymania')">Plan podtrzymania</button>
            </div>
          </section>

          <aside class="pv__side" aria-label="Kontekst ścieżki">
            <section v-if="!closed || sample === 'return'" class="card">
              <header class="card__head"><span>{{ sample === 'paused' ? 'Gdy wrócisz' : sample === 'return' ? 'Powrót' : 'Teraz' }}</span></header>
              <div class="now">
                <span class="now__icon"><AppIcon :name="`mg-exercise-${nextStep.slug}`" /></span>
                <span class="now__copy"><strong>{{ nextStep.title }}</strong><small>{{ sample === 'return' ? '27 grudnia' : nextStep.minutes }}</small></span>
                <button v-if="sample !== 'paused'" type="button" class="btn-primary" @click="simulate(nextStep.title)">Rozpocznij</button>
              </div>
              <div v-if="sample !== 'start' && sample !== 'return'" class="pr pr--now">
                <AppIcon name="mg-exercise-self-compassion-break" />
                <strong>Przerwa na współczucie <small>na dziś</small></strong>
                <button type="button" class="chip" :disabled="sample === 'paused'" @click="simulate('Przerwa na współczucie')">Otwórz</button>
              </div>
              <div class="chips">
                <button type="button" class="chip" @click="simulate('Zapisz moment')"><AppIcon name="add" />Zapisz moment</button>
                <button v-if="sample !== 'start'" type="button" class="chip" :class="{ 'is-active': responseOpen }" :aria-expanded="responseOpen" @click="responseOpen = !responseOpen"><AppIcon name="mg-exercise-shame-response" />Mój plan</button>
                <button v-if="sample === 'return'" type="button" class="chip" :class="{ 'is-active': futureLetterOpen }" @click="futureLetterOpen = !futureLetterOpen"><AppIcon name="mg-exercise-letter-to-future-self" />List od Ciebie</button>
              </div>
              <div v-if="responseOpen" class="quote">
                <p><em>„To moja część, nie cały ja.”</em></p>
                <p>Oddech. Stopy na ziemi. Zostań minutę dłużej.</p>
                <button type="button" class="chip" @click="simulate('Moment z mojej odpowiedzi')">Zapisz jako moment</button>
              </div>
              <div v-if="futureLetterOpen" class="quote">
                <p><em>„Jeśli dziś jest trudniej, wróć do pierwszej minuty. Oddychaj. Powiedz komuś, że potrzebujesz chwili. Nie zaczynasz od zera.”</em></p>
              </div>
            </section>

            <section class="card">
              <header class="card__head"><span>Postęp</span></header>
              <ShameMomentsGlance :stats="stats" :slots="8" />
              <div class="measure">
                <header class="measure__head">
                  <span class="measure__title">Pomiar</span>
                  <button type="button" class="card__link" :aria-expanded="measureOpen" @click="measureOpen = !measureOpen">{{ measureOpen ? 'Mniej' : 'Szczegóły' }}</button>
                </header>
                <div v-for="row in skills" :key="row.key" class="sk" :title="skillTitle(row)">
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

            <section v-if="ownSentences.length" class="card">
              <header class="card__head">
                <span>Moje zdania</span>
                <button v-if="ownSentences.length > 2" type="button" class="card__link" @click="showAllSentences = !showAllSentences">{{ showAllSentences ? 'Mniej' : 'Wszystkie' }}</button>
              </header>
              <ul class="quotes">
                <li v-for="sentence in ownSentences.slice(0, showAllSentences ? undefined : 2)" :key="sentence.text">„{{ sentence.text }}”</li>
              </ul>
            </section>

            <section class="card">
              <header class="card__head">
                <span>Warto wiedzieć</span>
                <button type="button" class="card__link" :aria-expanded="showAllCards" @click="showAllCards = !showAllCards">{{ showAllCards ? 'Mniej' : 'Wszystkie' }}</button>
              </header>
              <ul class="kn">
                <li v-for="card in cards" :key="card.key">
                  <button type="button" @click="drawerKey = card.key">
                    <AppIcon :name="readCards.includes(card.key) ? 'check' : 'menu_book'" />
                    <strong>{{ card.title }}</strong>
                    <AppIcon name="chevron_right" />
                  </button>
                </li>
              </ul>
            </section>
          </aside>
        </div>
      </div>
    </div>

    <!-- 02 · refleksja tygodnia -->
    <div v-else-if="surface === 'reflection'" class="spv__stage spv__stage--narrow">
      <section class="card rf" aria-label="Ścieżka w refleksji tygodnia">
        <header class="card__head">
          <span>Ścieżka · Ze wstydu do współczucia</span>
          <small>{{ sample === 'start' ? 'Rozpoznać' : 'Spojrzeć inaczej' }} · tydzień {{ weeksLived(sample) }} z 8</small>
        </header>
        <div v-if="sample !== 'start'" class="pr pr--task">
          <strong>{{ chosenTask.title }}</strong>
          <span class="wells"><i v-for="n in chosenTask.times" :key="n" class="well well--sm" :class="{ 'well--done': n <= chosenTask.done }" /></span>
        </div>
        <ShameMomentsGlance :stats="reflectionStats" compact />
        <div class="rf__questions">
          <section class="fld">
            <header class="fld__head">Były momenty, których nie zapisałeś?</header>
            <div class="chips">
              <button v-for="choice in [{ key: 'none', label: 'żaden' }, { key: 'few', label: '1–2' }, { key: 'several', label: '3–5' }, { key: 'many', label: 'więcej' }]" :key="choice.key" type="button" class="chip" :class="{ 'is-active': unlogged === choice.key }" :aria-pressed="unlogged === choice.key" @click="unlogged = unlogged === choice.key ? null : choice.key">{{ choice.label }}</button>
            </div>
          </section>
          <section class="fld">
            <header class="fld__head">Jak mocno wstyd dawał o sobie znać?</header>
            <div class="scale" role="radiogroup" aria-label="Nasilenie wstydu w tym tygodniu">
              <button v-for="n in 5" :key="n" type="button" class="scale__btn" :class="{ 'is-active': severity === n }" :aria-pressed="severity === n" :title="n === 1 ? 'ledwo' : n === 5 ? 'bardzo mocno' : undefined" @click="severity = severity === n ? null : n">{{ n }}</button>
            </div>
          </section>
        </div>
        <label class="rf__question">
          <span>{{ pathCopy.phases.w4.question }}</span>
          <textarea v-model="reflection" rows="3" />
        </label>
        <footer class="rf__foot">
          <button type="button" class="btn-primary" @click="notice = 'Odpowiedzi zachowane w pamięci Labu.'">Dalej</button>
        </footer>
      </section>
    </div>

    <!-- 03 · pole w Dzisiaj -->
    <div v-else class="spv__stage spv__stage--today">
      <section class="td" aria-label="Ścieżki">
        <header class="td__head">Ścieżki</header>
        <button type="button" class="td__row td__row--path" @click="setQuery('surface', 'dashboard')">
          <span class="td__lead"><AppIcon name="mg-exercise-compassionate-image" /></span>
          <span class="td__copy"><strong>Ze wstydu do współczucia</strong><small>{{ closed ? 'Powrót 27 grudnia' : `tydzień ${currentWeek + 1} z 8` }}{{ sample === 'paused' ? ' · wstrzymana' : '' }}</small></span>
          <AppIcon name="chevron_right" />
        </button>
        <div v-if="!closed || sample === 'return'" class="td__row">
          <span class="td__lead td__lead--sub"><AppIcon :name="`mg-exercise-${nextStep.slug}`" /></span>
          <span class="td__copy"><strong>{{ nextStep.title }}</strong><small>{{ sample === 'paused' ? 'po wznowieniu' : sample === 'return' ? '27 grudnia' : 'jutro' }}</small></span>
          <button v-if="sample !== 'paused'" type="button" class="chip" @click="simulate(nextStep.title)">Otwórz</button>
        </div>
        <div v-if="!closed && sample !== 'paused' && sample !== 'start'" class="td__row">
          <span class="td__lead td__lead--sub"><AppIcon name="mg-exercise-self-compassion-break" /></span>
          <span class="td__copy"><strong>Przerwa na współczucie</strong><small>na dziś</small></span>
          <i class="well" aria-label="Nie wykonano" />
        </div>
        <div class="td__actions">
          <button type="button" class="chip" @click="simulate('Zapisz moment')"><AppIcon name="add" />Zapisz moment</button>
          <button v-if="sample !== 'start'" type="button" class="chip" @click="openResponse"><AppIcon name="mg-exercise-shame-response" />Mój plan</button>
        </div>
      </section>
    </div>

    <!-- 04 · decyzje -->
    <section class="spv__block">
      <header class="spv__block-head">
        <span class="lab-eyebrow">04 · Co zmieniło się po rundzie 4</span>
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
.spv { min-width: 0; padding-bottom: 40px; color: var(--mg-color-ink); }
.spv__toolbar { display: flex; flex-wrap: wrap; align-items: center; gap: 14px; margin-bottom: 18px; padding: 12px 14px; border: 1px solid var(--mg-color-border); border-radius: var(--mg-radius-lg); background: var(--mg-color-mist); }
.spv__tabs { display: inline-flex; gap: 4px; padding: 4px; border-radius: 18px 15px 19px 16px; background: var(--mg-color-surface); box-shadow: var(--mg-shadow-inset-sm); }
.spv__tabs button { min-height: 34px; padding: 0 14px; border: 1px solid transparent; border-radius: var(--mg-radius-sm); background: transparent; color: var(--mg-color-muted); font: inherit; font-size: 12px; font-weight: 800; cursor: pointer; }
.spv__tabs button[aria-selected='true'] { border-color: var(--mg-color-border); background: var(--mg-color-paper); color: var(--mg-color-primary-strong); }
.spv__select { display: inline-flex; align-items: center; gap: 8px; color: var(--mg-color-muted); font-size: 10px; font-weight: 800; letter-spacing: 0.04em; text-transform: uppercase; }
.spv__select select { min-height: 34px; padding: 6px 28px 6px 10px; border: 1px solid var(--mg-color-field-border); border-radius: var(--mg-radius-sm); background: var(--mg-color-paper); color: var(--mg-color-ink); font: inherit; font-size: 12px; letter-spacing: 0; text-transform: none; }
.spv__reset { min-height: 34px; margin-left: auto; padding: 0 12px; border: 1px solid var(--mg-color-border); border-radius: var(--mg-radius-sm); background: var(--mg-color-paper); color: var(--mg-color-primary-strong); font: inherit; font-size: 11px; font-weight: 800; cursor: pointer; }
.spv__stage { padding: 24px 22px 30px; border: 1px solid var(--mg-color-border); border-radius: var(--mg-radius-xl); background: var(--mg-color-canvas); }
.spv__stage--narrow { display: grid; justify-content: center; }
.spv__stage--narrow > .card { width: min(1080px, 100%); }
.spv__stage--today { display: grid; justify-items: center; padding-block: 40px; }
.spv__block { margin-top: 30px; }
.spv__block-head { margin-bottom: 14px; }
.spv__block-head h2 { margin: 6px 0 0; font-size: 20px; line-height: 1.2; }
.spv__decisions { display: grid; gap: 8px; margin: 0; padding: 0; list-style: none; }
.spv__decisions li { display: grid; grid-template-columns: 40px 1fr; gap: 12px; padding: 12px 14px; border: 1px solid var(--mg-color-border); border-radius: var(--mg-radius-md); background: var(--mg-color-mist); }
.spv__decision-id { color: var(--mg-color-primary-strong); font-size: 12px; font-weight: 900; }
.spv__decisions strong { display: block; font-size: 13px; }
.spv__decisions p { margin: 4px 0 0; color: var(--mg-color-muted); font-size: 12px; line-height: 1.5; }
.spv__notice { position: fixed; bottom: 20px; left: 50%; z-index: 8; display: flex; align-items: center; gap: 14px; max-width: 600px; margin: 0; padding: 12px 12px 12px 18px; border: 1px solid var(--mg-color-border); border-radius: var(--mg-radius-md); background: var(--mg-color-paper); box-shadow: var(--mg-shadow-raised); font-size: 12px; transform: translateX(-50%); }

/* ── Product vocabulary ── */
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
.pv__grid { display: grid; grid-template-columns: minmax(0, 1.2fr) minmax(330px, 1fr); gap: var(--mg-space-5); align-items: start; }
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
.btn-primary { display: inline-flex; align-items: center; justify-content: center; gap: var(--mg-space-2); min-height: 2.25rem; padding: 0 var(--mg-space-4); border: 1px solid transparent; border-radius: var(--mg-radius-md); background: var(--mg-color-primary-fill); color: var(--mg-color-on-primary); font: inherit; font-size: var(--mg-font-size-sm); font-weight: 800; white-space: nowrap; cursor: pointer; }
.btn-primary:hover { background: var(--mg-color-primary-fill-hover); }

.well { position: relative; display: grid; place-items: center; flex: 0 0 auto; width: var(--well, 1.85rem); height: var(--well, 1.85rem); border: 1px solid var(--mg-color-border); border-radius: var(--mg-radius-organic-a); background: var(--mg-color-canvas); box-shadow: var(--mg-shadow-inset-sm); color: var(--mg-color-muted); font-size: var(--mg-font-size-xs); font-weight: 800; font-style: normal; }
.well--sm { --well: 1.3rem; }
.well--done { border-color: transparent; background: var(--mg-color-sky-field); }
.well--done::after { width: 62%; aspect-ratio: 1; border-radius: var(--mg-radius-organic-c); background: var(--mg-color-primary-fill); content: ''; transform: rotate(-2deg); }
.well--current { border-color: var(--mg-color-primary); color: var(--mg-color-primary-strong); box-shadow: var(--mg-shadow-inset-sm), 0 0 0 3px var(--mg-color-primary-soft); }
.well--today { border-color: var(--mg-color-primary); }
.well :deep(.app-icon) { font-size: var(--mg-font-size-sm); }
.wells { display: inline-flex; gap: 4px; }
.mark { display: inline-grid; place-items: center; width: 0.6rem; height: 0.6rem; border: 1px solid var(--mg-color-border); border-radius: var(--mg-radius-organic-b); background: var(--mg-color-canvas); }
.mark:nth-child(even) { border-radius: var(--mg-radius-organic-c); }
.mark--done { border-color: transparent; background: var(--mg-color-primary-fill); }
.mark--current { border-color: var(--mg-color-primary); box-shadow: 0 0 0 2px var(--mg-color-primary-soft); }
.mark--lg { width: 1.3rem; height: 1.3rem; color: var(--mg-color-on-primary); box-shadow: var(--mg-shadow-inset-sm); }
.mark--lg.mark--done { background: var(--mg-color-sky-field); color: var(--mg-color-primary-strong); box-shadow: none; }
.mark--lg :deep(.app-icon) { font-size: 0.8rem; }

/* week rows */
.pv__journey { display: grid; gap: 2px; }
.pv__journey > .card__head { margin-bottom: var(--mg-space-2); }
.wk { border-radius: var(--mg-radius-sm); transition: background var(--mg-duration-fast) var(--mg-ease-standard); }
.wk:hover { background: var(--mg-color-mist); }
.wk--open, .wk--open:hover { background: var(--mg-color-paper); }
.wk--return { margin-top: var(--mg-space-2); padding-top: var(--mg-space-2); border-top: 1.5px dashed color-mix(in srgb, var(--mg-color-muted) 38%, transparent); border-radius: 0 0 var(--mg-radius-sm) var(--mg-radius-sm); }
.wk__row { display: grid; grid-template-columns: auto minmax(0, 1fr) auto 18px; gap: var(--mg-space-2); align-items: center; width: 100%; min-height: 2.9rem; padding: var(--mg-space-1) var(--mg-space-2); border: 0; background: transparent; color: inherit; font: inherit; text-align: left; cursor: pointer; }
.wk__title { font-size: var(--mg-font-size-md); font-weight: 700; line-height: 1.3; }
.wk--later .wk__title { color: color-mix(in srgb, var(--mg-color-ink) 70%, var(--mg-color-muted)); font-weight: 600; }
.wk--current .wk__title { font-weight: 800; }
.wk__marks { display: inline-flex; gap: 4px; }
.wk__chevron { color: var(--mg-color-primary-strong); font-size: 18px; }
.wk__body { display: grid; gap: var(--mg-space-2); padding: 0 var(--mg-space-2) var(--mg-space-3) calc(1.85rem + var(--mg-space-2) * 2); }
.wk__why { margin: 0 0 var(--mg-space-1); color: var(--mg-color-muted); font-size: var(--mg-font-size-sm); line-height: 1.5; }
.steps { display: grid; gap: 2px; margin: 0 0 var(--mg-space-1); padding: 0; list-style: none; }
.st { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; gap: var(--mg-space-2); align-items: center; min-height: 2.3rem; }
.st__copy { display: flex; flex-wrap: wrap; align-items: baseline; gap: 2px 8px; min-width: 0; }
.st__copy strong { font-size: var(--mg-font-size-sm); font-weight: 700; }
.st--current .st__copy strong { color: var(--mg-color-primary-strong); font-weight: 800; }
.st--later .st__copy strong { color: color-mix(in srgb, var(--mg-color-ink) 75%, var(--mg-color-muted)); font-weight: 600; }
.st__copy small { color: var(--mg-color-muted); font-size: var(--mg-font-size-xs); font-weight: 600; }

.row { border-top: 1.5px dashed color-mix(in srgb, var(--mg-color-muted) 30%, transparent); }
.row__head { display: grid; grid-template-columns: 6.5rem minmax(0, 1fr) auto 18px; gap: var(--mg-space-2); align-items: center; min-height: 2.4rem; padding: var(--mg-space-1) 0; cursor: pointer; list-style: none; }
.row__head::-webkit-details-marker { display: none; }
.row__head > :deep(.app-icon) { color: var(--mg-color-primary-strong); font-size: 18px; transition: transform var(--mg-duration-fast) var(--mg-ease-standard); }
.row[open] > .row__head > :deep(.app-icon) { transform: rotate(180deg); }
.row__eyebrow { color: var(--mg-color-primary-strong); font-size: 0.66rem; font-weight: 900; letter-spacing: 0.1em; text-transform: uppercase; }
.row__text { min-width: 0; overflow: hidden; font-size: var(--mg-font-size-sm); font-weight: 700; text-overflow: ellipsis; white-space: nowrap; }
.row__text small { color: var(--mg-color-muted); font-size: var(--mg-font-size-xs); font-weight: 700; }
.row__body { display: grid; gap: var(--mg-space-1); padding: 0 0 var(--mg-space-3) 6.5rem; }
.pr { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; gap: var(--mg-space-2); align-items: center; min-height: 2rem; }
.pr > :deep(.app-icon) { font-size: 18px; color: var(--mg-color-primary-strong); }
.pr strong { font-size: var(--mg-font-size-sm); font-weight: 700; }
.pr small { margin-left: 6px; color: var(--mg-color-muted); font-size: var(--mg-font-size-xs); font-weight: 700; }
.pr--now { margin-top: var(--mg-space-3); padding-top: var(--mg-space-3); border-top: 1.5px dashed color-mix(in srgb, var(--mg-color-muted) 38%, transparent); }
.pr--task { grid-template-columns: minmax(0, 1fr) auto; margin-bottom: var(--mg-space-4); padding: var(--mg-space-2) var(--mg-space-3); border: 1px solid var(--mg-color-border); border-radius: var(--mg-radius-md); background: var(--mg-color-mist); }
.days { display: flex; gap: 6px; margin-top: var(--mg-space-1); }
.days__day { display: grid; justify-items: center; gap: 3px; }
.days__day small { color: var(--mg-color-muted); font-size: 0.66rem; font-weight: 700; line-height: 1; }
.opt { position: relative; display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: var(--mg-space-2); align-items: center; padding: var(--mg-space-1) var(--mg-space-2); border-radius: var(--mg-radius-sm); cursor: pointer; }
.opt:hover, .opt.is-selected { background: var(--mg-color-mist); }
.opt input { position: absolute; inset: 0; margin: 0; opacity: 0; cursor: inherit; }
.opt strong { font-size: var(--mg-font-size-sm); font-weight: 700; }
.pv__closed { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; gap: var(--mg-space-3); align-items: center; margin-top: var(--mg-space-3); padding: var(--mg-space-3); border: 1px solid var(--mg-color-border); border-radius: var(--mg-radius-md); background: var(--mg-color-mist); }
.pv__closed > :deep(.app-icon) { font-size: 24px; color: var(--mg-color-primary-strong); }
.pv__closed strong { font-size: var(--mg-font-size-sm); }

/* now · progress */
.now { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; gap: var(--mg-space-3); align-items: center; }
.now__icon { display: grid; place-items: center; width: 2.6rem; height: 2.6rem; border-radius: var(--mg-radius-icon-field-b); background: var(--mg-color-sky-well); color: var(--mg-color-primary-strong); }
.now__icon :deep(.app-icon) { font-size: 24px; }
.now__copy { display: grid; gap: 2px; min-width: 0; }
.now__copy strong { font-size: var(--mg-font-size-md); font-weight: 800; line-height: 1.3; }
.now__copy small { color: var(--mg-color-muted); font-size: var(--mg-font-size-xs); font-weight: 700; }
.quote { display: grid; gap: var(--mg-space-2); margin-top: var(--mg-space-3); padding: var(--mg-space-3); border: 1px solid var(--mg-color-border); border-radius: var(--mg-radius-md); background: var(--mg-color-mist); }
.quote p { margin: 0; font-size: var(--mg-font-size-sm); line-height: 1.5; }
.quote em { font-style: normal; font-weight: 700; }
.quote .chip { justify-self: start; }
.measure { display: grid; gap: 6px; margin-top: var(--mg-space-4); padding-top: var(--mg-space-3); border-top: 1.5px dashed color-mix(in srgb, var(--mg-color-muted) 38%, transparent); }
.measure__head { display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 2px; }
.measure__title { font-size: var(--mg-font-size-xs); font-weight: 800; }
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
.kn { display: grid; gap: 2px; margin: 0; padding: 0; list-style: none; }
.kn button { display: grid; grid-template-columns: 18px minmax(0, 1fr) 18px; gap: var(--mg-space-2); align-items: center; width: 100%; min-height: 2.2rem; padding: var(--mg-space-1) var(--mg-space-2); border: 0; border-radius: var(--mg-radius-sm); background: transparent; color: inherit; font: inherit; text-align: left; cursor: pointer; }
.kn button:hover { background: var(--mg-color-mist); }
.kn :deep(.app-icon) { font-size: 18px; color: var(--mg-color-primary-strong); }
.kn strong { font-size: var(--mg-font-size-sm); font-weight: 700; }

/* reflection */
.rf__questions { display: grid; grid-template-columns: 1.2fr 1fr; gap: var(--mg-space-3); margin-top: var(--mg-space-4); }
.fld { display: grid; gap: var(--mg-space-2); padding: var(--mg-space-3); border: 1px solid var(--mg-color-border); border-radius: var(--mg-radius-md); background: var(--mg-color-mist); }
.fld .chips { margin-top: 0; }
.fld__head { color: var(--mg-color-ink); font-size: var(--mg-font-size-sm); font-weight: 800; }
.scale { display: flex; gap: 8px; }
.scale__btn { display: grid; place-items: center; width: 2.25rem; height: 2.25rem; border: 1px solid var(--mg-color-border); border-radius: var(--mg-radius-organic-a); background: var(--mg-color-canvas); box-shadow: var(--mg-shadow-inset-sm); color: var(--mg-color-muted); font: inherit; font-size: var(--mg-font-size-sm); font-weight: 800; cursor: pointer; }
.scale__btn:nth-child(even) { border-radius: var(--mg-radius-organic-b); }
.scale__btn:hover { background: var(--mg-color-paper); }
.scale__btn.is-active { border-color: transparent; background: var(--mg-color-sky-field); color: var(--mg-color-primary-strong); box-shadow: none; }
.rf__question { display: grid; gap: var(--mg-space-2); margin-top: var(--mg-space-4); font-size: var(--mg-font-size-sm); font-weight: 700; }
.rf__question textarea { width: 100%; padding: var(--mg-space-3); border: 1px solid var(--mg-color-field-border); border-radius: var(--mg-radius-md); background: var(--mg-color-paper); color: var(--mg-color-ink); font: inherit; font-size: var(--mg-font-size-sm); font-weight: 500; resize: vertical; }
.rf__question textarea:focus-visible { outline: 0; box-shadow: var(--mg-shadow-inset-sm), var(--mg-focus-ring); }
.rf__foot { display: flex; justify-content: flex-end; margin-top: var(--mg-space-4); }

/* today group */
.td { display: grid; gap: 2px; width: min(440px, 100%); padding: var(--mg-space-2); border: 1px solid var(--mg-color-border); border-radius: var(--mg-radius-md); background: var(--mg-color-paper); font-family: var(--mg-font-sans); }
.td__head { padding: var(--mg-space-1) var(--mg-space-2); color: var(--mg-color-primary-strong); font-size: var(--mg-font-size-xs); font-weight: 900; letter-spacing: 0.1em; text-transform: uppercase; }
.td__row { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; gap: var(--mg-space-2); align-items: center; min-height: 2.6rem; padding: var(--mg-space-1) var(--mg-space-2); border: 0; border-radius: var(--mg-radius-sm); background: transparent; color: inherit; font: inherit; text-align: left; }
.td__row--path { cursor: pointer; }
.td__row--path:hover { background: var(--mg-color-mist); }
.td__row--path > :deep(.app-icon) { color: var(--mg-color-primary-strong); }
.td__lead { display: grid; place-items: center; width: 1.85rem; height: 1.85rem; border-radius: var(--mg-radius-icon-field-a); background: var(--mg-color-sky-field); color: var(--mg-color-primary-strong); }
.td__lead--sub { background: var(--mg-color-sky-well); }
.td__lead :deep(.app-icon) { font-size: var(--mg-font-size-md); }
.td__copy { display: grid; gap: 1px; min-width: 0; }
.td__copy strong { font-size: var(--mg-font-size-sm); font-weight: 700; }
.td__row--path .td__copy strong { font-size: var(--mg-font-size-md); }
.td__copy small { color: var(--mg-color-muted); font-size: var(--mg-font-size-xs); font-weight: 700; }
.td__actions { display: flex; gap: 6px; padding: var(--mg-space-2) var(--mg-space-2) var(--mg-space-1); }

/* drawer */
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
.spv :focus-visible, .drawer :focus-visible { outline: 2px solid var(--mg-color-focus); outline-offset: 2px; }

@media (max-width: 1180px) {
  .pv__grid { grid-template-columns: 1fr; }
  .pv__side { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
@media (max-width: 900px) {
  .pv__side, .rf__questions { grid-template-columns: 1fr; }
  .wk__marks { display: none; }
  .row__head { grid-template-columns: minmax(0, 1fr) auto 18px; }
  .row__eyebrow { display: none; }
  .row__body { padding-left: 0; }
}
@media (prefers-reduced-motion: reduce) {
  .spv * { transition: none; }
}
</style>
