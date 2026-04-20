import { describe, it, expect } from 'vitest'
import { buildUserContext } from '../userContext'
import {
  PROFILE_SECTION_IDS,
  type ProfileSections,
  type UserProfile,
} from '@/domain/userProfile'

function emptySections(): ProfileSections {
  return {
    summary: '',
    values: '',
    emotionalPatterns: '',
    strengths: '',
    challenges: '',
    relationships: '',
    themes: '',
    recentArc: '',
    suggestedDirections: '',
  }
}

function makeProfile(
  sections: Partial<ProfileSections> = {},
  note?: string,
): UserProfile {
  return {
    id: 'p1',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    note,
    scope: {
      dataTypes: [],
      dateRange: { kind: 'preset', preset: 'last90' },
      filters: {},
      includedObjectIds: {},
      approxTokenCount: 0,
      locale: 'en',
      grammaticalGender: 'masculine',
    },
    sections: { ...emptySections(), ...sections },
    rawResponse: '',
    model: 'test-model',
  }
}

describe('buildUserContext', () => {
  it('returns empty string when profile is undefined', () => {
    expect(buildUserContext(undefined)).toBe('')
  })

  it('returns empty string when profile is null', () => {
    expect(buildUserContext(null)).toBe('')
  })

  it('returns empty string when every section is empty', () => {
    expect(buildUserContext(makeProfile())).toBe('')
  })

  it('returns empty string when every section is whitespace only', () => {
    const sections = emptySections()
    for (const id of PROFILE_SECTION_IDS) {
      sections[id] = '   \n \t '
    }
    expect(buildUserContext(makeProfile(sections))).toBe('')
  })

  it('renders header and the single populated section without stray labels', () => {
    const out = buildUserContext(
      makeProfile({ summary: 'Curious, reflective.' }),
    )
    expect(out).toContain('## User Profile Context')
    expect(out).toContain('### Summary')
    expect(out).toContain('Curious, reflective.')
    // Non-populated sections are skipped — no blank headers.
    expect(out).not.toContain('### Values')
    expect(out).not.toContain('### Strengths')
  })

  it('renders the note on the second line when present', () => {
    const out = buildUserContext(
      makeProfile({ summary: 'S' }, 'Q1 review'),
    )
    const lines = out.split('\n')
    expect(lines[0]).toBe('## User Profile Context')
    expect(lines[1]).toBe('_Note: Q1 review_')
  })

  it('omits the note line when the note is missing or whitespace', () => {
    const withoutNote = buildUserContext(makeProfile({ summary: 'S' }))
    expect(withoutNote).not.toContain('_Note:')

    const whitespaceNote = buildUserContext(
      makeProfile({ summary: 'S' }, '   \t '),
    )
    expect(whitespaceNote).not.toContain('_Note:')
  })

  it('renders sections in the canonical PROFILE_SECTION_IDS order', () => {
    // Populate a handful of sections; the buildUserContext helper must
    // emit them in PROFILE_SECTION_IDS order no matter how the input is
    // spread into the object.
    const sections: Partial<ProfileSections> = {
      suggestedDirections: 'Z suggested',
      summary: 'A summary',
      strengths: 'M strengths',
      recentArc: 'Y recent arc',
      values: 'B values',
    }
    const out = buildUserContext(makeProfile(sections))

    const positions = [
      out.indexOf('### Summary'),
      out.indexOf('### Values'),
      out.indexOf('### Strengths'),
      out.indexOf('### Recent Arc'),
      out.indexOf('### Suggested Directions'),
    ]
    // Every header was found...
    expect(positions.every((p) => p >= 0)).toBe(true)
    // ...and they appear strictly increasing, i.e. canonical order.
    const sorted = [...positions].sort((a, b) => a - b)
    expect(positions).toEqual(sorted)
  })

  it('trims whitespace from section bodies but keeps internal formatting', () => {
    const out = buildUserContext(
      makeProfile({ summary: '  Curious.\n  Reflective.\n  ' }),
    )
    // Body is trimmed at the edges.
    expect(out).toContain('Curious.\n  Reflective.')
    // Leading whitespace ahead of "Curious." is gone.
    expect(out).not.toContain('  Curious.')
  })

  it('produces a deterministic output for identical input', () => {
    const profile = makeProfile(
      { summary: 'S', values: 'V', challenges: 'C' },
      'A note',
    )
    const a = buildUserContext(profile)
    const b = buildUserContext(profile)
    expect(a).toBe(b)
  })
})
