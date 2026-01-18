<template>
  <AppCard padding="none" class="space-y-4 bg-transparent border-0 shadow-none backdrop-blur-none">
    <p v-if="!hasAnyEntries" class="text-sm text-on-surface-variant">
      No entries logged this week yet. Your timeline will fill in as you add entries.
    </p>

    <div
      class="-mx-2 sm:-mx-4 md:-mx-6 flex flex-wrap gap-4 items-stretch [--day-columns:1] sm:[--day-columns:2] lg:[--day-columns:3] xl:[--day-columns:4] 2xl:[--day-columns:7]"
    >
      <div
        v-for="day in daySummaries"
        :key="day.isoDate"
        class="flex flex-col gap-2 h-full"
        :class="getDayWrapperClasses(day)"
      >
        <div class="text-center space-y-0.5">
          <div class="text-sm font-semibold text-on-surface flex items-center justify-center gap-2">
            <span>{{ day.weekdayLabel }}</span>
            <span
              v-if="isSelected(day)"
              class="inline-flex h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_0_6px_rgba(59,130,246,0.15)]"
            />
          </div>
          <div class="text-[11px] text-on-surface-variant">{{ day.dateLabel }}</div>
        </div>

        <div
          class="h-[170px] rounded-3xl p-3 space-y-2.5 transition-all duration-200 shadow-elevation-1 overflow-hidden"
          :class="getDayCardClasses(day)"
        >
          <div v-if="day.topEmotionIds.length" class="flex flex-wrap gap-1.5">
            <span
              v-for="emotionId in day.topEmotionIds"
              :key="emotionId"
              class="inline-flex items-center px-1.5 py-[2px] rounded-full text-[10px] font-semibold border border-transparent shadow-sm"
              :class="getEmotionClasses(emotionId)"
              :style="getEmotionPillStyle(emotionId)"
            >
              {{ getEmotionName(emotionId) }}
            </span>
          </div>

          <div
            v-if="day.topEmotionIds.length && (day.topPeopleTagIds.length || day.topContextTagIds.length)"
            class="w-full border-t border-outline/70 my-1.5"
          />

          <div v-if="day.topPeopleTagIds.length" class="flex flex-wrap gap-1.5">
            <span
              v-for="tagId in day.topPeopleTagIds"
              :key="`people-${tagId}`"
              class="inline-flex items-center px-1.5 py-[2px] rounded-full text-[10px] font-medium"
              :class="getTagClasses('people')"
            >
              {{ getTagName(tagId, 'people') }}
            </span>
          </div>

          <div
            v-if="day.topPeopleTagIds.length && day.topContextTagIds.length"
            class="w-full border-t border-outline/70 my-1.5"
          />

          <div v-if="day.topContextTagIds.length" class="flex flex-wrap gap-1.5">
            <span
              v-for="tagId in day.topContextTagIds"
              :key="`context-${tagId}`"
              class="inline-flex items-center px-1.5 py-[2px] rounded-full text-[10px] font-medium"
              :class="getTagClasses('context')"
            >
              {{ getTagName(tagId, 'context') }}
            </span>
          </div>
        </div>

        <div class="flex items-center justify-center text-[11px] font-semibold text-on-surface-variant -mt-1 h-7">
          <button
            v-if="dayHasExpandableEntries(day)"
            type="button"
            class="inline-flex items-center justify-center w-7 h-7 rounded-full text-on-surface-variant/70 hover:text-on-surface hover:bg-section/60 transition"
            :aria-expanded="isSelected(day)"
            @click="toggleDay(day.isoDate)"
          >
            <ChevronDownIcon
              class="w-4 h-4 transition-transform duration-200"
              :class="isSelected(day) ? 'rotate-180' : ''"
            />
          </button>
        </div>
      </div>
    </div>

    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0 -translate-y-1"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 -translate-y-1"
    >
      <div v-if="selectedDaySummary" class="rounded-2xl bg-surface/90 p-4 space-y-3">
        <div class="flex items-center justify-between gap-3">
          <div class="text-sm font-semibold text-on-surface">
            {{ selectedDaySummary.weekdayLabel }}, {{ selectedDaySummary.dateLabel }}
          </div>
        </div>

        <p
          v-if="selectedDaySummary.journalCount === 0 && selectedDaySummary.emotionCount === 0"
          class="text-sm text-on-surface-variant"
        >
          No entries for this day yet.
        </p>

        <div v-if="selectedDaySummary.journalEntries.length > 0" class="space-y-2">
          <h3 class="text-[11px] font-semibold uppercase tracking-wide text-on-surface-variant">
            Journal Entries
          </h3>
          <div class="space-y-2">
            <div
              v-for="entry in selectedDaySummary.journalEntries"
              :key="entry.id"
              class="p-3 rounded-xl bg-surface border border-outline/20 shadow-sm"
            >
              <div class="flex items-center justify-between mb-1 gap-3">
                <span class="font-medium text-on-surface truncate">
                  {{ entry.title || 'Untitled entry' }}
                </span>
                <span class="text-xs text-on-surface-variant flex-shrink-0">
                  {{ formatTime(entry.createdAt) }}
                </span>
              </div>
              <p class="text-sm text-on-surface-variant whitespace-pre-wrap">
                {{ entry.body }}
              </p>
            </div>
          </div>
        </div>

        <div v-if="selectedDaySummary.emotionLogs.length > 0" class="space-y-2">
          <h3 class="text-[11px] font-semibold uppercase tracking-wide text-on-surface-variant">
            Emotion Logs
          </h3>
          <div class="grid gap-2 grid-cols-[repeat(auto-fit,minmax(220px,1fr))]">
            <div
              v-for="log in selectedDaySummary.emotionLogs"
              :key="log.id"
              class="h-full p-3 rounded-xl bg-surface border border-outline/20 shadow-sm"
            >
              <div class="flex items-center justify-between gap-3 mb-2">
                <div class="flex flex-wrap gap-1.5">
                  <span
                    v-for="emotionId in log.emotionIds"
                    :key="emotionId"
                    class="inline-flex items-center px-2 py-[3px] rounded-full text-[11px] font-medium border border-transparent"
                    :class="getEmotionClasses(emotionId)"
                    :style="getEmotionPillStyle(emotionId)"
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
    </Transition>
  </AppCard>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { ChevronDownIcon } from '@heroicons/vue/24/outline'
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

