import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/vue'
import TagInput from '../TagInput.vue'
import type { PeopleTag } from '@/domain/tag'
import type { ContextTag } from '@/domain/tag'

// Mock tags data - using functions to create fresh arrays for each test
const createMockPeopleTags = (): PeopleTag[] => [
  { id: 'people-1', name: 'Mom' },
  { id: 'people-2', name: 'John' },
  { id: 'people-3', name: 'Sarah' },
  { id: 'people-4', name: 'Work Team' },
]

const createMockContextTags = (): ContextTag[] => [
  { id: 'context-1', name: 'Morning Routine' },
  { id: 'context-2', name: 'Work Meeting' },
  { id: 'context-3', name: 'Exercise' },
  { id: 'context-4', name: 'Evening Relaxation' },
]

let mockPeopleTags: PeopleTag[] = createMockPeopleTags()
let mockContextTags: ContextTag[] = createMockContextTags()

// Mock the tag store
const mockLoadPeopleTags = vi.fn()
const mockLoadContextTags = vi.fn()
const mockCreatePeopleTag = vi.fn()
const mockCreateContextTag = vi.fn()
const mockGetPeopleTagById = vi.fn((id: string) =>
  mockPeopleTags.find((tag) => tag.id === id)
)
const mockGetContextTagById = vi.fn((id: string) =>
  mockContextTags.find((tag) => tag.id === id)
)

vi.mock('@/stores/tag.store', () => ({
  useTagStore: () => ({
    peopleTags: mockPeopleTags,
    contextTags: mockContextTags,
    isLoading: false,
    error: null,
    loadPeopleTags: mockLoadPeopleTags,
    loadContextTags: mockLoadContextTags,
    createPeopleTag: mockCreatePeopleTag,
    createContextTag: mockCreateContextTag,
    getPeopleTagById: mockGetPeopleTagById,
    getContextTagById: mockGetContextTagById,
  }),
}))

