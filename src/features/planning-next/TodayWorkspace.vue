<template>
  <div class="mg-design-v2 planning-next planning-next--today">
    <DsState
      v-if="invalidDay"
      icon="event_busy"
      title="Nieprawidłowy dzień"
      body="Sprawdź adres i spróbuj ponownie."
    />
    <div
      v-else
      class="planning-next__sheet planning-next__sheet--day today-calendar-layout"
      :class="{ 'is-planning': expanded }"
    >
      <aside class="today-calendar-layout__left">
        <NextDayToolbar v-show="!expanded" :day-ref="dayRef" @navigate="navigateToDay" />
        <NextDayPlanCalendar
          v-if="expanded || store.targetingItem"
          class="today-calendar-layout__calendar"
          :day-ref="dayRef"
          :expanded="expanded"
          @expand="expanded = $event"
          @navigate="navigateToDay"
        />
        <NextDayRail
          v-show="!expanded"
          class="today-calendar-layout__list"
          :day-ref="dayRef"
          calendar-context
          inline-charts
          @plan-week="expanded = true"
        />
      </aside>
      <main v-show="!expanded" class="today-calendar-layout__right">
        <NextDayContextRail
          v-show="!expanded"
          class="today-calendar-layout__context"
          :day-ref="dayRef"
        />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { DayRef } from '@/domain/period'
import { DsState } from '@/design-system/components'
import { getPeriodType, parsePeriodRef } from '@/utils/periods'
import NextDayPlanCalendar from './NextDayPlanCalendar.vue'
import NextDayContextRail from './NextDayContextRail.vue'
import NextDayToolbar from './NextDayToolbar.vue'
import { useTodayStore } from '@/stores/today.store'
import NextDayRail from './NextDayRail.vue'
import './planning-next.css'
import { provideDayPlanDragMotion } from './useDayPlanDragMotion'

provideDayPlanDragMotion()

/**
 * Dzisiaj — the day as a unit of execution, on its own route (`/today/:dayRef`).
 * Left: compact date/entry toolbar and daily plan with inline history. Right: context. Weekly planning expands in place without changing
 * the day underneath.
 */
const props = defineProps<{ dayRef: DayRef }>()

const store = useTodayStore()
const expanded = ref(false)
const route = useRoute()
const router = useRouter()

const invalidDay = computed(() => {
  try {
    return getPeriodType(parsePeriodRef(props.dayRef)) !== 'day'
  } catch {
    return true
  }
})

function navigateToDay(dayRef: DayRef) {
  store.cancelTargeting()
  void router.push({
    name: 'today-day',
    params: { dayRef },
    query: route.query.ui ? { ui: route.query.ui } : {},
  })
}
</script>
