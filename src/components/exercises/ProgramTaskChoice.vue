<template>
  <div class="task-choice" role="radiogroup" :aria-label="t('programs.week.chooseTask')">
    <label
      v-for="task in visibleTasks"
      :key="task.key"
      class="task-choice__option"
      :class="{ 'is-selected': task.key === modelValue }"
    >
      <input
        class="task-choice__input"
        type="radio"
        :name="name"
        :value="task.key"
        :checked="task.key === modelValue"
        :disabled="disabled"
        @change="emit('update:modelValue', task.key)"
      />
      <span class="task-choice__copy">
        <span class="task-choice__title">{{ taskTitle(task) }}</span>
        <small class="task-choice__meta">
          {{ timesLabel(task.times) }}<template v-if="task.key === suggestedKey"> · {{ suggestedNote }}</template>
        </small>
      </span>
    </label>

    <button
      v-if="earlier.length"
      type="button"
      class="task-choice__disclosure"
      :aria-expanded="showEarlier"
      @click="showEarlier = !showEarlier"
    >
      {{ showEarlier ? t('programs.week.hideEarlierTasks') : t('programs.week.earlierTasks', { n: earlier.length }) }}
      <AppIcon :name="showEarlier ? 'expand_less' : 'expand_more'" />
    </button>

    <p v-if="selected" class="task-choice__why">{{ tg(`${program.i18nKey}.tasks.${selected.key}.why`) }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import AppIcon from '@/components/shared/AppIcon.vue'
import { useT } from '@/composables/useT'
import type { ProgramDefinition, ProgramWeeklyTask } from '@/domain/program'

/**
 * The weekly task picker of a path: the current phase's tasks as radios
 * (the service's suggestion preselected), earlier phases behind one
 * disclosure inside the card, the chosen task's "why" underneath. Shared
 * by the quiet weekly plan and the program's "W świecie" panel.
 * Plan: ideas/html-plans/2026-09-26-shame-path-v2-compassion.html §4.3.
 */
const props = withDefaults(
  defineProps<{
    program: ProgramDefinition
    current: ProgramWeeklyTask[]
    earlier: ProgramWeeklyTask[]
    /** Selected task key. */
    modelValue: string
    suggestedKey: string
    /** The suggestion repeats last week's task. */
    repeat?: boolean
    disabled?: boolean
    /** Radio group name; unique per card when several paths are active. */
    name?: string
  }>(),
  { repeat: false, disabled: false, name: 'program-task' },
)

const emit = defineEmits<{ 'update:modelValue': [key: string] }>()

const { t, tg, tp } = useT()

// The suggestion may live in an earlier phase (after "stay" or a phase
// without tasks): keep that section open so the preselected radio shows.
const showEarlier = ref(props.earlier.some((task) => task.key === props.modelValue))
watch(
  () => props.modelValue,
  (key) => {
    if (props.earlier.some((task) => task.key === key)) showEarlier.value = true
  },
)

const visibleTasks = computed(() => (showEarlier.value ? [...props.current, ...props.earlier] : props.current))
const selected = computed(() => [...props.current, ...props.earlier].find((task) => task.key === props.modelValue))
const suggestedNote = computed(() => (props.repeat ? t('programs.week.repeatNote') : t('programs.week.suggestedNote')))

function taskTitle(task: ProgramWeeklyTask): string {
  return tg(`${props.program.i18nKey}.tasks.${task.key}.title`)
}

function timesLabel(times: number): string {
  return tp(times, 'programs.week.timesPerWeek.one', 'programs.week.timesPerWeek.few', 'programs.week.timesPerWeek.many')
}
</script>

<style scoped>
.task-choice {
  display: grid;
  gap: var(--mg-space-1);
}

.task-choice__option {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: var(--mg-space-3);
  align-items: start;
  padding: var(--mg-space-2) var(--mg-space-3);
  border: 1px solid transparent;
  border-radius: var(--mg-radius-md);
  cursor: pointer;
}

.task-choice__option:hover {
  background: var(--mg-color-paper);
}

/* The chosen task is the only one on the whiter surface. */
.task-choice__option.is-selected {
  background: var(--mg-color-paper);
  border-color: var(--mg-color-border);
}

.task-choice__input {
  margin-top: 0.3em;
  accent-color: var(--mg-color-primary);
}

.task-choice__copy {
  display: grid;
  gap: 2px;
  min-width: 0;
}

.task-choice__title {
  color: var(--mg-color-ink);
  font-size: var(--mg-font-size-sm);
  font-weight: 600;
  line-height: 1.35;
}

.task-choice__meta,
.task-choice__why {
  color: var(--mg-color-muted);
  font-size: var(--mg-font-size-xs);
}

.task-choice__why {
  margin: var(--mg-space-1) 0 0;
  padding: 0 var(--mg-space-3);
  font-size: var(--mg-font-size-sm);
}

.task-choice__disclosure {
  display: inline-flex;
  align-items: center;
  gap: var(--mg-space-1);
  justify-self: start;
  padding: var(--mg-space-1) var(--mg-space-3);
  border: 0;
  border-radius: var(--mg-radius-pill);
  background: transparent;
  color: var(--mg-color-muted);
  font-size: var(--mg-font-size-xs);
  font-weight: 600;
  cursor: pointer;
}

.task-choice__disclosure:hover {
  color: var(--mg-color-ink);
  background: var(--mg-color-paper);
}
</style>
