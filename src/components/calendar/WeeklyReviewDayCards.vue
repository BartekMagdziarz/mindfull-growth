<template>
  <div class="space-y-4">
    <!-- Loading skeleton -->
    <div v-if="isLoading" class="grid grid-cols-2 gap-2 sm:grid-cols-7">
      <div
        v-for="n in 7"
        :key="n"
        class="neo-inset animate-pulse rounded-2xl p-3"
        style="min-height: 200px"
      >
        <div class="h-3 w-10 rounded bg-outline/20" />
        <div class="mt-2 h-5 w-6 rounded bg-outline/10" />
      </div>
    </div>

    <template v-else>
      <!-- 7-day horizontal row -->
      <div class="grid grid-cols-2 gap-2.5 sm:grid-cols-4 md:grid-cols-7">
        <button
          v-for="day in dailyBreakdown"
          :key="day.dayRef"
          type="button"
          class="neo-focus flex min-h-[200px] flex-col overflow-hidden rounded-2xl bg-neu-base text-left transition-all duration-200 shadow-neu-raised-sm hover:-translate-y-px hover:shadow-neu-raised"
          :class="isToday(day.dayRef) && 'ring-1 ring-primary/40'"
          @click="selectedDayRef = day.dayRef"
        >
          <!-- Header: weekday + day number -->
          <div class="flex items-baseline justify-between px-3.5 pb-2 pt-3.5">
            <span class="text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant/75">
              {{ shortDayName(day.dayRef) }}
            </span>
            <span class="text-xl font-semibold leading-none text-on-surface">
              {{ dayNumber(day.dayRef) }}
            </span>
          </div>

          <div class="flex flex-1 flex-col gap-2.5 px-3 pb-3.5">
            <!-- Top zone: event badges (journal / emotions pie / exercises) -->
            <div
              v-if="hasAnyEvents(day)"
              class="flex min-h-[62px] items-center justify-center gap-2.5 py-1.5"
            >
              <div
                v-if="day.journal.items.length > 0"
                class="flex h-14 w-14 items-center justify-center rounded-full bg-neu-base shadow-neu-raised-sm"
                :title="journalTitle(day)"
              >
                <AppIcon name="edit_note" class="text-xl text-primary" />
              </div>

              <div
                v-if="day.emotions.totalLogs > 0"
                class="flex h-14 w-14 items-center justify-center rounded-full bg-neu-base p-[5px] shadow-neu-raised-sm"
                :title="emotionsTitle(day)"
              >
                <div
                  class="h-full w-full rounded-full shadow-neu-pressed-sm"
                  :style="{ background: emotionConicGradient(day.emotions.quadrantCounts) }"
                />
              </div>

              <div
                v-if="day.exercises.count > 0"
                class="flex h-14 w-14 items-center justify-center rounded-full bg-neu-base shadow-neu-raised-sm"
                :title="exercisesTitle(day)"
              >
                <AppIcon name="psychology" class="text-xl text-primary" />
              </div>
            </div>

            <!-- Separator between zones -->
            <div
              v-if="hasAnyEvents(day) && dayRings(day).length > 0"
              class="mx-1 h-px rounded shadow-neu-pressed-sm"
            />

            <div class="flex-1" />

            <!-- Bottom zone: progress rings (goals / habits / trackers) -->
            <div
              v-if="dayRings(day).length > 0"
              class="flex flex-wrap items-start justify-center gap-2.5 pt-1"
            >
              <ProgressRingIcon
                v-for="ring in dayRings(day)"
                :key="ring.kind"
                :icon="ring.icon"
                :value="ring.value"
                :max="ring.max"
              />
            </div>

            <!-- Empty day hint -->
            <div
              v-if="!hasAnyEvents(day) && dayRings(day).length === 0"
              class="flex flex-1 items-center justify-center text-[10px] text-on-surface-variant/60"
            >
              —
            </div>
          </div>
        </button>
      </div>

      <!-- Week summary: 3-column layout (journal+emotions | grid | kontekst).
           Inside the wizard we already provide editing via the wizard steps,
           so the kontekst card hides its create/edit affordances here. -->
      <WeekReviewSummary
        :week-ref="weekRef"
        :today-day-ref="todayDayRef"
        :week-object-items="weekObjectItems"
        :raw-entries="rawEntries"
        :all-day-assignments="allDayAssignments"
        :kontekst-actions="false"
      />

      <!-- Day detail modal -->
      <Teleport to="body">
        <Transition
          enter-active-class="transition-opacity duration-150"
          leave-active-class="transition-opacity duration-150"
          enter-from-class="opacity-0"
          leave-to-class="opacity-0"
        >
          <div
            v-if="selectedDay"
            class="fixed inset-0 z-[100] flex items-center justify-center bg-overlay-scrim/50 p-4 backdrop-blur-sm"
            @click="selectedDayRef = null"
          >
            <div
              class="neo-card max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-neu-top p-5 md:p-6"
              @click.stop
            >
              <div class="mb-4 flex items-start justify-between">
                <div>
                  <div class="text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant/75">
                    {{ shortDayName(selectedDay.dayRef) }}
                  </div>
                  <div class="mt-0.5 text-2xl font-semibold text-on-surface">
                    {{ fullDayName(selectedDay.dayRef) }}
                  </div>
                </div>
                <button
                  type="button"
                  class="neo-focus flex h-8 w-8 items-center justify-center rounded-full bg-neu-base text-on-surface-variant shadow-neu-raised-sm hover:-translate-y-px hover:shadow-neu-raised"
                  :aria-label="t('common.buttons.close')"
                  @click="selectedDayRef = null"
                >
                  <AppIcon name="close" class="text-sm" />
                </button>
              </div>

              <div class="space-y-4">
                <!-- Goals + Habits grouped -->
                <template v-if="selectedDay.keyResults.items.length > 0 || selectedDay.habits.items.length > 0">
                  <div>
                    <ModalSectionHeader icon="target" :title="t('planning.reflection.review.goalsAndHabits')" />
                    <div class="mt-2 space-y-1.5">
                      <div
                        v-for="kr in selectedDay.keyResults.items"
                        :key="`kr-${kr.id}`"
                        class="flex items-center gap-2.5 rounded-xl bg-neu-base px-3 py-2 shadow-neu-pressed-sm"
                      >
                        <StatusChip state="logged" />
                        <AppIcon name="flag" class="shrink-0 text-xs text-on-surface-variant" />
                        <span class="min-w-0 flex-1 truncate text-xs text-on-surface">
                          {{ kr.name }}
                        </span>
                        <span
                          v-if="kr.value !== null"
                          class="shrink-0 text-xs font-semibold text-primary tabular-nums"
                        >
                          {{ kr.value }}
                        </span>
                      </div>
                      <div
                        v-for="habit in selectedDay.habits.items"
                        :key="`h-${habit.id}`"
                        class="flex items-center gap-2.5 rounded-xl bg-neu-base px-3 py-2 shadow-neu-pressed-sm"
                      >
                        <StatusChip :state="habit.status === 'completed' ? 'hit' : 'miss'" />
                        <AppIcon name="repeat" class="shrink-0 text-xs text-on-surface-variant" />
                        <span class="min-w-0 flex-1 truncate text-xs text-on-surface">
                          {{ habit.name }}
                        </span>
                        <span
                          v-if="habit.value !== undefined && habit.value !== null"
                          class="shrink-0 text-xs font-semibold text-on-surface-variant tabular-nums"
                        >
                          {{ habit.value }}
                        </span>
                      </div>
                    </div>
                  </div>
                </template>

                <!-- Trackers -->
                <template v-if="selectedDay.trackers.items.length > 0">
                  <div>
                    <ModalSectionHeader icon="monitoring" :title="t('planning.reflection.review.trackers')" />
                    <div class="mt-2 space-y-1.5">
                      <div
                        v-for="tracker in selectedDay.trackers.items"
                        :key="tracker.id"
                        class="flex items-center gap-2.5 rounded-xl bg-neu-base px-3 py-2 shadow-neu-pressed-sm"
                      >
                        <span class="min-w-0 flex-1 truncate text-xs text-on-surface">
                          {{ tracker.name }}
                        </span>
                        <span
                          v-if="tracker.value !== null"
                          class="shrink-0 text-xs font-semibold text-on-surface tabular-nums"
                        >
                          {{ tracker.value }}
                        </span>
                        <span v-else class="shrink-0 text-xs text-on-surface-variant/60">—</span>
                      </div>
                    </div>
                  </div>
                </template>

                <!-- Emotions -->
                <template v-if="selectedDay.emotions.sessions.length > 0">
                  <div>
                    <ModalSectionHeader
                      icon="mood"
                      :title="`${t('planning.reflection.review.emotions')} (${selectedDay.emotions.sessions.length})`"
                    />
                    <div class="mt-2 space-y-2">
                      <div
                        v-for="(session, i) in selectedDay.emotions.sessions"
                        :key="i"
                        class="rounded-xl bg-neu-base px-3 py-2.5 shadow-neu-pressed-sm"
                      >
                        <div class="mb-1.5 flex items-center gap-2">
                          <span class="text-xs font-semibold text-on-surface">
                            {{ formatTime(session.createdAt) }}
                          </span>
                          <span
                            v-if="session.note"
                            class="truncate text-[11px] italic text-on-surface-variant"
                          >
                            "{{ session.note }}"
                          </span>
                        </div>
                        <div class="flex flex-wrap gap-1">
                          <span
                            v-for="emotionId in session.emotionIds"
                            :key="emotionId"
                            class="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium"
                            :style="emotionPillStyle(emotionId)"
                          >
                            {{ emotionName(emotionId) }}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </template>

                <!-- Journal -->
                <template v-if="selectedDay.journal.items.length > 0">
                  <div>
                    <ModalSectionHeader
                      icon="edit_note"
                      :title="`${t('planning.reflection.review.journals')} (${selectedDay.journal.items.length})`"
                    />
                    <div class="mt-2 space-y-2">
                      <div
                        v-for="entry in selectedDay.journal.items"
                        :key="entry.id"
                        class="rounded-xl bg-neu-base px-3 py-2.5 shadow-neu-pressed-sm"
                      >
                        <div class="mb-1 flex items-center gap-1.5">
                          <span class="truncate text-xs font-semibold text-on-surface">
                            {{ entry.title }}
                          </span>
                          <AppIcon
                            v-if="entry.hasAISuggestions"
                            name="auto_awesome"
                            class="shrink-0 text-xs text-primary"
                          />
                        </div>
                        <p
                          v-if="entry.body"
                          class="line-clamp-3 text-xs leading-relaxed text-on-surface-variant"
                        >
                          {{ entry.body }}
                        </p>
                      </div>
                    </div>
                  </div>
                </template>

                <!-- Exercises -->
                <template v-if="selectedDay.exercises.items.length > 0">
                  <div>
                    <ModalSectionHeader
                      icon="psychology"
                      :title="`${t('planning.reflection.review.exercises')} (${selectedDay.exercises.items.length})`"
                    />
                    <div class="mt-2 space-y-1.5">
                      <div
                        v-for="exercise in selectedDay.exercises.items"
                        :key="exercise.id"
                        class="flex items-center gap-2.5 rounded-xl bg-neu-base px-3 py-2 shadow-neu-pressed-sm"
                      >
                        <span class="text-[10px] font-semibold uppercase tracking-wider text-primary">
                          {{ exercise.type }}
                        </span>
                      </div>
                    </div>
                  </div>
                </template>

                <p
                  v-if="isDayEmpty(selectedDay)"
                  class="py-6 text-center text-sm text-on-surface-variant"
                >
                  {{ t('planning.reflection.review.noData') }}
                </p>
              </div>
            </div>
          </div>
        </Transition>
      </Teleport>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import AppIcon from '@/components/shared/AppIcon.vue'
