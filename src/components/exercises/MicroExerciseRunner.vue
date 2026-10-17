<template>
  <Transition mode="out-in" enter-active-class="transition-opacity duration-200" enter-from-class="opacity-0">
    <AppCard :key="currentStep.key" padding="lg" class="micro-card" :style="cardStyle">
      <!-- Progress: quiet accent dots, the current one drawn out; done dots lead back.
           Hidden until the first answer reveals the branch (a lone pill reads as loading). -->
      <nav v-if="steps.length > 1" class="micro-steps" :aria-label="t('exerciseWizards.micro.shared.steps')">
        <ol>
          <li v-for="(step, idx) in steps" :key="step.key">
            <button
              type="button"
              :class="{ 'is-done': idx < stepIndex, 'is-current': idx === stepIndex }"
              :aria-current="idx === stepIndex ? 'step' : undefined"
              :disabled="idx >= stepIndex"
              :title="tg(stepKey(step, 'title'))"
              @click="stepIndex = idx"
            >
              <i />
            </button>
          </li>
        </ol>
        <small>{{ stepIndex + 1 }}/{{ steps.length }}</small>
      </nav>

      <!-- Head: the question, its short note and the context from earlier entries.
           The "why" is a disc at the row's end, so the answer below never moves. -->
      <header class="micro-head">
        <h2 class="micro-title">
          {{ tg(stepKey(currentStep, 'title')) }}
          <small
            v-if="isMicroStepOptional(currentStep, choiceAnswers)"
            class="micro-optional"
            data-testid="micro-optional"
            >{{ t('exerciseWizards.micro.shared.optional') }}</small
          >
        </h2>
        <ExerciseStepWhy variant="disc" class="micro-why" :text="optionalText(stepKey(currentStep, 'why'))" />
        <p class="micro-desc">
          {{ tg(stepKey(currentStep, 'description')) }}
        </p>

        <!-- A quiet quote from an earlier entry (hintFrom); never fills the field. -->
        <blockquote v-if="hint" class="micro-hint" data-testid="micro-hint">
          <span class="micro-hint__label">{{ hint.label }}</span>
          <span class="micro-hint__text">„{{ hint.text }}”</span>
        </blockquote>
      </header>

      <!-- Body: the answer, always on the zone's full width (info steps have none). -->
      <div v-if="currentStep.type !== 'info'" class="micro-body">
      <div v-if="currentStep.type === 'textarea'" class="micro-text">
        <textarea
          v-model="textValues[currentStep.key]"
          :rows="currentStep.minLength ? 7 : 5"
          :placeholder="tg(stepKey(currentStep, 'placeholder'))"
          class="micro-field"
          :class="{ 'micro-field--long': currentStep.minLength }"
        />
        <!-- Soft minimum: a counter and a gentle note, never a block. -->
        <p v-if="currentStep.minLength" class="micro-minlength" data-testid="micro-minlength">
          <span>{{ (textValues[currentStep.key] ?? '').trim().length }} / {{ currentStep.minLength }}</span>
          <span v-if="(textValues[currentStep.key] ?? '').trim().length < currentStep.minLength">
            {{ t('exerciseWizards.micro.shared.minLengthNote') }}
          </span>
        </p>
      </div>

      <div v-else-if="currentStep.type === 'textList'" class="micro-list">
        <input
          v-for="(_, index) in listValues[currentStep.key]"
          :key="index"
          v-model="listValues[currentStep.key]![index]"
          type="text"
          :placeholder="tg(stepKey(currentStep, 'placeholder'))"
          class="micro-field"
        />
      </div>

      <!-- Up to five steps: the reflection's cloud stack, empty until rated.
           Up to eleven: a row of numbered tiles. Wider (0–100): the range. -->
      <ExerciseRatingStack
        v-else-if="currentStep.type === 'slider' && isStackScale(currentStep)"
        v-model="sliderValues[currentStep.key]!"
        :min="currentStep.min"
        :max="currentStep.max"
        :min-label="tg(stepKey(currentStep, 'minLabel'))"
        :max-label="tg(stepKey(currentStep, 'maxLabel'))"
        :aria-label="tg(stepKey(currentStep, 'title'))"
        :empty-label="t('exerciseWizards.micro.shared.unrated')"
        :decrease-label="t('exerciseWizards.micro.shared.breath.less')"
        :increase-label="t('exerciseWizards.micro.shared.breath.more')"
      />
      <ExerciseScaleRow
        v-else-if="currentStep.type === 'slider' && isDiscreteScale(currentStep)"
        :model-value="sliderValues[currentStep.key] ?? currentStep.min"
        :min="currentStep.min"
        :max="currentStep.max"
        :min-label="tg(stepKey(currentStep, 'minLabel'))"
        :max-label="tg(stepKey(currentStep, 'maxLabel'))"
        :aria-label="tg(stepKey(currentStep, 'title'))"
        @update:model-value="sliderValues[currentStep.key] = $event"
      />
      <div v-else-if="currentStep.type === 'slider'" class="micro-range">
        <ExerciseRangeInput
          :model-value="sliderValues[currentStep.key] ?? currentStep.min"
          :min="currentStep.min"
          :max="currentStep.max"
          :step="currentStep.step ?? 1"
          @update:model-value="sliderValues[currentStep.key] = $event"
        />
        <div class="micro-range__ends">
          <span>{{ tg(stepKey(currentStep, 'minLabel')) }}</span>
          <strong>{{ sliderValues[currentStep.key] }}</strong>
          <span>{{ tg(stepKey(currentStep, 'maxLabel')) }}</span>
        </div>
      </div>

      <EmotionGroupPicker
        v-else-if="currentStep.type === 'emotionPick'"
        v-model="emotionStates[currentStep.key]!.selections"
        v-model:quadrant="emotionStates[currentStep.key]!.quadrant"
      />

      <div
        v-else-if="currentStep.type === 'choice'"
        class="micro-choice"
        :class="{ 'micro-choice--pair': choiceOptions(currentStep).length <= 2 }"
        :style="{ '--micro-cols': choiceColumns(choiceOptions(currentStep).length) }"
        :role="currentStep.multiple ? 'group' : 'radiogroup'"
        :aria-label="tg(stepKey(currentStep, 'title'))"
      >
        <p v-if="choiceOptions(currentStep).length === 0" class="micro-pick__empty">
          {{ optionalText(stepKey(currentStep, 'empty')) || t('exerciseWizards.micro.shared.noPractices') }}
        </p>
        <button
          v-for="option in choiceOptions(currentStep)"
          :key="option.id"
          type="button"
          class="exercise-chip micro-choice__option"
          :class="{ 'is-on': isChosen(currentStep.key, option.id) }"
          :role="currentStep.multiple ? undefined : 'radio'"
          :aria-pressed="currentStep.multiple ? isChosen(currentStep.key, option.id) : undefined"
          :aria-checked="currentStep.multiple ? undefined : isChosen(currentStep.key, option.id)"
          @click="toggleChoice(currentStep, option.id)"
        >
          <span>{{ option.label }}</span>
          <small v-if="option.hint" class="exercise-chip__hint micro-choice__hint">{{ option.hint }}</small>
        </button>
      </div>

      <!-- Pick one recent entry of another micro (e.g. a moment to work on). -->
      <div
        v-else-if="currentStep.type === 'entryPick'"
        class="micro-pick"
        role="radiogroup"
        :aria-label="tg(stepKey(currentStep, 'title'))"
      >
        <p v-if="pickable.length === 0" class="micro-pick__empty">
          {{ tg(stepKey(currentStep, 'empty')) }}
        </p>
        <button
          v-for="entry in pickable"
          :key="entry.id"
          type="button"
          class="micro-pick__card"
          :class="{ 'is-selected': pickValues[currentStep.key] === entry.id }"
          role="radio"
          :aria-checked="pickValues[currentStep.key] === entry.id"
          @click="togglePick(currentStep.key, entry.id)"
        >
          <span class="micro-pick__date">{{ formatEntryDate(entry.createdAt) }}</span>
          <span
            v-for="line in pickCardLines(currentStep, entry)"
            :key="line.key"
            class="micro-pick__line"
            :class="{ 'micro-pick__line--meta': line.meta }"
          >
            {{ line.text }}
          </span>
        </button>
      </div>

      <MicroBreathTimer
        v-else-if="currentStep.type === 'breathTimer'"
        :phase-seconds="currentStep.phaseSeconds"
        :total-seconds="currentStep.totalSeconds"
        :storage-key="`${definition.slug}:${currentStep.key}`"
        @started="Object.assign(breathStates[currentStep.key]!, $event)"
        @progress="breathStates[currentStep.key]!.elapsed = $event"
        @done="Object.assign(breathStates[currentStep.key]!, { done: true, elapsed: $event })"
      />
      </div>

      <!-- Actions right after the content, inside the card. -->
      <footer class="micro-footer">
        <div class="micro-footer__group">
          <AppButton v-if="stepIndex > 0" variant="text" @click="stepIndex--">
            {{ t('common.buttons.back') }}
          </AppButton>
          <!-- Inner practice: a quiet exit that still counts (backdraft rule). -->
          <AppButton
            v-if="definition.innerPractice"
            variant="text"
            class="micro-too-much"
            @click="leaveTooMuch()"
          >
            {{ t('exerciseWizards.micro.shared.tooMuchToday') }}
          </AppButton>
        </div>
        <div class="micro-footer__group">
          <AppButton v-if="canFinishNow" variant="tonal" @click="finishEarly()">
            {{ t('exerciseWizards.micro.shared.saveNow') }}
          </AppButton>
          <AppButton variant="filled" :disabled="!canAdvance" @click="advance()">
            {{ isLastStep ? t('common.buttons.save') : t('common.buttons.next') }}
          </AppButton>
        </div>
      </footer>
    </AppCard>
  </Transition>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import AppButton from '@/components/AppButton.vue'
