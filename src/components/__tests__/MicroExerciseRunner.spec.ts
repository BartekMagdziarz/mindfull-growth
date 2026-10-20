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
    template:
      '<button type="button" :disabled="disabled" @click="$emit(\'click\')"><slot /></button>',
  },
  EmotionGroupPicker: { template: '<div />' },
  MicroBreathTimer: { template: '<div />' },
  ExerciseStepWhy: { template: '<div />' },
}

function renderMicro(slug: string, preset: MicroPreset = {}) {
  const definition = getMicroExercise(slug)!
  return render(MicroExerciseRunner, { props: { definition, preset }, global: { stubs } })
}

function seedEntries(
  entries: Array<
    Pick<MicroExerciseEntry, 'exerciseSlug' | 'responses'> & { id?: string; createdAt?: string }
  >
) {
  const store = useMicroExerciseEntryStore()
  seeded.splice(0, seeded.length)
  seeded.push(
    ...entries.map((entry, index) => ({
      id: entry.id ?? `e${index}`,
      createdAt: entry.createdAt ?? `2026-09-2${index}T10:00:00.000Z`,
      updatedAt: entry.createdAt ?? `2026-09-2${index}T10:00:00.000Z`,
      exerciseSlug: entry.exerciseSlug,
      responses: entry.responses,
    }))
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

  it('an anger moment opens the anger branch only: the quick five, "Save now" after the strength, the prose optional', async () => {
    const { emitted, container } = renderMicro('moments', { kind: 'anger' })
    await fireEvent.click(screen.getByRole('radio', { name: 'Yes' }))
    // hadMoment, angerReaction, noticed, angerResponse, angerStrength, situation, angerBody, thought, need, helped
    expect(container.querySelectorAll('[title]')).toHaveLength(10)
    expect(screen.queryByRole('button', { name: 'Save now' })).toBeNull()

    await fireEvent.click(screen.getByRole('button', { name: 'Next' })) // → what took the wheel
    const sharp = screen.getByRole('radio', { name: /Sharper/ })
    expect(sharp.textContent).toContain('sarcasm')
    await fireEvent.click(sharp)
    await fireEvent.click(screen.getByRole('button', { name: 'Next' })) // → noticed
    await fireEvent.click(screen.getByRole('radio', { name: 'As it happened' }))
    await fireEvent.click(screen.getByRole('button', { name: 'Next' })) // → what I did instead
    await fireEvent.click(screen.getByRole('button', { name: 'A pause' }))
    await fireEvent.click(screen.getByRole('button', { name: 'Next' })) // → strength: empty until tapped
    const scale = screen.getByRole('radiogroup', { name: 'How strong was the anger?' })
    expect(scale.querySelectorAll('[aria-checked="true"]')).toHaveLength(0)
    expect(screen.queryByRole('button', { name: 'Save now' })).toBeNull()
    await fireEvent.click(screen.getByRole('radio', { name: '3' }))
    await fireEvent.click(screen.getByRole('button', { name: 'Save now' }))

    expect(emitted().saved?.[0]).toEqual([
      {
        responses: {
          kind: 'anger',
          hadMoment: 'yes',
          angerReaction: 'sharp',
          noticed: 'during',
          angerResponse: ['pause'],
          angerStrength: 3,
        },
      },
    ])
  })

  it('an anxious moment runs its own quick five with the anxiety reactions and moves', async () => {
    const { emitted, container } = renderMicro('moments', { kind: 'anxiety' })
    await fireEvent.click(screen.getByRole('radio', { name: 'Yes' }))
    // hadMoment, anxietyReaction, noticed, anxietyResponse, anxietyStrength, situation, anxietyBody, thought, outcome, helped
    expect(container.querySelectorAll('[title]')).toHaveLength(10)
    await fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    await fireEvent.click(screen.getByRole('radio', { name: /Checking/ }))
    await fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    await fireEvent.click(screen.getByRole('radio', { name: 'A moment later' }))
    await fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    await fireEvent.click(screen.getByRole('button', { name: 'No checking' }))
    await fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    await fireEvent.click(screen.getByRole('radio', { name: '2' }))
    await fireEvent.click(screen.getByRole('button', { name: 'Save now' }))
    expect(emitted().saved?.[0]).toEqual([
      {
        responses: {
          kind: 'anxiety',
          hadMoment: 'yes',
          anxietyReaction: 'check',
          noticed: 'soon',
          anxietyResponse: ['noCheck'],
          anxietyStrength: 2,
        },
      },
    ])
  })
})

