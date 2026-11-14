<template>
  <section class="scenario-page concept-page tra mg-design-v2">
    <header class="concept-heading">
      <div>
        <span class="lab-eyebrow">Eksperyment · Dzisiaj · akcje wiersza planu dnia</span>
        <h1>Akcje wiersza: sam tekst albo same ikony</h1>
        <p>
          Dwa czyste warianty bez mieszania. „Sam tekst”: jutro · inny dzień · nie dziś · otwórz jako ciche słowa, na
          tacce i pod tytułem. „Same ikony”: sześć różnych kształtów zamiast trzech kalendarzy, z nazwą pojawiającą się
          od razu po najechaniu. W obu rozwinięty wiersz nie ma pigułek, a plus i minus mają własne miejsce przy dysku.
        </p>
      </div>
      <span class="status-badge status-badge--experiment">Propozycja do oceny</span>
    </header>

    <div class="tra__toolbar neo-card" aria-label="Ustawienia sceny">
      <label>Akcje
        <select v-model="variant">
          <option value="text">Sam tekst · wstęga 2,6 rem</option>
          <option value="icons">Same ikony · wstęga jak dziś (3,2 rem)</option>
        </select>
      </label>
      <label class="tra__check"><input v-model="pinTray" type="checkbox" /> Pokaż tackę bez najeżdżania</label>
      <label class="tra__check"><input v-model="longTitle" type="checkbox" /> Długi tytuł</label>
      <button class="tra__reset" type="button" @click="resetAll">Przywróć przykład</button>
    </div>

    <div class="tra__stage-wrap">
      <div class="tra__stage">
        <section class="tra-rail">
          <header class="tra-rail__heading"><span>Plan dnia</span></header>

          <section v-for="group in groups" :key="group.id" class="tra-rail__group">
            <header><span>{{ group.label }}</span></header>
            <article
              v-for="row in group.rows"
              :key="row.id"
              :ref="el => setRowEl(row.id, el as HTMLElement | null)"
              class="tra-row"
              :class="{
                'tra-row--staged': staged === row.id,
                'tra-row--snug': variant === 'text',
                'tra-row--settling': settling.has(row.id),
                'tra-row--show-tray': pinTray && staged !== row.id,
              }"
              @click="toggleStage(row.id)"
            >
              <div class="tra-row__main">
                <span class="tra-row__lead" :class="{ 'tra-row__lead--active': hasEntry(row) }" aria-hidden="true"><AppIcon :name="row.icon" /></span>
                <div class="tra-row__title">
                  <button type="button" class="tra-row__label" :aria-pressed="staged === row.id" @click.stop="toggleStage(row.id)">
                    <strong>{{ rowTitle(row) }}</strong>
                  </button>

                  <!-- Collapsed row: the hover tray. One language per variant: words only, or icons only. -->
                  <span v-if="staged !== row.id" class="tra-tray" role="group" :aria-label="`Akcje: ${rowTitle(row)}`" @click.stop>
                    <button
                      v-for="action in actionsFor(row, false)"
                      :key="action.id"
                      type="button"
                      :class="actionClass(row, action)"
                      :data-flip="action.id"
                      :data-tip="variant === 'icons' ? action.tip : undefined"
                      :aria-label="action.tip"
                      @click="act(row, action.id)"
                    >
                      <template v-if="variant === 'text'">{{ action.label }}</template>
                      <svg v-else-if="action.id === 'tomorrow'" class="tra-glyph" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12h15M13 6l6 6-6 6" /></svg>
                      <AppIcon v-else :name="action.icon" />
                    </button>
                  </span>
                </div>
              </div>

              <!-- Expanded row: the same actions on a second line under the title — no pills. -->
              <div v-if="staged === row.id" class="tra-actions" :class="`tra-actions--${variant}`" role="group" :aria-label="`Akcje: ${rowTitle(row)}`" @click.stop>
                <button
                  v-for="action in actionsFor(row, true)"
                  :key="action.id"
                  type="button"
                  :class="actionClass(row, action)"
                  :data-flip="action.id"
                  :data-tip="variant === 'icons' ? action.tip : undefined"
                  :aria-label="action.tip"
                  @click="act(row, action.id)"
                >
                  <template v-if="variant === 'text'">{{ action.label }}</template>
                  <svg v-else-if="action.id === 'tomorrow'" class="tra-glyph" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12h15M13 6l6 6-6 6" /></svg>
                  <AppIcon v-else :name="action.icon" />
                </button>
              </div>

              <Transition name="tra-strip">
                <div v-if="staged === row.id" class="tra-strip" role="img" :aria-label="`Ostatnie 7 dni: ${rowTitle(row)}`" @click.stop>
                  <span v-for="(day, index) in pastDays(row)" :key="day.key" class="tra-strip__day" :style="{ '--idx': index }">
                    <i class="mg-well tra-strip__dot" :class="[`is-${day.state}`, { 'mg-well--done': day.state === 'done', 'tra-strip__dot--b': index % 2 === 1 }]" :style="day.fill !== undefined ? { '--fill': `${day.fill}%` } : undefined"><b v-if="day.reading">{{ day.reading }}</b></i>
                    <small aria-hidden="true">{{ day.initial }}</small>
                  </span>
                </div>
              </Transition>

              <!-- Entry: ± are in the flow beside the disc (hidden until hover), so the
                   tray always ends before them. -->
              <div class="tra-entry" data-flip="disc" @click.stop>
                <button v-if="row.mode === 'completion'" type="button" class="mg-well tra-well tra-well--button" :class="{ 'mg-well--done': row.done }" :aria-pressed="row.done" aria-label="Wykonanie" @click="row.done = !row.done"></button>
                <template v-else>
                  <button type="button" class="tra-step tra-step--plus" aria-label="Więcej" @click="step(row, 1)"><AppIcon name="add" /></button>
                  <button type="button" class="tra-step tra-step--minus" aria-label="Mniej" :disabled="!row.value" @click="step(row, -1)"><AppIcon name="remove" /></button>
                  <span class="mg-well tra-well" :class="{ 'tra-well--on': Boolean(row.value) }"><b>{{ row.value ?? 0 }}</b></span>
                </template>
                <small v-if="staged === row.id" class="tra-today" aria-hidden="true">s</small>
              </div>
            </article>
          </section>
        </section>
      </div>

      <aside class="tra__legend">
        <strong>Co sprawdzić</strong>
        <ol>
          <li>Sam tekst: czy cztery słowa na tacce nie zasłaniają za dużo tytułu i czy „nie dziś” jest jasne.</li>
          <li>Same ikony: czy strzałka, kalendarz i przekreślone oko da się odróżnić bez czytania nazwy.</li>
          <li>Rozwiń wiersz w obu wariantach: nic nie sięga wstęgi.</li>
          <li>Wiersz z licznikiem: plus i minus nie stykają się z tacką.</li>
        </ol>
        <p v-if="lastAction" class="tra__last">{{ lastAction }}</p>
      </aside>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import AppIcon from '@product/components/shared/AppIcon.vue'