import AppCard from '@/components/AppCard.vue'
import EmotionGroupPicker from '@/components/emotion/EmotionGroupPicker.vue'
import ExerciseRangeInput from '@/components/exercises/ExerciseRangeInput.vue'
import ExerciseRatingStack from '@/components/exercises/ExerciseRatingStack.vue'
import ExerciseScaleRow from '@/components/exercises/ExerciseScaleRow.vue'
import ExerciseStepWhy from '@/components/exercises/ExerciseStepWhy.vue'
import MicroBreathTimer from '@/components/exercises/MicroBreathTimer.vue'
import { useT } from '@/composables/useT'
import { getCatalogEntry } from '@/data/exerciseCatalog'
import { getMicroExercise } from '@/data/microExercises'
import { getProgramDefinition } from '@/data/programCatalog'
import { getQuadrantTintStyle, type Quadrant } from '@/domain/emotion'
import type { EmotionGroupSelection } from '@/domain/emotionGroups'
import type {
  MicroExerciseDefinition,
  MicroExerciseEntry,
  MicroExerciseStep,
  MicroPrefill,
  MicroPreset,
  MicroStepValue,
} from '@/domain/microExercises'
import { TOO_MUCH_TODAY_KEY } from '@/domain/microExercises'
import { useIFSPartStore } from '@/stores/ifsPart.store'
import { useMicroExerciseEntryStore } from '@/stores/microExerciseEntry.store'
import { useProgramEnrollmentStore } from '@/stores/programEnrollment.store'
import {
  canFinishEarly,
  conditionList,
  hasStepsAfter,
  isMicroStepOptional,
  type MicroChoiceAnswers,
  pickableEntries,
  resolveMicroHint,
  visibleMicroSteps,
} from '@/utils/microExerciseFlow'

