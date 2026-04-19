import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/vue'
import { createPinia, setActivePinia } from 'pinia'
import ProfileScopeStep from '../ProfileScopeStep.vue'
import {
  PROFILE_DATA_TYPES,
  type ProfileDataType,
  type ProfileDateRange,
  type ProfileScopeFilters,
} from '@/domain/userProfile'
import { useUserPreferencesStore } from '@/stores/userPreferences.store'

function makeFilters(): ProfileScopeFilters {
  return {
    emotionQuadrants: [],
    peopleTagIds: [],
    contextTagIds: [],
    lifeAreaIds: [],
  }
}

describe('ProfileScopeStep', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    useUserPreferencesStore().$patch({ locale: 'en' })
  })

  it('renders a row for each of the 7 data types', () => {
    render(ProfileScopeStep, {
      props: {
        dataTypes: [...PROFILE_DATA_TYPES],
        dateRange: { kind: 'preset', preset: 'last90' } as ProfileDateRange,
        filters: makeFilters(),
      },
    })

    for (const type of PROFILE_DATA_TYPES) {
      expect(document.querySelector(`[data-test-type="${type}"]`)).toBeTruthy()
    }
  })

  it('emits update:dataTypes when a checkbox is toggled off', async () => {
    const { emitted } = render(ProfileScopeStep, {
      props: {
        dataTypes: ['journal'] as ProfileDataType[],
        dateRange: { kind: 'preset', preset: 'last90' } as ProfileDateRange,
        filters: makeFilters(),
      },
    })

    const checkbox = document.querySelector(
      '[data-test-type="journal"]',
    ) as HTMLInputElement
    await fireEvent.click(checkbox)

    const events = emitted()['update:dataTypes'] as unknown[][]
    expect(events).toBeTruthy()
    expect(events![0][0]).toEqual([])
  })

  it('emits update:dataTypes when a new type is toggled on', async () => {
    const { emitted } = render(ProfileScopeStep, {
      props: {
        dataTypes: [] as ProfileDataType[],
        dateRange: { kind: 'preset', preset: 'last90' } as ProfileDateRange,
        filters: makeFilters(),
      },
    })

    const checkbox = document.querySelector(
      '[data-test-type="weeklyReflections"]',
    ) as HTMLInputElement
    await fireEvent.click(checkbox)

    const events = emitted()['update:dataTypes'] as unknown[][]
    expect(events).toBeTruthy()
    expect(events![0][0]).toEqual(['weeklyReflections'])
  })

  it('reveals custom date inputs when the Custom preset is selected', async () => {
    const { rerender } = render(ProfileScopeStep, {
      props: {
        dataTypes: ['journal'] as ProfileDataType[],
        dateRange: { kind: 'preset', preset: 'last90' } as ProfileDateRange,
        filters: makeFilters(),
      },
    })

    expect(document.querySelector('[data-test-custom-start]')).toBeFalsy()

    const customBtn = screen.getByRole('button', { name: 'Custom' })
    await fireEvent.click(customBtn)

    // The parent owns the dateRange, so simulate it flipping to 'custom'.
    await rerender({
      dataTypes: ['journal'] as ProfileDataType[],
      dateRange: { kind: 'custom', start: '2026-01-01', end: '2026-01-31' } as ProfileDateRange,
      filters: makeFilters(),
    })

    expect(document.querySelector('[data-test-custom-start]')).toBeTruthy()
    expect(document.querySelector('[data-test-custom-end]')).toBeTruthy()
  })
})