// Sample: Saturday 14 Nov 2026, the day of the user's screenshots.
type EntryMode = 'completion' | 'counter'
type Variant = 'text' | 'icons'

interface Row {
  id: string
  icon: string
  title: string
  longTitle?: string
  mode: EntryMode
  /** Past six days, Sunday → Friday; undefined = no entry. */
  history: (number | undefined)[]
  done: boolean
  value?: number
  /** Scheduled on this very day: the row can be deleted. */
  scheduled?: boolean
}

const DAY_INITIALS = ['n', 'p', 'w', 'ś', 'c', 'p']
interface RowAction { id: string; label: string; tip: string; icon: string; danger?: boolean }
const ACTIONS: Record<string, RowAction> = {
  tomorrow: { id: 'tomorrow', label: 'jutro', tip: 'Przenieś na jutro', icon: 'east' },
  day: { id: 'day', label: 'inny dzień', tip: 'Przenieś na inny dzień', icon: 'calendar_month' },
  'not-today': { id: 'not-today', label: 'nie dziś', tip: 'Nie dziś', icon: 'visibility_off' },
  clear: { id: 'clear', label: 'wyczyść', tip: 'Wyczyść wpis', icon: 'ink_eraser' },
  open: { id: 'open', label: 'otwórz', tip: 'Otwórz', icon: 'open_in_new' },
  delete: { id: 'delete', label: 'usuń', tip: 'Usuń', icon: 'delete', danger: true },
}

