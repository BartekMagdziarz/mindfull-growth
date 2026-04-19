import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/vue'
import ProfileSectionList from '../ProfileSectionList.vue'
import {
  PROFILE_SECTION_IDS,
  createEmptySections,
  type UserProfile,
} from '@/domain/userProfile'

function makeProfile(overrides: Partial<UserProfile> = {}): UserProfile {
  return {
    id: overrides.id ?? 'p1',
    createdAt: overrides.createdAt ?? '2026-01-01T00:00:00.000Z',
    updatedAt: overrides.updatedAt ?? '2026-01-01T00:00:00.000Z',
    note: overrides.note,
    scope: overrides.scope ?? {
      dataTypes: ['journal'],
      dateRange: { kind: 'preset', preset: 'last30' },
      includedObjectIds: {},
      approxTokenCount: 0,
      locale: 'en',
      grammaticalGender: 'masculine',
    },
    sections: overrides.sections ?? createEmptySections(),
    rawResponse: overrides.rawResponse ?? '',
    model: overrides.model ?? 'gpt-test',
  }
}

describe('ProfileSectionList', () => {
  it('renders a heading for each of the 9 profile sections', () => {
    render(ProfileSectionList, {
      props: { profile: makeProfile() },
    })

    // Nine known section locale titles
    expect(screen.getByText('Summary')).toBeInTheDocument()
    expect(screen.getByText('Values and guiding principles')).toBeInTheDocument()
    expect(screen.getByText('Emotional patterns')).toBeInTheDocument()
    expect(screen.getByText('Strengths')).toBeInTheDocument()
    expect(screen.getByText('Challenges and growth edges')).toBeInTheDocument()
    expect(screen.getByText('Relationships and social patterns')).toBeInTheDocument()
    expect(screen.getByText('Themes and recurring topics')).toBeInTheDocument()
    expect(screen.getByText('Recent arc')).toBeInTheDocument()
    expect(screen.getByText('Suggested directions')).toBeInTheDocument()

    // Sanity check: count matches PROFILE_SECTION_IDS length
    expect(PROFILE_SECTION_IDS).toHaveLength(9)
  })

  it('shows the empty-state message for sections with no text', () => {
    render(ProfileSectionList, {
      props: { profile: makeProfile() },
    })

    const empties = screen.getAllByText('No observations in the selected data.')
    expect(empties).toHaveLength(PROFILE_SECTION_IDS.length)
  })

  it('renders section text verbatim when present', () => {
    const sections = createEmptySections()
    sections.summary = 'A brief summary of the person.'
    sections.strengths = 'Curious. Persistent. Honest.'

    render(ProfileSectionList, {
      props: { profile: makeProfile({ sections }) },
    })

    expect(screen.getByText('A brief summary of the person.')).toBeInTheDocument()
    expect(screen.getByText('Curious. Persistent. Honest.')).toBeInTheDocument()

    // Other sections still show the empty placeholder
    const empties = screen.getAllByText('No observations in the selected data.')
    expect(empties).toHaveLength(PROFILE_SECTION_IDS.length - 2)
  })

  it('opens the Summary section by default and leaves others closed', () => {
    const { container } = render(ProfileSectionList, {
      props: { profile: makeProfile() },
    })

    const detailElements = container.querySelectorAll('details')
    expect(detailElements).toHaveLength(PROFILE_SECTION_IDS.length)

    // First section id is 'summary'; confirm it is open.
    const summaryDetails = detailElements[0]
    expect(summaryDetails.hasAttribute('open')).toBe(true)

    // Remaining sections should be closed.
    for (let i = 1; i < detailElements.length; i++) {
      expect(detailElements[i].hasAttribute('open')).toBe(false)
    }
  })
})
