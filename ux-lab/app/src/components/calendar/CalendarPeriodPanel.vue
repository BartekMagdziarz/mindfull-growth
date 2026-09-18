<template>
  <section class="cal-panel" :class="[`cal-panel--${metrics.kind}`, `cal-panel--${metrics.state}`]" aria-live="polite">
    <header class="cal-panel__head">
      <div class="cal-panel__title">
        <span class="cal-panel__state">{{ stateLabel }}</span>
        <h2>{{ periodTitle(metrics.ref) }}</h2>
      </div>
      <div class="cal-panel__ritual">
        <template v-if="metrics.kind === 'day'">
          <button type="button" class="cal-panel__cta" @click="emit('open-day', metrics.ref)"><AppIcon name="wb_sunny" /> Otwórz dzień</button>
        </template>
        <template v-else-if="metrics.ritual === 'due'">
          <button type="button" class="cal-panel__cta" @click="emit('open-ritual', metrics.ref)"><AppIcon name="task_alt" /> {{ ritualLabel(metrics.ritual, metrics.kind) }}</button>
        </template>
        <template v-else-if="metrics.ritual === 'missing'">
          <button type="button" class="cal-panel__cta cal-panel__cta--quiet" @click="emit('open-ritual', metrics.ref)"><AppIcon name="history_edu" /> Otwórz refleksję</button>
        </template>
        <template v-else-if="metrics.ritual === 'done'">
          <span class="cal-panel__done"><RitualDot status="done" :kind="metrics.kind" /> {{ ritualLabel('done', metrics.kind) }}</span>
        </template>
      </div>
    </header>

    <!-- dzień: wpisy i wykonanie, reszta w widoku Dzisiaj -->
    <div v-if="metrics.kind === 'day'" class="cal-panel__day">
      <dl>
        <div><dt>Wykonanie</dt><dd>{{ metrics.day!.done }}/{{ metrics.day!.planned }}</dd></div>
        <div><dt>Dziennik</dt><dd>{{ metrics.entries.journal ? 'wpis' : '–' }}</dd></div>
        <div><dt>Emocje</dt><dd>{{ metrics.entries.emotions || '–' }}</dd></div>
        <div><dt>Ćwiczenia</dt><dd>{{ metrics.entries.exercises || '–' }}</dd></div>
      </dl>
    </div>

    <template v-else>
      <!-- soczewka: bieżąca wartość + poprzednie okresy jako small multiples -->
      <div class="cal-panel__lens">
        <div class="cal-panel__lens-now">
          <small>{{ lensDef.label }}</small>
          <strong>{{ reading.empty ? '–' : reading.text }}</strong>
          <span>{{ reading.title }}</span>
        </div>
        <ol class="cal-panel__multiples" aria-label="Poprzednie okresy">
          <li v-for="item in history" :key="item.ref" :class="{ selected: item.ref === metrics.ref }">
            <LensMark :reading="lensReading(item, lens)" size="md" />
            <small>{{ item.label }}</small>
          </li>
        </ol>
      </div>

      <div class="cal-panel__grid">
        <!-- oceny: wysiłek i stan × 4 obszary -->
        <section v-if="metrics.ratings" class="cal-panel__block">
          <h3>Wysiłek · Stan</h3>
          <ul class="cal-panel__areas">
            <li v-for="(area, index) in AREAS" :key="area">
              <span>{{ area }}</span>
              <i class="effort" :style="{ '--f': metrics.ratings.effort[index] / 5 }" :title="`Wysiłek ${metrics.ratings.effort[index]}`" />
              <i class="state" :style="{ '--f': metrics.ratings.state[index] / 5 }" :title="`Stan ${metrics.ratings.state[index]}`" />
            </li>
          </ul>
        </section>

        <!-- kompas miesiąca -->
        <section v-if="metrics.compass" class="cal-panel__block">
          <h3>Kompas</h3>
          <ul class="cal-panel__compass">
            <li v-for="(value, index) in metrics.compass" :key="COMPASS[index]">
              <span>{{ COMPASS[index] }}</span>
              <b><i v-for="n in 5" :key="n" :class="{ on: n <= value }" /></b>
            </li>
          </ul>
        </section>

        <!-- kierunki miesiąca -->
        <section v-if="metrics.kind === 'month' && metrics.priorities.length" class="cal-panel__block">
          <h3>Kierunki</h3>
          <ul class="cal-panel__priorities">
            <li v-for="priority in metrics.priorities" :key="priority.key">
              <span>{{ priority.title }}</span>
              <b v-if="priority.effort !== null"><i v-for="n in 5" :key="n" :class="{ on: n <= priority.effort }" /></b>
              <em v-else>–</em>
            </li>
          </ul>
        </section>

        <!-- emocje i wpisy -->
        <section v-if="metrics.emotions" class="cal-panel__block">
          <h3>Emocje · wpisy</h3>
          <div class="cal-panel__emotions">
            <span class="cal-panel__stack"><i v-for="q in QUADRANTS" :key="q.id" :style="{ flex: `${Math.max(metrics.emotions.quadrants[q.id], 0.001)} 1 0`, background: `var(${q.cssVar})` }" :title="`${q.label}: ${metrics.emotions.quadrants[q.id]}`" /></span>
            <dl>
              <div><dt>przyjemne</dt><dd>{{ metrics.emotions.pleasant }}%</dd></div>
              <div><dt>dziennik</dt><dd>{{ metrics.entries.journal }}</dd></div>
              <div><dt>emocje</dt><dd>{{ metrics.entries.emotions }}</dd></div>
              <div><dt>ćwiczenia</dt><dd>{{ metrics.entries.exercises }}</dd></div>
            </dl>
          </div>
        </section>
      </div>

      <!-- refleksja jako treść okresu -->
      <blockquote v-if="metrics.ritual === 'done'" class="cal-panel__journal">
        {{ metrics.kind === 'month' ? fixture.ritual.monthlyJournal : fixture.ritual.weeklyJournal }}
      </blockquote>

      <!-- obiekty okresu: cicha lista -->
      <section v-if="objects.length" class="cal-panel__objects">
        <h3>Obiekty {{ metrics.kind === 'month' ? 'miesiąca' : 'tygodnia' }}</h3>
        <ul>
          <li v-for="row in objects" :key="row.object.key" :class="`is-${row.status}`">
            <i class="glyph" :class="`glyph--${FAMILY_GLYPH[row.object.family]}`" />
            <span class="name">{{ row.object.title }}</span>
            <span class="value">
              <template v-if="row.value !== undefined">{{ row.value }}<template v-if="row.target !== undefined"> / {{ row.target }}</template></template>
              <template v-else>–</template>
            </span>
            <i class="status" />
          </li>
        </ul>
      </section>
    </template>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import AppIcon from '@product/components/shared/AppIcon.vue'