function makeRows(): Row[] {
  return [
    { id: 'thought', icon: 'target', title: 'Przypomnij sobie inną myśl', mode: 'completion', history: [0, 0, 0, 0, 0, 1], done: false },
    { id: 'car', icon: 'target', title: 'Umówić przegląd auta', mode: 'completion', history: [0, 0, 0, 0, 0, 0], done: false },
    { id: 'cardio', icon: 'flag', title: 'Trening cardio', longTitle: 'Utrzymać wagę poniżej 80 kg mimo sezonu urlopowego i rodzinnych obiadów', mode: 'completion', history: [0, 0, 1, 1, 0, 0], done: true, scheduled: true },
    { id: 'stretch', icon: 'flag', title: 'Rozciąganie co wieczór', mode: 'completion', history: [1, 0, 1, 1, 0, 1], done: false },
    { id: 'features', icon: 'flag', title: 'Dwie funkcje miesięcznie', mode: 'counter', history: [undefined, 1, undefined, undefined, 2, undefined], done: false },
    { id: 'coffee', icon: 'loop', title: 'Maksymalnie 10 kaw w tygodniu', mode: 'counter', history: [2, 1, 2, 3, 1, 2], done: false, value: 1 },
  ]
}

const rows = ref<Row[]>(makeRows())
const staged = ref<string | null>('cardio')
const variant = ref<Variant>('text')
const pinTray = ref(false)
const longTitle = ref(false)
const targeting = ref<string | null>(null)
const lastAction = ref('')

const groups = computed(() => [
  { id: 'intentions', label: 'Intencje tygodnia', rows: rows.value.slice(0, 2) },
  { id: 'goals', label: 'Cele i rezultaty', rows: rows.value.slice(2, 5) },
  { id: 'habits', label: 'Nawyki', rows: rows.value.slice(5) },
])

function rowTitle(row: Row): string {
  return longTitle.value && row.longTitle ? row.longTitle : row.title
}
function hasEntry(row: Row): boolean {
  return row.mode === 'completion' ? row.done : Boolean(row.value)
}
function step(row: Row, delta: number) {
  const next = Math.max(0, (row.value ?? 0) + delta)
  row.value = next || undefined
}

// One list for both places. Text: the tray keeps the four everyday words and
// "usuń" waits in the expanded row; clearing an entry is the disc's own job
// (click it again, step down to zero, empty the field). Icons: the same set
// the product's tray has today.
function actionsFor(row: Row, expanded: boolean): RowAction[] {
  const ids = ['tomorrow', 'day', 'not-today']
  if (variant.value === 'icons' && hasEntry(row)) ids.push('clear')
  ids.push('open')
  if (row.scheduled && (expanded || variant.value === 'icons')) ids.push('delete')
  return ids.map(id => ACTIONS[id])
}
function actionClass(row: Row, action: RowAction) {
  return [
    variant.value === 'text' ? 'tra-word' : 'tra-ico',
    { 'is-danger': action.danger, 'is-active': action.id === 'day' && targeting.value === row.id },
  ]
}