// The runner never persists — the host view owns persistence (same
// contract as the bespoke wizards' @saved).
const props = withDefaults(
  defineProps<{
    definition: MicroExerciseDefinition
    /** Answers fixed by a catalog variant; their steps are saved and skipped. */
    preset?: MicroPreset
    /** Answers proposed up front; their steps still show, pre-filled and editable. */
    prefill?: MicroPrefill
  }>(),
  { preset: () => ({}), prefill: () => ({}) },
)

const emit = defineEmits<{
  saved: [payload: { responses: Record<string, MicroStepValue> }]
  /** The user left an inner practice with "Za dużo na dziś" (after `saved`). */
  tooMuch: []
}>()

const { t, tg, locale } = useT()
const entryStore = useMicroExerciseEntryStore()
const enrollmentStore = useProgramEnrollmentStore()
const partStore = useIFSPartStore()

const stepIndex = ref(0)

function stepKey(step: MicroExerciseStep, field: string): string {
  return `exerciseWizards.micro.${props.definition.i18nKey}.${step.key}.${field}`
}

/** Copy that a step may omit (e.g. `why`): '' when the key is missing. */
function optionalText(key: string): string {
  const value = tg(key)
  return value === key ? '' : value
}

/**
 * Equal cells per row, by option count: a pair stays a pair, up to five
 * share one row, 6–9 go in threes, longer lists read as two columns.
 * Momenty's steps (2, 4, 5, 14) never leave an orphan row.
 */
