import { describe, expect, it } from 'vitest'
import type { MicroExerciseStep } from '@/domain/microExercises'
import { hasStepsAfter, isMicroStepVisible, visibleMicroSteps } from '@/utils/microExerciseFlow'

const steps: MicroExerciseStep[] = [
  { key: 'had', type: 'choice', options: ['none', 'mild', 'strong'] },
  { key: 'intensity', type: 'slider', min: 0, max: 10, showWhen: { step: 'had', in: ['mild', 'strong'] } },
  { key: 'quiet', type: 'textarea', showWhen: { step: 'had', in: ['none'] } },
  { key: 'areas', type: 'choice', options: ['work', 'body'], multiple: true },
  { key: 'body', type: 'textarea', showWhen: { step: 'areas', in: ['body'] } },
  { key: 'always', type: 'textarea' },
]

describe('micro exercise flow', () => {
  it('hides conditional steps until the choice is answered', () => {
    expect(visibleMicroSteps(steps, {}).map((step) => step.key)).toEqual(['had', 'areas', 'always'])
  })

  it('shows the branch matching a single choice', () => {
    expect(visibleMicroSteps(steps, { had: 'none' }).map((step) => step.key)).toEqual([
      'had',
      'quiet',
      'areas',
      'always',
    ])
    expect(visibleMicroSteps(steps, { had: 'strong' }).map((step) => step.key)).toEqual([
      'had',
      'intensity',
      'areas',
      'always',
    ])
  })

  it('matches a multiple choice when any picked option is listed', () => {
    const body = steps[4]!
    expect(isMicroStepVisible(body, { areas: ['work'] })).toBe(false)
    expect(isMicroStepVisible(body, { areas: ['work', 'body'] })).toBe(true)
    expect(isMicroStepVisible(body, { areas: [] })).toBe(false)
  })

  it('counts gated steps behind an unanswered choice as still ahead', () => {
    const branchOnly = steps.slice(0, 3)
    expect(hasStepsAfter(branchOnly, 'had', {})).toBe(true)
    expect(hasStepsAfter(branchOnly, 'had', { had: 'none' })).toBe(true)
    expect(hasStepsAfter(branchOnly, 'quiet', { had: 'none' })).toBe(false)
    expect(hasStepsAfter(branchOnly, 'intensity', { had: 'strong' })).toBe(false)
  })
})

// ── v2: AND conditions, presets, entry picks, hints ──────────────────

import type { MicroExerciseEntry } from '@/domain/microExercises'
import { entryMatches, pickableEntries, resolveMicroHint } from '@/utils/microExerciseFlow'

const branched: MicroExerciseStep[] = [
  { key: 'kind', type: 'choice', options: ['shame', 'anger'] },
  { key: 'had', type: 'choice', options: ['none', 'yes'] },
  { key: 'about', type: 'choice', options: ['act', 'event'], showWhen: [{ step: 'kind', in: ['shame'] }, { step: 'had', in: ['yes'] }] },
  { key: 'thought', type: 'textarea', showWhen: [{ step: 'kind', in: ['anger'] }, { step: 'had', in: ['yes'] }] },
  { key: 'kind2', type: 'textarea', showWhen: { step: 'had', in: ['yes'] } },
]

function entry(id: string, exerciseSlug: string, createdAt: string, responses: MicroExerciseEntry['responses']): MicroExerciseEntry {
  return { id, exerciseSlug, createdAt, updatedAt: createdAt, responses }
}

