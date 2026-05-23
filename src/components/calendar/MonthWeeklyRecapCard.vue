<template>
  <SummaryCard :title="t('planning.reflection.review.weeklyRecap')">
    <p v-if="rows.length === 0" class="text-center text-xs text-on-surface-variant/70">
      —
    </p>
    <ul v-else class="recap-list">
      <li
        v-for="row in rows"
        :key="row.weekRef"
        class="recap-row"
      >
        <button
          type="button"
          class="recap-row__head neo-focus"
          :title="t('planning.reflection.review.openWeekTitle')"
          @click="navigateToWeek(row.weekRef)"
        >
          <div class="recap-row__meta">
            <span class="recap-row__label">{{ row.label }}</span>
            <AppIcon name="arrow_forward" class="recap-row__chevron" />
          </div>
          <p v-if="row.snippet" class="recap-row__snippet">{{ row.snippet }}</p>
          <p v-else class="recap-row__empty">—</p>
        </button>
      </li>
    </ul>
  </SummaryCard>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import AppIcon from '@/components/shared/AppIcon.vue'
import SummaryCard from './WeeklyReviewSummaryCard.vue'
import { useT } from '@/composables/useT'
import { useStructuredReflectionStore } from '@/stores/structuredReflection.store'
import type { DayRef, MonthRef, WeekRef } from '@/domain/period'
import { getChildPeriods, getPeriodBounds } from '@/utils/periods'

const props = defineProps<{
  monthRef: MonthRef
}>()

const { t, locale } = useT()
const router = useRouter()
const reflectionStore = useStructuredReflectionStore()

onMounted(() => {
  if (reflectionStore.weeklyReflections.length === 0 && !reflectionStore.isLoading) {
    void reflectionStore.loadAll()
  }
})

interface RecapRow {
  weekRef: WeekRef
  label: string
  snippet: string
}

function formatShortDay(dayRef: DayRef): string {
  const date = new Date(`${dayRef}T00:00:00`)
  return new Intl.DateTimeFormat(locale.value, { month: 'short', day: 'numeric' }).format(date)
}

function truncate(text: string, max: number): string {
  const trimmed = text.trim()
  if (trimmed.length <= max) return trimmed
  return trimmed.slice(0, max - 1).trimEnd() + '…'
}

const rows = computed<RecapRow[]>(() => {
  const weeks = getChildPeriods(props.monthRef) as WeekRef[]
  return weeks.map((weekRef) => {
    const bounds = getPeriodBounds(weekRef)
    const num = weekRef.slice(-2)
    const label = `W${num}: ${formatShortDay(bounds.start)} - ${formatShortDay(bounds.end)}`
    const reflection = reflectionStore.getWeeklyByRef(weekRef)
    const source = reflection?.aiSummary?.trim() || reflection?.freeformReflection?.trim() || ''
    return {
      weekRef,
      label,
      snippet: source ? truncate(source, 120) : '',
    }
  })
})

function navigateToWeek(weekRef: WeekRef) {
  void router.push({ name: 'calendar-week', params: { weekRef } })
}
</script>

<style scoped>
.recap-list {
  display: flex;
  flex-direction: column;
  list-style: none;
  padding: 0;
  margin: 0;
}

.recap-row {
  position: relative;
}

.recap-row + .recap-row::before {
  content: '';
  position: absolute;
  top: 0;
  left: 1px;
  right: 1px;
  height: 1px;
  background: linear-gradient(
    90deg,
    transparent,
    rgb(var(--neo-border) / 0.45),
    transparent
  );
  pointer-events: none;
}

.recap-row__head {
  display: flex;
  flex-direction: column;
  gap: 3px;
  width: 100%;
  padding: 7px 10px 9px;
  background: transparent;
  border: none;
  text-align: left;
  cursor: pointer;
  border-radius: 8px;
  transition: background-color 150ms ease;
}

.recap-row__head:hover {
  background: rgb(var(--neo-surface-base) / 0.6);
}

.recap-row__meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  min-width: 0;
}

.recap-row__label {
  font-size: 10.5px;
  font-weight: 600;
  color: rgb(var(--neo-text));
  letter-spacing: 0.02em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
}

.recap-row__chevron {
  flex: 0 0 auto;
  font-size: 13px;
  color: rgb(var(--neo-muted) / 0.7);
  opacity: 0;
  transition: opacity 150ms ease, transform 150ms ease;
}

.recap-row__head:hover .recap-row__chevron,
.recap-row__head:focus-visible .recap-row__chevron {
  opacity: 1;
  transform: translateX(2px);
}

.recap-row__snippet {
  margin: 0;
  font-size: 10.5px;
  line-height: 1.4;
  color: rgb(var(--neo-text) / 0.8);
  word-break: break-word;
}

.recap-row__empty {
  margin: 0;
  font-size: 10.5px;
  color: rgb(var(--neo-muted) / 0.6);
}
</style>