function choiceColumns(count: number): number {
  if (count <= 2) return 2
  if (count <= 5) return count
  if (count <= 9) return 3
  return 2
}

// Working state per step type, keyed by step key. The host remounts the
// runner per exercise (`:key="definition.slug"`), so init runs once.
const textValues = reactive<Record<string, string>>({})
const listValues = reactive<Record<string, string[]>>({})
/** Scales: `null` = not rated yet (stack scales start empty; wider ones start mid-way). */
const sliderValues = reactive<Record<string, number | null>>({})
// Group picker as in the emotion log: group slug + optional 1–5 intensity.
const emotionStates = reactive<
  Record<string, { selections: EmotionGroupSelection[]; quadrant: Quadrant | null }>
>({})
// The timer reports the rhythm the user started with (it may differ from
// the step's defaults) and the seconds actually breathed.
const breathStates = reactive<
  Record<
    string,
    {
      elapsed: number
      done: boolean
      phaseSeconds?: [number, number, number, number]
      totalSeconds?: number
    }
  >
>({})
/** Single choice: '' until answered; multiple choice: picked ids. */
const choiceValues = reactive<Record<string, string | string[]>>({})
/** entryPick: picked entry id, '' until picked. */
const pickValues = reactive<Record<string, string>>({})

for (const step of props.definition.steps) {
  const given = props.prefill[step.key]
  switch (step.type) {
    case 'textarea':
      textValues[step.key] = typeof given === 'string' ? given : ''
      break
    case 'textList': {
      const list = Array.isArray(given) ? given.filter((v): v is string => typeof v === 'string') : []
      listValues[step.key] = Array.from({ length: Math.max(step.prompts, list.length) }, (_, i) => list[i] ?? '')
      break
    }
    case 'slider':
      sliderValues[step.key] =
        typeof given === 'number' ? given : isStackScale(step) ? null : Math.round((step.min + step.max) / 2)
      break
    case 'emotionPick':
      emotionStates[step.key] = { selections: [], quadrant: null }
      break
    case 'breathTimer':
      breathStates[step.key] = { elapsed: 0, done: false }
      break
    case 'choice': {
      const preset = props.preset[step.key] ?? given
      choiceValues[step.key] =
        typeof preset === 'string' || (Array.isArray(preset) && preset.every((v) => typeof v === 'string'))
          ? step.multiple
            ? [...(Array.isArray(preset) ? (preset as string[]) : [preset as string])]
            : Array.isArray(preset)
              ? ((preset as string[])[0] ?? '')
              : (preset as string)
          : step.multiple
            ? []
            : ''
      break
    }
    case 'entryPick':
      pickValues[step.key] = ''
      break
    case 'info':
      break
  }
}

// Hints and entry pickers read earlier entries; the store is shared with
// the host view, so this is a no-op when already loaded.
onMounted(() => {
  void entryStore.loadEntries()
  if (props.definition.steps.some((step) => step.type === 'choice' && step.labelsFromParts)) {
    void partStore.loadParts()
  }
  if (props.definition.steps.some((step) => step.type === 'choice' && step.optionsFrom)) {
    void enrollmentStore.ensureLoaded()
  }
})
const entries = computed<MicroExerciseEntry[]>(() => entryStore.sortedEntries)

// ── choice options: dynamic lists and part names ─────────────────────

interface ChoiceOption {
  id: string
  label: string
  hint: string
}

/** Practice slugs of the user's open paths, in path order, de-duplicated. */
const programPracticeSlugs = computed<string[]>(() => {
  const slugs: string[] = []
  for (const enrollment of enrollmentStore.enrollments) {
    if (enrollment.status !== 'active' && enrollment.status !== 'paused') continue
    for (const practice of getProgramDefinition(enrollment.programSlug)?.practices ?? []) {
      if (!slugs.includes(practice.exerciseSlug)) slugs.push(practice.exerciseSlug)
    }
  }
  return slugs
})

function catalogTitle(slug: string): string {
  const entry = getCatalogEntry(slug)
  return entry ? t(`exercises.cards.${entry.i18nKey}.title`) : slug
}

