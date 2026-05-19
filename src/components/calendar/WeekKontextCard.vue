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
        <div class="kontekst-groups">
          <div
            v-for="group in groups"
            :key="group.key"
            class="kontekst-group"
          >
            <div class="kontekst-group__head">
              <span class="kontekst-group__label">{{ group.label }}</span>
              <span class="kontekst-group__avg">
                <template v-if="group.avg !== null">{{ group.avg.toFixed(1) }}</template>
                <template v-else>—</template>
              </span>
            </div>
            <div class="kontekst-group__bar">
              <div
                v-if="group.avg !== null"
                class="kontekst-group__fill"
                :style="{ width: avgPercent(group.avg) + '%' }"
              />
            </div>
          </div>
        </div>

        <p v-if="freeformPreview" class="kontekst-freeform">
          {{ freeformPreview }}
        </p>
      </template>
    </SummaryCard>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
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

function avgFor(keys: readonly WeeklyRatingKey[]): number | null {
  const r = reflection.value
  if (!r) return null
  const values: number[] = []
  for (const key of keys) {
    const v = r[key]
    if (typeof v === 'number') values.push(v)
  }
  if (values.length === 0) return null
  return values.reduce((a, b) => a + b, 0) / values.length
}

const groups = computed(() => [
  {
    key: 'context',
    label: t('planning.reflection.review.kontekstGroupContext'),
    avg: avgFor(WEEKLY_CONTEXT_KEYS),
  },
  {
    key: 'state',
    label: t('planning.reflection.review.kontekstGroupState'),
    avg: avgFor(WEEKLY_STATE_KEYS),
  },
  {
    key: 'evaluation',
    label: t('planning.reflection.review.kontekstGroupEvaluation'),
    avg: avgFor(WEEKLY_EVALUATION_KEYS),
  },
])

const freeformPreview = computed(() => {
  const text = reflection.value?.freeformReflection?.trim()
  if (!text) return ''
  return text.length > 160 ? text.slice(0, 157) + '…' : text
})

function avgPercent(avg: number): number {
  // Ratings are 1..5 → fill is (avg-1)/(5-1) so 1 → 0%, 5 → 100%.
  return Math.max(0, Math.min(100, ((avg - 1) / 4) * 100))
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

.kontekst-groups {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.kontekst-group__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 4px;
  margin-bottom: 3px;
}

.kontekst-group__label {
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: rgb(var(--neo-muted));
}

.kontekst-group__avg {
  font-size: 11px;
  font-weight: 600;
  color: rgb(var(--neo-text));
  font-variant-numeric: tabular-nums;
}

.kontekst-group__bar {
  position: relative;
  width: 100%;
  height: 4px;
  border-radius: 9999px;
  background: rgb(var(--neo-surface-base));
  box-shadow:
    inset -1px -1px 1.5px rgb(var(--neo-inset-light) / 0.85),
    inset 1px 1px 1.5px rgb(var(--neo-inset-dark) / 0.3);
}

.kontekst-group__fill {
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

.kontekst-freeform {
  margin-top: 4px;
  font-size: 11px;
  line-height: 1.45;
  color: rgb(var(--neo-text) / 0.85);
  white-space: pre-wrap;
  word-break: break-word;
}
</style>
