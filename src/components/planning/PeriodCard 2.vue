<template>
  <AppCard
    padding="md"
    :class="[
      'neo-card period-card neo-focus group relative flex h-full min-h-[160px] flex-col cursor-pointer',
      isSelected ? 'period-card--selected' : '',
    ]"
    role="button"
    tabindex="0"
    @click="emit('select')"
    @keydown.enter.prevent="emit('select')"
    @keydown.space.prevent="emit('select')"
  >
    <!-- Date label — vertically centered -->
    <div class="flex-1 flex flex-col items-center justify-center text-center">
      <h3 class="text-2xl font-semibold leading-snug text-on-primary-soft">
        {{ dateLabel }}
      </h3>
      <p v-if="customTitle" class="mt-1 text-sm text-on-primary-soft/80">
        {{ customTitle }}
      </p>
    </div>

    <div class="flex flex-col items-center gap-1.5 pt-2">
      <!-- Item status circles (commitments / projects) -->
      <div v-if="itemStatuses.length" class="flex items-center justify-center gap-1.5 flex-wrap">
        <span
          v-for="(item, idx) in itemStatuses"
          :key="idx"
          :title="item.label"
        >
          <!-- Planned: empty circle -->
          <svg v-if="item.status === 'planned'" class="h-5 w-5 text-primary" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.5" />
          </svg>
          <!-- Active: dot circle -->
          <svg v-else-if="item.status === 'active'" class="h-5 w-5 text-primary-strong" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.5" />
            <circle cx="8" cy="8" r="2.5" fill="currentColor" />
          </svg>
          <!-- Done / completed: check in circle -->
          <svg v-else-if="item.status === 'done' || item.status === 'completed'" class="h-5 w-5 text-success" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.5" />
            <path d="M5.5 8l2 2 3-3.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
          <!-- Partial: half-filled circle -->
          <svg v-else-if="item.status === 'partial'" class="h-5 w-5 text-info" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.5" />
            <path d="M8 2A6 6 0 002 8a6 6 0 006 6V2z" fill="currentColor" opacity="0.4" />
          </svg>
          <!-- Skipped: X in circle -->
          <svg v-else-if="item.status === 'skipped'" class="h-5 w-5 text-on-surface-variant" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.5" />
            <path d="M6 6l4 4M10 6l-4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
          </svg>
          <!-- Paused: pause bars in circle -->
          <svg v-else-if="item.status === 'paused'" class="h-5 w-5 text-warning" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.5" />
            <rect x="5.5" y="5.5" width="1.5" height="5" rx="0.5" fill="currentColor" />
            <rect x="9" y="5.5" width="1.5" height="5" rx="0.5" fill="currentColor" />
          </svg>
          <!-- Abandoned: dash in circle -->
          <svg v-else-if="item.status === 'abandoned'" class="h-5 w-5 text-on-surface-variant/80" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.5" />
            <path d="M5 8h6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
          </svg>
        </span>
      </div>

      <!-- Badge row: Plan | Reflect -->
      <div class="flex items-center justify-center gap-1.5">
        <!-- Plan badge -->
        <component
          :is="planIsButton ? 'button' : 'span'"
          v-if="showPlanBadge"
          :type="planIsButton ? 'button' : undefined"
          class="period-badge"
          :class="planBadgeClass"
          @click.stop="planIsButton ? emit('plan') : undefined"
          @keydown.enter.stop.prevent="planIsButton ? emit('plan') : undefined"
          @keydown.space.stop.prevent="planIsButton ? emit('plan') : undefined"
        >
          {{ planBadgeLabel }}
        </component>

        <!-- Reflect badge -->
        <component
          :is="reflectIsButton ? 'button' : 'span'"
          v-if="showReflectBadge"
          :type="reflectIsButton ? 'button' : undefined"
          class="period-badge"
          :class="reflectBadgeClass"
          @click.stop="reflectIsButton ? emit('reflect') : undefined"
          @keydown.enter.stop.prevent="reflectIsButton ? emit('reflect') : undefined"
          @keydown.space.stop.prevent="reflectIsButton ? emit('reflect') : undefined"
        >
          {{ reflectBadgeLabel }}
        </component>
      </div>
    </div>
  </AppCard>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import AppCard from '@/components/AppCard.vue'
import { useT } from '@/composables/useT'
import {
  formatPeriodDateRangeNoYear,
  isCurrentPeriod,
  isPastPeriod,
} from '@/utils/periodUtils'

const { t } = useT()

export interface ItemStatus {
  label: string
  status: string
}

const props = defineProps<{
  type: 'yearly' | 'monthly' | 'weekly'
  startDate: string
  endDate: string
  name?: string
  hasPlan?: boolean
  hasReflection?: boolean
  isSelected?: boolean
  itemStatuses?: ItemStatus[]
}>()

const emit = defineEmits<{
  select: []
  plan: []
  reflect: []
}>()

const hasPlan = computed(() => props.hasPlan ?? false)
const hasReflection = computed(() => props.hasReflection ?? false)
const isSelected = computed(() => props.isSelected ?? false)
const itemStatuses = computed(() => props.itemStatuses ?? [])

