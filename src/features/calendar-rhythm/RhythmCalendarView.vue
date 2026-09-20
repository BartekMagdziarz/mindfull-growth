<template>
  <div class="cp mg-design-v2">
    <div class="cp__paper">
      <!-- One line of date and scale; chart granularity is a magnifier inside each series row. -->
      <header class="cp__head">
        <div class="cp__date">
          <button type="button" class="cp__arrow" aria-label="Poprzedni okres" @click="shift(-1)">
            <AppIcon name="chevron_left" />
          </button>
          <h2>{{ title }}</h2>
          <button type="button" class="cp__arrow" aria-label="Następny okres" @click="shift(1)">
            <AppIcon name="chevron_right" />
          </button>
          <button v-if="!state.isTodayFocused.value" type="button" class="cp-btn cp-btn--quiet" @click="goToday">Dziś</button>
        </div>
        <div class="cp__scales" role="group" aria-label="Skala kalendarza">
          <button
            v-for="option in SCALE_OPTIONS"
            :key="option.id"
            type="button"
            :class="{ on: option.id === scale }"
            :aria-pressed="option.id === scale"
            @click="emit('open-scale', option.id)"
          >
            {{ option.label }}
          </button>
        </div>
      </header>

      <DsState
        v-if="state.isLoading.value && !state.scenario.value.objects.length"
        icon="hourglass_empty"
        title="Ładuję kalendarz"
        body="Zbieram plan, wykonanie i refleksje tego okresu."
      />
      <DsState
        v-else-if="state.error.value"
        icon="error"
        title="Nie udało się wczytać kalendarza"
        :body="state.error.value"
        action-label="Spróbuj ponownie"
        @action="void state.load()"
      />
      <template v-else>
        <RhythmPeriodSummary
          :scenario="state.scenario.value"
          :scale="scale"
          :period-ref="periodRef"
          :units="state.units.value"
          :open="state.summaryOpen.value"
          :view="state.view.value"
          :state="state.periodState.value"
          @toggle="state.toggleSummary"
          @focus="state.setView"
          @ritual="openRitual"
          @open-week="openUnit"
        />
        <RhythmBoard
          :rows="rows"
          :units="state.units.value"
          :scale="scale"
          :objects="state.scenario.value.objects"
          :fine="state.fineKeys.value"
          :view="state.view.value"
          :options="viewOptions"
          @set-view="state.setView"
          @toggle-more="state.toggleMore"
          @toggle-fine="state.toggleFine"
          @open-unit="openUnit"
        />
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, toRef } from 'vue'
import type { PeriodRef } from '@/domain/period'
import type { PlanningScale } from '@/design-system/contracts'
import { DsState } from '@/design-system/components'
import AppIcon from '@/components/shared/AppIcon.vue'
import { getNextPeriod, getPeriodRefsForDate, getPeriodType, getPreviousPeriod } from '@/utils/periods'
import RhythmBoard from './RhythmBoard.vue'
import RhythmPeriodSummary, { type RitualKind } from './RhythmPeriodSummary.vue'
import { SCALES, periodTitle, type Scale } from './rhythmProjections'
import { buildRows, viewOptions as viewOptionsFor } from './rhythmRows'
import { useRhythmCalendar } from './useRhythmCalendar'
import './rhythm.css'

const props = defineProps<{ scale: Scale; periodRef: string }>()
const emit = defineEmits<{
  'open-period': [scale: PlanningScale, periodRef: string]
  'open-scale': [scale: Scale]
  'open-ritual': [action: 'plan' | 'reflect']
}>()

const SCALE_OPTIONS = SCALES
const state = useRhythmCalendar(toRef(props, 'scale'), toRef(props, 'periodRef'))

const title = computed(() => periodTitle(props.scale, props.periodRef))
const viewOptions = computed(() =>
  viewOptionsFor(state.scenario.value, props.scale, props.periodRef, state.units.value),
)
const rows = computed(() =>
  buildRows(state.scenario.value, props.scale, props.periodRef, state.units.value, state.view.value, {
    moreSeries: state.moreSeries.value,
  }),
)

function shift(direction: -1 | 1) {
  const ref = props.periodRef as PeriodRef
  emit('open-period', props.scale, direction > 0 ? getNextPeriod(ref) : getPreviousPeriod(ref))
}

function goToday() {
  const refs = getPeriodRefsForDate(new Date())
  emit('open-period', props.scale, props.scale === 'year' ? refs.year : props.scale === 'month' ? refs.month : refs.week)
}

/** Clicking a sub-period zooms into it: a week/month becomes the focus of its own scale, a day opens the day view. */
function openUnit(unitRef: string) {
  const type = getPeriodType(unitRef as PeriodRef)
  if (type === 'year') return
  emit('open-period', type, unitRef)
}

/**
 * One place for the period's rituals. The label follows the state of the
 * period, not the scale (see the summary header).
 */
function openRitual(kind: RitualKind) {
  emit('open-ritual', kind === 'plan' ? 'plan' : 'reflect')
}
</script>
