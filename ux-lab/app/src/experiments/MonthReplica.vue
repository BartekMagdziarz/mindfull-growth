<template>
  <FocusBoardReplica v-if="props.variantId === 'focus-board-v1'" :preset-id="props.presetId" initial-scale="month" />
  <MonthSketchbookReplica v-else-if="props.variantId === 'sketchbook-v1'" :preset-id="props.presetId" />
  <div v-else class="product-replica month-replica">
    <header class="replica-toolbar">
      <div class="period-navigation">
        <button type="button" class="round-control"><AppIcon name="chevron_left" /></button>
        <div><span class="replica-eyebrow">Kalendarz · miesiąc</span><h2>{{ month.label }}</h2></div>
        <button type="button" class="round-control"><AppIcon name="chevron_right" /></button>
      </div>
      <div class="replica-toolbar__actions">
        <div class="scale-switch"><button>Rok</button><button class="active">Miesiąc</button><button>Tydzień</button></div>
        <button type="button" class="tonal-control"><AppIcon name="auto_awesome" /> {{ month.reflectionComplete ? 'Edytuj refleksję' : 'Zaplanuj miesiąc' }}</button>
      </div>
    </header>

    <div class="month-summary-grid">
      <section class="replica-card month-priorities">
        <header class="replica-card__header"><div><AppIcon name="north_star" /><span><strong>Kierunki miesiąca</strong><small>Top 3</small></span></div><span class="quiet-pill">{{ month.reflectionComplete ? 'Zamknięty' : 'W toku' }}</span></header>
        <article v-for="(priority, index) in priorities" :key="priority.key" class="month-priority-row">
          <span :class="`priority-dot priority-dot--${priority.tone}`" />
          <span><strong>{{ priority.title }}</strong><small>{{ priority.desiredDirection }}</small></span>
          <div><progress max="5" :value="month.priorityEffort[index]" /><small>{{ month.priorityEffort[index] }}/5 wysiłek</small></div>
        </article>
      </section>

      <section class="replica-card month-compass">
        <header class="replica-card__header"><div><AppIcon name="explore" /><span><strong>Kompas miesiąca</strong><small>{{ month.reflectionPartial ? 'Częściowa refleksja' : 'Subiektywny kierunek' }}</small></span></div></header>
        <div class="dimension-bars">
          <div v-for="(dimension, index) in dimensions" :key="dimension.label">
            <span><strong>{{ dimension.label }}</strong><small>{{ dimension.value ?? '—' }}/5</small></span>
            <progress max="5" :value="dimension.value ?? 0" :class="{ muted: dimension.value === null }" />
          </div>
        </div>
      </section>

      <section class="replica-card month-overview">
        <header class="replica-card__header"><div><AppIcon name="monitoring" /><span><strong>Realizacja planu</strong><small>Wszystkie aktywne obiekty</small></span></div><strong>{{ month.completion }}%</strong></header>
        <progress max="100" :value="month.completion" />
        <div class="overview-stats"><span><strong>{{ metCount }}</strong><small>na celu</small></span><span><strong>{{ missedCount }}</strong><small>poniżej</small></span><span><strong>{{ noDataCount }}</strong><small>bez danych</small></span></div>
      </section>
    </div>

    <div class="month-replica__layout">
      <main class="replica-card month-objects-card">
        <header class="replica-card__header">
          <div><AppIcon name="target" /><span><strong>Obiekty miesiąca</strong><small>Wykresy pokazują 6 ostatnich okresów</small></span></div>
          <div class="chip-switch"><button :class="{ active: objectFilter === 'all' }" @click="objectFilter = 'all'">Wszystkie</button><button :class="{ active: objectFilter === 'attention' }" @click="objectFilter = 'attention'">Wymagają uwagi</button></div>
        </header>
        <div class="month-object-grid">
          <button v-for="item in visibleObjects" :key="item.key" type="button" class="month-object-card" :class="{ selected: selectedObject === item.key }" @click="selectedObject = item.key">
            <span class="object-family-icon"><AppIcon :name="iconFor(item.family)" /></span>
            <span class="month-object-card__copy"><small>{{ familyLabel(item.family) }}</small><strong>{{ item.title }}</strong><em>{{ item.targetLabel ?? 'Bez celu liczbowego' }}</em></span>
            <MiniChart :points="item.chart.slice(-6)" :label="item.title" />
          </button>
        </div>
      </main>

      <aside class="replica-card month-weeks-card">
        <header class="replica-card__header"><div><AppIcon name="view_week" /><span><strong>Tygodnie</strong><small>Przejdź do szczegółu</small></span></div></header>
        <button v-for="week in month.weeks" :key="week.weekRef" type="button" class="month-week-row" :class="{ active: selectedWeek === week.weekRef }" @click="selectedWeek = week.weekRef">
          <span><strong>{{ week.weekRef.replace('-W', 'T') }}</strong><small>{{ week.rangeLabel }}</small></span>
          <progress max="100" :value="week.completion" />
          <strong>{{ week.completion }}%</strong>
          <AppIcon name="chevron_right" />
        </button>
        <div v-if="selectedWeekSnapshot" class="selected-week-note"><AppIcon name="lightbulb" /><p>{{ selectedWeekSnapshot.note }}</p></div>
      </aside>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import AppIcon from '@product/components/shared/AppIcon.vue'
