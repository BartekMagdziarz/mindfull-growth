<template>
  <article class="dz-card neo-raised flex flex-col gap-[10px] p-3">
    <header class="dz-card__head">
      <button
        type="button"
        class="dz-card__label"
        @click="router.push('/exercises')"
      >
        {{ t('planning.today.wellness.exercises') }}
      </button>
    </header>

    <!-- Done (any visible day): completions exist for that day -->
    <div v-if="dayCount > 0" class="dz-cta">
      <button
        type="button"
        class="dz-slot dz-slot--filled neo-focus"
        :aria-label="t('planning.today.wellness.ariaExerciseDone')"
        @click="router.push('/exercises')"
      >
        <svg
          width="32" height="32" viewBox="0 0 24 24"
          fill="none" stroke="white" stroke-width="3"
          stroke-linecap="round" stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="M5 12l5 5 9-11" />
        </svg>
      </button>
      <p class="dz-caption">
        {{
          tp(
            dayCount,
            'planning.today.wellness.exerciseDoneCount.one',
            'planning.today.wellness.exerciseDoneCount.few',
            'planning.today.wellness.exerciseDoneCount.many',
          )
        }}
      </p>
    </div>

    <!-- Today, nothing done yet: deterministic suggestion -->
    <div v-else-if="isToday && suggestion" class="dz-cta">
      <button
        type="button"
        class="dz-slot dz-slot--empty neo-focus"
        :aria-label="t('planning.today.wellness.ariaExerciseStart')"
        @click="router.push(suggestion.route)"
      >
        <AppIcon :name="suggestion.icon" class="text-[30px]" />
      </button>
      <p class="dz-title">{{ t(`exercises.cards.${suggestion.i18nKey}.title`) }}</p>
      <p class="dz-caption">
        {{ t('planning.today.wellness.exerciseMinutes', { n: suggestion.estimatedMinutes }) }}
      </p>
      <button type="button" class="dz-another neo-focus" @click="showAnother()">
        {{ t('planning.today.wellness.exerciseShowAnother') }}
      </button>
    </div>

    <!-- Historical day without completions: record only, no CTA -->
    <div v-else class="dz-cta">
      <div class="dz-slot dz-slot--muted" aria-hidden="true">
        <span class="text-xl text-on-surface-variant/50">—</span>
      </div>
      <p class="dz-caption">{{ t('planning.today.wellness.exerciseNoneHistorical') }}</p>
    </div>
  </article>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import AppIcon from '@/components/shared/AppIcon.vue'
import { useT } from '@/composables/useT'
import type { ExerciseCompletion } from '@/domain/exerciseCompletion'
import type { DayRef } from '@/domain/period'
import { suggestExercise, suggestionPoolSize } from '@/services/exerciseSuggestion'

const props = defineProps<{
  /** The visible day (bundle day), not necessarily today. */
  dayRef: DayRef
  isToday: boolean
  /** Full completion log — the ranking needs cross-day history. */
  completions: ExerciseCompletion[]
  /** Completions on the visible day. */
  dayCount: number
}>()

const router = useRouter()
const { t, tp } = useT()

// "Pokaż inne" walks the ranked pool; reset when the visible day changes.
const offset = ref(0)
watch(
  () => props.dayRef,
  () => {
    offset.value = 0
  },
)

const suggestion = computed(() =>
  suggestExercise(props.dayRef, props.completions, offset.value),
)

function showAnother(): void {
  const poolSize = suggestionPoolSize(props.dayRef, props.completions)
  if (poolSize > 0) {
    offset.value = (offset.value + 1) % poolSize
  }
}
</script>

<style scoped>
.dz-card {
  border-radius: 1.4rem;
}

.dz-card__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 22px;
}

.dz-card__label {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.10em;
  text-transform: uppercase;
  color: rgb(var(--neo-muted));
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  transition: color 200ms ease;
}
.dz-card__label:hover {
  color: rgb(var(--color-primary));
}

.dz-cta {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 4px 0 2px;
}

.dz-slot {
  width: 88px;
  height: 88px;
  border-radius: 9999px;
  display: grid;
  place-items: center;
  flex: 0 0 auto;
  transition: transform 200ms ease, box-shadow 200ms ease, border-color 200ms ease, background 200ms ease;
}
button.dz-slot {
  cursor: pointer;
}

.dz-slot--empty {
  background: linear-gradient(145deg, rgb(var(--neo-surface-top)), rgb(var(--neo-surface-bottom)));
  border: 1px dashed rgb(var(--color-primary) / 0.55);
  box-shadow:
    -5px -5px 10px rgb(var(--neo-shadow-light) / 0.85),
    5px 5px 10px rgb(var(--neo-shadow-dark) / 0.30);
  color: rgb(var(--color-primary-strong));
}
.dz-slot--empty:hover {
  border-color: rgb(var(--color-primary));
  transform: translateY(-1px);
  box-shadow:
    -6px -6px 12px rgb(var(--neo-shadow-light) / 0.9),
    6px 6px 12px rgb(var(--neo-shadow-dark) / 0.34);
}

.dz-slot--filled {
  background: linear-gradient(145deg, rgb(var(--color-primary)), rgb(var(--color-primary-strong)));
  border: 1px solid rgb(var(--color-primary-strong) / 0.45);
  box-shadow:
    -5px -5px 10px rgb(var(--neo-shadow-light) / 0.7),
    5px 5px 10px rgb(var(--neo-shadow-dark) / 0.35),
    inset 0 1px 0 rgb(255 255 255 / 0.25);
  color: white;
}
.dz-slot--filled:hover {
  transform: translateY(-1px);
  box-shadow:
    -6px -6px 12px rgb(var(--neo-shadow-light) / 0.75),
    6px 6px 12px rgb(var(--neo-shadow-dark) / 0.38),
    inset 0 1px 0 rgb(255 255 255 / 0.3);
}
.dz-slot:active {
  transform: translateY(0);
}

.dz-slot--muted {
  background: linear-gradient(145deg, rgb(var(--neo-surface-top)), rgb(var(--neo-surface-bottom)));
  border: 1px dashed rgb(var(--neo-muted) / 0.3);
  box-shadow:
    inset -1px -1px 2px rgb(var(--neo-inset-light) / 0.6),
    inset 1px 1px 2px rgb(var(--neo-inset-dark) / 0.2);
}

.dz-title {
  font-size: 12px;
  font-weight: 600;
  line-height: 1.25;
  text-align: center;
  color: rgb(var(--color-on-surface));
  margin-top: 6px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.dz-caption {
  font-size: 11px;
  letter-spacing: 0.04em;
  text-align: center;
  color: rgb(var(--neo-muted));
}

.dz-another {
  font-size: 11px;
  font-weight: 500;
  color: rgb(var(--color-primary-strong));
  background: none;
  border: none;
  padding: 2px 4px;
  cursor: pointer;
  margin-top: 2px;
  transition: color 200ms ease;
}
.dz-another:hover {
  color: rgb(var(--color-primary));
}
</style>
