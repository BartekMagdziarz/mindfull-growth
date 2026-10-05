<template>
  <section class="mg-v2-surface mg-v2-surface--raised-sm pp-card" :aria-label="headLabel" data-testid="path-now">
    <header class="pp-card__head"><span>{{ headLabel }}</span></header>
    <div v-if="step" class="now">
      <span class="now__icon"><AppIcon :name="stepIcon" /></span>
      <span class="now__copy">
        <strong>{{ stepTitle }}</strong>
        <small v-if="note">{{ note }}</small>
      </span>
      <button
        v-if="mode === 'start'"
        type="button"
        class="mg-v2-button mg-v2-button--primary"
        :disabled="busy"
        @click="emit('enroll')"
      >
        {{ t('programs.ui.enroll') }}
      </button>
      <button
        v-else-if="mode !== 'paused'"
        type="button"
        class="mg-v2-button mg-v2-button--primary"
        :disabled="busy"
        @click="emit('start')"
      >
        {{ t('programs.ui.start') }}
      </button>
    </div>
    <p v-if="intro" class="now__intro">{{ intro }}</p>

    <div v-for="row in duePractices" :key="row.slug" class="pp-pr pp-pr--now">
      <AppIcon :name="row.icon" />
      <strong>{{ row.title }} <small>{{ row.when }}</small></strong>
      <button type="button" class="pp-chip" :disabled="mode === 'paused'" @click="router.push(row.route)">
        {{ t('programs.ui.open') }}
      </button>
    </div>

    <div v-if="momentRoute || responseEntry || letter" class="pp-chips">
      <RouterLink v-if="momentRoute" :to="momentRoute" class="pp-chip">
        <AppIcon name="add" />{{ t('programs.ui.logMoment') }}
      </RouterLink>
      <button
        v-if="responseEntry"
        type="button"
        class="pp-chip"
        :class="{ 'is-active': responseOpen }"
        :aria-expanded="responseOpen"
        @click="responseOpen = !responseOpen"
      >
        <AppIcon name="mg-exercise-shame-response" />{{ t('programs.ui.myPlan') }}
      </button>
      <button
        v-if="letter"
        type="button"
        class="pp-chip"
        :class="{ 'is-active': letterOpen }"
        :aria-expanded="letterOpen"
        @click="letterOpen = !letterOpen"
      >
        <AppIcon name="mg-exercise-letter-to-future-self" />{{ t('programs.ui.letterFromYou') }}
      </button>
    </div>
    <div v-if="responseOpen && responseEntry" class="pp-quote" data-testid="path-response">
      <p v-if="responseText('unblendSentence')"><em>„{{ responseText('unblendSentence') }}”</em></p>
      <p v-if="responseText('sentence')"><em>„{{ responseText('sentence') }}”</em></p>
      <p v-if="responseMoves">{{ responseMoves }}</p>
      <RouterLink v-if="momentRoute" :to="momentRoute" class="pp-chip">{{ t('programs.ui.saveAsMoment') }}</RouterLink>
    </div>
    <div v-if="letterOpen && letter" class="pp-quote">
      <p><em>„{{ letter }}”</em></p>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import AppIcon from '@/components/shared/AppIcon.vue'
import { useT } from '@/composables/useT'
import { getCatalogEntry } from '@/data/exerciseCatalog'
import type { MicroExerciseEntry } from '@/domain/microExercises'
import type { DayRef } from '@/domain/period'
import type { ProgramDefinition, ProgramEnrollment, ProgramStep } from '@/domain/program'
import { derivePracticeStates } from '@/services/programSchedulerService'
import { useExercisePlanStore } from '@/stores/exercisePlan.store'
import { getPeriodRefsForDate } from '@/utils/periods'

/**
 * "Teraz" — the one card with a filled button: the current step (title, its
 * intro, Rozpocznij), the practice due today, and at most three chips:
 * Zapisz moment, Mój plan (the shame-response sentences and moves) and, on
 * the return, List od Ciebie. Paused: "Gdy wrócisz" without the button.
 */