import { useLabStore } from '~lab/stores/lab.store'
import {
  AREAS,
  COMPASS,
  FAMILY_GLYPH,
  LENSES,
  QUADRANTS,
  lensReading,
  objectsForPeriod,
  periodTitle,
  previousPeriods,
  ritualLabel,
  type LensId,
  type PeriodMetrics,
} from '~lab/lab/calendarConceptData'
import LensMark from './LensMark.vue'
import RitualDot from './RitualDot.vue'

const props = withDefaults(defineProps<{ metrics: PeriodMetrics; lens: LensId; historyCount?: number }>(), { historyCount: 6 })
const emit = defineEmits<{ 'open-day': [dayRef: string]; 'open-ritual': [ref: string] }>()

const labStore = useLabStore()
const fixture = computed(() => labStore.fixture)
const lensDef = computed(() => LENSES.find(item => item.id === props.lens)!)
const reading = computed(() => lensReading(props.metrics, props.lens))
const history = computed(() => [...previousPeriods(fixture.value, props.metrics.ref, props.historyCount), props.metrics])
const objects = computed(() => objectsForPeriod(fixture.value, props.metrics))
const stateLabel = computed(() => props.metrics.state === 'past' ? 'zamknięty' : props.metrics.state === 'current' ? 'w toku' : 'plan')
</script>

