import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/vue'
import EmotionSelector from '../EmotionSelector.vue'
import type { Emotion, Quadrant } from '@/domain/emotion'

// Mock emotions data organized by quadrant
const mockEmotions: Emotion[] = [
  // High Energy / High Pleasantness
  {
    id: 'emotion-1',
    name: 'Ecstatic',
    pleasantness: 10,
    energy: 10,
    description: 'Overwhelmed by extreme joy and delight',
  },
  {
    id: 'emotion-2',
    name: 'Elated',
    pleasantness: 10,
    energy: 9,
    description: 'Very happy and lifted in spirit',
  },
  {
    id: 'emotion-3',
    name: 'Excited',
    pleasantness: 10,
    energy: 8,
    description: 'Highly aroused in a positive anticipatory way',
  },
  // High Energy / Low Pleasantness
  {
    id: 'emotion-4',
    name: 'Enraged',
    pleasantness: 1,
    energy: 10,
    description: 'Overwhelmed by intense uncontrollable anger',
  },
  {
    id: 'emotion-5',
    name: 'Furious',
    pleasantness: 2,
    energy: 9,
    description: 'Burning with rage and hostility',
  },
  {
    id: 'emotion-6',
    name: 'Angry',
    pleasantness: 3,
    energy: 8,
    description: 'Feeling hostile and upset about something',
  },
  // Low Energy / High Pleasantness
  {
    id: 'emotion-7',
    name: 'Serene',
    pleasantness: 10,
    energy: 1,
    description: 'Stable unshakable inner calm and clarity',
  },
  {
    id: 'emotion-8',
    name: 'Tranquil',
    pleasantness: 8,
    energy: 1,
    description: 'Deeply calm quiet and undisturbed',
  },
  {
    id: 'emotion-9',
    name: 'Peaceful',
    pleasantness: 8,
    energy: 2,
    description: 'Free from disturbance or inner conflict',
  },
  // Low Energy / Low Pleasantness
  {
    id: 'emotion-10',
    name: 'Despair',
    pleasantness: 1,
    energy: 1,
    description: 'Feeling hopeless with no way out',
  },
  {
    id: 'emotion-11',
    name: 'Hopeless',
    pleasantness: 2,
    energy: 1,
    description: 'Seeing no realistic possibility of improvement',
  },
  {
    id: 'emotion-12',
    name: 'Depressed',
    pleasantness: 2,
    energy: 2,
    description: 'Persistently low mood and loss of interest',
  },
]

// Helper function to get emotions by quadrant
function getEmotionsByQuadrant(quadrant: Quadrant): Emotion[] {
  return mockEmotions.filter((emotion) => {
    const isHighEnergy = emotion.energy > 5
    const isHighPleasantness = emotion.pleasantness > 5

    switch (quadrant) {
      case 'high-energy-high-pleasantness':
        return isHighEnergy && isHighPleasantness
      case 'high-energy-low-pleasantness':
        return isHighEnergy && !isHighPleasantness
      case 'low-energy-high-pleasantness':
        return !isHighEnergy && isHighPleasantness
      case 'low-energy-low-pleasantness':
        return !isHighEnergy && !isHighPleasantness
    }
  })
}

// Mock the emotion store
const mockLoadEmotions = vi.fn()
const mockGetEmotionsByQuadrant = vi.fn((quadrant: Quadrant) =>
  getEmotionsByQuadrant(quadrant)
)
const mockGetEmotionById = vi.fn((id: string) =>
  mockEmotions.find((e) => e.id === id)
)

vi.mock('@/stores/emotion.store', () => ({
  useEmotionStore: () => ({
    loadEmotions: mockLoadEmotions,
    getEmotionsByQuadrant: mockGetEmotionsByQuadrant,
    getEmotionById: mockGetEmotionById,
    isLoaded: true,
  }),
}))

