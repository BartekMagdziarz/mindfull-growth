<template>
  <article class="plan-tile" :data-empty="!hasPlan">
    <header class="plan-tile__head">
      <span class="plan-tile__title">{{ t('planning.reflection.review.planVsExecution.title') }}</span>
      <button
        v-if="hasPlan"
        type="button"
        class="plan-tile__edit neo-focus"
        :title="t('planning.reflection.review.planVsExecution.editButton')"
        :aria-label="t('planning.reflection.review.planVsExecution.editButton')"
        @click="$emit('edit-plan')"
      >
        <AppIcon name="edit" class="text-[11px]" />
      </button>
    </header>

    <div v-if="!hasPlan" class="plan-tile__empty">
      <p class="plan-tile__empty-desc">
        {{ t('planning.reflection.review.planVsExecution.emptyDescription') }}
      </p>
      <button type="button" class="plan-tile__cta neo-focus" @click="$emit('create-plan')">
        <AppIcon name="add" class="text-sm" />
        {{ t('planning.reflection.review.planVsExecution.createCta') }}
      </button>
    </div>

    <div v-else-if="!hasObjects" class="plan-tile__no-objects">
      {{ t('planning.reflection.review.planVsExecution.noObjects') }}
    </div>

    <div v-else class="plan-tile__rings">
      <div
        v-for="ring in rings"
        :key="ring.key"
        class="plan-ring-cell"
      >
        <div class="plan-ring">
          <svg viewBox="0 0 36 36" class="plan-ring__svg" aria-hidden="true">
            <circle
              cx="18"
              cy="18"
              r="15.915"
              class="plan-ring__track"
            />
            <circle
              v-if="ring.denominator > 0 && ring.percent > 0"
              cx="18"
              cy="18"
              r="15.915"
              class="plan-ring__fill"
              :stroke-dasharray="`${ring.percent} ${100 - ring.percent}`"
            />
          </svg>
          <span class="plan-ring__value">{{ ring.text }}</span>
        </div>
        <span class="plan-ring__label">{{ ring.label }}</span>
      </div>
    </div>
  </article>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import AppIcon from '@/components/shared/AppIcon.vue'
import { useT } from '@/composables/useT'
import type { MonthPlanSummary } from '@/services/monthlyPlanSummary'

const props = defineProps<{
  hasPlan: boolean
  summary: MonthPlanSummary
}>()

defineEmits<{
  'create-plan': []
  'edit-plan': []
}>()

const { t } = useT()

const hasObjects = computed(
  () =>
    props.summary.keyResults.total > 0 ||
    props.summary.habits.total > 0 ||
    props.summary.trackers.total > 0,
)

interface RingModel {
  key: string
  label: string
  numerator: number
  denominator: number
  percent: number
  text: string
}

function ratioPercent(numerator: number, denominator: number): number {
  if (denominator <= 0) return 0
  return Math.max(0, Math.min(100, Math.round((numerator / denominator) * 100)))
}

function ringValueText(numerator: number, denominator: number): string {
  if (denominator <= 0) {
    return t('planning.reflection.review.planVsExecution.ringEmpty')
  }
  return t('planning.reflection.review.planVsExecution.ringValue', { numerator, denominator })
}

const rings = computed<RingModel[]>(() => [
  {
    key: 'goals',
    label: t('planning.reflection.review.planVsExecution.ringGoals'),
    numerator: props.summary.keyResults.met,
    denominator: props.summary.keyResults.total,
    percent: ratioPercent(props.summary.keyResults.met, props.summary.keyResults.total),
    text: ringValueText(props.summary.keyResults.met, props.summary.keyResults.total),
  },
  {
    key: 'habits',
    label: t('planning.reflection.review.planVsExecution.ringHabits'),
    numerator: props.summary.habits.met,
    denominator: props.summary.habits.total,
    percent: ratioPercent(props.summary.habits.met, props.summary.habits.total),
    text: ringValueText(props.summary.habits.met, props.summary.habits.total),
  },
  {
    key: 'trackers',
    label: t('planning.reflection.review.planVsExecution.ringTrackers'),
    numerator: props.summary.trackers.met,
    denominator: props.summary.trackers.total,
    percent: ratioPercent(props.summary.trackers.met, props.summary.trackers.total),
    text: ringValueText(props.summary.trackers.met, props.summary.trackers.total),
  },
])
</script>