describe('MicroExerciseRunner: shame branch, hints and entry picks', () => {
  it('the shame branch (v3) starts with the quick five and offers "Save now" after the strength', async () => {
    const { emitted, container } = renderMicro('moments', { kind: 'shame' })
    await fireEvent.click(screen.getByRole('radio', { name: 'Yes' }))
    // hadMoment, compass, noticed, response, strength, situation, about, body, criticSaid, kindVoice, nextTime
    expect(container.querySelectorAll('[title]')).toHaveLength(11)
    expect(screen.queryByRole('button', { name: 'Save now' })).toBeNull()
    await fireEvent.click(screen.getByRole('button', { name: 'Next' })) // → compass (part names)
    const critic = screen.getByRole('radio', { name: /The Critic/ })
    expect(critic.textContent).toContain('attacking myself')
    await fireEvent.click(critic)
    await fireEvent.click(screen.getByRole('button', { name: 'Next' })) // → noticed
    await fireEvent.click(screen.getByRole('radio', { name: 'A moment later' }))
    await fireEvent.click(screen.getByRole('button', { name: 'Next' })) // → response
    await fireEvent.click(screen.getByRole('button', { name: '"That\'s a part, not me"' }))
    expect(screen.queryByRole('button', { name: 'Save now' })).toBeNull()
    await fireEvent.click(screen.getByRole('button', { name: 'Next' })) // → strength: everything ahead is optional
    // The stack starts empty, so "Save now" waits for the rating too.
    expect(screen.queryByRole('button', { name: 'Save now' })).toBeNull()
    await fireEvent.click(screen.getByRole('radio', { name: '3' }))
    expect(screen.getByRole('button', { name: 'Save now' })).toBeTruthy()
    await fireEvent.click(screen.getByRole('button', { name: 'Save now' }))
    expect(emitted().saved?.[0]).toEqual([
      {
        responses: {
          kind: 'shame',
          hadMoment: 'yes',
          compass: 'attackSelf',
          noticed: 'soon',
          response: ['unblend'],
          strength: 3,
        },
      },
    ])
  })

  it('the shame tail is optional and sorts the moment with the verb under each answer', async () => {
    const { container } = renderMicro('moments', { kind: 'shame' })
    await fireEvent.click(screen.getByRole('radio', { name: 'Yes' }))
    await fireEvent.click(screen.getByRole('button', { name: 'Next' })) // → compass
    await fireEvent.click(screen.getByRole('radio', { name: /The Hider/ }))
    await fireEvent.click(screen.getByRole('button', { name: 'Next' })) // → noticed
    await fireEvent.click(screen.getByRole('radio', { name: 'As it happened' }))
    await fireEvent.click(screen.getByRole('button', { name: 'Next' })) // → response
    await fireEvent.click(screen.getByRole('button', { name: 'Breath' }))
    await fireEvent.click(screen.getByRole('button', { name: 'Next' })) // → strength
    await fireEvent.click(screen.getByRole('button', { name: 'Next' })) // → situation: optional for shame
    expect(screen.getByRole('button', { name: 'Next' })).toHaveProperty('disabled', false)
    await fireEvent.click(screen.getByRole('button', { name: 'Next' })) // → about (optional)
    const demand = screen.getByRole('radio', { name: /Who I should be/ })
    expect(demand.textContent).toContain('check')
    expect(
      screen.getByRole('radio', { name: /I don't know yet/ }).querySelector('.micro-choice__hint')
    ).toBeNull()
    expect(container.querySelectorAll('[title]')).toHaveLength(11)
  })

  it('the "other" branch keeps its required situation and behaviour and never offers "Save now"', async () => {
    const { container } = renderMicro('moments', { kind: 'other' })
    await fireEvent.click(screen.getByRole('radio', { name: 'Yes' }))
    await fireEvent.click(screen.getByRole('button', { name: 'Next' })) // → situation (required)
    expect(screen.getByRole('button', { name: 'Next' })).toHaveProperty('disabled', true)
    await fireEvent.update(container.querySelector('textarea')!, 'x')
    await fireEvent.click(screen.getByRole('button', { name: 'Next' })) // → body (optional)
    expect(screen.queryByRole('button', { name: 'Save now' })).toBeNull()
  })

  it('quotes the latest matching entry under the step, only while its "when" holds', async () => {
    seedEntries([
      {
        exerciseSlug: 'shame-map',
        responses: { bodySigns: ['old'] },
        createdAt: '2026-09-01T10:00:00.000Z',
      },
      {
        exerciseSlug: 'shame-map',
        responses: { bodySigns: ['hot face', 'lowered eyes'] },
        createdAt: '2026-09-20T10:00:00.000Z',
      },
    ])
    const { container } = renderMicro('moments', { kind: 'shame' })
    await fireEvent.click(screen.getByRole('radio', { name: 'Yes' }))
    await fireEvent.click(screen.getByRole('button', { name: 'Next' })) // → compass
    await fireEvent.click(screen.getByRole('radio', { name: /The Hider/ }))
    await fireEvent.click(screen.getByRole('button', { name: 'Next' })) // → noticed
    await fireEvent.click(screen.getByRole('radio', { name: 'Hours later' }))
    await fireEvent.click(screen.getByRole('button', { name: 'Next' })) // → response (no shame-response entry → no hint)
    expect(container.querySelector('[data-testid="micro-hint"]')).toBeNull()
    await fireEvent.click(screen.getByRole('button', { name: 'Breath' }))
    await fireEvent.click(screen.getByRole('button', { name: 'Next' })) // → strength
    await fireEvent.click(screen.getByRole('button', { name: 'Next' })) // → situation
    expect(container.querySelector('[data-testid="micro-hint"]')).toBeNull()
    await fireEvent.click(screen.getByRole('button', { name: 'Next' })) // → about
    await fireEvent.click(screen.getByRole('button', { name: 'Next' })) // → body: quotes the newest map
    const hint = container.querySelector('[data-testid="micro-hint"]')!
    expect(hint.textContent).toContain('From your shame map')
    expect(hint.textContent).toContain('hot face, lowered eyes')
    expect(hint.textContent).not.toContain('old')
  })

  it('an anger moment quotes the anger map, never the shame map, on its body step', async () => {
    seedEntries([
      { exerciseSlug: 'shame-map', responses: { bodySigns: ['hot face'] } },
      { exerciseSlug: 'anger-map', responses: { bodySigns: ['tight shoulders'] } },
    ])
    const { container } = renderMicro('moments', { kind: 'anger' })
    await fireEvent.click(screen.getByRole('radio', { name: 'Yes' }))
    await fireEvent.click(screen.getByRole('button', { name: 'Next' })) // → reaction
    await fireEvent.click(screen.getByRole('radio', { name: /Outburst/ }))
    await fireEvent.click(screen.getByRole('button', { name: 'Next' })) // → noticed
    await fireEvent.click(screen.getByRole('radio', { name: 'Hours later' }))
    await fireEvent.click(screen.getByRole('button', { name: 'Next' })) // → moves (no pause plan → no hint)
    expect(container.querySelector('[data-testid="micro-hint"]')).toBeNull()
    await fireEvent.click(screen.getByRole('button', { name: 'Breath' }))
    await fireEvent.click(screen.getByRole('button', { name: 'Next' })) // → strength
    await fireEvent.click(screen.getByRole('radio', { name: '4' }))
    await fireEvent.click(screen.getByRole('button', { name: 'Next' })) // → situation (optional)
    await fireEvent.click(screen.getByRole('button', { name: 'Next' })) // → body: the anger map
    const hint = container.querySelector('[data-testid="micro-hint"]')!
    expect(hint.textContent).toContain('From your anger map')
    expect(hint.textContent).toContain('tight shoulders')
    expect(hint.textContent).not.toContain('hot face')
  })

  it('entryPick lists matching moments newest first, saves the picked id and feeds picked hints', async () => {
    seedEntries([
      {
        id: 'anger',
        exerciseSlug: 'moments',
        responses: { kind: 'anger', hadMoment: 'yes', situation: 'cut off' },
        createdAt: '2026-09-25T10:00:00.000Z',
      },
      {
        id: 'quiet',
        exerciseSlug: 'moments',
        responses: { kind: 'shame', hadMoment: 'none' },
        createdAt: '2026-09-25T11:00:00.000Z',
      },
      {
        id: 's1',
        exerciseSlug: 'moments',
        responses: {
          kind: 'shame',
          hadMoment: 'yes',
          situation: 'Asked a question',
          about: 'demand',
        },
        createdAt: '2026-09-24T10:00:00.000Z',
      },
      {
        id: 's2',
        exerciseSlug: 'moments',
        responses: { kind: 'shame', hadMoment: 'yes', situation: 'Cried at work' },
        createdAt: '2026-09-25T12:00:00.000Z',
      },
    ])
    vi.useFakeTimers({ now: new Date('2026-09-26T12:00:00.000Z'), toFake: ['Date'] })
    try {
      const { emitted, container } = renderMicro('shame-or-guilt')
      const cards = screen.getAllByRole('radio')
      expect(cards.map(card => card.textContent)).toEqual([
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
      await fireEvent.update(
        container.querySelector('textarea')!,
        'I feel bad because I should have known'
      )
      await fireEvent.click(screen.getByRole('button', { name: 'Next' })) // → about (multiple)
      await fireEvent.click(screen.getByRole('button', { name: /Who I should be/ }))
      await fireEvent.click(screen.getByRole('button', { name: 'Next' })) // → friendTest
      await fireEvent.update(
        container.querySelector('textarea')!,
        'No, I would tell them it is fine'
      )
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

describe('MicroExerciseRunner v3 features', () => {
  it('a soft minimum shows a counter and a note but never blocks', async () => {
    const { container } = renderMicro('letter-to-future-self')
    await fireEvent.click(screen.getByRole('button', { name: 'Next' })) // → letter (minLength 300)
    const counter = container.querySelector('[data-testid="micro-minlength"]')!
    expect(counter.textContent).toContain('0 / 300')
    expect(counter.textContent).toContain('Worth writing a little more')
    await fireEvent.update(container.querySelector('textarea')!, 'short')
    expect(container.querySelector('[data-testid="micro-minlength"]')!.textContent).toContain(
      '5 / 300'
    )
    expect(screen.getByRole('button', { name: 'Next' })).toHaveProperty('disabled', false)
  })

  it('a prefill fills the field and keeps the step, unlike a preset', async () => {
    const definition = getMicroExercise('moments')!
    const { container } = render(MicroExerciseRunner, {
      props: {
        definition,
        preset: { kind: 'shame' },
        prefill: { response: ['breath', 'contact'], situation: 'At lunch' },
      },
      global: { stubs },
    })
    await fireEvent.click(screen.getByRole('radio', { name: 'Yes' }))
    // the prefilled steps still have dots (they are shown), the preset one doesn't
    expect(container.querySelectorAll('[title]')).toHaveLength(11)
    await fireEvent.click(screen.getByRole('button', { name: 'Next' })) // → compass
    await fireEvent.click(screen.getByRole('radio', { name: /The Hider/ }))
    await fireEvent.click(screen.getByRole('button', { name: 'Next' })) // → noticed
    await fireEvent.click(screen.getByRole('radio', { name: 'Only now' }))
    await fireEvent.click(screen.getByRole('button', { name: 'Next' })) // → response: prefilled
    expect(screen.getByRole('button', { name: 'Breath' }).getAttribute('aria-pressed')).toBe('true')
    expect(
      screen.getByRole('button', { name: 'A move towards contact' }).getAttribute('aria-pressed')
    ).toBe('true')
    await fireEvent.click(screen.getByRole('button', { name: 'Next' })) // → strength
    await fireEvent.click(screen.getByRole('button', { name: 'Next' })) // → situation: prefilled, editable
    expect((container.querySelector('textarea') as HTMLTextAreaElement).value).toBe('At lunch')
  })

  it('"Too much for today" saves what is there with the marker and emits tooMuch', async () => {
    const { emitted, container } = renderMicro('compassionate-self')
    expect(screen.getByRole('button', { name: 'Too much for today' })).toBeTruthy()
    await fireEvent.click(screen.getByRole('button', { name: 'Next' })) // → breath (optional)
    await fireEvent.click(screen.getByRole('button', { name: 'Next' })) // → posture
    await fireEvent.update(container.querySelector('textarea')!, 'Upright')
    await fireEvent.click(screen.getByRole('button', { name: 'Too much for today' }))
    const saved = (
      emitted().saved as unknown as Array<[{ responses: Record<string, unknown> }]>
    )[0]![0]
    expect(saved.responses.tooMuchToday).toBe('yes')
    expect(saved.responses.posture).toBe('Upright')
    expect(emitted().tooMuch).toHaveLength(1)
  })

  it('labels compass options with the user’s own part names when a tagged part exists', async () => {
    const { useIFSPartStore } = await import('@/stores/ifsPart.store')
    const parts = useIFSPartStore()
    parts.parts = [
      {
        id: 'p1',
        createdAt: '2026-10-01T10:00:00.000Z',
        updatedAt: '2026-10-01T10:00:00.000Z',
        name: 'Sędzia',
        role: 'manager',
        bodyLocations: [],
        emotionIds: [],
        lifeAreaIds: [],
        tags: ['shame-compass:attackSelf'],
      },
    ]
    renderMicro('moments', { kind: 'shame' })
    await fireEvent.click(screen.getByRole('radio', { name: 'Yes' }))
    await fireEvent.click(screen.getByRole('button', { name: 'Next' })) // → compass
    expect(screen.getByRole('radio', { name: /Sędzia \(The Critic\)/ })).toBeTruthy()
    expect(screen.getByRole('radio', { name: /The Hider/ })).toBeTruthy()
  })

  it('optionsFrom lists the practices of the open paths before the static options', async () => {
    const { useProgramEnrollmentStore } = await import('@/stores/programEnrollment.store')
    const store = useProgramEnrollmentStore()
    store.enrollments = [
      {
        id: 'enr',
        programSlug: 'anger-signal',
        status: 'active',
        startedAt: '2026-09-01T10:00:00.000Z',
        currentStepIndex: 3,
        completedSteps: [],
        createdAt: '2026-09-01T10:00:00.000Z',
        updatedAt: '2026-09-01T10:00:00.000Z',
      },
    ]
    renderMicro('maintenance-plan')
    const options = screen
      .getAllByRole('button')
      .filter(b => b.classList.contains('micro-choice__option'))
    // anger path practices (paced-breathing, moment-anger) then the static plan-for-a-hard-moment
    expect(options.map(b => b.textContent?.trim())).toEqual([
      expect.stringMatching(/breathing/i),
      expect.stringMatching(/moment of anger/i),
      'My plan for a hard moment',
    ])
    await fireEvent.click(options[1]!)
    expect(options[1]!.getAttribute('aria-pressed')).toBe('true')
  })

  it('a full hint quotes the whole letter in "Powrót"', async () => {
    const long = 'A'.repeat(400)
    seedEntries([
      { exerciseSlug: 'letter-to-future-self', responses: { letter: long, returnIn: 'w8' } },
    ])
    // The path presets the kind (`?kind=`), so the letter is the first visible step.
    const { container } = renderMicro('path-return', { kind: 'shame' })
    const hint = container.querySelector('[data-testid="micro-hint"]')!
    expect(hint.textContent).toContain(long)
  })

  it('a 1–5 scale is a row of numbers with the middle preselected; a tap changes the saved value', async () => {
    const { emitted } = renderMicro('moments', { kind: 'shame' })
    await fireEvent.click(screen.getByRole('radio', { name: 'Yes' }))
    await fireEvent.click(screen.getByRole('button', { name: 'Next' })) // → compass
    await fireEvent.click(screen.getByRole('radio', { name: /The Hider/ }))
    await fireEvent.click(screen.getByRole('button', { name: 'Next' })) // → noticed
    await fireEvent.click(screen.getByRole('radio', { name: 'As it happened' }))
    await fireEvent.click(screen.getByRole('button', { name: 'Next' })) // → response
    await fireEvent.click(screen.getByRole('button', { name: 'Breath' }))
    await fireEvent.click(screen.getByRole('button', { name: 'Next' })) // → strength
    // The cloud stack starts empty: nothing is checked and the step waits for a tap.
    const scale = screen.getByRole('radiogroup', { name: 'How strong was the shame?' })
    expect(scale.querySelectorAll('[role="radio"]')).toHaveLength(5)
    expect(scale.querySelectorAll('[aria-checked="true"]')).toHaveLength(0)
    expect((screen.getByRole('button', { name: 'Next' }) as HTMLButtonElement).disabled).toBe(true)
    expect(screen.queryByRole('button', { name: 'Save now' })).toBeNull()
    await fireEvent.click(screen.getByRole('radio', { name: '5' }))
    expect(screen.getByRole('radio', { name: '5' }).getAttribute('aria-checked')).toBe('true')
    await fireEvent.click(screen.getByRole('button', { name: 'Save now' }))
    expect(emitted().saved?.[0]).toEqual([
      expect.objectContaining({ responses: expect.objectContaining({ strength: 5 }) }),
    ])
  })

  it('lays choice cells out by option count and hides progress while only one step is known', async () => {
    const { container } = renderMicro('moments', { kind: 'shame' })
    // Only hadMoment is visible until it is answered: no lone progress pill.
    expect(container.querySelector('.micro-steps')).toBeNull()
    const pair = container.querySelector<HTMLElement>('.micro-choice')!
    expect(pair.classList.contains('micro-choice--pair')).toBe(true)
    expect(pair.style.getPropertyValue('--micro-cols')).toBe('2')
    await fireEvent.click(screen.getByRole('radio', { name: 'Yes' }))
    expect(container.querySelector('.micro-steps small')?.textContent).toBe('1/11')
    await fireEvent.click(screen.getByRole('button', { name: 'Next' })) // → compass (5)
    expect(
      container.querySelector<HTMLElement>('.micro-choice')!.style.getPropertyValue('--micro-cols')
    ).toBe('5')
    await fireEvent.click(screen.getByRole('radio', { name: /The Hider/ }))
    await fireEvent.click(screen.getByRole('button', { name: 'Next' })) // → noticed (4)
    expect(
      container.querySelector<HTMLElement>('.micro-choice')!.style.getPropertyValue('--micro-cols')
    ).toBe('4')
    expect(container.querySelector('.micro-choice--pair')).toBeNull()
    await fireEvent.click(screen.getByRole('radio', { name: 'Hours later' }))
    await fireEvent.click(screen.getByRole('button', { name: 'Next' })) // → response (14)
    expect(
      container.querySelector<HTMLElement>('.micro-choice')!.style.getPropertyValue('--micro-cols')
    ).toBe('2')
  })

  it('done progress dots lead back to their step; current and future dots are inert', async () => {
    const { container } = renderMicro('moments', { kind: 'shame' })
    await fireEvent.click(screen.getByRole('radio', { name: 'Yes' }))
    await fireEvent.click(screen.getByRole('button', { name: 'Next' })) // → compass
    await fireEvent.click(screen.getByRole('radio', { name: /The Hider/ }))
    await fireEvent.click(screen.getByRole('button', { name: 'Next' })) // → noticed
    const dots = Array.from(container.querySelectorAll<HTMLButtonElement>('.micro-steps button'))
    expect(dots.map(d => d.disabled)).toEqual([false, false, ...Array(9).fill(true)])
    expect(dots[2]!.getAttribute('aria-current')).toBe('step')
    expect(container.querySelector('.micro-steps small')?.textContent).toBe('3/11')
    await fireEvent.click(dots[0]!)
    expect(screen.getByRole('radio', { name: 'Yes' }).getAttribute('aria-checked')).toBe('true')
    expect(container.querySelector('.micro-steps small')?.textContent).toBe('1/11')
  })
})
