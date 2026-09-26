import { describe, expect, it } from 'vitest'
import {
  breathCount,
  breathPositionAt,
  normalizeMinutes,
  normalizePhaseSeconds,
  sessionSeconds,
  type BreathSettings,
} from '../breathPattern'

const soothing: BreathSettings = { phaseSeconds: [4, 0, 6, 0], minutes: 3 }
const box: BreathSettings = { phaseSeconds: [4, 4, 4, 4], minutes: 2 }

describe('breathPattern · session length', () => {
  it('rounds the minutes to whole breaths', () => {
    expect(breathCount(soothing)).toBe(18)
    expect(sessionSeconds(soothing)).toBe(180)
    // 60 s of 4·7·8 = 3.16 breaths → 3 breaths, 57 s
    const relax: BreathSettings = { phaseSeconds: [4, 7, 8, 0], minutes: 1 }
    expect(breathCount(relax)).toBe(3)
    expect(sessionSeconds(relax)).toBe(57)
  })

  it('always runs at least one breath', () => {
    expect(breathCount({ phaseSeconds: [10, 10, 12, 10], minutes: 0 })).toBe(1)
  })
})

describe('breathPattern · breathPositionAt', () => {
  it('walks the phases in order with progress and countdown', () => {
    expect(breathPositionAt(box, 0)).toMatchObject({ breath: 0, phase: 0, progress: 0, remaining: 4 })
    expect(breathPositionAt(box, 2000)).toMatchObject({ breath: 0, phase: 0, progress: 0.5, remaining: 2 })
    expect(breathPositionAt(box, 4000)).toMatchObject({ breath: 0, phase: 1, remaining: 4 })
    expect(breathPositionAt(box, 13_500)).toMatchObject({ breath: 0, phase: 3, remaining: 3 })
    expect(breathPositionAt(box, 16_000)).toMatchObject({ breath: 1, phase: 0 })
  })

  it('skips 0-second holds', () => {
    expect(breathPositionAt(soothing, 3999).phase).toBe(0)
    expect(breathPositionAt(soothing, 4000)).toMatchObject({ phase: 2, remaining: 6 })
    expect(breathPositionAt(soothing, 10_000)).toMatchObject({ breath: 1, phase: 0 })
  })

  it('reports done after the last breath', () => {
    expect(breathPositionAt(soothing, 179_999).done).toBe(false)
    expect(breathPositionAt(soothing, 180_000)).toMatchObject({ done: true, breath: 18 })
  })
})

describe('breathPattern · normalize', () => {
  it('clamps phases into their limits and falls back on bad input', () => {
    expect(normalizePhaseSeconds([1, -3, 40, 2.6], [4, 0, 6, 0])).toEqual([2, 0, 12, 3])
    expect(normalizePhaseSeconds('nope', [4, 0, 6, 0])).toEqual([4, 0, 6, 0])
    expect(normalizePhaseSeconds([5, 'x', 5, 0], [4, 2, 6, 0])).toEqual([5, 2, 5, 0])
  })

  it('clamps minutes to 1–20', () => {
    expect(normalizeMinutes(0, 3)).toBe(1)
    expect(normalizeMinutes(99, 3)).toBe(20)
    expect(normalizeMinutes(undefined, 3)).toBe(3)
  })
})
