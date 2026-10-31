import { beforeEach, describe, expect, it } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/vue'
import { createPinia, setActivePinia } from 'pinia'
import type { MicroExerciseEntry } from '@/domain/microExercises'
import { useUserPreferencesStore } from '@/stores/userPreferences.store'
import PathSentencesCard from '../PathSentencesCard.vue'

function entry(
  id: string,
  createdAt: string,
  slug: string,
  responses: MicroExerciseEntry['responses']
): MicroExerciseEntry {
  return { id, exerciseSlug: slug, createdAt, updatedAt: createdAt, responses }
}

const entries = [
  entry('img', '2026-10-01T12:00:00', 'compassionate-image', {
    message: 'Jesteś człowiekiem i to boli.',
  }),
  entry('def', '2026-10-03T12:00:00', 'defender-voice', {
    mySentence: 'Zrobiłem błąd i nadal jestem w porządku.',
  }),
]

beforeEach(() => {
  setActivePinia(createPinia())
  useUserPreferencesStore().$patch({ locale: 'pl' })
})

describe('PathSentencesCard', () => {
  it('emits the sentence key on „Ukryj” and leaves hidden sentences off the surface', async () => {
    const { emitted } = render(PathSentencesCard, {
      props: { entries, hiddenKeys: ['img:image'] },
    })

    expect(screen.getByText('„Zrobiłem błąd i nadal jestem w porządku.”')).toBeTruthy()
    expect(screen.queryByText('„Jesteś człowiekiem i to boli.”')).toBeNull()

    await fireEvent.click(
      screen.getByRole('button', { name: 'Ukryj: Zrobiłem błąd i nadal jestem w porządku.' })
    )
    expect(emitted().hide).toEqual([['def:defender']])
  })

  it('lists hidden sentences behind „Ukryte (n)” and emits restore', async () => {
    const { emitted } = render(PathSentencesCard, {
      props: { entries, hiddenKeys: ['img:image', 'def:defender'] },
    })

    const toggle = screen.getByRole('button', { name: 'Ukryte (2)' })
    expect(toggle.getAttribute('aria-expanded')).toBe('false')
    await fireEvent.click(toggle)

    await fireEvent.click(
      screen.getByRole('button', { name: 'Przywróć: Jesteś człowiekiem i to boli.' })
    )
    expect(emitted().restore).toEqual([['img:image']])
    expect(screen.getByRole('button', { name: 'Schowaj ukryte' })).toBeTruthy()
  })

  it('renders nothing when the path has no own sentences', () => {
    const { container } = render(PathSentencesCard, { props: { entries: [] } })
    expect(container.querySelector('section')).toBeNull()
  })
})
