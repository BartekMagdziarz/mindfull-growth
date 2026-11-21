import { ref } from 'vue'
import { describe, expect, it } from 'vitest'
import {
  flatSteps,
  MAIN_STEPS,
  momentsState,
  onDemandPractices,
  phasePracticeDefs,
  phasePracticeState,
  phaseSteps,
  practiceTiles,
  runningPhasePractice,
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
      const tiles = practiceTiles(phase, 10)
      expect(tiles).toHaveLength(2)
      expect(tiles[0]!.def.title).toBe('Momenty')
    }
  })

  it('every phase brings one new practice, with a name and an icon', () => {
    expect(phasePracticeDefs.map(p => p.slug)).toEqual(['paced-breathing', 'safe-place-return', 'response-rehearsal', 'self-compassion-break', 'critic-handover', 'shame-writing', 'positive-data-log', 'step-toward-people'])
    for (const def of phasePracticeDefs) expect(def.title.length, def.slug).toBeGreaterThan(3)
  })

  // The table of docs/problem-focused-paths.md P12, counted in steps done (= the current step index).
  it('practice windows follow the shipped rule', () => {
    const open = (phase: number) => Array.from({ length: MAIN_STEPS }, (_, done) => done).filter(done => phasePracticeState(phase, done) === 'now')
    expect(open(0)).toEqual([0, 1, 2, 3, 4]) // steps 1–5
    expect(open(1)).toEqual([5, 6, 7]) // steps 6–8
    expect(open(2)).toEqual([8, 9]) // steps 9–10
    expect(open(3)).toEqual([10, 11, 12]) // steps 11–13
    expect(open(7)).toEqual([21, 22, 23]) // steps 22–24
    // Exactly one phase practice runs at any step of the main run; none once the path is closed.
    for (let done = 0; done < MAIN_STEPS; done += 1) expect(phasePracticeDefs.filter((_, phase) => phasePracticeState(phase, done) === 'now'), String(done)).toHaveLength(1)
    expect(runningPhasePractice(MAIN_STEPS)).toBe(-1)
    // Momenty: after the map (three steps done) to the close.
    expect([0, 2, 3, 23, 24].map(momentsState)).toEqual(['later', 'later', 'now', 'now', 'demand'])
  })

  it('first day: the breath runs from the enrollment, Momenty are not handed over yet', () => {
    expect(practiceTiles(0, 0).map(t => [t.def.slug, t.state])).toEqual([
      ['moment-shame', 'later'],
      ['paced-breathing', 'now'],
    ])
    expect(onDemandPractices(0)).toEqual([])
  })

  it('at the start of a phase the field shows the practice still running, not the phase’s own', () => {
    // Seven steps done: phase 3 is current, its first step is ahead — "Wracam do miejsca" keeps running.
    expect(practiceTiles(2, 7).map(t => [t.def.slug, t.state])).toEqual([
      ['moment-shame', 'now'],
      ['safe-place-return', 'now'],
    ])
    // After that first step the phase's own practice takes over and the earlier one joins the collection.
    expect(practiceTiles(2, 8).map(t => [t.def.slug, t.state])).toEqual([
      ['moment-shame', 'now'],
      ['response-rehearsal', 'now'],
    ])
    expect(onDemandPractices(7).map(p => p.slug)).toEqual(['paced-breathing'])
    expect(onDemandPractices(8).map(p => p.slug)).toEqual(['paced-breathing', 'safe-place-return'])
  })

  it('looking into other phases shows their own practice in its real state', () => {
    expect(practiceTiles(3, 10).map(t => [t.def.title, t.state])).toEqual([
      ['Momenty', 'now'],
      ['Przerwa na współczucie', 'now'],
    ])
    expect(practiceTiles(1, 10).map(t => [t.def.slug, t.state])).toEqual([
      ['moment-shame', 'now'],
      ['safe-place-return', 'demand'],
    ])
    expect(practiceTiles(5, 10).map(t => [t.def.slug, t.state])).toEqual([
      ['moment-shame', 'now'],
      ['shame-writing', 'later'],
    ])
    expect(practiceTiles(RETURN_WEEK, 10).map(t => [t.def.slug, t.state])).toEqual([
      ['moment-shame', 'now'],
      ['maintenance-plan', 'later'],
    ])
  })

  it('a closed path asks for nothing: everything is on demand, Powrót holds the maintenance plan', () => {
    expect(practiceTiles(RETURN_WEEK, MAIN_STEPS).map(t => [t.def.slug, t.state])).toEqual([
      ['moment-shame', 'demand'],
      ['maintenance-plan', 'now'],
    ])
    expect(practiceTiles(7, MAIN_STEPS)[1]).toEqual({ def: phasePracticeDefs[7], state: 'demand' })
    expect(onDemandPractices(MAIN_STEPS).map(p => p.slug)).toEqual(['moment-shame', ...phasePracticeDefs.map(p => p.slug)])
  })

  it('scene states stay inside the main run', () => {
    for (const state of sceneStates) {
      expect(state.done).toBeGreaterThanOrEqual(0)
      expect(state.done).toBeLessThanOrEqual(MAIN_STEPS)
    }
  })
})
