<template>
  <section class="scenario-page concept-page tre mg-design-v2">
    <header class="concept-heading">
      <div>
        <span class="lab-eyebrow">Eksperyment · Dzisiaj · rozwinięty wiersz planu dnia</span>
        <h1>Historia siedmiu dni kończy się w polu wykonania</h1>
        <p>
          Po rozwinięciu wiersza dysk „dziś” zjeżdża niżej i staje się siódmym, jedynym klikalnym punktem wstęgi
          ostatnich dni. Akcje układają się w jeden rząd pod tytułem, a cała prawa strona należy do wykresu. Rozwinięcie jest jednym ruchem: ikony z tacki lecą w lewo i zyskują podpisy, dysk zjeżdża, kropki wysuwają się z niego.
          Klik w wiersz rozwija go, klik w dysk zapisuje wykonanie. Stan żyje w pamięci strony.
        </p>
      </div>
      <span class="status-badge status-badge--experiment">Propozycja do oceny</span>
    </header>

    <!-- 01 · Stan obecny -->
    <section class="tre__block">
      <header class="tre__block-head">
        <span class="lab-eyebrow">01 · Stan obecny</span>
        <h2>Cztery elementy, każdy w innym rogu</h2>
      </header>
      <div class="tre__evidence">
        <nav class="tre__findings" aria-label="Znaleziska">
          <button v-for="finding in findings" :key="finding.id" type="button" :class="{ active: activeFinding.id === finding.id }" @click="findingId = finding.id">
            <span class="tre__finding-index">{{ finding.id }}</span>
            <span><strong>{{ finding.title }}</strong><small>{{ finding.where }}</small></span>
          </button>
        </nav>
        <figure class="tre__shot">
          <div class="tre__shot-frame"><img src="/research/current/today/row-expanded-meditation.png" alt="Rozwinięty wiersz Medytacja w widoku Dzisiaj, stan z 26 września 2026" /></div>
          <figcaption>
            <strong>{{ activeFinding.title }}</strong>
            <p>{{ activeFinding.body }}</p>
            <p class="tre__fix"><AppIcon name="arrow_forward" /> {{ activeFinding.fix }}</p>
          </figcaption>
        </figure>
      </div>
    </section>

    <!-- 02 · Scena -->
    <section class="tre__block">
      <header class="tre__block-head">
        <span class="lab-eyebrow">02 · Propozycja w kontekście listy</span>
        <h2>Rozwiń wiersz i obejrzyj przejście, zmień tryb wpisu i gęstość wstęgi</h2>
      </header>

      <div class="tre__toolbar neo-card" aria-label="Scenariusz wiersza">
        <label>Tryb wpisu
          <select v-model="mode">
            <option value="completion">Wykonanie</option>
            <option value="multi">Checklista</option>
            <option value="counter">Licznik</option>
            <option value="rating">Ocena 1–5</option>
            <option value="value">Wartość</option>
          </select>
        </label>
        <label>Wstęga
          <select v-model="density">
            <option value="compact">Zwarta · pola 2,2 rem, kropki 1,85 rem</option>
            <option value="equal">Równa · pola 2,5 rem, kropki jak dysk</option>
            <option value="loose">Luźna · pola 3,2 rem, kropki jak dysk</option>
            <option value="wide">Szeroka · pola 4 rem, kropki jak dysk</option>
          </select>
        </label>
        <label class="tre__check"><input v-model="longTitle" type="checkbox" /> Długi tytuł</label>
        <label class="tre__check"><input v-model="showMissed" type="checkbox" /> Dni nieudane na różowo</label>
        <button class="tre__reset" type="button" @click="resetAll">Przywróć przykład</button>
      </div>

      <div class="tre__stage-wrap">
        <div class="tre__stage">
          <section class="tre-rail">
            <span class="tre-rail__filament" aria-hidden="true"><i :style="{ width: `${progressPct}%` }" /></span>
            <header class="tre-rail__heading"><span>Plan dnia</span><small>sobota, 26 września</small></header>

            <section v-for="group in groups" :key="group.id" class="tre-rail__group">
              <header><span>{{ group.label }}</span></header>
              <article
                v-for="row in group.rows"
                :key="row.id"
                :ref="el => setRowEl(row.id, el as HTMLElement | null)"
                class="tre-row"
                :class="{ 'tre-row--staged': staged === row.id, 'tre-row--settling': settling.has(row.id), [`tre-row--${rowMode(row)}`]: true, [`tre-row--density-${density}`]: true }"
                @click="toggleStage(row.id)"
              >
                <!-- Title line: icon + title; the disc lives here only while collapsed. -->
                <div class="tre-row__main">
                  <span class="tre-row__lead" :class="{ 'tre-row__lead--active': hasEntry(row) }" aria-hidden="true"><AppIcon :name="row.icon" /></span>
                  <div class="tre-row__title">
                    <button type="button" class="tre-row__label" :aria-pressed="staged === row.id" @click.stop="toggleStage(row.id)">
                      <strong>{{ rowTitle(row) }}</strong>
                    </button>
                    <!-- Collapsed row: icon tray on hover, exactly as in the product (ndi__tray). -->
                    <span v-if="staged !== row.id" class="tre-row__tray" role="group" :aria-label="`Akcje: ${rowTitle(row)}`" @click.stop>
                      <button v-for="action in ACTIONS" :key="action.id" type="button" :data-flip="action.id" :title="action.title" :aria-label="action.title"><AppIcon :name="action.icon" /></button>
                    </span>
                  </div>
                  <div v-if="staged !== row.id" class="tre-row__entry" @click.stop>
                    <TodayEntryDisc :row="row" :mode="rowMode(row)" data-flip="disc" @toggle="toggleDone(row)" @step="step(row, $event)" @multi="toggleMulti(row, $event)" />
                  </div>
                </div>

                <!-- Expansion: actions and strip are direct grid children of the row (areas
                     'main strip' / 'actions strip'), so the strip spans both rows and centres
                     against the whole row. The transition is one motion: tray icons FLIP into
                     the labelled buttons, the disc FLIPs down onto the strip axis, and the six
                     history dots fan out of the disc to the left (reverse on collapse). -->
                <div v-if="staged === row.id" class="tre-row__actions" role="group" :aria-label="`Akcje: ${rowTitle(row)}`" @click.stop>
                  <button v-for="action in ACTIONS" :key="action.id" type="button" :data-flip="action.id"><AppIcon :name="action.icon" /><span>{{ action.label }}</span></button>
                </div>
                <Transition name="tre-strip">
                  <div v-if="staged === row.id" class="tre-strip" role="group" :aria-label="`Ostatnie 7 dni: ${rowTitle(row)}`" @click.stop>
                    <span v-for="(day, index) in pastDays(row)" :key="day.key" class="tre-strip__day" :style="{ '--idx': index }" :title="day.full">
                      <i
                        class="tre-strip__dot"
                        :class="[`is-${day.state}`, { 'tre-strip__dot--b': index % 2 === 1 }]"
                        :style="day.fill !== undefined ? { '--fill': `${day.fill}%` } : undefined"
                      >
                        <b v-if="day.reading !== undefined">{{ day.reading }}</b>
                      </i>
                      <small>{{ day.initial }}</small>
                    </span>
                    <span class="tre-strip__day tre-strip__day--today">
                      <TodayEntryDisc :row="row" :mode="rowMode(row)" data-flip="disc" @toggle="toggleDone(row)" @step="step(row, $event)" @multi="toggleMulti(row, $event)" />
                      <small>s</small>
                    </span>
                  </div>
                </Transition>
              </article>
            </section>
          </section>
        </div>
        <aside class="tre__legend">
          <strong>Co sprawdzić</strong>
          <ol>
            <li>Czy dysk „dziś” po rozwinięciu nadal czyta się jako ta sama kontrolka, tylko niżej.</li>
            <li>Czy przejście czyta się jako jeden ruch: ikony w lewo, dysk w dół, kropki w lewo. Zwiń i rozwiń kilka razy.</li>
            <li>Jak szeroka może być wstęga, zanim znów zacznie czytać się jako pustka (przełącznik Wstęga).</li>
            <li>Czy jednoliterowe inicjały wystarczą bez etykiety „Ostatnie 7 dni”.</li>
            <li>Czy w trybach liczbowych (licznik, ocena, wartość) słupki i dysk tworzą jedną linię.</li>
            <li>Czy wysokość rozwiniętego wiersza jest znośna, gdy rozwinięte są dwa wiersze na raz (nie da się — jeden naraz, jak w produkcie).</li>
          </ol>
        </aside>
      </div>
    </section>

    <!-- 03 · Decyzje -->
    <section class="tre__block">
      <header class="tre__block-head">
        <span class="lab-eyebrow">03 · Decyzje do potwierdzenia</span>
        <h2>Co zmienia się względem produktu</h2>
      </header>
      <ol class="tre__decisions">
        <li v-for="decision in decisions" :key="decision.id">
          <span class="tre__decision-id">{{ decision.id }}</span>
          <span><strong>{{ decision.title }}</strong><p>{{ decision.body }}</p></span>
        </li>
      </ol>
    </section>
  </section>
