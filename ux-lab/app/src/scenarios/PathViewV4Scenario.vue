<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppIcon from '@product/components/shared/AppIcon.vue'
import MomentsChart from '~lab/components/MomentsChart.vue'
import { cardsFor, skillColumns, skillsFor, statsFor, weeks, type Sample } from '~lab/lab/shamePath'
import {
  buttonVariants,
  flatSteps,
  MAIN_STEPS,
  onDemandPractices,
  phaseSteps,
  phaseTitle,
  phaseWhy,
  practiceStateWord,
  practiceTiles,
  RETURN_ON,
  RETURN_WEEK,
  sceneStates,
  shortTitle,
  stationLeft,
  stationWidth,
  stepIcon,
  stepLead,
  stepStateWord,
  threadAxis,
  usePathProgressV4,
  withSoftHyphens,
  type ButtonVariant,
  type FlatStep,
} from '~lab/lab/pathViewV4'

/**
 * Path view v4 (2026-11-17, round 8) — handoff `ideas/design_handoff_widok_sciezki`.
 * The phases as a THREAD of stations (well → title) and, under it,
 * three fields of the open phase planned to one height: what the phase is, its
 * steps (one card open), its two practices. Built on the real tokens and
 * anatomies; where the prototype's literals left the scale, the token won
 * (the list lives in the Lab notes of this scene).
 */
const route = useRoute()
const router = useRouter()
const pick = <T extends { id: string }>(list: readonly T[], value: unknown, fallback: string) => (list.some(item => item.id === value) ? String(value) : fallback)

const stateId = computed(() => pick(sceneStates, route.query.state, 'mid'))
const scene = computed(() => sceneStates.find(s => s.id === stateId.value)!)
const button = computed(() => pick(buttonVariants, route.query.button, 'cloud') as ButtonVariant)
const themes = [
  { id: 'sky-mist', label: 'Sky Mist' },
  { id: 'current', label: 'Current (domyślny produktu)' },
  { id: 'sunrise-cloud', label: 'Sunrise Cloud' },
]
const theme = computed(() => pick(themes, route.query.theme, 'sky-mist'))
watch(theme, value => document.documentElement.setAttribute('data-theme', value), { immediate: true })
onUnmounted(() => document.documentElement.removeAttribute('data-theme'))
const standalone = computed(() => Boolean(route.meta.standalone))
const previewHref = computed(() => {
  const query = new URLSearchParams(Object.entries(route.query).filter((pair): pair is [string, string] => typeof pair[1] === 'string'))
  const search = query.toString()
  return `/preview/path-view-v4${search ? `?${search}` : ''}`
})
function setQuery(key: string, value: string) {
  void router.replace({ query: { ...route.query, [key]: value } })
}

/* `done=N` in the URL overrides the preset (0–24): any step of the path can be put on screen. */
const doneQuery = computed(() => {
  const value = Number(route.query.done)
  return typeof route.query.done === 'string' && Number.isInteger(value) && value >= 0 && value <= MAIN_STEPS ? value : null
})
const done = ref(0)
const progress = usePathProgressV4(done)
const { closed, currentPhase } = progress
const open = ref(0)
const selected = ref(0)
const restartOpen = ref(false)
const measureOpen = ref(false)
const notice = ref('')

function openPhase(phase: number) {
  open.value = phase
  selected.value = progress.defaultStep(phase)
}
function reset() {
  done.value = doneQuery.value ?? scene.value.done
  openPhase(doneQuery.value === null ? (scene.value.open ?? currentPhase.value) : currentPhase.value)
  restartOpen.value = false
  measureOpen.value = false
  notice.value = ''
}
watch([stateId, doneQuery], reset, { immediate: true })

/* The thread */
const stations = computed(() =>
  weeks.map((week, index) => {
    const state = progress.phaseState(index)
    const completion = progress.phaseCompletion(index)
    const words = { done: 'zrobiona', current: 'bieżąca', later: 'przed Tobą', return: closed.value ? `od ${RETURN_ON}` : 'po zamknięciu ścieżki' }[state]
    return {
      index,
      key: week.key,
      state,
      title: withSoftHyphens(phaseTitle(index)),
      label: `${index === RETURN_WEEK ? '' : `Faza ${index + 1}: `}${phaseTitle(index)}, ${completion.done} z ${completion.total} kroków, ${words}`,
      style: { left: `${stationLeft(index)}%`, width: `${stationWidth(index)}%` },
      fill: `${Math.round((completion.done / completion.total) * 100)}%`,
    }
  })
)
const axis = computed(() => threadAxis(currentPhase.value, closed.value))
const padStyle = computed(() => ({ left: `calc(${stationLeft(open.value)}% + 4px)`, width: `calc(${stationWidth(open.value)}% - 8px)` }))

/* The three fields of the open phase */
const openSteps = computed(() =>
  phaseSteps(open.value).map(step => {
    const state = progress.stepState(step.index)
    return { step, state, icon: stepIcon(step), word: stepStateWord[state], name: withSoftHyphens(shortTitle(step)) }
  })
)
const tiles = computed(() => practiceTiles(open.value, done.value))

/* Lower row */
const onDemand = computed(() => onDemandPractices(done.value))
const dataSample = computed<Sample>(() => (done.value === 0 ? 'start' : closed.value ? 'completed' : 'mid'))
const stats = computed(() => statsFor(dataSample.value))
const hasMoments = computed(() => stats.value.some(week => week.total > 0))
const skills = computed(() => skillsFor(dataSample.value))
const phaseKey = computed(() => weeks[currentPhase.value]!.key)
const cards = computed(() => cardsFor(phaseKey.value).filter(card => card.pinned || card.phaseKeys.includes(phaseKey.value)).slice(0, 2))
const format = (n: number) => n.toFixed(1).replace('.', ',')
const lastIndex = (points: (number | null)[]) => points.map((p, i) => (p === null ? -1 : i)).filter(i => i >= 0).at(-1)
const pos = (row: { min: number; max: number }, value: number) => `${((value - row.min) / (row.max - row.min)) * 100}%`

