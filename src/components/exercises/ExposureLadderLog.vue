<template>
  <div class="exposure-log">
    <p class="text-sm text-on-surface-variant">{{ t('exerciseWizards.gradedExposure.log.lead') }}</p>
    <ExerciseStepWhy :text="tg('exerciseWizards.gradedExposure.log.why')" />

    <ol class="exposure-log__rungs">
      <li v-for="rung in rungs" :key="rung.id" class="mg-v2-surface mg-v2-surface--flat exposure-log__rung">
        <div class="exposure-log__head">
          <span class="exposure-log__suds">{{ rung.sudsRating }}</span>
          <div class="min-w-0 flex-1">
            <p class="exposure-log__situation">{{ rung.situation }}</p>
            <p class="mg-v2-meta">
              <span :class="{ 'mg-v2-meta__status': rung.completed }">{{ attemptsLabel(rung) }}</span>
              <span v-if="lastAttempt(rung)">
                {{ t('exerciseWizards.gradedExposure.log.lastAttempt', {
                  before: lastAttempt(rung)!.anxietyBefore,
                  peak: lastAttempt(rung)!.anxietyPeak,
                  after: lastAttempt(rung)!.anxietyAfter,
                }) }}
              </span>
            </p>
          </div>
          <button
            v-if="openRungId !== rung.id"
            type="button"
            class="mg-v2-button"
            @click="openForm(rung.id)"
          >
            {{ t('exerciseWizards.gradedExposure.log.logAttempt') }}
          </button>
        </div>

        <form v-if="openRungId === rung.id" class="exposure-log__form" @submit.prevent="saveAttempt(rung)">
          <label v-for="field in sudsFields" :key="field" class="mg-v2-field-wrap exposure-log__slider">
            <span class="mg-v2-field-wrap__label">
              {{ t(`exerciseWizards.gradedExposure.log.${field}`) }} <span class="exposure-log__value">{{ draft[field] }}</span>
            </span>
            <ExerciseRangeInput v-model="draft[field]" :min="0" :max="100" :step="5" />
          </label>
          <label class="mg-v2-field-wrap">
            <span class="mg-v2-field-wrap__label">{{ t('exerciseWizards.gradedExposure.log.duration') }}</span>
            <input v-model.number="draft.duration" type="number" min="1" max="600" class="mg-v2-field exposure-log__duration" />
          </label>
          <div v-if="safetyBehaviors.length" class="mg-v2-field-wrap">
            <span class="mg-v2-field-wrap__label">{{ t('exerciseWizards.gradedExposure.log.safetyUsed') }}</span>
            <div class="flex flex-wrap gap-2">
              <button
                v-for="behavior in safetyBehaviors"
                :key="behavior"
                type="button"
                class="mg-v2-pill exposure-log__chip"
                :class="{ 'mg-v2-pill--primary mg-v2-pill--selected': draft.safety.includes(behavior) }"
                :aria-pressed="draft.safety.includes(behavior)"
                @click="toggleSafety(behavior)"
              >
                {{ behavior }}
              </button>
            </div>
          </div>
          <textarea
            v-model="draft.notes"
            rows="2"
            class="mg-v2-field exposure-log__notes"
            :placeholder="t('exerciseWizards.gradedExposure.log.notesPlaceholder')"
          />
          <label class="exposure-log__check">
            <input v-model="draft.mastered" type="checkbox" class="mg-v2-checkbox" />
            {{ t('exerciseWizards.gradedExposure.log.mastered') }}
          </label>
          <div class="flex justify-end gap-2">
            <button type="button" class="mg-v2-button" @click="openRungId = null">
              {{ t('common.buttons.cancel') }}
            </button>
            <button type="submit" class="mg-v2-button mg-v2-button--primary" :disabled="saving">
              {{ t('exerciseWizards.gradedExposure.log.save') }}
            </button>
          </div>
        </form>
      </li>
    </ol>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import ExerciseRangeInput from '@/components/exercises/ExerciseRangeInput.vue'
import ExerciseStepWhy from '@/components/exercises/ExerciseStepWhy.vue'
import { useT } from '@/composables/useT'
import type { ExposureAttempt, ExposureItem, GradedExposureHierarchy } from '@/domain/exercises'
import { useExerciseCompletionsStore } from '@/stores/exerciseCompletions.store'
import { useGradedExposureStore } from '@/stores/gradedExposure.store'
import { getPeriodRefsForDate } from '@/utils/periods'

/**
 * Attempt log for an existing fear ladder: one attempt per exposure
 * (SUDS before / peak / after, duration, safety behaviours still used).
 * Each saved attempt is also an exercise completion, so a due
 * "continue the ladder" program step or plan item ticks itself.
 */