const ACTION_NOTES: Record<string, string> = {
  tomorrow: 'przeniesione na jutro',
  'not-today': 'zdjęte z dzisiejszej listy',
  open: 'otwarta karta obiektu',
  clear: 'wpis wyczyszczony',
  delete: 'pytanie o usunięcie',
}
function act(row: Row, action: string) {
  if (action === 'day') {
    targeting.value = targeting.value === row.id ? null : row.id
    lastAction.value = targeting.value ? `„${row.title}”: kalendarz czeka na wybór dnia` : ''
    return
  }
  targeting.value = null
  lastAction.value = `„${row.title}”: ${ACTION_NOTES[action]}`
}

// FLIP, as in the product: everything marked data-flip is measured before the
// state change and animated from its old box to the new one.
const FLIP_MS = 300
const rowEls = new Map<string, HTMLElement>()
const settling = ref(new Set<string>())
function setRowEl(id: string, el: HTMLElement | null) {
  if (el) rowEls.set(id, el)
  else rowEls.delete(id)
}
function snapshot(root: HTMLElement | undefined) {
  const map = new Map<string, DOMRect>()
  root?.querySelectorAll<HTMLElement>('[data-flip]').forEach(el => map.set(el.dataset.flip!, el.getBoundingClientRect()))
  return map
}
function flip(root: HTMLElement | undefined, before: Map<string, DOMRect>) {
  if (!root || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  root.querySelectorAll<HTMLElement>('[data-flip]').forEach(el => {
    const from = before.get(el.dataset.flip!)
    if (!from) return
    const to = el.getBoundingClientRect()
    const dx = from.left - to.left
    const dy = from.top - to.top
    if (!dx && !dy) return
    el.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }], { duration: FLIP_MS, easing: 'cubic-bezier(.2, .7, .2, 1)' })
  })
}
async function toggleStage(id: string) {
  const before = snapshot(rowEls.get(id))
  const previous = staged.value
  staged.value = staged.value === id ? null : id
  await nextTick()
  flip(rowEls.get(id), before)
  if (previous === id) {
    settling.value = new Set([...settling.value, id])
    window.setTimeout(() => {
      const next = new Set(settling.value)
      next.delete(id)
      settling.value = next
    }, FLIP_MS + 120)
  }
}
function resetAll() {
  rows.value = makeRows()
  staged.value = 'cardio'
  variant.value = 'text'
  pinTray.value = false
  longTitle.value = false
  targeting.value = null
  lastAction.value = ''
}

interface PastDay { key: string; initial: string; state: 'done' | 'empty' | 'reading'; fill?: number; reading?: string }
function pastDays(row: Row): PastDay[] {
  const max = Math.max(1, ...row.history.map(value => value ?? 0))
  return row.history.map((value, index) => {
    const base = { key: `d${index}`, initial: DAY_INITIALS[index] }
    if (!value) return { ...base, state: 'empty' as const }
    if (row.mode === 'completion') return { ...base, state: 'done' as const }
    return { ...base, state: 'reading' as const, fill: Math.round((value / max) * 100), reading: String(value) }
  })
}
</script>

<style scoped>
.tra { color: var(--mg-color-ink); }
.tra__toolbar { display: flex; flex-wrap: wrap; align-items: end; gap: 12px; margin: 24px 0 18px; padding: 14px 16px; border-radius: 18px; }
.tra__toolbar label { display: grid; gap: 5px; color: var(--mg-color-muted); font-size: 10px; font-weight: 800; letter-spacing: .04em; text-transform: uppercase; }
.tra__toolbar select { min-height: 34px; padding: 6px 28px 6px 10px; border: 1px solid var(--mg-color-field-border); border-radius: var(--mg-radius-sm); color: var(--mg-color-ink); background: var(--mg-color-mist); font: inherit; font-size: 12px; text-transform: none; letter-spacing: 0; }
.tra__toolbar .tra__check { display: flex; align-items: center; gap: 6px; min-height: 34px; text-transform: none; letter-spacing: 0; font-size: 12px; font-weight: 700; }
.tra__check input { accent-color: var(--mg-color-primary); }
.tra__reset { min-height: 34px; padding: 0 12px; border: 1px solid var(--mg-color-border); border-radius: var(--mg-radius-pill); color: var(--mg-color-primary-strong); background: var(--mg-color-mist); cursor: pointer; font: inherit; font-size: 11px; font-weight: 800; }
.tra__stage-wrap { display: grid; grid-template-columns: minmax(0, 1fr) 260px; gap: 22px; align-items: start; }
.tra__stage { padding: 24px; border: 1px solid var(--mg-color-border); border-radius: var(--mg-radius-xl); background: var(--mg-color-canvas); }
.tra__legend { padding: 14px 16px; border: 1px solid var(--mg-color-border); border-radius: var(--mg-radius-lg); background: var(--mg-color-mist); font-size: 12px; line-height: 1.5; }
.tra__legend strong { display: block; margin-bottom: 6px; }
.tra__legend ol { margin: 0; padding-left: 18px; color: var(--mg-color-muted); }
.tra__legend li + li { margin-top: 6px; }
.tra__last { margin: 12px 0 0; color: var(--mg-color-primary-strong); font-weight: 700; }

