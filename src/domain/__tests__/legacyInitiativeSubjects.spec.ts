import { describe, expect, it } from 'vitest'
import type { DayRef } from '@/domain/period'
import type { PriorityLink, PriorityLinkSubjectRef } from '@/domain/planning'
import { normalizePriorityLinkPayload } from '@/domain/planning'
import type { CreatePeriodObjectReflectionPayload, TodayHiddenState } from '@/domain/planningState'
import {
  normalizePeriodObjectReflectionPayload,
  normalizeTodayHiddenStatePayload,
} from '@/domain/planningState'

/**
 * The initiative entity was retired on 2026-10-20, but user databases may still
 * hold links, hidden rows and reflections that name it. Those records are
 * tolerated on read; the normalizers only guard what gets written.
 */
describe('legacy initiative subject types', () => {
  const dayRef = '2026-03-12' as DayRef
  const legacySubject = {
    subjectType: 'initiative',
    subjectId: 'initiative-1',
  } as unknown as PriorityLinkSubjectRef
  const legacyLink: PriorityLink = {
    id: 'link-1',
    createdAt: '2026-05-01T00:00:00.000Z',
    updatedAt: '2026-05-01T00:00:00.000Z',
    priorityId: 'priority-1',
    status: 'active',
    subjectRef: { subjectType: 'initiative', subjectId: 'initiative-1' },
    contribution: '',
    expectedSignal: '',
    validFrom: '2026-05-01T00:00:00.000Z',
    needsEnrichment: true,
  }

  it('lets a stored initiative link be retired without re-validating its subject', () => {
    const normalized = normalizePriorityLinkPayload(
      { status: 'retired', validTo: '2026-10-20T00:00:00.000Z' },
      legacyLink
    )

    expect(normalized.status).toBe('retired')
    expect(normalized.subjectRef).toEqual({ subjectType: 'initiative', subjectId: 'initiative-1' })
    expect(normalized.validTo).toBe('2026-10-20T00:00:00.000Z')
  })

  it('refuses to create or repoint a link at an initiative', () => {
    expect(() =>
      normalizePriorityLinkPayload({
        priorityId: 'priority-1',
        status: 'active',
        subjectRef: legacySubject,
        contribution: '',
        expectedSignal: '',
        validFrom: '2026-10-20T00:00:00.000Z',
      })
    ).toThrow(
      /subjectRef\.subjectType must be one of: goal, keyResult, habit, tracker, weeklyIntention$/
    )

    expect(() => normalizePriorityLinkPayload({ subjectRef: legacySubject }, legacyLink)).toThrow(
      /subjectRef\.subjectType must be one of/
    )
  })

  it('refuses to hide an initiative for a day and ignores a stored one as fallback', () => {
    expect(() =>
      normalizeTodayHiddenStatePayload({
        dayRef,
        subjectType: 'initiative',
        subjectId: 'initiative-1',
      } as unknown as Parameters<typeof normalizeTodayHiddenStatePayload>[0])
    ).toThrow('subjectType must be one of: keyResult, habit, tracker, weeklyIntention')

    const storedHidden: TodayHiddenState = {
      id: 'hidden-1',
      createdAt: '2026-05-01T00:00:00.000Z',
      updatedAt: '2026-05-01T00:00:00.000Z',
      dayRef,
      subjectType: 'initiative',
      subjectId: 'initiative-1',
    }
    expect(() =>
      normalizeTodayHiddenStatePayload({ dayRef: '2026-03-13' as DayRef }, storedHidden)
    ).toThrow('subjectType must be one of: keyResult, habit, tracker, weeklyIntention')
  })

  it('refuses to write a period reflection about an initiative', () => {
    expect(() =>
      normalizePeriodObjectReflectionPayload({
        periodType: 'week',
        periodRef: '2026-W10',
        subjectType: 'initiative',
        subjectId: 'initiative-1',
        note: 'Keep me',
      } as unknown as CreatePeriodObjectReflectionPayload)
    ).toThrow(
      'subjectType must be one of: goal, keyResult, habit, tracker, weeklyIntention, priority'
    )
  })
})