const props = defineProps<{ hierarchy: GradedExposureHierarchy }>()

const { t, tp, tg } = useT()
const exposureStore = useGradedExposureStore()

const sudsFields = ['anxietyBefore', 'anxietyPeak', 'anxietyAfter'] as const
const openRungId = ref<string | null>(null)
const saving = ref(false)
const draft = reactive({
  anxietyBefore: 50,
  anxietyPeak: 60,
  anxietyAfter: 30,
  duration: 15,
  safety: [] as string[],
  notes: '',
  mastered: false,
})

const rungs = computed(() => [...props.hierarchy.items].sort((a, b) => a.sudsRating - b.sudsRating))
const safetyBehaviors = computed(() => props.hierarchy.safetyBehaviors ?? [])

function lastAttempt(rung: ExposureItem): ExposureAttempt | undefined {
  return rung.attempts[rung.attempts.length - 1]
}

function attemptsLabel(rung: ExposureItem): string {
  if (rung.completed) return t('exerciseWizards.gradedExposure.log.masteredBadge')
  return tp(
    rung.attempts.length,
    'exerciseWizards.gradedExposure.log.attempts.one',
    'exerciseWizards.gradedExposure.log.attempts.few',
    'exerciseWizards.gradedExposure.log.attempts.many',
  )
}

function openForm(rungId: string): void {
  const rung = props.hierarchy.items.find((item) => item.id === rungId)
  Object.assign(draft, {
    anxietyBefore: rung?.sudsRating ?? 50,
    anxietyPeak: rung?.sudsRating ?? 60,
    anxietyAfter: Math.max(0, (rung?.sudsRating ?? 50) - 20),
    duration: 15,
    safety: [],
    notes: '',
    mastered: false,
  })
  openRungId.value = rungId
}

function toggleSafety(behavior: string): void {
  draft.safety = draft.safety.includes(behavior)
    ? draft.safety.filter((item) => item !== behavior)
    : [...draft.safety, behavior]
}

async function saveAttempt(rung: ExposureItem): Promise<void> {
  saving.value = true
  try {
    const attempt: ExposureAttempt = {
      id: crypto.randomUUID(),
      date: getPeriodRefsForDate(new Date()).day,
      anxietyBefore: draft.anxietyBefore,
      anxietyPeak: draft.anxietyPeak,
      anxietyAfter: draft.anxietyAfter,
      duration: draft.duration,
      ...(draft.safety.length ? { safetyBehaviorsUsed: [...draft.safety] } : {}),
      ...(draft.notes.trim() ? { notes: draft.notes.trim() } : {}),
    }
    const items = props.hierarchy.items.map((item) =>
      item.id === rung.id
        ? { ...item, completed: item.completed || draft.mastered, attempts: [...item.attempts, attempt] }
        : item,
    )
    await exposureStore.updateHierarchy(props.hierarchy.id, { items })
    void useExerciseCompletionsStore()
      .record('graded-exposure', props.hierarchy.id)
      .catch((err) => console.error('Failed to record exercise completion:', err))
    openRungId.value = null
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.exposure-log {
  display: grid;
  gap: var(--mg-space-3);
}

.exposure-log__rungs {
  display: grid;
  gap: var(--mg-space-2);
  margin: 0;
  padding: 0;
  list-style: none;
}

/* Nested inside the ladder card: flat field-tone blocks (no shadow, no stripe). */
.exposure-log__rung {
  display: grid;
  gap: var(--mg-space-3);
  padding: var(--mg-space-3) var(--mg-space-4);
  border-radius: var(--mg-radius-md);
}

.exposure-log__head {
  display: flex;
  align-items: center;
  gap: var(--mg-space-3);
}

.exposure-log__situation {
  margin: 0;
  color: var(--mg-color-ink);
  font-size: var(--mg-font-size-sm);
  font-weight: 700;
}

.exposure-log__suds {
  display: inline-grid;
  place-items: center;
  min-width: 2.25rem;
  height: 2.25rem;
  border-radius: var(--mg-radius-pill);
  background: var(--mg-color-paper);
  color: var(--mg-color-primary-strong);
  font-size: var(--mg-font-size-sm);
  font-weight: 800;
}

.exposure-log__form {
  display: grid;
  gap: var(--mg-space-3);
}

.exposure-log__value {
  color: var(--mg-color-primary-strong);
}

.exposure-log__duration {
  width: 7rem;
}

.exposure-log__notes {
  resize: vertical;
}

.exposure-log__chip {
  cursor: pointer;
}

.exposure-log__check {
  display: flex;
  align-items: center;
  gap: var(--mg-space-2);
  color: var(--mg-color-ink);
  font-size: var(--mg-font-size-sm);
}
</style>
