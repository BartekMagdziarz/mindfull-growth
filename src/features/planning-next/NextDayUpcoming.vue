<template>
  <!-- Nearest deadlines and rituals as tiles in the Compass's grammar: icon, title,
       a short date — nothing else on the surface. Done first (blue icon), then the
       open ones in service order (grey icon; overdue dates in rose). Done-and-past
       items wait behind "Minione (n)", the rest of the list behind "Jeszcze n" —
       both quiet tiles in the grid's last slots. -->
  <DsSurface
    elevation="raised-sm"
    class="ndt-card next-day-upcoming"
    :aria-label="t('planning.today.upcoming.title')"
  >
    <header>
      <span>{{ t('planning.today.upcoming.title') }}</span>
    </header>
    <p v-if="!front.length" class="ndt-empty">{{ t('planning.today.upcoming.empty') }}</p>
    <div v-if="front.length || pastDone.length" class="next-day-upcoming__list">
      <article
        v-for="entry in visible"
        :key="entry.key"
        class="ndt next-day-upcoming__tile"
        :class="tileClass(entry)"
        :title="markerContextLabel(entry, todayRef, t, locale)"
      >
        <!-- Compass grammar: the icon field, the title under it, a short date at the bottom.
             Done = a blue icon (and the tile leads the list); open = a grey, softer one. -->
        <button type="button" class="ndt__open" :aria-label="tileLabel(entry)" @click="open(entry)">
          <span
            class="next-day-upcoming__glyph"
            :title="
              entry.state === 'done' ? markerDateLabel(entry, todayRef, t, locale) : undefined
            "
            ><AppIcon :name="kindIcon(entry)"
          /></span>
          <strong class="ndt__title">{{ markerTitle(entry, t, locale, todayRef) }}</strong>
          <span
            v-if="entry.state !== 'done'"
            class="ndt__mark next-day-upcoming__mark"
            :class="{ 'is-rose': isOverdue(entry) }"
          >
            {{ markerShortDate(entry, todayRef, t, locale) }}
          </span>
        </button>
      </article>
      <!-- The rest of the list and the past: quiet tiles in the last slots, so the
           card never shows more than `limit` tiles (3 × 3). -->
      <article v-if="overflow" class="ndt next-day-upcoming__link-tile">
        <button
          type="button"
          class="ndt__open next-day-upcoming__more"
          :aria-expanded="expanded"
          @click="expanded = !expanded"
        >
          <span class="next-day-upcoming__glyph"
            ><AppIcon :name="expanded ? 'expand_less' : 'more_horiz'"
          /></span>
          <strong class="ndt__title">{{
            expanded
              ? t('planning.today.upcoming.less')
              : t('planning.today.upcoming.more', { n: hiddenCount })
          }}</strong>
        </button>
      </article>
      <article
        v-if="pastDone.length"
        class="ndt next-day-upcoming__link-tile"
        :class="{ 'is-active': pastOpen }"
      >
        <button
          type="button"
          class="ndt__open next-day-upcoming__past-toggle"
          :aria-expanded="pastOpen"
          @click="pastOpen = !pastOpen"
        >
          <span class="next-day-upcoming__glyph"><AppIcon name="history" /></span>
          <strong class="ndt__title">{{
            t('planning.today.upcoming.past', { n: pastDone.length })
          }}</strong>
        </button>
      </article>
    </div>
    <div v-if="pastOpen && pastDone.length" class="next-day-upcoming__list next-day-upcoming__past">
      <article
        v-for="entry in pastDone"
        :key="entry.key"
        class="ndt ndt--done next-day-upcoming__tile"
        :class="tileClass(entry)"
        :title="markerContextLabel(entry, todayRef, t, locale)"
      >
        <button type="button" class="ndt__open" :aria-label="tileLabel(entry)" @click="open(entry)">
          <span
            class="next-day-upcoming__glyph"
            :title="markerDateLabel(entry, todayRef, t, locale)"
            ><AppIcon :name="kindIcon(entry)"
          /></span>
          <strong class="ndt__title">{{ markerTitle(entry, t, locale, todayRef) }}</strong>
        </button>
      </article>
    </div>
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
import { markerContextLabel, markerDateLabel, markerShortDate, markerTitle } from './dayViewModels'

