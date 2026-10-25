import { describe, expect, it } from 'vitest'
import { render } from '@testing-library/vue'
import ObjectsLibraryMeasurementCard from '@/components/objects/ObjectsLibraryMeasurementCard.vue'
import type { ObjectsLibraryListItem } from '@/services/objectsLibraryQueries'

function habit(overrides: Partial<ObjectsLibraryListItem> = {}): ObjectsLibraryListItem {
  return {
    id: 'habit-1',
    panelType: 'habit',
    title: 'Meditation',
    status: 'open',
    isActive: true,
    cadence: 'weekly',
    entryMode: 'completion',
    chartData: [
      { periodRef: '2026-W40', actualValue: 3, targetValue: 3, status: 'met' },
      { periodRef: '2026-W41', actualValue: 1, targetValue: 3, status: 'missed' },
    ],
    ...overrides,
  }
}

function renderCard(item = habit()) {
  return render(ObjectsLibraryMeasurementCard, {
    props: {
      item,
      panelType: 'habit',
      isExpanded: false,
      linkedPeriods: [],
      cadenceOptions: [{ value: 'weekly', label: 'Weekly' }],
      entryModeOptions: [{ value: 'completion', label: 'Completion' }],
      statusOptions: [{ value: 'open', label: 'Open' }],
      priorityOptions: [],
      lifeAreaOptions: [],
    },
    global: {
      stubs: {
        IconPicker: true,
        AppIcon: true,
        ObjectCardAffiliation: true,
        GoalLinksDropdown: true,
        PeriodCalendarPicker: true,
        ObjectCardPeriods: true,
        MeasurementTargetSentence: true,
        MultiItemsEditor: true,
        MeasurementSparkline: { template: '<div data-testid="sparkline" />' },
      },
    },
  })
}

describe('ObjectsLibraryMeasurementCard — measurement field', () => {
  it('puts the quiet facts and the chart into one field without its own frame', () => {
    const { getByTestId } = renderCard()
    const field = getByTestId('measurement-field')
    expect(field.classList).not.toContain('mg-v2-surface--flat')
    expect(field.querySelector('.mg-v2-meta')?.textContent).toContain('Weekly')
    expect(field.querySelector('[data-testid="sparkline"]')).not.toBeNull()
  })

  it('leaves the facts on the card when there is no chart', () => {
    const { getByTestId } = renderCard(habit({ chartData: undefined }))
    const field = getByTestId('measurement-field')
    expect(field.classList).not.toContain('mg-v2-surface--flat')
    expect(field.querySelector('.mg-v2-meta')).not.toBeNull()
  })
})