<style scoped>
.cal-panel { display: grid; gap: 14px; padding: 16px 18px 18px; border-radius: 26px 22px 24px 20px; color: rgb(var(--color-on-surface)); }
.cal-panel h3 { margin: 0 0 8px; color: rgb(var(--color-primary-strong)); font-size: 7.5px; font-weight: 850; letter-spacing: .17em; text-transform: uppercase; }

.cal-panel__head { display: flex; align-items: flex-end; justify-content: space-between; gap: 12px; }
.cal-panel__title { display: grid; gap: 2px; }
.cal-panel__title h2 { margin: 0; font-size: 16px; font-weight: 800; }
.cal-panel__title h2::first-letter { text-transform: uppercase; }
.cal-panel__state { color: rgb(var(--neo-muted)); font-size: 8.5px; font-weight: 800; letter-spacing: .14em; text-transform: uppercase; }
.cal-panel__cta { display: inline-flex; align-items: center; gap: 6px; height: 30px; padding: 0 12px; border: 1px solid rgb(var(--neo-border) / .2); border-radius: 999px; color: rgb(var(--color-primary-strong)); background: rgb(var(--neo-surface-base)); font-size: 10.5px; font-weight: 800; letter-spacing: .03em; cursor: pointer; box-shadow: -3px -3px 7px rgb(var(--neo-shadow-light) / .8), 3px 3px 7px rgb(var(--neo-shadow-dark) / .18); }
.cal-panel__cta .material-symbols-outlined { font-size: 16px; }
.cal-panel__cta--quiet { box-shadow: none; background: transparent; color: rgb(var(--color-on-surface-variant)); }
.cal-panel__done { display: inline-flex; align-items: center; gap: 6px; color: rgb(var(--color-on-surface-variant)); font-size: 10px; font-weight: 700; }

.cal-panel__day dl { display: flex; gap: 22px; margin: 0; }
.cal-panel__day div { display: grid; gap: 2px; }
.cal-panel__day dt { color: rgb(var(--neo-muted)); font-size: 8.5px; font-weight: 800; letter-spacing: .12em; text-transform: uppercase; }
.cal-panel__day dd { margin: 0; font-size: 15px; font-weight: 800; }

.cal-panel__lens { display: grid; grid-template-columns: minmax(150px, auto) minmax(0, 1fr); align-items: end; gap: 22px; padding: 12px 14px; border-radius: 20px 17px 19px 16px; background: rgb(var(--color-surface-container) / .5); }
.cal-panel__lens-now { display: grid; gap: 1px; }
.cal-panel__lens-now small { color: rgb(var(--color-primary-strong)); font-size: 7.5px; font-weight: 850; letter-spacing: .17em; text-transform: uppercase; }
.cal-panel__lens-now strong { font-size: 22px; font-weight: 800; letter-spacing: -.01em; line-height: 1.1; }
.cal-panel__lens-now span { color: rgb(var(--neo-muted)); font-size: 9px; font-weight: 700; }
.cal-panel__multiples { display: flex; gap: 6px; justify-content: flex-end; margin: 0; padding: 0; list-style: none; }
.cal-panel__multiples li { display: grid; justify-items: center; gap: 4px; min-width: 40px; padding: 6px 4px 4px; border-radius: 12px; }
.cal-panel__multiples li.selected { background: rgb(var(--neo-surface-base)); box-shadow: -2px -2px 5px rgb(var(--neo-shadow-light) / .8), 2px 2px 5px rgb(var(--neo-shadow-dark) / .16); }
.cal-panel__multiples small { color: rgb(var(--neo-muted)); font-size: 8px; font-weight: 800; letter-spacing: .04em; white-space: nowrap; }
.cal-panel__multiples li.selected small { color: rgb(var(--color-primary-strong)); }

