<template>
  <article
    class="group/card neo-card neo-raised border-primary/10 px-4 py-3.5 transition-shadow duration-200"
  >
    <!-- Header -->
    <div class="flex items-center gap-2">
      <button
        type="button"
        class="flex min-w-0 flex-1 items-center gap-2"
        @click="router.push('/journal')"
      >
        <AppIcon name="edit_note" class="text-lg text-on-surface" />
        <span class="flex-1 truncate text-left font-semibold text-on-surface">{{
          t('planning.calendar.wellness.journal')
        }}</span>
      </button>
      <span class="h-px flex-1 bg-neu-border/10" />
      <button
        type="button"
        class="neo-icon-button neo-focus opacity-0 transition-opacity duration-200 group-hover/card:opacity-100"
        :class="{ '!opacity-100': expanded }"
        @click.stop="expanded = !expanded"
      >
        <AppIcon
          name="expand_more"
          class="text-sm text-on-surface-variant transition-transform duration-200"
          :class="expanded ? 'rotate-180' : ''"
        />
      </button>
    </div>

    <!-- Chart row with + button -->
    <div class="mt-3 flex items-end gap-5">
      <!-- Chart area -->
      <div
        class="mr-1 flex-1 overflow-hidden transition-all duration-200 ease-in-out"
        :style="{ maxHeight: expanded ? '16rem' : '4rem' }"
      >
        <!-- Collapsed: single row of 7 bars -->
        <div v-if="!expanded" class="flex items-end gap-1">
          <div
            v-for="slot in recentDays"
            :key="slot.dateKey"
            class="flex flex-1 flex-col items-center gap-1"
          >
            <div
              class="flex w-full items-end justify-center rounded-sm px-px"
                            :style="{ height: barContainerHeight + 'px' }"
            >
              <div
                v-if="dayWordCounts.has(slot.dateKey)"
                class="w-full rounded-t-sm bg-primary"
                :style="{ height: barHeight(dayWordCounts.get(slot.dateKey)!) + '%' }"
              />
            </div>
            <span class="text-[9px] leading-none text-on-surface-variant/50">{{
              slot.dayLabel
            }}</span>
          </div>
        </div>

        <!-- Expanded: column headers + 5 weeks -->
        <template v-else>
          <div class="mb-1 grid grid-cols-7 gap-1">
            <span
              v-for="(h, i) in columnHeaders"
              :key="i"
              class="text-center text-[9px] text-on-surface-variant/50"
            >
              {{ h }}
            </span>
          </div>
          <div class="grid grid-cols-7 gap-1">
            <template v-for="week in weekGrid" :key="week.slots[0].dateKey">
              <div
                v-for="slot in week.slots"
                :key="slot.dateKey"
                class="flex items-end justify-center rounded-sm px-px"
                                :style="{ height: barContainerHeight + 'px' }"
              >
                <div
                  v-if="dayWordCounts.has(slot.dateKey)"
                  class="w-full rounded-t-sm bg-primary"
                  :style="{ height: barHeight(dayWordCounts.get(slot.dateKey)!) + '%' }"
                />
              </div>
            </template>
          </div>
        </template>
      </div>

      <!-- Add button -->
      <button
        type="button"
        class="neo-icon-button neo-focus shrink-0"
        :aria-label="t('planning.calendar.wellness.newEntry')"
        @click.stop="router.push('/journal/edit')"
      >
        <AppIcon name="add" class="text-sm text-on-surface-variant" />
      </button>
    </div>
  </article>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import AppIcon from '@/components/shared/AppIcon.vue'
import { useT } from '@/composables/useT'
import { buildRecentDays, buildWeekGrid } from '@/utils/wellnessCalendar'
import type { CalendarDaySlot } from '@/utils/wellnessCalendar'
import { useUserPreferencesStore } from '@/stores/userPreferences.store'

const props = defineProps<{
  referenceDate: Date
  dayWordCounts: Map<string, number>
}>()

const router = useRouter()
const { t } = useT()
const prefsStore = useUserPreferencesStore()
const expanded = ref(false)
const barContainerHeight = 32

const locale = computed(() => prefsStore.locale ?? 'en')
const recentDays = computed(() => buildRecentDays(props.referenceDate, 7, locale.value))
const weekGrid = computed(() => buildWeekGrid(props.referenceDate, 5, locale.value))
const columnHeaders = computed(() => recentDays.value.map((s) => s.dayLabel))

const visibleDateKeys = computed(() => {
  const slots: CalendarDaySlot[] = expanded.value
    ? weekGrid.value.flatMap((w) => w.slots)
    : recentDays.value
  return slots.map((s) => s.dateKey)
})

const maxWordCount = computed(() => {
  let max = 0
  for (const key of visibleDateKeys.value) {
    const v = props.dayWordCounts.get(key)
    if (v && v > max) max = v
  }
  return max
})

function barHeight(wordCount: number): number {
  if (maxWordCount.value <= 0) return 0
  return Math.max(8, (wordCount / maxWordCount.value) * 100)
}
</script>