function choiceOptions(step: MicroExerciseStep): ChoiceOption[] {
  if (step.type !== 'choice') return []
  const dynamic: ChoiceOption[] =
    step.optionsFrom === 'programPractices'
      ? programPracticeSlugs.value.map((slug) => ({ id: slug, label: catalogTitle(slug), hint: '' }))
      : []
  const statics: ChoiceOption[] = step.options.map((option) => {
    const fallback = tg(stepKey(step, `options.${option}`))
    const tag = step.labelsFromParts?.[option]
    const part = tag ? partStore.parts.find((candidate) => candidate.tags?.includes(tag)) : undefined
    const label = part && part.name.trim() && part.name !== fallback ? `${part.name} (${fallback})` : fallback
    return { id: option, label, hint: optionalText(stepKey(step, `optionHints.${option}`)) }
  })
  return [...dynamic, ...statics.filter((option) => !dynamic.some((d) => d.id === option.id))]
}

// Only steps whose `showWhen` matches the current choices take part in the
// flow — dots, validation and saved responses all follow this list. A
// condition always points at an earlier step, so answering the current
// step never reshuffles the steps before it. Preset steps never show.
const choiceAnswers = computed<MicroChoiceAnswers>(() => {
  const answers: MicroChoiceAnswers = {}
  for (const [key, value] of Object.entries(choiceValues)) {
    answers[key] = value === '' ? undefined : value
  }
  return answers
})
const steps = computed(() => visibleMicroSteps(props.definition.steps, choiceAnswers.value, props.preset))
const currentStep = computed(
  () => steps.value[Math.min(stepIndex.value, steps.value.length - 1)]!,
)
/** An open quadrant tints the card, as in the emotion log editor. */
const cardStyle = computed(() => {
  const step = currentStep.value
  return step.type === 'emotionPick'
    ? getQuadrantTintStyle(emotionStates[step.key]?.quadrant ?? null)
    : undefined
})
const isLastStep = computed(
  () => !hasStepsAfter(props.definition.steps, currentStep.value.key, choiceAnswers.value, props.preset),
)

function isChosen(key: string, option: string): boolean {
  const value = choiceValues[key]
  return Array.isArray(value) ? value.includes(option) : value === option
}

function toggleChoice(step: MicroExerciseStep, option: string): void {
  if (step.type !== 'choice') return
  const value = choiceValues[step.key]
  if (Array.isArray(value)) {
    choiceValues[step.key] = value.includes(option)
      ? value.filter((picked) => picked !== option)
      : [...value, option]
    return
  }
  choiceValues[step.key] = option
}

function togglePick(key: string, id: string): void {
  pickValues[key] = pickValues[key] === id ? '' : id
}

// ── entryPick cards ──────────────────────────────────────────────────

const pickable = computed(() => {
  const step = currentStep.value
  return step.type === 'entryPick' ? pickableEntries(step, entries.value) : []
})

function formatEntryDate(iso: string): string {
  return new Date(iso).toLocaleDateString(locale.value, { day: 'numeric', month: 'long' })
}

/** Up to eleven whole steps read as a row of numbers; wider scales keep the range input. */
function isDiscreteScale(step: Extract<MicroExerciseStep, { type: 'slider' }>): boolean {
  return step.max - step.min <= 10 && (step.step ?? 1) === 1
}

/** Up to five whole steps are the cloud stack (1–5 strength, "did it help"). */
function isStackScale(step: Extract<MicroExerciseStep, { type: 'slider' }>): boolean {
  return step.max - step.min <= 4 && (step.step ?? 1) === 1
}

/**
 * A response of another definition as display text: choice ids become
 * their labels, lists join, prose passes through. Undefined = nothing
 * to show.
 */
function formatSourceValue(
  source: MicroExerciseDefinition | undefined,
  key: string,
  value: MicroStepValue | undefined,
): string | undefined {
  if (value === undefined || value === null) return undefined
  const sourceStep = source?.steps.find((step) => step.key === key)
  const label = (option: string) =>
    sourceStep?.type === 'choice' && source
      ? tg(`exerciseWizards.micro.${source.i18nKey}.${key}.options.${option}`)
      : option
  if (typeof value === 'string') return value.trim() ? label(value) : undefined
  if (typeof value === 'number') return String(value)
  if (Array.isArray(value)) {
    const items = value.filter((item): item is string => typeof item === 'string').map(label)
    return items.length ? items.join(', ') : undefined
  }
  return undefined
}

