<template>
  <AppCard padding="lg" class="space-y-4 bg-section/40 border border-outline/40">
    <div class="flex items-center justify-between gap-3">
      <h2 class="text-lg font-semibold text-on-surface flex items-center gap-2">
        <CalendarDaysIcon class="w-5 h-5 text-primary" />
        Weekly Timeline
      </h2>
      <span class="text-xs text-on-surface-variant">
        {{ totalJournalCount }} journal · {{ totalEmotionCount }} emotion
      </span>
    </div>

    <p v-if="!hasAnyEntries" class="text-sm text-on-surface-variant">
      No entries logged this week yet. Your timeline will fill in as you add entries.
    </p>

    <div class="overflow-x-auto">
      <div class="min-w-[920px] space-y-4">
        <div class="grid grid-cols-[120px_repeat(7,minmax(110px,1fr))] gap-3">
          <div></div>
          <button
            v-for="day in daySummaries"
            :key="day.isoDate"
            type="button"
            class="rounded-2xl border px-3 py-2 text-left transition-colors"
            :class="getDayHeaderClasses(day)"
            :aria-pressed="isSelected(day)"
            @click="toggleDay(day.isoDate)"
          >
            <div class="text-sm font-semibold text-on-surface">{{ day.weekdayLabel }}</div>
            <div class="text-xs text-on-surface-variant">{{ day.dateLabel }}</div>
            <div class="mt-2 text-[11px] text-on-surface-variant">
              {{ day.journalCount }} journal · {{ day.emotionCount }} emotion
            </div>
          </button>
        </div>

        <div class="grid grid-cols-[120px_repeat(7,minmax(110px,1fr))] gap-3">
          <div class="pt-2 text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
            Emotions
          </div>
          <div
            v-for="day in daySummaries"
            :key="`emotions-${day.isoDate}`"
            class="rounded-2xl border px-2 py-2 min-h-[70px]"
            :class="getDayCellClasses(day)"
          >
            <div v-if="day.topEmotionIds.length > 0" class="flex flex-wrap gap-1">
              <span
                v-for="emotionId in day.topEmotionIds"
                :key="emotionId"
                class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                :class="getEmotionClasses(emotionId)"
              >
                {{ getEmotionName(emotionId) }}
              </span>
            </div>
            <span v-else class="text-xs text-on-surface-variant">—</span>
          </div>
        </div>

        <div class="grid grid-cols-[120px_repeat(7,minmax(110px,1fr))] gap-3">
          <div class="pt-2 text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
            People
          </div>
          <div
            v-for="day in daySummaries"
            :key="`people-${day.isoDate}`"
            class="rounded-2xl border px-2 py-2 min-h-[70px]"
            :class="getDayCellClasses(day)"
          >
            <div v-if="day.topPeopleTagIds.length > 0" class="flex flex-wrap gap-1">
              <span
                v-for="tagId in day.topPeopleTagIds"
                :key="`people-${tagId}`"
                class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border"
                :class="getTagClasses('people')"
              >
                {{ getTagName(tagId, 'people') }}
              </span>
            </div>
            <span v-else class="text-xs text-on-surface-variant">—</span>
          </div>
        </div>

        <div class="grid grid-cols-[120px_repeat(7,minmax(110px,1fr))] gap-3">
          <div class="pt-2 text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
            Context
          </div>
          <div
            v-for="day in daySummaries"
            :key="`context-${day.isoDate}`"
            class="rounded-2xl border px-2 py-2 min-h-[70px]"
            :class="getDayCellClasses(day)"
          >
            <div v-if="day.topContextTagIds.length > 0" class="flex flex-wrap gap-1">
              <span
                v-for="tagId in day.topContextTagIds"
                :key="`context-${tagId}`"
                class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border"
                :class="getTagClasses('context')"
              >
                {{ getTagName(tagId, 'context') }}
              </span>
            </div>
            <span v-else class="text-xs text-on-surface-variant">—</span>
          </div>
        </div>
      </div>
    </div>

    <div class="rounded-2xl border border-outline/30 bg-surface/90 p-4 space-y-3">
      <div class="flex items-center justify-between gap-3">
        <h3 class="text-sm font-semibold text-on-surface">
          {{ selectedDayLabel }}
        </h3>
        <span v-if="selectedDaySummary" class="text-xs text-on-surface-variant">
          {{ selectedDaySummary.journalCount }} journal ·
          {{ selectedDaySummary.emotionCount }} emotion
        </span>
      </div>

      <p v-if="!selectedDaySummary" class="text-sm text-on-surface-variant">
        Click a day above to see entries here.
      </p>

      <div v-else class="space-y-4">
        <p
          v-if="selectedDaySummary.journalCount === 0 && selectedDaySummary.emotionCount === 0"
          class="text-sm text-on-surface-variant"
        >
          No entries for this day yet.
        </p>

        <div v-if="selectedDaySummary.journalEntries.length > 0">
          <h3 class="text-xs font-semibold uppercase tracking-wide text-on-surface-variant mb-2">
            Journal Entries
          </h3>
          <div class="space-y-2">
            <div
              v-for="entry in selectedDaySummary.journalEntries"
              :key="entry.id"
              class="p-3 rounded-xl bg-surface border border-outline/20"
            >
              <div class="flex items-center justify-between mb-1">
                <span class="font-medium text-on-surface truncate">
                  {{ entry.title || 'Untitled entry' }}
                </span>
                <span class="text-xs text-on-surface-variant flex-shrink-0 ml-2">
                  {{ formatTime(entry.createdAt) }}
                </span>
              </div>
              <p class="text-sm text-on-surface-variant line-clamp-2">
                {{ entry.body }}
              </p>
            </div>
          </div>
        </div>

        <div v-if="selectedDaySummary.emotionLogs.length > 0">
          <h3 class="text-xs font-semibold uppercase tracking-wide text-on-surface-variant mb-2">
            Emotion Logs
          </h3>
          <div class="space-y-2">
            <div
              v-for="log in selectedDaySummary.emotionLogs"
              :key="log.id"
              class="p-3 rounded-xl bg-surface border border-outline/20"
            >
              <div class="flex items-center justify-between gap-3 mb-2">
                <div class="flex flex-wrap gap-1">
                  <span
                    v-for="emotionId in log.emotionIds"
                    :key="emotionId"
                    class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                    :class="getEmotionClasses(emotionId)"
                  >
                    {{ getEmotionName(emotionId) }}
                  </span>
                </div>
                <span class="text-xs text-on-surface-variant flex-shrink-0">
                  {{ formatTime(log.createdAt) }}
                </span>
              </div>
              <p v-if="log.note" class="text-sm text-on-surface-variant">
                {{ log.note }}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </AppCard>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { CalendarDaysIcon } from '@heroicons/vue/24/outline'