</template>

<script setup lang="ts">
import { computed, defineComponent, h, nextTick, ref, type PropType } from 'vue'
import AppIcon from '@product/components/shared/AppIcon.vue'

// ---------------------------------------------------------------------------
// Sample: today = Saturday 26 wrz 2026, the day on the user's screenshot.
type EntryMode = 'completion' | 'multi' | 'counter' | 'rating' | 'value'
type Density = 'compact' | 'equal' | 'loose' | 'wide'

interface Row {
  id: string
  icon: string
  title: string
  longTitle: string
  /** Row's own entry mode; the toolbar overrides only the first row. */
  mode: EntryMode
  /** Past six days, Sunday → Friday. Completion: 0/1; numeric: raw value; undefined = no entry. */
  history: (number | undefined)[]
  /** Which past days were assigned (missed = assigned and not done). */
  assigned: boolean[]
  done: boolean
  value: number | undefined
  multi: string[]
  multiChecked: Set<string>
  target?: number
  ratingMax?: number
}

const DAY_INITIALS = ['n', 'p', 'w', 'ś', 'c', 'p']
const DAY_FULL = ['niedziela 20 wrz', 'poniedziałek 21 wrz', 'wtorek 22 wrz', 'środa 23 wrz', 'czwartek 24 wrz', 'piątek 25 wrz']

function makeRows(): Row[] {
  return [
    {
      id: 'meditation', icon: 'silent-meditation', title: 'Medytacja', longTitle: 'Medytacja uważności z rana, zanim otworzę telefon i zacznę planować dzień',
      mode: 'completion', history: [0, 0, 1, 0, 0, 1], assigned: [true, true, true, true, true, true], done: true, value: undefined,
      multi: ['Oddech', 'Skan ciała', 'Intencja'], multiChecked: new Set(['Oddech']), target: 20, ratingMax: 5,
    },
    {
      id: 'walk', icon: 'walk', title: 'Spacer', longTitle: 'Spacer',
      mode: 'completion', history: [1, 1, 0, 1, undefined, 1], assigned: [true, true, true, true, false, true], done: false, value: undefined,
      multi: [], multiChecked: new Set(), target: undefined,
    },
    {
      id: 'water', icon: 'water', title: 'Woda', longTitle: 'Woda',
      mode: 'counter', history: [6, 8, 5, 7, 4, 8], assigned: [true, true, true, true, true, true], done: false, value: 3,
      multi: [], multiChecked: new Set(), target: 8,
    },
  ]
}