function pickCardLines(
  step: Extract<MicroExerciseStep, { type: 'entryPick' }>,
  entry: MicroExerciseEntry,
): Array<{ key: string; text: string; meta: boolean }> {
  const source = getMicroExercise(step.slug)
  return step.show.flatMap((key) => {
    const text = formatSourceValue(source, key, entry.responses[key])
    if (!text) return []
    const sourceStep = source?.steps.find((candidate) => candidate.key === key)
    return [{ key, text, meta: sourceStep?.type === 'choice' }]
  })
}

// ── hintFrom ─────────────────────────────────────────────────────────

const HINT_MAX_CHARS = 160

const hint = computed<{ label: string; text: string } | null>(() => {
  const step = currentStep.value
  const source = step.hintFrom
  if (!source) return null
  if (source.source === 'latest') {
    const when = conditionList(source.when)
    const answers = choiceAnswers.value
    const holds = when.every((condition) => {
      const answer = answers[condition.step]
      const picked = Array.isArray(answer) ? answer : answer ? [answer] : []
      return picked.some((option) => condition.in.includes(option))
    })
    if (!holds) return null
  }
  const raw = resolveMicroHint(source, entries.value, { ...pickValues })
  const sourceDefinition =
    source.source === 'latest'
      ? getMicroExercise(source.slug)
      : (() => {
          const pickStep = props.definition.steps.find((candidate) => candidate.key === source.pickStep)
          return pickStep?.type === 'entryPick' ? getMicroExercise(pickStep.slug) : undefined
        })()
  const text = formatSourceValue(sourceDefinition, source.step, raw)
  if (!text) return null
  const label = optionalText(stepKey(step, 'hintLabel')) || t('exerciseWizards.micro.shared.hintLabel')
  return {
    label,
    text:
      !source.full && text.length > HINT_MAX_CHARS ? `${text.slice(0, HINT_MAX_CHARS - 1).trimEnd()}…` : text,
  }
})

// ── validation & save ────────────────────────────────────────────────

const canAdvance = computed(() => {
  const step = currentStep.value
  if (isMicroStepOptional(step, choiceAnswers.value)) return true
  switch (step.type) {
    case 'info':
      return true
    case 'slider':
      return sliderValues[step.key] != null
    case 'textarea':
      return (textValues[step.key] ?? '').trim().length > 0
    case 'textList':
      return (listValues[step.key] ?? []).some((value) => value.trim().length > 0)
    case 'emotionPick':
      return (emotionStates[step.key]?.selections.length ?? 0) > 0
    case 'choice': {
      const value = choiceValues[step.key]
      return Array.isArray(value) ? value.length > 0 : Boolean(value)
    }
    case 'entryPick':
      return Boolean(pickValues[step.key])
    case 'breathTimer': {
      const state = breathStates[step.key]
      // A meaningful stretch of breathing counts even if the full timer
      // did not run out.
      return state !== undefined && (state.done || state.elapsed >= 10)
    }
  }
})

function buildResponses(): Record<string, MicroStepValue> {
  // Preset answers are part of the entry even though their steps never showed.
  const responses: Record<string, MicroStepValue> = { ...props.preset }
  // Hidden branches are dropped even if the user typed into them before
  // changing an earlier answer.
  for (const step of steps.value) {
    switch (step.type) {
      case 'info':
        break
      case 'textarea': {
        const value = (textValues[step.key] ?? '').trim()
        if (value) responses[step.key] = value
        break
      }
      case 'textList': {
        const items = (listValues[step.key] ?? [])
          .map((value) => value.trim())
          .filter((value) => value.length > 0)
        if (items.length > 0) responses[step.key] = items
        break
      }
      case 'slider': {
        // An unrated optional scale leaves no value behind.
        const value = sliderValues[step.key]
        if (typeof value === 'number') responses[step.key] = value
        break
      }
      case 'emotionPick': {
        const state = emotionStates[step.key]
        if (state && state.selections.length > 0) {
          responses[step.key] = state.selections.map((selection) => ({ ...selection }))
        }
        break
      }
      case 'choice': {
        const value = choiceValues[step.key]
        if (Array.isArray(value) ? value.length > 0 : value) {
          responses[step.key] = Array.isArray(value) ? [...value] : value
        }
        break
      }
      case 'entryPick': {
        const value = pickValues[step.key]
        if (value) responses[step.key] = value
        break
      }
      case 'breathTimer': {
        const state = breathStates[step.key]
        responses[step.key] = {
          completedSeconds: state?.elapsed ?? 0,
          ...(state?.phaseSeconds && {
            phaseSeconds: [...state.phaseSeconds] as [number, number, number, number],
            totalSeconds: state.totalSeconds,
          }),
        }
        break
      }
    }
  }
  return responses
}

