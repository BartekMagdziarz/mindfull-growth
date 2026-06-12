<template>
  <div class="kontekst-host" @click="handleHostClick">
    <SummaryCard :title="t('planning.reflection.review.kontekstTitle')">
      <template v-if="hasReflection && showActions" #header-action>
        <button
          type="button"
          class="kontekst-edit neo-focus"
          :title="t('planning.reflection.review.kontekstEditButton')"
          :aria-label="t('planning.reflection.review.kontekstEditButton')"
          @click.stop="$emit('edit-reflection')"
        >
          <AppIcon name="edit" class="text-sm" />
        </button>
      </template>

      <!-- Plan vs execution — rings when a plan exists, create CTA otherwise.
           Lives here so plan + reflection share one "summary" home. -->
      <PlanExecutionSection
        class="kontekst-section"
        :has-plan="hasPlan"
        :has-objects="planHasObjects"
        :rings="planRings"
        :show-actions="showActions"
        @create-plan="$emit('create-plan')"
        @edit-plan="$emit('edit-plan')"
      />

      <template v-if="!hasReflection">
        <!-- A month that hasn't started yet has nothing to reflect on. -->
        <p v-if="isFutureMonth" class="kontekst-section kontekst-future">
          {{ t('planning.reflection.review.kontekstFutureMonthHint') }}
        </p>
        <button
          v-else-if="showActions"
          type="button"
          class="kontekst-section neo-focus flex w-full items-center justify-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-on-primary shadow-neu-raised-sm transition-all duration-150 hover:-translate-y-px hover:shadow-neu-raised active:translate-y-0 active:shadow-neu-pressed-sm"
          @click.stop="$emit('create-reflection')"
        >
          <AppIcon name="auto_awesome" class="text-sm" />
          {{ t('planning.reflection.review.kontekstCreateButton') }}
        </button>
        <p
          v-else
          class="kontekst-section text-center text-xs text-on-surface-variant/70"
        >
          —
        </p>
      </template>

      <template v-else>
        <div v-if="aiSummary" class="kontekst-section kontekst-ai">
          <button
            type="button"
            class="kontekst-ai__head neo-focus"
            @click.stop="aiSummaryOpen = !aiSummaryOpen"
          >
            <span class="kontekst-ai__icon">
              <AppIcon name="auto_awesome" class="text-[10px]" />
            </span>
            <span class="kontekst-ai__label">
              {{ t('planning.reflection.review.kontekstAiSummaryTitle') }}
            </span>
            <AppIcon
              :name="aiSummaryOpen ? 'expand_less' : 'expand_more'"
              class="text-xs"
            />
          </button>
          <p v-if="aiSummaryOpen" class="kontekst-ai__body">
            {{ aiSummary }}
          </p>
        </div>

        <div class="kontekst-section kontekst-group">
          <div class="kontekst-group__items">
            <div
              v-for="item in dimensions"
              :key="item.key"
              class="kontekst-dim"
            >
              <span class="kontekst-dim__label">{{ item.label }}</span>
              <div class="kontekst-dim__bar">
                <div
                  v-if="item.value !== null"
                  class="kontekst-dim__fill"
                  :style="{ width: valuePercent(item.value) + '%' }"
                />
              </div>
              <span class="kontekst-dim__value">
                <template v-if="item.value !== null">{{ item.value }}<span class="kontekst-dim__max">/5</span></template>
                <template v-else>—</template>
              </span>
            </div>
          </div>
        </div>

        <div v-if="visibleAnchorCategories.length > 0" class="kontekst-section kontekst-anchors">
          <div class="kontekst-anchors__title">
            {{ t('planning.reflection.review.kontekstAnchorsTitle') }}
          </div>
          <div
            v-for="cat in visibleAnchorCategories"
            :key="cat.key"
            class="kontekst-anchor"
          >
            <button
              type="button"
              class="kontekst-anchor__head neo-focus"
              @click.stop="toggleAnchor(cat.key)"
            >
              <span class="kontekst-anchor__icon">
                <AppIcon :name="cat.icon" class="text-[11px]" />
              </span>
              <span class="kontekst-anchor__label">{{ cat.label }}</span>
              <span class="kontekst-anchor__count">{{ getAnchorLines(cat.key).length }}</span>
              <AppIcon
                :name="anchorOpen[cat.key] ? 'expand_less' : 'expand_more'"
                class="text-xs"
              />
            </button>
            <ul v-if="anchorOpen[cat.key]" class="kontekst-anchor__list">
              <li
                v-for="(line, idx) in getAnchorLines(cat.key)"
                :key="idx"
                class="kontekst-anchor__line"
              >
                {{ line }}
              </li>
            </ul>
          </div>
        </div>

        <p v-if="freeformPreview" class="kontekst-section kontekst-freeform">
          {{ freeformPreview }}
        </p>
      </template>
    </SummaryCard>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import AppIcon from '@/components/shared/AppIcon.vue'
