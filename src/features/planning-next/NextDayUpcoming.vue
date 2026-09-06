<template>
  <!-- Nearest deadlines and rituals: a quiet list, no badges. -->
  <DsSurface elevation="raised-sm" class="next-day-upcoming" :aria-label="t('planning.today.upcoming.title')">
    <header><span>{{ t('planning.today.upcoming.title') }}</span></header>
    <div class="next-day-upcoming__list">
      <button v-for="entry in visible" :key="entry.key" type="button" class="next-day-upcoming__row" :class="`is-${entry.kind}`" @click="open(entry)">
        <span class="next-day-upcoming__icon"><AppIcon :name="markerIcon(entry)" /></span>
        <strong :title="markerTitle(entry, t, locale)">{{ markerTitle(entry, t, locale) }}</strong>
        <em>{{ dateLabel(entry.dayRef) }}</em>
      </button>
      <p v-if="!visible.length">{{ t('planning.today.upcoming.empty') }}</p>
    </div>
  </DsSurface>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import type { DayRef } from '@/domain/period'
import type { DayMarker } from '@/services/dayUpcomingQueries'
import AppIcon from '@/components/shared/AppIcon.vue'
import { useT } from '@/composables/useT'
import { DsSurface } from '@/design-system/components'
import { markerIcon, markerTitle } from './dayViewModels'

const props = withDefaults(defineProps<{ entries: DayMarker[]; todayRef: DayRef; limit?: number }>(), { limit: 4 })
const router = useRouter()
const { t, locale } = useT()

const visible = computed(() => props.entries.slice(0, props.limit))
const weekdayFormatter = computed(() => new Intl.DateTimeFormat(locale.value, { weekday: 'short' }))

function dateLabel(dayRef: DayRef): string {
  if (dayRef === props.todayRef) return t('planning.today.upcoming.today')
  return `${weekdayFormatter.value.format(new Date(`${dayRef}T12:00:00`)).replace('.', '')} ${Number(dayRef.slice(-2))}`
}

function open(entry: DayMarker) {
  if (entry.kind === 'deadline') {
    void router.push({ name: 'objects-family', params: { family: 'goals' }, query: { expandedType: 'goal', expandedId: entry.goal.id } })
    return
  }
  if (entry.ritual === 'week') void router.push({ name: 'calendar-week', params: { weekRef: entry.weekRef }, query: { action: 'plan' } })
  else void router.push({ name: 'calendar-month', params: { monthRef: entry.monthRef }, query: { action: 'plan' } })
}
</script>