const dateLabel = computed(() => {
  const start = new Date(props.startDate)
  const end = new Date(props.endDate)

  if (props.type === 'yearly') {
    const isWholeYear =
      start.getMonth() === 0 && start.getDate() === 1 &&
      end.getMonth() === 11 && end.getDate() === 31 &&
      start.getFullYear() === end.getFullYear()
    if (isWholeYear) return `${start.getFullYear()}`
  }

  if (props.type === 'monthly') {
    const isWholeMonth =
      start.getDate() === 1 &&
      start.getMonth() === end.getMonth() &&
      start.getFullYear() === end.getFullYear() &&
      end.getDate() === new Date(end.getFullYear(), end.getMonth() + 1, 0).getDate()
    if (isWholeMonth) return t(`planning.components.periodCard.months.${start.getMonth()}`)
  }

  return formatPeriodDateRangeNoYear(props.startDate, props.endDate)
})
const customTitle = computed(() => {
  const trimmed = props.name?.trim()
  if (!trimmed) return ''
  return trimmed
})

const isCurrent = computed(() => isCurrentPeriod(props.startDate, props.endDate))
const isPast = computed(() => isPastPeriod(props.endDate))

const showPlanBadge = computed(() => isCurrent.value || isPast.value)
const planIsButton = computed(() => isCurrent.value && !hasPlan.value)
const planBadgeClass = computed(() => {
  if (planIsButton.value) return 'period-badge--action cursor-pointer'
  if (isPast.value && !hasPlan.value) return 'period-badge--expired'
  return 'period-badge--filled'
})
const planBadgeLabel = computed(() => {
  if (planIsButton.value) return t('planning.components.periodCard.plan')
  if (isPast.value && !hasPlan.value) return t('planning.components.periodCard.planMissed')
  return t('planning.components.periodCard.planned')
})

const showReflectBadge = computed(() => isCurrent.value || isPast.value)
const reflectIsButton = computed(() => {
  if (isCurrent.value && !hasReflection.value) return true
  if (isPast.value && !hasReflection.value) return true
  return false
})
const reflectBadgeClass = computed(() => {
  if (reflectIsButton.value) return 'period-badge--action cursor-pointer'
  if (isPast.value && !hasReflection.value) return 'period-badge--expired'
  return 'period-badge--filled'
})
const reflectBadgeLabel = computed(() => {
  if (reflectIsButton.value) return t('planning.components.periodCard.reflect')
  if (isPast.value && !hasReflection.value) return t('planning.components.periodCard.reflectMissed')
  return t('planning.components.periodCard.reflected')
})
</script>

<style scoped>
.period-card {
  transition:
    transform 0.25s cubic-bezier(0.4, 0, 0.2, 1),
    box-shadow 0.25s ease,
    border-color 0.25s ease;
  background: linear-gradient(
    145deg,
    rgb(var(--color-surface-variant) / 0.95),
    rgb(var(--neo-surface-bottom))
  );
}
.period-card:hover {
  transform: translateY(-1px);
}
.period-card:focus-visible {
  outline: 2px solid rgb(var(--neo-focus));
  outline-offset: 2px;
  box-shadow:
    0 0 0 2px rgb(var(--neo-surface-top)),
    0 0 0 4px rgb(var(--neo-focus) / 0.95);
}
.period-card--selected {
  transform: translateY(0);
  border-color: rgb(var(--neo-border) / 0.3);
  background: rgb(var(--neo-surface-base));
  box-shadow:
    inset -4px -4px 8px rgb(var(--neo-inset-light) / 0.8),
    inset 4px 4px 8px rgb(var(--neo-inset-dark) / 0.33);
}

.period-badge {
  appearance: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 88px;
  height: 26px;
  border-radius: 9999px;
  padding: 0 10px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  line-height: 1;
  border: 1px solid rgb(var(--neo-border) / 0.35);
  color: rgb(var(--neo-text));
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease,
    background-color 0.2s ease,
    border-color 0.2s ease,
    color 0.2s ease;
}

.period-badge:focus-visible {
  outline: 2px solid rgb(var(--neo-focus));
  outline-offset: 2px;
}

.period-badge--filled {
  background: linear-gradient(
    145deg,
    rgb(var(--neo-surface-top)),
    rgb(var(--neo-surface-bottom))
  );
  box-shadow:
    -4px -4px 8px rgb(var(--neo-shadow-light) / 0.8),
    4px 4px 8px rgb(var(--neo-shadow-dark) / 0.33);
}

.period-badge--expired {
  border-color: rgb(var(--neo-border) / 0.35);
  background: rgb(var(--neo-surface-base));
  box-shadow:
    inset -2px -2px 5px rgb(var(--neo-inset-light) / 0.8),
    inset 2px 2px 5px rgb(var(--neo-inset-dark) / 0.33);
  color: rgb(var(--neo-muted));
}

.period-badge--action {
  border-color: rgb(var(--neo-border) / 0.35);
  background: linear-gradient(
    135deg,
    rgb(var(--neo-accent-start) / 0.9),
    rgb(var(--neo-accent-end) / 0.9)
  );
  box-shadow:
    -4px -4px 8px rgb(var(--neo-shadow-light) / 0.8),
    4px 4px 8px rgb(var(--neo-shadow-dark) / 0.33);
  color: rgb(var(--neo-accent-text));
}
.period-badge--action:hover {
  transform: translateY(-1px);
}
.period-badge--action:active {
  transform: translateY(0);
  box-shadow:
    inset -2px -2px 5px rgb(var(--neo-inset-light) / 0.8),
    inset 2px 2px 5px rgb(var(--neo-inset-dark) / 0.33);
}
</style>