import PlanExecutionSection, { type PlanExecutionRing } from './PlanExecutionSection.vue'
import SummaryCard from './WeeklyReviewSummaryCard.vue'
import { useT } from '@/composables/useT'
import { useStructuredReflectionStore } from '@/stores/structuredReflection.store'
import type { DayRef, MonthRef } from '@/domain/period'
import {
  MONTHLY_RATING_KEYS,
  type MonthlyRatingKey,
  type MonthlyReflection,
} from '@/domain/reflection'
import type { MonthPlanSummary } from '@/services/monthlyPlanSummary'
import { getPeriodBounds } from '@/utils/periods'

const props = withDefaults(
  defineProps<{
    monthRef: MonthRef
    todayDayRef: DayRef
    /** Whether a MonthPlan record exists for this month — drives the plan-vs-execution section state. */
    hasPlan: boolean
    planSummary: MonthPlanSummary
    /** When false, hides create/edit buttons (e.g. inside the reflection wizard). */
    showActions?: boolean
  }>(),
  { showActions: true },
)

defineEmits<{
  'create-reflection': []
  'edit-reflection': []
  'create-plan': []
  'edit-plan': []
}>()

const showActions = computed(() => props.showActions !== false)

const { t } = useT()
const reflectionStore = useStructuredReflectionStore()

onMounted(() => {
  if (reflectionStore.monthlyReflections.length === 0 && !reflectionStore.isLoading) {
    void reflectionStore.loadAll()
  }
})

const reflection = computed<MonthlyReflection | undefined>(
  () => reflectionStore.getMonthlyByRef(props.monthRef),
)

const hasReflection = computed(() => reflection.value !== undefined)

// Reflection is offered only once the month has started; a stored reflection
// (e.g. created before navigating ahead) still renders for future months.
const isFutureMonth = computed(
  () => (getPeriodBounds(props.monthRef).start as DayRef) > props.todayDayRef,
)

const planHasObjects = computed(
  () =>
    props.planSummary.keyResults.total > 0 ||
    props.planSummary.habits.total > 0 ||
    props.planSummary.trackers.total > 0,
)

const planRings = computed<PlanExecutionRing[]>(() => [
  {
    key: 'goals',
    label: t('planning.reflection.review.planVsExecution.ringGoals'),
    numerator: props.planSummary.keyResults.met,
    denominator: props.planSummary.keyResults.total,
  },
  {
    key: 'habits',
    label: t('planning.reflection.review.planVsExecution.ringHabits'),
    numerator: props.planSummary.habits.met,
    denominator: props.planSummary.habits.total,
  },
  {
    key: 'trackers',
    label: t('planning.reflection.review.planVsExecution.ringTrackers'),
    numerator: props.planSummary.trackers.met,
    denominator: props.planSummary.trackers.total,
  },
])

const aiSummary = computed(() => reflection.value?.aiSummary?.trim() ?? '')
const aiSummaryOpen = ref(false)