<style scoped>
.plan-tile {
  position: relative;
  border-radius: 14px;
  padding: 8px 10px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-height: 0;
  background: linear-gradient(
    145deg,
    rgb(var(--neo-surface-top)),
    rgb(var(--neo-surface-bottom))
  );
  border: 1px solid rgb(var(--neo-border) / 0.30);
  box-shadow:
    -4px -4px 9px rgb(var(--neo-shadow-light) / 0.75),
    4px 4px 9px rgb(var(--neo-shadow-dark) / 0.28);
}

.plan-tile__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  min-height: 18px;
}

.plan-tile__title {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: rgb(var(--neo-muted));
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.plan-tile__edit {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 6px;
  border: 0;
  background: rgb(var(--neo-surface-base));
  color: rgb(var(--neo-muted));
  cursor: pointer;
  opacity: 0;
  transition: opacity 150ms ease, color 150ms ease, transform 150ms ease;
  box-shadow:
    -1px -1px 2px rgb(var(--neo-shadow-light) / 0.8),
    1px 1px 2px rgb(var(--neo-shadow-dark) / 0.25);
  flex: 0 0 auto;
}

.plan-tile:hover .plan-tile__edit,
.plan-tile__edit:focus-visible {
  opacity: 1;
}

.plan-tile__edit:hover {
  color: rgb(var(--color-primary-strong));
  transform: translateY(-1px);
}

.plan-tile__empty {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  justify-content: center;
  gap: 8px;
  flex: 1 1 auto;
  padding: 4px 0 2px;
}

.plan-tile__empty-desc {
  font-size: 10.5px;
  line-height: 1.35;
  color: rgb(var(--neo-muted));
  text-align: center;
}

.plan-tile__cta {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 6px 10px;
  border-radius: 10px;
  border: 0;
  background: rgb(var(--color-primary));
  color: rgb(var(--color-on-primary));
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  transition: transform 150ms ease, box-shadow 150ms ease;
  box-shadow:
    -2px -2px 4px rgb(var(--neo-shadow-light) / 0.6),
    2px 2px 4px rgb(var(--neo-shadow-dark) / 0.28);
}

.plan-tile__cta:hover {
  transform: translateY(-1px);
}

.plan-tile__cta:active {
  transform: translateY(0);
  box-shadow:
    inset -1px -1px 3px rgb(var(--neo-shadow-light) / 0.4),
    inset 1px 1px 3px rgb(var(--neo-shadow-dark) / 0.3);
}

.plan-tile__no-objects {
  flex: 1 1 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 6px 4px;
  font-size: 10.5px;
  line-height: 1.35;
  color: rgb(var(--neo-muted));
  text-align: center;
}

.plan-tile__rings {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
  flex: 1 1 auto;
  padding-top: 4px;
}

.plan-ring-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  min-width: 0;
}

.plan-ring {
  position: relative;
  width: 52px;
  height: 52px;
}

.plan-ring__svg {
  width: 100%;
  height: 100%;
  transform: rotate(-90deg);
}

.plan-ring__track {
  fill: transparent;
  stroke: rgb(var(--neo-surface-base));
  stroke-width: 3.6;
}

.plan-ring__fill {
  fill: transparent;
  stroke: rgb(var(--color-primary));
  stroke-width: 3.6;
  stroke-linecap: round;
  transition: stroke-dasharray 250ms ease;
}

.plan-ring__value {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 600;
  color: rgb(var(--neo-text));
  font-variant-numeric: tabular-nums;
}

.plan-ring__label {
  font-size: 10px;
  font-weight: 500;
  color: rgb(var(--neo-muted));
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}
</style>