import WeekReviewSummary from './WeekReviewSummary.vue'
import ProgressRingIcon from './WeeklyReviewProgressRing.vue'
import ModalSectionHeader from './WeeklyReviewModalSection.vue'
import StatusChip from './WeeklyReviewStatusChip.vue'
import { useT } from '@/composables/useT'
import { useEmotionStore } from '@/stores/emotion.store'
import { getQuadrant } from '@/domain/emotion'
import type { Quadrant } from '@/domain/emotion'
import type { DayRef, WeekRef } from '@/domain/period'
import type {
  DailyActivityBreakdown,
  WeekObjectItem,
  WeeklyReflectionDataBundle,
} from '@/services/reflectionDataQueries'
import type {
  DailyMeasurementEntry,
  MeasurementDayAssignment,
} from '@/domain/planningState'

const { t } = useT()
const emotionStore = useEmotionStore()

const props = defineProps<{
  dataBundle: WeeklyReflectionDataBundle | null
  weekRef: WeekRef
  todayDayRef: DayRef
  isLoading: boolean
}>()

// ---------------------------------------------------------------------------
// Derived data
// ---------------------------------------------------------------------------

const dailyBreakdown = computed<DailyActivityBreakdown[]>(
  () => props.dataBundle?.dailyBreakdown ?? [],
)

