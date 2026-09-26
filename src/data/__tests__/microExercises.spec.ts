import { describe, expect, it } from 'vitest'
import { MICRO_EXERCISES } from '@/data/microExercises'
import enWizards from '@/locales/en/exerciseWizards.json'
import plWizards from '@/locales/pl/exerciseWizards.json'

type Copy = Record<string, unknown>

function microCopy(locale: typeof plWizards): Record<string, Copy> {
  return locale.micro as unknown as Record<string, Copy>
}

/** Plain string or gendered `{ m, f }` pair, like every tg() key. */
function isCopyValue(value: unknown): boolean {
  if (typeof value === 'string') return value.length > 0
  if (value && typeof value === 'object') {
    const pair = value as Record<string, unknown>
    return typeof pair.m === 'string' && typeof pair.f === 'string'
  }
  return false
}

const locales = [
  ['pl', plWizards],
  ['en', enWizards],
] as const

describe('micro exercise definitions', () => {
  it('have unique slugs and unique step keys per definition', () => {
    const slugs = MICRO_EXERCISES.map((definition) => definition.slug)
    expect(new Set(slugs).size).toBe(slugs.length)
    for (const definition of MICRO_EXERCISES) {
      const keys = definition.steps.map((step) => step.key)
      expect(new Set(keys).size, definition.slug).toBe(keys.length)
    }
  })

  it('point every showWhen at an earlier choice step and at its real options', () => {
    for (const definition of MICRO_EXERCISES) {
      definition.steps.forEach((step, index) => {
        if (!step.showWhen) return
        const sourceIndex = definition.steps.findIndex((other) => other.key === step.showWhen!.step)
        const label = `${definition.slug}.${step.key}`
        expect(sourceIndex, label).toBeGreaterThanOrEqual(0)
        expect(sourceIndex, label).toBeLessThan(index)
        const source = definition.steps[sourceIndex]!
        expect(source.type, label).toBe('choice')
        if (source.type !== 'choice') return
        expect(step.showWhen.in.length, label).toBeGreaterThan(0)
        for (const option of step.showWhen.in) expect(source.options, label).toContain(option)
      })
    }
  })

  it('never ends a branch without a step to fill (first step is always visible)', () => {
    for (const definition of MICRO_EXERCISES) {
      expect(definition.steps[0]?.showWhen, definition.slug).toBeUndefined()
    }
  })

  it('have step copy for every field the runner reads, in both locales', () => {
    for (const [name, locale] of locales) {
      for (const definition of MICRO_EXERCISES) {
        const copy = microCopy(locale)[definition.i18nKey]
        expect(copy, `${name} micro.${definition.i18nKey}`).toBeDefined()
        for (const step of definition.steps) {
          const stepCopy = copy?.[step.key] as Copy | undefined
          const where = `${name} micro.${definition.i18nKey}.${step.key}`
          expect(stepCopy, where).toBeDefined()
          const fields = ['title', 'description']
          if (step.type === 'textarea' || step.type === 'textList') fields.push('placeholder')
          if (step.type === 'slider') fields.push('minLabel', 'maxLabel')
          for (const field of fields) {
            expect(isCopyValue(stepCopy?.[field]), `${where}.${field}`).toBe(true)
          }
          if (step.type === 'choice') {
            const options = stepCopy?.options as Copy | undefined
            for (const option of step.options) {
              expect(isCopyValue(options?.[option]), `${where}.options.${option}`).toBe(true)
            }
          }
        }
        if (definition.followUp) {
          const followUp = copy?.followUp as Copy | undefined
          for (const field of ['title', 'description', 'cta']) {
            expect(isCopyValue(followUp?.[field]), `${name} ${definition.i18nKey}.followUp.${field}`).toBe(true)
          }
        }
      }
    }
  })

  it('mirrors gendered copy in both locales so EN never falls back to Polish', () => {
    const isPair = (value: unknown) => Boolean(value && typeof value === 'object' && 'm' in (value as Copy))
    const walk = (pl: unknown, en: unknown, path: string) => {
      if (isPair(pl) || isPair(en)) {
        expect(isPair(pl) && isPair(en), path).toBe(true)
        return
      }
      if (pl && typeof pl === 'object') {
        for (const key of Object.keys(pl as Copy)) walk((pl as Copy)[key], (en as Copy)?.[key], `${path}.${key}`)
      }
    }
    for (const definition of MICRO_EXERCISES) {
      walk(
        microCopy(plWizards)[definition.i18nKey],
        microCopy(enWizards)[definition.i18nKey],
        definition.i18nKey,
      )
    }
  })
})
