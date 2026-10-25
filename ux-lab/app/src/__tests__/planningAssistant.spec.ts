import { describe, expect, it } from 'vitest'
import {
  createPlannerExample,
  plannerMeasurementSentence,
  plannerObjectError,
  plannerSelectionErrors,
  selectPlannerObject,
} from '~lab/lab/planningAssistant'

describe('planning assistant examples and selection', () => {
  it('distinguishes sessions from separate days without creating a second measurement', () => {
    const days = createPlannerExample('reading', 0)
    const sessions = createPlannerExample('reading', 1)
    expect(days[0].entryMode).toBe('completion')
    expect(sessions[0].entryMode).toBe('counter')
    expect(plannerMeasurementSentence(days[0])).toContain('3 dni')
    expect(plannerMeasurementSentence(sessions[0])).toContain('3 wykonania')
    expect(days.filter(item => item.selected)).toHaveLength(1)
    expect(days[1].kind).toBe('tracker')
    expect(plannerMeasurementSentence(days[1])).toContain('bez targetu')
  })
  it('never changes another example when a draft is edited', () => {
    const first = createPlannerExample('portfolio')
    first[1].days.push(0)
    first[1].title = 'Moja wersja'
    const next = createPlannerExample('portfolio')
    expect(next[1].days).toEqual([])
    expect(next[1].title).toBe('Opisać dwa projekty')
  })
  it('deselects a goal with its children and restores the parent for a selected child', () => {
    const items = createPlannerExample('portfolio')
    selectPlannerObject(items, 'portfolio', false)
    expect(items.every(item => !item.selected)).toBe(true)
    expect(selectPlannerObject(items, 'publish', true)).toBeTruthy()
    expect(items.map(item => item.selected)).toEqual([true, false, true])
    expect(plannerSelectionErrors(items)).toEqual([])
  })
  it('requires at least one selected result rather than silently creating an empty SMART goal', () => {
    const items = createPlannerExample('portfolio')
    selectPlannerObject(items, 'case-studies', false)
    selectPlannerObject(items, 'publish', false)
    expect(plannerSelectionErrors(items)[0]).toContain('rezultat')
  })
  it('does not validate unselected optional proposals', () => {
    const items = createPlannerExample('reading')
    items[1].title = ''
    expect(plannerSelectionErrors(items)).toEqual([])
    selectPlannerObject(items, 'focus', true)
    expect(plannerSelectionErrors(items)[0]).toContain('Nadaj nazwę')
  })
  it('rejects impossible weekly day targets but accepts several sessions per day', () => {
    const items = createPlannerExample('reading')
    items[0].target = 8
    expect(plannerObjectError(items[0], items)).toContain('7 dni')
    items[0].entryMode = 'counter'
    expect(plannerObjectError(items[0], items)).toBeUndefined()
    items[0].target = 2.5
    expect(plannerObjectError(items[0], items)).toContain('targetu')
  })
  it('reports malformed or reversed dates without throwing', () => {
    const items = createPlannerExample('reading')
    for (const value of ['', '2026-99-99', '2026-02-30', '2026-12-01']) {
      items[0].startDate = value
      expect(plannerObjectError(items[0], items)).toContain('dat')
    }
  })
  it('checks rating targets against the scale, while a tracker remains untargeted', () => {
    const items = createPlannerExample('reading')
    const tracker = items[1]
    tracker.target = 100
    expect(plannerObjectError(tracker, items)).toBeUndefined()
    tracker.kind = 'habit'
    expect(plannerObjectError(tracker, items)).toContain('skali')
    tracker.ratingMax = 1
    expect(plannerObjectError(tracker, items)).toContain('zakres')
  })
  it('validates list items and daily threshold independently from the period target', () => {
    const items = createPlannerExample('reading')
    const item = items[0]
    item.entryMode = 'multi-completion'
    item.dailyThreshold = 3
    expect(plannerObjectError(item, items)).toContain('próg')
    item.dailyThreshold = 2
    expect(plannerObjectError(item, items)).toBeUndefined()
    item.items[0] = ''
    expect(plannerObjectError(item, items)).toContain('elementy')
  })
  it('keeps a weekly intention inside one Monday-to-Sunday week', () => {
    const items = createPlannerExample('week')
    items[0].endDate = '2026-11-08'
    expect(plannerObjectError(items[0], items)).toContain('jeden tydzień')
  })
  it.each(['reading', 'portfolio', 'week'] as const)(
    'offers a valid minimal selection for %s',
    sample => {
      expect(plannerSelectionErrors(createPlannerExample(sample))).toEqual([])
    }
  )
})
