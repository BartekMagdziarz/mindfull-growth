<template>
  <section class="ps" :aria-label="`Podsumowanie · ${title}`">
    <header class="ps__head">
      <div class="ps__focus">
        <span class="ps__eyebrow">{{ focusLabel }}</span>
        <button v-for="item in focusItems" :key="item.key" type="button" class="ps__chip" :class="{ 'is-active': view === item.row }" :aria-pressed="view === item.row" :title="`Pokaż w tabeli: ${item.title}`" @click="emit('focus', item.row)">
          <span class="ps__orb"><AppIcon :name="item.icon ?? 'near_me'" /></span>
          <span>{{ item.title }}</span>
        </button>
        <span v-if="!focusItems.length" class="ps__empty">Brak wybranego fokusu</span>
      </div>
      <!-- jedno miejsce na rytuały okresu: etykieta zależy od stanu okresu, nie od skali -->
      <div class="ps__actions">
        <button v-for="action in actions" :key="action.kind" type="button" class="cp-btn" :title="action.hint" @click="emit('ritual', action.kind)">
          <AppIcon :name="action.icon" />{{ action.label }}
        </button>
        <button type="button" class="cp-btn cp-btn--quiet ps__toggle" :aria-expanded="open" @click="emit('toggle')">
          {{ open ? 'Zwiń' : 'Więcej' }}<AppIcon :name="open ? 'expand_less' : 'expand_more'" />
        </button>
      </div>
    </header>

    <div class="ps__grid">
      <!-- główny element: ocena własna okresu -->
      <div class="ps__hero" :class="{ 'ps__hero--empty': !rating.exists, 'is-active': view === 'reflection' }">
        <span class="ps__eyebrow">{{ scale === 'week' ? 'Ocena tygodnia' : scale === 'month' ? 'Ocena miesiąca' : 'Ocena roku' }}<small v-if="rating.status === 'draft'"> · szkic</small></span>
        <!-- skrót: oceny podokresów w tabeli (główna droga to lista w rogu tabeli) -->
        <button v-if="scale !== 'year' ? scale === 'month' : true" type="button" class="ps__drill" :aria-pressed="view === 'reflection'" :title="`Pokaż w tabeli: ${scale === 'month' ? 'oceny tygodni' : 'oceny miesięcy'}`" @click="emit('focus', 'reflection')"><AppIcon name="table_rows" /></button>
        <template v-if="rating.exists">
          <!-- tydzień: para słupków Wysiłek/Stan per obszar; miesiąc i rok: słupek per oś kompasu (rok = średnia refleksji miesięcy) -->
          <ul class="ps__bars" :class="{ 'ps__bars--pairs': !!rating.state }" :aria-label="rating.state ? 'Wysiłek i Stan per obszar' : 'Kompas'">
            <li v-for="(col, i) in bars" :key="i" :title="col.title">
              <span class="ps__col" aria-hidden="true">
                <i v-for="(v, j) in col.values" :key="j" :class="[j === 0 && col.values.length > 1 ? 'e' : 's', { none: v === null }]" :style="{ height: `${pct(v)}%` }"><b v-if="v !== null">{{ fmt1(v) }}</b></i>
              </span>
              <small>{{ col.label }}</small>
            </li>
          </ul>
          <small v-if="scale === 'year' && rating.months" class="ps__legend">refleksje {{ rating.months.done }} z {{ rating.months.total }} miesięcy</small>
        </template>
        <p v-else class="ps__none">{{ future ? 'Okres jeszcze się nie zaczął.' : scale === 'year' ? 'Brak refleksji miesięcy.' : 'Brak refleksji okresu.' }}</p>
      </div>

      <!-- wykonanie per rodzina: jedno słowo, procent i kleks; ułamek i podstawa w podpowiedzi -->
      <ul class="ps__fam" aria-label="Wykonanie w okresie">
        <li v-for="tile in tiles" :key="tile.id" class="ps__tile" :class="{ 'ps__tile--none': !tile.total, 'is-active': view === FAMILY_VIEW[tile.id] }">
          <button type="button" class="ps__tile-hit" :aria-pressed="view === FAMILY_VIEW[tile.id]" :title="`${tile.title}${tile.total ? ` · ${tile.done} / ${tile.total}` : ''} · pokaż w tabeli`" @click="emit('focus', FAMILY_VIEW[tile.id])" />
          <span class="ps__tile-label">{{ tile.label }}</span>
          <strong v-if="tile.total" class="ps__pct">{{ tile.percent }}<span>%</span></strong>
          <strong v-else class="ps__pct ps__dash">–</strong>
          <!-- kleks wypełniony od dołu zgodnie z procentem -->
          <span class="ps__blob" :style="{ '--fill': `${tile.percent}%` }" aria-hidden="true" />
        </li>
      </ul>
    </div>

    <p v-if="quote && !open" class="ps__quote"><span>{{ quote.label }}</span>{{ quote.text }}</p>

    <div v-if="open" class="ps__body">
      <template v-if="scale === 'year'">
        <div v-if="yearPlan" class="ps__narrative"><h4>{{ yearPlan.motif }}</h4><p>{{ yearPlan.narrative }}</p></div>
        <p v-else class="ps__empty">Brak zapisanego motywu roku.</p>
      </template>
      <RhythmReflectionBody v-else-if="reflection?.exists" :reflection="reflection" :priority-title="priorityTitle" hide-ratings />
      <p v-else class="ps__empty">{{ future ? 'Refleksja pojawi się po zakończeniu okresu.' : 'Refleksja nie została jeszcze zapisana.' }}</p>
    </div>
  </section>
