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

      <template v-if="!hasReflection">
        <button
          v-if="showActions"
          type="button"
          class="neo-focus flex w-full items-center justify-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-on-primary shadow-neu-raised-sm transition-all duration-150 hover:-translate-y-px hover:shadow-neu-raised active:translate-y-0 active:shadow-neu-pressed-sm"
          @click.stop="$emit('create-reflection')"
        >
          <AppIcon name="auto_awesome" class="text-sm" />
          {{ t('planning.reflection.review.kontekstCreateButton') }}
        </button>
        <p
          v-else
          class="text-center text-xs text-on-surface-variant/70"
        >
          —
        </p>
      </template>

      <template v-else>
        <!-- AI summary (expandable) — only when persisted on the reflection -->
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

        <!-- Rating groups — 3 sections × 4 dimensions, rendered as
             top-level sections so each one gets its own separator. -->
        <div
          v-for="group in ratingGroups"
          :key="group.key"
          class="kontekst-section kontekst-group"
        >
          <div class="kontekst-group__title">{{ group.label }}</div>
          <div class="kontekst-group__items">
            <div
              v-for="item in group.items"
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

        <!-- Anchors — only categories with content, expandable -->
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
import SummaryCard from './WeeklyReviewSummaryCard.vue'
import { useT } from '@/composables/useT'
import { useStructuredReflectionStore } from '@/stores/structuredReflection.store'
import type { WeekRef } from '@/domain/period'
import {
  WEEKLY_CONTEXT_KEYS,
  WEEKLY_EVALUATION_KEYS,
  WEEKLY_STATE_KEYS,
  type WeeklyRatingKey,
  type WeeklyReflection,
} from '@/domain/reflection'

const props = withDefaults(
  defineProps<{
    weekRef: WeekRef
    /** When false, hides create/edit buttons (e.g. inside the reflection wizard). */
    showActions?: boolean
  }>(),
  { showActions: true },
)

defineEmits<{
  'create-reflection': []
  'edit-reflection': []
}>()

const showActions = computed(() => props.showActions !== false)

const { t } = useT()
const reflectionStore = useStructuredReflectionStore()

// Make sure structured reflections are loaded the first time this card mounts.
// loadAll() is idempotent and cheap (Dexie list); subsequent mounts won't refetch
// unless something resets the store via appStateReset.
onMounted(() => {
  if (reflectionStore.weeklyReflections.length === 0 && !reflectionStore.isLoading) {
    void reflectionStore.loadAll()
  }
})

const reflection = computed<WeeklyReflection | undefined>(
  () => reflectionStore.getWeeklyByRef(props.weekRef),
)

const hasReflection = computed(() => reflection.value !== undefined)

// AI summary may be missing on legacy records — fall back to empty string.
const aiSummary = computed(() => reflection.value?.aiSummary?.trim() ?? '')
const aiSummaryOpen = ref(false)

interface DimensionItem {
  key: WeeklyRatingKey
  label: string
  value: number | null
}

interface DimensionGroup {
  key: 'context' | 'state' | 'evaluation'
  label: string
  items: DimensionItem[]
}

function valueFor(key: WeeklyRatingKey): number | null {
  const r = reflection.value
  if (!r) return null
  const v = r[key]
  return typeof v === 'number' ? v : null
}

const DIMENSION_LABEL_KEYS: Record<WeeklyRatingKey, string> = {
  physicalIntensityRating: 'planning.reflection.weekly.dimensions.physicalIntensity',
  taskLoadRating: 'planning.reflection.weekly.dimensions.taskLoad',
  emotionalIntensityRating: 'planning.reflection.weekly.dimensions.emotionalIntensity',
  socialIntensityRating: 'planning.reflection.weekly.dimensions.socialIntensity',
  moodRating: 'planning.reflection.weekly.dimensions.mood',
  energyRating: 'planning.reflection.weekly.dimensions.energy',
  calmRating: 'planning.reflection.weekly.dimensions.calm',
  connectionRating: 'planning.reflection.weekly.dimensions.connection',
  productivityRating: 'planning.reflection.weekly.dimensions.productivity',
  engagementRating: 'planning.reflection.weekly.dimensions.engagement',
  emotionalRegulationRating: 'planning.reflection.weekly.dimensions.emotionalRegulation',
  selfCareRating: 'planning.reflection.weekly.dimensions.selfCare',
}

function buildItems(keys: readonly WeeklyRatingKey[]): DimensionItem[] {
  return keys.map((key) => ({
    key,
    label: t(DIMENSION_LABEL_KEYS[key]),
    value: valueFor(key),
  }))
}

const ratingGroups = computed<DimensionGroup[]>(() => [
  {
    key: 'context',
    label: t('planning.reflection.review.kontekstGroupContext'),
    items: buildItems(WEEKLY_CONTEXT_KEYS),
  },
  {
    key: 'state',
    label: t('planning.reflection.review.kontekstGroupState'),
    items: buildItems(WEEKLY_STATE_KEYS),
  },
  {
    key: 'evaluation',
    label: t('planning.reflection.review.kontekstGroupEvaluation'),
    items: buildItems(WEEKLY_EVALUATION_KEYS),
  },
])

// Anchor categories — kept in sync with WeeklyReflectionWizard.weeklyAnchorCategories
const anchorCategories = computed(() => [
  { key: 'wentWell', label: t('planning.reflection.weekly.anchors.wentWell'), icon: 'thumb_up' },
  { key: 'challenges', label: t('planning.reflection.weekly.anchors.challenges'), icon: 'warning' },
  { key: 'gratitude', label: t('planning.reflection.weekly.anchors.gratitude'), icon: 'favorite' },
  { key: 'lessons', label: t('planning.reflection.weekly.anchors.lessons'), icon: 'lightbulb' },
  { key: 'improvements', label: t('planning.reflection.weekly.anchors.improvements'), icon: 'build' },
  { key: 'lookingAhead', label: t('planning.reflection.weekly.anchors.lookingAhead'), icon: 'arrow_forward' },
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
  // Ratings are 1..5 → fill is (v-1)/(5-1) so 1 → 0%, 5 → 100%.
  return Math.max(0, Math.min(100, ((value - 1) / 4) * 100))
}

function handleHostClick(_event: MouseEvent) {
  // Reserved for future "open detail" interaction. No-op for now —
  // explicit buttons handle the create/edit affordances.
}
</script>

<style scoped>
.kontekst-host {
  position: relative;
}

/* ----------------------------------------------------------------
 * Top-level section separator.
 *
 * Any direct slot child marked with .kontekst-section gets a delicate
 * gradient line drawn above it — except when it is the first rendered
 * child. Sits in the middle of the slot's 10px gap (SummaryCard uses
 * gap-2.5). New top-level sections only need to add this class to
 * participate.
 * ---------------------------------------------------------------- */
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

/* ---------------- AI summary ---------------- */
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

/* ---------------- Rating groups ---------------- */
.kontekst-group__title {
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: rgb(var(--neo-muted));
  margin-bottom: 6px;
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

/* ---------------- Anchors ---------------- */
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

/* ---------------- Freeform preview ---------------- */
.kontekst-freeform {
  margin-top: 4px;
  font-size: 11px;
  line-height: 1.45;
  color: rgb(var(--neo-text) / 0.85);
  white-space: pre-wrap;
  word-break: break-word;
}
</style>
