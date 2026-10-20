<template>
  <!-- "Praktyki": the day's exercises as ordinary rows of the day plan (Lab
       /concepts/today-tiles, round 2) — repeats, path steps and path practices
       that are due today or overdue, plus the ones finished today. Lead icon,
       title, the well on the right: a play glyph launches the exercise, its
       completion fills the well (plan items auto-complete, never by hand).
       The reschedule tray sits right after the title, on hover. -->
  <section
    v-if="rows.length"
    class="next-day-rail__group next-day-practices"
    :aria-label="t('planning.today.practices.title')"
    data-testid="today-practices"
  >
    <header>
      <span>{{ t('planning.today.practices.title') }}</span>
    </header>
    <div
      v-for="row in rows"
      :key="row.id"
      class="ndp"
      :class="{ 'ndp--done': row.done, 'ndp--overdue': row.overdue, [`ndp--${row.kind}`]: true }"
      :data-testid="`today-practice-${row.kind}`"
    >
      <div class="ndp__main">
        <span class="ndp__lead" aria-hidden="true"><AppIcon :name="row.icon" /></span>
        <div class="ndp__title">
          <button
            type="button"
            class="ndp__label"
            :title="row.context"
            :aria-label="`${t('planning.today.practices.open')}: ${row.title}`"
            @click="row.launch()"
          >
            <strong>{{ row.title }}</strong>
            <small v-if="row.overdue && !row.done" class="ndp__late">{{
              t('planning.today.practices.overdue')
            }}</small>
          </button>
          <span
            v-if="!row.done"
            class="ndp__tray"
            role="group"
            :aria-label="`${t('planning.today.wellness.ariaPlannedActions')}: ${row.title}`"
            @click.stop
          >
            <button
              type="button"
              :title="t('planning.today.wellness.plannedMoveTomorrow')"
              :aria-label="`${t('planning.today.wellness.plannedMoveTomorrow')}: ${row.title}`"
              @click="moveToTomorrow(row.id)"
            >
              <AppIcon name="redo" />
            </button>
            <button
              type="button"
              :title="t('planning.today.wellness.plannedPickDate')"
              :aria-label="`${t('planning.today.wellness.plannedPickDate')}: ${row.title}`"
              @click="openDatePicker(row.id)"
            >
              <AppIcon name="edit_calendar" />
            </button>
            <button
              type="button"
              :title="t('planning.today.wellness.plannedSkip')"
              :aria-label="`${t('planning.today.wellness.plannedSkip')}: ${row.title}`"
              @click="skip(row.id)"
            >
              <AppIcon name="close" />
            </button>
          </span>
        </div>
      </div>
      <button
        type="button"
        class="mg-well ndp__well"
        :class="{ 'mg-well--done': row.done }"
        :disabled="row.done"
        :title="row.done ? t('planning.today.practices.done') : t('planning.today.practices.start')"
        :aria-label="`${row.done ? t('planning.today.practices.done') : t('planning.today.practices.start')}: ${row.title}`"
        @click="row.launch()"
      >
        <AppIcon v-if="!row.done" name="play_arrow" />
      </button>
    </div>
    <input
      ref="dateInputRef"
      type="date"
      class="next-day-practices__date"
      :min="minMoveDate"
      tabindex="-1"
      aria-hidden="true"
      @change="handleDateChange"
    />
    <MomentPickerDialog
      v-model="launcher.pickerOpen.value"
      :moments="launcher.pickerMoments.value"
      @pick="launcher.picked($event)"
    />
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, toRef } from 'vue'
import { useRouter } from 'vue-router'
import AppIcon from '@/components/shared/AppIcon.vue'
import { useT } from '@/composables/useT'
import { getCatalogEntry } from '@/data/exerciseCatalog'
import { getProgramDefinition } from '@/data/programCatalog'
import type { ExercisePlanItem } from '@/domain/exercisePlan'
import type { DayRef } from '@/domain/period'
import MomentPickerDialog from '@/features/program-path/MomentPickerDialog.vue'
import { useStepLauncher } from '@/features/program-path/useStepLauncher'
import { isPracticeItem } from '@/services/programSchedulerService'
import { useExerciseCompletionsStore } from '@/stores/exerciseCompletions.store'
import { useExercisePlanStore } from '@/stores/exercisePlan.store'
import { useProgramEnrollmentStore } from '@/stores/programEnrollment.store'
import { programStepTitle } from '@/utils/programStepTitle'
import { addDaysToDayRef } from '@/utils/periods'
import { useDayWellness } from './useDayWellness'