const weekObjectItems = computed<WeekObjectItem[]>(
  () => props.dataBundle?.weekObjectItems ?? [],
)

const rawEntries = computed<DailyMeasurementEntry[]>(
  () => props.dataBundle?.rawEntries ?? [],
)

const allDayAssignments = computed<MeasurementDayAssignment[]>(
  () => props.dataBundle?.allDayAssignments ?? [],
)

// ---------------------------------------------------------------------------
// Day card helpers
// ---------------------------------------------------------------------------

type RingKind = 'goals' | 'habits' | 'trackers'

interface DayRing {
  kind: RingKind
  icon: string
  value: number
  max: number
}

function hasAnyEvents(day: DailyActivityBreakdown): boolean {
  return (
    day.journal.items.length > 0 ||
    day.emotions.totalLogs > 0 ||
    day.exercises.count > 0
  )
}

function dayRings(day: DailyActivityBreakdown): DayRing[] {
  const rings: DayRing[] = []
  if (day.keyResults.items.length > 0) {
    const loggedCount = day.keyResults.items.filter((it) => it.value !== null).length
    rings.push({
      kind: 'goals',
      icon: 'flag',
      value: loggedCount || day.keyResults.items.length,
      max: day.keyResults.items.length,
    })
  }
  if (day.habits.items.length > 0) {
    const completedCount = day.habits.items.filter((it) => it.status === 'completed').length
    rings.push({
      kind: 'habits',
      icon: 'repeat',
      value: completedCount,
      max: day.habits.items.length,
    })
  }
  if (day.trackers.items.length > 0) {
    const loggedCount = day.trackers.items.filter(
      (it) => it.value !== null && it.value !== 0,
    ).length
    rings.push({
      kind: 'trackers',
      icon: 'monitoring',
      value: loggedCount || day.trackers.items.length,
      max: day.trackers.items.length,
    })
  }
  return rings
}

