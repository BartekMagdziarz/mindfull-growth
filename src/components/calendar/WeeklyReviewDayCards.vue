<template>
  <div>
    <!-- Loading skeleton -->
    <div v-if="isLoading" class="grid grid-cols-4 gap-2">
      <div v-for="n in 8" :key="n" class="neo-inset animate-pulse rounded-2xl p-3">
        <div class="h-4 w-10 rounded bg-outline/20" />
        <div class="mt-1 h-3 w-6 rounded bg-outline/10" />
        <div class="mt-3 h-3 w-full rounded bg-outline/10" />
      </div>
    </div>

    <template v-else>
      <!-- 4×2 grid: 7 day cards + summary card -->
      <div class="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <!-- Day cards -->
        <button
          v-for="day in dailyBreakdown"
          :key="day.dayRef"
          type="button"
          class="rounded-2xl p-2.5 text-left transition-all duration-200 neo-focus"
          :class="[
            selectedCard === day.dayRef
              ? 'neo-card ring-2 ring-primary/40'
              : 'neo-inset hover:shadow-neu-raised-sm',
            isDayEmpty(day) && 'opacity-50',
          ]"
          @click="selectCard(day.dayRef)"
        >
          <!-- Header -->
          <div class="flex items-baseline justify-between">
            <span class="text-xs font-semibold text-on-surface-variant">
              {{ shortDayName(day.dayRef) }}
            </span>
            <span class="text-sm font-bold text-on-surface">
              {{ dayNumber(day.dayRef) }}
            </span>
          </div>

          <!-- Category rows -->
          <div class="mt-2 space-y-1.5">
            <!-- Habits -->
            <div v-if="day.habits.items.length > 0" class="flex items-center gap-1.5">
              <AppIcon name="task_alt" class="text-sm text-primary" />
              <span class="text-xs tabular-nums text-on-surface">
                {{ day.habits.items.filter(h => h.status === 'completed').length }}
              </span>
              <span v-if="day.habits.items.some(h => h.status === 'missed')" class="text-xs tabular-nums text-error">
                / {{ day.habits.items.filter(h => h.status === 'missed').length }}
                <AppIcon name="close" class="text-xs" />
              </span>
            </div>

            <!-- Emotions -->
            <div v-if="day.emotions.totalLogs > 0" class="flex items-center gap-1.5">
              <AppIcon name="mood" class="text-sm text-on-surface-variant" />
              <div class="flex items-center gap-0.5">
                <span
                  v-for="emotion in day.emotions.items.slice(0, 3)"
                  :key="emotion.emotionId"
                  class="inline-block h-2 w-2 rounded-full"
                  :style="{ backgroundColor: quadrantDotColor(emotion.quadrant) }"
                />
                <span class="ml-0.5 text-xs text-on-surface-variant">
                  {{ day.emotions.totalLogs }}
                </span>
              </div>
            </div>

            <!-- Journal -->
            <div v-if="day.journal.items.length > 0" class="flex items-center gap-1.5">
              <AppIcon name="edit_note" class="text-sm text-on-surface-variant" />
              <span class="text-xs text-on-surface-variant">{{ day.journal.items.length }}</span>
            </div>

            <!-- Exercises -->
            <div v-if="day.exercises.count > 0" class="flex items-center gap-1.5">
              <AppIcon name="psychology" class="text-sm text-on-surface-variant" />
              <span class="text-xs text-on-surface-variant">{{ day.exercises.count }}</span>
            </div>

            <!-- Key Results -->
            <div v-if="day.keyResults.items.length > 0" class="flex items-center gap-1.5">
              <AppIcon name="flag" class="text-sm text-on-surface-variant" />
              <span class="text-xs text-on-surface-variant">{{ day.keyResults.items.length }}</span>
            </div>

            <!-- Trackers -->
            <div v-if="day.trackers.items.length > 0" class="flex items-center gap-1.5">
              <AppIcon name="monitoring" class="text-sm text-on-surface-variant" />
              <span class="text-xs text-on-surface-variant">{{ day.trackers.items.length }}</span>
            </div>
          </div>
        </button>

        <!-- Summary card -->
        <button
          type="button"
          class="rounded-2xl p-2.5 text-left transition-all duration-200 neo-focus border border-primary/20"
          :class="[
            selectedCard === 'summary'
              ? 'neo-card ring-2 ring-primary/40'
              : 'neo-inset hover:shadow-neu-raised-sm',
          ]"
          @click="selectCard('summary')"
        >
          <div class="text-xs font-semibold text-primary">
            {{ t('planning.reflection.review.summary') }}
          </div>

          <div class="mt-2 space-y-1.5">
            <!-- Weekly habits progress -->
            <div v-for="habit in weeklySummary.weeklyHabits.slice(0, 3)" :key="habit.id" class="flex items-center gap-1.5">
              <AppIcon
                :name="habit.evaluationStatus === 'met' ? 'check_circle' : 'radio_button_unchecked'"
                class="text-sm"
                :class="habit.evaluationStatus === 'met' ? 'text-primary' : 'text-on-surface-variant'"
              />
              <span class="text-xs truncate" :class="habit.evaluationStatus === 'met' ? 'text-on-surface' : 'text-on-surface-variant'">
                {{ habit.entryCount }}<template v-if="habit.target && habit.target.kind === 'count'">/{{ habit.target.value }}</template>
              </span>
            </div>

            <!-- Monthly habit counts -->
            <div v-for="habit in weeklySummary.monthlyHabits.slice(0, 2)" :key="habit.id" class="flex items-center gap-1.5">
              <AppIcon name="calendar_month" class="text-sm text-on-surface-variant" />
              <span class="text-xs text-on-surface-variant truncate">
                {{ habit.weekEntryCount }}×
              </span>
            </div>

            <!-- Aggregates -->
            <div v-if="weeklySummary.totalEmotionLogs > 0" class="flex items-center gap-1.5">
              <AppIcon name="mood" class="text-sm text-on-surface-variant" />
              <span class="text-xs text-on-surface-variant">{{ weeklySummary.totalEmotionLogs }}</span>
            </div>
            <div v-if="weeklySummary.totalJournalEntries > 0" class="flex items-center gap-1.5">
              <AppIcon name="edit_note" class="text-sm text-on-surface-variant" />
              <span class="text-xs text-on-surface-variant">{{ weeklySummary.totalJournalEntries }}</span>
            </div>
          </div>
        </button>
      </div>

      <!-- Expanded detail panel -->
      <Transition
        enter-active-class="transition-all duration-200 ease-out"
        leave-active-class="transition-all duration-150 ease-in"
        enter-from-class="opacity-0 -translate-y-2"
        leave-to-class="opacity-0 -translate-y-2"
      >
        <!-- Day detail -->
        <div v-if="selectedDayData" key="day-detail" class="neo-inset mt-3 rounded-2xl p-4 space-y-3">
          <div class="text-sm font-semibold text-on-surface">
            {{ fullDayName(selectedDayData.dayRef) }}
          </div>

          <!-- Habits -->
          <div v-if="selectedDayData.habits.items.length > 0" class="space-y-1">
            <div class="text-xs font-medium text-on-surface-variant uppercase tracking-wide">
              {{ t('planning.reflection.review.habits') }}
            </div>
            <div class="flex flex-wrap gap-1.5">
              <span
                v-for="habit in selectedDayData.habits.items"
                :key="habit.id"
                class="neo-pill text-xs"
                :class="habit.status === 'completed' ? 'text-on-surface' : 'text-on-surface-variant'"
              >
                <AppIcon
                  :name="habit.status === 'completed' ? 'check' : 'close'"
                  class="text-xs"
                  :class="habit.status === 'completed' ? 'text-primary' : 'text-error'"
                />
                {{ habit.name }}
              </span>
            </div>
          </div>

          <!-- Emotions -->
          <div v-if="selectedDayData.emotions.totalLogs > 0" class="space-y-1">
            <div class="text-xs font-medium text-on-surface-variant uppercase tracking-wide">
              {{ t('planning.reflection.review.emotions') }}
            </div>
            <div class="flex flex-wrap gap-1.5">
              <span
                v-for="emotion in selectedDayData.emotions.items"
                :key="emotion.emotionId"
                :style="{ backgroundColor: quadrantChipBg(emotion.quadrant), border: '1.5px solid ' + quadrantChipBorder(emotion.quadrant) }"
                class="inline-flex items-center px-2.5 py-0.5 rounded-full text-on-surface text-xs font-medium"
              >
                {{ emotion.name }}
              </span>
            </div>
          </div>

          <!-- Journal -->
          <div v-if="selectedDayData.journal.items.length > 0" class="space-y-1">
            <div class="text-xs font-medium text-on-surface-variant uppercase tracking-wide">
              {{ t('planning.reflection.review.journals') }}
            </div>
            <ul class="space-y-0.5">
              <li v-for="entry in selectedDayData.journal.items" :key="entry.id" class="text-sm text-on-surface truncate">
                {{ entry.title }}
              </li>
            </ul>
          </div>

          <!-- Exercises -->
          <div v-if="selectedDayData.exercises.count > 0" class="space-y-1">
            <div class="text-xs font-medium text-on-surface-variant uppercase tracking-wide">
              {{ t('planning.reflection.review.exercises') }}
            </div>
            <div class="flex flex-wrap gap-1.5">
              <span v-for="type in selectedDayData.exercises.types" :key="type" class="neo-pill text-xs text-on-surface-variant">
                {{ type }}
              </span>
            </div>
          </div>

          <!-- Key Results -->
          <div v-if="selectedDayData.keyResults.items.length > 0" class="space-y-1">
            <div class="text-xs font-medium text-on-surface-variant uppercase tracking-wide">
              {{ t('planning.reflection.review.keyResults') }}
            </div>
            <ul class="space-y-0.5">
              <li v-for="kr in selectedDayData.keyResults.items" :key="kr.id" class="flex items-baseline justify-between text-sm">
                <span class="text-on-surface truncate">{{ kr.name }}</span>
                <span v-if="kr.value !== null" class="ml-2 text-xs font-medium text-primary tabular-nums">{{ kr.value }}</span>
              </li>
            </ul>
          </div>

          <!-- Trackers -->
          <div v-if="selectedDayData.trackers.items.length > 0" class="space-y-1">
            <div class="text-xs font-medium text-on-surface-variant uppercase tracking-wide">
              {{ t('planning.reflection.review.trackers') }}
            </div>
            <ul class="space-y-0.5">
              <li v-for="tracker in selectedDayData.trackers.items" :key="tracker.id" class="flex items-baseline justify-between text-sm">
                <span class="text-on-surface truncate">{{ tracker.name }}</span>
                <span v-if="tracker.value !== null" class="ml-2 text-xs font-medium text-primary tabular-nums">{{ tracker.value }}</span>
              </li>
            </ul>
          </div>

          <!-- Empty day -->
          <p v-if="isDayEmpty(selectedDayData)" class="text-sm text-on-surface-variant">
            {{ t('planning.reflection.review.noData') }}
          </p>
        </div>

        <!-- Summary detail -->
        <div v-else-if="selectedCard === 'summary'" key="summary-detail" class="neo-inset mt-3 rounded-2xl p-4 space-y-3">
          <div class="text-sm font-semibold text-on-surface">
            {{ t('planning.reflection.review.summary') }}
          </div>

          <!-- Weekly habits -->
          <div v-if="weeklySummary.weeklyHabits.length > 0" class="space-y-1">
            <div class="text-xs font-medium text-on-surface-variant uppercase tracking-wide">
              {{ t('planning.reflection.review.weeklyHabits') }}
            </div>
            <div class="space-y-1">
              <div v-for="habit in weeklySummary.weeklyHabits" :key="habit.id" class="flex items-center justify-between">
                <div class="flex items-center gap-1.5 min-w-0">
                  <AppIcon
                    :name="habit.evaluationStatus === 'met' ? 'check_circle' : habit.evaluationStatus === 'missed' ? 'cancel' : 'radio_button_unchecked'"
                    class="text-base shrink-0"
                    :class="habit.evaluationStatus === 'met' ? 'text-primary' : habit.evaluationStatus === 'missed' ? 'text-error' : 'text-on-surface-variant'"
                  />
                  <span class="text-sm text-on-surface truncate">{{ habit.name }}</span>
                </div>
                <span class="ml-2 text-xs font-medium tabular-nums shrink-0" :class="habit.evaluationStatus === 'met' ? 'text-primary' : 'text-on-surface-variant'">
                  <template v-if="habit.target && habit.target.kind === 'count'">
                    {{ habit.entryCount }} / {{ habit.target.value }}
                  </template>
                  <template v-else-if="habit.actualValue !== undefined">
                    {{ habit.actualValue }}
                  </template>
                </span>
              </div>
            </div>
          </div>

          <!-- Monthly habits -->
          <div v-if="weeklySummary.monthlyHabits.length > 0" class="space-y-1">
            <div class="text-xs font-medium text-on-surface-variant uppercase tracking-wide">
              {{ t('planning.reflection.review.monthlyHabits') }}
            </div>
            <div class="space-y-1">
              <div v-for="habit in weeklySummary.monthlyHabits" :key="habit.id" class="flex items-center justify-between">
                <div class="flex items-center gap-1.5 min-w-0">
                  <AppIcon name="calendar_month" class="text-base shrink-0 text-on-surface-variant" />
                  <span class="text-sm text-on-surface truncate">{{ habit.name }}</span>
                </div>
                <span class="ml-2 text-xs font-medium tabular-nums text-on-surface-variant shrink-0">
                  {{ habit.weekEntryCount }}× {{ t('planning.reflection.review.thisWeek') }}
                </span>
              </div>
            </div>
          </div>

          <!-- Aggregates -->
          <div class="space-y-1 pt-1 border-t border-neu-border/20">
            <div class="flex items-center justify-between text-sm">
              <span class="text-on-surface-variant">{{ t('planning.reflection.review.emotions') }}</span>
              <span class="font-medium text-on-surface tabular-nums">{{ weeklySummary.totalEmotionLogs }}</span>
            </div>
            <div class="flex items-center justify-between text-sm">
              <span class="text-on-surface-variant">{{ t('planning.reflection.review.journals') }}</span>
              <span class="font-medium text-on-surface tabular-nums">{{ weeklySummary.totalJournalEntries }}</span>
            </div>
            <div v-if="weeklySummary.totalExercises > 0" class="flex items-center justify-between text-sm">
              <span class="text-on-surface-variant">{{ t('planning.reflection.review.exercises') }}</span>
              <span class="font-medium text-on-surface tabular-nums">{{ weeklySummary.totalExercises }}</span>
            </div>
          </div>
        </div>
      </Transition>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { DayRef } from '@/domain/period'