const hasAnyEntries = computed(() => {
  return props.daySummaries.some((day) => day.journalCount + day.emotionCount > 0)
})
const selectedDaySummary = computed(() => {
  if (!selectedDay.value) return null
  return props.daySummaries.find((day) => day.isoDate === selectedDay.value) ?? null
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

function dayHasExpandableEntries(day: WeeklyDaySummary): boolean {
  return day.journalEntries.length > 0 || day.emotionLogs.length > 0
}

function isEmptyDay(day: WeeklyDaySummary): boolean {
  return (
    day.journalCount === 0 &&
    day.emotionCount === 0 &&
    day.topEmotionIds.length === 0 &&
    day.topPeopleTagIds.length === 0 &&
    day.topContextTagIds.length === 0
  )
}

function getDayWrapperClasses(day: WeeklyDaySummary): string {
  if (isEmptyDay(day)) {
    return 'flex-[0_0_calc((100%-(var(--day-columns)-1)*1rem)/var(--day-columns)/2)]'
  }
  return 'flex-[1_1_calc((100%-(var(--day-columns)-1)*1rem)/var(--day-columns))]'
}

function getDayCardClasses(day: WeeklyDaySummary): string {
  if (isSelected(day)) {
    return 'bg-section shadow-elevation-2'
  }
  if (dayHasEntries(day)) {
    return 'bg-section hover:shadow-elevation-2'
  }
  return 'bg-section'
}

function getEmotionName(emotionId: string): string {
  return emotionStore.getEmotionById(emotionId)?.name ?? 'Unknown'
}

function getEmotionClasses(emotionId: string): string {
  const emotion = emotionStore.getEmotionById(emotionId)
  if (!emotion) return 'bg-section text-on-surface-variant border-outline/30'

  return 'text-on-surface'
}

function getEmotionPillStyle(emotionId: string): Record<string, string> {
  const emotion = emotionStore.getEmotionById(emotionId)
  if (!emotion) return {}

  const isHighEnergy = emotion.energy > 5
  const isHighPleasantness = emotion.pleasantness > 5

  if (isHighEnergy && isHighPleasantness) {
    return {
      backgroundColor: 'var(--color-quadrant-high-energy-high-pleasantness)',
      borderColor: 'var(--color-quadrant-high-energy-high-pleasantness-border)',
    }
  } else if (isHighEnergy && !isHighPleasantness) {
    return {
      backgroundColor: 'var(--color-quadrant-high-energy-low-pleasantness)',
      borderColor: 'var(--color-quadrant-high-energy-low-pleasantness-border)',
    }
  } else if (!isHighEnergy && isHighPleasantness) {
    return {
      backgroundColor: 'var(--color-quadrant-low-energy-high-pleasantness)',
      borderColor: 'var(--color-quadrant-low-energy-high-pleasantness-border)',
    }
  } else {
    return {
      backgroundColor: 'var(--color-quadrant-low-energy-low-pleasantness)',
      borderColor: 'var(--color-quadrant-low-energy-low-pleasantness-border)',
    }
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
    return 'bg-chip text-chip-text'
  }
  return 'bg-chip text-chip-text'
}

function formatTime(isoString: string): string {
  const date = new Date(isoString)
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  })
}
</script>