export type PathNowMode = 'start' | 'active' | 'paused' | 'return'

const props = defineProps<{
  program: ProgramDefinition
  enrollment?: ProgramEnrollment
  mode: PathNowMode
  step?: ProgramStep
  stepTitle: string
  /** The step's intro sentence(s), already translated. */
  intro?: string
  /** "dziś" · "jutro" · a date · "zaległe" · "czeka na Twój powrót". */
  note?: string
  busy?: boolean
  /** Latest "Plan na trudną chwilę" entry (shame path) for the Mój plan chip. */
  responseEntry?: MicroExerciseEntry
  /** The letter to a future self, once the path is closed. */
  letter?: string
}>()
const emit = defineEmits<{ start: []; enroll: [] }>()

const router = useRouter()
const { t, tg, locale } = useT()
const planStore = useExercisePlanStore()
const responseOpen = ref(false)
const letterOpen = ref(false)

const headLabel = computed(() =>
  props.mode === 'paused' ? t('programs.ui.nowPaused') : props.mode === 'return' ? t('programs.ui.nowReturn') : t('programs.ui.nowTitle'),
)
const stepIcon = computed(() => (props.step && getCatalogEntry(props.step.exerciseSlug)?.icon) || props.program.icon)
const momentRoute = computed(() => (props.program.momentKind && props.mode !== 'start' ? `/exercises/micro/moment-${props.program.momentKind}` : null))

const todayRef = computed<DayRef>(() => getPeriodRefsForDate(new Date()).day)
const duePractices = computed(() => {
  if (!props.enrollment || props.mode === 'start' || props.mode === 'return') return []
  return derivePracticeStates(props.program, props.enrollment, planStore.items)
    .filter(({ state, pendingItem }) => state === 'active' && pendingItem && pendingItem.dayRef <= todayRef.value)
    .map(({ practice, pendingItem }) => {
      const entry = getCatalogEntry(practice.exerciseSlug)
      return {
        slug: practice.exerciseSlug,
        icon: entry?.icon ?? 'repeat',
        title: entry ? t(`exercises.cards.${entry.i18nKey}.title`) : practice.exerciseSlug,
        route: entry?.route ?? '/exercises',
        when:
          pendingItem!.dayRef < todayRef.value
            ? t('programs.ui.practiceOverdue', { date: new Date(`${pendingItem!.dayRef}T12:00:00`).toLocaleDateString(locale.value, { day: 'numeric', month: 'short' }) })
            : t('programs.ui.practiceToday'),
      }
    })
})

function responseText(step: string): string {
  const value = props.responseEntry?.responses[step]
  return typeof value === 'string' ? value.trim() : ''
}
const responseMoves = computed(() => {
  const moves = props.responseEntry?.responses.move
  if (!Array.isArray(moves)) return ''
  return moves
    .filter((move): move is string => typeof move === 'string')
    .map((move) => tg(`exerciseWizards.micro.shameResponse.move.options.${move}`))
    .filter((label) => !label.startsWith('exerciseWizards.'))
    .join(' · ')
})
</script>

<style scoped>
.now {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: var(--mg-space-3);
  align-items: center;
}
.now__icon {
  display: grid;
  place-items: center;
  width: 2.6rem;
  height: 2.6rem;
  border-radius: var(--mg-radius-icon-field-b);
  background: var(--mg-color-sky-well);
  color: var(--mg-color-primary-strong);
}
.now__icon .material-symbols-outlined {
  font-size: 24px;
}
.now__copy {
  display: grid;
  gap: 2px;
  min-width: 0;
}
.now__copy strong {
  font-size: var(--mg-font-size-md);
  font-weight: 800;
  line-height: 1.3;
}
.now__copy small {
  color: var(--mg-color-muted);
  font-size: var(--mg-font-size-xs);
  font-weight: 700;
}
.now__intro {
  margin: var(--mg-space-3) 0 0;
  color: var(--mg-color-muted);
  font-size: var(--mg-font-size-sm);
  line-height: 1.5;
}
</style>