const rows = ref<Row[]>(makeRows())
const staged = ref<string | null>('meditation')
const mode = ref<EntryMode>('completion')
const density = ref<Density>('loose')
const longTitle = ref(false)
const showMissed = ref(false)

const groups = computed(() => [
  { id: 'habits', label: 'Nawyki', rows: rows.value.slice(0, 2) },
  { id: 'trackers', label: 'Trackery', rows: rows.value.slice(2) },
])

/** The first row follows the toolbar; the others keep their own mode so the list stays mixed. */
function rowMode(row: Row): EntryMode { return row.id === 'meditation' ? mode.value : row.mode }
function rowTitle(row: Row): string { return longTitle.value ? row.longTitle : row.title }

function hasEntry(row: Row): boolean {
  const m = rowMode(row)
  if (m === 'completion') return row.done
  if (m === 'multi') return row.multiChecked.size > 0
  return row.value !== undefined
}

const progressPct = computed(() => {
  const all = rows.value
  const done = all.filter(row => rowMode(row) === 'completion' ? row.done : hasEntry(row)).length
  return Math.round((done / all.length) * 100)
})

const ACTIONS = [
  { id: 'a-tomorrow', icon: 'east', label: 'Jutro', title: 'Na jutro' },
  { id: 'a-day', icon: 'calendar_month', label: 'Dzień', title: 'Wybierz dzień' },
  { id: 'a-hide', icon: 'visibility_off', label: 'Ukryj', title: 'Ukryj na dziś' },
  { id: 'a-open', icon: 'open_in_new', label: 'Otwórz', title: 'Otwórz' },
]

// FLIP: every element with data-flip (four actions + the disc) is measured before the
// state change and animated from its old box to its new one after the DOM settles.
// Tray icon → labelled button and title-row disc → strip disc are different nodes with
// the same key, so this is exactly the "icons travel left and grow labels" motion.
const FLIP_MS = 300
const FLIP_EASE = 'cubic-bezier(.2, .7, .2, 1)'
const rowEls = new Map<string, HTMLElement>()
const settling = ref(new Set<string>())
function setRowEl(id: string, el: HTMLElement | null) { el ? rowEls.set(id, el) : rowEls.delete(id) }
function snapshot(root: HTMLElement | undefined) {
  const map = new Map<string, DOMRect>()
  root?.querySelectorAll<HTMLElement>('[data-flip]').forEach(el => map.set(el.dataset.flip!, el.getBoundingClientRect()))
  return map
}
function reduced() { return window.matchMedia('(prefers-reduced-motion: reduce)').matches }
function flip(root: HTMLElement | undefined, before: Map<string, DOMRect>) {
  if (!root || reduced()) return
  root.querySelectorAll<HTMLElement>('[data-flip]').forEach(el => {
    const from = before.get(el.dataset.flip!)
    if (!from) return
    const to = el.getBoundingClientRect()
    const dx = from.left - to.left
    const dy = from.top - to.top
    if (!dx && !dy) return
    el.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }], { duration: FLIP_MS, easing: FLIP_EASE })
    const label = el.querySelector<HTMLElement>(':scope > span:last-child:not(:first-child)')
    label?.animate([{ opacity: 0, transform: 'translateX(-4px)' }, { opacity: 0, offset: .35 }, { opacity: 1, transform: 'none' }], { duration: FLIP_MS + 80, easing: 'ease-out' })
  })
}
async function toggleStage(id: string) {
  const before = snapshot(rowEls.get(id))
  const previous = staged.value
  staged.value = staged.value === id ? null : id
  await nextTick()
  flip(rowEls.get(id), before)
  // While the labelled buttons fly back into the tray, keep the tray visible.
  if (previous === id) {
    settling.value = new Set([...settling.value, id])
    window.setTimeout(() => { const next = new Set(settling.value); next.delete(id); settling.value = next }, FLIP_MS + 120)
  }
}
function toggleDone(row: Row) { row.done = !row.done }
function step(row: Row, delta: number) {
  const m = rowMode(row)
  const max = m === 'rating' ? (row.ratingMax ?? 5) : Infinity
  const next = Math.max(0, Math.min(max, (row.value ?? 0) + delta))
  row.value = next === 0 && delta < 0 ? undefined : next
}
function toggleMulti(row: Row, item: string) {
  const next = new Set(row.multiChecked)
  next.has(item) ? next.delete(item) : next.add(item)
  row.multiChecked = next
}
function resetAll() {
  rows.value = makeRows()
  staged.value = 'meditation'
  mode.value = 'completion'
  density.value = 'loose'
  longTitle.value = false
  showMissed.value = false
}

// ---------------------------------------------------------------------------
// Past six days for the strip. Numeric modes draw a fill share instead of a blob.
interface PastDay { key: string; initial: string; full: string; state: 'done' | 'empty' | 'missed' | 'partial' | 'reading'; fill?: number; reading?: string }