interface DimensionItem {
  key: MonthlyRatingKey
  label: string
  value: number | null
}

function valueFor(key: MonthlyRatingKey): number | null {
  const r = reflection.value
  if (!r) return null
  const v = r[key]
  return typeof v === 'number' ? v : null
}

const DIMENSION_LABEL_KEYS: Record<MonthlyRatingKey, string> = {
  balanceRating: 'planning.reflection.monthly.dimensions.balance',
  purposeRating: 'planning.reflection.monthly.dimensions.purpose',
  growthRating: 'planning.reflection.monthly.dimensions.growth',
  coherenceRating: 'planning.reflection.monthly.dimensions.coherence',
  agencyRating: 'planning.reflection.monthly.dimensions.agency',
}

const dimensions = computed<DimensionItem[]>(() =>
  MONTHLY_RATING_KEYS.map((key) => ({
    key,
    label: t(DIMENSION_LABEL_KEYS[key]),
    value: valueFor(key),
  })),
)

// Anchor categories — kept in sync with MonthlyReflectionWizard.monthlyAnchorCategories
const anchorCategories = computed(() => [
  { key: 'proudOf', label: t('planning.reflection.monthly.anchors.proudOf'), icon: 'emoji_events' },
  { key: 'challenges', label: t('planning.reflection.monthly.anchors.challenges'), icon: 'warning' },
  { key: 'growth', label: t('planning.reflection.monthly.anchors.growth'), icon: 'trending_up' },
  { key: 'patterns', label: t('planning.reflection.monthly.anchors.patterns'), icon: 'pattern' },
  { key: 'carryForward', label: t('planning.reflection.monthly.anchors.carryForward'), icon: 'arrow_forward' },
  { key: 'letGo', label: t('planning.reflection.monthly.anchors.letGo'), icon: 'delete_sweep' },
])

function getAnchorLines(key: string): string[] {
  const text = reflection.value?.promptResponses?.[key] ?? ''
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
}

const visibleAnchorCategories = computed(() =>
  anchorCategories.value.filter((cat) => getAnchorLines(cat.key).length > 0),
)

const anchorOpen = reactive<Record<string, boolean>>({})

function toggleAnchor(key: string) {
  anchorOpen[key] = !anchorOpen[key]
}

const freeformPreview = computed(() => {
  const text = reflection.value?.freeformReflection?.trim()
  if (!text) return ''
  return text.length > 160 ? text.slice(0, 157) + '…' : text
})

function valuePercent(value: number): number {
  return Math.max(0, Math.min(100, ((value - 1) / 4) * 100))
}

function handleHostClick(_event: MouseEvent) {
  // Reserved for future "open detail" interaction. Explicit buttons handle
  // the create/edit affordances.
}
</script>

<style scoped>
.kontekst-host {
  position: relative;
}

.kontekst-section {
  position: relative;
}

.kontekst-section:not(:first-child)::before {
  content: '';
  position: absolute;
  top: -5px;
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

.kontekst-edit {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
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
}

.kontekst-host:hover .kontekst-edit,
.kontekst-edit:focus-visible {
  opacity: 1;
}

.kontekst-edit:hover {
  color: rgb(var(--color-primary-strong));
  transform: translateY(-1px);
}

.kontekst-ai {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 8px;
  border-radius: 10px;
  background: rgb(var(--neo-surface-base));
  box-shadow:
    inset -1px -1px 2px rgb(var(--neo-inset-light) / 0.85),
    inset 1px 1px 2px rgb(var(--neo-inset-dark) / 0.3);
}

.kontekst-ai__head {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  border: 0;
  background: transparent;
  padding: 0;
  cursor: pointer;
  color: rgb(var(--neo-text));
}

.kontekst-ai__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border-radius: 6px;
  background: rgb(var(--color-primary) / 0.15);
  color: rgb(var(--color-primary-strong));
  flex-shrink: 0;
}

.kontekst-ai__label {
  flex: 1;
  text-align: left;
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: rgb(var(--neo-muted));
}

