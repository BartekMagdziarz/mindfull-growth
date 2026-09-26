<template>
  <section class="week-panel" :aria-label="t('programs.week.panelTitle')">
    <div class="mg-v2-section-head">
      <h2>{{ t('programs.week.panelTitle') }}</h2>
    </div>
    <p class="week-panel__lead">{{ t('programs.week.panelLead') }}</p>

    <div class="mg-v2-surface mg-v2-surface--raised-sm week-panel__card">
      <div v-if="proposal && enrollment.status === 'active'" class="mg-v2-surface mg-v2-surface--flat week-panel__proposal">
        <p class="week-panel__eyebrow">{{ t('programs.week.thisWeek') }}</p>
        <h3 class="week-panel__title">{{ taskTitle(proposal.task.key) }}</h3>
        <p class="week-panel__why">{{ tg(`${program.i18nKey}.tasks.${proposal.task.key}.why`) }}</p>
        <div class="week-panel__actions">
          <button type="button" class="mg-v2-button mg-v2-button--primary" :disabled="busy" @click="accept">
            {{ t('programs.week.addThisWeek') }}
          </button>
          <button type="button" class="mg-v2-button mg-v2-button--quiet" :disabled="busy" @click="decline">
            {{ t('programs.week.decline') }}
          </button>
        </div>
      </div>

      <div v-if="trend.length" class="week-panel__trend">
        <span class="week-panel__eyebrow">{{ t(`${program.i18nKey}.reflection.severity`) }}</span>
        <div class="week-panel__bars" role="img" :aria-label="trendLabel">
          <span v-for="point in trend" :key="point.weekRef" class="week-panel__bar-slot" :title="`${point.weekRef}: ${point.value ?? '–'}`">
            <span
              class="week-panel__bar"
              :class="{ 'is-empty': point.value === null }"
              :style="{ height: `${((point.value ?? 0.4) / 5) * 100}%` }"
            />
          </span>
        </div>
      </div>

      <ul v-if="history.length" class="week-panel__history">
        <li v-for="row in history" :key="row.weekRef">
          <span class="week-panel__week">{{ row.weekLabel }}</span>
          <span class="week-panel__task">{{ row.title }}</span>
          <span class="mg-v2-meta"><span>{{ row.status }}</span></span>
        </li>
      </ul>
      <p v-else-if="!proposal" class="week-panel__why">{{ t('programs.week.emptyHistory') }}</p>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useT } from '@/composables/useT'
import type { WeekRef } from '@/domain/period'
import type { ProgramDefinition, ProgramEnrollment } from '@/domain/program'
import type { WeeklyReflection } from '@/domain/reflection'
import { structuredReflectionDexieRepository } from '@/repositories/structuredReflectionDexieRepository'
import {
  acceptWeeklyTask,
  declineWeeklyTask,
  proposeWeeklyTask,
  severitySeries,
} from '@/services/programWeekService'
import { useProgramEnrollmentStore } from '@/stores/programEnrollment.store'
import { getPeriodRefsForDate } from '@/utils/periods'

/**
 * "W świecie" — the program's weekly real-world tasks: this week's
 * proposal (for enrollments started mid-week, without waiting for the
 * planning ritual), the week log and the weekly severity answers.
 */
const props = defineProps<{
  program: ProgramDefinition
  enrollment: ProgramEnrollment
}>()

const { t, tg } = useT()
const enrollmentStore = useProgramEnrollmentStore()
const busy = ref(false)
const reflections = ref<WeeklyReflection[]>([])

const thisWeek = computed<WeekRef>(() => getPeriodRefsForDate(new Date()).week)
const startWeek = computed<WeekRef>(() => getPeriodRefsForDate(new Date(props.enrollment.startedAt)).week)
const proposal = computed(() => proposeWeeklyTask(props.program, props.enrollment, thisWeek.value))

async function loadReflections(): Promise<void> {
  reflections.value = await structuredReflectionDexieRepository.listWeekly()
}
onMounted(() => void loadReflections())
watch(() => props.enrollment.id, () => void loadReflections())

const trend = computed(() => severitySeries(props.enrollment.id, reflections.value, startWeek.value))
const trendLabel = computed(() =>
  trend.value.map((point) => `${point.weekRef.slice(-3)}: ${point.value ?? '–'}`).join(', '),
)

