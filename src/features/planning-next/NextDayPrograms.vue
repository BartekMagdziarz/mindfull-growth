<template>
  <!-- "Ścieżki" (2026-10-17, round 6): one block per ACTIVE path, the card's
       width, a 3-column grid two rows tall. Left, both rows: the path (title,
       the phase's name, the week/step dots — no numbers; the field opens the
       path, its label floats in on hover). Top middle + right: two
       ACTION tiles in the grammar of "Najbliżej" (centred icon field, title, a
       quiet line; the eyebrow lives in the tooltip) — the next step and
       "Zapisz moment", both lead into an exercise. Bottom
       middle + right: the week task — title left, its state as dots right. The
       dots are the day plan's marks (chart grammar). No fractions in text. The letter and the return live in "Najbliżej";
       paused paths show nothing here. -->
  <DsSurface
    v-if="isToday && rows.length"
    elevation="raised-sm"
    class="ndt-card next-day-paths"
    :aria-label="t('planning.today.wellness.programs')"
  >
    <header>
      <span>{{ t('planning.today.wellness.programs') }}</span>
    </header>
    <section
      v-for="row in rows"
      :key="row.id"
      class="ndpath"
      :class="{
        'ndpath--no-step': !row.step,
        'ndpath--no-moment': !row.moment,
        'ndpath--no-task': !row.task,
      }"
      :aria-label="row.title"
      data-testid="today-path-tile"
    >
      <!-- The path field opens the path view; the label floats in on hover, no space reserved. -->
      <RouterLink
        :to="detailRoute(row.slug)"
        class="ndpath__field ndpath__path"
        :aria-label="`${row.title} — ${t('planning.today.wellness.programsOpen')}`"
        data-testid="today-path-phase"
      >
        <span class="ndpath__title">
          <span class="ndt__lead" aria-hidden="true"><AppIcon :name="row.icon" /></span>
          <strong>{{ row.title }}</strong>
        </span>
        <span class="ndpath__phase">
          <span v-if="row.phase.title" class="ndpath__text">{{ row.phase.title }}</span>
          <span
            class="ndpath-dots"
            role="img"
            :aria-label="row.progressLabel"
            :title="row.progressLabel"
          >
            <i
              v-for="n in row.dots.total"
              :key="n"
              :class="{ 'is-done': n <= row.dots.done, 'is-current': n === row.dots.current }"
            />
          </span>
        </span>
        <span class="ndpath__open" aria-hidden="true">{{
          t('planning.today.wellness.programsOpen')
        }}</span>
      </RouterLink>

      <button
        v-if="row.step"
        type="button"
        class="ndpath__field ndpath__action ndpath__step"
        :title="row.step.what"
        :aria-label="
          t('planning.today.paths.ariaStep', { step: row.step.title, when: row.step.when })
        "
        data-testid="today-path-step"
        @click="row.step.launch()"
      >
        <span class="ndpath__glyph" aria-hidden="true"><AppIcon name="play_arrow" /></span>
        <span class="ndpath__text">{{ row.step.title }}</span>
        <span class="ndpath__when">{{ row.step.when }}</span>
      </button>

      <RouterLink
        v-if="row.moment"
        :to="row.moment.route"
        class="ndpath__field ndpath__action ndpath__moment"
        :title="row.moment.eyebrow"
        :aria-label="`${t('programs.ui.logMoment')} — ${row.moment.eyebrow}`"
        data-testid="today-path-moment"
      >
        <span class="ndpath__glyph" aria-hidden="true"><AppIcon name="add" /></span>
        <span class="ndpath__text">{{ t('programs.ui.logMoment') }}</span>
        <span class="ndpath__when">{{ t('planning.today.paths.momentWhen') }}</span>
      </RouterLink>

      <RouterLink
        v-if="row.task"
        :to="detailRoute(row.slug)"
        class="ndpath__field ndpath__action ndpath__task"
        :title="row.task.days"
        :aria-label="
          t('planning.today.paths.ariaTask', { title: row.task.title, days: row.task.days })
        "
        data-testid="today-path-task"
      >
        <span class="ndpath__task-text">
          <span class="ndpath__eyebrow">{{ t('planning.today.paths.task') }}</span>
          <span class="ndpath__text">{{ row.task.title }}</span>
        </span>
        <span class="ndpath-dots ndpath__task-dots" aria-hidden="true">
          <i v-for="n in row.task.target" :key="n" :class="{ 'is-done': n <= row.task.done }" />
        </span>
      </RouterLink>

      <p v-if="row.dose" class="ndpath__hint" data-testid="today-path-dose">
        {{ t('planning.today.paths.doseHint') }}
        <RouterLink :to="detailRoute(row.slug)" class="ndt-link">{{
          t('planning.today.paths.doseSee')
        }}</RouterLink>
      </p>
    </section>
    <MomentPickerDialog
      v-model="launcher.pickerOpen.value"
      :moments="launcher.pickerMoments.value"
      @pick="launcher.picked($event)"
    />
  </DsSurface>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, toRef, watch } from 'vue'