function pastDays(row: Row): PastDay[] {
  const m = rowMode(row)
  return row.history.map((value, index) => {
    const base = { key: `d${index}`, initial: DAY_INITIALS[index], full: DAY_FULL[index] }
    const missed = showMissed.value && row.assigned[index] && (value === undefined || value === 0)
    if (m === 'completion') {
      return { ...base, state: value ? 'done' : missed ? 'missed' : 'empty' }
    }
    if (m === 'multi') {
      // Sample checklist history: reuse completion history as "all / some / none".
      const share = value === undefined ? undefined : value ? 100 : index % 3 === 0 ? 34 : 0
      if (share === undefined || share === 0) return { ...base, state: missed ? 'missed' : 'empty' }
      return share === 100 ? { ...base, state: 'done' } : { ...base, state: 'partial', fill: share }
    }
    // counter / rating / value: numeric readings from the row's own sample
    const numeric = row.id === 'meditation' ? METRIC_HISTORY[m][index] : value
    if (numeric === undefined) return { ...base, state: missed ? 'missed' : 'empty' }
    const max = m === 'rating' ? (row.ratingMax ?? 5) : Math.max(row.target ?? 1, ...(row.id === 'meditation' ? METRIC_HISTORY[m] : row.history).map(v => v ?? 0))
    return { ...base, state: 'reading', fill: Math.round((numeric / max) * 100), reading: String(numeric) }
  })
}

const METRIC_HISTORY: Record<'counter' | 'rating' | 'value', (number | undefined)[]> = {
  counter: [1, 2, undefined, 3, 1, 2],
  rating: [3, 4, undefined, 2, 5, 4],
  value: [15, 20, undefined, 10, 25, 20],
}

// ---------------------------------------------------------------------------
// The disc: one control for every entry mode, identical to the product's ndi__well
// language. Rendered in the title row while collapsed, inside the strip while expanded.
const TodayEntryDisc = defineComponent({
  name: 'TodayEntryDisc',
  props: {
    row: { type: Object as PropType<Row>, required: true },
    mode: { type: String as PropType<EntryMode>, required: true },
  },
  emits: ['toggle', 'step', 'multi'],
  setup(props, { emit }) {
    const multiOpen = ref(false)
    return () => {
      const row = props.row
      const base = ['tre-well']
      if (props.mode === 'completion') {
        return h('button', {
          type: 'button', class: [...base, 'tre-well--button', { 'tre-well--done': row.done }],
          'aria-pressed': row.done, 'aria-label': row.done ? 'Cofnij wykonanie' : 'Oznacz wykonanie',
          onClick: () => emit('toggle'),
        })
      }
      if (props.mode === 'multi') {
        const checked = row.multiChecked.size
        const all = row.multi.length
        return h('span', {
          class: ['tre-multi', { 'tre-multi--open': multiOpen.value }],
          onMouseenter: () => { multiOpen.value = true }, onMouseleave: () => { multiOpen.value = false },
        }, multiOpen.value
          ? row.multi.map(item => h('button', {
              type: 'button', key: item, class: ['tre-well', 'tre-well--button', 'tre-well--dot', { 'tre-well--done': row.multiChecked.has(item) }],
              'aria-pressed': row.multiChecked.has(item), 'aria-label': item, title: item,
              onClick: () => emit('multi', item),
            }, h('span', { class: 'tre-well__initial' }, item[0])))
          : [h('button', {
              type: 'button', class: [...base, 'tre-well--button', 'tre-well--fraction', { 'tre-well--on': checked > 0, 'tre-well--met': checked === all }],
              'aria-label': `Pokaż checklistę: ${checked}/${all}`,
              onClick: () => { multiOpen.value = true },
            }, h('span', { class: 'tre-well__reading' }, [h('b', checked), h('i', `/${all}`)]))])
      }
      const value = row.value
      const isRating = props.mode === 'rating'
      const max = row.ratingMax ?? 5
      const fill = isRating && value !== undefined ? `${(value / max) * 100}%` : '0%'
      return h('span', { class: 'tre-stepper' }, [
        h('button', { type: 'button', class: 'tre-step tre-step--plus', 'aria-label': 'Więcej', disabled: isRating && (value ?? 0) >= max, onClick: () => emit('step', 1) }, h(AppIcon, { name: 'add' })),
        h('button', { type: 'button', class: 'tre-step tre-step--minus', 'aria-label': 'Mniej', disabled: value === undefined, onClick: () => emit('step', -1) }, h(AppIcon, { name: 'remove' })),
        h('span', {
          class: [...base, { 'tre-well--on': value !== undefined, 'tre-well--meter': isRating }],
          style: isRating ? { '--fill': fill } : undefined,
        }, h('span', { class: 'tre-well__reading' }, isRating ? [h('b', value ?? 0), h('i', `/${max}`)] : [h('b', value ?? 0)])),
      ])
    }
  },
})

// ---------------------------------------------------------------------------
// Findings and decisions
const findings = [
  { id: 1, title: 'Wykres rozciągnięty na całą szerokość', where: 'Rozwinięcie · 7 kropek na ~1400 px', body: 'W układzie Dzisiaj rozwinięcie jest jednokolumnowe, a karta wykresu dostaje max-width: none. Siedem kropek rozjeżdża się po całym wierszu i czyta się jako pusta przestrzeń, nie jako wykres.', fix: 'Wstęga ma stałą szerokość: siedem pól po ~2 rem, wyrównana do prawej krawędzi.' },
  { id: 2, title: 'Stan „dziś” pokazany dwa razy', where: 'Duży dysk u góry po prawej i kropka SOB. w wykresie', body: 'Ta sama informacja w dwóch rozmiarach i dwóch miejscach. Oko musi je pogodzić, a dysk wisi samotnie nad pustką.', fix: 'Dysk staje się siódmym punktem wstęgi: historia kończy się w kontrolce.' },
  { id: 3, title: 'Przyciski w czwartym rogu', where: 'Pod wykresem, dosunięte do prawej', body: 'Nadpisanie kalendarzowe spycha akcje pod wykres i wyrównuje do prawej. Etykieta „Ostatnie 7 dni” zostaje w lewym górnym rogu bez pary.', fix: 'Akcje w siatce 2×2 pod tytułem, wyrównane do jego lewej krawędzi. Etykieta znika, inicjały dni wystarczą.' },
  { id: 4, title: 'Etykiety dni ważą więcej niż kropki', where: 'NIEDZ. · PON. · WT. · … wersalikami z rozstrzeleniem', body: 'Skróty z kropką i letter-spacingiem są cięższe typograficznie niż same znaczniki, które mają nieść treść.', fix: 'Jednoliterowe inicjały małą literą, bez rozstrzelenia; pełna nazwa w tooltipie i aria-label.' },
]