</template>

<script lang="ts">
export type RitualKind = 'plan' | 'reflection'
</script>

<script setup lang="ts">
import { computed } from 'vue'
import AppIcon from '@/components/shared/AppIcon.vue'
import RhythmReflectionBody from './RhythmReflectionBody.vue'
import { AREAS, COMPASS, FAMILY_GROUPS, directionsForPeriod, ownReflection, periodRating, periodStats, periodTitle, truncate, type CompletionBasis, type Scale, type TimeUnit } from './rhythmProjections'
import type { RhythmScenario } from './rhythmScenario'
import { FAMILY_VIEW } from './rhythmRows'
import type { PeriodRef } from '@/domain/period'
import { getPeriodBounds } from '@/utils/periods'

const props = defineProps<{
  scenario: RhythmScenario; scale: Scale; periodRef: string; units: TimeUnit[]; open: boolean
  /** Aktualne spojrzenie tabeli — kafle i chipy są skrótami do listy w rogu tabeli. */
  view?: string
  /** Stan okresu względem zegara — decyduje o akcjach w nagłówku. */
  state: 'past' | 'current' | 'future'
}>()
const emit = defineEmits<{ toggle: []; focus: [row: string]; ritual: [kind: RitualKind] }>()

/**
 * Akcje okresu: przeszły → tylko refleksja (napisz / edytuj); bieżący → plan i refleksja; przyszły → tylko plan.
 * Rok ma wyłącznie plan roku. Podsumowanie jest już „refleksją do czytania”, więc podgląd nie potrzebuje przycisku.
 */
const actions = computed<{ kind: RitualKind; label: string; icon: string; hint: string }[]>(() => {
  const periodWord = props.scale === 'week' ? 'tydzień' : props.scale === 'month' ? 'miesiąc' : 'rok'
  const plan = (label: string) => ({ kind: 'plan' as const, label, icon: 'edit_calendar', hint: `Otwórz planowanie na ${periodWord} od kroku przypisań` })
  const reflect = (label: string) => ({ kind: 'reflection' as const, label, icon: 'history_edu', hint: `Otwórz rytuał refleksji: ${periodWord}` })
  if (props.scale === 'year') return [plan('Plan roku')]
  if (props.state === 'future') return [plan(props.scale === 'week' ? 'Zaplanuj tydzień' : 'Zaplanuj miesiąc')]
  if (props.state === 'current') return [plan('Plan'), reflect('Refleksja')]
  return [reflect(reflection.value?.exists ? 'Edytuj refleksję' : 'Napisz refleksję')]
})

