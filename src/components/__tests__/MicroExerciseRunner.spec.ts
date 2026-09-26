import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/vue'
import { createPinia, setActivePinia } from 'pinia'
import MicroExerciseRunner from '../exercises/MicroExerciseRunner.vue'
import { getMicroExercise } from '@/data/microExercises'
import type { MicroExerciseEntry, MicroPreset } from '@/domain/microExercises'
import { useMicroExerciseEntryStore } from '@/stores/microExerciseEntry.store'
import { useUserPreferencesStore } from '@/stores/userPreferences.store'

// The runner reads earlier entries (hints, entry picks) from the store,
// which hydrates from the repository on mount; the repository needs a
// user database, so it is stubbed to serve the entries seeded per test.
const seeded: MicroExerciseEntry[] = []
vi.mock('@/repositories/microExerciseEntryDexieRepository', () => ({
  microExerciseEntryDexieRepository: {
    getAll: vi.fn(async () => [...seeded]),
    create: vi.fn(),
    getBySlug: vi.fn(async () => []),
    delete: vi.fn(),
  },
}))

const stubs = {
  AppCard: { template: '<div><slot /></div>' },
  AppButton: {
    props: ['disabled', 'variant'],
    // Declared so the root click is not forwarded a second time as a native listener.
    emits: ['click'],
    template: '<button type="button" :disabled="disabled" @click="$emit(\'click\')"><slot /></button>',
  },
  EmotionGroupPicker: { template: '<div />' },
  MicroBreathTimer: { template: '<div />' },
  ExerciseStepWhy: { template: '<div />' },
}

function renderMicro(slug: string, preset: MicroPreset = {}) {
  const definition = getMicroExercise(slug)!
  return render(MicroExerciseRunner, { props: { definition, preset }, global: { stubs } })
}

function seedEntries(entries: Array<Pick<MicroExerciseEntry, 'exerciseSlug' | 'responses'> & { id?: string; createdAt?: string }>) {
  const store = useMicroExerciseEntryStore()
  seeded.splice(0, seeded.length)
  seeded.push(
    ...entries.map((entry, index) => ({
      id: entry.id ?? `e${index}`,
      createdAt: entry.createdAt ?? `2026-09-2${index}T10:00:00.000Z`,
      updatedAt: entry.createdAt ?? `2026-09-2${index}T10:00:00.000Z`,
      exerciseSlug: entry.exerciseSlug,
      responses: entry.responses,
    })),
  )
  store.entries = entries.map((entry, index) => ({
    id: entry.id ?? `e${index}`,
    createdAt: entry.createdAt ?? `2026-09-2${index}T10:00:00.000Z`,
    updatedAt: entry.createdAt ?? `2026-09-2${index}T10:00:00.000Z`,
    exerciseSlug: entry.exerciseSlug,
    responses: entry.responses,
  }))
}

beforeEach(() => {
  seeded.splice(0, seeded.length)
  setActivePinia(createPinia())
  // Copy assertions below are English.
  useUserPreferencesStore().$patch({ locale: 'en' })
})

describe('MicroExerciseRunner choice branching (Momenty, anger variant)', () => {
  it('requires a choice before moving on', async () => {
    renderMicro('moments', { kind: 'anger' })
    expect(screen.getByRole('button', { name: 'Next' })).toHaveProperty('disabled', true)
    await fireEvent.click(screen.getByRole('radio', { name: 'No' }))
    expect(screen.getByRole('button', { name: 'Next' })).toHaveProperty('disabled', false)
  })

  it('a calm day takes two steps and saves the preset kind with the visible branch only', async () => {
    const { emitted, container } = renderMicro('moments', { kind: 'anger' })
    await fireEvent.click(screen.getByRole('radio', { name: 'No' }))
    // The preset `kind` step is not part of the flow (no dot for it).
    expect(container.querySelectorAll('[title]')).toHaveLength(2)
    await fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    // quietDay is optional and last: Save is available straight away.
    await fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(emitted().saved?.[0]).toEqual([{ responses: { kind: 'anger', hadMoment: 'none' } }])
  })

  it('an anger moment opens the anger branch only and drops the calm-day step', async () => {
    const { emitted, container } = renderMicro('moments', { kind: 'anger' })
    await fireEvent.click(screen.getByRole('radio', { name: 'Yes' }))
    // hadMoment + situation, intensity, body, thought, behavior, helped
    expect(container.querySelectorAll('[title]')).toHaveLength(7)

    await fireEvent.click(screen.getByRole('button', { name: 'Next' })) // → situation
    await fireEvent.update(container.querySelector('textarea')!, 'Cut off in a meeting')
    await fireEvent.click(screen.getByRole('button', { name: 'Next' })) // → intensity
    await fireEvent.click(screen.getByRole('button', { name: 'Next' })) // → body (optional)
    await fireEvent.click(screen.getByRole('button', { name: 'Next' })) // → thought (optional)
    await fireEvent.update(container.querySelector('textarea')!, 'He does it on purpose')
    await fireEvent.click(screen.getByRole('button', { name: 'Next' })) // → behavior
    await fireEvent.update(container.querySelector('textarea')!, 'Raised my voice')
    await fireEvent.click(screen.getByRole('button', { name: 'Next' })) // → helped (optional, last)
    await fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect(emitted().saved?.[0]).toEqual([
      {
        responses: {
          kind: 'anger',
          hadMoment: 'yes',
          situation: 'Cut off in a meeting',
          intensity: 5,
          thought: 'He does it on purpose',
          behavior: 'Raised my voice',
        },
      },
    ])
  })
})