const props = withDefaults(
  defineProps<{ entries: DayMarker[]; todayRef: DayRef; limit?: number }>(),
  { limit: 9 }
)
const router = useRouter()
const { t, locale } = useT()

const expanded = ref(false)
const pastOpen = ref(false)
watch(
  () => props.todayRef,
  () => {
    expanded.value = false
    pastOpen.value = false
  }
)

/** Overdue + upcoming: done ones lead, the open ones follow in service order (overdue days are earlier). */
const front = computed(() => {
  const list = props.entries.filter(entry => bucketMarker(entry, props.todayRef) !== 'pastDone')
  return [
    ...list.filter(entry => entry.state === 'done'),
    ...list.filter(entry => entry.state !== 'done'),
  ]
})
/** Done and behind today, newest first. */
const pastDone = computed(() =>
  props.entries
    .filter(entry => bucketMarker(entry, props.todayRef) === 'pastDone')
    .slice()
    .reverse()
)
/** The "Minione" tile takes a slot, and so does "Jeszcze n" once the entries do not fit. */
const reserved = computed(() => (pastDone.value.length ? 1 : 0))
const overflow = computed(() => front.value.length + reserved.value > props.limit)
const collapsedCount = computed(() =>
  overflow.value ? Math.max(0, props.limit - reserved.value - 1) : front.value.length
)
const visible = computed(() =>
  expanded.value ? front.value : front.value.slice(0, collapsedCount.value)
)
const hiddenCount = computed(() => front.value.length - collapsedCount.value)

/** Overdue in the rose sense: a letter behind its day is waiting, never late. */
function isOverdue(entry: DayMarker): boolean {
  return entry.kind !== 'letter' && bucketMarker(entry, props.todayRef) === 'overdue'
}

function tileClass(entry: DayMarker): string[] {
  return [
    `is-${entry.kind}`,
    entry.state === 'done' ? 'is-done' : '',
    isOverdue(entry) ? 'is-overdue' : '',
    entry.state !== 'done' && entry.dayRef === props.todayRef ? 'ndt--today' : '',
  ].filter(Boolean)
}

/** The kind's icon regardless of state (the state is the icon's colour). */
function kindIcon(entry: DayMarker): string {
  if (entry.kind === 'deadline') return entry.goal.icon || 'outlined_flag'
  if (entry.kind === 'letter') return 'mail'
  if (entry.kind === 'return') return 'replay'
  if (entry.action === 'reflect') return 'rate_review'
  return entry.ritual === 'week' ? 'edit_calendar' : 'date_range'
}

function tileLabel(entry: DayMarker): string {
  const parts = [
    markerTitle(entry, t, locale.value, props.todayRef),
    markerContextLabel(entry, props.todayRef, t, locale.value),
    markerDateLabel(entry, props.todayRef, t, locale.value),
  ]
  return parts.join(', ')
}

/** An open goal whose deadline is today or behind: the closing ritual applies. */
function isClosable(entry: DayMarker): boolean {
  return entry.kind === 'deadline' && entry.state === 'due' && entry.dayRef <= props.todayRef
}

function open(entry: DayMarker) {
  // A goal at or past its deadline opens its closing ritual — summing up and moving the deadline both live there.
  if (entry.kind === 'deadline' && isClosable(entry)) {
    void router.push({
      name: 'goal-closing-ritual',
      params: { goalId: entry.goal.id },
      query: { return: `/today/${props.todayRef}` },
    })
    return
  }
  if (entry.kind === 'deadline') {
    void router.push({
      name: 'objects-family',
      params: { family: 'goals' },
      query: { expandedType: 'goal', expandedId: entry.goal.id },
    })
    return
  }
  // The path view: the letter opens its quote (and counts as read there), the return shows the follow-up steps.
  if (entry.kind === 'letter' || entry.kind === 'return') {
    void router.push({
      name: 'program-detail',
      params: { slug: entry.programSlug },
      ...(entry.kind === 'letter'
        ? { query: { letter: '1', enrollment: entry.enrollmentId } }
        : {}),
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
