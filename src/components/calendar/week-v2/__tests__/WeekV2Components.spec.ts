import { beforeEach, describe, expect, it } from 'vitest'
import { fireEvent, render } from '@testing-library/vue'
import type { DayRef } from '@/domain/period'
import type { WeekV2DayColumn, WeekV2Section } from '@/services/weekV2Overview'
import WeekMatrixPanel from '../WeekMatrixPanel.vue'
import WeekDayGrid from '../WeekDayGrid.vue'

const days: WeekV2DayColumn[] = Array.from({ length: 7 }, (_, index) => ({
  dayRef: `2026-07-0${index + 1}` as DayRef,
  phase: index < 2 ? 'past' : index === 2 ? 'current' : 'future',
  isToday: index === 2,
  isBoundary: false,
  activity: {
    dayRef: `2026-07-0${index + 1}` as DayRef, weekdayIndex: index, isToday: index === 2,
    isFuture: index > 2, journalWritten: false, emotionCount: 0,
    quadrantCounts: { 'high-energy-high-pleasantness': 0, 'high-energy-low-pleasantness': 0, 'low-energy-high-pleasantness': 0, 'low-energy-low-pleasantness': 0 }, exerciseCount: 0,
  },
}))
const section: WeekV2Section = {
  key: 'habits', objectCount: 0, rowCount: 0, coveredRows: 0, groups: [{ key: 'habits', rows: [] }],
}

describe('Week V2 components', () => {
  beforeEach(() => window.localStorage.clear())

  it('shows a reflection CTA when the matrix is absent', () => {
    const { getByRole } = render(WeekMatrixPanel, { props: { matrix: null, unlocked: false } })
    expect(getByRole('button').textContent).toContain('Reflection unlocks on Saturday')
  })

  it('renders seven day heads and persists section disclosure', async () => {
    const { container, getByRole, unmount } = render(WeekDayGrid, { props: { days, sections: [section] } })
    expect(container.querySelectorAll('.week-grid__day')).toHaveLength(7)
    await fireEvent.click(getByRole('button', { name: /Habits/i }))
    expect(JSON.parse(window.localStorage.getItem('calendar.week-v2.sections')!)).toMatchObject({ habits: true })
    unmount()
  })

  it('ignores corrupted section storage', () => {
    window.localStorage.setItem('calendar.week-v2.sections', '{bad')
    expect(() => render(WeekDayGrid, { props: { days, sections: [section] } })).not.toThrow()
  })
})