describe('MicroExerciseRunner: shame branch, hints and entry picks', () => {
  it('the shame branch sorts the moment and shows the verb under each answer', async () => {
    const { container } = renderMicro('moments', { kind: 'shame' })
    await fireEvent.click(screen.getByRole('radio', { name: 'Yes' }))
    // hadMoment, situation, about, compass, response, body, criticSaid, kindVoice, nextTime
    expect(container.querySelectorAll('[title]')).toHaveLength(9)
    await fireEvent.click(screen.getByRole('button', { name: 'Next' })) // → situation
    await fireEvent.update(container.querySelector('textarea')!, 'Asked a question')
    await fireEvent.click(screen.getByRole('button', { name: 'Next' })) // → about
    const demand = screen.getByRole('radio', { name: /Who I should be/ })
    expect(demand.textContent).toContain('check')
    expect(screen.getByRole('radio', { name: /I don't know yet/ }).querySelector('.micro-choice__hint')).toBeNull()
  })

  it('quotes the latest matching entry under the step, only while its "when" holds', async () => {
    seedEntries([
      { exerciseSlug: 'shame-map', responses: { bodySigns: ['old'] }, createdAt: '2026-09-01T10:00:00.000Z' },
      { exerciseSlug: 'shame-map', responses: { bodySigns: ['hot face', 'lowered eyes'] }, createdAt: '2026-09-20T10:00:00.000Z' },
    ])
    const { container } = renderMicro('moments', { kind: 'shame' })
    await fireEvent.click(screen.getByRole('radio', { name: 'Yes' }))
    await fireEvent.click(screen.getByRole('button', { name: 'Next' })) // → situation
    expect(container.querySelector('[data-testid="micro-hint"]')).toBeNull()
    await fireEvent.update(container.querySelector('textarea')!, 'x')
    await fireEvent.click(screen.getByRole('button', { name: 'Next' })) // → about
    await fireEvent.click(screen.getByRole('radio', { name: /What happened to me/ }))
    await fireEvent.click(screen.getByRole('button', { name: 'Next' })) // → compass
    await fireEvent.click(screen.getByRole('radio', { name: 'Withdrawing' }))
    await fireEvent.click(screen.getByRole('button', { name: 'Next' })) // → response (no shame-response entry → no hint)
    expect(container.querySelector('[data-testid="micro-hint"]')).toBeNull()
    await fireEvent.click(screen.getByRole('button', { name: 'Breath' }))
    await fireEvent.click(screen.getByRole('button', { name: 'Next' })) // → body: quotes the newest map
    const hint = container.querySelector('[data-testid="micro-hint"]')!
    expect(hint.textContent).toContain('From your shame map')
    expect(hint.textContent).toContain('hot face, lowered eyes')
    expect(hint.textContent).not.toContain('old')
  })

  it('an anger moment never quotes the shame map on the shared body step', async () => {
    seedEntries([{ exerciseSlug: 'shame-map', responses: { bodySigns: ['hot face'] } }])
    const { container } = renderMicro('moments', { kind: 'anger' })
    await fireEvent.click(screen.getByRole('radio', { name: 'Yes' }))
    await fireEvent.click(screen.getByRole('button', { name: 'Next' })) // → situation
    await fireEvent.update(container.querySelector('textarea')!, 'x')
    await fireEvent.click(screen.getByRole('button', { name: 'Next' })) // → intensity
    await fireEvent.click(screen.getByRole('button', { name: 'Next' })) // → body
    expect(container.querySelector('[data-testid="micro-hint"]')).toBeNull()
  })

  it('entryPick lists matching moments newest first, saves the picked id and feeds picked hints', async () => {
    seedEntries([
      { id: 'anger', exerciseSlug: 'moments', responses: { kind: 'anger', hadMoment: 'yes', situation: 'cut off' }, createdAt: '2026-09-25T10:00:00.000Z' },
      { id: 'quiet', exerciseSlug: 'moments', responses: { kind: 'shame', hadMoment: 'none' }, createdAt: '2026-09-25T11:00:00.000Z' },
      { id: 's1', exerciseSlug: 'moments', responses: { kind: 'shame', hadMoment: 'yes', situation: 'Asked a question', about: 'demand' }, createdAt: '2026-09-24T10:00:00.000Z' },
      { id: 's2', exerciseSlug: 'moments', responses: { kind: 'shame', hadMoment: 'yes', situation: 'Cried at work' }, createdAt: '2026-09-25T12:00:00.000Z' },
    ])
    vi.useFakeTimers({ now: new Date('2026-09-26T12:00:00.000Z'), toFake: ['Date'] })
    try {
      const { emitted, container } = renderMicro('shame-or-guilt')
      const cards = screen.getAllByRole('radio')
      expect(cards.map((card) => card.textContent)).toEqual([
        expect.stringContaining('Cried at work'),
        expect.stringContaining('Asked a question'),
      ])
      // The choice answer of the source definition shows as its label, not its id.
      expect(cards[1]!.textContent).toContain('Who I should be')
      // Optional: Next works without a pick; picking one enables the hint on the next step.
      await fireEvent.click(cards[1]!)
      expect(cards[1]).toHaveProperty('ariaChecked', 'true')
      await fireEvent.click(screen.getByRole('button', { name: 'Next' })) // → facts
      const hint = container.querySelector('[data-testid="micro-hint"]')!
      expect(hint.textContent).toContain('From this moment')
      expect(hint.textContent).toContain('Asked a question')
      await fireEvent.update(container.querySelector('textarea')!, 'I asked what the acronym meant')
      await fireEvent.click(screen.getByRole('button', { name: 'Next' })) // → statement
      await fireEvent.update(container.querySelector('textarea')!, 'I feel bad because I should have known')
      await fireEvent.click(screen.getByRole('button', { name: 'Next' })) // → about (multiple)
      await fireEvent.click(screen.getByRole('button', { name: /Who I should be/ }))
      await fireEvent.click(screen.getByRole('button', { name: 'Next' })) // → friendTest
      await fireEvent.update(container.querySelector('textarea')!, 'No, I would tell them it is fine')
      await fireEvent.click(screen.getByRole('button', { name: 'Next' })) // → whoseDemand
      await fireEvent.update(container.querySelector('textarea')!, 'School')
      await fireEvent.click(screen.getByRole('button', { name: 'Next' })) // → fairDemand
      await fireEvent.update(container.querySelector('textarea')!, 'It is enough to ask')
      await fireEvent.click(screen.getByRole('button', { name: 'Next' })) // → kindVoice (last)
      await fireEvent.update(container.querySelector('textarea')!, 'You asked, that took courage')
      await fireEvent.click(screen.getByRole('button', { name: 'Save' }))
      expect(emitted().saved?.[0]).toEqual([
        {
          responses: {
            episode: 's1',
            facts: 'I asked what the acronym meant',
            statement: 'I feel bad because I should have known',
            about: ['demand'],
            friendTest: 'No, I would tell them it is fine',
            whoseDemand: 'School',
            fairDemand: 'It is enough to ask',
            kindVoice: 'You asked, that took courage',
          },
        },
      ])
    } finally {
      vi.useRealTimers()
    }
  })

  it('entryPick shows the empty copy when nothing matches', () => {
    renderMicro('shame-or-guilt')
    expect(screen.queryAllByRole('radio')).toHaveLength(0)
    expect(screen.getByText(/no moments of shame/i)).toBeTruthy()
  })
})