function advance(): void {
  if (isLastStep.value) {
    emit('saved', { responses: buildResponses() })
    return
  }
  stepIndex.value += 1
}

/** "Zapisz teraz": the anchor step is answered and only optional steps are left. */
const canFinishNow = computed(
  () =>
    !isLastStep.value &&
    canAdvance.value &&
    canFinishEarly(
      props.definition.steps,
      currentStep.value.key,
      choiceAnswers.value,
      props.preset,
      props.definition.earlyFinishAfter,
    ),
)

function finishEarly(): void {
  if (!canFinishNow.value) return
  emit('saved', { responses: buildResponses() })
}

/**
 * "Za dużo na dziś": save whatever is there, marked, and let the host hand
 * over to the soothing breath. Leaving is part of the practice, not a
 * failure of it.
 */
function leaveTooMuch(): void {
  emit('saved', { responses: { ...buildResponses(), [TOO_MUCH_TODAY_KEY]: 'yes' } })
  emit('tooMuch')
}
</script>

<style scoped>
.micro-card {
  display: grid;
  gap: var(--mg-space-6);
  padding: var(--mg-space-8);
}

/* Head: question + "?" disc in one row, note and context below on the full width. */
.micro-head {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  column-gap: var(--mg-space-3);
  row-gap: var(--mg-space-2);
  align-items: start;
}

.micro-why {
  grid-column: 2;
  grid-row: 1;
  margin-top: 2px;
}

.micro-body {
  display: grid;
}

/* Progress: the ritual's dots — accent at a fifth, done at half, current drawn out. */
.micro-steps {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--mg-space-2);
  margin-bottom: calc(-1 * var(--mg-space-2));
}

.micro-steps ol {
  display: flex;
  align-items: center;
  margin: 0;
  padding: 0;
  list-style: none;
}

.micro-steps button {
  display: grid;
  place-items: center;
  width: 1.75rem;
  height: 1.75rem;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: transparent;
  cursor: default;
}

.micro-steps button:not(:disabled) {
  cursor: pointer;
}

.micro-steps button:focus-visible {
  outline: 2px solid var(--mg-color-focus);
  outline-offset: 0;
}

.micro-steps i {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--mg-color-primary);
  opacity: 0.2;
  transition:
    width var(--mg-duration-fast) ease,
    opacity var(--mg-duration-fast) ease;
}

.micro-steps .is-done i {
  opacity: 0.55;
}

.micro-steps .is-done:hover i {
  opacity: 0.85;
}

.micro-steps .is-current i {
  width: 18px;
  border-radius: 8px;
  opacity: 1;
}

.micro-steps small {
  color: var(--mg-color-muted);
  font-size: var(--mg-font-size-xs);
  font-weight: 700;
}

.micro-title {
  grid-column: 1;
  grid-row: 1;
  margin: 0;
  color: var(--mg-color-ink);
  font-size: var(--mg-font-size-xl);
  font-weight: 800;
  letter-spacing: -0.01em;
  line-height: 1.25;
}

.micro-optional {
  margin-left: var(--mg-space-2);
  color: var(--mg-color-muted);
  font-size: var(--mg-font-size-xs);
  font-weight: 600;
  letter-spacing: 0;
}

.micro-desc {
  grid-column: 1 / -1;
  margin: 0;
  color: var(--mg-color-muted);
  font-size: var(--mg-font-size-md);
  line-height: 1.5;
}

/* Quote from an earlier entry: context of the question, so plain text — no box
   (a box would sit whiter than the field below and invert the tonal ladder). */
.micro-hint {
  grid-column: 1 / -1;
  display: grid;
  gap: 2px;
  margin: 0;
}