const title = computed(() => periodTitle(props.scale, props.periodRef))
const reflection = computed(() => ownReflection(props.scenario, props.scale, props.periodRef))
const yearPlan = computed(() => props.scenario.yearPlans?.find(p => p.yearRef === props.periodRef))
const bounds = computed(() => getPeriodBounds(props.periodRef as PeriodRef))
const future = computed(() => bounds.value.start > props.scenario.clock)
const stats = computed(() => periodStats(props.scenario, props.scale, props.periodRef, props.units))
const rating = computed(() => periodRating(props.scenario, props.scale, props.periodRef, props.units))
const focusLabel = computed(() => props.scale === 'week' ? 'Fokus tygodnia' : props.scale === 'month' ? 'Fokus miesiąca' : 'Fokus roku')

const BASIS_LABEL: Record<CompletionBasis, string> = {
  targets: 'spełnione cele zamkniętych okresów',
  actions: 'zapisane działania z planu do dziś',
  presence: 'jednostki czasu z zapisem',
  none: 'nic do sprawdzenia',
}

const tiles = computed(() => FAMILY_GROUPS.map(g => {
  const stat = stats.value.families[g.id]
  return {
    id: g.id, label: g.label, icon: g.icon,
    done: stat.done, total: stat.total, objects: stat.objects,
    percent: stat.total ? Math.round(stat.done / stat.total * 100) : 0,
    title: `${g.label}: ${stat.objects} w okresie · ${(stat.bases.length ? stat.bases : ['none' as const]).map(b => BASIS_LABEL[b]).join(' + ')}`,
  }
}))

const quote = computed<{ label: string; text: string } | null>(() => {
  if (props.scale === 'year') return yearPlan.value ? { label: 'Motyw roku', text: yearPlan.value.motif } : null
  const r = reflection.value
  if (r?.monthly) return { label: 'Z czego jestem dumny', text: truncate(r.monthly.anchors.proud, 140) }
  if (r?.weekly) return { label: 'Co poszło dobrze', text: truncate(r.weekly.anchors.good, 140) }
  return null
})

const focusItems = computed(() => {
  if (props.scale === 'week') {
    const keys = props.scenario.weekPlans.find(p => p.weekRef === props.periodRef)?.topObjectKeys ?? []
    return keys.flatMap(key => { const o = props.scenario.objects.find(o => o.key === key); return o ? [{ ...o, row: `type:${o.family}` }] : [] })
  }
  const keys = props.scale === 'year' ? yearPlan.value?.topPriorityKeys : props.scenario.monthPlans.find(p => p.monthRef === props.periodRef)?.topPriorityKeys
  const priorities = keys ? keys.flatMap(key => props.scenario.priorities.filter(p => p.key === key)) : props.scale === 'year' ? directionsForPeriod(props.scenario, props.scale, props.periodRef, props.units).focus : []
  return priorities.map(p => ({ ...p, row: `dir:${p.key}` }))
})

/** Kolumny wykresu oceny: tydzień = 4 obszary × [Wysiłek, Stan]; miesiąc/rok = 5 osi kompasu. */
const bars = computed(() => {
  const r = rating.value
  if (r.state && r.effort) return AREAS.map((area, i) => ({ label: area, values: [r.effort![i], r.state![i]], title: `${area}: wysiłek ${r.effort![i] ?? '–'}, stan ${r.state![i] ?? '–'}` }))
  return COMPASS.map((axis, i) => ({ label: axis, values: [r.compass?.[i] ?? null], title: `${axis} ${fmt1(r.compass?.[i] ?? null)} / 5` }))
})
function fmt1(value: number | null): string { return value === null ? '–' : Number.isInteger(value) ? String(value) : value.toFixed(1).replace('.', ',') }
function priorityTitle(key: string) { return props.scenario.priorities.find(p => p.key === key)?.title ?? key }
function pct(value: number | null): number { return value === null ? 0 : (value / 5) * 100 }
</script>