.kontekst-ai__body {
  margin: 0;
  font-size: 11px;
  line-height: 1.45;
  color: rgb(var(--neo-text) / 0.9);
  white-space: pre-wrap;
  word-break: break-word;
}

.kontekst-group__items {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.kontekst-dim {
  display: flex;
  align-items: center;
  gap: 8px;
}

.kontekst-dim__label {
  font-size: 10px;
  color: rgb(var(--neo-text) / 0.85);
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.kontekst-dim__bar {
  position: relative;
  flex: 0 0 88px;
  height: 5px;
  border-radius: 9999px;
  background: rgb(var(--neo-surface-base));
  box-shadow:
    inset -1px -1px 1.5px rgb(var(--neo-inset-light) / 0.85),
    inset 1px 1px 1.5px rgb(var(--neo-inset-dark) / 0.3);
}

.kontekst-dim__fill {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  border-radius: 9999px;
  background: linear-gradient(
    90deg,
    rgb(var(--neo-chart-primary-start)),
    rgb(var(--neo-chart-primary-end))
  );
  transition: width 220ms ease;
}

.kontekst-dim__value {
  font-size: 10px;
  font-weight: 600;
  color: rgb(var(--neo-text));
  font-variant-numeric: tabular-nums;
  flex: 0 0 auto;
  min-width: 28px;
  text-align: right;
}

.kontekst-dim__max {
  color: rgb(var(--neo-muted));
  font-weight: 500;
}

.kontekst-anchors {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.kontekst-anchors__title {
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: rgb(var(--neo-muted));
}

.kontekst-anchor {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.kontekst-anchor__head {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  padding: 5px 7px;
  border: 0;
  border-radius: 8px;
  background: rgb(var(--neo-surface-base));
  color: rgb(var(--neo-text));
  cursor: pointer;
  box-shadow:
    -1px -1px 2px rgb(var(--neo-shadow-light) / 0.8),
    1px 1px 2px rgb(var(--neo-shadow-dark) / 0.25);
  transition: transform 150ms ease, box-shadow 150ms ease;
}

.kontekst-anchor__head:hover {
  transform: translateY(-1px);
}

.kontekst-anchor__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border-radius: 6px;
  background: rgb(var(--color-primary) / 0.12);
  color: rgb(var(--color-primary-strong));
  flex-shrink: 0;
}

.kontekst-anchor__label {
  flex: 1;
  font-size: 11px;
  font-weight: 500;
  text-align: left;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.kontekst-anchor__count {
  font-size: 10px;
  font-weight: 600;
  color: rgb(var(--neo-muted));
  background: rgb(var(--neo-surface-base));
  padding: 1px 6px;
  border-radius: 9999px;
  font-variant-numeric: tabular-nums;
  flex-shrink: 0;
  box-shadow:
    inset -1px -1px 1.5px rgb(var(--neo-inset-light) / 0.85),
    inset 1px 1px 1.5px rgb(var(--neo-inset-dark) / 0.3);
}

.kontekst-anchor__list {
  margin: 0;
  padding: 4px 0 4px 10px;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.kontekst-anchor__line {
  position: relative;
  padding-left: 10px;
  font-size: 11px;
  line-height: 1.4;
  color: rgb(var(--neo-text) / 0.85);
  word-break: break-word;
}

.kontekst-anchor__line::before {
  content: '';
  position: absolute;
  left: 0;
  top: 7px;
  width: 3px;
  height: 3px;
  border-radius: 9999px;
  background: rgb(var(--color-primary));
}

.kontekst-freeform {
  margin-top: 4px;
  font-size: 11px;
  line-height: 1.45;
  color: rgb(var(--neo-text) / 0.85);
  white-space: pre-wrap;
  word-break: break-word;
}

.kontekst-future {
  font-size: 10.5px;
  line-height: 1.35;
  color: rgb(var(--neo-muted));
  text-align: center;
  padding: 2px 0;
}
</style>
