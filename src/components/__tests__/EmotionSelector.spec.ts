import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/vue'
import { setActivePinia, createPinia } from 'pinia'
import EmotionSelector from '../EmotionSelector.vue'
import { useEmotionStore } from '@/stores/emotion.store'
import { FAMILIES_BY_QUADRANT, FAMILY_OF } from '@/domain/emotionFamily'
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

function emotionsOf(quadrant: Quadrant, familyId: string) {
  return emotionsIn(quadrant).filter((e) => FAMILY_OF[e.id] === familyId)
}

// quadrant -> family card click expands it in place (default mode: the whole
// card is the expand affordance; no separate strip without allowFamilyOnly).
async function expandFamily(quadrant: Quadrant, familyId: string) {
  await fireEvent.click(screen.getByTestId(`emotion-quadrant-${quadrant}`))
  await fireEvent.click(await screen.findByTestId(`emotion-family-${familyId}`))
}

function lastEmit(emitted: Record<string, unknown[]>, event: string): unknown {
  const calls = emitted[event] as unknown[][] | undefined
  return calls?.[calls.length - 1]
}

const FIRST_FAMILY = FAMILIES_BY_QUADRANT[HEHP][0].id // 'radosc'

describe('EmotionSelector (family-expansion picker)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('renders the four quadrant buttons', () => {
    render(EmotionSelector, { props: { modelValue: [] } })
    for (const q of QUADRANTS) {
      expect(screen.getByTestId(`emotion-quadrant-${q}`)).toBeInTheDocument()
    }
  })

  it('drills from quadrant to families and expands a family in place', async () => {
    render(EmotionSelector, { props: { modelValue: [] } })
    await fireEvent.click(screen.getByTestId(`emotion-quadrant-${HEHP}`))

    // Families level: family cards appear.
    expect(await screen.findByTestId(`emotion-family-${FIRST_FAMILY}`)).toBeInTheDocument()

    // Expanding shows THAT family's emotions as emotion-option-{id} buttons.
    await fireEvent.click(screen.getByTestId(`emotion-family-${FIRST_FAMILY}`))
    const familyEmotions = emotionsOf(HEHP, FIRST_FAMILY)
    expect(familyEmotions.length).toBeGreaterThan(0)
    for (const e of familyEmotions) {
      expect(await screen.findByTestId(`emotion-option-${e.id}`)).toBeInTheDocument()
    }
  })

  it('expanding another family collapses the previous one', async () => {
    render(EmotionSelector, { props: { modelValue: [] } })
    const [famA, famB] = FAMILIES_BY_QUADRANT[HEHP].slice(0, 2).map((f) => f.id)
    await expandFamily(HEHP, famA)
    const emotionA = emotionsOf(HEHP, famA)[0]
    expect(await screen.findByTestId(`emotion-option-${emotionA.id}`)).toBeInTheDocument()

    await fireEvent.click(screen.getByTestId(`emotion-family-${famB}`))
    const emotionB = emotionsOf(HEHP, famB)[0]
    expect(await screen.findByTestId(`emotion-option-${emotionB.id}`)).toBeInTheDocument()
    expect(screen.queryByTestId(`emotion-option-${emotionA.id}`)).not.toBeInTheDocument()
  })

  it('toggles an emotion on/off and emits update:modelValue', async () => {
    const { emitted } = render(EmotionSelector, { props: { modelValue: [] } })
    await expandFamily(HEHP, FIRST_FAMILY)
    const id = emotionsOf(HEHP, FIRST_FAMILY)[0].id

    await fireEvent.click(screen.getByTestId(`emotion-option-${id}`))
    expect(lastEmit(emitted(), 'update:modelValue')).toEqual([[id]])

    await fireEvent.click(screen.getByTestId(`emotion-option-${id}`))
    expect(lastEmit(emitted(), 'update:modelValue')).toEqual([[]])
  })

  it('supports selecting multiple emotions', async () => {
    const { emitted } = render(EmotionSelector, { props: { modelValue: [] } })
    await expandFamily(HEHP, FIRST_FAMILY)
    const [a, b] = emotionsOf(HEHP, FIRST_FAMILY).slice(0, 2).map((e) => e.id)

    await fireEvent.click(screen.getByTestId(`emotion-option-${a}`))
    await fireEvent.click(screen.getByTestId(`emotion-option-${b}`))
    expect(lastEmit(emitted(), 'update:modelValue')).toEqual([[a, b]])
  })

  it('shows a selected-count badge on the collapsed family card', async () => {
    render(EmotionSelector, { props: { modelValue: [] } })
    await expandFamily(HEHP, FIRST_FAMILY)
    const id = emotionsOf(HEHP, FIRST_FAMILY)[0].id
    await fireEvent.click(screen.getByTestId(`emotion-option-${id}`))

    // Collapse by expanding another family; the first card shows the count.
    const otherFamily = FAMILIES_BY_QUADRANT[HEHP][1].id
    await fireEvent.click(screen.getByTestId(`emotion-family-${otherFamily}`))
    const card = await screen.findByTestId(`emotion-family-${FIRST_FAMILY}`)
    expect(within(card).getByText('1')).toBeInTheDocument()
  })

  it('renders selected emotion chips from modelValue', () => {
    const emotion = emotionsIn(HEHP)[0]
    render(EmotionSelector, { props: { modelValue: [emotion.id] } })
    expect(screen.getByText(emotion.name)).toBeInTheDocument()
  })

  it('renders the label prop inside the chips row and suppresses the empty state', () => {
    render(EmotionSelector, { props: { modelValue: [], label: 'Emocje' } })
    const list = screen.getByRole('list', { name: 'Selected emotions and families' })
    expect(within(list).getByText('Emocje')).toBeInTheDocument()
    // Label present => the row renders even with no selection, no placeholder box.
    expect(within(list).queryAllByRole('button')).toHaveLength(0)
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
    // Starts at the families level (family cards present, quadrant grid hidden).
    expect(await screen.findByTestId(`emotion-family-${FIRST_FAMILY}`)).toBeInTheDocument()

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

      // The selected chips now live in one combined accessible list.
      expect(
        await screen.findByRole('list', { name: 'Selected emotions and families' })
      ).toBeInTheDocument()
    })

    it('the expand strip opens emotions while the card body still selects the family', async () => {
      const { emitted } = render(EmotionSelector, {
        props: { modelValue: [], allowFamilyOnly: true },
      })
      await fireEvent.click(screen.getByTestId(`emotion-quadrant-${HEHP}`))

      // Split zones: the ▾ strip expands (pure navigation, no families emit)...
      await fireEvent.click(await screen.findByTestId(`emotion-family-expand-${FIRST_FAMILY}`))
      const id = emotionsOf(HEHP, FIRST_FAMILY)[0].id
      expect(await screen.findByTestId(`emotion-option-${id}`)).toBeInTheDocument()
      expect(lastEmit(emitted(), 'update:families')).toBeUndefined()

      // ...and the head inside the expanded row still toggles the family.
      await fireEvent.click(screen.getByTestId(`emotion-family-${FIRST_FAMILY}`))
      expect(lastEmit(emitted(), 'update:families')).toEqual([[FIRST_FAMILY]])
    })

    it('shows no family chip strip when allow-family-only is off (card click expands instead)', async () => {
      render(EmotionSelector, { props: { modelValue: [], allowFamilyOnly: false } })
      await fireEvent.click(screen.getByTestId(`emotion-quadrant-${HEHP}`))

      const family = FAMILIES_BY_QUADRANT[HEHP][0]
      await fireEvent.click(await screen.findByTestId(`emotion-family-${family.id}`))
      expect(
        screen.queryByRole('list', { name: 'Selected emotions and families' })
      ).not.toBeInTheDocument()
    })

    it('shows selected emotions and families together in one list', async () => {
      const emotion = emotionsIn(HEHP)[0]
      // Pick a family the emotion does NOT belong to, so it isn't absorbed.
      const otherFamily = FAMILIES_BY_QUADRANT[HEHP].find(
        (f) => f.id !== FAMILY_OF[emotion.id]
      )!
      render(EmotionSelector, {
        props: { modelValue: [emotion.id], allowFamilyOnly: true },
      })
      await fireEvent.click(screen.getByTestId(`emotion-quadrant-${HEHP}`))
      await fireEvent.click(await screen.findByTestId(`emotion-family-${otherFamily.id}`))

      // Emotion chip and family chip share ONE combined list (no second strip).
      const list = await screen.findByRole('list', {
        name: 'Selected emotions and families',
      })
      expect(within(list).getByText(emotion.name)).toBeInTheDocument()
      expect(within(list).getAllByRole('button')).toHaveLength(2)
    })
  })
})
