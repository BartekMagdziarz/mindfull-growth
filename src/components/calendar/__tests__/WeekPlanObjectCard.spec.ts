import { describe, expect, it } from 'vitest'
import { fireEvent, render } from '@testing-library/vue'
import WeekPlanObjectCard from '@/components/calendar/WeekPlanObjectCard.vue'
import type { WeekPlanCandidate } from '@/components/calendar/weekPlanCandidate'

function makeCandidate(overrides: Partial<WeekPlanCandidate> = {}): WeekPlanCandidate {
  return {
    key: 'habit:h1',
    subjectType: 'habit',
    subjectId: 'h1',
    title: 'Morning run',
    typeLabel: 'Habit',
    entryMode: 'completion',
    target: { kind: 'count', operator: 'min', value: 1 },
    ...overrides,
  }
}

// Renders the icon name into the DOM so the checkbox glyph is assertable.
const AppIconStub = { props: ['name'], template: '<i :data-icon="name"></i>' }

function renderCard(props: { candidate?: WeekPlanCandidate; selected?: boolean } = {}) {
  return render(WeekPlanObjectCard, {
    props: {
      candidate: props.candidate ?? makeCandidate(),
      selected: props.selected ?? false,
    },
    global: {
      stubs: {
        AppIcon: AppIconStub,
        EntityIcon: true,
        MeasurementTargetSentence: true,
        AppButton: true,
      },
    },
  })
}

describe('WeekPlanObjectCard checkbox semantics', () => {
  it('renders an empty checkbox when unselected', () => {
    const { container } = renderCard({ selected: false })
    const toggle = container.querySelector('[role="checkbox"]') as HTMLElement
    expect(toggle).not.toBeNull()
    expect(toggle.getAttribute('aria-checked')).toBe('false')
    expect(toggle.querySelector('[data-icon]')?.getAttribute('data-icon')).toBe(
      'check_box_outline_blank',
    )
  })

  it('renders a ticked checkbox when selected', () => {
    const { container } = renderCard({ selected: true })
    const toggle = container.querySelector('[role="checkbox"]') as HTMLElement
    expect(toggle.getAttribute('aria-checked')).toBe('true')
    expect(toggle.querySelector('[data-icon]')?.getAttribute('data-icon')).toBe('check_box')
  })

  it('emits toggle on click', async () => {
    const { container, emitted } = renderCard()
    await fireEvent.click(container.querySelector('[role="checkbox"]') as HTMLElement)
    expect(emitted().toggle).toBeTruthy()
  })
})