type PracticeRowKind = 'step' | 'practice' | 'repeat'

interface PracticeRow {
  id: string
  kind: PracticeRowKind
  icon: string
  title: string
  /** Tooltip: the path the row belongs to, and for a step its "co" sentence. */
  context: string
  overdue: boolean
  done: boolean
  launch: () => void
}

const props = defineProps<{ dayRef: DayRef; collapseCompleted?: boolean }>()
const router = useRouter()
const { t } = useT()
const planStore = useExercisePlanStore()
const completionsStore = useExerciseCompletionsStore()
const enrollmentStore = useProgramEnrollmentStore()
const launcher = useStepLauncher()
const { isToday, duePlanItems, ensureLoaded } = useDayWellness(toRef(props, 'dayRef'))

const dateInputRef = ref<HTMLInputElement | null>(null)
const datePickFor = ref<string | null>(null)
const minMoveDate = computed(() => addDaysToDayRef(props.dayRef, 1))

onMounted(() => void ensureLoaded())

const KIND_ORDER: Record<PracticeRowKind, number> = { step: 0, practice: 1, repeat: 2 }

function kindOf(item: ExercisePlanItem): PracticeRowKind {
  if (item.source !== 'program') return 'repeat'
  return isPracticeItem(item) ? 'practice' : 'step'
}

function toRow(item: ExercisePlanItem, done: boolean): PracticeRow {
  const kind = kindOf(item)
  const entry = getCatalogEntry(item.exerciseSlug)
  const catalogTitle = entry ? t(`exercises.cards.${entry.i18nKey}.title`) : item.exerciseSlug
  const enrollment =
    item.source === 'program'
      ? enrollmentStore.enrollments.find(candidate => candidate.id === item.sourceRef)
      : undefined
  const program = enrollment ? getProgramDefinition(enrollment.programSlug) : undefined
  const programTitle = program ? t(`${program.i18nKey}.title`) : ''
  const stepIndex =
    kind === 'step' ? (item.programStepIndex ?? enrollment?.currentStepIndex) : undefined
  const step = program && stepIndex !== undefined ? program.steps[stepIndex] : undefined
  const title =
    kind === 'step' ? programStepTitle(t, program?.i18nKey, stepIndex, catalogTitle) : catalogTitle
  const context = [programTitle, step?.introKey ? t(step.introKey) : ''].filter(Boolean).join(' · ')
  const route = entry?.route ?? '/exercises'
  return {
    id: item.id,
    kind,
    icon: entry?.icon ?? 'repeat',
    title,
    context,
    overdue: item.dayRef < props.dayRef,
    done,
    launch: () => {
      if (done) return
      if (kind === 'step' && program && stepIndex !== undefined)
        void launcher.launch(program, stepIndex)
      else void router.push(route)
    },
  }
}

/** Finished today: a done plan item whose result record has a completion on this day. */
const doneToday = computed<ExercisePlanItem[]>(() => {
  const recordIds = new Set(
    completionsStore.completionsForDay(props.dayRef).map(completion => completion.recordId)
  )
  return planStore.items.filter(
    item => item.status === 'done' && item.recordId !== undefined && recordIds.has(item.recordId)
  )
})

/** Overdue first, then steps before practices before repeats; the finished ones last (unless folded away). */
const rows = computed<PracticeRow[]>(() => {
  if (!isToday.value) return []
  const pending = duePlanItems.value
    .map(item => toRow(item, false))
    .sort(
      (a, b) => Number(b.overdue) - Number(a.overdue) || KIND_ORDER[a.kind] - KIND_ORDER[b.kind]
    )
  const done = props.collapseCompleted ? [] : doneToday.value.map(item => toRow(item, true))
  return [...pending, ...done]
})

function moveToTomorrow(id: string): void {
  void planStore.movePlan(id, addDaysToDayRef(props.dayRef, 1)).catch(err => {
    console.error('Failed to move exercise plan:', err)
  })
}

function openDatePicker(id: string): void {
  datePickFor.value = id
  dateInputRef.value?.showPicker()
}

function handleDateChange(event: Event): void {
  const input = event.target as HTMLInputElement
  if (input.value && datePickFor.value) {
    void planStore.movePlan(datePickFor.value, input.value as DayRef).catch(err => {
      console.error('Failed to move exercise plan:', err)
    })
  }
  input.value = ''
  datePickFor.value = null
}

function skip(id: string): void {
  void planStore.skipPlan(id).catch(err => {
    console.error('Failed to skip exercise plan:', err)
  })
}
</script>
