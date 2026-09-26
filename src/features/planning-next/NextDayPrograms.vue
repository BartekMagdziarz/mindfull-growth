<template>
  <!-- Repeats and programs are actions of the current day only; each card exists only
       when it has something to show. Same anatomy as „Najbliżej”: quiet header, rows
       with an accent icon, title + context, date on the right, hairline separators. -->
  <template v-if="isToday">
    <DsSurface
      v-if="repeatRows.length"
      elevation="raised-sm"
      class="next-day-exercises"
      :aria-label="t('planning.today.wellness.plannedExercises')"
    >
      <header>
        <span>{{ t('planning.today.wellness.plannedExercises') }}</span>
      </header>
      <div class="next-day-exercises__list">
        <div v-for="row in repeatRows" :key="row.id" class="next-day-exercises__row" :class="{ 'is-overdue': row.overdue }">
          <button type="button" class="next-day-exercises__main" :aria-label="row.title" @click="router.push(row.route)">
            <span class="next-day-exercises__icon"><AppIcon :name="row.icon" /></span>
            <span class="next-day-exercises__copy">
              <strong>{{ row.title }}</strong>
              <span class="next-day-exercises__context">{{ row.context }}</span>
            </span>
          </button>
          <span class="next-day-exercises__tray" :aria-label="t('planning.today.wellness.ariaPlannedActions')">
            <button
              type="button"
              class="mg-v2-button mg-v2-button--icon-sm mg-v2-button--quiet"
              :title="t('planning.today.wellness.plannedMoveTomorrow')"
              :aria-label="`${t('planning.today.wellness.plannedMoveTomorrow')}: ${row.title}`"
              @click="moveToTomorrow(row.id)"
            >
              <AppIcon name="redo" />
            </button>
            <button
              type="button"
              class="mg-v2-button mg-v2-button--icon-sm mg-v2-button--quiet"
              :title="t('planning.today.wellness.plannedPickDate')"
              :aria-label="`${t('planning.today.wellness.plannedPickDate')}: ${row.title}`"
              @click="openDatePicker(row.id)"
            >
              <AppIcon name="edit_calendar" />
            </button>
            <button
              type="button"
              class="mg-v2-button mg-v2-button--icon-sm mg-v2-button--quiet"
              :title="t('planning.today.wellness.plannedSkip')"
              :aria-label="`${t('planning.today.wellness.plannedSkip')}: ${row.title}`"
              @click="skip(row.id)"
            >
              <AppIcon name="close" />
            </button>
          </span>
        </div>
      </div>
      <input
        ref="dateInputRef"
        type="date"
        class="next-day-exercises__date"
        :min="minMoveDate"
        tabindex="-1"
        aria-hidden="true"
        @change="handleDateChange"
      />
    </DsSurface>

    <DsSurface
      v-if="programGroups.length"
      elevation="raised-sm"
      class="next-day-exercises"
      :aria-label="t('planning.today.wellness.programs')"
    >
      <header>
        <span>{{ t('planning.today.wellness.programs') }}</span>
      </header>
      <div class="next-day-exercises__list">
        <div v-for="group in programGroups" :key="group.id" class="next-day-exercises__group">
          <button
            type="button"
            class="next-day-exercises__row next-day-exercises__main"
            :aria-label="`${t('planning.today.wellness.ariaProgramOpen')}: ${group.title}`"
            @click="router.push({ name: 'program-detail', params: { slug: group.slug } })"
          >
            <span class="next-day-exercises__icon"><AppIcon :name="group.icon" /></span>
            <span class="next-day-exercises__copy">
              <strong>{{ group.title }}</strong>
              <span class="next-day-exercises__context">{{ group.context }}</span>
            </span>
          </button>
          <button
            v-for="action in group.actions"
            :key="action.id"
            type="button"
            class="next-day-exercises__row next-day-exercises__main next-day-exercises__row--child"
            :class="{ 'is-overdue': action.overdue }"
            :aria-label="`${action.kind}: ${action.title}`"
            @click="router.push(action.route)"
          >
            <span class="next-day-exercises__icon"><AppIcon :name="action.icon" /></span>
            <span class="next-day-exercises__copy">
              <strong>{{ action.title }}</strong>
              <span class="next-day-exercises__context">{{ action.kind }}</span>
            </span>
            <em>{{ action.dateLabel }}</em>
          </button>
        </div>
      </div>
    </DsSurface>
  </template>
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
import { DsSurface } from '@/design-system/components'
import { isPracticeItem } from '@/services/programSchedulerService'
import { useExercisePlanStore } from '@/stores/exercisePlan.store'
import { addDaysToDayRef } from '@/utils/periods'
import { useDayWellness } from './useDayWellness'