const decisions = [
  { id: 'D1', title: 'Dysk „dziś” jest kotwicą i nie zmienia rozmiaru', body: 'Zwinięty: dysk w wierszu tytułu przy prawej krawędzi. Rozwinięty: ten sam dysk zjeżdża na oś wstęgi jako jej ostatni punkt. Rozmiar 2,1 rem w obu stanach; historia dostaje 1,85 rem (opcja: tej samej wielkości).' },
  { id: 'D2', title: 'Lewa kolumna: tytuł nad jednym rzędem akcji', body: 'Jutro · Dzień · Ukryj · Otwórz w jednej linii, w tej samej stylistyce co obecne przyciski sceny, wyrównane do lewej krawędzi tytułu (decyzja 26.09: jeden rząd zamiast 2×2). Prawa kolumna należy w całości do wstęgi i jest wyśrodkowana w pionie względem całego rozwiniętego wiersza. Wstęga „luźna”: pola 3,2 rem, kropki historii 2,1 rem jak dysk.' },
  { id: 'D3', title: 'Bez etykiety „Ostatnie 7 dni”', body: 'Inicjały n p w ś c p s pod polami, małą literą. Pełne nazwy dni w tooltipie i w aria-label grupy. Etykieta może wrócić jako nagłówek dostępny tylko dla czytników ekranu.' },
  { id: 'D4', title: 'Tryby liczbowe: to samo pole, inny środek', body: 'Licznik, ocena i wartość rysują w polach historii wypełnienie od dołu z odczytem w środku, zamiast osobnego wykresu słupkowego. Ocena wypełnia udział skali, licznik i wartość udział celu lub maksimum z tygodnia. Checklista: pełna kropka = komplet, częściowe wypełnienie = część pozycji.' },
  { id: 'D5', title: 'Jedno przejście łączy oba stany', body: 'Rozwinięcie to jeden ruch (~300 ms): ikony z tacki na hover lecą w lewo i rozrastają się w podpisane przyciski pod tytułem (FLIP, podpis wyłania się w locie), dysk „dziś” zjeżdża tą samą techniką na oś wstęgi, a sześć kropek historii wysuwa się z dysku w lewo, w tym samym takcie co przyciski i dysk, od najbliższego dnia (22 ms na dzień, bez wstępnego opóźnienia). Zwinięcie odtwarza ruch w odwrotnej kolejności; tacka zostaje widoczna, aż przyciski do niej wrócą. prefers-reduced-motion wyłącza ruch.' },
  { id: 'D6', title: 'Poza zakresem', body: 'Statystyka pod wstęgą (odrzucona 26.09), pozycje bez pomiaru (intencje: rozwinięcie = same akcje), drag-and-drop planu i tryb kalendarzowy z osobnym wykresem tygodnia.' },
]

const findingId = ref(1)
const activeFinding = computed(() => findings.find(f => f.id === findingId.value) ?? findings[0])
</script>

<style scoped>
.tre { --tre-ink: var(--mg-color-ink); --tre-muted: var(--mg-color-muted); color: var(--tre-ink); }
.tre__block { margin-top: 30px; }
.tre__block-head { margin-bottom: 14px; }
.tre__block-head h2 { margin: 6px 0 0; font-size: 20px; line-height: 1.2; }

