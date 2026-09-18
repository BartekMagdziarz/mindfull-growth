<template>
  <!-- Nearest deadlines and rituals: a quiet list, no badges. Overdue first, then upcoming
       (due before done on the same day); done-and-past items fold into "Minione". -->
  <DsSurface
    elevation="raised-sm"
    class="next-day-upcoming"
    :aria-label="t('planning.today.upcoming.title')"
  >
    <header>
      <span>{{ t('planning.today.upcoming.title') }}</span>
    </header>
    <div class="next-day-upcoming__list">
      <button
        v-for="entry in visible"
        :key="entry.key"
        type="button"
        class="next-day-upcoming__row"
        :class="rowClass(entry)"
        :aria-label="rowLabel(entry)"
        @click="open(entry)"
      >
        <span class="next-day-upcoming__icon"><AppIcon :name="markerIcon(entry)" /></span>
        <span class="next-day-upcoming__copy"
          ><strong :title="markerTitle(entry, t, locale, todayRef)">{{
            markerTitle(entry, t, locale, todayRef)
          }}</strong>
          <span class="next-day-upcoming__context">{{
            markerContextLabel(entry, todayRef, t, locale)
          }}</span>
        </span>
        <em>{{ markerDateLabel(entry, todayRef, t, locale) }}</em>
      </button>
      <button
        v-if="hiddenCount > 0 || expanded"
        type="button"
        class="next-day-upcoming__more"
        :aria-expanded="expanded"
        @click="expanded = !expanded"
      >
        {{
          expanded
            ? t('planning.today.upcoming.less')
            : t('planning.today.upcoming.more', { n: hiddenCount })
        }}
      </button>
      <p v-if="!front.length">{{ t('planning.today.upcoming.empty') }}</p>
    </div>
    <details v-if="pastDone.length" class="next-day-upcoming__past">
      <summary>{{ t('planning.today.upcoming.past', { n: pastDone.length }) }}</summary>
      <div class="next-day-upcoming__list">
        <button
          v-for="entry in pastDone"
          :key="entry.key"
          type="button"
          class="next-day-upcoming__row"
          :class="rowClass(entry)"
          :aria-label="rowLabel(entry)"
          @click="open(entry)"
        >
          <span class="next-day-upcoming__icon"><AppIcon :name="markerIcon(entry)" /></span>
          <span class="next-day-upcoming__copy"
            ><strong :title="markerTitle(entry, t, locale, todayRef)">{{
              markerTitle(entry, t, locale, todayRef)
            }}</strong>
            <span class="next-day-upcoming__context">{{
              markerContextLabel(entry, todayRef, t, locale)
            }}</span>
          </span>
          <em>{{ markerDateLabel(entry, todayRef, t, locale) }}</em>
        </button>
      </div>
    </details>
  </DsSurface>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import type { DayRef } from '@/domain/period'
import { bucketMarker, type DayMarker } from '@/services/dayUpcomingQueries'
import AppIcon from '@/components/shared/AppIcon.vue'
import { useT } from '@/composables/useT'
import { DsSurface } from '@/design-system/components'
import { markerContextLabel, markerDateLabel, markerIcon, markerTitle } from './dayViewModels'

const props = withDefaults(
  defineProps<{ entries: DayMarker[]; todayRef: DayRef; limit?: number }>(),
  { limit: 4 }
)
const router = useRouter()
const { t, locale } = useT()

const expanded = ref(false)
watch(
  () => props.todayRef,
  () => {
    expanded.value = false
  }
)

/** Overdue + upcoming, in service order (date, due before done). Overdue days are earlier, so they lead. */
const front = computed(() =>
  props.entries.filter(entry => bucketMarker(entry, props.todayRef) !== 'pastDone')
)
/** Done and behind today, newest first. */
const pastDone = computed(() =>
  props.entries
    .filter(entry => bucketMarker(entry, props.todayRef) === 'pastDone')
    .slice()
    .reverse()
)
const visible = computed(() => (expanded.value ? front.value : front.value.slice(0, props.limit)))
const hiddenCount = computed(() => Math.max(0, front.value.length - props.limit))

function rowClass(entry: DayMarker): string[] {
  const bucket = bucketMarker(entry, props.todayRef)
  return [
    `is-${entry.kind}`,
    entry.state === 'done' ? 'is-done' : '',
    bucket === 'overdue' ? 'is-overdue' : '',
  ].filter(Boolean)
}

function rowLabel(entry: DayMarker): string {
  const parts = [
    markerTitle(entry, t, locale.value, props.todayRef),
    markerContextLabel(entry, props.todayRef, t, locale.value),
    markerDateLabel(entry, props.todayRef, t, locale.value),
  ]
  return parts.join(', ')
}

function open(entry: DayMarker) {
  if (entry.kind === 'deadline') {
    void router.push({
      name: 'objects-family',
      params: { family: 'goals' },
      query: { expandedType: 'goal', expandedId: entry.goal.id },
    })
    return
  }
  if (entry.ritual === 'week')
    void router.push({
      name: 'calendar-week',
      params: { weekRef: entry.weekRef },
      query: { action: entry.action },
    })
  else
    void router.push({
      name: 'calendar-month',
      params: { monthRef: entry.monthRef },
      query: { action: entry.action },
    })
}
</script>
