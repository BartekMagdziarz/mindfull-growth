<template>
  <div class="task-choice" role="radiogroup" :aria-label="t('programs.week.chooseTask')">
    <!-- Each task is a row like in Dzisiaj: copy on the left, the entry disc
         on the right edge; the chosen row is one step whiter (paper). -->
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
          {{ timesLabel(task.times)
          }}<template v-if="task.key === suggestedKey"> · {{ suggestedNote }}</template>
        </small>
        <!-- The "why" belongs to the chosen task, so it lives inside its row. -->
        <span v-if="task.key === modelValue" class="task-choice__why">{{
          tg(`${program.i18nKey}.tasks.${task.key}.why`)
        }}</span>
      </span>
      <!-- The same well that marks a done task in Dzisiaj; chosen = filled. -->
      <span
        class="mg-well task-choice__well"
        :class="{ 'mg-well--done': task.key === modelValue }"
        aria-hidden="true"
      ></span>
    </label>

    <button
      v-if="earlier.length"
      type="button"
      class="task-choice__disclosure"
      :aria-expanded="showEarlier"
      @click="showEarlier = !showEarlier"
    >
      {{
        showEarlier
          ? t('programs.week.hideEarlierTasks')
          : t('programs.week.earlierTasks', { n: earlier.length })
      }}
      <AppIcon :name="showEarlier ? 'expand_less' : 'expand_more'" />
    </button>
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
 * disclosure inside the card, the chosen task's "why" inside its row. Shared
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
  { repeat: false, disabled: false, name: 'program-task' }
)

const emit = defineEmits<{ 'update:modelValue': [key: string] }>()

const { t, tg, tp } = useT()

// The suggestion may live in an earlier phase (after "stay" or a phase
// without tasks): keep that section open so the preselected radio shows.
const showEarlier = ref(props.earlier.some(task => task.key === props.modelValue))
watch(
  () => props.modelValue,
  key => {
    if (props.earlier.some(task => task.key === key)) showEarlier.value = true
  }
)

const visibleTasks = computed(() =>
  showEarlier.value ? [...props.current, ...props.earlier] : props.current
)
const suggestedNote = computed(() =>
  props.repeat ? t('programs.week.repeatNote') : t('programs.week.suggestedNote')
)

function taskTitle(task: ProgramWeeklyTask): string {
  return tg(`${props.program.i18nKey}.tasks.${task.key}.title`)
}

function timesLabel(times: number): string {
  return tp(
    times,
    'programs.week.timesPerWeek.one',
    'programs.week.timesPerWeek.few',
    'programs.week.timesPerWeek.many'
  )
}
</script>

<style scoped>
/* Rows follow the Dzisiaj item row: transparent at rest, one step whiter on
   hover, the chosen row stays on paper (like an expanded row) — no border,
   no stripe. The disc on the right is the app's completion well. */
.task-choice {
  display: grid;
  gap: 2px;
}

.task-choice__option {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: var(--mg-space-2);
  align-items: center;
  padding: var(--mg-space-2) var(--mg-space-2) var(--mg-space-2) var(--mg-space-3);
  border-radius: var(--mg-radius-sm);
  cursor: pointer;
  transition: background var(--mg-duration-fast, 0.18s) var(--mg-ease-standard, ease);
}

.task-choice__option:hover,
.task-choice__option.is-selected {
  background: var(--mg-color-paper);
}

/* The native radio stays for keyboard and a11y; the well draws the state. */
.task-choice__input {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  margin: 0;
  opacity: 0;
  cursor: inherit;
}

.task-choice__option:has(.task-choice__input:focus-visible) {
  outline: 2px solid var(--mg-color-primary);
  outline-offset: 2px;
}

.task-choice__option:has(.task-choice__input:disabled) {
  cursor: default;
  opacity: 0.6;
}

.task-choice__well {
  pointer-events: none;
}

.task-choice__copy {
  display: grid;
  gap: 3px;
  min-width: 0;
}

.task-choice__title {
  color: var(--mg-color-ink);
  font-size: 15px;
  font-weight: 700;
  line-height: 1.35;
}

.task-choice__meta {
  color: var(--mg-color-muted);
  font-size: 12px;
  line-height: 1.4;
}

.task-choice__why {
  margin-top: 6px;
  color: var(--mg-color-muted);
  font-size: 13px;
  line-height: 1.45;
}

.task-choice__disclosure {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  justify-self: start;
  min-height: 34px;
  margin-top: 4px;
  padding: 6px var(--mg-space-3);
  border: 0;
  border-radius: 11px 9px 12px 10px;
  background: transparent;
  color: var(--mg-color-muted);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

.task-choice__disclosure :deep(.material-symbols-outlined) {
  font-size: 18px;
  color: var(--mg-color-primary);
}

.task-choice__disclosure:hover {
  color: var(--mg-color-ink);
  background: var(--mg-color-paper);
}
</style>