/* 01 · evidence (same grammar as object-cards) */
.tre__evidence { display: grid; grid-template-columns: 300px minmax(0, 1fr); gap: 14px; }
.tre__findings { display: grid; align-content: start; gap: 6px; }
.tre__findings button { display: grid; grid-template-columns: 24px 1fr; gap: 9px; align-items: start; width: 100%; padding: 10px 11px; border: 1px solid var(--mg-color-border); border-radius: var(--mg-radius-sm); background: var(--mg-color-mist); text-align: left; cursor: pointer; font: inherit; color: inherit; }
.tre__findings button.active { background: var(--mg-color-paper); border-color: color-mix(in srgb, var(--mg-color-primary) 45%, transparent); }
.tre__findings button:hover { background: var(--mg-color-paper); }
.tre__findings strong { display: block; font-size: 12px; line-height: 1.35; }
.tre__findings small { display: block; margin-top: 2px; color: var(--tre-muted); font-size: 10px; }
.tre__finding-index { display: grid; place-items: center; width: 22px; height: 22px; border-radius: var(--mg-radius-organic-a); color: var(--mg-color-on-primary, #fff); background: var(--mg-color-primary-fill); font-size: 10px; font-weight: 800; }
.tre__shot { display: grid; grid-template-columns: minmax(0, 1fr) 300px; margin: 0; overflow: hidden; border: 1px solid var(--mg-color-border); border-radius: var(--mg-radius-lg); background: var(--mg-color-mist); }
.tre__shot-frame { display: grid; place-items: start center; padding: 16px; background: color-mix(in srgb, var(--mg-color-surface) 60%, rgb(19 40 66 / .08)); }
.tre__shot-frame img { width: 100%; height: auto; border-radius: 12px; box-shadow: 0 12px 30px rgb(19 40 66 / .16); }
.tre__shot figcaption { display: grid; align-content: start; gap: 10px; padding: 18px; border-left: 1px solid var(--mg-color-border); }
.tre__shot figcaption strong { font-size: 14px; line-height: 1.3; }
.tre__shot figcaption p { margin: 0; color: var(--tre-muted); font-size: 12px; line-height: 1.55; }
.tre__fix { display: flex; gap: 6px; padding: 10px 12px; border-radius: var(--mg-radius-sm); color: var(--mg-color-primary-strong) !important; background: var(--mg-color-paper); font-weight: 700; }
.tre__fix :deep(.material-symbols-outlined) { flex: 0 0 auto; font-size: 16px; }

/* 02 · toolbar + stage */
.tre__toolbar { display: flex; flex-wrap: wrap; align-items: end; gap: 12px; margin-bottom: 18px; padding: 14px 16px; border-radius: 18px; }
.tre__toolbar label { display: grid; gap: 5px; color: var(--tre-muted); font-size: 10px; font-weight: 800; letter-spacing: .04em; text-transform: uppercase; }
.tre__toolbar select { min-height: 34px; min-width: 150px; padding: 6px 28px 6px 10px; border: 1px solid var(--mg-color-field-border); border-radius: var(--mg-radius-sm); color: var(--tre-ink); background: var(--mg-color-mist); font: inherit; font-size: 12px; text-transform: none; letter-spacing: 0; }
.tre__toolbar .tre__check { display: flex; align-items: center; gap: 6px; min-height: 34px; text-transform: none; letter-spacing: 0; font-size: 12px; font-weight: 700; }
.tre__check input { accent-color: var(--mg-color-primary); }
.tre__reset { min-height: 34px; padding: 0 12px; border: 1px solid var(--mg-color-border); border-radius: var(--mg-radius-pill); color: var(--mg-color-primary-strong); background: var(--mg-color-mist); cursor: pointer; font: inherit; font-size: 11px; font-weight: 800; }

.tre__stage-wrap { display: grid; grid-template-columns: minmax(0, 1fr) 260px; gap: 22px; align-items: start; }
.tre__stage { padding: 24px; border: 1px solid var(--mg-color-border); border-radius: var(--mg-radius-xl); background: var(--mg-color-canvas); }
.tre__legend { padding: 14px 16px; border: 1px solid var(--mg-color-border); border-radius: var(--mg-radius-lg); background: var(--mg-color-mist); font-size: 12px; line-height: 1.5; }
.tre__legend strong { display: block; margin-bottom: 6px; font-size: 12px; }
.tre__legend ol { margin: 0; padding-left: 18px; color: var(--tre-muted); }
.tre__legend li + li { margin-top: 6px; }

/* 03 · decisions */
.tre__decisions { display: grid; gap: 8px; margin: 0; padding: 0; list-style: none; }
.tre__decisions li { display: grid; grid-template-columns: 40px 1fr; gap: 12px; padding: 12px 14px; border: 1px solid var(--mg-color-border); border-radius: var(--mg-radius-md); background: var(--mg-color-mist); }
.tre__decision-id { color: var(--mg-color-primary-strong); font-size: 12px; font-weight: 900; }
.tre__decisions strong { display: block; font-size: 13px; }
.tre__decisions p { margin: 4px 0 0; color: var(--tre-muted); font-size: 12px; line-height: 1.5; }

/* ---------------------------------------------------------------------------
   Rail replica: the product's next-day-rail grammar (filament, uppercase group
   header, paper group card, sky-well rows) at the same tokens. */
.tre-rail { position: relative; display: grid; gap: var(--mg-space-2); width: min(100%, 860px); margin: 0 auto; padding: var(--mg-space-3); overflow: hidden; border-radius: var(--mg-radius-lg); background: var(--mg-color-surface); box-shadow: var(--mg-shadow-raised-sm); }
.tre-rail__filament { position: absolute; top: 0; left: 0; right: 0; height: 2px; background: var(--mg-color-border); }
.tre-rail__filament i { display: block; height: 100%; background: var(--mg-color-state); }
.tre-rail__heading, .tre-rail__group > header { display: flex; align-items: center; justify-content: space-between; gap: var(--mg-space-2); color: var(--mg-color-primary-strong); font-size: var(--mg-font-size-xs); font-weight: 900; letter-spacing: .1em; text-transform: uppercase; }
.tre-rail__heading small { color: var(--tre-muted); font-weight: 700; letter-spacing: 0; text-transform: none; }
.tre-rail__group { display: grid; gap: var(--mg-space-1); padding: var(--mg-space-2); border: 1px solid var(--mg-color-border); border-radius: var(--mg-radius-md); background: var(--mg-color-paper); }

.tre-row { position: relative; display: grid; gap: var(--mg-space-2); padding: var(--mg-space-1) var(--mg-space-2); border-radius: var(--mg-radius-sm); background: var(--mg-color-sky-well); cursor: pointer; transition: background var(--mg-duration-fast) var(--mg-ease-standard); }
.tre-row:hover { background: var(--mg-color-mist); }
.tre-row--staged, .tre-row--staged:hover { background: var(--mg-color-paper); }
.tre-row__main { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; align-items: center; gap: var(--mg-space-2); min-width: 0; min-height: 2.1rem; }
.tre-row__lead { display: grid; place-items: center; width: 1.85rem; height: 1.85rem; border-radius: var(--mg-radius-icon-field-a); color: var(--mg-color-primary-strong); background: var(--mg-color-sky-well); }
.tre-row__lead--active { background: var(--mg-color-sky-field); }
.tre-row__lead :deep(.material-symbols-outlined) { font-size: var(--mg-font-size-md); }
.tre-row__title { position: relative; display: grid; min-width: 0; }
.tre-row__tray { position: absolute; top: 50%; right: 0; display: inline-flex; gap: 2px; padding-left: var(--mg-space-3); background: linear-gradient(to right, transparent, var(--mg-color-mist) var(--mg-space-3)); opacity: 0; pointer-events: none; transform: translateY(-50%); transition: opacity var(--mg-duration-fast) var(--mg-ease-standard); }
.tre-row:hover .tre-row__tray, .tre-row__tray:focus-within { opacity: 1; pointer-events: auto; }
.tre-row__tray > button { display: grid; place-items: center; width: 1.75rem; height: 1.75rem; padding: 0; border: 1px solid transparent; border-radius: var(--mg-radius-organic-a); color: var(--tre-muted); background: transparent; cursor: pointer; }
.tre-row__tray > button:hover { color: var(--mg-color-primary-strong); background: var(--mg-color-surface); box-shadow: var(--mg-shadow-raised-sm); }
.tre-row__tray :deep(.material-symbols-outlined) { font-size: var(--mg-font-size-sm); }
.tre-row__label { display: grid; width: 100%; justify-items: start; min-width: 0; padding: 0; border: 0; background: transparent; text-align: left; cursor: pointer; font: inherit; }
.tre-row__label strong { max-width: 100%; overflow: hidden; color: var(--tre-ink); font-size: var(--mg-font-size-sm); font-weight: 700; text-overflow: ellipsis; white-space: nowrap; }
.tre-row__label:hover strong { color: var(--mg-color-primary-strong); }
.tre-row__entry { position: relative; display: flex; align-items: center; justify-content: flex-end; gap: var(--mg-space-1); }

/* Staged row = a two-column grid: the strip spans both rows and centres against the
   whole row (title line + actions), so the disc lands lower than in the collapsed
   row — that is the intended "zjazd". */
.tre-row--staged { grid-template-columns: minmax(0, 1fr) auto; grid-template-areas: 'main strip' 'actions strip'; column-gap: var(--mg-space-3); row-gap: var(--mg-space-2); padding-bottom: var(--mg-space-2); cursor: default; }
.tre-row--staged .tre-row__main { grid-area: main; }
.tre-row__actions { grid-area: actions; display: grid; grid-template-columns: repeat(4, max-content); gap: var(--mg-space-1); align-content: center; justify-content: start; padding-left: calc(1.85rem + var(--mg-space-2)); }
.tre-strip { grid-area: strip; align-self: center; }
.tre-row__actions > button { display: inline-flex; gap: var(--mg-space-1); align-items: center; justify-content: flex-start; padding: 3px var(--mg-space-2); border: 1px solid var(--mg-color-border); border-radius: var(--mg-radius-organic-b); color: var(--tre-muted); background: var(--mg-color-paper); font: inherit; font-size: var(--mg-font-size-xs); font-weight: 800; cursor: pointer; }
.tre-row__actions > button:hover { color: var(--mg-color-primary-strong); background: var(--mg-color-sky-well); }
.tre-row__actions :deep(.material-symbols-outlined) { font-size: var(--mg-font-size-sm); }

/* Collapse in flight: the tray stays visible while the labelled buttons fly back into it. */
.tre-row--settling .tre-row__tray { opacity: 1; transition: none; }

/* The strip: six past days + the live disc. Fixed cell width, never stretched. */
.tre-row { --tre-cell: 2.2rem; --tre-dot: 1.85rem; }
.tre-row--density-equal { --tre-cell: 2.5rem; --tre-dot: 2.1rem; }
.tre-row--density-loose { --tre-cell: 3.2rem; --tre-dot: 2.1rem; }
.tre-row--density-wide { --tre-cell: 4rem; --tre-dot: 2.1rem; }
.tre-strip { display: grid; grid-auto-flow: column; grid-auto-columns: var(--tre-cell); gap: var(--mg-space-1); align-items: end; }
.tre-strip__day { display: grid; justify-items: center; align-items: center; gap: 3px; }
.tre-strip__day small { color: var(--tre-muted); font-size: .66rem; font-weight: 700; line-height: 1; }
.tre-strip__day--today small { color: var(--mg-color-primary-strong); }
.tre-strip__dot { position: relative; display: grid; place-items: center; width: var(--tre-dot); height: var(--tre-dot); overflow: hidden; border-radius: var(--mg-radius-organic-a); background: var(--mg-color-border); font-style: normal; }
.tre-strip__dot--b { border-radius: var(--mg-radius-organic-b); }
.tre-strip__dot.is-done { background: var(--mg-color-sky-field); box-shadow: var(--mg-shadow-inset-sm); }
.tre-strip__dot.is-done::after { width: 62%; aspect-ratio: 1; border-radius: var(--mg-radius-organic-c); background: var(--mg-color-state); content: ''; transform: rotate(-2deg); }
.tre-strip__dot.is-missed { background: var(--mg-color-effort-soft); }
.tre-strip__dot.is-partial, .tre-strip__dot.is-reading { background: linear-gradient(to top, var(--mg-color-state-soft) var(--fill, 0%), var(--mg-color-border) var(--fill, 0%)); box-shadow: var(--mg-shadow-inset-sm); }
.tre-strip__dot b { position: relative; color: var(--mg-color-primary-strong); font-size: var(--mg-font-size-xs); font-weight: 800; }

@media (max-width: 1100px) {
  .tre__evidence, .tre__stage-wrap { grid-template-columns: minmax(0, 1fr); }
  .tre__shot { grid-template-columns: minmax(0, 1fr); }
  .tre__shot figcaption { border-left: 0; border-top: 1px solid var(--mg-color-border); }
}
</style>

<style>
/* Disc, multi dots and stepper are rendered by the inline TodayEntryDisc component,
   whose inner nodes do not carry this scenario's scoped attribute — so these rules
   are global, fenced by the .tre root. */
/* The well — copied from the product's ndi__well so both states read identically. */
.tre .tre-well { position: relative; display: grid; place-items: center; flex: 0 0 auto; width: 2.1rem; height: 2.1rem; padding: 0; overflow: hidden; border: 1px solid var(--mg-color-border); border-radius: var(--mg-radius-organic-a); color: var(--tre-muted); background: var(--mg-color-canvas); box-shadow: var(--mg-shadow-inset-sm); font: inherit; font-size: var(--mg-font-size-sm); font-weight: 800; }
.tre .tre-well--button { cursor: pointer; }
.tre .tre-well--on { color: var(--mg-color-primary-strong); background: var(--mg-color-sky-field); }
.tre .tre-well--done { border-color: transparent; background: var(--mg-color-sky-field); }
.tre .tre-well--done::after { width: 62%; aspect-ratio: 1; border-radius: var(--mg-radius-organic-c); background: var(--mg-color-state); content: ''; transform: rotate(-2deg); }
.tre .tre-well--meter { background: linear-gradient(to right, var(--mg-color-sky-field) var(--fill, 0%), var(--mg-color-canvas) var(--fill, 0%)); }
.tre .tre-well--met { border-color: transparent; color: var(--mg-color-primary-strong); background: var(--mg-color-state-soft); }
.tre .tre-well__reading { display: flex; align-items: baseline; gap: 1px; color: inherit; }
.tre .tre-well__reading i { color: var(--tre-muted); font-size: var(--mg-font-size-xs); font-style: normal; font-weight: 700; }
.tre .tre-well__initial { font-size: var(--mg-font-size-xs); font-weight: 800; line-height: 1; }
/* History dots fan out of the disc to the left, nearest day first, in the same
   beat as the FLIP of the buttons and the disc (no lead-in: user decision 26.09,
   one motion, not two). On collapse they fold back in the same order while the
   strip is pinned to the collapsed disc line. */
.tre .tre-strip__day:not(.tre-strip__day--today) { --dx: calc((6 - var(--idx, 0)) * (var(--tre-cell) + var(--mg-space-1))); animation: tre-fan .3s var(--mg-ease-standard) both; animation-delay: calc((5 - var(--idx, 0)) * 22ms); }
@keyframes tre-fan { from { opacity: 0; transform: translateX(var(--dx)) scale(.55); } }
/* Pinned so its dot row sits exactly on the collapsed disc line (row padding-top).
   grid-area: auto matters: an abs-pos grid child keeps its named area as containing
   block, and 'strip' no longer exists once the row is collapsed. */
.tre .tre-strip-leave-active { position: absolute; grid-area: auto; top: var(--mg-space-1); right: var(--mg-space-2); animation: tre-hold .32s both; pointer-events: none; }
.tre .tre-strip-leave-active .tre-strip__day--today { visibility: hidden; }
/* A distinct keyframe name: re-declaring tre-fan on the same element would not restart it. */
.tre .tre-strip-leave-active .tre-strip__day:not(.tre-strip__day--today) { animation: tre-fold .22s var(--mg-ease-standard) both; animation-delay: calc(var(--idx, 0) * 24ms); }
@keyframes tre-fold { to { opacity: 0; transform: translateX(var(--dx)) scale(.55); } }
@keyframes tre-hold { from { opacity: 1; } to { opacity: 1; } }
@media (prefers-reduced-motion: reduce) { .tre .tre-strip__day, .tre .tre-strip-leave-active .tre-strip__day { animation: none; } .tre .tre-strip-leave-active { display: none; } }

/* Multi: fraction disc at rest, one dot per item on hover, fanning to the left. */
.tre .tre-multi { display: flex; align-items: center; justify-content: flex-end; gap: var(--mg-space-1); min-height: 2.1rem; }
.tre .tre-well--dot { width: 1.7rem; height: 1.7rem; }
.tre .tre-multi > .tre-well--dot:nth-child(even) { border-radius: var(--mg-radius-organic-b); }
.tre .tre-well--dot.tre-well--done { color: var(--mg-color-on-primary); background: var(--mg-color-state); box-shadow: none; }
.tre .tre-well--dot.tre-well--done::after { content: none; }
.tre .tre-well--dot.tre-well--done .tre-well__initial { color: var(--mg-color-on-primary); }
.tre .tre-strip__day--today .tre-multi { position: relative; justify-content: flex-end; width: 2.1rem; }
.tre .tre-strip__day--today .tre-multi--open { width: auto; }

/* Stepper: ± beside the disc, surfacing on hover — same as the product. */
.tre .tre-stepper { position: relative; display: inline-grid; place-items: center; }
.tre .tre-step { position: absolute; right: calc(100% + var(--mg-space-1)); display: grid; place-items: center; width: 1.25rem; height: 1.05rem; padding: 0; border: 0; border-radius: var(--mg-radius-organic-b); color: var(--mg-color-primary-strong); background: transparent; opacity: 0; cursor: pointer; }
.tre .tre-step--plus { top: 0; }
.tre .tre-step--minus { bottom: 0; }
.tre .tre-step :deep(.material-symbols-outlined) { font-size: var(--mg-font-size-sm); }
.tre .tre-row:hover .tre-step, .tre .tre-step:focus-visible { opacity: 1; }
.tre .tre-row:hover .tre-step:disabled, .tre .tre-step:disabled:focus-visible { opacity: .36; cursor: not-allowed; }
.tre .tre-step:not(:disabled):hover { background: var(--mg-color-sky-well); }
/* Inside the strip the left side is taken by history, so ± stack above and below
   the disc (the minus covers the day initial while hovered). */
.tre .tre-strip__day--today .tre-step { z-index: 2; right: auto; left: 50%; transform: translateX(-50%); }
.tre .tre-strip__day--today .tre-step--plus { top: auto; bottom: calc(100% + 2px); }
.tre .tre-strip__day--today .tre-step--minus { top: calc(100% + 2px); bottom: auto; }
.tre .tre-strip__day--today:hover small, .tre .tre-strip__day--today:focus-within small { opacity: 0; }
</style>