describe('micro exercise flow v2', () => {
  it('requires every condition of an array (AND)', () => {
    expect(visibleMicroSteps(branched, { kind: 'shame' }).map((s) => s.key)).toEqual(['kind', 'had'])
    expect(visibleMicroSteps(branched, { kind: 'shame', had: 'yes' }).map((s) => s.key)).toEqual(['kind', 'had', 'about', 'kind2'])
    expect(visibleMicroSteps(branched, { kind: 'anger', had: 'yes' }).map((s) => s.key)).toEqual(['kind', 'had', 'thought', 'kind2'])
    expect(visibleMicroSteps(branched, { kind: 'anger', had: 'none' }).map((s) => s.key)).toEqual(['kind', 'had'])
  })

  it('hides preset steps and saves nothing for them in the flow', () => {
    expect(visibleMicroSteps(branched, { kind: 'shame', had: 'yes' }, { kind: 'shame' }).map((s) => s.key)).toEqual([
      'had',
      'about',
      'kind2',
    ])
  })

  it('hasStepsAfter: an AND-gated step counts as ahead only while its answered conditions still hold', () => {
    // kind = anger answered, had unanswered → 'thought' may still come.
    expect(hasStepsAfter(branched, 'kind', { kind: 'anger' })).toBe(true)
    // had = none → nothing gated on had=yes can appear; the preset kind is skipped.
    expect(hasStepsAfter(branched, 'had', { kind: 'anger', had: 'none' }, { kind: 'anger' })).toBe(false)
    expect(hasStepsAfter(branched, 'had', { kind: 'anger', had: 'yes' }, { kind: 'anger' })).toBe(true)
  })

  it('entryMatches reads the entry’s own choice answers', () => {
    const shame = entry('a', 'moments', '2026-09-20T10:00:00.000Z', { kind: 'shame', hadMoment: 'yes' })
    expect(entryMatches(shame, [{ step: 'kind', in: ['shame'] }, { step: 'hadMoment', in: ['yes'] }])).toBe(true)
    expect(entryMatches(shame, { step: 'kind', in: ['anger'] })).toBe(false)
    expect(entryMatches(shame, undefined)).toBe(true)
  })

  it('pickableEntries: right slug, filter, window, limit, newest first', () => {
    const now = new Date('2026-09-26T12:00:00.000Z')
    const entries = [
      entry('old', 'moments', '2026-08-01T10:00:00.000Z', { kind: 'shame', hadMoment: 'yes', situation: 'old' }),
      entry('quiet', 'moments', '2026-09-24T10:00:00.000Z', { kind: 'shame', hadMoment: 'none' }),
      entry('anger', 'moments', '2026-09-25T10:00:00.000Z', { kind: 'anger', hadMoment: 'yes' }),
      entry('s1', 'moments', '2026-09-20T10:00:00.000Z', { kind: 'shame', hadMoment: 'yes', situation: 's1' }),
      entry('s2', 'moments', '2026-09-25T09:00:00.000Z', { kind: 'shame', hadMoment: 'yes', situation: 's2' }),
      entry('map', 'shame-map', '2026-09-25T11:00:00.000Z', { standard: 'x' }),
    ]
    const step = {
      key: 'episode',
      type: 'entryPick' as const,
      slug: 'moments',
      show: ['situation'],
      filter: [
        { step: 'kind', in: ['shame'] },
        { step: 'hadMoment', in: ['yes'] },
      ],
    }
    expect(pickableEntries(step, entries, now).map((e) => e.id)).toEqual(['s2', 's1'])
    expect(pickableEntries({ ...step, limit: 1 }, entries, now).map((e) => e.id)).toEqual(['s2'])
    expect(pickableEntries({ ...step, days: 90 }, entries, now).map((e) => e.id)).toEqual(['s2', 's1', 'old'])
  })

  it('resolveMicroHint: latest matching entry, or the picked one; undefined when nothing to quote', () => {
    const entries = [
      entry('m1', 'shame-map', '2026-09-01T10:00:00.000Z', { bodySigns: ['old'] }),
      entry('m2', 'shame-map', '2026-09-20T10:00:00.000Z', { bodySigns: ['hot face', 'lowered eyes'] }),
      entry('mo', 'moments', '2026-09-21T10:00:00.000Z', { kind: 'shame', situation: 'meeting' }),
    ]
    expect(resolveMicroHint({ source: 'latest', slug: 'shame-map', step: 'bodySigns' }, entries, {})).toEqual([
      'hot face',
      'lowered eyes',
    ])
    expect(
      resolveMicroHint({ source: 'latest', slug: 'moments', step: 'situation', filter: { step: 'kind', in: ['anger'] } }, entries, {}),
    ).toBeUndefined()
    expect(resolveMicroHint({ source: 'picked', pickStep: 'episode', step: 'situation' }, entries, { episode: 'mo' })).toBe(
      'meeting',
    )
    expect(resolveMicroHint({ source: 'picked', pickStep: 'episode', step: 'situation' }, entries, {})).toBeUndefined()
    expect(resolveMicroHint({ source: 'latest', slug: 'nothing', step: 'x' }, entries, {})).toBeUndefined()
  })
})