/* Rail replica at the product's width: rows come out at ~628 px, as on /today at 1512 px. */
.tra-rail { display: grid; gap: var(--mg-space-2); width: min(100%, 670px); margin: 0 auto; padding: var(--mg-space-3); border-radius: var(--mg-radius-lg); background: var(--mg-color-surface); box-shadow: var(--mg-shadow-raised-sm); }
.tra-rail__heading, .tra-rail__group > header { display: flex; align-items: center; color: var(--mg-color-primary-strong); font-size: var(--mg-font-size-xs); font-weight: 900; letter-spacing: .1em; text-transform: uppercase; }
.tra-rail__group { display: grid; gap: var(--mg-space-1); padding: var(--mg-space-2); border: 1px solid var(--mg-color-border); border-radius: var(--mg-radius-md); background: var(--mg-color-paper); box-shadow: var(--mg-shadow-nested); }

.tra-row { --tra-cell: 3.2rem; position: relative; display: grid; grid-template-columns: minmax(0, 1fr) auto; grid-template-areas: 'main entry'; align-items: center; gap: var(--mg-space-2); padding: var(--mg-space-1) var(--mg-space-2); border-radius: var(--mg-radius-sm); cursor: pointer; transition: background var(--mg-duration-fast) var(--mg-ease-standard); }
.tra-row:hover, .tra-row--show-tray { background: var(--mg-color-mist); }
.tra-row--staged, .tra-row--staged:hover { background: var(--mg-color-paper); }
.tra-row--snug { --tra-cell: 2.6rem; }
.tra-row__main { grid-area: main; display: grid; grid-template-columns: auto minmax(0, 1fr); align-items: center; gap: var(--mg-space-2); min-width: 0; min-height: 2.1rem; }
.tra-row__lead { display: grid; place-items: center; width: 1.85rem; height: 1.85rem; border-radius: var(--mg-radius-icon-field-a); color: var(--mg-color-primary-strong); background: var(--mg-color-sky-well); }
.tra-row__lead--active { background: var(--mg-color-sky-field); }
.tra-row__lead .material-symbols-outlined { font-size: var(--mg-font-size-md); }
.tra-row__title { position: relative; display: grid; min-width: 0; }
.tra-row__label { display: grid; width: 100%; justify-items: start; min-width: 0; padding: 0; border: 0; background: transparent; text-align: left; cursor: pointer; font: inherit; }
.tra-row__label strong { max-width: 100%; overflow: hidden; color: var(--mg-color-ink); font-size: var(--mg-font-size-sm); font-weight: 700; text-overflow: ellipsis; white-space: nowrap; }
.tra-row__label:hover strong { color: var(--mg-color-primary-strong); }

/* Staged: the icons take a second line under the title; the strip spans both. */
.tra-row--staged { grid-template-columns: minmax(0, 1fr) auto auto; grid-template-areas: 'main strip entry' 'actions strip entry'; column-gap: var(--mg-space-1); row-gap: 0; padding-bottom: var(--mg-space-2); cursor: default; }
.tra-actions { grid-area: actions; display: flex; align-items: center; gap: 2px; min-width: 0; min-height: 1.75rem; padding-left: calc(1.85rem + var(--mg-space-2) - 6px); }

