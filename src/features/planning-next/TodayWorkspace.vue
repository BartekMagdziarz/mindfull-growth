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
        <NextDayPlanCalendar
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
        />
      </aside>
      <main v-show="!expanded" class="today-calendar-layout__right">
        <NextDayEntriesBar class="today-calendar-layout__entries" :day-ref="dayRef" />
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
import NextDayEntriesBar from './NextDayEntriesBar.vue'
import NextDayRail from './NextDayRail.vue'
import './planning-next.css'
import { provideDayPlanDragMotion } from './useDayPlanDragMotion'

provideDayPlanDragMotion()

/**
 * Dzisiaj — the day as a unit of execution, on its own route (`/today/:dayRef`).
 * Left: calendar, selected object evidence and daily plan. Right: entry
 * shortcuts and context. Weekly planning expands in place without changing
 * the day underneath.
 */
const props = defineProps<{ dayRef: DayRef }>()

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
  void router.push({
    name: 'today-day',
    params: { dayRef },
    query: route.query.ui ? { ui: route.query.ui } : {},
  })
}
</script>
