import { ref } from 'vue'
import { describe, expect, it } from 'vitest'
import type { Sample } from '~lab/lab/shamePath'
import { flatSteps, MAIN_STEPS, RETURN_WEEK, stepWhy, usePathProgress } from '~lab/lab/pathViewV2'

describe('path view v2 progress', () => {
  it('has a what and a why sentence for every step', () => {
    expect(flatSteps).toHaveLength(27)
    expect(MAIN_STEPS).toBe(24)
    expect(stepWhy).toHaveLength(flatSteps.length)
    for (const step of flatSteps) {
      expect(step.what.length, `what of ${step.slug}`).toBeGreaterThan(20)
      expect(step.why.length, `why of ${step.slug}`).toBeGreaterThan(20)
    }
  })

  it('reads the week disc as done/total and keeps one current step', () => {
    const progress = usePathProgress(ref<Sample>('mid'))
    expect(progress.weekCompletion(0)).toEqual({ done: 4, total: 4 })
    expect(progress.weekState(0)).toBe('done')
    expect(progress.weekCompletion(3)).toEqual({ done: 1, total: 3 })
    expect(progress.weekState(3)).toBe('current')
    expect(progress.weekState(4)).toBe('later')
    expect(progress.current.value?.week).toBe(3)
    expect(flatSteps.filter(step => progress.stepState(step.index) === 'current')).toHaveLength(1)
  })

  it('completes only the current step, takes back only the last one, restarts to zero', () => {
    const progress = usePathProgress(ref<Sample>('mid'))
    const current = progress.currentIndex.value
    progress.complete(current + 1)
    expect(progress.done.value.has(current + 1)).toBe(false)
    progress.complete(current)
    expect(progress.currentIndex.value).toBe(current + 1)
    progress.undo(current - 1)
    expect(progress.done.value.has(current - 1)).toBe(true)
    progress.undo(current)
    expect(progress.currentIndex.value).toBe(current)
    progress.restart()
    expect(progress.done.value.size).toBe(0)
    expect(progress.currentIndex.value).toBe(0)
    progress.reset()
    expect(progress.currentIndex.value).toBe(current)
  })

  it('has no current step when closed and moves to the return week on the return', () => {
    expect(usePathProgress(ref<Sample>('completed')).currentIndex.value).toBe(-1)
    expect(usePathProgress(ref<Sample>('start')).currentIndex.value).toBe(-1)
    const back = usePathProgress(ref<Sample>('return'))
    expect(back.current.value?.week).toBe(RETURN_WEEK)
    expect(back.weekState(RETURN_WEEK)).toBe('current')
    expect(back.weekState(7)).toBe('done')
  })
})

describe('moments parts (round 6i)', async () => {
  const { dominantPart, PART_COLOR, PART_ORDER } = await import('~lab/lab/momentsParts')
  const { statsFor } = await import('~lab/lab/shamePath')

  it('stacks "Ja" first and gives every part its own app colour', () => {
    expect(PART_ORDER[0]).toBe('none')
    expect(new Set(Object.values(PART_COLOR)).size).toBe(5)
    const blue = PART_ORDER.indexOf('none')
    const lavender = PART_ORDER.indexOf('withdraw')
    expect(Math.abs(blue - lavender)).toBeGreaterThan(1)
  })

  it('names the dominant part per week and reports ties', () => {
    const stats = statsFor('completed')
    expect(stats).toHaveLength(8)
    const first = dominantPart(stats[0]!)!
    expect(first.count).toBe(Math.max(...Object.values(stats[0]!.byPart)))
    expect(first.share).toBeCloseTo(first.count / stats[0]!.total)
    for (const tied of first.tiedWith) expect(stats[0]!.byPart[tied]).toBe(first.count)
    expect(dominantPart({ ...stats[0]!, total: 0, quiet: true })).toBeNull()
  })
})