function taskTitle(key: string): string {
  return tg(`${props.program.i18nKey}.tasks.${key}.title`)
}

const history = computed(() =>
  [...(props.enrollment.weekLog ?? [])]
    .sort((a, b) => b.weekRef.localeCompare(a.weekRef))
    .map((entry) => ({
      weekRef: entry.weekRef,
      weekLabel: t('programs.week.weekShort', { n: Number(entry.weekRef.slice(-2)) }),
      title: taskTitle(entry.taskKey),
      status:
        entry.decision === 'accepted'
          ? entry.stayNextWeek
            ? t('programs.week.statusStay')
            : t('programs.week.statusAccepted')
          : t('programs.week.statusDeclined'),
    })),
)

async function accept(): Promise<void> {
  if (!proposal.value) return
  busy.value = true
  try {
    const { enrollment } = await acceptWeeklyTask({
      enrollmentId: props.enrollment.id,
      weekRef: thisWeek.value,
      taskKey: proposal.value.task.key,
      title: taskTitle(proposal.value.task.key),
    })
    enrollmentStore.applyUpdate(enrollment)
  } finally {
    busy.value = false
  }
}

async function decline(): Promise<void> {
  if (!proposal.value) return
  busy.value = true
  try {
    enrollmentStore.applyUpdate(await declineWeeklyTask(props.enrollment.id, thisWeek.value, proposal.value.task.key))
  } finally {
    busy.value = false
  }
}
</script>

<style scoped>
.week-panel {
  display: grid;
  gap: var(--mg-space-3);
  margin-bottom: var(--mg-space-6);
}

.week-panel__lead {
  margin: 0;
  color: var(--mg-color-muted);
  font-size: var(--mg-font-size-sm);
}

.week-panel__card {
  display: grid;
  gap: var(--mg-space-4);
  padding: var(--mg-space-4);
}

.week-panel__proposal {
  display: grid;
  gap: var(--mg-space-2);
  padding: var(--mg-space-3) var(--mg-space-4);
  border-radius: var(--mg-radius-md);
}

.week-panel__eyebrow {
  margin: 0;
  color: var(--mg-color-muted);
  font-size: var(--mg-font-size-xs);
  font-weight: 700;
}

.week-panel__title {
  margin: 0;
  color: var(--mg-color-ink);
  font-size: var(--mg-font-size-md);
  font-weight: 800;
}

.week-panel__why {
  margin: 0;
  color: var(--mg-color-muted);
  font-size: var(--mg-font-size-sm);
}

.week-panel__actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--mg-space-2);
  margin-top: var(--mg-space-1);
}

.week-panel__trend {
  display: grid;
  gap: var(--mg-space-2);
}

.week-panel__bars {
  display: flex;
  align-items: flex-end;
  gap: var(--mg-space-1);
  height: 3rem;
}

.week-panel__bar-slot {
  display: flex;
  align-items: flex-end;
  width: 0.875rem;
  height: 100%;
}

/* Chart marks: ink for values, pencil for weeks without an answer. */
.week-panel__bar {
  width: 100%;
  border-radius: var(--mg-radius-sm);
  background: rgb(var(--sky-800));
  opacity: 0.8;
}

.week-panel__bar.is-empty {
  background: transparent;
  border: 1px dashed color-mix(in srgb, var(--mg-color-muted) 50%, transparent);
}

.week-panel__history {
  display: grid;
  margin: 0;
  padding: 0;
  list-style: none;
}

.week-panel__history li {
  display: flex;
  align-items: baseline;
  gap: var(--mg-space-3);
  padding: var(--mg-space-2) 0;
}

.week-panel__history li + li {
  border-top: 1.5px dashed color-mix(in srgb, var(--mg-color-muted) 30%, transparent);
}

.week-panel__week {
  min-width: 2.5rem;
  color: var(--mg-color-muted);
  font-size: var(--mg-font-size-xs);
  font-weight: 800;
}

.week-panel__task {
  flex: 1;
  min-width: 0;
  color: var(--mg-color-ink);
  font-size: var(--mg-font-size-sm);
}
</style>
