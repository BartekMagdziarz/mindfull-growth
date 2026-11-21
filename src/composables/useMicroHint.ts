import { computed, onMounted, type ComputedRef } from 'vue'
import { useT } from '@/composables/useT'
import { getMicroExercise } from '@/data/microExercises'
import type {
  MicroExerciseDefinition,
  MicroExerciseEntry,
  MicroExerciseStep,
  MicroHintSource,
  MicroStepValue,
} from '@/domain/microExercises'
import { useIFSProtectorAppreciationStore } from '@/stores/ifsProtectorAppreciation.store'
import {
  conditionList,
  type MicroChoiceAnswers,
  resolveMicroHint,
  resolveMicroHintEntry,
} from '@/utils/microExerciseFlow'

/**
 * The quiet quote under a micro step's description (`hintFrom`): one
 * response of an earlier entry, several responses of it as a small card
 * (`steps` — "Próba planu" shows the whole plan for a hard moment), or a
 * sentence from a wizard record (`record` — the handover sentence written
 * in "Czego pilnuje Krytyk"). Never fills the field.
 */
export interface MicroHintLine {
  key: string
  /** Label of one field in a multi-field quote; '' for a single quote. */
  label: string
  text: string
}

export interface MicroHintView {
  label: string
  lines: MicroHintLine[]
}

const HINT_MAX_CHARS = 160

type Translate = (key: string) => string

/**
 * A response of another definition as display text: choice ids become
 * their labels, lists join, prose passes through. Undefined = nothing
 * to show.
 */
export function formatMicroSourceValue(
  tg: Translate,
  source: MicroExerciseDefinition | undefined,
  key: string,
  value: MicroStepValue | undefined
): string | undefined {
  if (value === undefined || value === null) return undefined
  const sourceStep = source?.steps.find(step => step.key === key)
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

export function useMicroHint(options: {
  definition: MicroExerciseDefinition
  currentStep: ComputedRef<MicroExerciseStep>
  entries: ComputedRef<MicroExerciseEntry[]>
  pickValues: Record<string, string>
  choiceAnswers: ComputedRef<MicroChoiceAnswers>
  /** `exerciseWizards.micro.<i18nKey>.<stepKey>.<field>` */
  stepKey: (step: MicroExerciseStep, field: string) => string
  /** Copy a step may omit: '' when the key is missing. */
  optionalText: (key: string) => string
}): { hint: ComputedRef<MicroHintView | null> } {
  const { t, tg } = useT()
  const appreciationStore = useIFSProtectorAppreciationStore()

  onMounted(() => {
    if (options.definition.steps.some(step => step.hintFrom?.source === 'record')) {
      void appreciationStore.loadAppreciations()
    }
  })

  function clip(source: MicroHintSource, text: string): string {
    return !source.full && text.length > HINT_MAX_CHARS
      ? `${text.slice(0, HINT_MAX_CHARS - 1).trimEnd()}…`
      : text
  }

  /** The newest handover sentence from "Czego pilnuje Krytyk" (any protector). */
  function handoverSentence(): string {
    const record = appreciationStore.sortedAppreciations.find(item => item.handover?.trim())
    return record?.handover?.trim() ?? ''
  }

  function sourceDefinition(source: MicroHintSource): MicroExerciseDefinition | undefined {
    if (source.source === 'latest') return getMicroExercise(source.slug)
    if (source.source !== 'picked') return undefined
    const pickStep = options.definition.steps.find(candidate => candidate.key === source.pickStep)
    return pickStep?.type === 'entryPick' ? getMicroExercise(pickStep.slug) : undefined
  }

  const hint = computed<MicroHintView | null>(() => {
    const step = options.currentStep.value
    const source = step.hintFrom
    if (!source) return null
    const label =
      options.optionalText(options.stepKey(step, 'hintLabel')) ||
      t('exerciseWizards.micro.shared.hintLabel')

    if (source.source === 'record') {
      const text = handoverSentence()
      return text ? { label, lines: [{ key: source.record, label: '', text }] } : null
    }

    if (source.source === 'latest') {
      const answers = options.choiceAnswers.value
      const holds = conditionList(source.when).every(condition => {
        const answer = answers[condition.step]
        const picked = Array.isArray(answer) ? answer : answer ? [answer] : []
        return picked.some(option => condition.in.includes(option))
      })
      if (!holds) return null
      if (source.steps?.length) {
        const entry = resolveMicroHintEntry(source, options.entries.value)
        const definition = sourceDefinition(source)
        const lines = source.steps.flatMap(key => {
          const text = formatMicroSourceValue(tg, definition, key, entry?.responses[key])
          if (!text) return []
          return [
            {
              key,
              label: options.optionalText(options.stepKey(step, `hintFields.${key}`)),
              text: clip(source, text),
            },
          ]
        })
        return lines.length ? { label, lines } : null
      }
    }

    const raw = resolveMicroHint(source, options.entries.value, { ...options.pickValues })
    const text = formatMicroSourceValue(tg, sourceDefinition(source), source.step, raw)
    if (!text) return null
    return { label, lines: [{ key: source.step, label: '', text: clip(source, text) }] }
  })

  return { hint }
}
