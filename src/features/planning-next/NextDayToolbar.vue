<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { DayRef } from '@/domain/period'
import AppIcon from '@/components/shared/AppIcon.vue'
import { DsSurface } from '@/design-system/components'
import { useT } from '@/composables/useT'
import { addDaysToDayRef, getPeriodRefsForDate } from '@/utils/periods'
import { entryDateFromDay, formatRelativeDay } from '@/utils/relativeDay'
import NextDayEntriesBar from './NextDayEntriesBar.vue'
const props = defineProps<{ dayRef: DayRef }>()
const emit = defineEmits<{ navigate: [day: DayRef] }>()
const { t, locale } = useT()
const picker = ref(false)
const today = computed(() => getPeriodRefsForDate(new Date()).day)
const dateTitle = computed(() => new Intl.DateTimeFormat(locale.value, {
  day: 'numeric', month: 'long', ...(props.dayRef.slice(0,4) !== today.value.slice(0,4) ? { year: 'numeric' as const } : {}),
}).format(new Date(`${props.dayRef}T12:00:00`)))
watch(() => props.dayRef, () => { picker.value = false })
function pick(event: Event) {
  const value = (event.target as HTMLInputElement).value
  if (entryDateFromDay(value)) emit('navigate', value as DayRef)
}
</script>
<template>
  <DsSurface elevation="raised-sm" class="next-day-toolbar">
    <div class="next-day-toolbar__date" @keydown.esc="picker = false">
      <button type="button" :aria-label="t('planning.today.calendar.previousDay')" @click="emit('navigate', addDaysToDayRef(dayRef,-1))"><AppIcon name="chevron_left" /></button>
      <div class="next-day-toolbar__date-copy">
        <button type="button" :aria-label="t('planning.today.calendar.pickDay')" :aria-expanded="picker" @click="picker = !picker"><strong>{{ dateTitle }}</strong><small>{{ formatRelativeDay(dayRef,today,locale) }}</small></button>
      </div>
      <button type="button" :aria-label="t('planning.today.calendar.nextDay')" @click="emit('navigate', addDaysToDayRef(dayRef,1))"><AppIcon name="chevron_right" /></button>
      <button v-if="dayRef !== today" class="next-day-toolbar__return" type="button" :title="t('planning.today.calendar.backToToday')" :aria-label="t('planning.today.calendar.backToToday')" @click="emit('navigate',today)"><AppIcon name="calendar_today" /></button>
      <div v-if="picker" class="next-day-toolbar__picker">
        <label>{{ t('planning.today.calendar.pickDay') }}<input type="date" :value="dayRef" @change="pick" /></label>
        <button type="button" @click="picker=false">{{ t('common.buttons.cancel') }}</button>
      </div>
    </div>
    <NextDayEntriesBar :day-ref="dayRef" embedded />
  </DsSurface>
</template>
