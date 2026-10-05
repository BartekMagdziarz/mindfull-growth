<template>
  <details v-if="options || state" class="pp-row" :open="!state?.entry" data-testid="path-world">
    <summary class="pp-row__head">
      <span class="pp-row__eyebrow">{{ t('programs.week.panelTitle') }}</span>
      <span class="pp-row__text">
        <template v-if="state?.intention">{{ state.intention.title }}</template>
        <template v-else-if="state?.entry">{{ t('programs.week.declinedThisWeek') }}</template>
        <template v-else-if="suggested">{{ taskTitle(suggested.key) }} <small>{{ t('programs.week.suggestedNote') }}</small></template>
        <template v-else>{{ t('programs.week.noTaskThisWeek') }}</template>
      </span>
      <span v-if="state?.intention" class="pp-wells" :aria-label="t('programs.week.doneOf', { done: state.doneCount, target: target })">
        <i v-for="n in target" :key="n" class="mg-well pp-well pp-well--sm" :class="{ 'mg-well--done': n <= state.doneCount }" />
      </span>
      <span v-else />
      <AppIcon name="expand_more" />
    </summary>
    <div class="pp-row__body">
      <template v-if="state?.entry">
        <p v-if="state.task" class="pp-muted">{{ tg(`${program.i18nKey}.tasks.${state.task.key}.why`) }}</p>
      </template>
      <template v-else-if="options && enrollment.status === 'active'">
        <ProgramTaskChoice
          v-model="chosenKey"
          :program="program"
          :current="options.current"
          :earlier="options.earlier"
          :suggested-key="options.suggested.key"
          :repeat="options.repeat"
          :disabled="busy"
          :name="`program-task-path-${enrollment.id}`"
        />
        <div class="pp-chips">
          <button type="button" class="pp-chip pp-chip--primary" :disabled="busy" @click="accept">
            {{ t('programs.week.addThisWeek') }}
          </button>
          <button type="button" class="pp-chip" :disabled="busy" @click="decline">
            {{ t('programs.week.decline') }}
          </button>
        </div>
      </template>
    </div>
  </details>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import ProgramTaskChoice from '@/components/exercises/ProgramTaskChoice.vue'
import AppIcon from '@/components/shared/AppIcon.vue'
import { useT } from '@/composables/useT'
import type { WeekRef } from '@/domain/period'
import type { ProgramDefinition, ProgramEnrollment } from '@/domain/program'
import {
  acceptWeeklyTask,
  declineWeeklyTask,
  proposeWeeklyTaskOptions,
  weekTaskState,
  type WeekTaskState,
} from '@/services/programWeekService'
import { useProgramEnrollmentStore } from '@/stores/programEnrollment.store'
import { getPeriodRefsForDate } from '@/utils/periods'

/**
 * "W świecie" — the open week's real-world task: the accepted task with its
 * day wells in the summary (why underneath), or this week's proposal as a
 * choice with "Dodaj do tego tygodnia" when the planning ritual has not
 * decided yet. History and the severity trend live in the reflection.
 */
const props = defineProps<{
  program: ProgramDefinition
  enrollment: ProgramEnrollment
}>()

const { t, tg } = useT()
const enrollmentStore = useProgramEnrollmentStore()
const busy = ref(false)
const state = ref<WeekTaskState | null>(null)

const thisWeek = computed<WeekRef>(() => getPeriodRefsForDate(new Date()).week)
const options = computed(() => proposeWeeklyTaskOptions(props.program, props.enrollment, thisWeek.value))
const suggested = computed(() => options.value?.suggested)
const target = computed(() => state.value?.intention?.target.value ?? state.value?.task?.times ?? 1)

const chosenKey = ref('')
watch(
  options,
  (next) => {
    const known = next && [...next.current, ...next.earlier].some((task) => task.key === chosenKey.value)
    if (!known) chosenKey.value = next?.suggested.key ?? ''
  },
  { immediate: true },
)
const chosenTask = computed(() =>
  options.value
    ? ([...options.value.current, ...options.value.earlier].find((task) => task.key === chosenKey.value) ?? options.value.suggested)
    : null,
)

async function load(): Promise<void> {
  state.value = await weekTaskState(props.program, props.enrollment, thisWeek.value)
}
onMounted(() => void load())
watch(() => [props.enrollment.id, props.enrollment.weekLog], () => void load(), { deep: true })

function taskTitle(key: string): string {
  return tg(`${props.program.i18nKey}.tasks.${key}.title`)
}

async function accept(): Promise<void> {
  const task = chosenTask.value
  if (!task) return
  busy.value = true
  try {
    const { enrollment } = await acceptWeeklyTask({
      enrollmentId: props.enrollment.id,
      weekRef: thisWeek.value,
      taskKey: task.key,
      title: taskTitle(task.key),
      times: task.times,
    })
    enrollmentStore.applyUpdate(enrollment)
  } finally {
    busy.value = false
  }
}

async function decline(): Promise<void> {
  const task = chosenTask.value
  if (!task) return
  busy.value = true
  try {
    enrollmentStore.applyUpdate(await declineWeeklyTask(props.enrollment.id, thisWeek.value, task.key))
  } finally {
    busy.value = false
  }
}
</script>