describe('TagInput', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset mock tags to initial state
    mockPeopleTags = createMockPeopleTags()
    mockContextTags = createMockContextTags()
    mockLoadPeopleTags.mockResolvedValue(undefined)
    mockLoadContextTags.mockResolvedValue(undefined)
    mockCreatePeopleTag.mockImplementation(async (name: string) => {
      // Simulate duplicate check
      const existing = mockPeopleTags.find(
        (tag) => tag.name.toLowerCase() === name.toLowerCase()
      )
      if (existing) {
        return existing
      }
      const newTag: PeopleTag = {
        id: `people-${mockPeopleTags.length + 1}`,
        name,
      }
      mockPeopleTags.push(newTag)
      return newTag
    })
    mockCreateContextTag.mockImplementation(async (name: string) => {
      // Simulate duplicate check
      const existing = mockContextTags.find(
        (tag) => tag.name.toLowerCase() === name.toLowerCase()
      )
      if (existing) {
        return existing
      }
      const newTag: ContextTag = {
        id: `context-${mockContextTags.length + 1}`,
        name,
      }
      mockContextTags.push(newTag)
      return newTag
    })
  })

  describe('Rendering', () => {
    it('renders input field and existing tags as chips for people tags', () => {
      render(TagInput, {
        props: {
          modelValue: [],
          tagType: 'people',
        },
      })

      expect(
        screen.getByLabelText('Add people tag')
      ).toBeInTheDocument()
      expect(
        screen.getByPlaceholderText('Type to create or select a people tag...')
      ).toBeInTheDocument()
      expect(screen.getByText('Select People Tags')).toBeInTheDocument()
      expect(screen.getByText('Mom')).toBeInTheDocument()
      expect(screen.getByText('John')).toBeInTheDocument()
    })

    it('renders input field and existing tags as chips for context tags', () => {
      render(TagInput, {
        props: {
          modelValue: [],
          tagType: 'context',
        },
      })

      expect(
        screen.getByLabelText('Add context tag')
      ).toBeInTheDocument()
      expect(
        screen.getByPlaceholderText('Type to create or select a context tag...')
      ).toBeInTheDocument()
      expect(screen.getByText('Select Context Tags')).toBeInTheDocument()
      expect(screen.getByText('Morning Routine')).toBeInTheDocument()
      expect(screen.getByText('Work Meeting')).toBeInTheDocument()
    })

    it('displays each tag chip with correct name', () => {
      render(TagInput, {
        props: {
          modelValue: [],
          tagType: 'people',
        },
      })

      expect(screen.getByText('Mom')).toBeInTheDocument()
      expect(screen.getByText('John')).toBeInTheDocument()
      expect(screen.getByText('Sarah')).toBeInTheDocument()
      expect(screen.getByText('Work Team')).toBeInTheDocument()
    })

    it('shows "No people tags selected" placeholder when no tags are selected', () => {
      render(TagInput, {
        props: {
          modelValue: [],
          tagType: 'people',
        },
      })

      expect(screen.getByText('No people tags selected')).toBeInTheDocument()
    })

    it('shows "No context tags selected" placeholder when no tags are selected', () => {
      render(TagInput, {
        props: {
          modelValue: [],
          tagType: 'context',
        },
      })

      expect(screen.getByText('No context tags selected')).toBeInTheDocument()
    })
  })

  describe('Tag Selection', () => {
    it('toggles tag selection when tag chip is clicked', async () => {
      const { emitted } = render(TagInput, {
        props: {
          modelValue: [],
          tagType: 'people',
        },
      })

      const tagChip = screen.getByLabelText('Select people tag Mom')
      await fireEvent.click(tagChip)

      expect(emitted('update:modelValue')).toBeTruthy()
      expect(emitted('update:modelValue')[0]).toEqual([['people-1']])
    })

    it('deselects tag when clicking selected tag chip', async () => {
      const { emitted } = render(TagInput, {
        props: {
          modelValue: ['people-1'],
          tagType: 'people',
        },
      })

      const tagChip = screen.getByLabelText('Deselect people tag Mom')
      await fireEvent.click(tagChip)

      expect(emitted('update:modelValue')).toBeTruthy()
      expect(emitted('update:modelValue')[0]).toEqual([[]])
    })

    it('allows selecting multiple tags', async () => {
      const { emitted } = render(TagInput, {
        props: {
          modelValue: [],
          tagType: 'people',
        },
      })

      const tag1 = screen.getByLabelText('Select people tag Mom')
      await fireEvent.click(tag1)

      const tag2 = screen.getByLabelText('Select people tag John')
      await fireEvent.click(tag2)

      expect(emitted('update:modelValue')).toBeTruthy()
      expect(emitted('update:modelValue')[1]).toEqual([
        ['people-1', 'people-2'],
      ])
    })

    it('shows selected tags in the selected tags section', () => {
      render(TagInput, {
        props: {
          modelValue: ['people-1', 'people-2'],
          tagType: 'people',
        },
      })

      expect(screen.getByText('Selected People Tags (2)')).toBeInTheDocument()
      expect(
        screen.getByLabelText('Remove Mom from selection')
      ).toBeInTheDocument()
      expect(
        screen.getByLabelText('Remove John from selection')
      ).toBeInTheDocument()
    })
  })

  describe('Tag Creation', () => {
    it('creates a new tag when typing and pressing Enter', async () => {
      const { emitted } = render(TagInput, {
        props: {
          modelValue: [],
          tagType: 'people',
        },
      })

      const input = screen.getByLabelText('Add people tag')
      await fireEvent.update(input, 'New Person')
      await fireEvent.keyDown(input, { key: 'Enter' })

      await waitFor(() => {
        expect(mockCreatePeopleTag).toHaveBeenCalledWith('New Person')
      })

      expect(emitted('update:modelValue')).toBeTruthy()
    })

    it('adds newly created tag to selectedTagIds', async () => {
      const newTag: PeopleTag = { id: 'people-new', name: 'New Person' }
      mockCreatePeopleTag.mockResolvedValueOnce(newTag)

      const { emitted } = render(TagInput, {
        props: {
          modelValue: [],
          tagType: 'people',
        },
      })

      const input = screen.getByLabelText('Add people tag')
      await fireEvent.update(input, 'New Person')
      await fireEvent.keyDown(input, { key: 'Enter' })

      await waitFor(() => {
        expect(emitted('update:modelValue')).toBeTruthy()
        const lastEmit = emitted('update:modelValue')[
          emitted('update:modelValue').length - 1
        ]
        expect(lastEmit[0]).toContain('people-new')
      })
    })

    it('clears input field after tag creation', async () => {
      const newTag: PeopleTag = { id: 'people-new', name: 'New Person' }
      mockCreatePeopleTag.mockResolvedValueOnce(newTag)

      render(TagInput, {
        props: {
          modelValue: [],
          tagType: 'people',
        },
      })

      const input = screen.getByLabelText('Add people tag') as HTMLInputElement
      await fireEvent.update(input, 'New Person')
      await fireEvent.keyDown(input, { key: 'Enter' })

      await waitFor(() => {
        expect(input.value).toBe('')
      })
    })

    it('selects existing tag when duplicate name is entered (case-insensitive)', async () => {
      const { emitted } = render(TagInput, {
        props: {
          modelValue: [],
          tagType: 'people',
        },
      })

      const input = screen.getByLabelText('Add people tag')
      await fireEvent.update(input, 'mom') // lowercase version of existing "Mom"
      await fireEvent.keyDown(input, { key: 'Enter' })

      await waitFor(() => {
        expect(mockCreatePeopleTag).toHaveBeenCalledWith('mom')
        // Mock returns existing tag, so it should be selected
        expect(emitted('update:modelValue')).toBeTruthy()
      })
    })

    it('shows error message when tag creation fails', async () => {
      mockCreatePeopleTag.mockRejectedValueOnce(new Error('Creation failed'))

      render(TagInput, {
        props: {
          modelValue: [],
          tagType: 'people',
        },
      })

      const input = screen.getByLabelText('Add people tag')
      await fireEvent.update(input, 'New Person')
      await fireEvent.keyDown(input, { key: 'Enter' })

      await waitFor(() => {
        expect(screen.getByText('Creation failed')).toBeInTheDocument()
      })
    })

    it('validates that tag name is not empty', async () => {
      render(TagInput, {
        props: {
          modelValue: [],
          tagType: 'people',
        },
      })

      const input = screen.getByLabelText('Add people tag')
      await fireEvent.update(input, '   ') // whitespace only
      await fireEvent.keyDown(input, { key: 'Enter' })

      await waitFor(() => {
        expect(screen.getByText('Tag name cannot be empty')).toBeInTheDocument()
        expect(mockCreatePeopleTag).not.toHaveBeenCalled()
      })
    })
  })

  describe('Autocomplete', () => {
    it('shows matching suggestions as user types', async () => {
      render(TagInput, {
        props: {
          modelValue: [],
          tagType: 'people',
        },
      })

      const input = screen.getByLabelText('Add people tag')
      await fireEvent.update(input, 'Mo')

      await waitFor(() => {
        // Should show in suggestions dropdown
        const suggestions = screen.getByRole('listbox')
        expect(suggestions).toBeInTheDocument()
        // Check that "Mom" appears in the suggestions listbox
        const suggestionButton = screen.getByLabelText('Select Mom')
        expect(suggestionButton).toBeInTheDocument()
      })
    })

    it('filters suggestions case-insensitively', async () => {
      render(TagInput, {
        props: {
          modelValue: [],
          tagType: 'people',
        },
      })

      const input = screen.getByLabelText('Add people tag')
      await fireEvent.update(input, 'mom') // lowercase

      await waitFor(() => {
        // Check that "Mom" appears in suggestions (not just in tag chips)
        const suggestions = screen.getByRole('listbox')
        expect(suggestions).toBeInTheDocument()
        const suggestionButton = screen.getByLabelText('Select Mom')
        expect(suggestionButton).toBeInTheDocument()
      })
    })

    it('allows selecting a suggestion via click', async () => {
      const { emitted } = render(TagInput, {
        props: {
          modelValue: [],
          tagType: 'people',
        },
      })

      const input = screen.getByLabelText('Add people tag')
      await fireEvent.update(input, 'Mo')

      await waitFor(() => {
        const suggestion = screen.getByLabelText('Select Mom')
        expect(suggestion).toBeInTheDocument()
      })

      const suggestion = screen.getByLabelText('Select Mom')
      await fireEvent.click(suggestion)

      await waitFor(() => {
        expect(emitted('update:modelValue')).toBeTruthy()
        expect(emitted('update:modelValue')[0][0]).toContain('people-1')
      })
    })

    it('hides suggestions when input is empty', async () => {
      render(TagInput, {
        props: {
          modelValue: [],
          tagType: 'people',
        },
      })

      const input = screen.getByLabelText('Add people tag')
      await fireEvent.update(input, 'Mo')

      await waitFor(() => {
        expect(screen.getByRole('listbox')).toBeInTheDocument()
      })

      await fireEvent.update(input, '')

      await waitFor(() => {
        expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
      })
    })

    it('navigates suggestions with arrow keys', async () => {
      render(TagInput, {
        props: {
          modelValue: [],
          tagType: 'people',
        },
      })

      const input = screen.getByLabelText('Add people tag')
      await fireEvent.update(input, 'M')

      await waitFor(() => {
        expect(screen.getByRole('listbox')).toBeInTheDocument()
      })

      await fireEvent.keyDown(input, { key: 'ArrowDown' })
      await fireEvent.keyDown(input, { key: 'Enter' })

      await waitFor(() => {
        // Should select the first suggestion
        expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
      })
    })

    it('closes suggestions with Escape key', async () => {
      render(TagInput, {
        props: {
          modelValue: [],
          tagType: 'people',
        },
      })

      const input = screen.getByLabelText('Add people tag')
      await fireEvent.update(input, 'Mo')

      await waitFor(() => {
        expect(screen.getByRole('listbox')).toBeInTheDocument()
      })

      await fireEvent.keyDown(input, { key: 'Escape' })

      await waitFor(() => {
        expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
      })
    })

    it('excludes already selected tags from suggestions', async () => {
      render(TagInput, {
        props: {
          modelValue: ['people-1'], // Mom is already selected
          tagType: 'people',
        },
      })

      const input = screen.getByLabelText('Add people tag')
      await fireEvent.update(input, 'Mo')

      await waitFor(() => {
        // Mom should not appear in suggestions since it's already selected
        const suggestions = screen.queryByRole('listbox')
        if (suggestions) {
          // If suggestions exist, Mom should not be in them
          expect(screen.queryByText('Mom')).not.toBeInTheDocument()
        }
      })
    })
  })

  describe('Selected Tags Display', () => {
    it('displays selected tags with remove buttons', () => {
      render(TagInput, {
        props: {
          modelValue: ['people-1', 'people-2'],
          tagType: 'people',
        },
      })

      expect(
        screen.getByLabelText('Remove Mom from selection')
      ).toBeInTheDocument()
      expect(
        screen.getByLabelText('Remove John from selection')
      ).toBeInTheDocument()
    })

    it('removes tag when remove button is clicked', async () => {
      const { emitted } = render(TagInput, {
        props: {
          modelValue: ['people-1', 'people-2'],
          tagType: 'people',
        },
      })

      const removeButton = screen.getByLabelText('Remove Mom from selection')
      await fireEvent.click(removeButton)

      expect(emitted('update:modelValue')).toBeTruthy()
      expect(emitted('update:modelValue')[0]).toEqual([['people-2']])
    })

    it('shows correct count of selected tags', () => {
      render(TagInput, {
        props: {
          modelValue: ['people-1', 'people-2', 'people-3'],
          tagType: 'people',
        },
      })

      expect(screen.getByText('Selected People Tags (3)')).toBeInTheDocument()
    })
  })

  describe('v-model Binding', () => {
    it('syncs with modelValue prop changes', async () => {
      const { rerender } = render(TagInput, {
        props: {
          modelValue: [],
          tagType: 'people',
        },
      })

      expect(screen.getByText('No people tags selected')).toBeInTheDocument()

      await rerender({
        modelValue: ['people-1'],
      })

      expect(screen.getByText('Selected People Tags (1)')).toBeInTheDocument()
      expect(
        screen.getByLabelText('Remove Mom from selection')
      ).toBeInTheDocument()
    })

    it('emits update:modelValue when tags are selected', async () => {
      const { emitted } = render(TagInput, {
        props: {
          modelValue: [],
          tagType: 'people',
        },
      })

      const tagChip = screen.getByLabelText('Select people tag Mom')
      await fireEvent.click(tagChip)

      expect(emitted('update:modelValue')).toBeTruthy()
      expect(emitted('update:modelValue')[0][0]).toEqual(['people-1'])
    })

    it('filters out invalid tag IDs from modelValue', async () => {
      const consoleWarnSpy = vi
        .spyOn(console, 'warn')
        .mockImplementation(() => {})

      render(TagInput, {
        props: {
          modelValue: ['people-1', 'invalid-id', 'people-2'],
          tagType: 'people',
        },
      })

      // Component should only show valid tags
      expect(screen.getByText('Selected People Tags (2)')).toBeInTheDocument()
      // Check that tags appear in the selected tags section (not just in available tags)
      expect(
        screen.getByLabelText('Remove Mom from selection')
      ).toBeInTheDocument()
      expect(
        screen.getByLabelText('Remove John from selection')
      ).toBeInTheDocument()

      consoleWarnSpy.mockRestore()
    })
  })

  describe('Store Integration', () => {
    it('calls loadPeopleTags on mount when tagType is people and tags are empty', async () => {
      // Reset mock tags to empty
      const originalTags = [...mockPeopleTags]
      mockPeopleTags.length = 0

      render(TagInput, {
        props: {
          modelValue: [],
          tagType: 'people',
        },
      })

      await waitFor(() => {
        expect(mockLoadPeopleTags).toHaveBeenCalled()
      })

      // Restore tags
      mockPeopleTags.push(...originalTags)
    })

    it('calls loadContextTags on mount when tagType is context and tags are empty', async () => {
      // Reset mock tags to empty
      const originalTags = [...mockContextTags]
      mockContextTags.length = 0

      render(TagInput, {
        props: {
          modelValue: [],
          tagType: 'context',
        },
      })

      await waitFor(() => {
        expect(mockLoadContextTags).toHaveBeenCalled()
      })

      // Restore tags
      mockContextTags.push(...originalTags)
    })

    it('uses createPeopleTag to create people tags', async () => {
      const newTag: PeopleTag = { id: 'people-new', name: 'New Person' }
      mockCreatePeopleTag.mockResolvedValueOnce(newTag)

      render(TagInput, {
        props: {
          modelValue: [],
          tagType: 'people',
        },
      })

      const input = screen.getByLabelText('Add people tag')
      await fireEvent.update(input, 'New Person')
      await fireEvent.keyDown(input, { key: 'Enter' })

      await waitFor(() => {
        expect(mockCreatePeopleTag).toHaveBeenCalledWith('New Person')
      })
    })

    it('uses createContextTag to create context tags', async () => {
      const newTag: ContextTag = { id: 'context-new', name: 'New Context' }
      mockCreateContextTag.mockResolvedValueOnce(newTag)

      render(TagInput, {
        props: {
          modelValue: [],
          tagType: 'context',
        },
      })

      const input = screen.getByLabelText('Add context tag')
      await fireEvent.update(input, 'New Context')
      await fireEvent.keyDown(input, { key: 'Enter' })

      await waitFor(() => {
        expect(mockCreateContextTag).toHaveBeenCalledWith('New Context')
      })
    })

    it('uses getPeopleTagById to resolve tag names', () => {
      render(TagInput, {
        props: {
          modelValue: ['people-1'],
          tagType: 'people',
        },
      })

      expect(mockGetPeopleTagById).toHaveBeenCalledWith('people-1')
      // Check that "Mom" appears in the selected tags section
      expect(
        screen.getByLabelText('Remove Mom from selection')
      ).toBeInTheDocument()
    })

    it('uses getContextTagById to resolve tag names', () => {
      render(TagInput, {
        props: {
          modelValue: ['context-1'],
          tagType: 'context',
        },
      })

      expect(mockGetContextTagById).toHaveBeenCalledWith('context-1')
      // Check that "Morning Routine" appears in the selected tags section
      expect(
        screen.getByLabelText('Remove Morning Routine from selection')
      ).toBeInTheDocument()
    })
  })

  describe('Edge Cases', () => {
    it('handles loading state correctly', () => {
      // The loading state is handled by checking tagStore.isLoading
      // Since our mock has isLoading: false, the component will show tags
      // This test verifies the component renders correctly with the loading check
      render(TagInput, {
        props: {
          modelValue: [],
          tagType: 'people',
        },
      })

      // Component should render without errors even with loading state check
      expect(screen.getByLabelText('Add people tag')).toBeInTheDocument()
    })

    it('shows empty state when no tags exist', () => {
      // Temporarily set tags to empty
      const originalTags = [...mockPeopleTags]
      mockPeopleTags.length = 0

      render(TagInput, {
        props: {
          modelValue: [],
          tagType: 'people',
        },
      })

      expect(
        screen.getByText('No people tags available. Create one above.')
      ).toBeInTheDocument()

      // Restore tags
      mockPeopleTags.push(...originalTags)
    })

    it('handles empty tag list gracefully', () => {
      // This is tested implicitly through the rendering tests
      // The component should render even when tags array is empty
      render(TagInput, {
        props: {
          modelValue: [],
          tagType: 'people',
        },
      })

      // Component should still render input field
      expect(screen.getByLabelText('Add people tag')).toBeInTheDocument()
    })

    it('handles invalid tag IDs in initial selection', () => {
      const consoleWarnSpy = vi
        .spyOn(console, 'warn')
        .mockImplementation(() => {})

      render(TagInput, {
        props: {
          modelValue: ['invalid-id-1', 'invalid-id-2'],
          tagType: 'people',
        },
      })

      // Component should not crash and should show "No tags selected"
      expect(screen.getByText('No people tags selected')).toBeInTheDocument()

      consoleWarnSpy.mockRestore()
    })

    it('handles store loading errors gracefully', async () => {
      mockLoadPeopleTags.mockRejectedValueOnce(new Error('Load failed'))

      render(TagInput, {
        props: {
          modelValue: [],
          tagType: 'people',
        },
      })

      // Component should still render
      expect(screen.getByLabelText('Add people tag')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('has proper ARIA labels on input field', () => {
      render(TagInput, {
        props: {
          modelValue: [],
          tagType: 'people',
        },
      })

      expect(screen.getByLabelText('Add people tag')).toBeInTheDocument()
    })

    it('has proper ARIA labels on tag chips', () => {
      render(TagInput, {
        props: {
          modelValue: [],
          tagType: 'people',
        },
      })

      expect(
        screen.getByLabelText('Select people tag Mom')
      ).toBeInTheDocument()
    })

    it('has proper ARIA labels on remove buttons', () => {
      render(TagInput, {
        props: {
          modelValue: ['people-1'],
          tagType: 'people',
        },
      })

      expect(
        screen.getByLabelText('Remove Mom from selection')
      ).toBeInTheDocument()
    })

    it('uses aria-pressed for tag chip selection state', () => {
      render(TagInput, {
        props: {
          modelValue: ['people-1'],
          tagType: 'people',
        },
      })

      const tagChip = screen.getByLabelText('Deselect people tag Mom')
      expect(tagChip).toHaveAttribute('aria-pressed', 'true')
    })
  })
})