describe('EmotionSelector', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockLoadEmotions.mockResolvedValue(undefined)
  })

  describe('Rendering', () => {
    it('renders quadrant selector initially', () => {
      render(EmotionSelector, {
        props: {
          modelValue: [],
        },
      })

      expect(
        screen.getByText('Select an Emotion Quadrant')
      ).toBeInTheDocument()
      expect(
        screen.getByLabelText('Select High Energy / High Pleasantness quadrant')
      ).toBeInTheDocument()
      expect(
        screen.getByLabelText('Select High Energy / Low Pleasantness quadrant')
      ).toBeInTheDocument()
      expect(
        screen.getByLabelText('Select Low Energy / High Pleasantness quadrant')
      ).toBeInTheDocument()
      expect(
        screen.getByLabelText('Select Low Energy / Low Pleasantness quadrant')
      ).toBeInTheDocument()
    })

    it('renders all four quadrant buttons with energy and pleasantness labels', () => {
      render(EmotionSelector, {
        props: {
          modelValue: [],
        },
      })

      const quadrantsToCheck = [
        { name: /Select High Energy \/ High Pleasantness quadrant/i, energy: 'High Energy', pleasantness: 'Pleasant' },
        { name: /Select High Energy \/ Low Pleasantness quadrant/i, energy: 'High Energy', pleasantness: 'Unpleasant' },
        { name: /Select Low Energy \/ High Pleasantness quadrant/i, energy: 'Low Energy', pleasantness: 'Pleasant' },
        { name: /Select Low Energy \/ Low Pleasantness quadrant/i, energy: 'Low Energy', pleasantness: 'Unpleasant' },
      ]

      quadrantsToCheck.forEach(({ name, energy, pleasantness }) => {
        const button = screen.getByRole('button', { name })
        expect(within(button).getByText(energy)).toBeInTheDocument()
        expect(within(button).getByText(pleasantness)).toBeInTheDocument()
      })
    })

    it('shows "No emotions selected" placeholder when no emotions are selected', () => {
      render(EmotionSelector, {
        props: {
          modelValue: [],
        },
      })

      expect(screen.getByText('No emotions selected')).toBeInTheDocument()
    })
  })

  describe('Quadrant Selection', () => {
    it('displays emotions from selected quadrant when quadrant is clicked', async () => {
      render(EmotionSelector, {
        props: {
          modelValue: [],
        },
      })

      const quadrantButton = screen.getByLabelText(
        'Select High Energy / High Pleasantness quadrant'
      )
      await fireEvent.click(quadrantButton)

      await waitFor(() => {
        expect(screen.getByText('Select Emotions')).toBeInTheDocument()
        expect(screen.getByLabelText('Select emotion Ecstatic')).toBeInTheDocument()
        expect(screen.getByLabelText('Select emotion Elated')).toBeInTheDocument()
        expect(screen.getByLabelText('Select emotion Excited')).toBeInTheDocument()
      })
    })

    it('calls getEmotionsByQuadrant with correct quadrant', async () => {
      render(EmotionSelector, {
        props: {
          modelValue: [],
        },
      })

      const quadrantButton = screen.getByLabelText(
        'Select High Energy / Low Pleasantness quadrant'
      )
      await fireEvent.click(quadrantButton)

      await waitFor(() => {
        expect(mockGetEmotionsByQuadrant).toHaveBeenCalledWith(
          'high-energy-low-pleasantness'
        )
      })
    })

    it('highlights the active quadrant when it is selected', async () => {
      render(EmotionSelector, {
        props: {
          modelValue: [],
        },
      })

      const quadrantButton = screen.getByRole('button', {
        name: /Select High Energy \/ High Pleasantness quadrant/i,
      })
      await fireEvent.click(quadrantButton)

      await waitFor(() => {
        expect(quadrantButton).toHaveAttribute('aria-pressed', 'true')
      })

      const otherQuadrant = screen.getByRole('button', {
        name: /Select High Energy \/ Low Pleasantness quadrant/i,
      })
      expect(otherQuadrant).toHaveAttribute('aria-pressed', 'false')
    })
  })

  describe('Emotion Selection', () => {
    it('toggles emotion selection when emotion chip is clicked', async () => {
      const { emitted } = render(EmotionSelector, {
        props: {
          modelValue: [],
        },
      })

      // Select quadrant first
      const quadrantButton = screen.getByLabelText(
        'Select High Energy / High Pleasantness quadrant'
      )
      await fireEvent.click(quadrantButton)

      await waitFor(() => {
        expect(screen.getByLabelText('Select emotion Ecstatic')).toBeInTheDocument()
      })

      // Click emotion chip
      const emotionChip = screen.getByLabelText('Select emotion Ecstatic')
      await fireEvent.click(emotionChip)

      expect(emitted('update:modelValue')).toBeTruthy()
      expect(emitted('update:modelValue')[0]).toEqual([['emotion-1']])
    })

    it('deselects emotion when clicking selected emotion chip', async () => {
      const { emitted } = render(EmotionSelector, {
        props: {
          modelValue: ['emotion-1'],
        },
      })

      const emotionChip = await screen.findByLabelText('Deselect emotion Ecstatic')
      await fireEvent.click(emotionChip)

      expect(emitted('update:modelValue')).toBeTruthy()
      expect(emitted('update:modelValue')[0]).toEqual([[]])
    })

    it('allows selecting multiple emotions from the same quadrant', async () => {
      const { emitted } = render(EmotionSelector, {
        props: {
          modelValue: [],
        },
      })

      // Select quadrant
      const quadrantButton = screen.getByLabelText(
        'Select High Energy / High Pleasantness quadrant'
      )
      await fireEvent.click(quadrantButton)

      await waitFor(() => {
        expect(screen.getByLabelText('Select emotion Ecstatic')).toBeInTheDocument()
      })

      // Select first emotion
      const emotion1 = screen.getByLabelText('Select emotion Ecstatic')
      await fireEvent.click(emotion1)

      // Select second emotion
      const emotion2 = screen.getByLabelText('Select emotion Elated')
      await fireEvent.click(emotion2)

      expect(emitted('update:modelValue')).toBeTruthy()
      expect(emitted('update:modelValue')[1]).toEqual([['emotion-1', 'emotion-2']])
    })

    it('shows selected emotions in the selected emotions section', async () => {
      render(EmotionSelector, {
        props: {
          modelValue: ['emotion-1', 'emotion-4'],
        },
      })

      expect(screen.getByText('Selected Emotions (2)')).toBeInTheDocument()
      expect(screen.getByLabelText('Remove Ecstatic from selection')).toBeInTheDocument()
      expect(screen.getByLabelText('Remove Enraged from selection')).toBeInTheDocument()
    })
  })

  describe('Cross-Quadrant Selection', () => {
    it('preserves selections when switching quadrants', async () => {
      const { emitted } = render(EmotionSelector, {
        props: {
          modelValue: ['emotion-1'],
        },
      })

      await screen.findByLabelText('Deselect emotion Ecstatic')

      // Switch to different quadrant
      const quadrant2Button = screen.getByLabelText(
        'Select High Energy / Low Pleasantness quadrant'
      )
      await fireEvent.click(quadrant2Button)

      await waitFor(() => {
        expect(screen.getByLabelText('Select emotion Enraged')).toBeInTheDocument()
      })

      // Verify selected emotions section still shows the first selection
      expect(screen.getByText('Selected Emotions (1)')).toBeInTheDocument()
      expect(screen.getByLabelText('Remove Ecstatic from selection')).toBeInTheDocument()
    })

    it('allows selecting emotions from multiple quadrants', async () => {
      const { emitted } = render(EmotionSelector, {
        props: {
          modelValue: [],
        },
      })

      // Select from first quadrant
      const quadrant1Button = screen.getByLabelText(
        'Select High Energy / High Pleasantness quadrant'
      )
      await fireEvent.click(quadrant1Button)

      await waitFor(() => {
        expect(screen.getByLabelText('Select emotion Ecstatic')).toBeInTheDocument()
      })

      const emotion1 = screen.getByLabelText('Select emotion Ecstatic')
      await fireEvent.click(emotion1)

      // Switch to second quadrant
      const quadrant2Button = screen.getByLabelText(
        'Select High Energy / Low Pleasantness quadrant'
      )
      await fireEvent.click(quadrant2Button)

      await waitFor(() => {
        expect(screen.getByLabelText('Select emotion Enraged')).toBeInTheDocument()
      })

      const emotion2 = screen.getByLabelText('Select emotion Enraged')
      await fireEvent.click(emotion2)

      // Verify both emotions are selected
      expect(emitted('update:modelValue')).toBeTruthy()
      const lastEmit = emitted('update:modelValue')[emitted('update:modelValue').length - 1]
      expect(lastEmit[0]).toContain('emotion-1')
      expect(lastEmit[0]).toContain('emotion-4')
    })
  })

  describe('Selected Emotions Display', () => {
    it('displays selected emotions with remove buttons', () => {
      render(EmotionSelector, {
        props: {
          modelValue: ['emotion-1', 'emotion-4'],
        },
      })

      const removeButtons = screen.getAllByLabelText(/Remove .+ from selection/)
      expect(removeButtons).toHaveLength(2)
    })

    it('removes emotion when remove button is clicked', async () => {
      const { emitted } = render(EmotionSelector, {
        props: {
          modelValue: ['emotion-1', 'emotion-4'],
        },
      })

      const removeButton = screen.getByLabelText('Remove Ecstatic from selection')
      await fireEvent.click(removeButton)

      expect(emitted('update:modelValue')).toBeTruthy()
      expect(emitted('update:modelValue')[0]).toEqual([['emotion-4']])
    })

    it('shows correct count of selected emotions', () => {
      render(EmotionSelector, {
        props: {
          modelValue: ['emotion-1', 'emotion-2', 'emotion-3'],
        },
      })

      expect(screen.getByText('Selected Emotions (3)')).toBeInTheDocument()
    })
  })

  describe('v-model Binding', () => {
    it('syncs with modelValue prop changes', async () => {
      const { rerender } = render(EmotionSelector, {
        props: {
          modelValue: [],
        },
      })

      expect(screen.getByText('No emotions selected')).toBeInTheDocument()

      await rerender({
        modelValue: ['emotion-1'],
      })

      expect(screen.getByText('Selected Emotions (1)')).toBeInTheDocument()
      expect(screen.getByLabelText('Remove Ecstatic from selection')).toBeInTheDocument()
    })

    it('emits update:modelValue when emotions are selected', async () => {
      const { emitted } = render(EmotionSelector, {
        props: {
          modelValue: [],
        },
      })

      // Select quadrant
      const quadrantButton = screen.getByLabelText(
        'Select High Energy / High Pleasantness quadrant'
      )
      await fireEvent.click(quadrantButton)

      await waitFor(() => {
        expect(screen.getByText('Ecstatic')).toBeInTheDocument()
      })

      // Select emotion
      const emotionChip = screen.getByLabelText('Select emotion Ecstatic')
      await fireEvent.click(emotionChip)

      expect(emitted('update:modelValue')).toBeTruthy()
      expect(emitted('update:modelValue')[0][0]).toEqual(['emotion-1'])
    })

    it('filters out invalid emotion IDs from modelValue', async () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      render(EmotionSelector, {
        props: {
          modelValue: ['emotion-1', 'invalid-id', 'emotion-2'],
        },
      })

      // Component should only show valid emotions
      expect(screen.getByText('Selected Emotions (2)')).toBeInTheDocument()
      expect(
        screen.getByLabelText('Remove Ecstatic from selection')
      ).toBeInTheDocument()
      expect(screen.getByLabelText('Remove Elated from selection')).toBeInTheDocument()

      consoleWarnSpy.mockRestore()
    })
  })

  describe('Store Integration', () => {
    it('renders correctly when store is loaded', () => {
      render(EmotionSelector, {
        props: {
          modelValue: [],
        },
      })

      // Component should render without errors
      expect(screen.getByText('Select an Emotion Quadrant')).toBeInTheDocument()
    })

    it('uses getEmotionsByQuadrant to get emotions for display', async () => {
      render(EmotionSelector, {
        props: {
          modelValue: [],
        },
      })

      const quadrantButton = screen.getByLabelText(
        'Select High Energy / High Pleasantness quadrant'
      )
      await fireEvent.click(quadrantButton)

      await waitFor(() => {
        expect(mockGetEmotionsByQuadrant).toHaveBeenCalledWith(
          'high-energy-high-pleasantness'
        )
      })
    })

    it('uses getEmotionById to resolve emotion names for selected emotions', () => {
      render(EmotionSelector, {
        props: {
          modelValue: ['emotion-1', 'emotion-4'],
        },
      })

      expect(mockGetEmotionById).toHaveBeenCalledWith('emotion-1')
      expect(mockGetEmotionById).toHaveBeenCalledWith('emotion-4')
    })
  })

  describe('Edge Cases', () => {
    it('shows "No emotions in this quadrant" when quadrant is empty', async () => {
      // Mock empty quadrant
      mockGetEmotionsByQuadrant.mockReturnValueOnce([])

      render(EmotionSelector, {
        props: {
          modelValue: [],
        },
      })

      const quadrantButton = screen.getByLabelText(
        'Select High Energy / High Pleasantness quadrant'
      )
      await fireEvent.click(quadrantButton)

      await waitFor(() => {
        expect(screen.getByText('No emotions in this quadrant')).toBeInTheDocument()
      })

      // Reset mock
      mockGetEmotionsByQuadrant.mockImplementation((quadrant: Quadrant) =>
        getEmotionsByQuadrant(quadrant)
      )
    })


    it('handles empty modelValue gracefully', () => {
      render(EmotionSelector, {
        props: {
          modelValue: [],
        },
      })

      expect(screen.getByText('No emotions selected')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('has proper ARIA labels on quadrant buttons', () => {
      render(EmotionSelector, {
        props: {
          modelValue: [],
        },
      })

      expect(
        screen.getByLabelText('Select High Energy / High Pleasantness quadrant')
      ).toBeInTheDocument()
      expect(
        screen.getByLabelText('Select High Energy / Low Pleasantness quadrant')
      ).toBeInTheDocument()
    })

    it('has proper ARIA labels on emotion chips', async () => {
      render(EmotionSelector, {
        props: {
          modelValue: [],
        },
      })

      const quadrantButton = screen.getByLabelText(
        'Select High Energy / High Pleasantness quadrant'
      )
      await fireEvent.click(quadrantButton)

      await waitFor(() => {
        expect(screen.getByLabelText('Select emotion Ecstatic')).toBeInTheDocument()
      })
    })

    it('has proper ARIA labels on remove buttons', () => {
      render(EmotionSelector, {
        props: {
          modelValue: ['emotion-1'],
        },
      })

      expect(
        screen.getByLabelText('Remove Ecstatic from selection')
      ).toBeInTheDocument()
    })

    it('uses aria-pressed for emotion chip selection state', async () => {
      render(EmotionSelector, {
        props: {
          modelValue: ['emotion-1'],
        },
      })

      const emotionChip = await screen.findByLabelText('Deselect emotion Ecstatic')
      expect(emotionChip).toHaveAttribute('aria-pressed', 'true')
    })
  })
})