/* Tray: an overlay on the tail of the title, quiet until hover. */
.tra-tray { position: absolute; top: 50%; right: 0; display: inline-flex; align-items: center; gap: 2px; padding-left: var(--mg-space-3); background: linear-gradient(to right, transparent, var(--mg-color-mist) var(--mg-space-3)); opacity: 0; pointer-events: none; transform: translateY(-50%); transition: opacity var(--mg-duration-fast) var(--mg-ease-standard); }
.tra-row:hover .tra-tray, .tra-tray:focus-within, .tra-row--show-tray .tra-tray, .tra-row--settling .tra-tray { opacity: 1; pointer-events: auto; }

.tra-ico { display: grid; place-items: center; width: 1.75rem; height: 1.75rem; padding: 0; border: 0; border-radius: var(--mg-radius-organic-a); color: var(--mg-color-muted); background: transparent; cursor: pointer; }
.tra-ico .material-symbols-outlined { font-size: var(--mg-font-size-sm); }
.tra-ico:hover { color: var(--mg-color-primary-strong); background: var(--mg-color-surface); box-shadow: var(--mg-shadow-raised-sm); }
.tra-ico.is-danger, .tra-ico.is-danger:hover { color: var(--mg-color-rose); }

/* Text variant: plain words, no pill at rest; a cloud only under the cursor. */
.tra-word { padding: 3px 6px; border: 0; border-radius: var(--mg-radius-pill); color: var(--mg-color-muted); background: transparent; font: inherit; font-size: var(--mg-font-size-xs); font-weight: 700; line-height: 1.3; white-space: nowrap; cursor: pointer; }
.tra-word:hover { color: var(--mg-color-primary-strong); background: var(--mg-color-surface); box-shadow: var(--mg-shadow-raised-sm); }
.tra-word.is-active { color: var(--mg-color-primary-strong); background: var(--mg-color-sky-well); box-shadow: var(--mg-shadow-inset-sm); }
.tra-word.is-danger, .tra-word.is-danger:hover { color: var(--mg-color-rose); }
.tra-actions--text { gap: 0; padding-left: calc(1.85rem + var(--mg-space-2) - 6px); }
.tra-actions--text .tra-word.is-danger { margin-left: var(--mg-space-1); }

/* Icons variant: the name shows at once on hover — no tooltip delay. */
.tra-glyph { width: 1em; height: 1em; fill: none; stroke: currentColor; stroke-width: 1.75; stroke-linecap: round; stroke-linejoin: round; font-size: var(--mg-font-size-sm); }
.tra-ico { position: relative; }
.tra-ico.is-active { color: var(--mg-color-primary-strong); background: var(--mg-color-sky-well); box-shadow: var(--mg-shadow-inset-sm); }
.tra-ico[data-tip]:hover::after { position: absolute; top: calc(100% + 4px); left: 50%; z-index: 3; padding: .15rem .5rem; border-radius: var(--mg-radius-pill); color: var(--mg-color-inverse-ink); background: var(--mg-color-inverse); font-size: var(--mg-font-size-xs); font-weight: 700; line-height: 1.3; white-space: nowrap; content: attr(data-tip); pointer-events: none; transform: translateX(-50%); }

