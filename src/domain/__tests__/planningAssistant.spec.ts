import { describe, it, expect } from 'vitest'
import {
  mergePlannerObjects,
  plannerObjectError,
  plannerSelectionErrors,
  selectPlannerObject,
  plannerDays,
  createPlanningAssistantDraft,
} from '../planningAssistant'
import { parsePlannerReply, parsePlanningDraft } from '@/services/ai/planning/contracts'
import { plannerFixture as obj } from './planningAssistant.fixture'
describe('planning assistant domain', () => {
  it('distinguishes days, sessions and observations', () => {
    expect(plannerObjectError(obj({ target: 8 }), [])).toContain('7 dni')
    expect(plannerObjectError(obj({ target: 8, entryMode: 'counter' }), [])).toBeUndefined()
    expect(
      plannerObjectError(obj({ kind: 'tracker', target: 999, entryMode: 'rating' }), [])
    ).toBeUndefined()
  })
  it.each([-1, 1.5, NaN])('rejects invalid count %s', target =>
    expect(plannerObjectError(obj({ target }), [])).toBeTruthy()
  )
  it('rejects invalid dates and ranges exceeding one year', () => {
    expect(plannerObjectError(obj({ startDate: '2026-02-30' }), [])).toBeTruthy()
    expect(plannerObjectError(obj({ endDate: '2028-01-01' }), [])).toContain('rok')
    expect(plannerDays(obj())).toHaveLength(14)
  })
  it('requires one week for an intention', () => {
    expect(plannerObjectError(obj({ kind: 'weeklyIntention' }), [])).toContain('jeden tydzień')
    expect(
      plannerObjectError(obj({ kind: 'weeklyIntention', endDate: '2026-11-01' }), [])
    ).toBeUndefined()
  })
  it('keeps selected results and goals together', () => {
    const goal = obj({ id: 'goal', kind: 'goal', successDefinition: 'Gotowe dwa projekty.' })
    const kr = obj({ id: 'kr', kind: 'keyResult', parentId: 'goal' })
    const objects = [goal, kr]
    expect(plannerSelectionErrors(objects)).toEqual([])
    selectPlannerObject(objects, 'goal', false)
    expect(objects.every(x => !x.selected)).toBe(true)
    selectPlannerObject(objects, 'kr', true)
    expect(goal.selected).toBe(true)
    expect(plannerObjectError({ ...kr, endDate: '2026-12-01' }, objects)).toContain('terminie celu')
  })
  it('protects each manually edited field and retains omitted cards', () => {
    const current = [obj({ title: 'Mój tytuł', target: 2 }), obj({ id: 'focus', kind: 'tracker' })]
    const result = mergePlannerObjects(
      current,
      [obj({ title: 'AI', target: 5, description: 'Nowy opis' })],
      { reading: ['title', 'target'] }
    )
    expect(result[0]).toMatchObject({ title: 'Mój tytuł', target: 2, description: 'Nowy opis' })
    expect(result).toHaveLength(2)
    expect(() => mergePlannerObjects(current, [obj({ kind: 'tracker' })], {})).toThrow()
  })
  it('validates the strict response and rejects unknown fields, repeated or unsafe IDs', () => {
    const reply = { message: 'Gotowe.', suggestions: [], objects: [obj()] }
    expect(parsePlannerReply(reply)).toEqual(reply)
    expect(() => parsePlannerReply({ ...reply, write: true })).toThrow()
    expect(() => parsePlannerReply({ ...reply, objects: [obj(), obj()] })).toThrow()
    expect(() => parsePlannerReply({ ...reply, objects: [obj({ id: '__proto__' })] })).toThrow()
  })
  it('persists incomplete manual input without permitting it as AI output', () => {
    const draft = createPlanningAssistantDraft()
    draft.objects = [obj({ title: '', target: '' as unknown as number })]
    expect(parsePlanningDraft(JSON.stringify(draft)).objects[0].target).toBe('')
    expect(plannerSelectionErrors(draft.objects)).not.toEqual([])
    expect(() =>
      parsePlannerReply({ message: 'x', suggestions: [], objects: draft.objects })
    ).toThrow()
  })
  it('validates weighted daily thresholds and rating scales', () => {
    const item = obj({
      entryMode: 'multi-completion',
      multiItems: [{ id: 'one', label: 'Spacer', weight: 2 }],
      dailyThreshold: 3,
    })
    expect(plannerObjectError(item, [])).toBeTruthy()
    expect(plannerObjectError({ ...item, dailyThreshold: 2 }, [])).toBeUndefined()
    expect(plannerObjectError(obj({ entryMode: 'rating', target: 6 }), [])).toContain('skali')
  })
})
