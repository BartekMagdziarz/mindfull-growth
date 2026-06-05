import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/vue'
import { setActivePinia, createPinia } from 'pinia'
import EmotionSelector from '../EmotionSelector.vue'
import { useEmotionStore } from '@/stores/emotion.store'
import { FAMILIES_BY_QUADRANT } from '@/domain/emotionFamily'
import type { Quadrant } from '@/domain/emotion'

const HEHP: Quadrant = 'high-energy-high-pleasantness'
const QUADRANTS: Quadrant[] = [
  'high-energy-high-pleasantness',
  'high-energy-low-pleasantness',
  'low-energy-high-pleasantness',
  'low-energy-low-pleasantness',
]

function emotionsIn(quadrant: Quadrant) {
  return useEmotionStore().getEmotionsByQuadrant(quadrant)
}

// quadrant -> families ("Show emotions") -> scatter dots
async function openScatter(quadrant: Quadrant) {
  await fireEvent.click(screen.getByTestId(`emotion-quadrant-${quadrant}`))
  await fireEvent.click(await screen.findByTestId('emotion-show-emotions'))
}

function lastEmit(emitted: Record<string, unknown[]>, event: string): unknown {
  const calls = emitted[event] as unknown[][] | undefined
  return calls?.[calls.length - 1]
}

describe('EmotionSelector (scatter picker)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('renders the four quadrant buttons', () => {
    render(EmotionSelector, { props: { modelValue: [] } })
    for (const q of QUADRANTS) {
      expect(screen.getByTestId(`emotion-quadrant-${q}`)).toBeInTheDocument()
    }
  })

  it('drills from quadrant to families to the emotion scatter', async () => {
    render(EmotionSelector, { props: { modelValue: [] } })
    await fireEvent.click(screen.getByTestId(`emotion-quadrant-${HEHP}`))

    // Families level: the "show emotions" CTA + at least one family card appear.
    expect(await screen.findByTestId('emotion-show-emotions')).toBeInTheDocument()
    const firstFamily = FAMILIES_BY_QUADRANT[HEHP][0].id
    expect(screen.getByTestId(`emotion-family-${firstFamily}`)).toBeInTheDocument()

    // Scatter level: emotion dots carry emotion-option-{id} test ids.
    await fireEvent.click(screen.getByTestId('emotion-show-emotions'))
    const id = emotionsIn(HEHP)[0].id
    expect(await screen.findByTestId(`emotion-option-${id}`)).toBeInTheDocument()
  })

  it('toggles an emotion on/off and emits update:modelValue', async () => {
    const { emitted } = render(EmotionSelector, { props: { modelValue: [] } })
    await openScatter(HEHP)
    const id = emotionsIn(HEHP)[0].id

    await fireEvent.click(screen.getByTestId(`emotion-option-${id}`))
    expect(lastEmit(emitted(), 'update:modelValue')).toEqual([[id]])

    await fireEvent.click(screen.getByTestId(`emotion-option-${id}`))
    expect(lastEmit(emitted(), 'update:modelValue')).toEqual([[]])
  })

  it('supports selecting multiple emotions', async () => {
    const { emitted } = render(EmotionSelector, { props: { modelValue: [] } })
    await openScatter(HEHP)
    const [a, b] = emotionsIn(HEHP).slice(0, 2).map((e) => e.id)

    await fireEvent.click(screen.getByTestId(`emotion-option-${a}`))
    await fireEvent.click(screen.getByTestId(`emotion-option-${b}`))
    expect(lastEmit(emitted(), 'update:modelValue')).toEqual([[a, b]])
  })

  it('renders selected emotion chips from modelValue', () => {
    const emotion = emotionsIn(HEHP)[0]
    render(EmotionSelector, { props: { modelValue: [emotion.id] } })
    expect(screen.getByText(emotion.name)).toBeInTheDocument()
  })

  it('emits update:quadrant when a quadrant is chosen', async () => {
    const { emitted } = render(EmotionSelector, { props: { modelValue: [] } })
    await fireEvent.click(screen.getByTestId(`emotion-quadrant-${HEHP}`))
    expect(lastEmit(emitted(), 'update:quadrant')).toEqual([HEHP])
  })

  it('collapses back to the quadrant grid when quadrant is cleared by the parent', async () => {
    const { rerender } = render(EmotionSelector, {
      props: { modelValue: [], quadrant: HEHP },
    })
    // Starts at the families level (CTA present, quadrant grid hidden).
    expect(await screen.findByTestId('emotion-show-emotions')).toBeInTheDocument()

    await rerender({ modelValue: [], quadrant: null })
    expect(await screen.findByTestId(`emotion-quadrant-${HEHP}`)).toBeInTheDocument()
  })

  it('filters invalid emotion ids out of modelValue without crashing', () => {
    render(EmotionSelector, { props: { modelValue: ['not-a-real-emotion'] } })
    // Still renders, and no chip for the invalid id.
    expect(screen.getByTestId(`emotion-quadrant-${HEHP}`)).toBeInTheDocument()
    expect(screen.queryByText('not-a-real-emotion')).not.toBeInTheDocument()
  })

  describe('allow-family-only', () => {
    it('selecting a family emits update:families and shows the family chip strip', async () => {
      const { emitted } = render(EmotionSelector, {
        props: { modelValue: [], allowFamilyOnly: true },
      })
      await fireEvent.click(screen.getByTestId(`emotion-quadrant-${HEHP}`))

      const family = FAMILIES_BY_QUADRANT[HEHP][0]
      await fireEvent.click(await screen.findByTestId(`emotion-family-${family.id}`))
      expect(lastEmit(emitted(), 'update:families')).toEqual([[family.id]])

      // The selected-family chip strip (its own accessible list) appears.
      expect(
        await screen.findByRole('list', { name: 'Selected emotion families' })
      ).toBeInTheDocument()
    })

    it('shows no family chip strip when allow-family-only is off (families act as a filter)', async () => {
      render(EmotionSelector, { props: { modelValue: [], allowFamilyOnly: false } })
      await fireEvent.click(screen.getByTestId(`emotion-quadrant-${HEHP}`))

      const family = FAMILIES_BY_QUADRANT[HEHP][0]
      await fireEvent.click(await screen.findByTestId(`emotion-family-${family.id}`))
      expect(
        screen.queryByRole('list', { name: 'Selected emotion families' })
      ).not.toBeInTheDocument()
    })
  })
})