.micro-hint__label {
  color: var(--mg-color-muted);
  font-size: var(--mg-font-size-xs);
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.micro-hint__text {
  color: var(--mg-color-ink);
  font-size: var(--mg-font-size-md);
}

/* Fields keep the field tone on focus; the ring carries the state. */
.micro-text,
.micro-list {
  display: grid;
  gap: var(--mg-space-2);
}

.micro-field {
  width: 100%;
  padding: var(--mg-space-3) var(--mg-space-4);
  border: 1px solid var(--mg-color-field-border);
  border-radius: var(--mg-radius-md);
  background: var(--mg-color-mist);
  color: var(--mg-color-ink);
  font: inherit;
  font-size: var(--mg-font-size-md);
  line-height: 1.6;
  resize: none;
}

/* Global `field-sizing: content` ignores `rows`; the minimum is set in lines here. */
textarea.micro-field {
  min-height: calc(5 * 1.6em + 2 * var(--mg-space-3) + 2px);
}

textarea.micro-field--long {
  min-height: calc(7 * 1.6em + 2 * var(--mg-space-3) + 2px);
}

.micro-field::placeholder {
  color: var(--mg-color-muted);
}

.micro-field:focus-visible {
  outline: none;
  border-color: rgb(var(--sky-400) / 0.5);
  box-shadow: var(--mg-focus-ring);
}

.micro-minlength {
  display: flex;
  justify-content: space-between;
  gap: var(--mg-space-3);
  margin: 0;
  font-size: var(--mg-font-size-xs);
  color: var(--mg-color-muted);
}

.micro-range {
  display: grid;
  gap: var(--mg-space-2);
}

.micro-range__ends {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: var(--mg-font-size-sm);
  color: var(--mg-color-muted);
}

.micro-range__ends strong {
  color: var(--mg-color-ink);
  font-size: var(--mg-font-size-sm);
  font-weight: 700;
}

.micro-choice {
  --micro-cols: 2;
  display: flex;
  flex-wrap: wrap;
  gap: var(--mg-space-2);
}

/* Equal cells: every row full, labels wrap inside, rows share one height. */
.micro-choice__option {
  flex: 0 0 calc((100% - (var(--micro-cols) - 1) * var(--mg-space-2)) / var(--micro-cols));
  min-height: 2.5rem;
  padding: var(--mg-space-2) var(--mg-space-4);
  font-size: var(--mg-font-size-md);
  white-space: normal;
}

/* A pair (yes/no) stays a pair of light tiles, not two slabs. */
.micro-choice--pair .micro-choice__option {
  flex-basis: 9rem;
}

.micro-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--mg-space-3);
}

.micro-footer__group {
  display: flex;
  align-items: center;
  gap: var(--mg-space-2);
}

/* The quiet "Wstecz" starts on the content edge, not a padding in. */
.micro-footer__group:first-child > :first-child.mg-v2-button--quiet {
  margin-left: calc(-1 * var(--mg-space-4));
}

.micro-too-much {
  color: var(--mg-color-muted);
}

/* Entry cards to pick from: the chip's tones, one card per entry. */
.micro-pick {
  display: grid;
  gap: var(--mg-space-2);
}

.micro-pick__empty {
  margin: 0;
  font-size: var(--mg-font-size-sm);
  color: var(--mg-color-muted);
}

.micro-pick__card {
  display: grid;
  gap: 2px;
  text-align: left;
  padding: var(--mg-space-2) var(--mg-space-3);
  border: 1px solid var(--mg-color-border);
  border-radius: var(--mg-radius-md);
  background: var(--mg-color-mist);
  color: var(--mg-color-ink);
  font: inherit;
  cursor: pointer;
  transition: background var(--mg-duration-fast) ease;
}

.micro-pick__card:hover {
  background: var(--mg-color-sky-well);
}

.micro-pick__card.is-selected {
  border-color: var(--mg-color-primary);
  box-shadow: inset 0 0 0 1px var(--mg-color-primary);
}

.micro-pick__card:focus-visible {
  outline: 2px solid var(--mg-color-focus);
  outline-offset: 2px;
}

.micro-pick__date {
  font-size: var(--mg-font-size-xs);
  color: var(--mg-color-muted);
}

.micro-pick__line {
  font-size: var(--mg-font-size-sm);
}

.micro-pick__line--meta {
  font-size: var(--mg-font-size-xs);
  color: var(--mg-color-muted);
}
</style>
