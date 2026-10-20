import { describe, expect, it } from 'vitest'
import { fireEvent, render } from '@testing-library/vue'
import ObjectCardTimeline from '@/components/objects/ObjectCardTimeline.vue'
import type { DayRef, YearRef } from '@/domain/period'
import type { ObjectWindow, YearsWindow } from '@/utils/objectWindow'

function linear(overrides: Partial<ObjectWindow> = {}): ObjectWindow {
  return {
    start: '2026-08-01' as DayRef,
    end: '2026-09-26' as DayRef,
    progress: 0.6,
    state: 'running',
    daysToEnd: 14,
    ...overrides,
  }
}

describe('ObjectCardTimeline', () => {
  it('draws the cloud, fills it up to today and places the today disc', () => {
    const { container, getByText } = render(ObjectCardTimeline, {
      props: { variant: 'linear', window: linear(), start: 'Aug 2026', end: { label: 'Sep 26', hint: 'in 2 wk' } },
    })
    expect(container.querySelector('.mg-v2-timeline__cloud')).not.toBeNull()
    const fill = container.querySelector('.mg-v2-timeline__fill') as HTMLElement
    expect(fill.style.getPropertyValue('--mg-timeline-progress')).toBe('60%')
    expect((container.querySelector('.mg-v2-timeline__dot--today') as HTMLElement).style.left).toBe('60%')
    // The deadline is the end of the cloud itself: no separate end dot.
    expect(container.querySelectorAll('.mg-v2-timeline__dot')).toHaveLength(1)
    expect(container.querySelector('.mg-v2-timeline--overdue')).toBeNull()
    expect(getByText('Sep 26')).toBeInTheDocument()
    expect(getByText(/in 2 wk/)).toBeInTheDocument()
  })

  it('turns rose when overdue', () => {
    const { container } = render(ObjectCardTimeline, {
      props: {
        variant: 'linear',
        window: linear({ progress: 1, state: 'overdue', daysToEnd: -3 }),
        end: { label: 'Sep 9', hint: '3 days overdue', tone: 'bad' },
      },
    })
    expect(container.querySelector('.mg-v2-timeline--overdue')).not.toBeNull()
    const fill = container.querySelector('.mg-v2-timeline__fill') as HTMLElement
    expect(fill.style.getPropertyValue('--mg-timeline-progress')).toBe('100%')
    expect(container.querySelector('.mg-v2-timeline__labels--bad')).not.toBeNull()
  })

  it('dissolves the cloud and shows the open label', () => {
    const { container, getByText } = render(ObjectCardTimeline, {
      props: {
        variant: 'linear',
        window: linear({ end: null, progress: 0.4, state: 'open', daysToEnd: null }),
        start: 'May 2026',
        openLabel: 'no deadline',
      },
    })
    expect(container.querySelector('.mg-v2-timeline--open')).not.toBeNull()
    expect(container.querySelectorAll('.mg-v2-timeline__dot')).toHaveLength(1)
    expect(getByText('no deadline')).toBeInTheDocument()
  })

  it('renders one dot per year with done/current states', () => {
    const years: YearsWindow = {
      years: [
        { ref: '2025' as YearRef, state: 'done' },
        { ref: '2026' as YearRef, state: 'current' },
        { ref: '2027' as YearRef, state: 'future' },
      ],
      progress: 0.85,
    }
    const { container, getByText } = render(ObjectCardTimeline, { props: { variant: 'years', years } })
    const dots = container.querySelectorAll('.mg-v2-timeline__dot')
    // Three year dots plus the today disc at the sky's feathered edge.
    expect(dots).toHaveLength(4)
    expect(dots[0]).toHaveClass('mg-v2-timeline__dot--done')
    expect(dots[1]).toHaveClass('mg-v2-timeline__dot--current')
    expect((dots[2] as HTMLElement).style.left).toBe('100%')
    expect(dots[3]).toHaveClass('mg-v2-timeline__dot--today')
    expect((dots[3] as HTMLElement).style.left).toBe('85%')
    expect(getByText('2026')).toHaveClass('mg-v2-timeline__labels--current')
  })

  it('is a button that emits click only when interactive', async () => {
    const { getByRole, emitted } = render(ObjectCardTimeline, {
      props: { variant: 'linear', window: linear(), interactive: true, label: 'Goal months' },
    })
    await fireEvent.click(getByRole('button', { name: 'Goal months' }))
    expect(emitted().click).toHaveLength(1)
  })
})
