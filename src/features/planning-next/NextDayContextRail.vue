<template>
  <!-- Right column of the day: date & calendar, compass, nearest signals, programs. -->
  <div class="next-day-context">
    <NextDayCalendarCard
      :day-ref="dayRef"
      :today-ref="context.todayRef.value"
      :markers="context.markers.value"
      :targeting="store.targetingItem !== null"
      :targeting-week-ref="store.targetingItem ? rescheduleWeekLock(store.targetingItem) : null"
      @navigate="emit('navigate', $event)"
      @pick="store.pickTargetDay($event)"
      @cancel-targeting="store.cancelTargeting()"
    />
    <NextDayCompass
      :priorities="context.focusPriorities.value"
      :focus-items="focusItems"
      :selected-key="store.pinnedKey"
      @hover="store.setHoverKey($event)"
      @select="store.togglePinnedKey($event)"
    />
    <NextDayUpcoming :entries="context.upcoming.value" :today-ref="context.todayRef.value" :limit="4" />
    <NextDayPrograms :day-ref="dayRef" />
  </div>
</template>

<script setup lang="ts">
import { computed, toRef, watch } from 'vue'
import type { DayRef } from '@/domain/period'
import { useTodayStore } from '@/stores/today.store'
import NextDayCalendarCard from './NextDayCalendarCard.vue'
import NextDayCompass from './NextDayCompass.vue'
import NextDayPrograms from './NextDayPrograms.vue'
import NextDayUpcoming from './NextDayUpcoming.vue'
import { rescheduleWeekLock } from './dayViewModels'
import { useDayContext } from './useDayContext'

const props = defineProps<{ dayRef: DayRef }>()
const emit = defineEmits<{ navigate: [dayRef: DayRef] }>()
const store = useTodayStore()
const context = useDayContext(toRef(props, 'dayRef'))

// Week focuses = the day's items marked as this week's top-3 (WeekPlan.topPriorities).
const focusItems = computed(() => store.allVisibleItems.filter(item => item.kind === 'measurement' && item.isTopPriority).slice(0, 3))

// Planning writes (move, add, hide) can change deadlines' relevance or create a
// plan; refresh the context whenever the day bundle reloads.
watch(() => store.bundle, () => void context.reload())
</script>
