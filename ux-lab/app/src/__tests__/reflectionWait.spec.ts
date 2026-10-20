import { effectScope } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useReflectionWait } from '~lab/lab/reflectionWait'

describe('reflection waiting playback', () => {
  beforeEach(() => {
    vi.useRealTimers()
    vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] })
  })
  afterEach(() => vi.useRealTimers())
  function create() {
    const scope = effectScope()
    return { player: scope.run(useReflectionWait)!, scope }
  }
  it('shows typing for 1.5 seconds while the same request is already progressing', () => {
    const { player, scope } = create()
    player.start()
    expect(player.typing.value).toBe(true)
    vi.advanceTimersByTime(1400)
    expect(player.typing.value).toBe(true)
    vi.advanceTimersByTime(100)
    expect(player.typing.value).toBe(false)
    expect(player.state.value).toBe('working')
    player.intro.value = 'instant'
    player.start()
    expect(player.typing.value).toBe(false)
    scope.stop()
  })
  it('lets an early final answer supersede every remaining update', () => {
    const { player, scope } = create()
    player.sample.value = 'research'
    player.start()
    vi.advanceTimersByTime(1000)
    player.complete()
    expect(player.typing.value).toBe(false)
    vi.advanceTimersByTime(40000)
    expect(player.state.value).toBe('done')
    expect(player.elapsed.value).toBeCloseTo(1)
    expect(vi.getTimerCount()).toBe(0)
    scope.stop()
  })
  it('does not let a cancelled request complete after a retry', () => {
    const { player, scope } = create()
    player.sample.value = 'short'
    player.start()
    vi.advanceTimersByTime(5000)
    player.finishWith('cancelled')
    player.start()
    vi.advanceTimersByTime(1500)
    expect(player.state.value).toBe('working')
    vi.advanceTimersByTime(4500)
    expect(player.state.value).toBe('done')
    scope.stop()
  })
  it('freezes playback and resumes without counting paused time', () => {
    const { player, scope } = create()
    player.start()
    vi.advanceTimersByTime(4000)
    const label = player.stage.value.label
    player.togglePause()
    vi.advanceTimersByTime(60000)
    expect(player.elapsed.value).toBeCloseTo(4)
    expect(player.stage.value.label).toBe(label)
    expect(player.state.value).toBe('working')
    player.togglePause()
    vi.advanceTimersByTime(14000)
    expect(player.state.value).toBe('done')
    scope.stop()
  })
  it('clears timers on reset, error and route unmount', () => {
    const { player, scope } = create()
    player.start()
    player.finishWith('error')
    expect(vi.getTimerCount()).toBe(0)
    player.start()
    player.finishWith('idle')
    expect(player.elapsed.value).toBe(0)
    expect(vi.getTimerCount()).toBe(0)
    player.start()
    scope.stop()
    expect(vi.getTimerCount()).toBe(0)
  })
})
