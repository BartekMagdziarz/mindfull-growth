<template>
  <!-- Right column of the day: date & calendar, compass, nearest signals, programs. -->
  <div class="next-day-context">
    <ReturnInvite v-if="isToday" />
    <NextDayCompass
      :priorities="context.focusPriorities.value"
      :focus-items="focusItems"
      :selected-key="store.pinnedKey"
      @hover="store.setHoverKey($event)"
      @select="store.togglePinnedKey($event)"
    />
    <NextDayUpcoming
      :entries="context.upcoming.value"
      :today-ref="context.todayRef.value"
      :limit="9"
    />
    <NextDayPrograms :day-ref="dayRef" />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, toRef, watch } from 'vue'
import type { DayRef } from '@/domain/period'
import ReturnInvite from '@/features/return-ritual/ReturnInvite.vue'
import { useReturnStore } from '@/stores/return.store'
import { useTodayStore } from '@/stores/today.store'
import { getPeriodRefsForDate } from '@/utils/periods'
import NextDayCompass from './NextDayCompass.vue'
import NextDayPrograms from './NextDayPrograms.vue'
import NextDayUpcoming from './NextDayUpcoming.vue'
import { useDayContext } from './useDayContext'

const props = defineProps<{ dayRef: DayRef }>()
const store = useTodayStore()
const returnStore = useReturnStore()
const context = useDayContext(toRef(props, 'dayRef'))
const isToday = computed(() => props.dayRef === getPeriodRefsForDate(new Date()).day)

// A break is detected once per session, on the first Today load.
onMounted(() => {
  void returnStore.detect()
})

// Week focuses = the day's items marked as this week's top-3 (WeekPlan.topPriorities).
const focusItems = computed(() =>
  store.allVisibleItems
    .filter(item => item.kind === 'measurement' && item.isTopPriority)
    .slice(0, 3)
)

// Planning writes (move, add, hide) can change deadlines' relevance or create a
// plan; refresh the context whenever the day bundle reloads.
watch(
  () => store.bundle,
  () => void context.reload()
)
</script>
