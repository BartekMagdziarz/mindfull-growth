import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/vue'
import { createPinia, setActivePinia } from 'pinia'
import ProfilePreviewStep from '../ProfilePreviewStep.vue'
import type {
  ProfileDataType,
  ProfileDateRange,
} from '@/domain/userProfile'
import type { ProfilePreviewObjectHeader } from '@/services/profileScopeQueries'
import { useUserPreferencesStore } from '@/stores/userPreferences.store'

function makeDateRange(): ProfileDateRange {
  return { kind: 'preset', preset: 'last90' }
}

describe('ProfilePreviewStep', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    useUserPreferencesStore().$patch({ locale: 'en' })
  })

  it('renders a count tile for each enabled data type', () => {
    const dataTypes: ProfileDataType[] = ['journal', 'emotionLogs']
    render(ProfilePreviewStep, {
      props: {
        isLoading: false,
        error: null,
        countsByType: { journal: 5, emotionLogs: 3 },
        headers: [],
        approxTokens: 200,
        dataTypes,
        dateRange: makeDateRange(),
      },
    })

    expect(document.querySelector('[data-test-count-type="journal"]')).toBeTruthy()
    expect(document.querySelector('[data-test-count-type="emotionLogs"]')).toBeTruthy()
  })

  it('shows the token warning when approxTokens exceeds the threshold', () => {
    render(ProfilePreviewStep, {
      props: {
        isLoading: false,
        error: null,
        countsByType: { journal: 900 },
        headers: [],
        approxTokens: 180_000,
        dataTypes: ['journal'] as ProfileDataType[],
        dateRange: makeDateRange(),
      },
    })

    expect(
      screen.getByText(
        'Heads up: the selected scope is quite large. Generation may be slow or truncated.',
      ),
    ).toBeInTheDocument()
  })

  it('does not show the token warning under the threshold', () => {
    render(ProfilePreviewStep, {
      props: {
        isLoading: false,
        error: null,
        countsByType: { journal: 2 },
        headers: [],
        approxTokens: 500,
        dataTypes: ['journal'] as ProfileDataType[],
        dateRange: makeDateRange(),
      },
    })

    expect(
      screen.queryByText(
        'Heads up: the selected scope is quite large. Generation may be slow or truncated.',
      ),
    ).not.toBeInTheDocument()
  })

  it('shows the error banner when error is set', () => {
    render(ProfilePreviewStep, {
      props: {
        isLoading: false,
        error: 'Network failed',
        countsByType: {},
        headers: [],
        approxTokens: 0,
        dataTypes: ['journal'] as ProfileDataType[],
        dateRange: makeDateRange(),
      },
    })

    expect(screen.getByRole('alert')).toHaveTextContent('Network failed')
  })

  it('shows skeleton loaders while loading', () => {
    render(ProfilePreviewStep, {
      props: {
        isLoading: true,
        error: null,
        countsByType: {},
        headers: [],
        approxTokens: 0,
        dataTypes: ['journal'] as ProfileDataType[],
        dateRange: makeDateRange(),
      },
    })

    expect(document.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0)
  })

  it('shows the empty state when the scope yields no items', () => {
    render(ProfilePreviewStep, {
      props: {
        isLoading: false,
        error: null,
        countsByType: { journal: 0 },
        headers: [],
        approxTokens: 0,
        dataTypes: ['journal'] as ProfileDataType[],
        dateRange: makeDateRange(),
      },
    })

    expect(
      screen.getByText(
        'No data in this scope. Adjust the filters or pick a wider range.',
      ),
    ).toBeInTheDocument()
  })

  it('renders a source list when headers are provided', () => {
    const headers: ProfilePreviewObjectHeader[] = [
      { type: 'journal', id: 'j1', title: 'My entry', date: '2026-04-10T00:00:00.000Z' },
    ]
    render(ProfilePreviewStep, {
      props: {
        isLoading: false,
        error: null,
        countsByType: { journal: 1 },
        headers,
        approxTokens: 120,
        dataTypes: ['journal'] as ProfileDataType[],
        dateRange: makeDateRange(),
      },
    })

    expect(screen.getByText('My entry')).toBeInTheDocument()
  })
})
