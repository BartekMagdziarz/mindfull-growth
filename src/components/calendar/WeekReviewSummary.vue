<template>
  <div class="flex flex-col gap-3 lg:flex-row lg:items-start lg:gap-3">
    <!-- LEFT: Journal entries + Emotions — narrow column. -->
    <div class="flex w-full shrink-0 flex-col gap-3 lg:w-[240px] lg:order-1">
      <WeekJournalEntriesCard :week-ref="weekRef" />
      <WeekEmotionsCard :week-ref="weekRef" />
    </div>

    <!-- MAIN: unified grid of compact tiles (KRs + habits + trackers mixed). -->
    <div class="min-w-0 flex-1 lg:order-2">
      <WeekObjectsGrid
        :items="weekObjectItems"
        :raw-entries="rawEntries"
        :all-day-assignments="allDayAssignments"
        :week-ref="weekRef"
        :today-day-ref="todayDayRef"
      />
    </div>

    <!-- RIGHT: Kontekst — reflection summary or create-reflection CTA. -->
    <aside class="flex w-full shrink-0 flex-col gap-3 lg:w-[240px] lg:order-3">
      <WeekKontextCard
        :week-ref="weekRef"
        :show-actions="kontekstActions"
        @create-reflection="emit('create-reflection')"
        @edit-reflection="emit('edit-reflection')"
      />
    </aside>
  </div>
</template>

<script setup lang="ts">
import WeekEmotionsCard from './WeekEmotionsCard.vue'
import WeekJournalEntriesCard from './WeekJournalEntriesCard.vue'
import WeekKontextCard from './WeekKontextCard.vue'
import WeekObjectsGrid from './WeekObjectsGrid.vue'
import type { DayRef, WeekRef } from '@/domain/period'
import type {
  DailyMeasurementEntry,
  MeasurementDayAssignment,
} from '@/domain/planningState'
import type { WeekObjectItem } from '@/services/reflectionDataQueries'

withDefaults(
  defineProps<{
    weekRef: WeekRef
    todayDayRef: DayRef
    weekObjectItems: WeekObjectItem[]
    rawEntries: DailyMeasurementEntry[]
    allDayAssignments: MeasurementDayAssignment[]
    /** When false, the kontekst card shows ratings/empty state without action buttons. */
    kontekstActions?: boolean
  }>(),
  { kontekstActions: true },
)

const emit = defineEmits<{
  'create-reflection': []
  'edit-reflection': []
}>()
</script>