<style scoped>
.ps { display: grid; gap: 14px; padding: 16px 20px 16px; border: 1px solid var(--cp-line); border-radius: 25px 30px 24px 28px; background: var(--cp-card); box-shadow: var(--mg-shadow-rhythm-card); }
.ps__eyebrow { color: var(--cp-mark); font-size: 11px; font-weight: 900; letter-spacing: .1em; text-transform: uppercase; }
.ps__eyebrow small { color: var(--mg-color-muted); font-size: 11px; letter-spacing: 0; text-transform: none; }

.ps__head { display: flex; align-items: center; justify-content: space-between; gap: 16px; }
.ps__focus { display: flex; flex-wrap: wrap; align-items: center; gap: 10px 12px; }
.ps__chip { display: inline-flex; align-items: center; gap: 9px; max-width: 260px; padding: 3px 12px 3px 4px; border: 1px solid var(--cp-line); border-radius: 17px 14px 18px 15px; background: var(--cp-inner); color: var(--mg-color-ink); font: inherit; font-size: 13.5px; font-weight: 800; text-align: left; cursor: pointer; box-shadow: var(--mg-shadow-rhythm-card); }
.ps__chip:hover { background: white; }
.ps__chip.is-active { background: white; }
.ps__chip:hover .ps__orb { display: grid; place-items: center; flex: none; width: 30px; height: 29px; border-radius: 52% 48% 54% 46% / 47% 53% 46% 54%; color: var(--cp-mark); background: var(--cp-inner); }
.ps__orb { display: grid; place-items: center; flex: none; width: 30px; height: 29px; border-radius: 52% 48% 54% 46% / 47% 53% 46% 54%; color: var(--cp-mark); background: var(--cp-inner); }
.ps__orb .material-symbols-outlined { font-size: 18px; }
.ps__actions { display: flex; flex: none; align-items: center; gap: 6px; }
.ps__toggle { flex: none; }
.ps__empty { font-size: 13px; color: var(--mg-color-muted); margin: 0; }

.ps__grid { display: grid; grid-template-columns: minmax(300px, 1fr) minmax(0, 1.7fr); gap: 14px; align-items: stretch; }

/* ocena: wgłębienie w papierze, jak dołek w widoku Dzisiaj */
.ps__hero { position: relative; display: grid; align-content: start; gap: 10px; padding: 14px 18px 14px; border-radius: 17px 14px 18px 15px; background: var(--cp-field); }
.ps__hero.is-active, .ps__tile.is-active { background: var(--cp-inner); }
.ps__drill { position: absolute; top: 10px; right: 10px; display: grid; place-items: center; width: 30px; height: 29px; border: 0; border-radius: 52% 48% 54% 46% / 47% 53% 46% 54%; background: transparent; color: var(--mg-color-muted); cursor: pointer; }
.ps__drill:hover, .ps__drill[aria-pressed='true'] { background: var(--cp-inner); color: var(--mg-color-ink); }
.ps__drill .material-symbols-outlined { font-size: 17px; }
.ps__bars { display: grid; grid-auto-flow: column; grid-auto-columns: minmax(0, 1fr); gap: 8px; margin: 4px 0 0; padding: 0; list-style: none; }
.ps__bars li { display: grid; justify-items: center; gap: 6px; min-width: 0; }
.ps__col { display: inline-flex; gap: 5px; align-items: flex-end; height: 74px; }
.ps__col i { position: relative; display: inline-block; width: 22px; min-height: 3px; border-radius: 9px 7px 3px 4px / 8px 9px 3px 3px; background: var(--cp-accent); transform: rotate(-1.2deg); }
.ps__col i:nth-child(even) { transform: rotate(1deg); border-radius: 7px 9px 4px 3px / 9px 8px 3px 3px; }
.ps__bars--pairs .ps__col i { width: 14px; }
.ps__col .e, .ps__legend .e { background: var(--mg-color-effort); }
.ps__col .s, .ps__legend .s { background: var(--cp-accent); }
.ps__col i.none { background: var(--cp-inner); min-height: 3px; }
.ps__col i b { position: absolute; left: 50%; bottom: 100%; transform: translate(-50%, -2px); color: var(--mg-color-ink); font-size: 10.5px; font-weight: 800; font-variant-numeric: tabular-nums; }
.ps__bars small { color: var(--mg-color-muted); font-size: 10.5px; font-weight: 800; text-align: center; }
.ps__legend { display: flex; align-items: center; gap: 6px; color: var(--mg-color-muted); font-size: 11px; font-weight: 800; }
.ps__legend i { display: inline-block; width: 8px; height: 8px; border-radius: 3px 2px 3px 2px; }
.ps__none { margin: 4px 0 0; color: var(--mg-color-muted); font-size: 14px; }
.ps__hero--empty { align-content: start; }