import type { LabFixtureObject } from '@product/dev/richVerificationScenario'
import MiniChart from '~lab/components/MiniChart.vue'
import FocusBoardReplica from '~lab/experiments/FocusBoardReplica.vue'
import MonthSketchbookReplica from '~lab/experiments/MonthSketchbookReplica.vue'
import { useLabStore } from '~lab/stores/lab.store'

const props = withDefaults(defineProps<{ presetId: string; variantId?: string }>(), { variantId: 'reference-v1' })
const labStore = useLabStore()
const objectFilter = ref<'all' | 'attention'>('all')
const selectedObject = ref('')
const preset = computed(() => labStore.fixture.presets['calendar-month'].find(item => item.id === props.presetId) ?? labStore.fixture.presets['calendar-month'][0])
const month = computed(() => labStore.fixture.months.find(item => item.monthRef === preset.value.periodRef) ?? labStore.fixture.months.at(-1)!)
const priorities = computed(() => labStore.fixture.priorities.slice(0, 3))
const selectedWeek = ref('')
const selectedWeekSnapshot = computed(() => month.value.weeks.find(week => week.weekRef === selectedWeek.value))
const objects = computed(() => labStore.fixture.objects.filter(item => item.status !== 'retired' && item.family !== 'intention').slice(0, 12))
const latestStatus = (item: LabFixtureObject) => item.chart.at(-1)?.status ?? 'no-data'
const visibleObjects = computed(() => objectFilter.value === 'all' ? objects.value : objects.value.filter(item => ['missed', 'no-data'].includes(latestStatus(item))))
const metCount = computed(() => objects.value.filter(item => latestStatus(item) === 'met').length)
const missedCount = computed(() => objects.value.filter(item => latestStatus(item) === 'missed').length)
const noDataCount = computed(() => objects.value.filter(item => latestStatus(item) === 'no-data').length)
const dimensions = computed(() => ['Balans', 'Sens', 'Rozwój', 'Spójność', 'Sprawczość'].map((label, index) => ({ label, value: labStore.fixture.ritual.monthlyRatings[index] })))
const familyLabel = (family: LabFixtureObject['family']) => ({ keyResult: 'Rezultat', habit: 'Nawyk', tracker: 'Tracker', intention: 'Intencja', goal: 'Cel' })[family]
const iconFor = (family: LabFixtureObject['family']) => ({ keyResult: 'flag', habit: 'routine', tracker: 'monitoring', intention: 'gps_fixed', goal: 'outlined_flag' })[family]
</script>