/* Entry: disc at the right edge; ± in the flow on its left, shown on hover. */
.tra-entry { grid-area: entry; position: relative; display: grid; grid-template-columns: auto auto; grid-template-areas: 'plus well' 'minus well'; align-items: center; justify-content: end; column-gap: var(--mg-space-1); }
.tra-well { grid-area: well; overflow: hidden; color: var(--mg-color-muted); font-size: var(--mg-font-size-sm); font-weight: 800; }
.tra-well--button { cursor: pointer; }
.tra-well--on { color: var(--mg-color-primary-strong); background: var(--mg-color-sky-field); }
.tra-step { display: grid; place-items: center; width: 1.25rem; height: 1.05rem; padding: 0; border: 0; border-radius: var(--mg-radius-organic-b); color: var(--mg-color-primary-strong); background: transparent; opacity: 0; cursor: pointer; }
.tra-step--plus { grid-area: plus; }
.tra-step--minus { grid-area: minus; }
.tra-step .material-symbols-outlined { font-size: var(--mg-font-size-sm); }
.tra-row:hover .tra-step, .tra-step:focus-visible { opacity: 1; }
.tra-row:hover .tra-step:disabled { opacity: .36; cursor: not-allowed; }
.tra-step:not(:disabled):hover { background: var(--mg-color-sky-well); }

/* As the strip's last cell the disc gets its initial underneath; ± move above and
   below it, as in the product today. */
.tra-row--staged .tra-entry { align-self: center; display: grid; grid-template-columns: auto; grid-template-areas: 'well' 'today'; justify-items: center; row-gap: 3px; }
.tra-row--staged .tra-step { position: absolute; left: 50%; z-index: 2; transform: translateX(-50%); }
.tra-row--staged .tra-step--plus { bottom: calc(100% + 2px); }
.tra-row--staged .tra-step--minus { top: calc(2.1rem + 2px); }
.tra-row--staged .tra-entry:hover .tra-today { opacity: 0; }
.tra-today { grid-area: today; }

.tra-strip { grid-area: strip; align-self: center; display: grid; grid-auto-flow: column; grid-auto-columns: var(--tra-cell); gap: var(--mg-space-1); align-items: end; }
.tra-strip__day { display: grid; justify-items: center; gap: 3px; --dx: calc((6 - var(--idx, 0)) * (var(--tra-cell) + var(--mg-space-1))); animation: tra-fan .3s var(--mg-ease-standard) both; animation-delay: calc((5 - var(--idx, 0)) * 22ms); }
.tra-strip__day small, .tra-today { color: var(--mg-color-muted); font-size: var(--mg-font-size-chart); font-weight: var(--mg-weight-strong); line-height: 1; }
.tra-today { color: var(--mg-color-primary-strong); }
.tra-strip__dot { overflow: hidden; border-color: transparent; background: var(--mg-color-border); box-shadow: none; font-style: normal; }
.tra-strip__dot--b { border-radius: var(--mg-radius-organic-b); }
.tra-strip__dot.is-done { box-shadow: var(--mg-shadow-inset-sm); }
.tra-strip__dot.is-reading { background: linear-gradient(to top, var(--mg-color-state-soft) var(--fill, 0%), var(--mg-color-border) var(--fill, 0%)); box-shadow: var(--mg-shadow-inset-sm); }
.tra-strip__dot b { position: relative; color: var(--mg-color-primary-strong); font-size: var(--mg-font-size-xs); font-weight: 800; }
@keyframes tra-fan { from { opacity: 0; transform: translateX(var(--dx)) scale(.55); } }
@keyframes tra-fold { to { opacity: 0; transform: translateX(var(--dx)) scale(.55); } }
@keyframes tra-hold { from { opacity: 1; } to { opacity: 1; } }
.tra-strip-leave-active { position: absolute; grid-area: auto; top: var(--mg-space-1); right: calc(var(--mg-space-2) + 2.1rem + var(--mg-space-1)); animation: tra-hold .32s both; pointer-events: none; }
.tra-strip-leave-active .tra-strip__day { animation: tra-fold .22s var(--mg-ease-standard) both; animation-delay: calc(var(--idx, 0) * 24ms); }
@media (prefers-reduced-motion: reduce) {
  .tra-strip__day, .tra-strip-leave-active .tra-strip__day { animation: none; }
  .tra-strip-leave-active { display: none; }
}
@media (max-width: 1100px) { .tra__stage-wrap { grid-template-columns: minmax(0, 1fr); } }
</style>
