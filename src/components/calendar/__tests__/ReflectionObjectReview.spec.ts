import { describe, expect, it } from 'vitest'
import { fireEvent, render } from '@testing-library/vue'
import ReflectionObjectReview from '@/components/calendar/ReflectionObjectReview.vue'
import type { DayRef, WeekRef } from '@/domain/period'
import type { WeekObjectItem } from '@/services/reflectionDataQueries'

function makeItem(key: string): WeekObjectItem {
  const [subjectType, id] = key.split(':')
  return {
    key,
    subjectType,
    subject: { id, title: `Object ${id}` },
    planning: { scheduleScope: 'whole-week', scheduledDayRefs: [] },
    measurement: { entryMode: 'completion', cadence: 'weekly', entryCount: 0, periodRef: '2026-W10' },
    sortOrder: 0,
  } as unknown as WeekObjectItem
}

function renderReview(overrides: Record<string, unknown> = {}) {
  return render(ReflectionObjectReview, {
    props: {
      items: [makeItem('habit:a'), makeItem('weeklyIntention:b')],
      rawEntries: [],
      allDayAssignments: [],
      weekRef: '2026-W10' as WeekRef,
      todayDayRef: '2026-03-09' as DayRef,
      topPriorityKeys: ['weeklyIntention:b'],
      comments: {},
      ...overrides,
    },
    global: { stubs: { WeekObjectTile: true, AppIcon: true } },
  })
}

describe('ReflectionObjectReview', () => {
  it('stars only the top-priority objects', () => {
    const { container } = renderReview()
    expect(container.querySelectorAll('.review-item__star')).toHaveLength(1)
  })

  it('reveals a comment field on click and emits the typed value', async () => {
    const { container, emitted } = renderReview()
    expect(container.querySelector('textarea')).toBeNull()

    const tiles = container.querySelectorAll('.review-item__tile')
    await fireEvent.click(tiles[0])

    const textarea = container.querySelector('textarea')
    expect(textarea).not.toBeNull()

    await fireEvent.update(textarea as HTMLTextAreaElement, 'Went well')
    const updates = emitted()['update:comments'] as unknown[][]
    expect(updates).toBeTruthy()
    expect(updates.at(-1)?.[0]).toMatchObject({ 'habit:a': 'Went well' })
  })

  it('auto-expands objects that already have a comment', () => {
    const { container } = renderReview({ comments: { 'weeklyIntention:b': 'prior note' } })
    const textarea = container.querySelector('textarea') as HTMLTextAreaElement
    expect(textarea).not.toBeNull()
    expect(textarea.value).toBe('prior note')
  })
})
