import { ref } from 'vue'
import { describe, expect, it } from 'vitest'
import {
  flatSteps,
  MAIN_STEPS,
  onDemandPractices,
  phaseSteps,
  practiceTiles,
  RETURN_WEEK,
  sceneStates,
  shortTitle,
  stationCentre,
  stationLeft,
  stationWidth,
  stepIcon,
  stepLead,
  threadAxis,
  usePathProgressV4,
} from '~lab/lab/pathViewV4'

describe('path view v4 (round 8)', () => {
  it('has one lead of at most 72 characters per step', () => {
    expect(stepLead).toHaveLength(flatSteps.length)
    for (const lead of stepLead) expect(lead.length, lead).toBeLessThanOrEqual(72)
  })

  it('first day: phase 1 is current with its first step, nothing is done', () => {
    const progress = usePathProgressV4(ref(0))
    expect(progress.phaseState(0)).toBe('current')
    expect(progress.phaseState(1)).toBe('later')
    expect(progress.defaultStep(0)).toBe(0)
    expect(threadAxis(0, false).reached).toBe(0)
  })

  it('half way: phases 1–3 done, step 11 current in phase 4', () => {
    const progress = usePathProgressV4(ref(10))
    expect([0, 1, 2, 3, 4].map(progress.phaseState)).toEqual(['done', 'done', 'done', 'current', 'later'])
    expect(progress.phaseCompletion(3)).toEqual({ done: 1, total: 3 })
    expect(progress.defaultStep(3)).toBe(10)
    // A phase without the current step opens on its first one.
    expect(progress.defaultStep(1)).toBe(phaseSteps(1)[0]!.index)
    expect(stepIcon(flatSteps[10]!)).toBe('mg-exercise-scs-sf')
    expect(shortTitle(flatSteps[10]!)).toBe('Samowspółczucie')
  })

  it('closed: nothing is current, Powrót is next and opens on its date', () => {
    const progress = usePathProgressV4(ref(MAIN_STEPS))
    expect(progress.closed.value).toBe(true)
    expect(progress.currentIndex.value).toBe(-1)
    expect(progress.currentPhase.value).toBe(RETURN_WEEK)
    expect(progress.phaseState(7)).toBe('done')
    // Ink reaches station 8 and stops there.
    expect(threadAxis(RETURN_WEEK, true).reachedTo).toBeCloseTo(stationCentre(7), 6)
  })

  it('the thread grid adds up to 100 % and the axis runs through the well centres', () => {
    expect(stationLeft(RETURN_WEEK) + stationWidth(RETURN_WEEK)).toBeCloseTo(100, 6)
    expect(stationCentre(0)).toBeCloseTo(5.4217, 3)
    const mid = threadAxis(3, false)
    expect(mid.left).toBeCloseTo(stationCentre(0), 6)
    expect(mid.left + mid.width).toBeCloseTo(stationCentre(RETURN_WEEK), 6)
    expect(mid.reachedTo).toBeCloseTo(stationCentre(3), 6)
    // Solid up to station 8, then it dissolves on the way to Powrót.
    expect(mid.left + (mid.solid / 100) * mid.width).toBeCloseTo(stationCentre(7), 6)
    expect(mid.reached).toBeLessThan(mid.solid)
  })

  it('every phase shows exactly two practices, Momenty first', () => {
    for (let phase = 0; phase <= RETURN_WEEK; phase += 1) {
      const tiles = practiceTiles(phase, 3)
      expect(tiles).toHaveLength(2)
      expect(tiles[0]!.def.title).toBe('Momenty')
    }
  })

  it('every phase brings one new practice; Momenty stay', () => {
    const second = Array.from({ length: 8 }, (_, phase) => practiceTiles(phase, phase)[1]!.def.slug)
    expect(new Set(second).size).toBe(8)
    expect(second).toEqual(['paced-breathing', 'safe-place-return', 'response-rehearsal', 'self-compassion-break', 'critic-handover', 'shame-writing', 'positive-data-log', 'step-toward-people'])
    for (const tile of Array.from({ length: 8 }, (_, phase) => practiceTiles(phase, phase)).flat()) expect(tile.def.title.length, tile.def.slug).toBeGreaterThan(3)
  })

  it('practice tiles: in rhythm now, on demand once handed over, not yet for a later phase', () => {
    expect(practiceTiles(3, 3).map(t => [t.def.title, t.rhythm, t.state])).toEqual([
      ['Momenty', 'co 2 dni', 'now'],
      ['Przerwa na współczucie', 'co 2 dni', 'now'],
    ])
    expect(practiceTiles(1, 3).map(t => [t.def.slug, t.rhythm, t.state])).toEqual([
      ['moment-shame', 'co 2 dni', 'now'],
      ['safe-place-return', 'na żądanie', 'demand'],
    ])
    expect(practiceTiles(5, 3).map(t => t.state)).toEqual(['later', 'later'])
    expect(practiceTiles(RETURN_WEEK, RETURN_WEEK).map(t => [t.def.slug, t.state])).toEqual([
      ['moment-shame', 'demand'],
      ['self-compassion-break', 'now'],
    ])
  })

  it('the lower card is the growing collection: what the path handed over and no longer asks for', () => {
    expect(onDemandPractices(0)).toEqual([])
    expect(onDemandPractices(3).map(p => p.slug)).toEqual(['paced-breathing', 'safe-place-return', 'response-rehearsal'])
    expect(onDemandPractices(RETURN_WEEK)).toHaveLength(7)
  })

  it('scene states stay inside the main run', () => {
    for (const state of sceneStates) {
      expect(state.done).toBeGreaterThanOrEqual(0)
      expect(state.done).toBeLessThanOrEqual(MAIN_STEPS)
    }
  })
})
