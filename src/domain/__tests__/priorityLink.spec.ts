import { describe, expect, it } from 'vitest'
import type { PriorityLink } from '@/domain/planning'
import { normalizePriorityLinkPayload, normalizePriorityPayload } from '@/domain/planning'

const now = '2026-07-23T10:00:00.000Z'

function proposedLink(): PriorityLink {
  return {
    id: 'link-1',
    createdAt: now,
    updatedAt: now,
    priorityId: 'prio-1',
    status: 'proposed',
    proposal: { objectType: 'habit', title: 'Spokojny spacer' },
    contribution: 'Wspiera regenerację',
    expectedSignal: 'Więcej dni z energią',
    validFrom: now,
  }
}

describe('normalizePriorityLinkPayload', () => {
  it('requires a proposal for proposed links and strips subject fields', () => {
    const normalized = normalizePriorityLinkPayload({
      priorityId: 'prio-1',
      status: 'proposed',
      proposal: { objectType: 'goal', title: '  Plan przygotowań  ' },
      subjectRef: { subjectType: 'goal', subjectId: 'goal-1' },
      validTo: now,
      contribution: '  porządkuje działania  ',
      expectedSignal: '',
      validFrom: now,
    })

    expect(normalized.proposal).toEqual({ objectType: 'goal', title: 'Plan przygotowań' })
    expect(normalized.subjectRef).toBeUndefined()
    expect(normalized.validTo).toBeUndefined()
    expect(normalized.contribution).toBe('porządkuje działania')
    expect(normalized.expectedSignal).toBe('')

    expect(() =>
      normalizePriorityLinkPayload({
        priorityId: 'prio-1',
        status: 'proposed',
        contribution: '',
        expectedSignal: '',
        validFrom: now,
      }),
    ).toThrow('requires a proposal')
  })

  it('requires a subjectRef for active links and strips the proposal', () => {
    const normalized = normalizePriorityLinkPayload({
      priorityId: 'prio-1',
      status: 'active',
      subjectRef: { subjectType: 'tracker', subjectId: 'tr-1' },
      proposal: { objectType: 'tracker', title: 'Energia' },
      contribution: '',
      expectedSignal: '',
      validFrom: now,
    })

    expect(normalized.subjectRef).toEqual({ subjectType: 'tracker', subjectId: 'tr-1' })
    expect(normalized.proposal).toBeUndefined()
    expect(normalized.validTo).toBeUndefined()

    expect(() =>
      normalizePriorityLinkPayload({
        priorityId: 'prio-1',
        status: 'active',
        contribution: '',
        expectedSignal: '',
        validFrom: now,
      }),
    ).toThrow('requires a subjectRef')
  })

  it('requires validTo for retired links', () => {
    expect(() =>
      normalizePriorityLinkPayload({
        priorityId: 'prio-1',
        status: 'retired',
        subjectRef: { subjectType: 'habit', subjectId: 'h-1' },
        contribution: '',
        expectedSignal: '',
        validFrom: now,
      }),
    ).toThrow('validTo')

    const normalized = normalizePriorityLinkPayload({
      priorityId: 'prio-1',
      status: 'retired',
      subjectRef: { subjectType: 'habit', subjectId: 'h-1' },
      validTo: '2026-08-01T00:00:00.000Z',
      contribution: '',
      expectedSignal: '',
      validFrom: now,
    })
    expect(normalized.validTo).toBe('2026-08-01T00:00:00.000Z')
  })

  it('drops the proposal automatically when an update resolves proposed → active', () => {
    const normalized = normalizePriorityLinkPayload(
      { status: 'active', subjectRef: { subjectType: 'habit', subjectId: 'h-9' } },
      proposedLink(),
    )

    expect(normalized.status).toBe('active')
    expect(normalized.subjectRef).toEqual({ subjectType: 'habit', subjectId: 'h-9' })
    expect(normalized.proposal).toBeUndefined()
    // Semantic fields survive the transition.
    expect(normalized.contribution).toBe('Wspiera regenerację')
    expect(normalized.expectedSignal).toBe('Więcej dni z energią')
    expect(normalized.validFrom).toBe(now)
  })

  it('rejects unknown subject and proposal types and empty ids', () => {
    expect(() =>
      normalizePriorityLinkPayload({
        priorityId: 'prio-1',
        status: 'active',
        subjectRef: { subjectType: 'exercise' as never, subjectId: 'x' },
        contribution: '',
        expectedSignal: '',
        validFrom: now,
      }),
    ).toThrow('subjectRef.subjectType')

    expect(() =>
      normalizePriorityLinkPayload({
        priorityId: 'prio-1',
        status: 'proposed',
        proposal: { objectType: 'habit', title: '   ' },
        contribution: '',
        expectedSignal: '',
        validFrom: now,
      }),
    ).toThrow('proposal.title')

    expect(() =>
      normalizePriorityLinkPayload({
        priorityId: '   ',
        status: 'proposed',
        proposal: { objectType: 'habit', title: 'x' },
        contribution: '',
        expectedSignal: '',
        validFrom: now,
      }),
    ).toThrow('priorityId')
  })
})

describe('normalizePriorityPayload — creator ritual fields', () => {
  const base: Parameters<typeof normalizePriorityPayload>[0] = {
    title: 'Kierunek',
    years: ['2026' as never],
    status: 'draft',
    lifeAreaIds: [],
    progressSignals: [],
    riskSignals: [],
  }

  it('stores influence, notControlled and a natural ending', () => {
    const normalized = normalizePriorityPayload({
      ...base,
      influence: '  rytm dnia  ',
      notControlled: 'biologia',
      endingType: 'natural',
      endingDescription: 'Rozdział zamknie się sam.',
    })

    expect(normalized.influence).toBe('rytm dnia')
    expect(normalized.notControlled).toBe('biologia')
    expect(normalized.endingType).toBe('natural')
    expect(normalized.endingDescription).toBe('Rozdział zamknie się sam.')
  })

  it('strips endingDescription unless the ending is natural', () => {
    const open = normalizePriorityPayload({
      ...base,
      endingType: 'open',
      endingDescription: 'nie powinno przetrwać',
    })
    expect(open.endingDescription).toBeUndefined()

    const none = normalizePriorityPayload({ ...base, endingDescription: 'bez typu' })
    expect(none.endingType).toBeUndefined()
    expect(none.endingDescription).toBeUndefined()

    expect(() =>
      normalizePriorityPayload({ ...base, endingType: 'deadline' as never }),
    ).toThrow('endingType')
  })
})