import type { Quadrant } from '@/domain/emotion'
import type { DailyActivityBreakdown, WeeklySummary } from '@/services/reflectionDataQueries'
import AppIcon from '@/components/shared/AppIcon.vue'
import { useT } from '@/composables/useT'

const { t } = useT()

const props = defineProps<{
  dailyBreakdown: DailyActivityBreakdown[]
  weeklySummary: WeeklySummary
  isLoading: boolean
}>()

const selectedCard = ref<DayRef | 'summary' | null>(null)

const selectedDayData = computed(() => {
  if (!selectedCard.value || selectedCard.value === 'summary') return null
  return props.dailyBreakdown.find((d) => d.dayRef === selectedCard.value) ?? null
})

function selectCard(card: DayRef | 'summary') {
  selectedCard.value = selectedCard.value === card ? null : card
}

function isDayEmpty(day: DailyActivityBreakdown): boolean {
  return (
    day.habits.items.length === 0 &&
    day.emotions.totalLogs === 0 &&
    day.journal.items.length === 0 &&
    day.exercises.count === 0 &&
    day.keyResults.items.length === 0 &&
    day.trackers.items.length === 0
  )
}

function shortDayName(dayRef: DayRef): string {
  const date = new Date(dayRef + 'T12:00:00')
  return date.toLocaleDateString(undefined, { weekday: 'short' })
}

