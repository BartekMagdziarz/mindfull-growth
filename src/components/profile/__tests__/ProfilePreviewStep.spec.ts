import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/vue'
import { createPinia, setActivePinia } from 'pinia'
import ProfilePreviewStep from '../ProfilePreviewStep.vue'
import type {
  ProfileAgeBucket,
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

  it('renders the per-type × age token breakdown when provided', () => {
    render(ProfilePreviewStep, {
      props: {
        isLoading: false,
        error: null,
        countsByType: { journal: 5, emotionLogs: 3 },
        headers: [],
        approxTokens: 9300,
        dataTypes: ['journal', 'emotionLogs'] as ProfileDataType[],
        dateRange: makeDateRange(),
        tokensByType: { journal: 9100, emotionLogs: 200 },
        tokensByAge: {
          '0-30d': 3400,
          '31-90d': 0,
          '91-365d': 5900,
          '365d+': 0,
          undated: 0,
        } as Record<ProfileAgeBucket, number>,
      },
    })

    expect(document.querySelector('[data-test="token-breakdown"]')).toBeTruthy()
    expect(document.querySelector('[data-test-tokens-type="journal"]')).toBeTruthy()
    expect(document.querySelector('[data-test-tokens-type="emotionLogs"]')).toBeTruthy()
    expect(document.querySelector('[data-test-tokens-age="0-30d"]')).toBeTruthy()
    expect(document.querySelector('[data-test-tokens-age="91-365d"]')).toBeTruthy()
    // Zero-cost buckets are dropped.
    expect(document.querySelector('[data-test-tokens-age="31-90d"]')).toBeFalsy()
    expect(document.querySelector('[data-test-tokens-age="undated"]')).toBeFalsy()
    // Thousands are rendered compactly.
    expect(screen.getByText('9.1k')).toBeInTheDocument()
  })

  it('omits the token breakdown when no token data is provided', () => {
    render(ProfilePreviewStep, {
      props: {
        isLoading: false,
        error: null,
        countsByType: { journal: 5 },
        headers: [],
        approxTokens: 200,
        dataTypes: ['journal'] as ProfileDataType[],
        dateRange: makeDateRange(),
      },
    })

    expect(document.querySelector('[data-test="token-breakdown"]')).toBeFalsy()
  })

  it('shows the trimmed notice (K of M) when records were dropped to fit', () => {
    render(ProfilePreviewStep, {
      props: {
        isLoading: false,
        error: null,
        countsByType: { journal: 400 },
        headers: [],
        approxTokens: 9000,
        dataTypes: ['journal'] as ProfileDataType[],
        dateRange: makeDateRange(),
        droppedByType: { journal: 80 },
      },
    })

    const notice = document.querySelector('[data-test="trimmed-notice"]')
    expect(notice).toBeTruthy()
    expect(notice?.textContent).toContain('80')
    expect(notice?.textContent).toContain('400')
  })

  it('omits the trimmed notice when nothing was dropped', () => {
    render(ProfilePreviewStep, {
      props: {
        isLoading: false,
        error: null,
        countsByType: { journal: 5 },
        headers: [],
        approxTokens: 200,
        dataTypes: ['journal'] as ProfileDataType[],
        dateRange: makeDateRange(),
        droppedByType: {},
      },
    })

    expect(document.querySelector('[data-test="trimmed-notice"]')).toBeFalsy()
  })

  it('shows the summarized-history notice when older periods were summarized', () => {
    render(ProfilePreviewStep, {
      props: {
        isLoading: false,
        error: null,
        countsByType: { journal: 200 },
        headers: [],
        approxTokens: 9000,
        dataTypes: ['journal'] as ProfileDataType[],
        dateRange: makeDateRange(),
        summarizedPeriods: 12,
      },
    })

    const notice = document.querySelector('[data-test="summarized-notice"]')
    expect(notice).toBeTruthy()
    expect(notice?.textContent).toContain('12')
  })

  it('omits the summarized-history notice when nothing was summarized', () => {
    render(ProfilePreviewStep, {
      props: {
        isLoading: false,
        error: null,
        countsByType: { journal: 5 },
        headers: [],
        approxTokens: 200,
        dataTypes: ['journal'] as ProfileDataType[],
        dateRange: makeDateRange(),
        summarizedPeriods: 0,
      },
    })

    expect(document.querySelector('[data-test="summarized-notice"]')).toBeFalsy()
  })
})
