import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/vue'
import TagInput from '../TagInput.vue'
import type { PeopleTag, ContextTag } from '@/domain/tag'

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
const mockUpdatePeopleTag = vi.fn()
const mockUpdateContextTag = vi.fn()
const mockDeletePeopleTag = vi.fn()
const mockDeleteContextTag = vi.fn()
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
    updatePeopleTag: mockUpdatePeopleTag,
    updateContextTag: mockUpdateContextTag,
    deletePeopleTag: mockDeletePeopleTag,
    deleteContextTag: mockDeleteContextTag,
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
    mockUpdatePeopleTag.mockImplementation(async (id: string, name: string) => {
      const tag = mockPeopleTags.find((t) => t.id === id)
      if (tag) {
        tag.name = name
      }
      return tag
    })
    mockUpdateContextTag.mockImplementation(async (id: string, name: string) => {
      const tag = mockContextTags.find((t) => t.id === id)
      if (tag) {
        tag.name = name
      }
      return tag
    })
    mockDeletePeopleTag.mockImplementation(async (id: string) => {
      const index = mockPeopleTags.findIndex((t) => t.id === id)
      if (index !== -1) {
        mockPeopleTags.splice(index, 1)
      }
    })
    mockDeleteContextTag.mockImplementation(async (id: string) => {
      const index = mockContextTags.findIndex((t) => t.id === id)
      if (index !== -1) {
        mockContextTags.splice(index, 1)
      }
    })
  })

  describe('Rendering', () => {
    it('renders existing tags as pills for people tags', () => {
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

    it('renders existing tags as pills for context tags', () => {
      render(TagInput, {
        props: {
          modelValue: [],
          tagType: 'context',
        },
      })

      expect(screen.getByText('Morning Routine')).toBeInTheDocument()
      expect(screen.getByText('Work Meeting')).toBeInTheDocument()
      expect(screen.getByText('Exercise')).toBeInTheDocument()
      expect(screen.getByText('Evening Relaxation')).toBeInTheDocument()
    })

    it('renders add button', () => {
      render(TagInput, {
        props: {
          modelValue: [],
          tagType: 'people',
        },
      })

      expect(screen.getByLabelText('Add new people tag')).toBeInTheDocument()
    })

    it('shows only add button when no tags exist', () => {
      mockPeopleTags.length = 0

      render(TagInput, {
        props: {
          modelValue: [],
          tagType: 'people',
        },
      })

      expect(screen.getByLabelText('Add new people tag')).toBeInTheDocument()
      expect(screen.queryByText('Mom')).not.toBeInTheDocument()
    })
  })

  describe('Tag Selection', () => {
    it('toggles tag selection when tag pill is clicked', async () => {
      const { emitted } = render(TagInput, {
        props: {
          modelValue: [],
          tagType: 'people',
        },
      })

      const tagPill = screen.getByLabelText('Select people tag Mom')
      await fireEvent.click(tagPill)

      expect(emitted('update:modelValue')).toBeTruthy()
      expect(emitted('update:modelValue')[0]).toEqual([['people-1']])
    })

    it('deselects tag when clicking selected tag pill', async () => {
      const { emitted } = render(TagInput, {
        props: {
          modelValue: ['people-1'],
          tagType: 'people',
        },
      })

      const tagPill = screen.getByLabelText('Deselect people tag Mom')
      await fireEvent.click(tagPill)

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
      expect(emitted('update:modelValue')[1]).toEqual([['people-1', 'people-2']])
    })

    it('shows selected tags with primary styling', () => {
      render(TagInput, {
        props: {
          modelValue: ['people-1'],
          tagType: 'people',
        },
      })

      const selectedTag = screen.getByLabelText('Deselect people tag Mom')
      expect(selectedTag).toHaveClass('bg-primary')
    })
  })

  describe('Tag Creation', () => {
    it('shows input field when add button is clicked', async () => {
      render(TagInput, {
        props: {
          modelValue: [],
          tagType: 'people',
        },
      })

      const addButton = screen.getByLabelText('Add new people tag')
      await fireEvent.click(addButton)

      expect(screen.getByLabelText('New people tag name')).toBeInTheDocument()
    })

    it('hides add button when creating a tag', async () => {
      render(TagInput, {
        props: {
          modelValue: [],
          tagType: 'people',
        },
      })

      const addButton = screen.getByLabelText('Add new people tag')
      await fireEvent.click(addButton)

      expect(screen.queryByLabelText('Add new people tag')).not.toBeInTheDocument()
    })

    it('creates a new tag when typing and pressing Enter', async () => {
      const { emitted } = render(TagInput, {
        props: {
          modelValue: [],
          tagType: 'people',
        },
      })

      const addButton = screen.getByLabelText('Add new people tag')
      await fireEvent.click(addButton)

      const input = screen.getByLabelText('New people tag name')
      await fireEvent.update(input, 'New Person')
      await fireEvent.keyDown(input, { key: 'Enter' })

      await waitFor(() => {
        expect(mockCreatePeopleTag).toHaveBeenCalledWith('New Person')
      })

      expect(emitted('update:modelValue')).toBeTruthy()
    })

    it('auto-selects newly created tag', async () => {
      const newTag: PeopleTag = { id: 'people-new', name: 'New Person' }
      mockCreatePeopleTag.mockResolvedValueOnce(newTag)

      const { emitted } = render(TagInput, {
        props: {
          modelValue: [],
          tagType: 'people',
        },
      })

      const addButton = screen.getByLabelText('Add new people tag')
      await fireEvent.click(addButton)

      const input = screen.getByLabelText('New people tag name')
      await fireEvent.update(input, 'New Person')
      await fireEvent.keyDown(input, { key: 'Enter' })

      await waitFor(() => {
        expect(emitted('update:modelValue')).toBeTruthy()
        const emissions = emitted('update:modelValue') as string[][][]
        const lastEmit = emissions[emissions.length - 1]
        expect(lastEmit[0]).toContain('people-new')
      })
    })

    it('cancels tag creation when Escape is pressed', async () => {
      render(TagInput, {
        props: {
          modelValue: [],
          tagType: 'people',
        },
      })

      const addButton = screen.getByLabelText('Add new people tag')
      await fireEvent.click(addButton)

      const input = screen.getByLabelText('New people tag name')
      await fireEvent.update(input, 'New Person')
      await fireEvent.keyDown(input, { key: 'Escape' })

      await waitFor(() => {
        expect(screen.queryByLabelText('New people tag name')).not.toBeInTheDocument()
        expect(screen.getByLabelText('Add new people tag')).toBeInTheDocument()
      })

      expect(mockCreatePeopleTag).not.toHaveBeenCalled()
    })

    it('cancels tag creation when input is empty and blurred', async () => {
      render(TagInput, {
        props: {
          modelValue: [],
          tagType: 'people',
        },
      })

      const addButton = screen.getByLabelText('Add new people tag')
      await fireEvent.click(addButton)

      const input = screen.getByLabelText('New people tag name')
      await fireEvent.blur(input)

      await waitFor(() => {
        expect(screen.getByLabelText('Add new people tag')).toBeInTheDocument()
      }, { timeout: 300 })
    })

    it('shows error message when tag creation fails', async () => {
      mockCreatePeopleTag.mockRejectedValueOnce(new Error('Creation failed'))

      render(TagInput, {
        props: {
          modelValue: [],
          tagType: 'people',
        },
      })

      const addButton = screen.getByLabelText('Add new people tag')
      await fireEvent.click(addButton)

      const input = screen.getByLabelText('New people tag name')
      await fireEvent.update(input, 'New Person')
      await fireEvent.keyDown(input, { key: 'Enter' })

      await waitFor(() => {
        expect(screen.getByText('Creation failed')).toBeInTheDocument()
      })
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

      // Initially no tags selected
      expect(screen.getByLabelText('Select people tag Mom')).toBeInTheDocument()

      await rerender({
        modelValue: ['people-1'],
        tagType: 'people',
      })

      // Now Mom should be selected
      expect(screen.getByLabelText('Deselect people tag Mom')).toBeInTheDocument()
    })

    it('emits update:modelValue when tags are selected', async () => {
      const { emitted } = render(TagInput, {
        props: {
          modelValue: [],
          tagType: 'people',
        },
      })

      const tagPill = screen.getByLabelText('Select people tag Mom')
      await fireEvent.click(tagPill)

      expect(emitted('update:modelValue')).toBeTruthy()
      const emissions = emitted('update:modelValue') as string[][][]
      expect(emissions[0][0]).toEqual(['people-1'])
    })

    it('filters out invalid tag IDs from modelValue', () => {
      render(TagInput, {
        props: {
          modelValue: ['people-1', 'invalid-id', 'people-2'],
          tagType: 'people',
        },
      })

      // Component should show valid tags as selected
      expect(screen.getByLabelText('Deselect people tag Mom')).toBeInTheDocument()
      expect(screen.getByLabelText('Deselect people tag John')).toBeInTheDocument()
    })
  })

  describe('Store Integration', () => {
    it('calls loadPeopleTags on mount when tagType is people and tags are empty', async () => {
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

      mockPeopleTags.push(...originalTags)
    })

    it('calls loadContextTags on mount when tagType is context and tags are empty', async () => {
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

      const addButton = screen.getByLabelText('Add new people tag')
      await fireEvent.click(addButton)

      const input = screen.getByLabelText('New people tag name')
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

      const addButton = screen.getByLabelText('Add new context tag')
      await fireEvent.click(addButton)

      const input = screen.getByLabelText('New context tag name')
      await fireEvent.update(input, 'New Context')
      await fireEvent.keyDown(input, { key: 'Enter' })

      await waitFor(() => {
        expect(mockCreateContextTag).toHaveBeenCalledWith('New Context')
      })
    })
  })

  describe('Accessibility', () => {
    it('has proper ARIA labels on tag pills', () => {
      render(TagInput, {
        props: {
          modelValue: [],
          tagType: 'people',
        },
      })

      expect(screen.getByLabelText('Select people tag Mom')).toBeInTheDocument()
    })

    it('has proper ARIA labels on add button', () => {
      render(TagInput, {
        props: {
          modelValue: [],
          tagType: 'people',
        },
      })

      expect(screen.getByLabelText('Add new people tag')).toBeInTheDocument()
    })

    it('uses aria-pressed for tag pill selection state', () => {
      render(TagInput, {
        props: {
          modelValue: ['people-1'],
          tagType: 'people',
        },
      })

      const tagPill = screen.getByLabelText('Deselect people tag Mom')
      expect(tagPill).toHaveAttribute('aria-pressed', 'true')
    })

    it('uses role="group" for tags container', () => {
      render(TagInput, {
        props: {
          modelValue: [],
          tagType: 'people',
        },
      })

      expect(screen.getByRole('group', { name: 'People tags' })).toBeInTheDocument()
    })
  })

  describe('Edge Cases', () => {
    it('handles empty tag list gracefully', () => {
      mockPeopleTags.length = 0

      render(TagInput, {
        props: {
          modelValue: [],
          tagType: 'people',
        },
      })

      // Component should still render add button
      expect(screen.getByLabelText('Add new people tag')).toBeInTheDocument()
    })

    it('handles invalid tag IDs in initial selection', () => {
      render(TagInput, {
        props: {
          modelValue: ['invalid-id-1', 'invalid-id-2'],
          tagType: 'people',
        },
      })

      // Component should not crash and show all tags as unselected
      expect(screen.getByLabelText('Select people tag Mom')).toBeInTheDocument()
    })
  })
})