const props = defineProps<{ dayRef: DayRef }>()
const router = useRouter()
const { t, locale } = useT()
const planStore = useExercisePlanStore()
const { isToday, duePlanItems, activeEnrollments, ensureLoaded } = useDayWellness(toRef(props, 'dayRef'))

const dateInputRef = ref<HTMLInputElement | null>(null)
const datePickFor = ref<string | null>(null)
const minMoveDate = computed(() => addDaysToDayRef(props.dayRef, 1))

onMounted(() => void ensureLoaded())

function formatDay(dayRef: DayRef): string {
  return new Date(`${dayRef}T12:00:00`).toLocaleDateString(locale.value, { day: 'numeric', month: 'short' })
}

function dueLabel(item: ExercisePlanItem): string {
  return item.dayRef < props.dayRef
    ? t('planning.today.wellness.plannedOverdueSince', { date: formatDay(item.dayRef) })
    : t('planning.today.wellness.plannedForToday')
}

function entryFor(slug: string) {
  const entry = getCatalogEntry(slug)
  return {
    icon: entry?.icon ?? 'repeat',
    route: entry?.route ?? '/exercises',
    title: entry ? t(`exercises.cards.${entry.i18nKey}.title`) : slug,
  }
}

/** Repeats only — program steps and practices live in the paths card. */
const repeatRows = computed(() =>
  duePlanItems.value
    .filter((item) => item.source !== 'program')
    .map((item) => ({
      id: item.id,
      ...entryFor(item.exerciseSlug),
      overdue: item.dayRef < props.dayRef,
      context: dueLabel(item),
    })),
)

/** One group per active path: the path row, then today's due step and practices. */
const programGroups = computed(() =>
  activeEnrollments.value.map((enrollment) => {
    const program = getProgramDefinition(enrollment.programSlug)
    const own = planStore.pendingItems.filter(
      (item) => item.source === 'program' && item.sourceRef === enrollment.id,
    )
    const step = own.find((item) => !isPracticeItem(item))
    const stepDue = Boolean(step && step.dayRef <= props.dayRef)
    const total = program?.steps.length ?? 0
    const context = [
      t('planning.today.wellness.programStepProgress', {
        current: Math.min(enrollment.currentStepIndex + 1, total),
        total,
      }),
      step && !stepDue ? t('planning.today.wellness.programFrom', { date: formatDay(step.dayRef) }) : '',
    ]
      .filter(Boolean)
      .join(' · ')
    const due = own
      .filter((item) => item.dayRef <= props.dayRef)
      .sort((a, b) => Number(isPracticeItem(a)) - Number(isPracticeItem(b)))
    return {
      id: enrollment.id,
      slug: enrollment.programSlug,
      icon: program?.icon ?? 'route',
      title: program ? t(`${program.i18nKey}.title`) : enrollment.programSlug,
      context,
      actions: due.map((item) => ({
        id: item.id,
        ...entryFor(item.exerciseSlug),
        kind: isPracticeItem(item)
          ? t('planning.today.wellness.programPractice')
          : t('planning.today.wellness.programStepLabel', { n: enrollment.currentStepIndex + 1 }),
        overdue: item.dayRef < props.dayRef,
        dateLabel: item.dayRef < props.dayRef ? formatDay(item.dayRef) : t('planning.today.wellness.plannedForToday'),
      })),
    }
  }),
)

function moveToTomorrow(id: string): void {
  void planStore.movePlan(id, addDaysToDayRef(props.dayRef, 1)).catch((err) => {
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
    void planStore.movePlan(datePickFor.value, input.value as DayRef).catch((err) => {
      console.error('Failed to move exercise plan:', err)
    })
  }
  input.value = ''
  datePickFor.value = null
}

function skip(id: string): void {
  void planStore.skipPlan(id).catch((err) => {
    console.error('Failed to skip exercise plan:', err)
  })
}
</script>
