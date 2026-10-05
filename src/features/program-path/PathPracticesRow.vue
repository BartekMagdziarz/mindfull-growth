<template>
  <details v-if="rows.length" class="pp-row" data-testid="path-practices">
    <summary class="pp-row__head">
      <span class="pp-row__eyebrow">{{ t('programs.ui.practicesRow') }}</span>
      <span class="pp-row__text">
        <template v-for="(row, i) in rows" :key="row.slug">
          <template v-if="i > 0"> · </template>{{ row.title }} <small v-if="row.when">{{ row.when }}</small>
        </template>
      </span>
      <span />
      <AppIcon name="expand_more" />
    </summary>
    <div class="pp-row__body">
      <div v-for="row in rows" :key="row.slug" class="pp-pr">
        <AppIcon :name="row.icon" />
        <strong>{{ row.title }}</strong>
        <button
          v-if="row.canStart"
          type="button"
          class="pp-chip"
          :disabled="enrollment.status === 'paused'"
          @click="router.push(row.route)"
        >
          {{ t('programs.ui.open') }}
        </button>
      </div>
      <div class="pp-days" :aria-label="t('programs.ui.practiceDays')">
        <span v-for="day in days" :key="day.ref" class="pp-days__day" :title="`${day.name}: ${day.done ? t('programs.ui.practiceDone') : t('programs.ui.practiceNone')}`">
          <i class="mg-well pp-well pp-well--sm" :class="{ 'mg-well--done': day.done, 'pp-well--today': day.today }" />
          <small>{{ day.letter }}</small>
        </span>
      </div>
    </div>
  </details>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import AppIcon from '@/components/shared/AppIcon.vue'
import { useT } from '@/composables/useT'
import { getCatalogEntry } from '@/data/exerciseCatalog'
import type { DayRef } from '@/domain/period'
import type { ProgramDefinition, ProgramEnrollment } from '@/domain/program'
import { derivePracticeStates } from '@/services/programSchedulerService'
import { useExerciseCompletionsStore } from '@/stores/exerciseCompletions.store'
import { useExercisePlanStore } from '@/stores/exercisePlan.store'
import { formatDayShort } from '@/utils/periodLabels'
import { addDaysToDayRef, getPeriodBounds, getPeriodRefsForDate } from '@/utils/periods'

/**
 * "Praktyki" — the open week's row: the running practices with "dziś /
 * jutro / a date" in the summary, each with its icon and an "Otwórz" when
 * due, and the week's seven days as small wells (done = any practice of
 * the path recorded that day). Rhythm, intro and schedule copy stay off.
 */
const props = defineProps<{
  program: ProgramDefinition
  enrollment: ProgramEnrollment
}>()

const router = useRouter()
const { t, locale } = useT()
const planStore = useExercisePlanStore()
const completionsStore = useExerciseCompletionsStore()

onMounted(() => void completionsStore.ensureLoaded())

const todayRef = computed<DayRef>(() => getPeriodRefsForDate(new Date()).day)
const tomorrowRef = computed(() => addDaysToDayRef(todayRef.value, 1))
const states = computed(() =>
  derivePracticeStates(props.program, props.enrollment, planStore.items).filter((state) => state.state === 'active'),
)

const rows = computed(() =>
  states.value.map(({ practice, pendingItem }) => {
    const entry = getCatalogEntry(practice.exerciseSlug)
    const due = Boolean(pendingItem && pendingItem.dayRef <= todayRef.value)
    let when = ''
    if (pendingItem) {
      if (pendingItem.dayRef < todayRef.value) when = t('programs.ui.overdue')
      else if (pendingItem.dayRef === todayRef.value) when = t('programs.ui.today')
      else if (pendingItem.dayRef === tomorrowRef.value) when = t('programs.ui.tomorrow')
      else when = formatDayShort(pendingItem.dayRef, locale.value)
    }
    return {
      slug: practice.exerciseSlug,
      icon: entry?.icon ?? 'repeat',
      title: entry ? t(`exercises.cards.${entry.i18nKey}.title`) : practice.exerciseSlug,
      route: entry?.route ?? '/exercises',
      when,
      // Only a due occurrence: completing a future one early would not tick it.
      canStart: due && Boolean(entry),
    }
  }),
)

const practiceSlugs = computed(() => (props.program.practices ?? []).map((practice) => practice.exerciseSlug))
const days = computed(() => {
  const { start } = getPeriodBounds(getPeriodRefsForDate(new Date()).week)
  return Array.from({ length: 7 }, (_, i) => {
    const ref = addDaysToDayRef(start as DayRef, i)
    const date = new Date(`${ref}T12:00:00`)
    const done = completionsStore
      .completionsForDay(ref)
      .some((completion) => practiceSlugs.value.includes(completion.exerciseSlug))
    return {
      ref,
      letter: date.toLocaleDateString(locale.value, { weekday: 'narrow' }).toLocaleLowerCase(locale.value),
      name: date.toLocaleDateString(locale.value, { weekday: 'long' }),
      done,
      today: ref === todayRef.value,
    }
  })
})
</script>