.cal-panel__grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); gap: 14px; }
.cal-panel__block { padding: 10px 12px; border-radius: 18px 15px 17px 14px; border: 1px solid rgb(var(--neo-border) / .14); }

.cal-panel__areas, .cal-panel__compass, .cal-panel__priorities { display: grid; gap: 5px; margin: 0; padding: 0; list-style: none; }
.cal-panel__areas li { display: grid; grid-template-columns: 64px 1fr 1fr; align-items: center; gap: 6px; font-size: 9.5px; font-weight: 700; color: rgb(var(--color-on-surface-variant)); }
.cal-panel__areas i { display: block; height: 6px; border-radius: 3px; background: linear-gradient(to right, var(--c) calc(var(--f) * 100%), rgb(var(--neo-border) / .25) calc(var(--f) * 100%)); }
.cal-panel__areas i.effort { --c: rgb(var(--rose-400)); }
.cal-panel__areas i.state { --c: rgb(var(--sky-500)); }
.cal-panel__compass li, .cal-panel__priorities li { display: flex; align-items: center; justify-content: space-between; gap: 8px; font-size: 9.5px; font-weight: 700; color: rgb(var(--color-on-surface-variant)); }
.cal-panel__compass span, .cal-panel__priorities span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.cal-panel__compass b, .cal-panel__priorities b { display: inline-flex; gap: 2px; flex: none; }
.cal-panel__compass b i, .cal-panel__priorities b i { display: block; width: 7px; height: 7px; border-radius: 2px; background: rgb(var(--sky-200) / .7); }
.cal-panel__compass b i.on, .cal-panel__priorities b i.on { background: rgb(var(--sky-600)); }
.cal-panel__priorities em { color: rgb(var(--neo-muted)); font-style: normal; }

.cal-panel__emotions { display: grid; gap: 8px; }
.cal-panel__stack { display: flex; height: 8px; border-radius: 999px; overflow: hidden; background: rgb(var(--neo-border) / .25); }
.cal-panel__stack i { display: block; height: 100%; }
.cal-panel__emotions dl { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; margin: 0; }
.cal-panel__emotions dt { color: rgb(var(--neo-muted)); font-size: 7.5px; font-weight: 800; letter-spacing: .1em; text-transform: uppercase; }
.cal-panel__emotions dd { margin: 0; font-size: 12px; font-weight: 800; }

.cal-panel__journal { margin: 0; padding: 10px 14px; border-left: 2px solid rgb(var(--sky-300)); color: rgb(var(--color-on-surface-variant)); font-size: 11px; line-height: 1.5; font-style: italic; }

.cal-panel__objects ul { display: grid; grid-template-columns: repeat(auto-fill, minmax(230px, 1fr)); gap: 4px 18px; margin: 0; padding: 0; list-style: none; }
.cal-panel__objects li { display: grid; grid-template-columns: 12px minmax(0, 1fr) auto 6px; align-items: center; gap: 8px; min-height: 26px; font-size: 10px; font-weight: 700; color: rgb(var(--color-on-surface-variant)); }
.cal-panel__objects .name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.cal-panel__objects .value { font-variant-numeric: tabular-nums; color: rgb(var(--color-on-surface)); }
.cal-panel__objects .glyph { display: block; width: 9px; height: 9px; background: rgb(var(--sky-400)); }
.cal-panel__objects .glyph--circle { border-radius: 999px; }
.cal-panel__objects .glyph--pentagon { clip-path: polygon(50% 0%, 100% 38%, 82% 100%, 18% 100%, 0% 38%); }
.cal-panel__objects .glyph--square { border-radius: 2px; }
.cal-panel__objects .glyph--flag { clip-path: polygon(0 0, 100% 0, 70% 50%, 100% 100%, 0 100%); }
.cal-panel__objects .status { display: block; width: 6px; height: 6px; border-radius: 999px; background: rgb(var(--neo-border) / .4); }
.cal-panel__objects li.is-met .status { background: rgb(var(--sky-700)); }
.cal-panel__objects li.is-missed .status { background: rgb(var(--rose-300)); }
</style>