import { RouterLink, type RouteLocationRaw } from 'vue-router'
import AppIcon from '@/components/shared/AppIcon.vue'
import { useT } from '@/composables/useT'
import { getCatalogEntry } from '@/data/exerciseCatalog'
import { getProgramDefinition } from '@/data/programCatalog'
import type { DayRef } from '@/domain/period'
import type { ProgramDefinition, ProgramEnrollment } from '@/domain/program'
import { doseProposal } from '@/domain/programFollowUp'
import { DsSurface } from '@/design-system/components'
import MomentPickerDialog from '@/features/program-path/MomentPickerDialog.vue'
import {
  currentGroupIndex,
  groupState,
  pathGroups,
  stepItemState,
} from '@/features/program-path/pathModel'
import { useStepLauncher } from '@/features/program-path/useStepLauncher'
import { deriveStepStates, isPracticeItem } from '@/services/programSchedulerService'
import { weekTaskState } from '@/services/programWeekService'
import { useExercisePlanStore } from '@/stores/exercisePlan.store'
import { useMicroExerciseEntryStore } from '@/stores/microExerciseEntry.store'
import { useTodayStore } from '@/stores/today.store'
import { programStepTitle } from '@/utils/programStepTitle'
import { addDaysToDayRef, getPeriodRefsForDate } from '@/utils/periods'
import { useDayWellness } from './useDayWellness'

interface PathRow {
  id: string
  slug: string
  icon: string
  title: string
  /** The phase's title; '' for a path without phases (the dots alone carry the position). */
  phase: { title: string }
  /** Weeks (phased path) or steps (unphased): behind / the current one (1-based, 0 = none). */
  dots: { total: number; done: number; current: number }
  /** "tydzień 4 z 8" · "krok 7 z 15" — the dots' accessible name. */
  progressLabel: string
  step?: { title: string; what: string; when: string; launch: () => void }
  /** "Zapisz moment" with the moment variant's title as its eyebrow ("Moment wstydu"). */
  moment?: { route: RouteLocationRaw; eyebrow: string }
  task?: { title: string; done: number; target: number; days: string }
  dose: boolean
}

interface TaskState {
  title: string
  done: number
  target: number
}

const props = defineProps<{ dayRef: DayRef }>()
const { t, tp, locale } = useT()
const planStore = useExercisePlanStore()
const entryStore = useMicroExerciseEntryStore()
const todayStore = useTodayStore()
const launcher = useStepLauncher()
const { isToday, activeEnrollments, ensureLoaded } = useDayWellness(toRef(props, 'dayRef'))

onMounted(() => {
  void ensureLoaded()
  void entryStore.loadEntries()
})

/** This week's accepted task per enrollment (null = none), loaded asynchronously. */
const tasks = reactive<Record<string, TaskState | null>>({})

// Only open paths: the closed ones live in "Najbliżej" (letter, return) and the day plan; paused ones show nothing.
const openEnrollments = computed(() =>
  activeEnrollments.value.filter(enrollment => enrollment.status === 'active')
)

function detailRoute(slug: string): RouteLocationRaw {
  return { name: 'program-detail', params: { slug } }
}