function isDayEmpty(day: DailyActivityBreakdown): boolean {
  return !hasAnyEvents(day) && dayRings(day).length === 0
}

function isToday(dayRef: DayRef): boolean {
  return dayRef === props.todayDayRef
}

function shortDayName(dayRef: DayRef): string {
  return new Date(dayRef + 'T12:00:00').toLocaleDateString(undefined, {
    weekday: 'short',
  })
}

function fullDayName(dayRef: DayRef): string {
  return new Date(dayRef + 'T12:00:00').toLocaleDateString(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
}

function dayNumber(dayRef: DayRef): string {
  return dayRef.slice(-2).replace(/^0/, '')
}

function journalTitle(day: DailyActivityBreakdown): string {
  return `${day.journal.items.length} ${t('planning.reflection.review.journals').toLowerCase()}`
}

function emotionsTitle(day: DailyActivityBreakdown): string {
  return `${day.emotions.totalLogs} ${t('planning.reflection.review.emotions').toLowerCase()}`
}

function exercisesTitle(day: DailyActivityBreakdown): string {
  return `${day.exercises.count} ${t('planning.reflection.review.exercises').toLowerCase()}`
}

// ---------------------------------------------------------------------------
// Emotion pie (conic-gradient) + quadrant tiles
// ---------------------------------------------------------------------------

const QUADRANT_ORDER: Quadrant[] = [
  'high-energy-high-pleasantness',
  'high-energy-low-pleasantness',
  'low-energy-low-pleasantness',
  'low-energy-high-pleasantness',
]

function quadrantColor(q: Quadrant): string {
  return `var(--color-quadrant-${q}-selected)`
}

function quadrantBorder(q: Quadrant): string {
  return `var(--color-quadrant-${q}-border)`
}

function emotionConicGradient(counts: Record<Quadrant, number>): string {
  const total = QUADRANT_ORDER.reduce((a, k) => a + counts[k], 0)
  if (total === 0) return 'transparent'
  let acc = 0
  const stops: string[] = []
  for (const q of QUADRANT_ORDER) {
    const v = counts[q]
    if (v === 0) continue
    const pct = (v / total) * 100
    stops.push(`${quadrantColor(q)} ${acc}% ${acc + pct}%`)
    acc += pct
  }
  return `conic-gradient(${stops.join(', ')})`
}

// ---------------------------------------------------------------------------
// Emotion pill helpers (modal)
// ---------------------------------------------------------------------------

function emotionName(id: string): string {
  return emotionStore.getEmotionById(id)?.name ?? id
}

function emotionPillStyle(id: string): Record<string, string> {
  const em = emotionStore.getEmotionById(id)
  if (!em) return { backgroundColor: 'var(--color-surface-container)', color: 'var(--color-on-surface)' }
  const q = getQuadrant(em)
  return {
    backgroundColor: quadrantColor(q),
    border: `1.5px solid ${quadrantBorder(q)}`,
    color: 'var(--color-on-surface)',
  }
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  })
}

// ---------------------------------------------------------------------------
// Modal state
// ---------------------------------------------------------------------------

const selectedDayRef = ref<DayRef | null>(null)

const selectedDay = computed(() => {
  if (!selectedDayRef.value) return null
  return dailyBreakdown.value.find((d) => d.dayRef === selectedDayRef.value) ?? null
})
</script>