/* Lab-only behaviour: "Rozpocznij" marks the step done, so every state can be walked. */
function advance(step: FlatStep, verb: string) {
  if (step.index !== progress.currentIndex.value) return
  done.value += 1
  openPhase(currentPhase.value)
  notice.value = `Podgląd w Labie: ${verb} „${step.title}”. W produkcie „Rozpocznij” otwiera ćwiczenie.`
}
/* Only the most recent completion can be taken back — the path stays linear. */
function undo(step: FlatStep) {
  if (step.index !== done.value - 1) return
  done.value -= 1
  openPhase(currentPhase.value)
  notice.value = `Cofnięto ukończenie „${step.title}”. Wpis ćwiczenia zostaje w historii.`
}
function restart() {
  done.value = 0
  openPhase(0)
  restartOpen.value = false
  notice.value = 'Ścieżka ruszyła od pierwszego kroku. Ukończone ćwiczenia zostają w historii.'
}
function simulate(what: string) {
  notice.value = `Podgląd w Labie: „${what}”.`
}
</script>

<template>
  <section class="scenario-page pv4 mg-design-v2" :class="{ 'pv4--standalone': standalone }">
    <header v-if="!standalone" class="concept-heading">
      <div>
        <span class="lab-eyebrow">Ścieżki · widok ścieżki „Ze wstydu do współczucia” · runda 8e · 21.11.2026</span>
        <h1>Nić stacji i trzy pola otwartej fazy</h1>
        <p>
          Kierunek B z kanwy (handoff 17.11) na prawdziwych tokenach, po uwagach z 21.11: fazy to stacje na jednej nici, pod nią trzy pola
          jednej wysokości — opis fazy, kroki jako kafle ze studnią i ikoną (jeden rozwinięty) i dwie praktyki. Decyzje i otwarte pytania
          są w notatkach sceny.
        </p>
      </div>
      <span class="status-badge status-badge--experiment">Propozycja do oceny · runda 8e</span>
    </header>

    <div v-if="!standalone" class="pv4__toolbar" aria-label="Ustawienia sceny">
      <label
        >Stan
        <select :value="stateId" @change="setQuery('state', ($event.target as HTMLSelectElement).value)">
          <option v-for="s in sceneStates" :key="s.id" :value="s.id">{{ s.label }}</option>
        </select></label
      >
      <label
        >Przycisk główny
        <select :value="button" @change="setQuery('button', ($event.target as HTMLSelectElement).value)">
          <option v-for="b in buttonVariants" :key="b.id" :value="b.id">{{ b.label }}</option>
        </select></label
      >
      <label
        >Motyw
        <select :value="theme" @change="setQuery('theme', ($event.target as HTMLSelectElement).value)">
          <option v-for="t in themes" :key="t.id" :value="t.id">{{ t.label }}</option>
        </select></label
      >
      <a class="pv4__tool pv4__tool--end" :href="previewHref" target="_blank" rel="noopener">Podgląd 1:1 bez pasków Laba ↗</a>
      <button type="button" class="pv4__tool" @click="reset">Przywróć stan</button>
    </div>

    <div class="pv4__stage">
      <div class="pv" lang="pl">
        <header class="mg-v2-page-head mg-v2-page-head--icon pv__head">
          <button type="button" class="mg-v2-button mg-v2-button--quiet mg-v2-button--icon" aria-label="Wróć do ćwiczeń"><AppIcon name="arrow_back" /></button>
          <span class="mg-v2-icon-board"><AppIcon name="mg-exercise-compassionate-image" /></span>
          <h1 class="mg-v2-page-head__title">Ze wstydu do współczucia</h1>
          <button type="button" class="mg-v2-button mg-v2-button--quiet mg-v2-button--icon" aria-label="Więcej" @click="simulate('Więcej: Wstrzymaj · Porzuć (bez zmian wobec produktu)')">
            <AppIcon name="more_horiz" />
          </button>
        </header>

        <!-- Twoja droga: the thread of stations, then three fields of the open phase -->
        <section class="mg-v2-surface mg-v2-surface--raised-sm card" aria-label="Twoja droga">
          <header class="card__head">
            <span class="card__eyebrow">Twoja droga</span>
            <button type="button" class="word" :aria-expanded="restartOpen" @click="restartOpen = !restartOpen">Od nowa</button>
          </header>
          <div v-if="restartOpen" class="confirm" role="group" aria-label="Zacząć od nowa?">
            <span>Zacząć ścieżkę od pierwszego kroku? Ukończone ćwiczenia zostają w historii.</span>
            <button type="button" class="mg-v2-button" @click="restart">Zacznij od nowa</button>
            <button type="button" class="mg-v2-button mg-v2-button--quiet" @click="restartOpen = false">Zostaw</button>
          </div>

          <div class="strip">
            <!-- The walked part of the path (user's pick, 2026-11-21): the axis of the goal / priority cards
                 (.mg-v2-timeline) — a soft track the stations sit on, filled with a light sky up to the current
                 station and dissolving toward Powrót. No line, no dashes. -->
            <span class="mg-v2-timeline strip__axis" aria-hidden="true" :style="{ left: `${axis.left}%`, width: `${axis.width}%`, '--axis-solid': `${axis.solid}%` }">
              <span class="mg-v2-timeline__cloud"><span class="mg-v2-timeline__fill" :style="{ '--mg-timeline-progress': `calc(${axis.reached}% + 1.25rem)` }" /></span>
            </span>
            <span class="strip__pad" aria-hidden="true" :style="padStyle" />
            <span v-if="closed || open !== RETURN_WEEK" class="strip__note" aria-hidden="true" :style="{ left: `calc(${stationLeft(RETURN_WEEK - 1) + stationWidth(RETURN_WEEK - 1)}% + 6px)` }">{{ closed ? RETURN_ON : '8 tyg. później' }}</span>
            <button
              v-for="s in stations"
              :key="s.key"
              type="button"
              class="stn"
              :class="[`stn--${s.state}`, { 'is-open': open === s.index, 'is-next': s.state === 'return' && closed }]"
              :style="s.style"
              :aria-expanded="open === s.index"
              aria-controls="pv4-fields"
              :aria-label="s.label"
              @click="openPhase(s.index)"
            >
              <span class="mg-well stn__well" :class="{ 'mg-well--done': s.state === 'done' }" :style="s.state === 'current' ? { '--fill': s.fill } : undefined">
                <AppIcon v-if="s.state === 'return'" name="replay" />
                <template v-else-if="s.state !== 'done'">{{ s.index + 1 }}</template>
              </span>
              <span class="stn__title">{{ s.title }}</span>
            </button>
          </div>

          <div id="pv4-fields" class="fields">
            <section class="mg-v2-surface mg-v2-surface--flat f-desc" aria-label="O fazie">
              <header class="f-desc__head">
                <span class="mg-v2-icon-board f-desc__mark" aria-hidden="true"><AppIcon v-if="open === RETURN_WEEK" name="replay" /><template v-else>{{ open + 1 }}</template></span>
                <h2 class="f-desc__title">{{ phaseTitle(open) }}</h2>
              </header>
              <p class="f-desc__why">{{ phaseWhy(open) }}</p>
            </section>

            <section class="mg-v2-surface mg-v2-surface--flat f-steps" aria-label="Kroki">
              <span class="eyebrow f-hd">Kroki</span>
              <div class="steps">
                <div
                  v-for="item in openSteps"
                  :key="item.step.index"
                  class="st"
                  :class="[`st--${item.state}`, { 'is-open': item.step.index === selected }]"
                  :role="item.step.index === selected ? 'group' : undefined"
                  :aria-label="item.step.index === selected ? `${item.step.title}, ${item.word}` : undefined"
                >
                  <!-- Closed: the whole tile is the button that opens it. -->
                  <button v-if="item.step.index !== selected" type="button" class="st__open" aria-expanded="false" :aria-label="`${item.step.title}, ${item.word}`" @click="selected = item.step.index" />
                  <!-- The tile itself never changes: the well with the step's icon, the name under it.
                       In the open step the well IS the action: under the cursor (or in focus) it grows into the button. -->
                  <div class="st__tile">
                    <button v-if="item.step.index === selected && item.state === 'current'" type="button" class="mg-well swell swell--current go" :class="`go--${button}`" @click="advance(item.step, 'ukończono')">
                      <AppIcon :name="item.icon" /><span class="go__label">Rozpocznij</span>
                    </button>
                    <button v-else-if="item.step.index === selected && item.state === 'done'" type="button" class="mg-well mg-well--done swell go go--plain" @click="simulate(`Otwórz wpis: ${item.step.title}`)">
                      <AppIcon :name="item.icon" /><span class="go__label">Otwórz wpis</span>
                    </button>
                    <span v-else class="mg-well swell" :class="[`swell--${item.state}`, { 'mg-well--done': item.state === 'done' }]"><AppIcon :name="item.icon" /></span>
                    <span class="st__name">{{ item.name }}</span>
                  </div>
                  <!-- The space the open tile makes to its right: one sentence, and a quiet word where one is needed. -->
                  <div class="st__desc" :aria-hidden="item.step.index !== selected">
                    <div class="st__desc-in">
                      <p class="st__lead">{{ stepLead[item.step.index] }}</p>
                      <template v-if="item.step.index === selected">
                        <button v-if="item.state === 'current' && item.step.optional" type="button" class="word" @click="advance(item.step, 'pominięto')">Pomiń</button>
                        <button v-else-if="item.state === 'done' && item.step.index === done - 1" type="button" class="word" @click="undo(item.step)">Cofnij</button>
                      </template>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section class="mg-v2-surface mg-v2-surface--flat f-prac" aria-label="Praktyki">
              <span class="eyebrow f-hd">Praktyki</span>
              <div class="ptiles">
                <component
                  :is="tile.state === 'later' ? 'div' : 'button'"
                  v-for="tile in tiles"
                  :key="tile.def.slug"
                  :type="tile.state === 'later' ? undefined : 'button'"
                  class="ptile"
                  :class="`ptile--${tile.state}`"
                  :aria-label="tile.state === 'later' ? undefined : `${tile.def.action}: ${tile.def.title}, ${practiceStateWord[tile.state]}`"
                  @click="tile.state !== 'later' && simulate(`${tile.def.action}: ${tile.def.title}`)"
                >
                  <span class="mg-v2-icon-board ptile__icon"><AppIcon :name="tile.def.icon" /></span>
                  <strong class="ptile__name">{{ tile.def.title }}</strong>
                </component>
              </div>
            </section>
          </div>
        </section>

        <div class="pv__lower">
          <div class="pv__col">
            <!-- What the path handed over earlier and does not ask for right now -->
            <section v-if="onDemand.length" class="mg-v2-surface mg-v2-surface--raised-sm card" :aria-label="closed ? 'Zostaje z Tobą' : 'Na żądanie'">
              <header class="card__head"><span class="card__eyebrow">{{ closed ? 'Zostaje z Tobą' : 'Na żądanie' }}</span></header>
              <div class="od">
                <button v-for="def in onDemand" :key="def.slug" type="button" class="ptile ptile--tool" :aria-label="`${def.action}: ${def.title}`" @click="simulate(`${def.action}: ${def.title}`)">
                  <span class="mg-v2-icon-board ptile__icon"><AppIcon :name="def.icon" /></span>
                  <strong class="ptile__name">{{ def.title }}</strong>
                </button>
              </div>
            </section>

            <section v-if="cards.length" class="mg-v2-surface mg-v2-surface--raised-sm card" aria-label="Warto wiedzieć">
              <header class="card__head"><span class="card__eyebrow">Warto wiedzieć</span><button type="button" class="word" @click="simulate('Wszystkie artykuły')">Wszystkie</button></header>
              <div class="kn">
                <button v-for="c in cards" :key="c.key" type="button" class="kn__tile" @click="simulate(c.title)">
                  <span class="mg-v2-icon-board kn__icon"><AppIcon name="menu_book" /></span>
                  <strong>{{ c.title }}</strong>
                </button>
              </div>
            </section>
          </div>

          <!-- Postęp: unchanged from round 7b -->
          <section class="mg-v2-surface mg-v2-surface--raised-sm card" aria-label="Postęp">
            <header class="card__head"><span class="card__eyebrow">Postęp</span></header>
            <div class="blk">
              <header class="blk__head"><span class="eyebrow">Części</span></header>
              <MomentsChart v-if="hasMoments" variant="columns" :stats="stats" :slots="8" />
              <p v-else class="blk__empty">Jeszcze bez Momentów.</p>
            </div>
            <div class="blk">
              <header class="blk__head">
                <span class="eyebrow">Pomiar</span>
                <button type="button" class="word" :aria-expanded="measureOpen" @click="measureOpen = !measureOpen">{{ measureOpen ? 'Mniej' : 'Szczegóły' }}</button>
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
                  <span role="rowheader">{{ row.name }}</span>
                  <span v-for="(p, i) in row.points" :key="i" class="sk__td" :class="{ 'is-pending': p === null }" role="cell">{{ p === null ? '·' : format(p) }}</span>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>

    <p v-if="notice" class="pv4__notice" role="status">
      <span>{{ notice }}</span>
      <button type="button" class="mg-v2-button mg-v2-button--quiet mg-v2-button--icon mg-v2-button--icon-sm" aria-label="Zamknij" @click="notice = ''"><AppIcon name="close" /></button>
    </p>
    <p v-if="!standalone" class="pv4__hint">Stan sceny żyje w pamięci Labu ({{ done }} z {{ MAIN_STEPS }} kroków, {{ flatSteps.length }} z Powrotem); „Rozpocznij” i „Pomiń” przesuwają ścieżkę o krok.</p>
  </section>
</template>

<style scoped>
/* Candidate roles — the system does not have them yet. On a port they move to
   src/design-system/tokens.css (built from primitives there, never in a view)
   with an entry in docs/design-decisions.md; the view keeps only the names. */
.pv4 {
  --mg-color-cta-cloud-top: color-mix(in srgb, rgb(var(--sky-100)) 70%, rgb(var(--sky-200)));
  --mg-color-cta-cloud-base: color-mix(in srgb, rgb(var(--sky-200)) 60%, rgb(var(--sky-300)));
  --mg-color-cta-cloud-top-hover: color-mix(in srgb, rgb(var(--sky-100)) 45%, rgb(var(--sky-200)));
  --mg-color-cta-cloud-base-hover: color-mix(in srgb, rgb(var(--sky-200)) 35%, rgb(var(--sky-300)));
  --mg-color-cta-cloud-ink: color-mix(in srgb, rgb(var(--sky-700)) 70%, rgb(var(--sky-800)));
  --mg-color-cta-ink: rgb(var(--sky-700));
  --mg-color-cta-ink-hover: color-mix(in srgb, rgb(var(--sky-700)) 80%, rgb(var(--sky-800)));
  --mg-shadow-cta-cloud: inset 0 1px 0 rgb(255 255 255 / 0.85), var(--mg-shadow-control);
  --mg-shadow-cta-cloud-hover: inset 0 1px 0 rgb(255 255 255 / 0.85), var(--mg-shadow-control-hover);
}

/* ── Lab chrome ── */
.pv4 { min-width: 0; padding-bottom: var(--mg-space-8); color: var(--mg-color-ink); }
.pv4__toolbar { display: flex; flex-wrap: wrap; align-items: end; gap: var(--mg-space-3); margin-bottom: var(--mg-space-4); padding: var(--mg-space-3) var(--mg-space-4); border-radius: var(--mg-radius-md); background: var(--mg-color-paper); box-shadow: var(--mg-shadow-raised-sm); }
.pv4__toolbar label { display: grid; gap: var(--mg-space-1); color: var(--mg-color-muted); font-size: var(--mg-font-size-xs); font-weight: var(--mg-weight-title); }
.pv4__toolbar select { min-height: 2.125rem; padding: 0 var(--mg-space-6) 0 var(--mg-space-2); border: 1px solid var(--mg-color-field-border); border-radius: var(--mg-radius-sm); background: var(--mg-color-mist); color: var(--mg-color-ink); font: inherit; font-size: var(--mg-font-size-xs); font-weight: var(--mg-weight-strong); }
.pv4__tool { display: inline-flex; align-items: center; min-height: 2.125rem; padding: 0 var(--mg-space-3); border: 1px solid var(--mg-color-border); border-radius: var(--mg-radius-sm); background: var(--mg-color-mist); color: var(--mg-color-primary-strong); font: inherit; font-size: var(--mg-font-size-xs); font-weight: var(--mg-weight-title); text-decoration: none; cursor: pointer; }
.pv4__tool--end { margin-left: auto; }
.pv4__stage { padding: var(--mg-space-6) var(--mg-space-5) var(--mg-space-8); border: 1px solid var(--mg-color-border); border-radius: var(--mg-radius-xl); background: var(--mg-color-canvas); }
.pv4--standalone { width: auto; min-height: 100vh; padding: 28px 32px 48px 104px; background: var(--mg-color-canvas); }
.pv4--standalone .pv4__stage { padding: 0; border: 0; border-radius: 0; background: transparent; }
.pv4--standalone .pv { max-width: 1600px; margin: 0; }
.pv4__notice { position: fixed; bottom: var(--mg-space-5); left: 50%; z-index: 8; display: flex; align-items: center; gap: var(--mg-space-3); max-width: 38rem; margin: 0; padding: var(--mg-space-2) var(--mg-space-2) var(--mg-space-2) var(--mg-space-4); border: 1px solid var(--mg-color-border); border-radius: var(--mg-radius-md); background: var(--mg-color-paper); box-shadow: var(--mg-shadow-raised); font-size: var(--mg-font-size-xs); transform: translateX(-50%); }
.pv4__hint { margin: var(--mg-space-3) 0 0; color: var(--mg-color-muted); font-size: var(--mg-font-size-xs); }
.pv4 :focus-visible { outline: 2px solid var(--mg-color-focus); outline-offset: 2px; }

/* ── Page ── */
.pv { --tile: 8rem; container: pv / inline-size; max-width: 1180px; margin: 0 auto; font-family: var(--mg-font-sans); font-size: var(--mg-font-size-md); line-height: 1.4; }
.pv__head :deep(.mg-v2-button .app-icon) { font-size: var(--mg-font-size-icon-lg); }
/* Backlog B-16: `.mg-design-v2 button { font: inherit }` outranks `.mg-v2-button`, so on a <button> the anatomy
   loses the size and weight it declares. The scene restores them (the way program-path.css does for .pp-chip). */
.pv .mg-v2-button { font-size: var(--mg-font-size-sm); font-weight: var(--mg-weight-title); }
.card { min-width: 0; padding: var(--mg-space-5) var(--mg-space-6) var(--mg-space-6); }
.card__head { display: flex; align-items: baseline; justify-content: space-between; gap: var(--mg-space-4); margin-bottom: var(--mg-space-3); }
.card__eyebrow { color: var(--mg-color-primary-strong); font-size: var(--mg-font-size-xs); font-weight: var(--mg-weight-title); letter-spacing: 0.1em; text-transform: uppercase; }
.eyebrow { color: var(--mg-color-muted); font-size: var(--mg-font-size-xs); font-weight: var(--mg-weight-title); letter-spacing: 0.1em; text-transform: uppercase; }
/* An action said as a word (Od nowa, Zapisz, Wszystkie): the accent ink of interactive labels. */
.word { padding: 0; border: 0; background: none; color: var(--mg-color-primary-strong); font: inherit; font-size: var(--mg-font-size-sm); font-weight: var(--mg-weight-strong); white-space: nowrap; }
button.word { cursor: pointer; }
button.word:hover { text-decoration: underline; }
.confirm { display: flex; flex-wrap: wrap; align-items: center; gap: var(--mg-space-2); margin-bottom: var(--mg-space-3); padding: var(--mg-space-2) var(--mg-space-2) var(--mg-space-2) var(--mg-space-4); border-radius: var(--mg-radius-md); background: var(--mg-color-mist); box-shadow: var(--mg-shadow-nested); font-size: var(--mg-font-size-sm); font-weight: var(--mg-weight-label); }
.confirm > span { flex: 1 1 18rem; }

/* ── The thread: stations on one line; the open one stands on a raised cloud (paper + the control's
   shadow, no outline — selection is said with height, not with a frame). A station is the
   app's own well (.mg-well): a done phase is the same done dot as a finished task in "Dzisiaj". ── */
.strip { --strip-pad: 0.625rem; --strip-well: 2.75rem; position: relative; height: 6.75rem; }
.strip__pad { position: absolute; top: -2px; bottom: -4px; z-index: 0; border: 1px solid var(--mg-color-border); border-radius: var(--mg-radius-lg); background: var(--mg-color-paper); box-shadow: var(--mg-shadow-control); transition: left var(--mg-duration-normal) var(--mg-ease-standard), width var(--mg-duration-normal) var(--mg-ease-standard); }
/* The walked path: the shared axis anatomy laid under the wells; solid to station 8, dissolving after it.
   Its fill is one step lighter than on the goal cards (the soft state blue, through the anatomy's own variable). */
.strip__axis { --mg-timeline-sky: var(--mg-color-state-soft); position: absolute; top: calc(var(--strip-pad) + var(--strip-well) / 2 - 0.5rem); z-index: 0; display: block; height: 1rem; -webkit-mask: linear-gradient(90deg, #000 calc(var(--axis-solid) + 1.5rem), transparent 100%); mask: linear-gradient(90deg, #000 calc(var(--axis-solid) + 1.5rem), transparent 100%); }
.strip__note { position: absolute; top: calc(var(--strip-pad) + var(--strip-well) / 2 - 1.5rem); z-index: 1; color: var(--mg-color-muted); font-size: var(--mg-font-size-xs); line-height: 1.2; white-space: nowrap; }
.stn { position: absolute; top: var(--strip-pad); z-index: 2; display: block; padding: 0; border: 0; border-radius: var(--mg-radius-lg); background: none; color: var(--mg-color-ink); font: inherit; text-align: center; cursor: pointer; }
/* The tone sits on an opaque ground so the axis never shows through the well. */
.stn__well { --mg-well-size: var(--strip-well); --well-ground: var(--mg-color-canvas); margin: 0 auto; background: var(--well-ground); color: var(--mg-color-muted); font-size: var(--mg-font-size-md); font-weight: var(--mg-weight-strong); line-height: 1; transition: background var(--mg-duration-fast) var(--mg-ease-standard); }
.stn__well :deep(.app-icon) { font-size: var(--mg-font-size-icon-md); }
.stn--done .stn__well { background: linear-gradient(var(--mg-color-sky-field), var(--mg-color-sky-field)) var(--mg-color-surface); }
.stn--current .stn__well { --mg-well-size: calc(var(--strip-well) + 0.5rem); margin: -0.25rem auto; border: 2px solid var(--mg-color-primary); background: linear-gradient(90deg, var(--mg-color-sky-field) var(--fill, 0%), transparent var(--fill, 0%)) var(--well-ground); box-shadow: var(--mg-shadow-inset-sm), var(--mg-shadow-current-ring); color: var(--mg-color-primary-strong); font-size: var(--mg-font-size-lg); font-weight: var(--mg-weight-title); }
.stn__title { display: block; min-height: 2.4em; margin: 0.625rem var(--mg-space-2) 0; font-size: var(--mg-font-size-md); font-weight: var(--mg-weight-strong); line-height: 1.2; hyphens: manual; transition: color var(--mg-duration-fast) var(--mg-ease-standard); }
.stn--later .stn__title, .stn--return .stn__title { color: var(--mg-color-muted); font-weight: var(--mg-weight-label); }
.stn.is-open .stn__title { color: var(--mg-color-ink); font-weight: var(--mg-weight-title); }
.stn--return { opacity: 0.66; }
.stn--return.is-open, .stn--return.is-next { opacity: 1; }
/* Hover: the well one step whiter, the title in the accent ink; no lift. */
.stn:hover .stn__well { --well-ground: var(--mg-color-paper); }
.stn--done:hover .stn__well { background: linear-gradient(var(--mg-color-sky-well), var(--mg-color-sky-well)) var(--mg-color-paper); }
.stn:hover .stn__title { color: var(--mg-color-primary-strong); }

/* ── Three fields of the open phase, planned to ONE height: nothing is pinned to opposite
   edges, every group stands together and is centred, so spare pixels read as padding. ── */
.fields { display: flex; flex-wrap: wrap; align-items: stretch; gap: var(--mg-space-4); margin-top: var(--mg-space-4); }
.f-hd { display: block; margin: var(--mg-space-1) var(--mg-space-2) var(--mg-space-2); }
/* The phase: its number in an icon field, its name, one sentence. No counters — the step tiles show progress. */
.f-desc { display: flex; flex: 0 0 15rem; flex-direction: column; justify-content: center; gap: var(--mg-space-3); min-height: 11rem; padding: var(--mg-space-3) var(--mg-space-5); }
.f-desc__head { display: flex; align-items: center; gap: var(--mg-space-3); }
.f-desc__mark { --mg-icon-board-size: 2.75rem; font-size: var(--mg-font-size-lg); font-weight: var(--mg-weight-title); line-height: 1; }
.f-desc__mark :deep(.app-icon) { font-size: var(--mg-font-size-icon-md); }
.f-desc__title { margin: 0; font-size: var(--mg-font-size-lg); font-weight: var(--mg-weight-title); line-height: 1.2; }
.f-desc__why { margin: 0; color: var(--mg-color-muted); font-size: var(--mg-font-size-md); line-height: 1.45; }

.f-steps { display: flex; flex: 999 1 44rem; flex-direction: column; min-width: 0; padding: var(--mg-space-3); }
.steps { display: flex; flex: 1; flex-wrap: wrap; align-items: stretch; gap: var(--mg-space-2); min-height: 7.5rem; }
/* A step's well: the app's .mg-well carrying the step's icon. Not done = the outer circle and the icon;
   done = the done dot of "Dzisiaj" with the icon inverted on it (as on a checked item of a checklist row). */
.swell { --mg-well-size: 2.75rem; color: var(--mg-color-muted); }
.swell::after { grid-area: 1 / 1; }
.swell :deep(.app-icon) { position: relative; z-index: 1; grid-area: 1 / 1; font-size: var(--mg-font-size-icon-sm); }
.swell.mg-well--done { color: var(--mg-color-on-primary); }
.swell--current { border-color: var(--mg-color-primary); box-shadow: var(--mg-shadow-inset-sm), var(--mg-shadow-current-ring); color: var(--mg-color-primary-strong); }
/* A step is ONE tile in the anatomy of the Kompas tiles in "Dzisiaj": the well on top, the name under it.
   Opening a step does not change the tile — it widens to the right and the new space holds its sentence. */
.st { position: relative; display: grid; flex: 0 0 var(--tile); grid-template-columns: calc(var(--tile) - 2px) minmax(0, 0fr); min-width: 0; border: 1px solid var(--mg-color-border); border-radius: var(--mg-radius-md); background: var(--mg-color-paper); box-shadow: var(--mg-shadow-control); color: var(--mg-color-ink); transition: flex-grow var(--mg-duration-normal) var(--mg-ease-standard), grid-template-columns var(--mg-duration-normal) var(--mg-ease-standard), box-shadow var(--mg-duration-fast) var(--mg-ease-standard), translate var(--mg-duration-fast) var(--mg-ease-standard); }
.st.is-open { flex-grow: 1; grid-template-columns: calc(var(--tile) - 2px) minmax(0, 1fr); }
.st--current.is-open { box-shadow: var(--mg-shadow-current-ring), var(--mg-shadow-control); }
.st:not(.is-open):hover { box-shadow: var(--mg-shadow-control-hover); translate: 0 var(--mg-lift-hover); }
.st:not(.is-open):has(.st__open:active) { box-shadow: var(--mg-shadow-inset-sm); translate: none; }
.st__open { position: absolute; inset: 0; z-index: 2; padding: 0; border: 0; border-radius: inherit; background: none; cursor: pointer; }
.st__tile { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: var(--mg-space-2); min-width: 0; padding: var(--mg-space-3) var(--mg-space-2); text-align: center; }
.st__name { display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 3; overflow: hidden; max-width: 100%; min-height: 2.5em; font-size: var(--mg-font-size-sm); font-weight: var(--mg-weight-strong); line-height: 1.25; hyphens: manual; overflow-wrap: anywhere; }
.st--later .st__name { color: var(--mg-color-muted); font-weight: var(--mg-weight-label); }
/* The sentence appears once the tile has finished widening, and leaves before it narrows. */
.st__desc { min-width: 0; overflow: hidden; contain: size; opacity: 0; transition: opacity 80ms linear; }
.st.is-open .st__desc { opacity: 1; transition: opacity var(--mg-duration-fast) var(--mg-ease-standard) var(--mg-duration-normal); }
.st__desc-in { display: flex; flex-direction: column; align-items: flex-start; justify-content: center; gap: var(--mg-space-1); box-sizing: border-box; height: calc(100% - 2 * var(--mg-space-3)); margin: var(--mg-space-3) 0; padding: 0 var(--mg-space-4); border-left: 1px solid var(--mg-color-border); }
.st__lead { margin: 0; font-size: var(--mg-font-size-md); line-height: 1.45; }

/* ── The action grows out of the well. At rest the open step shows its well, exactly like every other
   tile; under the cursor (anywhere on the open tile) or in keyboard focus the well widens into the button
   and its label takes the icon's place. The well is the button all along, so a click works at any moment. ── */
.go { --go-width: 6.75rem; cursor: pointer; font: inherit; font-size: var(--mg-font-size-sm); font-weight: var(--mg-weight-title); white-space: nowrap; transition: width var(--mg-duration-normal) var(--mg-ease-standard), border-radius var(--mg-duration-normal) var(--mg-ease-standard), border-color var(--mg-duration-fast) var(--mg-ease-standard), box-shadow var(--mg-duration-fast) var(--mg-ease-standard); }
.go::before { position: absolute; inset: -1px; z-index: 0; border-radius: inherit; opacity: 0; content: ''; transition: opacity var(--mg-duration-fast) var(--mg-ease-standard), box-shadow var(--mg-duration-fast) var(--mg-ease-standard); }
.go::after, .go :deep(.app-icon) { transition: opacity var(--mg-duration-fast) var(--mg-ease-standard); }
.go__label { position: absolute; inset: 0; z-index: 1; display: grid; place-items: center; opacity: 0; pointer-events: none; transition: opacity var(--mg-duration-fast) var(--mg-ease-standard); }
.st.is-open:hover .go, .go:focus-visible { width: var(--go-width); border-color: transparent; border-radius: var(--mg-radius-lg); box-shadow: var(--mg-shadow-inset-sm); }
.st.is-open:hover .go::before, .go:focus-visible::before { opacity: 1; }
.st.is-open:hover .go::after, .go:focus-visible::after, .st.is-open:hover .go :deep(.app-icon), .go:focus-visible :deep(.app-icon) { opacity: 0; }
.st.is-open:hover .go__label, .go:focus-visible .go__label { opacity: 1; transition-delay: 80ms; }
/* Chmura: a slightly convex pebble within one light blue, a hairline of light on top. */
.go--cloud::before { background: linear-gradient(180deg, var(--mg-color-cta-cloud-top), var(--mg-color-cta-cloud-base)); box-shadow: var(--mg-shadow-cta-cloud); }
.go--cloud:hover::before { background: linear-gradient(180deg, var(--mg-color-cta-cloud-top-hover), var(--mg-color-cta-cloud-base-hover)); box-shadow: var(--mg-shadow-cta-cloud-hover); }
.go--cloud .go__label { color: var(--mg-color-cta-cloud-ink); }
.go--ink::before { background: var(--mg-color-cta-ink); box-shadow: var(--mg-shadow-control); }
.go--ink:hover::before { background: var(--mg-color-cta-ink-hover); box-shadow: var(--mg-shadow-control-hover); }
.go--fill::before { background: var(--mg-color-primary-fill); box-shadow: var(--mg-shadow-control); }
.go--fill:hover::before { background: var(--mg-color-primary-fill-hover); box-shadow: var(--mg-shadow-control-hover); }
.go--ink .go__label, .go--fill .go__label { color: var(--mg-color-on-primary); }
/* A done step's entry: the quiet version of the same button. */
.go--plain::before { background: var(--mg-color-paper); box-shadow: var(--mg-shadow-control); }
.go--plain:hover::before { box-shadow: var(--mg-shadow-control-hover); }
.go--plain .go__label { color: var(--mg-color-primary-strong); }
.go:active::before { box-shadow: var(--mg-shadow-inset-sm); }

/* ── Praktyki: always two tiles, in the geometry of the step tiles and with no notes — but the icon
   sits in an icon field (a tool you come back to), not in a well (a thing you finish). ── */
.f-prac { display: flex; flex: 0 0 auto; flex-direction: column; min-width: 0; padding: var(--mg-space-3); }
.ptiles { display: grid; flex: 1; grid-template-columns: repeat(2, var(--tile)); gap: var(--mg-space-2); }
.ptile { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: var(--mg-space-2); min-width: 0; padding: var(--mg-space-3) var(--mg-space-2); border: 1px solid var(--mg-color-border); border-radius: var(--mg-radius-md); background: var(--mg-color-paper); box-shadow: var(--mg-shadow-control); color: var(--mg-color-ink); font: inherit; text-align: center; transition: background var(--mg-duration-fast) var(--mg-ease-standard), box-shadow var(--mg-duration-fast) var(--mg-ease-standard), translate var(--mg-duration-fast) var(--mg-ease-standard); }
button.ptile { cursor: pointer; }
button.ptile:hover { background: var(--mg-color-paper); box-shadow: var(--mg-shadow-control-hover); translate: 0 var(--mg-lift-hover); }
button.ptile:active { box-shadow: var(--mg-shadow-inset-sm); translate: none; }
.ptile__icon { --mg-icon-board-size: 2.75rem; }
.ptile__icon :deep(.app-icon), .kn__icon :deep(.app-icon) { font-size: var(--mg-font-size-icon-md); }
.ptile__name { display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 3; overflow: hidden; max-width: 100%; min-height: 2.5em; font-size: var(--mg-font-size-sm); font-weight: var(--mg-weight-strong); line-height: 1.25; overflow-wrap: anywhere; }
/* Handed over earlier, no longer asked for: a quieter cloud, still a button. */
.ptile--demand { background: color-mix(in srgb, var(--mg-color-paper) 55%, transparent); box-shadow: var(--mg-shadow-nested); }
/* Not yet: the ghost grammar (.mg-v2-ghost) — a faded cloud, no shadow, not a button. No dashes. */
.ptile--later { border-color: transparent; background: color-mix(in srgb, var(--mg-color-paper) 55%, transparent); box-shadow: none; opacity: 0.85; }
.ptile--demand .ptile__name, .ptile--later .ptile__name { color: var(--mg-color-muted); font-weight: var(--mg-weight-label); }
/* A tool on a first-level card ("Na żądanie"): the same tile, one ladder step lower (mist; paper under the cursor). */
.ptile--tool { min-height: 7rem; background: var(--mg-color-mist); }

/* ── Lower row ── */
.pv__lower { display: grid; grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr); align-items: start; gap: var(--mg-space-6); margin-top: var(--mg-space-6); }
.pv__col { display: grid; gap: var(--mg-space-6); min-width: 0; }
/* The growing collection: tiles of the practice module, left-aligned, never stretched. */
.od { display: grid; grid-template-columns: repeat(auto-fill, var(--tile)); gap: var(--mg-space-2); }
.kn { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--mg-space-3); }
.kn__tile { display: flex; align-items: center; gap: var(--mg-space-3); padding: var(--mg-space-3) var(--mg-space-4) var(--mg-space-3) var(--mg-space-3); border: 1px solid var(--mg-color-border); border-radius: var(--mg-radius-md); background: var(--mg-color-mist); box-shadow: var(--mg-shadow-control); color: var(--mg-color-ink); font: inherit; text-align: left; cursor: pointer; transition: background var(--mg-duration-fast) var(--mg-ease-standard), box-shadow var(--mg-duration-fast) var(--mg-ease-standard), translate var(--mg-duration-fast) var(--mg-ease-standard); }
.kn__tile:hover { background: var(--mg-color-paper); box-shadow: var(--mg-shadow-control-hover); translate: 0 var(--mg-lift-hover); }
.kn__tile:active { box-shadow: var(--mg-shadow-inset-sm); translate: none; }
.kn__icon { --mg-icon-board-size: 2.125rem; }
.kn__tile strong { font-size: var(--mg-font-size-sm); font-weight: var(--mg-weight-strong); line-height: 1.3; }

/* Postęp (round 7b; blocks rest on the nested shadow since 2026-11-14). */
.blk { display: grid; gap: 6px; padding: var(--mg-space-3) var(--mg-space-4); border-radius: var(--mg-radius-md); background: var(--mg-color-mist); box-shadow: var(--mg-shadow-nested); }
.blk + .blk { margin-top: var(--mg-space-3); }
.blk__head { display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 2px; }
.blk__empty { margin: 0; color: var(--mg-color-muted); font-size: var(--mg-font-size-xs); }
.sk { display: grid; grid-template-columns: 7.4rem minmax(0, 1fr); align-items: center; gap: var(--mg-space-2); min-height: 1.3rem; }
.sk__label { color: var(--mg-color-muted); font-size: var(--mg-font-size-xs); font-weight: var(--mg-weight-strong); line-height: 1.2; }
.sk__track { position: relative; display: block; height: 0.45rem; border-radius: var(--mg-radius-pill); background: var(--mg-color-paper); box-shadow: var(--mg-shadow-inset-sm); }
.sk__trail { position: absolute; top: 0; bottom: 0; border-radius: inherit; background: color-mix(in srgb, var(--mg-color-primary) 34%, var(--mg-color-paper)); }
.sk__start, .sk__now { position: absolute; top: 50%; width: 0.7rem; height: 0.7rem; border: 1.5px solid var(--mg-color-primary-fill); border-radius: var(--mg-radius-organic-a); background: var(--mg-color-paper); transform: translate(-50%, -50%); }
.sk__now { z-index: 1; background: var(--mg-color-primary-fill); }
.sk__table { display: grid; gap: 4px; margin-top: var(--mg-space-2); }
.sk__tr { display: grid; grid-template-columns: minmax(0, 1.6fr) repeat(4, minmax(0, 1fr)); align-items: center; gap: 4px; font-size: var(--mg-font-size-xs); }
.sk__tr--head span { color: var(--mg-color-muted); font-weight: var(--mg-weight-title); text-align: center; }
.sk__tr [role='rowheader'] { font-weight: var(--mg-weight-strong); }
.sk__td { padding: 4px 0; border-radius: var(--mg-radius-sm); background: var(--mg-color-paper); font-weight: var(--mg-weight-title); text-align: center; }
.sk__td.is-pending { background: transparent; color: var(--mg-color-muted); }

/* Narrow stages (the Lab's own columns, small windows): everything is judged by the width
   of the view, so these are container queries. 1184 px of view = a 1320 px window.
   Below 1316 px the three fields no longer fit one row (15 rem + 44 rem + two tiles): the
   practices take a row of their own; below 1010 px the steps do the same and the open step
   takes a row of its own. */
@container pv (max-width: 1315px) {
  .f-prac { flex-basis: 100%; }
}
@container pv (max-width: 1009px) {
  .f-desc { flex: 1 1 100%; min-height: 0; }
  .f-steps { flex-basis: 100%; }
  .st.is-open { flex-basis: 100%; }
}
@container pv (max-width: 1184px) {
  .strip { height: 7.5rem; }
  .strip__note { display: none; }
  .stn__title { min-height: 3.6em; margin-inline: var(--mg-space-1); font-size: var(--mg-font-size-sm); }
}
@container pv (max-width: 944px) {
  .stn__title { font-size: var(--mg-font-size-xs); }
  .pv__lower { grid-template-columns: 1fr; }
}
@media (prefers-reduced-motion: reduce) {
  .pv4 *, .pv4 *::before, .pv4 *::after { transition: none !important; }
}
</style>
