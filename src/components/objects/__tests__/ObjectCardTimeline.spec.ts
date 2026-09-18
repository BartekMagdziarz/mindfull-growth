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
  it('draws pencil, ink up to today, the today dot and a dashed end dot', () => {
    const { container, getByText } = render(ObjectCardTimeline, {
      props: { variant: 'linear', window: linear(), start: 'Aug 2026', end: { label: 'Sep 26', hint: 'in 2 wk' } },
    })
    expect(container.querySelector('.mg-v2-timeline__pencil')).not.toBeNull()
    expect((container.querySelector('.mg-v2-timeline__ink') as HTMLElement).style.width).toBe('60%')
    expect((container.querySelector('.mg-v2-timeline__dot--today') as HTMLElement).style.left).toBe('60%')
    expect(container.querySelectorAll('.mg-v2-timeline__dot')).toHaveLength(2)
    expect(container.querySelector('.mg-v2-timeline--overdue')).toBeNull()
    expect(getByText('Sep 26')).toBeInTheDocument()
    expect(getByText(/in 2 wk/)).toBeInTheDocument()
  })

  it('turns rose and fills the end dot when overdue', () => {
    const { container } = render(ObjectCardTimeline, {
      props: {
        variant: 'linear',
        window: linear({ progress: 1, state: 'overdue', daysToEnd: -3 }),
        end: { label: 'Sep 9', hint: '3 days overdue', tone: 'bad' },
      },
    })
    expect(container.querySelector('.mg-v2-timeline--overdue')).not.toBeNull()
    expect(container.querySelector('.mg-v2-timeline__dot--hit')).not.toBeNull()
    expect(container.querySelector('.mg-v2-timeline__labels--bad')).not.toBeNull()
  })

  it('fades the pencil and shows the open label without an end dot', () => {
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
    expect(dots).toHaveLength(3)
    expect(dots[0]).toHaveClass('mg-v2-timeline__dot--done')
    expect(dots[1]).toHaveClass('mg-v2-timeline__dot--today')
    expect((dots[2] as HTMLElement).style.left).toBe('100%')
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
