<template>
  <article
    class="wellness-card neo-raised group flex flex-col p-3 transition-shadow duration-200"
    :class="expanded ? 'wellness-card--expanded' : ''"
    @click="expanded = !expanded"
  >
    <!-- Header: title + add button -->
    <div class="flex shrink-0 items-center justify-between">
      <button
        type="button"
        class="text-sm font-semibold tracking-tight text-on-surface transition-colors duration-200 hover:text-primary"
        @click.stop="router.push('/journal')"
      >
        {{ t('planning.calendar.wellness.journal') }}
      </button>
      <button
        type="button"
        class="wellness-add-btn neo-focus grid place-items-center"
        :aria-label="t('planning.calendar.wellness.newEntry')"
        @click.stop="router.push('/journal/edit')"
      >
        <AppIcon name="add" class="text-xs text-on-surface-variant/60" />
      </button>
    </div>

    <!-- Donut (collapsed) -->
    <div
      class="flex items-center justify-center"
      :style="{
        flex: expanded ? '0 0 auto' : '1 1 auto',
        maxHeight: expanded ? '0px' : '200px',
        opacity: expanded ? 0 : 1,
        overflow: 'hidden',
        pointerEvents: expanded ? 'none' : 'auto',
        transition: 'max-height 0.35s ease, opacity 0.25s ease, flex 0.35s ease',
      }"
    >
      <div class="relative" style="width: 64px; height: 64px">
        <svg width="64" height="64" class="-rotate-90" aria-hidden="true">
          <circle
            cx="32" cy="32" r="28.5"
            fill="none" stroke="rgb(var(--neo-border))" stroke-opacity="0.25" stroke-width="7"
          />
          <circle
            cx="32" cy="32" r="28.5"
            fill="none" stroke="rgb(var(--color-primary))" stroke-width="7"
            :stroke-dasharray="DONUT_CIRC"
            :stroke-dashoffset="donutOffset"
            stroke-linecap="round"
            style="transition: stroke-dashoffset 0.4s ease"
          />
        </svg>
        <div class="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span class="text-sm font-bold leading-none text-on-surface">
            {{ daysLogged }}/{{ totalDays }}
          </span>
          <span class="mt-0.5 text-[8px] uppercase tracking-widest text-on-surface-variant/55">
            {{ t('planning.calendar.wellness.daysShort') }}
          </span>
        </div>
      </div>
    </div>

    <!-- Bars (expanded) -->
    <div
      :style="{
        maxHeight: expanded ? '300px' : '0',
        opacity: expanded ? 1 : 0,
        overflow: 'hidden',
        pointerEvents: expanded ? 'auto' : 'none',
        transition: 'max-height 0.4s ease, opacity 0.3s ease 0.05s',
      }"
      @click.stop
    >
      <div class="flex flex-col gap-[3px] py-1">
        <div
          v-for="slot in orderedSlots"
          :key="slot.dateKey"
          class="flex h-5 items-center gap-2"
        >
          <span
            class="w-5 shrink-0 text-right text-[9px] leading-none"
            :class="slot.isToday ? 'font-bold text-on-surface' : 'text-on-surface-variant/50'"
          >
            {{ slot.isToday ? t('planning.calendar.wellness.todayShort') : slot.dayLabel }}
          </span>
          <div
            class="h-[11px] flex-1 overflow-hidden rounded-full"
            style="background: rgb(var(--neo-border)/0.15)"
          >
            <div
              v-if="!slot.isFuture && (slot.wordCount ?? 0) > 0"
              class="h-full rounded-full"
              :style="{
                width: `${((slot.wordCount ?? 0) / Math.max(maxWords, 1)) * 100}%`,
                background: 'rgb(var(--color-primary))',
                opacity: slot.isToday ? 1 : 0.65,
                transition: 'width 0.5s ease',
              }"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- Expand affordance -->
    <div
      class="flex shrink-0 justify-center transition-opacity duration-200"
      :class="expanded ? 'opacity-50' : 'opacity-0 group-hover:opacity-40'"
    >
      <AppIcon
        name="expand_more"
        class="text-[14px] text-on-surface-variant transition-transform duration-300"
        :class="expanded ? 'rotate-180' : ''"
      />
    </div>
  </article>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import AppIcon from '@/components/shared/AppIcon.vue'
import { useT } from '@/composables/useT'
import { buildRecentDays } from '@/utils/wellnessCalendar'
import { useUserPreferencesStore } from '@/stores/userPreferences.store'

const props = defineProps<{
  referenceDate: Date
  dayWordCounts: Map<string, number>
}>()

const router = useRouter()
const { t } = useT()
const prefsStore = useUserPreferencesStore()

const expanded = ref(false)

const locale = computed(() => prefsStore.locale ?? 'en')
const recentDays = computed(() => buildRecentDays(props.referenceDate, 7, locale.value))

interface JournalSlot {
  dateKey: string
  dayLabel: string
  isToday: boolean
  isFuture: boolean
  wordCount: number | null // null for future
}

const slots = computed<JournalSlot[]>(() =>
  recentDays.value.map((s) => ({
    dateKey: s.dateKey,
    dayLabel: s.dayLabel,
    isToday: s.isToday,
    isFuture: s.isFuture,
    wordCount: s.isFuture ? null : props.dayWordCounts.get(s.dateKey) ?? 0,
  })),
)

// Order: today first, then remaining in week order (matches the design's ORDERED_INDICES).
const orderedSlots = computed<JournalSlot[]>(() => {
  const list = slots.value
  const todayIdx = list.findIndex((s) => s.isToday)
  if (todayIdx < 0) return list
  return [...list.slice(todayIdx), ...list.slice(0, todayIdx)]
})

const daysLogged = computed(
  () => slots.value.filter((s) => !s.isFuture && (s.wordCount ?? 0) > 0).length,
)
const totalDays = computed(() => slots.value.length)

const maxWords = computed(() => {
  const values = slots.value
    .map((s) => s.wordCount ?? 0)
    .filter((v) => v > 0)
  return values.length > 0 ? Math.max(...values) : 1
})

const DONUT_CIRC = 2 * Math.PI * 28.5
const donutOffset = computed(() => {
  const ratio = totalDays.value > 0 ? Math.min(daysLogged.value / totalDays.value, 1) : 0
  return DONUT_CIRC * (1 - ratio)
})
</script>

<style scoped>
.wellness-card {
  border-radius: 1.5rem;
  cursor: pointer;
  user-select: none;
  aspect-ratio: 1;
  gap: 0;
}

.wellness-card--expanded {
  aspect-ratio: auto;
  gap: 10px;
}

.wellness-add-btn {
  width: 22px;
  height: 22px;
  border-radius: 9999px;
  background: rgb(var(--neo-surface-base));
  box-shadow:
    inset -1px -1px 2px rgb(var(--neo-inset-light) / 0.8),
    inset 1px 1px 2px rgb(var(--neo-inset-dark) / 0.33);
  opacity: 0.7;
  transition: opacity 200ms ease;
}

.wellness-add-btn:hover {
  opacity: 1;
}
</style>
