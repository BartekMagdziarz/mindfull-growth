<template>
  <section class="plan-exec">
    <header class="plan-exec__head">
      <span class="plan-exec__title">{{ t('planning.reflection.review.planVsExecution.title') }}</span>
      <button
        v-if="hasPlan && showActions"
        type="button"
        class="plan-exec__edit neo-focus"
        :title="t('planning.reflection.review.planVsExecution.editButton')"
        :aria-label="t('planning.reflection.review.planVsExecution.editButton')"
        @click.stop="$emit('edit-plan')"
      >
        <AppIcon name="edit" class="text-[11px]" />
      </button>
    </header>

    <div v-if="!hasPlan" class="plan-exec__empty">
      <p class="plan-exec__empty-desc">
        {{ t('planning.reflection.review.planVsExecution.emptyDescription') }}
      </p>
      <button
        v-if="showActions"
        type="button"
        class="neo-focus flex w-full items-center justify-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-on-primary shadow-neu-raised-sm transition-all duration-150 hover:-translate-y-px hover:shadow-neu-raised active:translate-y-0 active:shadow-neu-pressed-sm"
        @click.stop="$emit('create-plan')"
      >
        <AppIcon name="add" class="text-sm" />
        {{ t('planning.reflection.review.planVsExecution.createCta') }}
      </button>
    </div>

    <div v-else-if="!hasObjects" class="plan-exec__no-objects">
      {{ t('planning.reflection.review.planVsExecution.noObjects') }}
    </div>

    <div v-else class="plan-exec__rings">
      <div
        v-for="ring in ringModels"
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
  </section>
</template>

<script lang="ts">
/** One Plan-vs-Execution ring: label is pre-translated by the owning card. */
export interface PlanExecutionRing {
  key: string
  label: string
  numerator: number
  denominator: number
}
</script>

<script setup lang="ts">
import { computed } from 'vue'
import AppIcon from '@/components/shared/AppIcon.vue'
import { useT } from '@/composables/useT'

const props = withDefaults(
  defineProps<{
    hasPlan: boolean
    /** Whether any object is in scope — drives the "plan exists, no objects" state. */
    hasObjects: boolean
    rings: PlanExecutionRing[]
    /** When false, hides the create/edit affordances (e.g. inside the reflection wizard). */
    showActions?: boolean
  }>(),
  { showActions: true },
)

defineEmits<{
  'create-plan': []
  'edit-plan': []
}>()

const { t } = useT()

interface RingModel extends PlanExecutionRing {
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

const ringModels = computed<RingModel[]>(() =>
  props.rings.map((ring) => ({
    ...ring,
    percent: ratioPercent(ring.numerator, ring.denominator),
    text: ringValueText(ring.numerator, ring.denominator),
  })),
)
</script>

<style scoped>
.plan-exec {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.plan-exec__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  min-height: 18px;
}

.plan-exec__title {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: rgb(var(--neo-muted));
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.plan-exec__edit {
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

.plan-exec:hover .plan-exec__edit,
.plan-exec__edit:focus-visible {
  opacity: 1;
}

.plan-exec__edit:hover {
  color: rgb(var(--color-primary-strong));
  transform: translateY(-1px);
}

.plan-exec__empty {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  justify-content: center;
  gap: 8px;
  padding: 2px 0;
}

.plan-exec__empty-desc {
  font-size: 10.5px;
  line-height: 1.35;
  color: rgb(var(--neo-muted));
  text-align: center;
}

.plan-exec__no-objects {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 6px 4px;
  font-size: 10.5px;
  line-height: 1.35;
  color: rgb(var(--neo-muted));
  text-align: center;
}

.plan-exec__rings {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
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