/* rodziny: cztery kafle jak płytki szybkich wpisów */
/* rodziny: kleks wypełniany od dołu procentem, jedno słowo i ułamek */
.ps__fam { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); grid-auto-rows: 1fr; gap: 10px; margin: 0; padding: 0; list-style: none; }
.ps__tile-hit { position: absolute; inset: 0; border: 0; border-radius: inherit; background: transparent; cursor: pointer; }
.ps__tile:hover { background: var(--cp-inner); }
.ps__tile { position: relative; display: grid; grid-template-columns: 1fr auto auto; grid-template-areas: 'label pct blob'; align-items: center; column-gap: 12px; min-width: 0; min-height: 74px; padding: 10px 16px 10px 18px; border-radius: 17px 14px 18px 15px; background: var(--cp-field); }
.ps__tile:nth-child(even) { border-radius: 14px 18px 15px 17px; }
.ps__tile--none .ps__tile-label { color: var(--mg-color-muted); }
.ps__tile-label { grid-area: label; color: var(--mg-color-ink); font-size: 16px; font-weight: 800; letter-spacing: .01em; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ps__pct { grid-area: pct; color: var(--mg-color-ink); font-size: 22px; font-weight: 900; letter-spacing: -.01em; font-variant-numeric: tabular-nums; }
.ps__pct span { margin-left: 1px; color: var(--mg-color-muted); font-size: 12px; font-weight: 800; }
.ps__dash { color: var(--mg-color-muted); }
.ps__blob { grid-area: blob; display: block; width: 44px; height: 42px; border-radius: 52% 48% 54% 46% / 47% 53% 46% 54%; background: linear-gradient(to top, var(--cp-accent) var(--fill), var(--cp-inner) var(--fill)); outline: 1px solid var(--cp-edge); outline-offset: -1px; transform: rotate(-4deg); }
.ps__tile:nth-child(even) .ps__blob { border-radius: 47% 53% 49% 51% / 54% 46% 53% 47%; transform: rotate(3deg); }
.ps__tile--none .ps__blob { background: var(--cp-inner); outline: 1px solid var(--cp-line); outline-offset: -1px; }
.ps__quote { display: flex; gap: 10px; align-items: baseline; margin: 0; padding-left: 12px; border-left: 2px solid var(--mg-color-state-soft); color: var(--mg-color-ink); font-size: 14px; line-height: 1.5; }
.ps__quote span { flex: none; color: var(--mg-color-muted); font-size: 12px; font-weight: 700; }

.ps__body { display: grid; justify-items: stretch; gap: 16px; padding: 16px 4px 4px; border-top: 1px solid var(--cp-line); }
h4 { margin: 0 0 6px; font-size: 18px; }
.ps__narrative p { margin: 0; max-width: 70ch; font-size: 14px; line-height: 1.7; }
</style>
