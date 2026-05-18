<template>
  <article
    class="wellness-card neo-raised group flex flex-col gap-2 p-3 transition-shadow duration-200"
    :class="expanded ? 'wellness-card--expanded' : ''"
    @click="expanded = !expanded"
  >
    <!-- Header: title + add button -->
    <div class="flex shrink-0 items-center justify-between">
      <button
        type="button"
        class="text-[11px] font-semibold uppercase tracking-[0.10em] text-on-surface-variant transition-colors duration-200 hover:text-primary"
        @click.stop="router.push('/emotions')"
      >
        {{ t('planning.today.wellness.emotions') }}
      </button>
      <button
        type="button"
        class="wellness-add-btn neo-focus grid place-items-center"
        :aria-label="t('planning.calendar.wellness.logEmotion')"
        @click.stop="router.push({ name: 'emotions-edit' })"
      >
        <AppIcon name="add" class="text-xs text-on-surface-variant/60" />
      </button>
    </div>

    <!-- Donut + caption (collapsed) -->
    <div
      class="flex flex-col items-center justify-center gap-1.5 py-1"
      :style="{
        flex: expanded ? '0 0 auto' : '0 0 auto',
        maxHeight: expanded ? '0px' : '240px',
        opacity: expanded ? 0 : 1,
        overflow: 'hidden',
        pointerEvents: expanded ? 'none' : 'auto',
        transition: 'max-height 0.35s ease, opacity 0.25s ease',
      }"
    >
      <div class="relative" style="width: 96px; height: 96px">
        <svg width="96" height="96" style="transform: rotate(-90deg)" aria-hidden="true">
          <circle
            cx="48" cy="48" r="42"
            fill="none" stroke="rgb(var(--neo-border))" stroke-opacity="0.30" stroke-width="7"
          />
          <template v-if="quadrantSegments.length > 0">
            <circle
              v-for="seg in quadrantSegments"
              :key="seg.quadrant"
              cx="48" cy="48" r="42"
              fill="none"
              :stroke="seg.color"
              stroke-width="7"
              :stroke-dasharray="`${seg.dashLen} ${DONUT_CIRC}`"
              :stroke-dashoffset="seg.offset"
              stroke-linecap="butt"
            />
          </template>
        </svg>
        <div class="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span class="text-[20px] font-semibold leading-none tracking-tight text-on-surface">
            {{ daysLogged }}/{{ totalDays }}
          </span>
        </div>
      </div>
      <span class="text-[11px] text-on-surface-variant/70">
        {{ t('planning.today.wellness.emotionsCaption') }}
      </span>
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
              v-if="!slot.isFuture && slot.segments.length > 0"
              class="flex h-full w-full"
            >
              <div
                v-for="(seg, si) in slot.segments"
                :key="seg.quadrant"
                class="h-full"
                :style="{
                  flex: `${seg.weight} 1 0`,
                  background: seg.color,
                  opacity: slot.isToday ? 1 : 0.65,
                  borderRadius: si === 0
                    ? '9999px 0 0 9999px'
                    : si === slot.segments.length - 1
                      ? '0 9999px 9999px 0'
                      : '0',
                }"
              />
            </div>
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
import type { DayEmotionSummary } from '@/utils/wellnessCalendar'
import type { Quadrant } from '@/domain/emotion'
import { useUserPreferencesStore } from '@/stores/userPreferences.store'

const props = defineProps<{
  referenceDate: Date
  dayEmotionData: Map<string, DayEmotionSummary>
}>()

const router = useRouter()
const { t } = useT()
const prefsStore = useUserPreferencesStore()

const expanded = ref(false)

const locale = computed(() => prefsStore.locale ?? 'en')
const recentDays = computed(() => buildRecentDays(props.referenceDate, 7, locale.value))

const QUADRANT_ORDER: Quadrant[] = [
  'high-energy-high-pleasantness',
  'high-energy-low-pleasantness',
  'low-energy-high-pleasantness',
  'low-energy-low-pleasantness',
]

const QUADRANT_COLOR: Record<Quadrant, string> = {
  'high-energy-high-pleasantness': 'var(--color-quadrant-high-energy-high-pleasantness-selected)',
  'high-energy-low-pleasantness': 'var(--color-quadrant-high-energy-low-pleasantness-selected)',
  'low-energy-high-pleasantness': 'var(--color-quadrant-low-energy-high-pleasantness-selected)',
  'low-energy-low-pleasantness': 'var(--color-quadrant-low-energy-low-pleasantness-selected)',
}

interface DaySegment {
  quadrant: Quadrant
  weight: number
  color: string
}

interface EmotionSlot {
  dateKey: string
  dayLabel: string
  isToday: boolean
  isFuture: boolean
  segments: DaySegment[]
}

const slots = computed<EmotionSlot[]>(() =>
  recentDays.value.map((s) => {
    const summary = props.dayEmotionData.get(s.dateKey)
    const segments: DaySegment[] = summary
      ? QUADRANT_ORDER.flatMap((q) => {
          const w = summary.quadrantProportions[q] ?? 0
          if (w <= 0) return []
          return [{ quadrant: q, weight: w, color: QUADRANT_COLOR[q] }]
        })
      : []
    return {
      dateKey: s.dateKey,
      dayLabel: s.dayLabel,
      isToday: s.isToday,
      isFuture: s.isFuture,
      segments,
    }
  }),
)

const orderedSlots = computed<EmotionSlot[]>(() => {
  const list = slots.value
  const todayIdx = list.findIndex((s) => s.isToday)
  if (todayIdx < 0) return list
  return [...list.slice(todayIdx), ...list.slice(0, todayIdx)]
})

const daysLogged = computed(
  () => slots.value.filter((s) => !s.isFuture && s.segments.length > 0).length,
)
const totalDays = computed(() => slots.value.length)

const DONUT_CIRC = 2 * Math.PI * 42

interface DonutSegment {
  quadrant: Quadrant
  color: string
  dashLen: number
  offset: number
}

const quadrantSegments = computed<DonutSegment[]>(() => {
  const totals: Record<Quadrant, number> = {
    'high-energy-high-pleasantness': 0,
    'high-energy-low-pleasantness': 0,
    'low-energy-high-pleasantness': 0,
    'low-energy-low-pleasantness': 0,
  }
  for (const slot of slots.value) {
    if (slot.isFuture) continue
    for (const seg of slot.segments) {
      totals[seg.quadrant] += seg.weight
    }
  }
  const grand = Object.values(totals).reduce((a, b) => a + b, 0)
  if (grand <= 0) return []

  let cumulative = 0
  const gapLen = 0.02 * DONUT_CIRC
  const result: DonutSegment[] = []
  for (const q of QUADRANT_ORDER) {
    const share = totals[q] / grand
    if (share <= 0) continue
    const segLen = Math.max(0, share * DONUT_CIRC - gapLen)
    const startLen = cumulative * DONUT_CIRC
    result.push({
      quadrant: q,
      color: QUADRANT_COLOR[q],
      dashLen: segLen,
      offset: DONUT_CIRC - startLen,
    })
    cumulative += share
  }
  return result
})
</script>

<style scoped>
.wellness-card {
  border-radius: 1.4rem;
  cursor: pointer;
  user-select: none;
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
