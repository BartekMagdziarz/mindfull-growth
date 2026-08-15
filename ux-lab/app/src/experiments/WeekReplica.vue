<template>
  <FocusBoardReplica v-if="props.variantId === 'focus-board-v1'" :preset-id="props.presetId" initial-scale="week" />
  <MonthSketchbookReplica v-else-if="props.variantId === 'sketchbook-v1'" :preset-id="props.presetId" initial-scale="week" />
  <div v-else class="product-replica week-replica">
    <header class="replica-toolbar">
      <div class="period-navigation">
        <button type="button" class="round-control"><AppIcon name="chevron_left" /></button>
        <div><span class="replica-eyebrow">Kalendarz · tydzień</span><h2>{{ week.weekRef }} · {{ week.rangeLabel }}</h2></div>
        <button type="button" class="round-control"><AppIcon name="chevron_right" /></button>
      </div>
      <div class="replica-toolbar__actions">
        <div class="scale-switch"><button>Rok</button><button>Miesiąc</button><button class="active">Tydzień</button></div>
        <button type="button" class="tonal-control"><AppIcon name="event_repeat" /> {{ week.reflectionComplete ? 'Edytuj rytuał' : 'Zaplanuj tydzień' }}</button>
      </div>
    </header>

    <section class="week-days-ribbon replica-card">
      <button v-for="day in week.days" :key="day.dayRef" type="button" :data-day-ref="day.dayRef" :class="{ active: selectedDay === day.dayRef, today: day.isToday }" @click="selectedDay = day.dayRef">
        <span><small>{{ day.shortLabel }}</small><strong>{{ day.dayNumber }}</strong></span>
        <progress max="100" :value="day.completion" />
        <em>{{ day.completion }}%</em>
        <span class="day-signals"><AppIcon name="menu_book" />{{ day.journalCount }} <AppIcon name="mood" />{{ day.emotionCount }}</span>
      </button>
    </section>

    <div class="week-replica__layout">
      <aside class="week-replica__left">
        <section class="replica-card compact-card">
          <header class="replica-card__header"><div><AppIcon name="menu_book" /><span><strong>Dziennik</strong><small>{{ activeDay.dayRef }}</small></span></div></header>
          <article v-if="activeDay.journalCount"><strong>Planowanie tygodnia</strong><p>Wybrałem trzy rzeczy, które naprawdę mają znaczenie. Reszta poczeka.</p></article>
          <div v-else class="compact-empty"><AppIcon name="edit_note" /><span>Bez wpisu tego dnia</span></div>
        </section>
        <section class="replica-card compact-card">
          <header class="replica-card__header"><div><AppIcon name="mood" /><span><strong>Emocje</strong><small>{{ activeDay.emotionCount }} sygnały</small></span></div></header>
          <div class="emotion-pills"><span>spokój</span><span>energia</span><span v-if="activeDay.emotionCount > 1">ciekawość</span></div>
        </section>
      </aside>

      <main class="replica-card week-objects">
        <header class="replica-card__header"><div><AppIcon name="target" /><span><strong>Wykonanie tygodnia</strong><small>Rezultaty, nawyki i trackery</small></span></div><strong>{{ week.completion }}%</strong></header>
        <div class="week-object-grid">
          <article v-for="item in objects" :key="item.key" class="week-object-tile">
            <header><span class="object-family-icon"><AppIcon :name="iconFor(item.family)" /></span><span><small>{{ familyLabel(item.family) }}</small><strong>{{ item.title }}</strong></span></header>
            <MiniChart :points="item.chart.slice(-5)" :label="item.title" />
            <footer><span>{{ item.targetLabel ?? 'Obserwacja' }}</span><span class="status-dot" :class="`status-dot--${item.chart.at(-1)?.status}`" /></footer>
          </article>
        </div>
      </main>

      <aside class="week-replica__right">
        <section class="replica-card compact-card plan-context-card">
          <header class="replica-card__header"><div><AppIcon name="stars" /><span><strong>Top 3 tygodnia</strong><small>Plan a wykonanie</small></span></div></header>
          <div v-for="item in topThree" :key="item.key" class="top-three-row"><AppIcon name="star" /><span><strong>{{ item.title }}</strong><small>{{ item.targetLabel }}</small></span><span>{{ Math.round(item.chart.at(-1)?.value ?? 0) }}</span></div>
        </section>
        <section class="replica-card compact-card reflection-context-card">
          <header class="replica-card__header"><div><AppIcon name="auto_awesome" /><span><strong>Refleksja</strong><small>{{ week.reflectionComplete ? 'Zamknięta' : 'Jeszcze zablokowana' }}</small></span></div></header>
          <p>{{ week.note }}</p>
          <div v-if="week.reflectionComplete" class="mini-rating-grid"><span v-for="(value, index) in week.dimensions.slice(0, 8)" :key="index" :style="{ opacity: .35 + value / 8 }">{{ value }}</span></div>
          <button type="button" class="tonal-control"><AppIcon name="event_repeat" /> {{ week.reflectionComplete ? 'Otwórz refleksję' : 'Otwórz plan' }}</button>
        </section>
      </aside>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import AppIcon from '@product/components/shared/AppIcon.vue'
import type { LabFixtureObject } from '@product/dev/richVerificationScenario'
import MiniChart from '~lab/components/MiniChart.vue'
import FocusBoardReplica from '~lab/experiments/FocusBoardReplica.vue'
import MonthSketchbookReplica from '~lab/experiments/MonthSketchbookReplica.vue'
import { useLabStore } from '~lab/stores/lab.store'

const props = withDefaults(defineProps<{ presetId: string; variantId?: string }>(), { variantId: 'reference-v1' })
const labStore = useLabStore()
const preset = computed(() => labStore.fixture.presets['calendar-week'].find(item => item.id === props.presetId) ?? labStore.fixture.presets['calendar-week'][0])
const week = computed(() => labStore.fixture.weeks.find(item => item.weekRef === preset.value.periodRef) ?? labStore.fixture.weeks.at(-1)!)
const selectedDay = ref(week.value.days.find(day => day.isToday)?.dayRef ?? week.value.days[0].dayRef)
watch(week, value => { selectedDay.value = value.days.find(day => day.isToday)?.dayRef ?? value.days[0].dayRef })
const activeDay = computed(() => week.value.days.find(day => day.dayRef === selectedDay.value) ?? week.value.days[0])
const objects = computed(() => labStore.fixture.objects.filter(item => !['goal', 'intention'].includes(item.family) && item.status !== 'retired').slice(0, 9))
const topThree = computed(() => objects.value.filter(item => ['habit-stretch', 'kr-deep-work', 'kr-runs'].includes(item.key)))
const familyLabel = (family: LabFixtureObject['family']) => ({ keyResult: 'Rezultat', habit: 'Nawyk', tracker: 'Tracker', intention: 'Intencja', goal: 'Cel' })[family]
const iconFor = (family: LabFixtureObject['family']) => ({ keyResult: 'flag', habit: 'routine', tracker: 'monitoring', intention: 'gps_fixed', goal: 'outlined_flag' })[family]
</script>