import AppCard from '@/components/AppCard.vue'
import { useEmotionStore } from '@/stores/emotion.store'
import { useTagStore } from '@/stores/tag.store'
import type { WeeklyDaySummary } from '@/services/periodTimeline'

const props = defineProps<{
  daySummaries: WeeklyDaySummary[]
}>()

const emotionStore = useEmotionStore()
const tagStore = useTagStore()

const selectedDay = ref<string | null>(null)

const totalJournalCount = computed(() =>
  props.daySummaries.reduce((sum, day) => sum + day.journalCount, 0)
)
const totalEmotionCount = computed(() =>
  props.daySummaries.reduce((sum, day) => sum + day.emotionCount, 0)
)
const hasAnyEntries = computed(() => {
  return props.daySummaries.some((day) => day.journalCount + day.emotionCount > 0)
})

const selectedDaySummary = computed(() => {
  if (!selectedDay.value) return null
  return props.daySummaries.find((day) => day.isoDate === selectedDay.value) ?? null
})

const selectedDayLabel = computed(() => {
  if (!selectedDaySummary.value) return 'Entries'
  return `Entries for ${selectedDaySummary.value.weekdayLabel}, ${selectedDaySummary.value.dateLabel}`
})

function toggleDay(isoDate: string) {
  selectedDay.value = selectedDay.value === isoDate ? null : isoDate
}

function dayHasEntries(day: WeeklyDaySummary): boolean {
  return day.journalCount + day.emotionCount > 0
}

function isSelected(day: WeeklyDaySummary): boolean {
  return selectedDay.value === day.isoDate
}

function getDayHeaderClasses(day: WeeklyDaySummary): string {
  if (isSelected(day)) {
    return 'bg-primary/10 border-primary/40 shadow-elevation-1'
  }
  return 'bg-surface border-outline/30 hover:bg-section/30'
}

function getDayCellClasses(day: WeeklyDaySummary): string {
  if (isSelected(day)) {
    return 'bg-primary/5 border-primary/30'
  }
  return dayHasEntries(day) ? 'bg-surface border-outline/30' : 'bg-surface/60 border-outline/20'
}

function getEmotionName(emotionId: string): string {
  return emotionStore.getEmotionById(emotionId)?.name ?? 'Unknown'
}

function getEmotionClasses(emotionId: string): string {
  const emotion = emotionStore.getEmotionById(emotionId)
  if (!emotion) return 'bg-section text-on-surface-variant'

  const isHighEnergy = emotion.energy > 5
  const isHighPleasantness = emotion.pleasantness > 5

  if (isHighEnergy && isHighPleasantness) {
    return 'bg-quadrant-high-energy-high-pleasantness text-on-surface'
  } else if (isHighEnergy && !isHighPleasantness) {
    return 'bg-quadrant-high-energy-low-pleasantness text-on-surface'
  } else if (!isHighEnergy && isHighPleasantness) {
    return 'bg-quadrant-low-energy-high-pleasantness text-on-surface'
  } else {
    return 'bg-quadrant-low-energy-low-pleasantness text-on-surface'
  }
}

function getTagName(tagId: string, type: 'people' | 'context'): string {
  if (type === 'people') {
    return tagStore.getPeopleTagById(tagId)?.name ?? 'Unknown'
  }
  return tagStore.getContextTagById(tagId)?.name ?? 'Unknown'
}

function getTagClasses(type: 'people' | 'context'): string {
  if (type === 'people') {
    return 'bg-primary/10 text-primary border-primary/20'
  }
  return 'bg-section text-on-surface-variant border-outline/30'
}

function formatTime(isoString: string): string {
  const date = new Date(isoString)
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  })
}
</script>
