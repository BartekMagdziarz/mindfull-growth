<template>
  <section v-if="states.length" class="practice-rail" :aria-label="t('programs.ui.practicesTitle')">
    <div class="mg-v2-section-head">
      <h2>{{ t('programs.ui.practicesTitle') }}</h2>
    </div>
    <p class="practice-rail__lead">{{ t('programs.ui.practicesLead') }}</p>
    <ul class="practice-rail__list">
      <li
        v-for="row in rows"
        :key="row.slug"
        class="mg-v2-surface mg-v2-surface--raised-sm practice-rail__row"
        :class="{ 'is-quiet': row.state !== 'active' }"
      >
        <span class="mg-v2-icon-board mg-v2-icon-board--sm" aria-hidden="true">
          <AppIcon :name="row.icon" />
        </span>
        <div class="practice-rail__body">
          <h3 class="practice-rail__title">{{ row.title }}</h3>
          <p class="mg-v2-meta">
            <span>{{ row.rhythm }}</span>
            <span :class="{ 'mg-v2-meta__status': row.due && !row.overdue, 'mg-v2-meta__bad': row.overdue }">{{ row.status }}</span>
          </p>
          <p v-if="row.intro" class="practice-rail__intro">{{ row.intro }}</p>
        </div>
        <button
          v-if="row.canStart"
          type="button"
          class="mg-v2-button mg-v2-button--primary"
          @click="router.push(row.route)"
        >
          {{ t('programs.ui.doNow') }}
        </button>
      </li>
    </ul>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import AppIcon from '@/components/shared/AppIcon.vue'
import { useT } from '@/composables/useT'
import { getCatalogEntry } from '@/data/exerciseCatalog'
import type { DayRef } from '@/domain/period'
import type { ProgramDefinition, ProgramEnrollment } from '@/domain/program'
import { derivePracticeStates } from '@/services/programSchedulerService'
import { useExercisePlanStore } from '@/stores/exercisePlan.store'
import { getPeriodRefsForDate } from '@/utils/periods'

const props = defineProps<{
  program: ProgramDefinition
  enrollment?: ProgramEnrollment
}>()

const router = useRouter()
const { t, tg, tp, locale } = useT()
const planStore = useExercisePlanStore()

const states = computed(() => derivePracticeStates(props.program, props.enrollment, planStore.items))
const todayRef = computed<DayRef>(() => getPeriodRefsForDate(new Date()).day)

function formatDay(dayRef: DayRef): string {
  return new Date(`${dayRef}T12:00:00`).toLocaleDateString(locale.value, { day: 'numeric', month: 'short' })
}

function rhythmLabel(everyDays: number): string {
  return everyDays === 1
    ? t('programs.ui.everyDay')
    : tp(everyDays, 'programs.ui.everyNDays.one', 'programs.ui.everyNDays.few', 'programs.ui.everyNDays.many')
}

const rows = computed(() =>
  states.value.map(({ practice, state, pendingItem }) => {
    const entry = getCatalogEntry(practice.exerciseSlug)
    const due = Boolean(pendingItem && pendingItem.dayRef <= todayRef.value)
    let status: string
    if (state === 'ended') status = t('programs.ui.practiceEnded')
    else if (state === 'upcoming')
      status =
        practice.startsAfterStep === undefined
          ? t('programs.ui.practiceWithEnroll')
          : t('programs.ui.practiceAfterStep', { n: practice.startsAfterStep + 1 })
    else if (!pendingItem) status = t('programs.ui.statusPaused')
    else if (pendingItem.dayRef < todayRef.value)
      status = t('programs.ui.practiceOverdue', { date: formatDay(pendingItem.dayRef) })
    else if (due) status = t('programs.ui.practiceToday')
    else status = t('programs.ui.practiceFrom', { date: formatDay(pendingItem.dayRef) })
    return {
      slug: practice.exerciseSlug,
      state,
      due,
      overdue: Boolean(pendingItem && pendingItem.dayRef < todayRef.value),
      icon: entry?.icon ?? 'repeat',
      title: entry ? t(`exercises.cards.${entry.i18nKey}.title`) : practice.exerciseSlug,
      route: entry?.route ?? '/exercises',
      rhythm: rhythmLabel(practice.everyDays),
      status,
      intro: practice.introKey ? tg(practice.introKey) : '',
      // Only a due occurrence: completing a future one early would not tick it (D3 due rule).
      canStart: state === 'active' && due && Boolean(entry),
    }
  }),
)
</script>

<style scoped>
.practice-rail {
  display: grid;
  gap: var(--mg-space-3);
  margin-bottom: var(--mg-space-6);
}

.practice-rail__lead,
.practice-rail__intro {
  margin: 0;
  color: var(--mg-color-muted);
  font-size: var(--mg-font-size-sm);
}

.practice-rail__intro {
  margin-top: var(--mg-space-1);
  font-size: var(--mg-font-size-xs);
}

.practice-rail__list {
  display: grid;
  gap: var(--mg-space-3);
  margin: 0;
  padding: 0;
  list-style: none;
}

.practice-rail__row {
  display: flex;
  align-items: center;
  gap: var(--mg-space-3);
  padding: var(--mg-space-4);
}

.practice-rail__row.is-quiet .practice-rail__title {
  color: var(--mg-color-muted);
}

.practice-rail__body {
  flex: 1;
  min-width: 0;
}

.practice-rail__title {
  margin: 0;
  color: var(--mg-color-ink);
  font-size: var(--mg-font-size-md);
  font-weight: 800;
}
</style>