/** "dziś" · "jutro" · "zaległy" · "wt 21 paź" — quiet, never rose: the plan row carries the alarm. */
function whenLabel(dayRef: DayRef): string {
  if (dayRef < props.dayRef) return t('planning.today.paths.overdue')
  if (dayRef === props.dayRef) return t('programs.ui.today')
  if (dayRef === addDaysToDayRef(props.dayRef, 1)) return t('programs.ui.tomorrow')
  return new Date(`${dayRef}T12:00:00`).toLocaleDateString(locale.value, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
}

function taskDays(done: number, target: number): string {
  return tp(
    target,
    'planning.today.paths.taskDays.one',
    'planning.today.paths.taskDays.few',
    'planning.today.paths.taskDays.many'
  ).replace('{done}', String(done))
}

function buildRow(enrollment: ProgramEnrollment, program: ProgramDefinition): PathRow {
  const groups = pathGroups(program)
  const states = deriveStepStates(program, enrollment)
  const weekGroups = groups.filter(group => group.week !== undefined)
  const currentIndex = currentGroupIndex(groups, states)
  const currentGroup = currentIndex >= 0 ? groups[currentIndex] : undefined

  // Position: weeks when the path has them, else the steps themselves.
  const phased = weekGroups.length > 0
  const stepNumber = Math.min(enrollment.currentStepIndex + 1, program.steps.length)
  const dots = phased
    ? {
        total: weekGroups.length,
        done: weekGroups.filter(group => groupState(group, states) === 'done').length,
        current: currentGroup?.week ?? 0,
      }
    : {
        total: program.steps.length,
        done: states.filter(state => stepItemState(state) === 'done').length,
        current: enrollment.currentStepIndex < program.steps.length ? stepNumber : 0,
      }
  const progressLabel = phased
    ? t('planning.today.wellness.programWeekProgress', {
        current: currentGroup?.week ?? dots.done,
        total: dots.total,
      })
    : t('planning.today.wellness.programStepProgress', { current: stepNumber, total: dots.total })
  const phase = {
    title: currentGroup?.phase
      ? t(`${program.i18nKey}.phases.${currentGroup.phase.key}.title`)
      : '',
  }

  // The next step: its pending plan item (due, overdue or ahead), else the current step by index.
  const own = planStore.pendingItems.filter(
    item => item.source === 'program' && item.sourceRef === enrollment.id
  )
  const stepItem = own.find(item => !isPracticeItem(item))
  const stepIndex = stepItem?.programStepIndex ?? enrollment.currentStepIndex
  const stepDef = program.steps[stepIndex]
  const stepDayRef =
    stepItem?.dayRef ?? (states[stepIndex]?.eligibleDay as DayRef | undefined) ?? props.dayRef
  const step = stepDef
    ? (() => {
        const entry = getCatalogEntry(stepDef.exerciseSlug)
        const catalogTitle = entry
          ? t(`exercises.cards.${entry.i18nKey}.title`)
          : stepDef.exerciseSlug
        return {
          title: programStepTitle(t, program.i18nKey, stepIndex, catalogTitle),
          what: stepDef.introKey ? t(stepDef.introKey) : '',
          when: whenLabel(stepDayRef),
          launch: () => void launcher.launch(program, stepIndex),
        }
      })()
    : undefined

  const momentEntry = program.momentKind
    ? getCatalogEntry(`moment-${program.momentKind}`)
    : undefined
  const moment = program.momentKind
    ? {
        route: `/exercises/micro/moment-${program.momentKind}`,
        eyebrow: momentEntry
          ? t(`exercises.cards.${momentEntry.i18nKey}.title`)
          : t('programs.ui.logMoment'),
      }
    : undefined
  const taskState = tasks[enrollment.id]
  const task = taskState
    ? { ...taskState, days: taskDays(taskState.done, taskState.target) }
    : undefined
  const dose = doseProposal(program, enrollment, entryStore.entries) !== null

  return {
    id: enrollment.id,
    slug: enrollment.programSlug,
    icon: program.icon ?? 'route',
    title: t(`${program.i18nKey}.title`),
    phase,
    dots,
    progressLabel,
    ...(step ? { step } : {}),
    ...(moment ? { moment } : {}),
    ...(task ? { task } : {}),
    dose,
  }
}

const rows = computed<PathRow[]>(() =>
  openEnrollments.value.flatMap(enrollment => {
    const program = getProgramDefinition(enrollment.programSlug)
    return program ? [buildRow(enrollment, program)] : []
  })
)

async function loadTask(enrollment: ProgramEnrollment, program: ProgramDefinition): Promise<void> {
  if (!program.weeklyTasks?.length) {
    tasks[enrollment.id] = null
    return
  }
  try {
    const state = await weekTaskState(
      program,
      enrollment,
      getPeriodRefsForDate(new Date(`${props.dayRef}T12:00:00`)).week
    )
    tasks[enrollment.id] = state.intention
      ? {
          title: state.intention.title,
          done: state.doneCount,
          target: state.intention.target.value ?? state.task?.times ?? 1,
        }
      : null
  } catch (err) {
    console.error('Failed to read the week task:', err)
    tasks[enrollment.id] = null
  }
}

// The task's counted days change with plan checks and with Moments (the bridge),
// so the state reloads with the enrollments, the Moments and the day bundle.
watch(
  () => [
    openEnrollments.value
      .map(
        enrollment =>
          `${enrollment.id}:${enrollment.currentStepIndex}:${enrollment.weekLog?.length ?? 0}`
      )
      .join('|'),
    entryStore.entries.length,
    todayStore.bundle,
    props.dayRef,
  ],
  () => {
    for (const enrollment of openEnrollments.value) {
      const program = getProgramDefinition(enrollment.programSlug)
      if (program) void loadTask(enrollment, program)
    }
  },
  { immediate: true }
)
</script>