function fullDayName(dayRef: DayRef): string {
  const date = new Date(dayRef + 'T12:00:00')
  return date.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })
}

function dayNumber(dayRef: DayRef): string {
  return dayRef.slice(-2).replace(/^0/, '')
}

const QUADRANT_COLORS: Record<Quadrant, { selected: string; border: string }> = {
  'high-energy-high-pleasantness': {
    selected: 'var(--color-quadrant-high-energy-high-pleasantness-selected)',
    border: 'var(--color-quadrant-high-energy-high-pleasantness-border)',
  },
  'high-energy-low-pleasantness': {
    selected: 'var(--color-quadrant-high-energy-low-pleasantness-selected)',
    border: 'var(--color-quadrant-high-energy-low-pleasantness-border)',
  },
  'low-energy-high-pleasantness': {
    selected: 'var(--color-quadrant-low-energy-high-pleasantness-selected)',
    border: 'var(--color-quadrant-low-energy-high-pleasantness-border)',
  },
  'low-energy-low-pleasantness': {
    selected: 'var(--color-quadrant-low-energy-low-pleasantness-selected)',
    border: 'var(--color-quadrant-low-energy-low-pleasantness-border)',
  },
}

function quadrantDotColor(quadrant: Quadrant): string {
  return QUADRANT_COLORS[quadrant].selected
}

function quadrantChipBg(quadrant: Quadrant): string {
  return QUADRANT_COLORS[quadrant].selected
}

function quadrantChipBorder(quadrant: Quadrant): string {
  return QUADRANT_COLORS[quadrant].border
}
</script>
