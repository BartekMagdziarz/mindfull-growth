import { describe, expect, it } from 'vitest'
import { render } from '@testing-library/vue'
import type { MonthV2CompassAxis, MonthV2WeeklyRadar } from '@/services/monthV2Overview'
import type { LifeAreaKey } from '@/domain/reflectionMatrix'
import MonthDimensionChart from '../MonthDimensionChart.vue'
import WeekRequirementsStateRadar from '../WeekRequirementsStateRadar.vue'

const MONTH_AXES: MonthV2CompassAxis[] = [
  { key: 'balanceRating', value: 3.8, max: 5 },
  { key: 'purposeRating', value: 4.6, max: 5 },
  { key: 'growthRating', value: 4.2, max: 5 },
  { key: 'coherenceRating', value: 3.6, max: 5 },
  { key: 'agencyRating', value: 4, max: 5 },
]

function makeRadar(
  stateOverride?: Partial<Record<LifeAreaKey, number | null>>
): MonthV2WeeklyRadar {
  const areas: Array<{ key: LifeAreaKey; requirements: number; state: number }> = [
    { key: 'body', requirements: 4, state: 3 },
    { key: 'emotions', requirements: 3, state: 4 },
    { key: 'tasks', requirements: 5, state: 2 },
    { key: 'closeOnes', requirements: 2, state: 5 },
  ]

  return {
    requirements: areas.map(area => ({ key: area.key, value: area.requirements, max: 5 })),
    state: areas.map(area => {
      const hasStateOverride = Object.prototype.hasOwnProperty.call(stateOverride ?? {}, area.key)
      return {
        key: area.key,
        value: hasStateOverride ? (stateOverride?.[area.key] ?? null) : area.state,
        max: 5,
      }
    }),
  }
}

describe('MonthDimensionChart', () => {
  it('renders five gradient capsules, value circles, labels and a soft line', () => {
    const { container, getByRole } = render(MonthDimensionChart, {
      props: { axes: MONTH_AXES, ariaLabel: 'July dimensions' },
    })

    expect(getByRole('img', { name: /July dimensions/ })).not.toBeNull()
    expect(container.querySelectorAll('.month-dimension__capsule')).toHaveLength(5)
    expect(
      container.querySelectorAll(
        '.month-dimension__value-circle:not(.month-dimension__value-circle--empty)'
      )
    ).toHaveLength(5)
    expect(container.querySelectorAll('.month-dimension__label')).toHaveLength(5)
    expect(container.querySelector('.month-dimension__line')).not.toBeNull()
    expect(container.textContent).toContain('3.8')
    expect(container.textContent).toContain('Balance')
    expect(container.textContent).toContain('Meaning')
    expect(container.innerHTML).not.toContain('NaN')
  })

  it('renders five accessible empty capsules instead of inventing values', () => {
    const { container, getByRole } = render(MonthDimensionChart, {
      props: { axes: null, ariaLabel: 'July dimensions' },
    })

    expect(getByRole('img', { name: /July dimensions.*No data/i })).not.toBeNull()
    expect(container.querySelector('svg')).not.toBeNull()
    expect(container.querySelectorAll('.month-dimension__track')).toHaveLength(5)
    expect(container.querySelectorAll('.month-dimension__value-circle--empty')).toHaveLength(5)
  })
})

describe('WeekRequirementsStateRadar', () => {
  it('renders four overlapping pastel bars with the lower value in front', () => {
    const { container, getByRole } = render(WeekRequirementsStateRadar, {
      props: { radar: makeRadar(), ariaLabel: 'Week 21 profile' },
    })

    expect(getByRole('img', { name: /Week 21 profile/ })).not.toBeNull()
    expect(container.querySelectorAll('[data-series="requirements"]')).toHaveLength(4)
    expect(container.querySelectorAll('[data-series="state"]')).toHaveLength(4)
    const firstAxis = container.querySelector('.week-bar__axis')
    expect(firstAxis?.querySelector('[data-series="requirements"]')?.classList).toContain(
      'week-bar__fill--back'
    )
    expect(firstAxis?.querySelector('[data-series="state"]')?.classList).toContain(
      'week-bar__fill--front'
    )
    expect(container.querySelector('[data-series="actions"]')).toBeNull()
    expect(container.querySelectorAll('.week-bar__axis')).toHaveLength(4)
    expect(container.innerHTML).not.toContain('NaN')
  })

  it('keeps partial state data without inventing a missing bar', () => {
    const { container } = render(WeekRequirementsStateRadar, {
      props: { radar: makeRadar({ tasks: null }) },
    })

    expect(container.querySelectorAll('[data-series="requirements"]')).toHaveLength(4)
    expect(container.querySelectorAll('[data-series="state"]')).toHaveLength(3)
    expect(container.innerHTML).not.toContain('NaN')
  })

  it('merges equal ratings into one violet bar', () => {
    const { container } = render(WeekRequirementsStateRadar, {
      props: { radar: makeRadar({ body: 4 }) },
    })

    expect(container.querySelector('.week-bar__fill--equal')).not.toBeNull()
  })

  it('keeps an empty radar accessible when no weekly reflection exists', () => {
    const { container, getByRole } = render(WeekRequirementsStateRadar, {
      props: { radar: null, ariaLabel: 'Week 21 profile' },
    })

    expect(getByRole('img', { name: /Week 21 profile.*No weekly reflection/i })).not.toBeNull()
    expect(container.querySelectorAll('.week-bar__fill')).toHaveLength(0)
    expect(container.querySelector('.week-radar__empty')?.textContent?.trim()).toBe('—')
  })
})
