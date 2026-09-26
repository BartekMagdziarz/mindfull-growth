import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/vue'
import MicroExerciseRunner from '../exercises/MicroExerciseRunner.vue'
import { getMicroExercise } from '@/data/microExercises'

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
}

function renderAngerLog() {
  const definition = getMicroExercise('anger-log')!
  return render(MicroExerciseRunner, { props: { definition }, global: { stubs } })
}

describe('MicroExerciseRunner choice branching', () => {
  it('requires a choice before moving on', async () => {
    renderAngerLog()
    expect(screen.getByRole('button', { name: 'Next' })).toHaveProperty('disabled', true)
    await fireEvent.click(screen.getByRole('radio', { name: 'No' }))
    expect(screen.getByRole('button', { name: 'Next' })).toHaveProperty('disabled', false)
  })

  it('a calm day takes two steps and saves only the visible branch', async () => {
    const { emitted, container } = renderAngerLog()
    await fireEvent.click(screen.getByRole('radio', { name: 'No' }))
    expect(container.querySelectorAll('[title]')).toHaveLength(2)
    await fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    // quietDay is optional and last: Save is available straight away.
    await fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(emitted().saved?.[0]).toEqual([{ responses: { hadEpisode: 'none' } }])
  })

  it('an anger episode opens the full branch and drops the calm-day step', async () => {
    const { emitted, container } = renderAngerLog()
    await fireEvent.click(screen.getByRole('radio', { name: 'Yes, strong' }))
    // hadEpisode + intensity, trigger, firstSign, thought, behavior, helped
    expect(container.querySelectorAll('[title]')).toHaveLength(7)

    await fireEvent.click(screen.getByRole('button', { name: 'Next' })) // → intensity
    await fireEvent.click(screen.getByRole('button', { name: 'Next' })) // → trigger
    await fireEvent.update(container.querySelector('textarea')!, 'Cut off in a meeting')
    await fireEvent.click(screen.getByRole('button', { name: 'Next' })) // → firstSign (optional)
    await fireEvent.click(screen.getByRole('button', { name: 'Next' })) // → thought
    await fireEvent.update(container.querySelector('textarea')!, 'He does it on purpose')
    await fireEvent.click(screen.getByRole('button', { name: 'Next' })) // → behavior
    await fireEvent.update(container.querySelector('textarea')!, 'Raised my voice')
    await fireEvent.click(screen.getByRole('button', { name: 'Next' })) // → helped (optional, last)
    await fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect(emitted().saved?.[0]).toEqual([
      {
        responses: {
          hadEpisode: 'strong',
          intensity: 5,
          trigger: 'Cut off in a meeting',
          thought: 'He does it on purpose',
          behavior: 'Raised my voice',
        },
      },
    ])
  })
})
